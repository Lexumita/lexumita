-- =====================================================================================
-- Collaboratori di pratica: il titolare della pratica aggiunge (e toglie) solo
-- professionisti del suo studio (13-10-2026).
--
-- Prima, in Italia, su pratica_collaboratori c'era solo la regola di lettura: «aggiungi
-- collaboratore» del sito (Pratiche.jsx, PraticaDettaglio.jsx) non salvava niente e non lo
-- diceva (0 righe in tabella). Ora:
--   - il titolare della pratica (pratiche.avvocato_id) aggiunge e toglie i collaboratori;
--   - il collaboratore dev'essere dello stesso studio (stesso titolare o membro attivo di
--     uno dei suoi studi): lo controlla z_ids_dello_studio, come sulle altre tabelle, con il
--     messaggio «Il professionista non è del tuo studio».
-- I siti propongono già solo i collaboratori dello studio (profiles.titolare_id).
-- =====================================================================================

drop policy if exists pratica_collaboratori_aggiungi on public.pratica_collaboratori;
create policy pratica_collaboratori_aggiungi on public.pratica_collaboratori
  for insert to authenticated
  with check (exists (
    select 1 from public.pratiche p
     where p.id = pratica_collaboratori.pratica_id
       and p.avvocato_id = (select auth.uid())
  ));

drop policy if exists pratica_collaboratori_togli on public.pratica_collaboratori;
create policy pratica_collaboratori_togli on public.pratica_collaboratori
  for delete to authenticated
  using (exists (
    select 1 from public.pratiche p
     where p.id = pratica_collaboratori.pratica_id
       and p.avvocato_id = (select auth.uid())
  ));

drop trigger if exists z_ids_dello_studio on public.pratica_collaboratori;
create trigger z_ids_dello_studio
  before insert or update on public.pratica_collaboratori
  for each row execute function public.ids_dello_studio('pratica_id', 'avvocato_id');
