-- 06-10-2026 · Collaboratori IT, seconda parte: due titolari hanno DUE studi (uno in uso, profiles.studio_id,
-- e uno vecchio). Gli accessi del profilo seguono solo lo studio in uso, e il ricalcolo dei posti usati
-- tocca solo quello. (Il riallineamento di una volta, nella prima parte, aveva già dato il numero giusto.)

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
       and studio_id = new.id
       and posti_acquistati is distinct from new.posti_totali;
  end if;
  return new;
end;
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
  update studios s
     set posti_usati = 1 + v_n
    from profiles p
   where p.id = p_titolare
     and s.id = p.studio_id
     and s.titolare_id = p_titolare
     and s.posti_usati is distinct from 1 + v_n;
end;
$$;

revoke execute on function public.studio_allinea_posti() from public, anon, authenticated;
revoke execute on function public.studio_ricalcola_titolare(uuid) from public, anon, authenticated;
