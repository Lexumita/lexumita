-- Abbonamenti dei privati con rinnovo automatico (28-10-2026, deciso da Antonino).
-- Tre piani mensili (Personale, Personale Plus, Personale Pro) e l'archivio in più (+10, +25, +50 GB al
-- mese), venduti sul sito con gli abbonamenti di Tagadapay e su iPhone con quelli di Apple. «Se si chiama
-- abbonamento deve essere gestito come un abbonamento»: si rinnova da sé ogni mese finché non si disdice.
--
-- Ogni mese pagato è un periodo (abbonamento_periodo): per un piano arrivano i crediti del mese (quelli del
-- mese prima scadono: non si accumulano) e lo spazio del piano; per l'archivio in più lo spazio vale fino
-- alla fine del periodo. Una disdetta lascia tutto fino alla fine del periodo pagato.
-- Il rinnovo automatico di un prodotto si accende con prodotti.rinnovo_automatico: finché è spento la cassa
-- vende il prodotto come prima (un mese, senza rinnovo).

alter table public.prodotti add column rinnovo_automatico boolean not null default false;

create table public.abbonamenti (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fornitore text not null check (fornitore in ('tagada', 'apple')),
  riferimento text,                 -- Tagadapay: id dell'abbonamento; Apple: originalTransactionId
  ordine_id uuid unique references public.tagada_ordini(id) on delete set null,   -- primo pagamento sul sito
  prodotto_id uuid not null references public.prodotti(id),
  genere text not null check (genere in ('piano', 'archivio')),
  -- attivo: si rinnova · in_ritardo: il rinnovo non è stato pagato, il fornitore riprova ·
  -- disdetto: non si rinnova, vale fino a periodo_fine · chiuso: finito
  stato text not null default 'attivo' check (stato in ('attivo', 'in_ritardo', 'disdetto', 'chiuso')),
  periodo_fine timestamptz,
  prodotto_successivo_id uuid references public.prodotti(id),   -- piano più piccolo dal periodo dopo
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  unique (fornitore, riferimento)
);
create index abbonamenti_utente on public.abbonamenti (user_id);

create table public.abbonamenti_periodi (
  id uuid primary key default gen_random_uuid(),
  abbonamento_id uuid not null references public.abbonamenti(id) on delete cascade,
  chiave text not null unique,      -- il pagamento: ordine o pagamento Tagadapay, transazione Apple
  periodo_fine timestamptz not null,
  importo numeric(10,2),
  valuta text,
  creato_il timestamptz not null default now()
);

alter table public.spazio_archiviazione add column abbonamento_id uuid references public.abbonamenti(id) on delete set null;
create unique index spazio_archiviazione_abbonamento on public.spazio_archiviazione (abbonamento_id) where abbonamento_id is not null;

-- il prezzo ricorrente di Tagadapay serve per far partire un piano più piccolo alla fine del mese
alter table public.tagada_varianti add column price_id text;
-- passaggio a un piano più grande: pagato il nuovo, il vecchio abbonamento si chiude
alter table public.tagada_ordini add column sostituisce_abbonamento_id uuid references public.abbonamenti(id) on delete set null;

alter table public.abbonamenti enable row level security;
alter table public.abbonamenti_periodi enable row level security;
revoke all on public.abbonamenti, public.abbonamenti_periodi from anon;
revoke insert, update, delete on public.abbonamenti, public.abbonamenti_periodi from authenticated;
create policy abbonamenti_miei on public.abbonamenti for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy abbonamenti_periodi_admin on public.abbonamenti_periodi for select to authenticated
  using (public.is_admin());

