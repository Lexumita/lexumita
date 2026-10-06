-- ═══════════════════════════════════════════════════════════════════════════
-- Notifiche push sul telefono — Lexum IT, 06-10-2026
--
-- Due avvisi, anche ad app chiusa:
--   · «la risposta di Lex è pronta»: quando l'app va in background mentre Lex scrive, chiama
--     lex_avvisami(domanda); quando la risposta arriva in lex_logs (riga del synthesizer, esito ok,
--     stessa domanda, come lex_recupera_risposta) si manda l'avviso e l'attesa si toglie. Tornando
--     nell'app, lex_non_avvisare(). Le funzioni di Lex non cambiano.
--   · le notifiche della campanella (tabella notifiche), per chi le vuole.
-- Le righe da mandare vanno in push_coda; un trigger sveglia la funzione invia-push (pg_net), che le
-- prende con push_prendi() (una volta sola anche con due chiamate insieme) e le spedisce con Expo.
-- I telefoni li registra l'app (registra_dispositivo_push): dal browser non si scrive niente.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. I telefoni ─────────────────────────────────────────────────────────────
create table if not exists public.dispositivi_push (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  token        text not null unique,
  piattaforma  text not null check (piattaforma in ('ios', 'android')),
  lingua       text not null default 'it' check (lingua in ('it', 'de', 'fr')),
  risposte_lex boolean not null default true,
  studio       boolean not null default true,
  attivo       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists dispositivi_push_utente on public.dispositivi_push (user_id) where attivo;

alter table public.dispositivi_push enable row level security;
revoke all on public.dispositivi_push from anon, authenticated;
grant select on public.dispositivi_push to authenticated;
drop policy if exists dispositivi_push_propri on public.dispositivi_push;
create policy dispositivi_push_propri on public.dispositivi_push
  for select to authenticated using (user_id = (select auth.uid()));

-- Registra (o riprende) il telefono per l'utente: se il telefono era di un altro account, passa a
-- questo e le preferenze ripartono.
create or replace function public.registra_dispositivo_push(p_token text, p_piattaforma text, p_lingua text default 'it')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
  r    record;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'codice', 'NON_AUTENTICATO');
  end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[^]\s]{1,180}\]$' then
    return jsonb_build_object('ok', false, 'codice', 'TOKEN_NON_VALIDO');
  end if;
  if p_piattaforma is null or p_piattaforma not in ('ios', 'android') then
    return jsonb_build_object('ok', false, 'codice', 'PIATTAFORMA_NON_VALIDA');
  end if;
  insert into dispositivi_push as d (user_id, token, piattaforma, lingua)
  values (v_me, p_token, p_piattaforma,
          case when p_lingua in ('it', 'de', 'fr') then p_lingua else 'it' end)
  on conflict (token) do update
     set risposte_lex = case when d.user_id = excluded.user_id then d.risposte_lex else true end,
         studio       = case when d.user_id = excluded.user_id then d.studio else true end,
         user_id      = excluded.user_id,
         piattaforma  = excluded.piattaforma,
         lingua       = excluded.lingua,
         attivo       = true,
         updated_at   = now()
  returning d.risposte_lex, d.studio into r;
  return jsonb_build_object('ok', true, 'risposte_lex', r.risposte_lex, 'studio', r.studio);
end;
$$;

create or replace function public.imposta_dispositivo_push(p_token text, p_risposte_lex boolean, p_studio boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'codice', 'NON_AUTENTICATO');
  end if;
  update dispositivi_push
     set risposte_lex = coalesce(p_risposte_lex, risposte_lex),
         studio       = coalesce(p_studio, studio),
         updated_at   = now()
   where token = p_token and user_id = auth.uid()
  returning risposte_lex, studio into r;
  if not found then
    return jsonb_build_object('ok', false, 'codice', 'NON_TROVATO');
  end if;
  return jsonb_build_object('ok', true, 'risposte_lex', r.risposte_lex, 'studio', r.studio);
end;
$$;

