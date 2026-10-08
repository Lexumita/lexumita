-- 08-10-2026 (controllo di sicurezza, fase 2): l'assistenza si trova senza leggere i profili admin.
--
-- Siti e app leggevano i profili degli amministratori (regola «Tutti gli autenticati leggono profili
-- admin») solo per sapere a chi mandare una richiesta di assistenza e per riconoscere i ticket con
-- Lexum. Ma così ogni utente registrato leggeva quei profili per intero (email, telefono, codice
-- fiscale, IBAN...). Queste due funzioni danno solo gli id, come in Svizzera:
--   get_supporto_admin_id()  -> il primo amministratore (il destinatario delle nuove richieste);
--   get_supporto_admin_ids() -> tutti gli amministratori (per riconoscere i ticket con Lexum).
-- La regola si toglie con 20261008_profili_admin_non_leggibili.sql, dopo la pubblicazione dei siti.

create or replace function public.get_supporto_admin_id()
returns uuid
language sql
stable security definer
set search_path to 'public'
as $function$
  select id
  from public.profiles
  where role = 'admin'
  order by created_at asc
  limit 1
$function$;

create or replace function public.get_supporto_admin_ids()
returns uuid[]
language sql
stable security definer
set search_path to 'public'
as $function$
  select coalesce(array_agg(id order by created_at asc), '{}')
  from public.profiles
  where role = 'admin'
$function$;

revoke all on function public.get_supporto_admin_id() from public, anon;
revoke all on function public.get_supporto_admin_ids() from public, anon;
grant execute on function public.get_supporto_admin_id() to authenticated, service_role;
grant execute on function public.get_supporto_admin_ids() to authenticated, service_role;