-- ── Un mese pagato ────────────────────────────────────────────────────────────────────────────────
-- p_chiave rende il pagamento unico (un avviso ripetuto non dà due mesi). p_fine: la fine del periodo se
-- la dice il fornitore (Apple), altrimenti un mese dopo la scadenza in corso (o da oggi). p_prodotto: il
-- prodotto pagato, se è cambiato (Apple: passaggio a un altro piano dello stesso gruppo).
create or replace function public.abbonamento_periodo(
  p_abbonamento uuid, p_chiave text, p_fine timestamptz default null,
  p_importo numeric default null, p_valuta text default null, p_prodotto uuid default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a public.abbonamenti;
  pr public.prodotti;
  prof record;
  v_mesi numeric;
  v_base timestamptz;
  v_fine timestamptz;
begin
  if coalesce(p_chiave, '') = '' then raise exception 'pagamento senza chiave'; end if;
  select * into a from public.abbonamenti where id = p_abbonamento for update;
  if not found then raise exception 'abbonamento non trovato'; end if;
  if exists (select 1 from public.abbonamenti_periodi where chiave = p_chiave) then
    return jsonb_build_object('esito', 'gia', 'periodo_fine', a.periodo_fine);
  end if;
  if p_prodotto is not null and p_prodotto <> a.prodotto_id then
    update public.abbonamenti set prodotto_id = p_prodotto where id = a.id;
    a.prodotto_id := p_prodotto;
  end if;
  select * into pr from public.prodotti where id = a.prodotto_id;
  select id, role, studio_id, abbonamento_scadenza into prof from public.profiles where id = a.user_id for update;

  if p_fine is not null then
    v_fine := p_fine;
  else
    v_mesi := coalesce(pr.durata_mesi, 1);
    v_base := greatest(now(), coalesce(a.periodo_fine, now()));
    v_fine := v_base + make_interval(months => floor(v_mesi)::int)
                     + make_interval(days => round((v_mesi - floor(v_mesi)) * 30)::int);
  end if;

  if a.genere = 'piano' then
    if prof.role = 'user' then
      update public.profiles set
        piano_id = pr.id,
        abbonamento_tipo = to_jsonb(pr.nome) #>> '{}',
        abbonamento_scadenza = greatest(v_fine, case when abbonamento_scadenza > now() and piano_id = pr.id
                                                     then abbonamento_scadenza end),
        abbonamento_stato = 'attivo',
        grazia_fino_al = null,
        spazio_gb_piano = coalesce(pr.spazio_gb, 0)
      where id = a.user_id;
    end if;
    if coalesce(pr.crediti_ai_mensili, 0) > 0 then
      insert into public.crediti_ai (user_id, studio_id, tipo, crediti_totali, crediti_usati, periodo_inizio, periodo_fine)
      values (a.user_id, prof.studio_id, 'piano', pr.crediti_ai_mensili, 0, now(), v_fine);
    end if;
    insert into public.piani_privati_attivazioni (stripe_session_id, user_id, prodotto_id, scadenza, crediti, esito)
    values (p_chiave, a.user_id, pr.id, v_fine, coalesce(pr.crediti_ai_mensili, 0),
            case when prof.role = 'user' then 'attivato' else 'solo_crediti' end)
    on conflict do nothing;
  else
    insert into public.spazio_archiviazione (proprietario_id, gb, prodotto_id, periodo_inizio, periodo_fine, rinnovo_automatico, abbonamento_id)
    values (a.user_id, coalesce(pr.spazio_gb, 0), pr.id, now(), v_fine, true, a.id)
    on conflict (abbonamento_id) where abbonamento_id is not null
    do update set periodo_fine = excluded.periodo_fine, gb = excluded.gb, prodotto_id = excluded.prodotto_id;
  end if;

  update public.abbonamenti set
    periodo_fine = v_fine,
    stato = case when stato in ('disdetto', 'chiuso') then stato else 'attivo' end,
    aggiornato_il = now()
  where id = a.id;
  insert into public.abbonamenti_periodi (abbonamento_id, chiave, periodo_fine, importo, valuta)
  values (a.id, p_chiave, v_fine, p_importo, p_valuta);

  return jsonb_build_object('esito', 'ok', 'periodo_fine', v_fine, 'genere', a.genere,
    'crediti', coalesce(pr.crediti_ai_mensili, 0), 'gb', coalesce(pr.spazio_gb, 0));
end $$;

-- ── Fine di un abbonamento ────────────────────────────────────────────────────────────────────────
-- p_subito = false: resta quello che è stato pagato fino a periodo_fine (disdetta, cambio di piano).
-- p_subito = true: finisce adesso (rimborso o revoca): via i crediti del piano non ancora usati e lo spazio.
create or replace function public.abbonamento_chiudi(p_abbonamento uuid, p_subito boolean default false)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.abbonamenti;
begin
  select * into a from public.abbonamenti where id = p_abbonamento for update;
  if not found then return; end if;
  update public.abbonamenti set stato = 'chiuso', aggiornato_il = now(),
    periodo_fine = case when p_subito then least(coalesce(periodo_fine, now()), now()) else periodo_fine end
  where id = a.id;
  if not p_subito then return; end if;
  if a.genere = 'piano' then
    update public.profiles set abbonamento_scadenza = now()
     where id = a.user_id and piano_id = a.prodotto_id and abbonamento_scadenza > now()
       and not exists (select 1 from public.abbonamenti b where b.user_id = a.user_id and b.id <> a.id
                         and b.genere = 'piano' and b.stato <> 'chiuso' and b.periodo_fine > now());
    update public.crediti_ai set crediti_totali = crediti_usati
     where user_id = a.user_id and tipo = 'piano' and periodo_fine > now();
  else
    update public.spazio_archiviazione set periodo_fine = now() where abbonamento_id = a.id and periodo_fine > now();
  end if;
end $$;

revoke all on function public.abbonamento_periodo(uuid, text, timestamptz, numeric, text, uuid) from public, anon, authenticated;
revoke all on function public.abbonamento_chiudi(uuid, boolean) from public, anon, authenticated;
grant execute on function public.abbonamento_periodo(uuid, text, timestamptz, numeric, text, uuid) to service_role;
grant execute on function public.abbonamento_chiudi(uuid, boolean) to service_role;
