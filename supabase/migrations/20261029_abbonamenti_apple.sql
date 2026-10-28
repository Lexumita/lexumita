-- Abbonamenti presi su iPhone con l'acquisto di Apple (29-10-2026): i piani personali e l'archivio in più,
-- mensili con rinnovo automatico (abbonamenti auto-rinnovabili dell'App Store). Come sul sito, ogni mese
-- pagato è un periodo (abbonamento_periodo); qui l'abbonamento è quello di Apple: riferimento =
-- originalTransactionId (resta lo stesso a ogni rinnovo e passando da un piano all'altro dello stesso gruppo),
-- chiave del periodo = 'apple:' || transactionId, fine del periodo = expiresDate di Apple.
--
-- Le chiamano solo apple-acquisto (la ricevuta mandata dall'app) e apple-notifiche (gli avvisi di Apple:
-- rinnovi, disdette, pagamenti non riusciti, scadenze, rimborsi), dopo aver verificato la firma di Apple.
-- L'utente è l'appAccountToken della transazione (l'app compra con l'id dell'utente in questo paese).

-- ── Un mese pagato su Apple ───────────────────────────────────────────────────────────────────────
-- p_user: l'utente (appAccountToken); se l'abbonamento c'è già dev'essere suo. p_codice: il prodotto del
-- listino (piano_personale, piano_personale_plus, piano_personale_pro, archivio_mese_10/25/50).
-- Esiti: ok | gia (mese già registrato) | scaduto (transazione di un mese finito: niente da dare) |
-- utente (l'abbonamento è di un altro account) | sconosciuto (né l'abbonamento né l'utente sono di questo
-- paese) | no (dati mancanti).
create or replace function public.abbonamento_apple_pagamento(
  p_user uuid, p_originale text, p_transazione text, p_codice text, p_fine timestamptz,
  p_ambiente text default null, p_prezzo numeric default null, p_valuta text default null, p_paese text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  pr public.prodotti;
  a public.abbonamenti;
  v_esito jsonb;
  v_studio uuid;
  v_nome text;
begin
  if coalesce(p_originale, '') = '' or coalesce(p_transazione, '') = '' then
    return jsonb_build_object('esito', 'no', 'motivo', 'Transazione senza identificativo.');
  end if;
  select * into pr from public.prodotti where codice = p_codice order by attivo desc limit 1;
  if not found then
    return jsonb_build_object('esito', 'no', 'motivo', 'Prodotto non nel listino.');
  end if;

  select * into a from public.abbonamenti where fornitore = 'apple' and riferimento = p_originale for update;
  if found then
    if p_user is not null and a.user_id <> p_user then
      return jsonb_build_object('esito', 'utente');
    end if;
  else
    if p_user is null or not exists (select 1 from public.profiles where id = p_user) then
      return jsonb_build_object('esito', 'sconosciuto');
    end if;
    insert into public.abbonamenti (user_id, fornitore, riferimento, prodotto_id, genere, stato)
    values (p_user, 'apple', p_originale, pr.id,
            case when p_codice like 'piano_personale%' then 'piano' else 'archivio' end, 'attivo')
    on conflict (fornitore, riferimento) do nothing;
    select * into a from public.abbonamenti where fornitore = 'apple' and riferimento = p_originale for update;
    if a.user_id <> p_user then
      return jsonb_build_object('esito', 'utente');
    end if;
  end if;

  if p_fine is null or p_fine <= now() then
    return jsonb_build_object('esito', 'scaduto', 'abbonamento', a.id);
  end if;
  -- un mese nuovo riapre un abbonamento chiuso (di nuovo abbonati con lo stesso Apple ID)
  if a.stato = 'chiuso' then
    update public.abbonamenti set stato = 'attivo', aggiornato_il = now() where id = a.id;
  end if;

  v_esito := public.abbonamento_periodo(a.id, 'apple:' || p_transazione, p_fine, p_prezzo, p_valuta, pr.id);
  -- il piano più piccolo programmato è arrivato: non è più «dal mese dopo»
  update public.abbonamenti set prodotto_successivo_id = null
   where id = a.id and prodotto_successivo_id = pr.id;

  -- negli incassi dell'admin solo gli acquisti veri (non quelli di prova: Sandbox, TestFlight, revisione)
  if v_esito->>'esito' = 'ok' and coalesce(p_ambiente, '') = 'Production' then
    select studio_id into v_studio from public.profiles where id = a.user_id;
    v_nome := coalesce(to_jsonb(pr.nome)->>'it', to_jsonb(pr.nome) #>> '{}');
    insert into public.transazioni (user_id, studio_id, prodotto_id, prodotto_nome, tipo, importo, stato, metadati)
    values (a.user_id, v_studio, pr.id, v_nome || ' (App Store)', pr.tipo, coalesce(p_prezzo, 0), 'completato',
            jsonb_build_object('fornitore', 'apple', 'transazione', p_transazione, 'abbonamento', p_originale,
                               'prodotto_store', p_codice, 'valuta', p_valuta, 'paese', p_paese,
                               'rinnovo', p_transazione <> p_originale));
  end if;

  return v_esito || jsonb_build_object('abbonamento', a.id, 'user_id', a.user_id);
end $$;

-- ── Lo stato del rinnovo, dagli avvisi di Apple ───────────────────────────────────────────────────
-- p_stato: attivo | disdetto (rinnovo spento) | in_ritardo (Apple riprova a farsi pagare); null = invariato.
-- p_successivo: il codice del piano con cui si rinnoverà, se diverso (piano più piccolo dal mese dopo).
-- p_chiudi: 'fine' = scaduto (resta quello che era pagato, che è già finito) · 'subito' = rimborso o revoca di
-- p_transazione: se è il mese in corso, via i crediti del piano non usati e lo spazio; un mese passato
-- rimborsato segna solo la transazione.
create or replace function public.abbonamento_apple_stato(
  p_originale text, p_stato text default null, p_successivo text default null,
  p_chiudi text default null, p_transazione text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a public.abbonamenti;
  v_succ uuid;
begin
  select * into a from public.abbonamenti where fornitore = 'apple' and riferimento = p_originale for update;
  if not found then return jsonb_build_object('esito', 'sconosciuto'); end if;

  if p_chiudi = 'subito' then
    if p_transazione is not null then
      update public.transazioni set stato = 'rimborsato'
       where metadati->>'fornitore' = 'apple' and metadati->>'transazione' = p_transazione;
      if not exists (select 1 from public.abbonamenti_periodi
                      where abbonamento_id = a.id and chiave = 'apple:' || p_transazione
                        and periodo_fine >= coalesce(a.periodo_fine, now())) then
        return jsonb_build_object('esito', 'ok', 'rimborsato', true);
      end if;
    end if;
    perform public.abbonamento_chiudi(a.id, true);
    return jsonb_build_object('esito', 'ok', 'chiuso', true);
  elsif p_chiudi = 'fine' then
    perform public.abbonamento_chiudi(a.id, false);
    return jsonb_build_object('esito', 'ok', 'chiuso', true);
  end if;

  if a.stato = 'chiuso' then return jsonb_build_object('esito', 'ok', 'chiuso', true); end if;
  if p_successivo is not null then
    select id into v_succ from public.prodotti where codice = p_successivo order by attivo desc limit 1;
  end if;
  update public.abbonamenti set
    stato = case when p_stato in ('attivo', 'disdetto', 'in_ritardo') then p_stato else stato end,
    prodotto_successivo_id = case when v_succ is not null and v_succ <> a.prodotto_id then v_succ end,
    aggiornato_il = now()
  where id = a.id;
  return jsonb_build_object('esito', 'ok');
end $$;

revoke all on function public.abbonamento_apple_pagamento(uuid, text, text, text, timestamptz, text, numeric, text, text) from public, anon, authenticated;
revoke all on function public.abbonamento_apple_stato(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.abbonamento_apple_pagamento(uuid, text, text, text, timestamptz, text, numeric, text, text) to service_role;
grant execute on function public.abbonamento_apple_stato(text, text, text, text, text) to service_role;
