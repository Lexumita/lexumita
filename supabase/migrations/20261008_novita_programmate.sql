-- ============================================================================
-- Novità: pubblicazione programmata
--
-- L'admin sceglie giorno e ora: l'articolo resta invisibile (stato
-- 'programmato') finché il controllo automatico non lo pubblica. Il controllo
-- gira ogni 5 ore (alle 3, 8, 13, 18, 23 ora legale italiana): conta che
-- l'articolo esca in quel giorno, non al minuto. Quando pubblica qualcosa fa
-- ripartire il rilascio del sito (deploy hook di Vercel in impostazioni_sito),
-- così l'articolo ha la sua testata per Google e la sua voce nella sitemap.
-- ============================================================================

alter table public.novita add column if not exists programmato_il timestamptz;

alter table public.novita drop constraint if exists novita_stato_check;
alter table public.novita add constraint novita_stato_check
  check (stato in ('bozza', 'programmato', 'pubblicato'));
alter table public.novita drop constraint if exists novita_programmato_ha_data;
alter table public.novita add constraint novita_programmato_ha_data
  check (stato <> 'programmato' or programmato_il is not null);

create index if not exists novita_programmate on public.novita (programmato_il) where stato = 'programmato';

-- Pubblica gli articoli arrivati alla loro data e, se ce n'è almeno uno,
-- rigenera il sito una volta sola. La lettura pubblica resta sui soli
-- 'pubblicato' (policy novita_lettura_pubblica): i programmati non si vedono.
create or replace function public.novita_pubblica_programmati()
returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  n    integer;
  hook text;
begin
  update public.novita
     set stato = 'pubblicato',
         pubblicato_il = coalesce(pubblicato_il, programmato_il, now())
   where stato = 'programmato' and programmato_il <= now();
  get diagnostics n = row_count;

  if n > 0 then
    select valore into hook from public.impostazioni_sito where chiave = 'vercel_deploy_hook';
    -- stesso controllo della edge rigenera-sito: solo un deploy hook di Vercel
    if hook ~ '^https://api\.vercel\.com/v[0-9]+/integrations/deploy/' then
      perform net.http_post(url := hook, body := '{}'::jsonb);
    end if;
  end if;
  return n;
end $$;

revoke all on function public.novita_pubblica_programmati() from public, anon, authenticated;

-- Ogni 5 ore (UTC: 1, 6, 11, 16, 21 = 3, 8, 13, 18, 23 ora legale italiana)
select cron.unschedule(jobid) from cron.job where jobname = 'novita-programmati';
select cron.schedule('novita-programmati', '0 1,6,11,16,21 * * *', 'select public.novita_pubblica_programmati()');
