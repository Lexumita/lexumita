-- 07-10-2026: i documenti per la verifica del professionista (documento d'identità, iscrizione all'albo,
-- laurea) li legge, li carica e li sostituisce solo chi li ha caricati; l'amministrazione li legge tutti
-- (regola «admin legge documenti verifica», che resta). Prima le tre regole «propri documenti» non
-- guardavano la cartella: qualsiasi utente con un accesso poteva elencare, scaricare e sostituire i
-- documenti di tutti. Il sito carica in `<id utente>/<tipo>.<estensione>` (pages/user/Verifica.jsx):
-- i 12 file presenti stavano tutti nella cartella del loro proprietario. Come su CH.
drop policy if exists "user legge propri documenti verifica" on storage.objects;
drop policy if exists "user aggiorna propri documenti verifica" on storage.objects;
drop policy if exists "user carica documenti verifica" on storage.objects;

create policy verification_docs_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy verification_docs_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy verification_docs_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
