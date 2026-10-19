-- =====================================================================================
-- Metriche per il pannello admin (19-10-2026): «Blog e sito» e «Il percorso dei nuovi iscritti».
--
-- 1. Contatore delle visite della vetrina (pagine pubbliche e pagine di accesso).
--    Si salvano solo: giorno, indirizzo della pagina, canale di provenienza, numero di visite.
--    Niente cookie, niente IP, niente dati personali: per questo non serve il consenso.
--    La provenienza si calcola qui dal dominio di chi rimanda (instagram.com → instagram…) o
--    dall'utm_source del collegamento; le pagine viste dopo la prima, nella stessa visita,
--    arrivano come «interno».
-- 2. admin_metriche_sito(giorni): visite al giorno, pagine e articoli più visti, provenienze.
-- 3. admin_percorso_iscritti(giorni): iscritti → email confermata → prima domanda a Lex → acquisto.
-- Le due funzioni admin rispondono solo a un admin con la verifica in due passaggi (is_admin()).
-- =====================================================================================

create table if not exists public.visite_pagine (
  giorno date not null,
  percorso text not null,
  provenienza text not null,
  visite integer not null default 0,
  primary key (giorno, percorso, provenienza)
);
alter table public.visite_pagine enable row level security;
revoke all on public.visite_pagine from public, anon, authenticated;

-- Canale di provenienza dal dominio di chi rimanda e dall'utm_source
create or replace function public.provenienza_visita(p_referrer text, p_utm text)
returns text
language sql
immutable
set search_path to 'public', 'pg_temp'
as $$
  select case
    when nullif(btrim(p_utm), '') is not null then
      left(regexp_replace(lower(btrim(p_utm)), '[^a-z0-9_.-]', '', 'g'), 30)
    when nullif(btrim(p_referrer), '') is null then 'diretto'
    else (
      with h as (select regexp_replace(lower(btrim(p_referrer)), '^www\.', '') as host)
      select case
        when host = 'interno' or host ~ '(^|\.)lexum\.(it|ch)$' then 'interno'
        when host ~ '(^|\.)instagram\.com$' then 'instagram'
        when host ~ '(^|\.)(facebook\.com|fb\.me|fb\.com)$' then 'facebook'
        when host ~ '(^|\.)(linkedin\.com|lnkd\.in)$' then 'linkedin'
        when host ~ '(^|\.)tiktok\.com$' then 'tiktok'
        when host ~ '(^|\.)(t\.co|x\.com|twitter\.com)$' then 'x'
        when host ~ '(^|\.)(whatsapp\.com|wa\.me)$' then 'whatsapp'
        when host ~ '(^|\.)google\.[a-z.]+$' or host ~ '^google\.' then 'google'
        when host ~ '(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org)$' and host !~ '^mail\.' then 'altri motori'
        when host ~ '^(mail|webmail|posta)\.' or host ~ '(outlook\.(live|office)\.com|mail\.google\.com|libero\.it|virgilio\.it|aruba\.it)$' then 'email'
        else left(regexp_replace(host, '[^a-z0-9.-]', '', 'g'), 60)
      end
      from h
    )
  end
$$;

-- Registra una pagina vista. La chiama il sito, anche senza accesso.
create or replace function public.registra_visita(p_percorso text, p_referrer text default null, p_utm text default null)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_percorso text := lower(split_part(split_part(coalesce(p_percorso, ''), '?', 1), '#', 1));
begin
  -- solo indirizzi del sito, brevi e puliti
  if v_percorso !~ '^/[a-z0-9/_.-]{0,199}$' or v_percorso ~ '\.\.' then
    return;
  end if;
  if length(v_percorso) > 1 then
    v_percorso := rtrim(v_percorso, '/');
  end if;
  insert into public.visite_pagine as v (giorno, percorso, provenienza, visite)
  values ((now() at time zone 'Europe/Rome')::date, v_percorso, public.provenienza_visita(p_referrer, p_utm), 1)
  on conflict (giorno, percorso, provenienza) do update set visite = v.visite + 1;
end
$$;
revoke all on function public.registra_visita(text, text, text) from public;
grant execute on function public.registra_visita(text, text, text) to anon, authenticated;
revoke all on function public.provenienza_visita(text, text) from public, anon, authenticated;

