-- Codici sconto (28-10-2026, deciso da Antonino).
-- L'admin crea i codici (admin → Codici sconto) con la percentuale e le condizioni; chi compra lo scrive
-- alla cassa del sito e il server (tagada-checkout) toglie la percentuale dal prezzo. Serve soprattutto
-- per i piani dei professionisti: il prezzo comprende la provvigione del commerciale, e a chi arriva
-- senza commerciale l'admin dà un codice. «Richiedi il tuo codice» apre un ticket di assistenza con
-- oggetto e messaggio già scritti: l'admin decide a chi mandare il codice.
--
-- Un uso conta quando il pagamento è andato a buon fine (tagada_ordini → «pagato»), non quando si apre
-- la cassa: un carrello abbandonato non consuma il codice. Un rimborso lo annulla.

create table public.codici_sconto (
  id uuid primary key default gen_random_uuid(),
  codice text not null check (codice ~ '^[A-Z0-9][A-Z0-9-]{2,29}$'),
  percentuale numeric(5,2) not null check (percentuale > 0 and percentuale < 100),
  attivo boolean not null default true,
  valido_dal timestamptz,
  valido_al timestamptz,
  usi_massimi integer check (usi_massimi > 0),                    -- vuoto = senza limite
  usi_per_persona integer default 1 check (usi_per_persona > 0),  -- vuoto = senza limite
  tipi text[],          -- tipi di prodotto (prodotti.tipo) a cui si applica; vuoto = tutti
  prodotti uuid[],      -- prodotti precisi; vuoto = tutti quelli dei tipi
  per_chi text check (per_chi in ('privati', 'professionisti')),  -- vuoto = tutti
  email text,           -- riservato a questa persona; vuoto = chiunque abbia il codice
  note text,
  creato_da uuid default auth.uid() references auth.users(id) on delete set null,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  check (valido_al is null or valido_dal is null or valido_al > valido_dal)
);
create unique index codici_sconto_codice on public.codici_sconto (upper(codice));

create or replace function public.codici_sconto_normalizza()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.codice := upper(trim(new.codice));
  new.email := nullif(lower(trim(coalesce(new.email, ''))), '');
  new.note := nullif(trim(coalesce(new.note, '')), '');
  if new.tipi = '{}' then new.tipi := null; end if;
  if new.prodotti = '{}' then new.prodotti := null; end if;
  new.aggiornato_il := now();
  return new;
end $$;
create trigger codici_sconto_normalizza before insert or update on public.codici_sconto
  for each row execute function public.codici_sconto_normalizza();

