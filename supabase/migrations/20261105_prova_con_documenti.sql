-- 05-11-2026: la prova gratuita resta automatica, nessuno la deve approvare, ma non parte più alla conferma dell'email
-- («su 50 registrazioni la attivano tutti e si usa gratis»). Servono «carica documento, iscrizione e dati di
-- fatturazione»: si attiva con un clic da «Completa il profilo» e il controllo è qui, non nel browser.
-- I documenti finiscono in «Da verificare»: se l'admin li rifiuta la prova si ferma e l'utente vede il motivo
-- (ferma_prova_gratuita). Se li ricarica e l'admin li approva, la prova riparte (riprendi_prova_gratuita).
-- Comprare un piano non cambia: bastano i dati di fatturazione. Il sito e l'app hanno la stessa registrazione.

-- Il segno che la prova è stata fermata da un rifiuto mentre era in corso.
alter table public.profiles add column if not exists prova_fermata_il timestamptz;

-- La stessa funzione di prima, con la colonna nuova fra le protette: dal browser non si scrive.
create or replace function public.profili_colonne_protette()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  protette constant text[] := array[
    'id', 'email', 'role', 'verification_status', 'verification_note',
    'tipo_account', 'titolare_id', 'studio_id', 'avvocato_id',
    'piano_id', 'abbonamento_tipo', 'abbonamento_scadenza', 'abbonamento_stato', 'grazia_fino_al',
    'prova_gratuita_usata', 'prova_fermata_il', 'posti_acquistati', 'posti_usati', 'include_banca_dati',
    'include_monetizzazione', 'spazio_gb_piano', 'limite_clienti_piano', 'limite_clienti_extra',
    'stripe_customer_id', 'visibile_pubblicamente', 'note_admin', 'credenziali_inviate_il',
    'disattivato_at', 'disattivato_da', 'motivo_disattivazione',
    'codice_commerciale', 'commerciale_id', 'commerciale_assegnato_il', 'commerciale_assegnato_da'
  ];
  vecchio jsonb;
  nuovo jsonb;
  c text;
begin
  -- Solo le scritture dirette dal browser girano come authenticated / anon
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    raise exception 'Il profilo si crea alla registrazione' using errcode = '42501';
  end if;
  vecchio := to_jsonb(old);
  nuovo := to_jsonb(new);
  foreach c in array protette loop
    if (nuovo -> c) is distinct from (vecchio -> c) then
      if c = 'verification_status'
         and new.verification_status = 'pending'
         and coalesce(old.verification_status, 'none') in ('none', 'rejected') then
        continue;
      end if;
      raise exception 'Campo non modificabile: %', c using errcode = '42501';
    end if;
  end loop;
  return new;
end
$function$;

-- Alla conferma dell'email non parte più niente.
drop trigger if exists trg_prova_alla_conferma_email on auth.users;
drop function if exists public.prova_alla_conferma_email();

-- Cosa manca per la prova. I dati di fatturazione hanno le stesse regole di src/lib/profiloCompleto.js.
-- Chi ha i documenti già approvati non deve rimandarli.
create or replace function public.prova_cosa_manca(p_user uuid)
returns text[]
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_profilo  public.profiles%rowtype;
  v_mancanti text[] := '{}';
  v_campi    text[];
begin
  select * into v_profilo from public.profiles where id = p_user;
  if not found then raise exception 'Profilo non trovato'; end if;

  if v_profilo.verification_status is distinct from 'approved' then
    if not exists (select 1 from storage.objects o
                   where o.bucket_id = 'verification-docs' and o.name like p_user::text || '/identita.%') then
      v_mancanti := v_mancanti || 'il documento d''identità'::text;
    end if;
    if not exists (select 1 from storage.objects o
                   where o.bucket_id = 'verification-docs' and o.name like p_user::text || '/albo.%') then
      v_mancanti := v_mancanti || 'l''iscrizione all''Albo'::text;
    end if;
  end if;

  v_campi := array[v_profilo.telefono, v_profilo.indirizzo, v_profilo.cap, v_profilo.comune, v_profilo.partita_iva];
  if coalesce(nullif(v_profilo.paese, ''), 'IT') = 'IT' then
    v_campi := v_campi || array[v_profilo.provincia, v_profilo.cf,
                                coalesce(nullif(btrim(v_profilo.pec), ''), nullif(btrim(v_profilo.codice_destinatario_sdi), ''))];
  end if;
  if exists (select 1 from unnest(v_campi) c where nullif(btrim(c), '') is null) then
    v_mancanti := v_mancanti || 'i dati di fatturazione'::text;
  end if;

  return v_mancanti;
