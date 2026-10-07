-- 07-10-2026 (deciso da Antonino): nella notifica push dello studio solo il titolo della campanella.
-- La notifica si legge anche a telefono bloccato e la descrizione può contenere il nome di una pratica o di
-- un cliente: si legge aprendo l'app. push_coda.testo resta vuoto (valore di base), invia-push manda solo
-- il titolo. Già applicata sul database IT il 07-10-2026 (provata in una transazione annullata).
create or replace function public.push_da_notifica()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
  begin
    if exists (select 1 from dispositivi_push d
                where d.user_id = new.user_id and d.attivo and d.studio) then
      insert into push_coda (user_id, genere, titolo, dati)
      values (new.user_id, 'studio',
              coalesce(nullif(btrim(new.titolo), ''), 'Lexum'),
              jsonb_build_object('paese', 'IT', 'link', new.link, 'notifica_id', new.id));
    end if;
  exception when others then
    null;
  end;
  return null;
end;
$function$;