-- ── Blog e sito ─────────────────────────────────────────────────────────────────────
create or replace function public.admin_metriche_sito(p_giorni integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
  dal date;
  dal_prima date;
  ris jsonb;
begin
  if not public.is_admin() then
    raise exception 'Solo per gli amministratori' using errcode = '42501';
  end if;
  dal := case when p_giorni is null then date '2000-01-01' else oggi - (p_giorni - 1) end;
  dal_prima := case when p_giorni is null then null else dal - p_giorni end;

  select jsonb_build_object(
    'dal', dal,
    'al', oggi,
    'primo_giorno_contato', (select min(giorno) from visite_pagine),
    'visite', (select coalesce(sum(visite), 0) from visite_pagine where giorno >= dal),
    'visite_periodo_prima', case when dal_prima is null then null else
        (select coalesce(sum(visite), 0) from visite_pagine where giorno >= dal_prima and giorno < dal) end,
    'ingressi', (select coalesce(sum(visite), 0) from visite_pagine where giorno >= dal and provenienza <> 'interno'),
    'visite_articoli', (select coalesce(sum(visite), 0) from visite_pagine where giorno >= dal and percorso like '/novita/%'),
    'per_giorno', coalesce((
        select jsonb_agg(jsonb_build_object('giorno', g, 'visite', coalesce(s, 0), 'articoli', coalesce(a, 0)) order by g)
          from (
            select gs::date as g,
                   (select sum(visite) from visite_pagine v where v.giorno = gs::date) as s,
                   (select sum(visite) from visite_pagine v where v.giorno = gs::date and v.percorso like '/novita/%') as a
              from generate_series(greatest(dal, coalesce((select min(giorno) from visite_pagine), oggi)), oggi, interval '1 day') gs
          ) x), '[]'::jsonb),
    'pagine', coalesce((
        select jsonb_agg(jsonb_build_object('percorso', percorso, 'visite', tot) order by tot desc)
          from (select percorso, sum(visite) as tot from visite_pagine where giorno >= dal
                 group by percorso order by tot desc limit 20) p), '[]'::jsonb),
    'provenienze', coalesce((
        select jsonb_agg(jsonb_build_object('provenienza', provenienza, 'ingressi', tot) order by tot desc)
          from (select provenienza, sum(visite) as tot from visite_pagine where giorno >= dal and provenienza <> 'interno'
                 group by provenienza order by tot desc limit 15) p), '[]'::jsonb),
    'articoli', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'slug', n.slug, 'titolo', n.titolo, 'categoria', n.categoria, 'pubblicato_il', n.pubblicato_il,
                 'visite', coalesce(vp.periodo, 0), 'visite_totali', coalesce(vt.totali, 0),
                 'da_instagram', coalesce(vp.instagram, 0))
               order by coalesce(vp.periodo, 0) desc, n.pubblicato_il desc)
          from novita n
          left join lateral (select sum(visite) as periodo,
                                    sum(visite) filter (where provenienza = 'instagram') as instagram
                               from visite_pagine where percorso = '/novita/' || n.slug and giorno >= dal) vp on true
          left join lateral (select sum(visite) as totali from visite_pagine where percorso = '/novita/' || n.slug) vt on true
         where n.stato = 'pubblicato'), '[]'::jsonb),
    'articoli_programmati', (select count(*) from novita where stato = 'programmato')
  ) into ris;
  return ris;
end
$$;
revoke all on function public.admin_metriche_sito(integer) from public, anon;
grant execute on function public.admin_metriche_sito(integer) to authenticated;

-- ── Il percorso dei nuovi iscritti ──────────────────────────────────────────────────
create or replace function public.admin_percorso_iscritti(p_giorni integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
  dal date;
  ris jsonb;
begin
  if not public.is_admin() then
    raise exception 'Solo per gli amministratori' using errcode = '42501';
  end if;
  dal := case when p_giorni is null then date '2000-01-01' else oggi - (p_giorni - 1) end;

  with iscritti as (
    select u.id, u.created_at, (u.created_at at time zone 'Europe/Rome')::date as giorno,
           u.email_confirmed_at is not null as confermata,
           coalesce(p.role, 'user') as ruolo,
           nullif(btrim(coalesce(p.nome, '') || ' ' || coalesce(p.cognome, '')), '') as nome,
           u.email,
           (select min(l.created_at) from public.lex_logs l
             where l.user_id = u.id and l.domanda is not null and l.domanda <> '') as prima_domanda,
           exists (select 1 from public.transazioni t
                    where t.user_id = u.id and t.stato = 'completato' and coalesce(t.tipo, '') <> 'gratuito') as acquisto
      from auth.users u
      left join public.profiles p on p.id = u.id
     where (u.created_at at time zone 'Europe/Rome')::date >= dal
       and coalesce(p.role, 'user') not in ('admin', 'commerciale')
  )
  select jsonb_build_object(
    'dal', dal,
    'al', oggi,
    'tappe', jsonb_build_object(
        'iscritti', (select count(*) from iscritti),
        'email_confermata', (select count(*) from iscritti where confermata),
        'prima_domanda', (select count(*) from iscritti where prima_domanda is not null),
        'acquisto', (select count(*) from iscritti where acquisto)),
    'ore_alla_prima_domanda', (select round((percentile_cont(0.5) within group (
        order by extract(epoch from (prima_domanda - created_at)) / 3600))::numeric, 1)
        from iscritti where prima_domanda is not null),
    'per_ruolo', coalesce((
        select jsonb_agg(jsonb_build_object('ruolo', ruolo, 'iscritti', n, 'email_confermata', c,
                                            'prima_domanda', d, 'acquisto', a) order by n desc)
          from (select ruolo, count(*) n, count(*) filter (where confermata) c,
                       count(*) filter (where prima_domanda is not null) d, count(*) filter (where acquisto) a
                  from iscritti group by ruolo) r), '[]'::jsonb),
    'per_giorno', coalesce((
        select jsonb_agg(jsonb_build_object('giorno', g, 'iscritti', coalesce(n, 0)) order by g)
          from (select gs::date as g, (select count(*) from iscritti i where i.giorno = gs::date) as n
                  from generate_series(greatest(dal, coalesce((select min(giorno) from iscritti), oggi)), oggi, interval '1 day') gs) x),
        '[]'::jsonb),
    'ultimi', coalesce((
        select jsonb_agg(jsonb_build_object('id', id, 'quando', created_at, 'nome', nome, 'email', email, 'ruolo', ruolo,
                                            'email_confermata', confermata, 'prima_domanda', prima_domanda is not null,
                                            'acquisto', acquisto) order by created_at desc)
          from (select * from iscritti order by created_at desc limit 30) u), '[]'::jsonb)
  ) into ris;
  return ris;
end
$$;
revoke all on function public.admin_percorso_iscritti(integer) from public, anon;
grant execute on function public.admin_percorso_iscritti(integer) to authenticated;