create table public.codici_sconto_usi (
  id uuid primary key default gen_random_uuid(),
  codice_id uuid not null references public.codici_sconto(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ordine_id uuid unique references public.tagada_ordini(id) on delete set null,
  prodotto_id uuid references public.prodotti(id) on delete set null,
  importo_listino numeric(10,2),
  importo_pagato numeric(10,2),
  annullato boolean not null default false,
  creato_il timestamptz not null default now()
);
create index codici_sconto_usi_codice on public.codici_sconto_usi (codice_id);
create index codici_sconto_usi_utente on public.codici_sconto_usi (user_id);

alter table public.tagada_ordini
  add column codice_sconto_id uuid references public.codici_sconto(id) on delete set null,
  add column sconto_percentuale numeric(5,2),
  add column importo_listino numeric(10,2);

-- ── Permessi ──────────────────────────────────────────────────────────────────────────────────────
alter table public.codici_sconto enable row level security;
alter table public.codici_sconto_usi enable row level security;
revoke all on public.codici_sconto, public.codici_sconto_usi from anon;

-- i codici e i loro usi li vede e li cambia solo l'admin; chi compra passa da verifica_codice_sconto
create policy codici_sconto_admin on public.codici_sconto for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy codici_sconto_usi_admin on public.codici_sconto_usi for select to authenticated
  using (public.is_admin());
revoke insert, update, delete on public.codici_sconto_usi from authenticated;


-- ── Verifica ──────────────────────────────────────────────────────────────────────────────────────
-- Il codice vale per questa persona? E per quali di questi prodotti? Risponde
-- { valido, codice_id, codice, percentuale, prodotti: [id per cui vale] } oppure { valido: false, motivo }.
-- motivo: inesistente | non_ancora | scaduto | esaurito | gia_usato | non_tuo | non_per_te | non_vale
create or replace function public.codice_sconto_esito(p_user uuid, p_codice text, p_prodotti uuid[])
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  c public.codici_sconto;
  v_ruolo text;
  v_email text;
  v_validi uuid[];
begin
  select * into c from public.codici_sconto where upper(codice) = upper(trim(coalesce(p_codice, '')));
  if not found or not c.attivo then return jsonb_build_object('valido', false, 'motivo', 'inesistente'); end if;
  if c.valido_dal is not null and now() < c.valido_dal then return jsonb_build_object('valido', false, 'motivo', 'non_ancora'); end if;
  if c.valido_al is not null and now() > c.valido_al then return jsonb_build_object('valido', false, 'motivo', 'scaduto'); end if;

  select p.role, lower(coalesce(p.email, u.email)) into v_ruolo, v_email
    from auth.users u left join public.profiles p on p.id = u.id where u.id = p_user;
  if c.email is not null and c.email is distinct from v_email then
    return jsonb_build_object('valido', false, 'motivo', 'non_tuo');
  end if;
  if (c.per_chi = 'privati' and v_ruolo is distinct from 'user')
     or (c.per_chi = 'professionisti' and not coalesce(v_ruolo, '') = any (array['avvocato', 'commercialista', 'fiduciario', 'progettista'])) then
    return jsonb_build_object('valido', false, 'motivo', 'non_per_te');
  end if;

  if c.usi_massimi is not null and (select count(*) from public.codici_sconto_usi
        where codice_id = c.id and not annullato) >= c.usi_massimi then
    return jsonb_build_object('valido', false, 'motivo', 'esaurito');
  end if;
  if c.usi_per_persona is not null and (select count(*) from public.codici_sconto_usi
        where codice_id = c.id and user_id = p_user and not annullato) >= c.usi_per_persona then
    return jsonb_build_object('valido', false, 'motivo', 'gia_usato');
  end if;

  select coalesce(array_agg(pr.id), '{}') into v_validi
    from public.prodotti pr
   where pr.id = any(coalesce(p_prodotti, '{}'))
     and (c.tipi is null or pr.tipo = any(c.tipi))
     and (c.prodotti is null or pr.id = any(c.prodotti));
  if cardinality(v_validi) = 0 then return jsonb_build_object('valido', false, 'motivo', 'non_vale'); end if;

  return jsonb_build_object('valido', true, 'codice_id', c.id, 'codice', c.codice,
    'percentuale', c.percentuale, 'prodotti', to_jsonb(v_validi));
end $$;
revoke all on function public.codice_sconto_esito(uuid, text, uuid[]) from public, anon, authenticated;
grant execute on function public.codice_sconto_esito(uuid, text, uuid[]) to service_role;

-- La stessa verifica per chi è entrato nel sito (mostra il prezzo scontato prima della cassa).
create or replace function public.verifica_codice_sconto(p_codice text, p_prodotti uuid[])
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'accesso negato' using errcode = '42501'; end if;
  return public.codice_sconto_esito(auth.uid(), p_codice, p_prodotti) - 'codice_id';
end $$;
revoke all on function public.verifica_codice_sconto(text, uuid[]) from public, anon;
grant execute on function public.verifica_codice_sconto(text, uuid[]) to authenticated;

-- ── Usi: contano a pagamento fatto, si annullano col rimborso ─────────────────────────────────────
create or replace function public.codici_sconto_uso_da_ordine()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.codice_sconto_id is null then return new; end if;
  if new.stato = 'pagato' and old.stato is distinct from 'pagato' then
    insert into public.codici_sconto_usi (codice_id, user_id, ordine_id, prodotto_id, importo_listino, importo_pagato)
    values (new.codice_sconto_id, new.user_id, new.id, new.prodotto_id, new.importo_listino, new.importo)
    on conflict (ordine_id) do nothing;
  elsif new.stato = 'rimborsato' and old.stato is distinct from 'rimborsato' then
    update public.codici_sconto_usi set annullato = true where ordine_id = new.id;
  end if;
  return new;
end $$;
create trigger codici_sconto_uso_da_ordine after update of stato on public.tagada_ordini
  for each row execute function public.codici_sconto_uso_da_ordine();