end
$function$;

revoke all on function public.prova_cosa_manca(uuid) from public, anon, authenticated;
grant execute on function public.prova_cosa_manca(uuid) to service_role;

create or replace function public.attiva_prova_gratuita(p_user uuid, p_automatica boolean default false)
returns timestamptz
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_profilo  public.profiles%rowtype;
  v_prodotto public.prodotti%rowtype;
  v_ruolo    text;
  v_studio   uuid;
  v_fine     timestamptz;
  v_posti    integer;
  v_nome     text;
  v_chiave   text;
  v_mancanti text[];
  v_prima    jsonb;
  v_mesi     constant text[] := array['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio',
                                      'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
begin
  select * into v_profilo from public.profiles where id = p_user for update;
  if not found then raise exception 'Profilo non trovato'; end if;
  if v_profilo.disattivato_at is not null then raise exception 'Account disattivato'; end if;
  if v_profilo.prova_gratuita_usata then raise exception 'Prova gratuita già utilizzata'; end if;
  if v_profilo.titolare_id is not null then raise exception 'La prova la attiva il titolare dello studio'; end if;

  -- Il ruolo: si tiene quello professionale che c'è, altrimenti quello dichiarato. In Italia non c'è approvazione.
  if v_profilo.role = 'avvocato' then
    v_ruolo := 'avvocato';
  elsif v_profilo.role = 'user' then
    v_ruolo := case coalesce(v_profilo.tipo_richiesta, v_profilo.professione)
      when 'commercialista' then null
      when 'avvocato' then 'avvocato'
      else case when v_profilo.verification_status = 'approved' then 'avvocato' end
    end;
  end if;
  if v_ruolo is null then raise exception 'La prova gratuita per ora è riservata agli avvocati'; end if;

  -- Il Piano Personale dei privati non conta: non è un piano professionale.
  if v_profilo.piano_id is not null and not exists (
    select 1 from public.prodotti pr where pr.id = v_profilo.piano_id and pr.tipo = 'piano_privato'
  ) then
    raise exception 'Hai già un piano attivo';
  end if;

  -- Documenti e dati di fatturazione (05-11-2026). Chi è già «avvocato» senza piano lo ha fatto l'admin dal pannello.
  if v_profilo.role = 'user' then
    if v_profilo.verification_status = 'rejected' then
      raise exception 'I documenti non sono stati approvati: carica quelli corretti da «Completa il profilo»';
    end if;
    v_mancanti := public.prova_cosa_manca(p_user);
    if cardinality(v_mancanti) > 0 then
      raise exception 'Per attivare la prova mancano: %', array_to_string(v_mancanti, ', ');
    end if;
  end if;

  select * into v_prodotto from public.prodotti pr
  where pr.tipo = 'gratuito' and pr.attivo
  order by pr.created_at desc limit 1;
  if not found then raise exception 'La prova gratuita non è disponibile'; end if;

  v_fine   := now() + coalesce(v_prodotto.durata_mesi * 30, 3) * interval '1 day';
  v_posti  := coalesce(v_prodotto.posti, 1);
  v_nome   := nullif(btrim(coalesce(v_profilo.nome, '') || ' ' || coalesce(v_profilo.cognome, '')), '');
  v_studio := v_profilo.studio_id;

  -- Un Piano Personale in corso: se la prova si ferma, torna com'era (ferma_prova_gratuita).
  if v_profilo.piano_id is not null then
    v_prima := jsonb_build_object(
      'piano_id', v_profilo.piano_id,
      'abbonamento_tipo', v_profilo.abbonamento_tipo,
      'abbonamento_scadenza', v_profilo.abbonamento_scadenza,
      'abbonamento_stato', v_profilo.abbonamento_stato,
      'spazio_gb_piano', v_profilo.spazio_gb_piano);
  end if;

  -- Lo studio, come con un piano comprato (tagada-webhook): senza, le pagine dello studio restano a metà.
  if v_studio is null then
    insert into public.studios (nome, titolare_id, piano_id, posti_totali, posti_usati, include_banca_dati, scadenza, stato)
    values (coalesce(nullif(btrim(v_profilo.studio), ''), 'Studio di ' || v_nome, 'Il mio studio'),
            p_user, v_prodotto.id::text, v_posti, 1, coalesce(v_prodotto.include_banca_dati, false), v_fine, 'attivo')
    returning id into v_studio;
  else
    update public.studios
       set piano_id = v_prodotto.id::text, posti_totali = v_posti, posti_usati = 1,
           include_banca_dati = coalesce(v_prodotto.include_banca_dati, false),
           scadenza = v_fine, stato = 'attivo'
     where id = v_studio and titolare_id = p_user;
  end if;

  update public.profiles
     set role = v_ruolo,
         tipo_richiesta = coalesce(tipo_richiesta, v_ruolo),
         tipo_account = case when v_posti = 1 then 'singolo' else 'titolare' end,
         studio_id = v_studio,
         piano_id = v_prodotto.id,
         abbonamento_tipo = v_prodotto.nome,
         abbonamento_scadenza = v_fine,
         abbonamento_stato = public.stato_abbonamento_calcolato(v_fine, null, v_prodotto.nome),
         grazia_fino_al = null,
         posti_acquistati = v_posti,
         posti_usati = 1,
         include_banca_dati = coalesce(v_prodotto.include_banca_dati, false),
         spazio_gb_piano = coalesce(v_prodotto.spazio_gb, 0),
         limite_clienti_piano = coalesce(v_prodotto.limite_clienti, 0),
         limite_clienti_extra = 0,
         prova_gratuita_usata = true,
         prova_fermata_il = null,
         -- i documenti appena caricati vanno in «Da verificare»; quelli già approvati restano approvati
         verification_status = case when v_profilo.role = 'user' and verification_status is distinct from 'approved'
                                    then 'pending' else verification_status end,
         verification_note = case when v_profilo.role = 'user' then null else verification_note end
   where id = p_user;

  insert into public.studio_members (studio_id, user_id, ruolo_studio, visibilita, is_active, joined_at)
  values (v_studio, p_user, 'titolare', 'tutto', true, now())
  on conflict (studio_id, user_id) do nothing;

  -- I crediti della prova scadono con la prova.
  if coalesce(v_prodotto.crediti_ai_mensili, 0) > 0 then
    insert into public.crediti_ai (user_id, studio_id, tipo, crediti_totali, crediti_usati, periodo_inizio, periodo_fine)
    values (p_user, v_studio, 'piano', v_prodotto.crediti_ai_mensili, 0, now(), v_fine);
  end if;

  insert into public.transazioni (user_id, studio_id, prodotto_id, prodotto_nome, tipo, importo, stato, metadati)
  values (p_user, v_studio, v_prodotto.id, v_prodotto.nome, 'gratuito', 0, 'completato',
          jsonb_build_object('tipo_attivazione', 'prova_gratuita', 'automatica', p_automatica, 'spazio_gb_prima', v_profilo.spazio_gb_piano)
          || case when v_prima is not null then jsonb_build_object('piano_prima', v_prima) else '{}'::jsonb end);

  insert into public.audit_log (studio_id, user_id, user_nome, azione, entita_tipo, entita_id, dettaglio)
  values (v_studio, p_user, coalesce(v_nome, v_profilo.email), 'Prova gratuita attivata', 'prodotti', v_prodotto.id,
          v_prodotto.nome || ' — con il pulsante');

  -- La mail passa da send-mail (Mail Log). Se qui qualcosa non va la prova resta attiva: la mail non deve fermarla.
  begin
    select decrypted_secret into v_chiave from vault.decrypted_secrets where name = 'service_role_key';
    if v_chiave is not null and coalesce(v_profilo.email, '') <> '' then
      perform net.http_post(
        url := 'https://wnbmyiyblpinayswunxb.supabase.co/functions/v1/send-mail',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_chiave),
        body := jsonb_build_object(
          'to', v_profilo.email,
          'templateAlias', 'trial-attivata',
          'tipo', 'trial_attivata',
          'origine', 'attiva_prova_gratuita',
          'toUserId', p_user,
          'templateModel', jsonb_build_object(
            'nome', v_profilo.nome,
            'piano_nome', v_prodotto.nome,
            'durata_giorni', round(coalesce(v_prodotto.durata_mesi * 30, 3)),
            'scadenza', extract(day from v_fine at time zone 'Europe/Rome')::int || ' '
                        || v_mesi[extract(month from v_fine at time zone 'Europe/Rome')::int] || ' '
                        || extract(year from v_fine at time zone 'Europe/Rome')::int,
            'crediti_ai', coalesce(v_prodotto.crediti_ai_mensili, 0),
            'spazio_gb', coalesce(v_prodotto.spazio_gb, 0),
            'posti', v_posti,
            'limite_clienti', coalesce(v_prodotto.limite_clienti, 0),
            'include_banca_dati', coalesce(v_prodotto.include_banca_dati, false),
            'app_url', 'https://www.lexum.it')),
        timeout_milliseconds := 30000);
    end if;
  exception when others then
    raise warning 'attiva_prova_gratuita, mail non partita per %: %', p_user, sqlerrm;
  end;

  return v_fine;