-- Uscendo dall'account, il telefono non riceve più gli avvisi di quell'account.
create or replace function public.rimuovi_dispositivo_push(p_token text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.dispositivi_push where token = p_token and user_id = auth.uid();
$$;

-- 2. Le attese di una risposta di Lex ───────────────────────────────────────
create table if not exists public.lex_attese_push (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  domanda  text not null,
  creata   timestamptz not null default now(),
  scade    timestamptz not null default (now() + interval '30 minutes')
);
create index if not exists lex_attese_push_utente on public.lex_attese_push (user_id);
alter table public.lex_attese_push enable row level security;
revoke all on public.lex_attese_push from anon, authenticated;

create or replace function public.lex_avvisami(p_domanda text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or coalesce(btrim(p_domanda), '') = '' then
    return;
  end if;
  delete from lex_attese_push
   where user_id = auth.uid() and (scade < now() or domanda = p_domanda);
  insert into lex_attese_push (user_id, domanda) values (auth.uid(), p_domanda);
end;
$$;

create or replace function public.lex_non_avvisare()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.lex_attese_push where user_id = auth.uid();
$$;

-- 3. La coda ────────────────────────────────────────────────────────────────
create table if not exists public.push_coda (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  genere   text not null check (genere in ('lex', 'studio')),
  titolo   text not null default '',
  testo    text not null default '',
  dati     jsonb not null default '{}'::jsonb,
  creata   timestamptz not null default now(),
  inviata  timestamptz,
  esito    text
);
create index if not exists push_coda_da_mandare on public.push_coda (creata) where inviata is null;
alter table public.push_coda enable row level security;
revoke all on public.push_coda from anon, authenticated;

-- Prende le righe da mandare (dell'ultimo giorno) e le segna: due invii insieme non le mandano due volte.
create or replace function public.push_prendi(p_quanti integer default 100)
returns setof public.push_coda
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.push_coda c
     set inviata = now(), esito = 'in_invio'
   where c.id in (
     select id from public.push_coda
      where inviata is null and creata > now() - interval '1 day'
      order by creata
      limit greatest(1, least(coalesce(p_quanti, 100), 500))
      for update skip locked)
  returning c.*;
$$;

-- Sveglia invia-push (pg_net parte solo se la transazione va a buon fine).
create or replace function public.push_avvia()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform net.http_post(
    url     := 'https://wnbmyiyblpinayswunxb.supabase.co/functions/v1/invia-push',
    body    := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return null;
exception when others then
  return null;
end;
$$;

drop trigger if exists push_coda_avvia on public.push_coda;
create trigger push_coda_avvia
  after insert on public.push_coda
  for each statement execute function public.push_avvia();

-- 4. Dalla campanella ────────────────────────────────────────────────────────
create or replace function public.push_da_notifica()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  begin
    if exists (select 1 from dispositivi_push d
                where d.user_id = new.user_id and d.attivo and d.studio) then
      insert into push_coda (user_id, genere, titolo, testo, dati)
      values (new.user_id, 'studio',
              coalesce(nullif(btrim(new.titolo), ''), 'Lexum'),
              left(coalesce(new.descrizione, ''), 180),
              jsonb_build_object('paese', 'IT', 'link', new.link, 'notifica_id', new.id));
    end if;
  exception when others then
    -- la notifica nella campanella resta comunque
    null;
  end;
  return null;
end;
$$;

drop trigger if exists notifiche_push on public.notifiche;
create trigger notifiche_push
  after insert on public.notifiche
  for each row execute function public.push_da_notifica();

-- 5. Dalla risposta di Lex ──────────────────────────────────────────────────
create or replace function public.push_da_risposta_lex()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attese integer;
begin
  begin
    if new.user_id is null or coalesce(new.esito, '') <> 'ok' then
      return null;
    end if;
    with tolte as (
      delete from lex_attese_push a
       where a.user_id = new.user_id and a.domanda = new.domanda and a.scade > now()
      returning 1)
    select count(*) into v_attese from tolte;
    if v_attese > 0 and exists (select 1 from dispositivi_push d
                                 where d.user_id = new.user_id and d.attivo and d.risposte_lex) then
      insert into push_coda (user_id, genere, dati)
      values (new.user_id, 'lex', jsonb_build_object('paese', 'IT', 'tipo', 'lex'));
    end if;
  exception when others then
    -- il registro di Lex non si ferma mai per un avviso
    null;
  end;
  return null;
end;
$$;

drop trigger if exists lex_logs_push on public.lex_logs;
create trigger lex_logs_push
  after insert on public.lex_logs
  for each row
  when (new.risposta_text is not null and new.endpoint = 'synthesizer')
  execute function public.push_da_risposta_lex();

drop trigger if exists lex_logs_push_aggiornata on public.lex_logs;
create trigger lex_logs_push_aggiornata
  after update of risposta_text on public.lex_logs
  for each row
  when (old.risposta_text is null and new.risposta_text is not null and new.endpoint = 'synthesizer')
  execute function public.push_da_risposta_lex();

-- 6. Permessi ────────────────────────────────────────────────────────────────
revoke execute on function public.push_prendi(integer) from public, anon, authenticated;
grant execute on function public.push_prendi(integer) to service_role;
revoke execute on function public.push_avvia() from public, anon, authenticated;
revoke execute on function public.push_da_notifica() from public, anon, authenticated;
revoke execute on function public.push_da_risposta_lex() from public, anon, authenticated;

revoke execute on function public.registra_dispositivo_push(text, text, text) from public, anon;
revoke execute on function public.imposta_dispositivo_push(text, boolean, boolean) from public, anon;
revoke execute on function public.rimuovi_dispositivo_push(text) from public, anon;
revoke execute on function public.lex_avvisami(text) from public, anon;
revoke execute on function public.lex_non_avvisare() from public, anon;
grant execute on function public.registra_dispositivo_push(text, text, text) to authenticated;
grant execute on function public.imposta_dispositivo_push(text, boolean, boolean) to authenticated;
grant execute on function public.rimuovi_dispositivo_push(text) to authenticated;
grant execute on function public.lex_avvisami(text) to authenticated;
grant execute on function public.lex_non_avvisare() to authenticated;
