-- Abbonamenti dei privati (28-10-2026): chi ha un abbonamento che si rinnova da solo non riceve
-- «il tuo piano sta per scadere» né «lo spazio aggiuntivo sta per scadere». Chi ha disdetto sì.
-- (applicata il 28-10-2026; testo completo delle funzioni nella migrazione registrata sul database:
--  piani_personali_da_avvisare e scadenze_da_avvisare con «not exists (… abbonamenti …)»)
create or replace function public.piani_personali_da_avvisare()
 returns table(user_id uuid, email text, nome text, tipo text, scadenza timestamp with time zone, scadenza_testo text, crediti integer, spazio_gb integer, spazio_gratuito text)
 language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  with candidati as (
    select p.id, p.email, p.nome, p.abbonamento_scadenza as scadenza,
           case when p.abbonamento_scadenza > now() then 'in_scadenza' else 'scaduto' end as tipo,
           pr.crediti_ai_mensili, pr.spazio_gb
    from public.profiles p
    join public.prodotti pr on pr.id = p.piano_id and pr.tipo = 'piano_privato'
    where p.role = 'user'
      and coalesce(p.email, '') <> ''
      and p.abbonamento_scadenza >  now() - interval '3 days'
      and p.abbonamento_scadenza <= now() + interval '3 days'
      and not exists (
        select 1 from public.abbonamenti b
        where b.user_id = p.id and b.genere = 'piano'
          and (b.stato in ('attivo', 'in_ritardo') or b.prodotto_successivo_id is not null)
          and (b.periodo_fine is null or b.periodo_fine > now() - interval '3 days'))
  )
  select c.id, c.email, c.nome, c.tipo, c.scadenza,
         to_char(c.scadenza at time zone 'Europe/Rome', 'DD/MM/YYYY'),
         coalesce(c.crediti_ai_mensili, 0), coalesce(c.spazio_gb, 0),
         pg_size_pretty(52428800::bigint)
  from candidati c
  where not exists (
    select 1 from public.avvisi_piano_inviati a
    where a.user_id = c.id and a.scadenza = c.scadenza and a.tipo = c.tipo
  )
  order by c.scadenza
$function$;
-- scadenze_da_avvisare: nella parte «spazio_in_scadenza» in più
--   and not exists (select 1 from public.abbonamenti b
--                   where b.id = s.abbonamento_id and b.stato in ('attivo', 'in_ritardo'))
