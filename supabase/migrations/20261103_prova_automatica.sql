-- 03-11-2026: la prova gratuita dello studio parte da sola («tutto in automatico, lasciamo che possono richiedere
-- la consulenza»). Chi si registra come avvocato o commercialista, appena conferma l'email, ha lo studio attivo per
-- la durata del prodotto 'gratuito' (oggi 3 giorni e 7 crediti). Vale per il sito e per l'app: la registrazione è
-- la stessa, e qui non serve che un browser faccia niente.
-- Chi era già iscritto non viene toccato: si attiva la prova con un clic da «Completa il profilo» (activate-trial
-- chiama questa stessa funzione). Spegnendo il prodotto dal pannello si spegne anche la prova automatica.
-- Prima: activate-trial non creava lo studio e voleva la verifica approvata, e nessuno l'aveva mai usata.

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
  v_mesi     constant text[] := array['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio',
                                      'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
begin
  select * into v_profilo from public.profiles where id = p_user for update;
  if not found then raise exception 'Profilo non trovato'; end if;
  if v_profilo.disattivato_at is not null then raise exception 'Account disattivato'; end if;
  if v_profilo.prova_gratuita_usata then raise exception 'Prova gratuita già utilizzata'; end if;
  if v_profilo.titolare_id is not null then raise exception 'La prova la attiva il titolare dello studio'; end if;

  -- Il ruolo: si tiene quello professionale che c'è, altrimenti quello dichiarato. In Italia non c'è approvazione.
  if v_profilo.role in ('avvocato', 'commercialista') then
    v_ruolo := v_profilo.role;
  elsif v_profilo.role = 'user' then
    v_ruolo := case
      when v_profilo.tipo_richiesta in ('avvocato', 'commercialista') then v_profilo.tipo_richiesta
      when v_profilo.professione in ('avvocato', 'commercialista') then v_profilo.professione
      when v_profilo.verification_status = 'approved' then 'avvocato'
    end;
  end if;
  if v_ruolo is null then raise exception 'La prova gratuita è riservata ad avvocati e commercialisti'; end if;

  -- Il Piano Personale dei privati non conta: non è un piano professionale.
  if v_profilo.piano_id is not null and not exists (
    select 1 from public.prodotti pr where pr.id = v_profilo.piano_id and pr.tipo = 'piano_privato'
  ) then
    raise exception 'Hai già un piano attivo';
  end if;

  select * into v_prodotto from public.prodotti pr
  where pr.tipo = 'gratuito' and pr.attivo
  order by pr.created_at desc limit 1;
  if not found then raise exception 'La prova gratuita non è disponibile'; end if;

  v_fine   := now() + coalesce(v_prodotto.durata_mesi * 30, 7) * interval '1 day';
  v_posti  := coalesce(v_prodotto.posti, 1);
  v_nome   := nullif(btrim(coalesce(v_profilo.nome, '') || ' ' || coalesce(v_profilo.cognome, '')), '');
  v_studio := v_profilo.studio_id;

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
         prova_gratuita_usata = true
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
          jsonb_build_object('tipo_attivazione', 'prova_gratuita', 'automatica', p_automatica));

  insert into public.audit_log (studio_id, user_id, user_nome, azione, entita_tipo, entita_id, dettaglio)
  values (v_studio, p_user, coalesce(v_nome, v_profilo.email), 'Prova gratuita attivata', 'prodotti', v_prodotto.id,
          v_prodotto.nome || case when p_automatica then ' — alla conferma dell''email' else ' — con il pulsante' end);

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
            'durata_giorni', round(coalesce(v_prodotto.durata_mesi * 30, 7)),
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

-- Nessuno la chiama dal browser: passa il trigger qui sotto, o activate-trial con la chiave di servizio.
revoke all on function public.attiva_prova_gratuita(uuid, boolean) from public, anon, authenticated;
grant execute on function public.attiva_prova_gratuita(uuid, boolean) to service_role;

create or replace function public.prova_alla_conferma_email()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  -- Solo chi si è registrato dichiarando la professione: gli altri restano utenti come sempre.
  if exists (
    select 1 from public.profiles p
    where p.id = new.id and p.role = 'user' and not p.prova_gratuita_usata
      and p.professione in ('avvocato', 'commercialista')
  ) then
    -- Se la prova non parte, la conferma dell'email deve andare a buon fine lo stesso: resta il pulsante.
    begin
      perform public.attiva_prova_gratuita(new.id, true);
    exception when others then
      raise warning 'prova automatica non partita per %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end
$function$;

revoke all on function public.prova_alla_conferma_email() from public, anon, authenticated;

drop trigger if exists trg_prova_alla_conferma_email on auth.users;
create trigger trg_prova_alla_conferma_email
  after update on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.prova_alla_conferma_email();

