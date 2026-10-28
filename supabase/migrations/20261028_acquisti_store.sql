-- Acquisti dentro l'app (App Store), 28-10-2026.
-- Apple chiede che i privati possano comprare i crediti anche con l'acquisto di Apple (regole 3.1.1 e
-- 3.1.3(c)). L'app paga con StoreKit e manda la ricevuta firmata alla funzione apple-acquisto, che la
-- verifica (firma di Apple, app, utente) e chiama accredita_acquisto_store col ruolo di servizio.
-- La serratura contro il doppio accredito e' l'indice unico (fornitore, transazione): la stessa ricevuta
-- mandata due volte accredita una volta. I rimborsi (notifiche di Apple) passano da rimborsa_acquisto_store.
-- Gli acquisti di prova (Sandbox: revisione di Apple, TestFlight) accreditano i crediti ma non entrano in
-- transazioni, cosi' gli incassi restano veri.

create table if not exists public.acquisti_store (
  id uuid primary key default gen_random_uuid(),
  fornitore text not null check (fornitore in ('apple', 'google')),
  transazione text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  prodotto_store text not null,
  crediti integer not null check (crediti > 0),
  ambiente text,
  prezzo numeric(12, 2),
  valuta text,
  paese text,
  crediti_ai_id uuid references public.crediti_ai(id) on delete set null,
  transazione_id uuid references public.transazioni(id) on delete set null,
  rimborsato_il timestamptz,
  creato_il timestamptz not null default now(),
  unique (fornitore, transazione)
);

-- Solo il server: niente letture o scritture dal browser o dall'app.
alter table public.acquisti_store enable row level security;
revoke all on public.acquisti_store from anon, authenticated;

create or replace function public.accredita_acquisto_store(
  p_user uuid,
  p_fornitore text,
  p_transazione text,
  p_prodotto_store text,
  p_crediti integer,
  p_nome text,
  p_ambiente text,
  p_prezzo numeric,
  p_valuta text,
  p_paese text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_studio uuid;
  v_crediti uuid;
  v_tx uuid;
  v_prodotto uuid;
begin
  if p_crediti is null or p_crediti <= 0 then
    return jsonb_build_object('esito', 'no', 'motivo', 'Prodotto senza crediti.');
  end if;
  if not exists (select 1 from profiles where id = p_user) then
    return jsonb_build_object('esito', 'no', 'motivo', 'Utente sconosciuto.');
  end if;

  insert into acquisti_store (fornitore, transazione, user_id, prodotto_store, crediti, ambiente, prezzo, valuta, paese)
  values (p_fornitore, p_transazione, p_user, p_prodotto_store, p_crediti, p_ambiente, p_prezzo, p_valuta, p_paese)
  on conflict (fornitore, transazione) do nothing
  returning id into v_id;

  if v_id is null then
    -- gia' accreditata: per chi ha comprato e' un successo (l'app chiude la transazione con Apple)
    return jsonb_build_object('esito', 'ok', 'gia_accreditato', true);
  end if;

  select studio_id into v_studio from profiles where id = p_user;

  insert into crediti_ai (user_id, studio_id, tipo, crediti_totali, crediti_usati, periodo_inizio, periodo_fine)
  values (p_user, v_studio, 'topup', p_crediti, 0, now(), null)
  returning id into v_crediti;

  if coalesce(p_ambiente, '') = 'Production' then
    -- il prodotto del listino con gli stessi crediti, se c'e' (per le statistiche dell'admin)
    select id into v_prodotto from prodotti
     where tipo = 'crediti_ai' and crediti_ai_mensili = p_crediti
     order by attivo desc, prezzo limit 1;
    insert into transazioni (user_id, studio_id, prodotto_id, prodotto_nome, tipo, importo, stato, metadati)
    values (p_user, v_studio, v_prodotto, p_nome, 'crediti_ai', coalesce(p_prezzo, 0), 'completato',
            jsonb_build_object('fornitore', p_fornitore, 'transazione', p_transazione,
                               'prodotto_store', p_prodotto_store, 'valuta', p_valuta, 'paese', p_paese))
    returning id into v_tx;
  end if;

  update acquisti_store set crediti_ai_id = v_crediti, transazione_id = v_tx where id = v_id;
  return jsonb_build_object('esito', 'ok', 'crediti', p_crediti);
end;
$$;

-- Rimborso (o revoca) di Apple: i crediti non ancora usati di quell'acquisto si tolgono, la transazione
-- passa a «rimborsato». Ripetere la stessa notifica non cambia niente.
create or replace function public.rimborsa_acquisto_store(p_fornitore text, p_transazione text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a acquisti_store%rowtype;
begin
  select * into a from acquisti_store where fornitore = p_fornitore and transazione = p_transazione for update;
  if not found then
    return jsonb_build_object('esito', 'sconosciuto');
  end if;
  if a.rimborsato_il is not null then
    return jsonb_build_object('esito', 'ok', 'gia_rimborsato', true);
  end if;
  update crediti_ai set crediti_totali = crediti_usati where id = a.crediti_ai_id;
  if a.transazione_id is not null then
    update transazioni set stato = 'rimborsato' where id = a.transazione_id;
  end if;
  update acquisti_store set rimborsato_il = now() where id = a.id;
  return jsonb_build_object('esito', 'ok');
end;
$$;

revoke all on function public.accredita_acquisto_store(uuid, text, text, text, integer, text, text, numeric, text, text) from public, anon, authenticated;
revoke all on function public.rimborsa_acquisto_store(text, text) from public, anon, authenticated;
grant execute on function public.accredita_acquisto_store(uuid, text, text, text, integer, text, text, numeric, text, text) to service_role;
grant execute on function public.rimborsa_acquisto_store(text, text) to service_role;
