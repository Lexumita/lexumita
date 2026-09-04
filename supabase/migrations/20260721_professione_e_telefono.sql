-- Registrazione: nuovo campo obbligatorio "professione" + recupero del telefono.
--
-- 1) profiles.professione: professione dichiarata dall'utente in fase di
--    registrazione. E' cosa diversa da profiles.role (che governa i permessi):
--    qui l'utente dichiara chi e', il ruolo lo assegna la verifica.
-- 2) handle_new_user non copiava il TELEFONO dai metadata: il numero inserito
--    in registrazione veniva perso. Corretto, e recuperati quelli gia' persi.

alter table public.profiles
  add column if not exists professione text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_professione_check'
  ) then
    alter table public.profiles
      add constraint profiles_professione_check
      check (professione is null or professione in (
        'avvocato','commercialista','dirigente_azienda','studente_giurisprudenza',
        'imprenditore','architetto','ingegnere','geometra','privato'
      ));
  end if;
end $$;

comment on column public.profiles.professione is
  'Professione dichiarata in registrazione (obbligatoria nel form). Diversa da role: role governa i permessi, professione e autodichiarata.';

-- Trigger: aggiunge professione e telefono (quest'ultimo mancava del tutto)
create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_codice text;
  v_commerciale uuid;
  v_professione text;
begin
  v_codice := nullif(trim(new.raw_user_meta_data->>'codice_commerciale'), '');

  if v_codice is not null then
    select id into v_commerciale
    from public.profiles
    where role = 'commerciale'
      and codice_commerciale is not null
      and upper(codice_commerciale) = upper(v_codice)
      and disattivato_at is null
    limit 1;
  end if;

  -- Accetta solo valori previsti: un valore anomalo nei metadata non deve
  -- far fallire la registrazione (il check constraint bloccherebbe l'insert).
  v_professione := nullif(new.raw_user_meta_data->>'professione', '');
  if v_professione is not null and v_professione not in (
    'avvocato','commercialista','dirigente_azienda','studente_giurisprudenza',
    'imprenditore','architetto','ingegnere','geometra','privato'
  ) then
    v_professione := null;
  end if;

  insert into public.profiles (
    id, email, nome, cognome, studio, telefono, professione, role, verification_status,
    commerciale_id, commerciale_assegnato_il
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    coalesce(new.raw_user_meta_data->>'cognome', ''),
    nullif(new.raw_user_meta_data->>'studio', ''),
    nullif(new.raw_user_meta_data->>'telefono', ''),
    v_professione,
    'user',
    'none',
    v_commerciale,
    case when v_commerciale is not null then now() else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

-- Recupero: telefoni inseriti in registrazione e mai finiti nel profilo
update public.profiles p
   set telefono = nullif(u.raw_user_meta_data->>'telefono', '')
  from auth.users u
 where u.id = p.id
   and (p.telefono is null or p.telefono = '')
   and nullif(u.raw_user_meta_data->>'telefono', '') is not null;