-- Una prova non è un pagamento: prima l'avviso diceva «Pagamento ricevuto: EUR ,00».
create or replace function public.notifica_nuovo_pagamento_admin()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  admin_rec record;
  nome_user text;
BEGIN
  IF NEW.stato IS DISTINCT FROM 'completato' THEN RETURN NEW; END IF;

  SELECT trim(coalesce(nome,'') || ' ' || coalesce(cognome,'')) INTO nome_user
  FROM profiles WHERE id = NEW.user_id;

  FOR admin_rec IN SELECT id FROM profiles WHERE role = 'admin' LOOP
    IF NEW.tipo = 'gratuito' THEN
      PERFORM crea_notifica(
        admin_rec.id,
        'nuovo_utente',
        'Prova gratuita attivata: ' || coalesce(nullif(nome_user, ''), 'Utente'),
        coalesce(NEW.prodotto_nome, 'Prova gratuita'),
        '/admin/utenti/' || NEW.user_id::text,
        'transazioni',
        NEW.id,
        jsonb_build_object('importo', NEW.importo, 'tipo', NEW.tipo)
      );
    ELSE
      PERFORM crea_notifica(
        admin_rec.id,
        'nuovo_pagamento',
        'Pagamento ricevuto: EUR ' || to_char(NEW.importo, 'FM999G999D00'),
        coalesce(nome_user, 'Utente') || ' ha acquistato: ' || coalesce(NEW.prodotto_nome, 'prodotto'),
        '/admin/pagamenti',
        'transazioni',
        NEW.id,
        jsonb_build_object('importo', NEW.importo, 'tipo', NEW.tipo)
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- La prova ora dura 3 giorni: con il preavviso di 3 giorni «sta per scadere» partiva già la mattina dopo.
create or replace function public.scadenze_da_avvisare()
returns table(user_id uuid, email text, nome text, tipo text, scadenza timestamp with time zone, scadenza_testo text, piano_nome text, prova boolean, gb integer)
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  with pro as (
    select p.id, p.email, p.nome, p.abbonamento_scadenza as scadenza,
           greatest(p.abbonamento_scadenza, coalesce(p.grazia_fino_al, p.abbonamento_scadenza)) as fine,
           coalesce(nullif(btrim(p.abbonamento_tipo), ''), pr.nome) as piano_nome,
           pr.tipo = 'gratuito' as prova,
           case when pr.tipo = 'gratuito'            then interval '1 day'
                when coalesce(pr.durata_mesi, 1) < 3 then interval '7 days'
                else                                      interval '15 days' end as preavviso
    from public.profiles p
    join public.prodotti pr on pr.id = p.piano_id and pr.tipo in ('abbonamento', 'gratuito')
    where p.role in ('avvocato', 'commercialista')
      and p.titolare_id is null
      and p.disattivato_at is null
      and coalesce(p.email, '') <> ''
      and p.abbonamento_scadenza is not null
  ), candidati as (
    select id, email, nome, 'in_scadenza'::text as tipo, scadenza, piano_nome, prova, null::integer as gb
    from pro
    where scadenza > now() and scadenza <= now() + preavviso
    union all
    select id, email, nome, 'scaduto', scadenza, piano_nome, prova, null
    from pro
    where fine <= now() and fine > now() - interval '3 days'
    union all
    select p.id, p.email, p.nome, 'spazio_in_scadenza', s.periodo_fine, null, false, sum(s.gb)::integer
    from public.spazio_archiviazione s
    join public.profiles p on p.id = s.proprietario_id
    where s.periodo_fine > now() and s.periodo_fine <= now() + interval '3 days'
      and p.disattivato_at is null
      and coalesce(p.email, '') <> ''
      -- l'archivio in più in abbonamento si rinnova da solo: niente avviso
      and not exists (select 1 from public.abbonamenti b
                      where b.id = s.abbonamento_id and b.stato in ('attivo', 'in_ritardo'))
    group by p.id, p.email, p.nome, s.periodo_fine
  )
  select c.id, c.email, c.nome, c.tipo, c.scadenza,
         to_char(c.scadenza at time zone 'Europe/Rome', 'DD/MM/YYYY'),
         c.piano_nome, c.prova, c.gb
  from candidati c
  where not exists (
    select 1 from public.avvisi_abbonamento_inviati a
    where a.user_id = c.id and a.tipo = c.tipo and a.scadenza = c.scadenza)
  order by c.scadenza
$function$;

-- Monetizzazione e sentenze a pagamento spariscono dalla circolazione (03-11-2026): il prodotto si spegne e i
-- segni nei dati si azzerano. Colonne e tabelle restano: non le legge più nessuna pagina.
update public.prodotti set attivo = false where tipo = 'accesso_singolo' and attivo;
update public.prodotti set include_monetizzazione = false where include_monetizzazione;
update public.studios set include_monetizzazione = false where include_monetizzazione;
update public.profiles set include_monetizzazione = false where include_monetizzazione;
