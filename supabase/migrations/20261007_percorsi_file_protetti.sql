-- 07-10-2026 (controllo di sicurezza prima della pubblicazione dell'app, approvato da Antonino).
-- Il percorso di un file nelle tabelle (archivio, documenti del portale, documenti delle pratiche,
-- fatture, sentenze) lo scriveva il browser senza controlli. Alcune funzioni del server scaricano o
-- cancellano quel percorso con i permessi del server: chi conosceva il percorso di un file altrui poteva
-- farsene estrarre il testo (process-archivio) o farlo cancellare. Ora, per le scritture dal browser e
-- dall'app (non per il server e per gli admin con i due passaggi):
-- - un file nuovo deve stare nella cartella di chi carica, del suo titolare, o della riga stessa
--   (il cliente per il portale, la pratica per i documenti della pratica), come già fanno siti e app;
-- - il percorso di un file già caricato non si cambia;
-- - nell'archivio lo spazio file è solo «archivio» e non si cambia.
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

create or replace function public.archivio_spazio_file_protetto()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if (new.metadati ->> 'bucket') is distinct from (old.metadati ->> 'bucket') then
      raise exception 'Lo spazio del file non si può cambiare' using errcode = '42501';
    end if;
  elsif coalesce(new.metadati ->> 'bucket', 'archivio') <> 'archivio' then
    raise exception 'Spazio del file non valido' using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_percorso_file_protetto on public.archivio_documenti;
create trigger trg_percorso_file_protetto before insert or update on public.archivio_documenti
  for each row execute function public.percorso_file_protetto('storage_path');
drop trigger if exists trg_spazio_file_protetto on public.archivio_documenti;
create trigger trg_spazio_file_protetto before insert or update on public.archivio_documenti
  for each row execute function public.archivio_spazio_file_protetto();

drop trigger if exists trg_percorso_file_protetto on public.documenti;
create trigger trg_percorso_file_protetto before insert or update on public.documenti
  for each row execute function public.percorso_file_protetto('storage_path', 'cliente_id');

drop trigger if exists trg_percorso_file_protetto on public.documenti_pratiche;
create trigger trg_percorso_file_protetto before insert or update on public.documenti_pratiche
  for each row execute function public.percorso_file_protetto('storage_path', 'pratica_id');

drop trigger if exists trg_percorso_file_protetto on public.fatture;
create trigger trg_percorso_file_protetto before insert or update on public.fatture
  for each row execute function public.percorso_file_protetto('pdf_storage_path');

drop trigger if exists trg_percorso_file_protetto on public.sentenze;
create trigger trg_percorso_file_protetto before insert or update on public.sentenze
  for each row execute function public.percorso_file_protetto('pdf_storage_path');
