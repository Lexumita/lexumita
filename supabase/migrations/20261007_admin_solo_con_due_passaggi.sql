-- 07-10-2026 (controllo di sicurezza prima della pubblicazione dell'app, approvato da Antonino).
-- I poteri da admin valgono solo con la verifica in due passaggi completata (`aal2` nel token). Prima
-- bastava un accesso con il ruolo admin anche con la sola password: chi avesse avuto la password di un
-- admin poteva leggere e modificare tutto interrogando il server direttamente, senza il codice. Gli admin
-- (tutti con i due passaggi) entrano già con il codice dal sito: per loro non cambia nulla.
create or replace function public.is_admin()
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'auth', 'pg_temp'
as $function$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$function$;

create or replace function public.testi_e_admin()
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select public.is_admin()
$function$;

create or replace function public.questionario_e_admin()
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select public.is_admin()
$function$;

create or replace function public.admin_get_email_status(p_user_id uuid)
 returns table(email_confirmed boolean, email_confirmed_at timestamp with time zone, last_sign_in_at timestamp with time zone)
 language plpgsql
 security definer
 set search_path to 'public', 'auth'
as $function$
begin
  if not public.is_admin() then
    raise exception 'Permesso negato';
  end if;

  return query
  select (u.email_confirmed_at is not null) as email_confirmed, u.email_confirmed_at, u.last_sign_in_at
  from auth.users u
  where u.id = p_user_id;
end;
$function$;

-- Le regole che controllavano l'admin «a mano» (profilo con ruolo admin) passano da is_admin().
do $$
declare
  r record;
  modello constant text := 'EXISTS \(\s*SELECT 1\s+FROM profiles(\s+p)?\s+WHERE \(\((profiles|p)\.id = auth\.uid\(\)\) AND \((profiles|p)\.role = ''admin''::text\)\)\)';
  usando text;
  controllo text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where (coalesce(qual, '') || coalesce(with_check, '')) ~ modello
  loop
    usando := regexp_replace(r.qual, modello, 'public.is_admin()', 'g');
    controllo := regexp_replace(r.with_check, modello, 'public.is_admin()', 'g');
    if r.qual is not null and r.with_check is not null then
      execute format('alter policy %I on %I.%I using (%s) with check (%s)',
                     r.policyname, r.schemaname, r.tablename, usando, controllo);
    elsif r.qual is not null then
      execute format('alter policy %I on %I.%I using (%s)', r.policyname, r.schemaname, r.tablename, usando);
    else
      execute format('alter policy %I on %I.%I with check (%s)', r.policyname, r.schemaname, r.tablename, controllo);
    end if;
  end loop;
end $$;

-- Il ricalcolo dello stato di una fattura lo chiamano solo i trigger del database (che girano con i
-- permessi del proprietario): nessuno lo chiama da fuori, nemmeno senza accesso come era possibile.
revoke execute on function public.aggiorna_stato_fattura(uuid, boolean) from public, anon, authenticated;
