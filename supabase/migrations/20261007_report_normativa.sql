-- ============================================================================
-- Report settimanale della normativa (admin → Normativa → Report)
-- + collegamenti Instagram / TikTok sugli articoli delle Novità
--
-- 1. norme_modifiche: il TESTO PRIMA E DOPO di ogni articolo cambiato dal giro
--    settimanale. Prima il giro sovrascriveva l'articolo e il testo vecchio si
--    perdeva: il registro diceva QUALI articoli, non COME. La scrivono gli script
--    in ~/LEXUM norme (rebaseline_codici.py, sync_archivio.py) con la chiave di
--    servizio; si registrano solo i cambi VERI (corpo del testo), non quelli di
--    note e impaginazione.
-- 2. report_normativa(da, a): il riepilogo di una settimana in un colpo solo.
--    Nessuna AI: solo dati, costo zero.
-- 3. novita.instagram_url / tiktok_url: se valorizzati, l'articolo mostra il
--    collegamento al post; se vuoti, niente.
-- ============================================================================

create table if not exists public.norme_modifiche (
  id           bigint generated always as identity primary key,
  ambito       text not null check (ambito in ('codice', 'archivio')),
  codice       text,                       -- solo ambito codice (es. 'penale')
  urn          text,                       -- urn Normattiva dell'atto
  titolo_atto  text,
  articolo     text not null,              -- etichetta come in norme/norme_archivio
  tipo         text not null check (tipo in ('nuovo', 'modificato', 'abrogato')),
  atto_nuovo   boolean not null default false,   -- l'intero atto è entrato ora in archivio
  rubrica      text,
  testo_prima  text,                       -- null per i nuovi
  testo_dopo   text,                       -- null per gli abrogati
  giro_il      date not null default current_date,
  creato_il    timestamptz not null default now()
);
create index if not exists norme_modifiche_giro on public.norme_modifiche (giro_il desc);
create index if not exists norme_modifiche_atto on public.norme_modifiche (ambito, coalesce(codice, urn), giro_il desc);

alter table public.norme_modifiche enable row level security;
drop policy if exists norme_modifiche_admin on public.norme_modifiche;
create policy norme_modifiche_admin on public.norme_modifiche for select using (public.is_admin());
revoke all on public.norme_modifiche from public, anon;
revoke all on public.norme_modifiche from authenticated;
grant select on public.norme_modifiche to authenticated;

-- ── Il report di un intervallo di date ──────────────────────────────────────
create or replace function public.report_normativa(p_da date, p_a date)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  da timestamptz := p_da::timestamptz;
  a  timestamptz := (p_a + 1)::timestamptz;   -- p_a incluso
  r  jsonb;
begin
  if not public.is_admin() then
    raise exception 'accesso negato' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'da', p_da, 'a', p_a,

    -- Il giro delle norme: ha funzionato? Un errore conta solo se resta APERTO:
    -- se lo stesso atto è stato aggiornato dopo (secondo tentativo), è risolto.
    'giro', (
      with g as (
        select n.*, coalesce(n.codice, n.urn, n.titolo) as chiave
        from public.norme_aggiornamenti n where n.eseguito_il >= da and n.eseguito_il < a),
      aperti as (
        select e.* from g e
        where e.esito = 'errore'
          and not exists (select 1 from g s where s.ambito = e.ambito and s.chiave = e.chiave
                            and s.esito <> 'errore' and s.eseguito_il > e.eseguito_il)
          and not exists (select 1 from g s where s.ambito = e.ambito and s.chiave = e.chiave
                            and s.esito = 'errore' and s.eseguito_il > e.eseguito_il))
      select jsonb_build_object(
        'ultimo', (select max(eseguito_il) from g),
        'controlli', (select count(distinct (ambito, chiave)) from g where ambito <> 'ue'),
        'aggiornati', (select count(distinct (ambito, chiave)) from g where ambito <> 'ue' and esito in ('aggiornato', 'nuovo')),
        'errori', (select count(*) from aperti),
        'errori_risolti', (select count(*) from g where esito = 'errore') - (select count(*) from aperti),
        'elenco_errori', coalesce((select jsonb_agg(jsonb_build_object(
            'ambito', ambito, 'codice', codice, 'titolo', titolo,
            'messaggio', messaggio, 'eseguito_il', eseguito_il) order by eseguito_il desc) from aperti), '[]'::jsonb),
        'ue_atti', (select count(*) from g where ambito = 'ue' and esito <> 'errore'))),

    -- Gli atti con cambi veri, dal registro del prima/dopo
    'norme', coalesce((
      select jsonb_agg(x order by x->>'titolo_atto') from (
        select jsonb_build_object(
          'ambito', ambito, 'codice', codice, 'urn', urn,
          'titolo_atto', max(titolo_atto),
          'atto_nuovo', bool_or(atto_nuovo),
          'nuovi', count(*) filter (where tipo = 'nuovo'),
          'modificati', count(*) filter (where tipo = 'modificato'),
          'abrogati', count(*) filter (where tipo = 'abrogato'),
          'giro_il', max(giro_il)) x
        from public.norme_modifiche
        where giro_il >= p_da and giro_il <= p_a
        group by ambito, codice, urn) t), '[]'::jsonb),

    -- Sentenze: quanti documenti nuovi per fonte, ed eventuali errori del giro
    'giurisprudenza', coalesce((
      select jsonb_agg(x order by (x->>'nuovi')::int desc) from (
        select jsonb_build_object(
          'fonte', fonte, 'nuovi', coalesce(sum(nuovi), 0), 'errori', coalesce(sum(errori), 0),
          'esito', (array_agg(esito order by eseguito_il desc))[1],
          'messaggio', (array_agg(messaggio order by eseguito_il desc))[1]) x
        from public.giurisprudenza_aggiornamenti
        where eseguito_il >= da and eseguito_il < a
        group by fonte) t), '[]'::jsonb),

    -- Prassi: documenti entrati nella settimana, per autorità
    'prassi', coalesce((
      select jsonb_agg(jsonb_build_object('fonte', fonte, 'nuovi', n) order by n desc) from (
        select fonte, count(*) n from public.prassi
        where created_at >= da and created_at < a group by fonte) t), '[]'::jsonb)
  ) into r;
  return r;
end $$;

revoke execute on function public.report_normativa(date, date) from public, anon;
grant execute on function public.report_normativa(date, date) to authenticated;

-- ── Novità: collegamento al post sui social ─────────────────────────────────
alter table public.novita add column if not exists instagram_url text;
alter table public.novita add column if not exists tiktok_url text;
alter table public.novita drop constraint if exists novita_instagram_url_valido;
alter table public.novita add constraint novita_instagram_url_valido
  check (instagram_url is null or instagram_url ~ '^https://(www\.)?instagram\.com/');
alter table public.novita drop constraint if exists novita_tiktok_url_valido;
alter table public.novita add constraint novita_tiktok_url_valido
  check (tiktok_url is null or tiktok_url ~ '^https://(www\.|vm\.)?tiktok\.com/');