end
$function$;

-- Il rifiuto dei documenti (reject-verifica). Il motivo resta nel profilo, dove l'utente lo vede. Se è in prova la
-- prova si ferma: torna un account base, con la Banca Dati e i crediti non della prova. Niente si cancella: studio,
-- pratiche e clienti restano lì e tornano se i documenti vengono approvati o se compra un piano.
-- Un piano a pagamento non si tocca. Risponde true se ha fermato una prova in corso.
create or replace function public.ferma_prova_gratuita(p_user uuid, p_motivo text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_profilo  public.profiles%rowtype;
  v_prova    jsonb;
  v_prima    jsonb;
  v_in_corso boolean;
begin
  select * into v_profilo from public.profiles where id = p_user for update;
  if not found then raise exception 'Profilo non trovato'; end if;

  update public.profiles
     set verification_status = 'rejected', verification_note = nullif(btrim(p_motivo), '')
   where id = p_user;

  if not exists (select 1 from public.prodotti pr where pr.id = v_profilo.piano_id and pr.tipo = 'gratuito') then
    return false;
  end if;

  v_in_corso := coalesce(v_profilo.abbonamento_scadenza > now(), false);

  -- Solo i crediti della prova: scadono insieme a lei. Quelli di un Piano Personale hanno la loro data.
  update public.crediti_ai
     set periodo_fine = now()
   where user_id = p_user and tipo = 'piano'
     and periodo_fine = v_profilo.abbonamento_scadenza and periodo_fine > now();

  update public.studios
     set scadenza = least(scadenza, now()), stato = 'scaduto'
   where id = v_profilo.studio_id and titolare_id = p_user;

  -- Un Piano Personale che aveva prima della prova, se è ancora valido, torna com'era.
  select t.metadati into v_prova
    from public.transazioni t
   where t.user_id = p_user and t.tipo = 'gratuito'
   order by t.created_at desc limit 1;
  v_prima := v_prova -> 'piano_prima';
  if v_prima is not null and (v_prima ->> 'abbonamento_scadenza')::timestamptz <= now() then
    v_prima := null;
  end if;

  update public.profiles
     set role = 'user',
         tipo_account = null,
         piano_id = (v_prima ->> 'piano_id')::uuid,
         abbonamento_tipo = v_prima ->> 'abbonamento_tipo',
         abbonamento_scadenza = (v_prima ->> 'abbonamento_scadenza')::timestamptz,
         abbonamento_stato = v_prima ->> 'abbonamento_stato',
         grazia_fino_al = null,
         posti_acquistati = 1,
         posti_usati = 1,
         include_banca_dati = false,
         spazio_gb_piano = coalesce((v_prima ->> 'spazio_gb_piano')::numeric, (v_prova ->> 'spazio_gb_prima')::numeric, 0),
         limite_clienti_piano = 0,
         limite_clienti_extra = 0,
         prova_fermata_il = case when v_in_corso then now() end
   where id = p_user;

  insert into public.audit_log (studio_id, user_id, user_nome, azione, entita_tipo, entita_id, dettaglio)
  values (v_profilo.studio_id, p_user,
          coalesce(nullif(btrim(coalesce(v_profilo.nome, '') || ' ' || coalesce(v_profilo.cognome, '')), ''), v_profilo.email),
          'Prova gratuita fermata', 'prodotti', v_profilo.piano_id, 'Documenti non approvati: ' || coalesce(btrim(p_motivo), ''));

  return v_in_corso;
end
$function$;

revoke all on function public.ferma_prova_gratuita(uuid, text) from public, anon, authenticated;
grant execute on function public.ferma_prova_gratuita(uuid, text) to service_role;

-- L'approvazione dei documenti (approve-verifica): se un rifiuto aveva fermato la prova, riparte da capo.
-- Se non può ripartire (per esempio ha tolto i dati di fatturazione) l'approvazione vale lo stesso e gli resta il pulsante.
create or replace function public.riprendi_prova_gratuita(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  update public.profiles
     set prova_gratuita_usata = false, prova_fermata_il = null
   where id = p_user and prova_fermata_il is not null;
  if not found then return false; end if;

  begin
    perform public.attiva_prova_gratuita(p_user, false);
    return true;
  exception when others then
    raise warning 'riprendi_prova_gratuita, prova non ripartita per %: %', p_user, sqlerrm;
    return false;
  end;
end
$function$;

revoke all on function public.riprendi_prova_gratuita(uuid) from public, anon, authenticated;
grant execute on function public.riprendi_prova_gratuita(uuid) to service_role;
