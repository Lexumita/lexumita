-- 07-10-2026 (controllo di sicurezza, seguito): il percorso di un file nuovo non può contenere risalite
-- (`..` o `.`), nemmeno camuffate (punti o barre codificati, barre rovesciate, caratteri di controllo come
-- tab e a capo): chi scarica il file (supabase-js, fetch) normalizza l'indirizzo e risale davvero, quindi
-- `<mia cartella>/../<cartella altrui>/file.pdf` passava il controllo della prima cartella ma leggeva il
-- file di un altro. Il resto della regola è quello di percorsi_file_protetti.
create or replace function public.percorso_file_protetto()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
-- tg_argv[0]: la colonna del percorso; tg_argv[1] (facoltativo): la colonna della riga che fa da cartella
declare
  colonna constant text := tg_argv[0];
  nuovo text := to_jsonb(new) ->> colonna;
  cartella text := split_part(coalesce(nuovo, ''), '/', 1);
  ammesse text[];
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if nuovo is distinct from (to_jsonb(old) ->> colonna) then
      raise exception 'Il percorso del file non si può cambiare' using errcode = '42501';
    end if;
    return new;
  end if;
  if coalesce(nuovo, '') = '' then
    return new;
  end if;
  if nuovo ~ '(^|/)\.{1,2}(/|$)' or nuovo ~* '%(2e|2f|5c)' or nuovo ~ '[[:cntrl:]]'
     or position(chr(92) in nuovo) > 0 then
    raise exception 'Percorso del file non valido' using errcode = '42501';
  end if;
  ammesse := array[auth.uid()::text,
                   (select p.titolare_id::text from public.profiles p where p.id = auth.uid())];
  if tg_nargs > 1 then
    ammesse := ammesse || (to_jsonb(new) ->> tg_argv[1]);
  end if;
  if not coalesce(cartella = any (array_remove(ammesse, null)), false) then
    raise exception 'Percorso del file non valido' using errcode = '42501';
  end if;
  return new;
end;
$function$;
