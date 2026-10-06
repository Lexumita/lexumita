-- ═══════════════════════════════════════════════════════════════════════════
-- Collaboratori dello studio — Lexum IT, 06-10-2026
-- Lo stesso modello rifatto su CH il 04-10-2026 (inviti da accettare), in italiano.
--
-- Prima: invite-membro (v35) aggiungeva subito l'invitato allo studio, senza il suo consenso, e
-- voleva un `ruolo_studio` che il sito non manda (rispondeva sempre «Ruolo non valido»); scriveva
-- studio_members e studio_id, mentre le pagine e le funzioni di fatturazione leggono titolare_id,
-- che nessuno impostava; «Rimuovi» scriveva dal browser sul profilo di un altro (vietato).
--
-- Lo studio: profiles.titolare_id punta al titolare; tipo_account = 'membro' per il collaboratore,
-- 'titolare' per chi ne ha almeno uno, 'singolo' per gli altri. I dati di lavoro si condividono per
-- studio (get_my_studio_id(), cioè l'appartenenza attiva in studio_members: ne resta attiva UNA);
-- archivio e quote per titolare_id. posti_acquistati = accessi totali, titolare compreso;
-- posti_usati = 1 + collaboratori. Il collaboratore entra SOLO accettando.
-- I membri dello stesso studio si vedono già tra loro (regola «leggi profiles» su studio_id).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Inviti ──────────────────────────────────────────────────────────────────
create table if not exists public.inviti_studio (
  id           uuid primary key default gen_random_uuid(),
  titolare_id  uuid not null references public.profiles(id) on delete cascade,
  invitato_id  uuid not null references public.profiles(id) on delete cascade,
  stato        text not null default 'in_attesa'
               check (stato in ('in_attesa', 'accettato', 'rifiutato', 'annullato')),
  creato_il    timestamptz not null default now(),
  scade_il     timestamptz not null default (now() + interval '14 days'),
  risposto_il  timestamptz
);

create unique index if not exists inviti_studio_una_attesa
  on public.inviti_studio (titolare_id, invitato_id) where stato = 'in_attesa';
create index if not exists inviti_studio_invitato
  on public.inviti_studio (invitato_id) where stato = 'in_attesa';

alter table public.inviti_studio enable row level security;
-- Le tabelle nuove nascono con tutti i permessi: qui si legge soltanto, si scrive dalle funzioni.
revoke all on public.inviti_studio from anon, authenticated;
grant select on public.inviti_studio to authenticated;

drop policy if exists inviti_studio_select on public.inviti_studio;
create policy inviti_studio_select on public.inviti_studio
  for select to authenticated
  using (titolare_id = (select auth.uid())
         or invitato_id = (select auth.uid())
         or public.is_admin());

-- 2. Aiuti interni (nessun permesso ai client) ──────────────────────────────
create or replace function public.studio_esito(p_codice text, p_errore text)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select jsonb_build_object('ok', false, 'codice', p_codice, 'error', p_errore)
$$;

create or replace function public.studio_ricalcola_titolare(p_titolare uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_n integer;
begin
  select count(*) into v_n from profiles where titolare_id = p_titolare;
  update profiles
     set posti_usati  = 1 + v_n,
         tipo_account = case when v_n > 0 then 'titolare' else 'singolo' end
   where id = p_titolare;
  update studios
     set posti_usati = 1 + v_n
   where titolare_id = p_titolare
     and posti_usati is distinct from 1 + v_n;
end;
$$;

create or replace function public.studio_notifica(
  p_utente uuid, p_tipo text, p_entita uuid, p_titolo text, p_testo text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into notifiche (user_id, tipo, titolo, descrizione, link, entita_tipo, entita_id)
  values (p_utente, p_tipo, p_titolo, p_testo, '/studio', 'invito_studio', p_entita);
end;
$$;

-- 3. Stato per la pagina Studio ─────────────────────────────────────────────
create or replace function public.studio_stato_collaboratori()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me     uuid := auth.uid();
  p        record;
  v_collab integer;
  v_attesa integer;
begin
  if v_me is null then
    return null;
  end if;
  select id, titolare_id, coalesce(posti_acquistati, 1) as posti
    into p from profiles where id = v_me;
  if not found then
    return null;
  end if;
  select count(*) into v_collab from profiles where titolare_id = v_me;
  select count(*) into v_attesa from inviti_studio
   where titolare_id = v_me and stato = 'in_attesa' and scade_il > now();

  return jsonb_build_object(
    'collaboratori', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome, 'cognome', c.cognome, 'email', c.email)
                       order by c.cognome, c.nome)
        from profiles c where c.titolare_id = v_me), '[]'::jsonb),
    'inviti_inviati', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'scade_il', i.scade_il,
                                          'nome', x.nome, 'cognome', x.cognome, 'email', x.email)
                       order by i.creato_il)
        from inviti_studio i join profiles x on x.id = i.invitato_id
       where i.titolare_id = v_me and i.stato = 'in_attesa' and i.scade_il > now()), '[]'::jsonb),
    'inviti_ricevuti', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'scade_il', i.scade_il,
                                          'nome', t.nome, 'cognome', t.cognome, 'studio', t.studio)
                       order by i.creato_il)
        from inviti_studio i join profiles t on t.id = i.titolare_id
       where i.invitato_id = v_me and i.stato = 'in_attesa' and i.scade_il > now()), '[]'::jsonb),
    'titolare', (
      select jsonb_build_object('id', t.id, 'nome', t.nome, 'cognome', t.cognome, 'studio', t.studio)
        from profiles t where t.id = p.titolare_id),
    'posti', jsonb_build_object(
      'acquistati',    p.posti,
      'collaboratori', v_collab,
      'in_attesa',     v_attesa,
      'liberi',        greatest(0, p.posti - 1 - v_collab - v_attesa))
  );
end;
$$;

-- 4. Invito ─────────────────────────────────────────────────────────────────
create or replace function public.studio_invita_collaboratore(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me     uuid := auth.uid();
  t        record;
  i        record;
  v_collab integer;
  v_attesa integer;
  v_invito uuid;
  v_scade  timestamptz;
  v_nome_t text;
begin
  if v_me is null then
    return studio_esito('NON_AUTENTICATO', 'Non autorizzato');
  end if;

  -- Il titolare resta bloccato per tutta l'operazione: due inviti spediti insieme non possono
  -- prendersi lo stesso posto.
  select id, role, titolare_id, studio_id, coalesce(posti_acquistati, 1) as posti, nome, cognome, studio
    into t
    from profiles where id = v_me
     for update;
  if not found or coalesce(t.role, '') not in ('avvocato', 'commercialista') then
    return studio_esito('NON_PROFESSIONISTA', 'Solo un professionista può invitare collaboratori');
  end if;
  if t.titolare_id is not null then
    return studio_esito('SEI_COLLABORATORE', 'Fai parte di uno studio: solo il titolare può invitare collaboratori');
  end if;
  -- Lo studio nasce con l'attivazione del piano (stripe-webhook)
  if t.studio_id is null then
    return studio_esito('SENZA_STUDIO', 'Per invitare collaboratori serve un piano attivo con più accessi');
  end if;

  -- Stesso messaggio se l'email non esiste o è di un altro ruolo: provando indirizzi non si deve
  -- poter scoprire chi è iscritto a Lexum.
  select id, role, titolare_id, nome, cognome, email
    into i
    from profiles
   where lower(email) = lower(btrim(coalesce(p_email, '')))
   limit 1;
  if not found or i.role is distinct from t.role then
    return studio_esito('NON_TROVATO', 'Nessun professionista con il tuo stesso ruolo è iscritto a Lexum con questa email');
  end if;
  if i.id = v_me then
    return studio_esito('TE_STESSO', 'Non puoi invitare te stesso');
  end if;
  if i.titolare_id is not null then
    return studio_esito('GIA_IN_STUDIO', 'Questo professionista fa già parte di uno studio');
  end if;
  if exists (select 1 from profiles where titolare_id = i.id) then
    return studio_esito('HA_UN_SUO_STUDIO', 'Questo professionista ha già dei collaboratori nel suo studio');
  end if;

  -- Un invito scaduto tra gli stessi due non deve impedirne uno nuovo
  update inviti_studio set stato = 'annullato', risposto_il = now()
   where titolare_id = v_me and invitato_id = i.id
     and stato = 'in_attesa' and scade_il <= now();
  if exists (select 1 from inviti_studio
              where titolare_id = v_me and invitato_id = i.id and stato = 'in_attesa') then
    return studio_esito('GIA_INVITATO', 'Hai già invitato questo professionista: l''invito aspetta una risposta');
  end if;

  -- posti_acquistati conta anche il titolare; gli inviti in attesa tengono il posto
  select count(*) into v_collab from profiles where titolare_id = v_me;
  select count(*) into v_attesa from inviti_studio
   where titolare_id = v_me and stato = 'in_attesa' and scade_il > now();
  if t.posti - 1 - v_collab - v_attesa <= 0 then
    return studio_esito('POSTI_ESAURITI', 'Non hai posti liberi: aggiungi accessi per invitare altri collaboratori');
  end if;

  insert into inviti_studio (titolare_id, invitato_id)
  values (v_me, i.id)
  returning id, scade_il into v_invito, v_scade;

  v_nome_t := btrim(coalesce(t.nome, '') || ' ' || coalesce(t.cognome, ''));
  perform studio_notifica(i.id, 'invito_studio', v_invito,
    'Invito in uno studio',
    format('%s ti invita nel suo studio su Lexum. Apri l''invito per accettarlo o rifiutarlo.', v_nome_t));

  return jsonb_build_object(
    'ok',        true,
    'invito_id', v_invito,
    'scade_il',  v_scade,
    'invitato',  jsonb_build_object('id', i.id, 'nome', i.nome, 'cognome', i.cognome, 'email', i.email),
    'titolare',  jsonb_build_object('nome', t.nome, 'cognome', t.cognome, 'studio', t.studio)
  );
end;
$$;

-- 5. Risposta dell'invitato ─────────────────────────────────────────────────
create or replace function public.studio_rispondi_invito(p_invito uuid, p_accetta boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me     uuid := auth.uid();
  inv      record;
  t        record;
  i        record;
  v_collab integer;
  v_nome_i text;
begin
  if v_me is null then
    return studio_esito('NON_AUTENTICATO', 'Non autorizzato');
  end if;

  select * into inv from inviti_studio where id = p_invito for update;
  if not found or inv.invitato_id <> v_me then
    return studio_esito('INVITO_NON_TROVATO', 'Invito non trovato');
  end if;
  if inv.stato <> 'in_attesa' then
    return studio_esito('INVITO_CHIUSO', 'A questo invito è già stata data una risposta');
  end if;
  if inv.scade_il <= now() then
    update inviti_studio set stato = 'annullato', risposto_il = now() where id = inv.id;
    return studio_esito('INVITO_SCADUTO', 'L''invito è scaduto: chiedi di mandartene uno nuovo');
  end if;

  -- Prima il titolare, poi l'invitato: lo stesso ordine dell'invito.
  select id, role, titolare_id, studio_id, coalesce(posti_acquistati, 1) as posti, nome, cognome, studio
    into t from profiles where id = inv.titolare_id for update;
  select id, role, titolare_id, nome, cognome
    into i from profiles where id = v_me for update;
  v_nome_i := btrim(coalesce(i.nome, '') || ' ' || coalesce(i.cognome, ''));

  if not coalesce(p_accetta, false) then
    update inviti_studio set stato = 'rifiutato', risposto_il = now() where id = inv.id;
    perform studio_notifica(inv.titolare_id, 'invito_studio_rifiutato', inv.id,
      'Invito rifiutato', format('%s ha rifiutato l''invito nel tuo studio.', v_nome_i));
    return jsonb_build_object('ok', true, 'esito', 'rifiutato');
  end if;

  if t.titolare_id is not null or t.studio_id is null then
    return studio_esito('STUDIO_NON_DISPONIBILE', 'Questo studio non accetta più collaboratori');
  end if;
  if i.role is distinct from t.role then
    return studio_esito('RUOLO_DIVERSO', 'Puoi entrare solo nello studio di un professionista con il tuo stesso ruolo');
  end if;
  if i.titolare_id is not null then
    return studio_esito('GIA_IN_STUDIO', 'Fai già parte di uno studio: lascialo prima di entrare in un altro');
  end if;
  if exists (select 1 from profiles where titolare_id = v_me) then
    return studio_esito('HAI_COLLABORATORI', 'Hai dei collaboratori nel tuo studio: per entrare in un altro studio devi prima toglierli');
  end if;
  -- Pratiche, fatture e scadenze dei propri clienti si vedono per studio: entrando altrove non le
  -- vedresti più. Per ora entra solo un account senza clienti propri (come in Svizzera).
  if exists (select 1 from profiles where role = 'cliente' and avvocato_id = v_me) then
    return studio_esito('HAI_CLIENTI', 'Hai già dei clienti tuoi: per ora può entrare in uno studio solo un account senza clienti');
  end if;
  select count(*) into v_collab from profiles where titolare_id = t.id;
  if t.posti - 1 - v_collab <= 0 then
    return studio_esito('STUDIO_PIENO', 'Lo studio non ha più posti liberi: chiedi al titolare di aggiungerne');
  end if;

  -- Un'appartenenza attiva sola (get_my_studio_id ne legge una): quella dello studio del titolare
  update studio_members set is_active = false
   where user_id = v_me and is_active and studio_id <> t.studio_id;
  insert into studio_members (studio_id, user_id, ruolo_studio, visibilita, invitato_da, joined_at, is_active)
  values (t.studio_id, v_me, 'membro', 'tutto', t.id, now(), true)
  on conflict (studio_id, user_id) do update
     set is_active    = true,
         ruolo_studio = 'membro',
         invitato_da  = excluded.invitato_da,
         joined_at    = now();

  update profiles
     set titolare_id = t.id, tipo_account = 'membro', studio_id = t.studio_id
   where id = v_me;
  perform studio_ricalcola_titolare(t.id);
  update inviti_studio set stato = 'accettato', risposto_il = now() where id = inv.id;
  -- Gli altri inviti dell'invitato, ricevuti o spediti, non hanno più senso
  update inviti_studio set stato = 'annullato', risposto_il = now()
   where stato = 'in_attesa' and id <> inv.id
     and (invitato_id = v_me or titolare_id = v_me);

  perform studio_notifica(t.id, 'invito_studio_accettato', inv.id,
    'Invito accettato', format('%s fa ora parte del tuo studio.', v_nome_i));

  return jsonb_build_object('ok', true, 'esito', 'accettato',
    'titolare', jsonb_build_object('id', t.id, 'nome', t.nome, 'cognome', t.cognome, 'studio', t.studio));
end;
$$;

-- 6. Il titolare ritira un invito ─────────────────────────────────────────
create or replace function public.studio_annulla_invito(p_invito uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
  inv  record;
begin
  if v_me is null then
    return studio_esito('NON_AUTENTICATO', 'Non autorizzato');
  end if;
  select * into inv from inviti_studio where id = p_invito for update;
  if not found or inv.titolare_id <> v_me then
    return studio_esito('INVITO_NON_TROVATO', 'Invito non trovato');
  end if;
  if inv.stato <> 'in_attesa' then
    return studio_esito('INVITO_CHIUSO', 'A questo invito è già stata data una risposta');
  end if;
  update inviti_studio set stato = 'annullato', risposto_il = now() where id = inv.id;
  -- La notifica non ancora letta porterebbe a un invito che non c'è più
  delete from notifiche
   where entita_id = inv.id and tipo = 'invito_studio' and letto_at is null;
  return jsonb_build_object('ok', true);
end;
$$;

-- 7. Il titolare toglie un collaboratore, o il collaboratore se ne va ─────────
create or replace function public.studio_rimuovi_collaboratore(p_collaboratore uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me     uuid := auth.uid();
  c        record;
  t        record;
  v_suo    uuid;
  v_nome_c text;
  v_nome_t text;
begin
  if v_me is null then
    return studio_esito('NON_AUTENTICATO', 'Non autorizzato');
  end if;
  select id, titolare_id, nome, cognome into c
    from profiles where id = p_collaboratore for update;
  if not found or c.titolare_id is null then
    return studio_esito('NON_COLLABORATORE', 'Questa persona non fa parte di uno studio');
  end if;
  if v_me <> c.titolare_id and v_me <> c.id then
    return studio_esito('ACCESSO_NEGATO', 'Puoi togliere solo i collaboratori del tuo studio');
  end if;

  select id, nome, cognome into t from profiles where id = c.titolare_id;

  -- Esce dallo studio del titolare e torna al suo, se ne aveva uno.
  -- Quello che ha registrato nello studio resta allo studio.
  select s.id into v_suo from studios s where s.titolare_id = c.id order by s.created_at limit 1;
  update studio_members set is_active = false
   where user_id = c.id and is_active and studio_id is distinct from v_suo;
  if v_suo is not null then
    insert into studio_members (studio_id, user_id, ruolo_studio, visibilita, joined_at, is_active)
    values (v_suo, c.id, 'titolare', 'tutto', now(), true)
    on conflict (studio_id, user_id) do update set is_active = true;
  end if;

  update profiles
     set titolare_id = null, tipo_account = 'singolo', studio_id = v_suo
   where id = c.id;
  perform studio_ricalcola_titolare(t.id);

  v_nome_c := btrim(coalesce(c.nome, '') || ' ' || coalesce(c.cognome, ''));
  v_nome_t := btrim(coalesce(t.nome, '') || ' ' || coalesce(t.cognome, ''));
  if v_me = t.id then
    perform studio_notifica(c.id, 'studio_rimosso', null,
      'Non fai più parte dello studio', format('%s ti ha tolto dal suo studio su Lexum.', v_nome_t));
  else
    perform studio_notifica(t.id, 'studio_lasciato', null,
      'Uscita dallo studio', format('%s ha lasciato il tuo studio.', v_nome_c));
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- 8. Accessi acquistati: li scrivono i pagamenti su studios.posti_totali (il posto aggiuntivo,
--    «seat_addon», non toccava profiles.posti_acquistati, che usano le pagine Studio e le funzioni
--    qui sopra). Da ora il numero del titolare segue quello dello studio.
create or replace function public.studio_allinea_posti()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.titolare_id is not null and new.posti_totali is not null then
    update profiles
       set posti_acquistati = new.posti_totali
     where id = new.titolare_id
       and posti_acquistati is distinct from new.posti_totali;
  end if;
  return new;
end;
$$;

drop trigger if exists studio_allinea_posti on public.studios;
create trigger studio_allinea_posti
  after insert or update of posti_totali on public.studios
  for each row execute function public.studio_allinea_posti();

-- una volta, per chi ha già comprato accessi aggiuntivi
update public.profiles p
   set posti_acquistati = s.posti_totali
  from public.studios s
 where s.titolare_id = p.id
   and s.posti_totali is not null
   and p.posti_acquistati is distinct from s.posti_totali;

-- 9. Permessi ────────────────────────────────────────────────────────────────
revoke execute on function public.studio_esito(text, text) from public, anon, authenticated;
revoke execute on function public.studio_ricalcola_titolare(uuid) from public, anon, authenticated;
revoke execute on function public.studio_notifica(uuid, text, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.studio_allinea_posti() from public, anon, authenticated;

revoke execute on function public.studio_stato_collaboratori() from public, anon;
revoke execute on function public.studio_invita_collaboratore(text) from public, anon;
revoke execute on function public.studio_rispondi_invito(uuid, boolean) from public, anon;
revoke execute on function public.studio_annulla_invito(uuid) from public, anon;
revoke execute on function public.studio_rimuovi_collaboratore(uuid) from public, anon;
grant execute on function public.studio_stato_collaboratori() to authenticated;
grant execute on function public.studio_invita_collaboratore(text) to authenticated;
grant execute on function public.studio_rispondi_invito(uuid, boolean) to authenticated;
grant execute on function public.studio_annulla_invito(uuid) to authenticated;
grant execute on function public.studio_rimuovi_collaboratore(uuid) to authenticated;

-- 10. posti_usati coerente (1 = il titolare stesso) ─────────────────────────
update public.profiles p
   set posti_usati = 1 + (select count(*) from public.profiles c where c.titolare_id = p.id)
 where p.role in ('avvocato', 'commercialista')
   and p.posti_usati is distinct from 1 + (select count(*) from public.profiles c where c.titolare_id = p.id);
