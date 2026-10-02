-- ============================================================================
-- Pannello "Testi" — il secchio dove atterra l'overlay (Lexum IT)
--
-- Pubblico in lettura: contiene testo di marketing già visibile sul sito.
-- Scrivibile solo da un admin autenticato.
-- Un solo file: overlay/it.json
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('testi', 'testi', true, 4194304, array['application/json'])
on conflict (id) do update
  set public = true,
      file_size_limit = 4194304,
      allowed_mime_types = array['application/json'];

drop policy if exists testi_overlay_inserisci on storage.objects;
drop policy if exists testi_overlay_aggiorna  on storage.objects;
drop policy if exists testi_overlay_cancella  on storage.objects;

create policy testi_overlay_inserisci on storage.objects for insert to authenticated
  with check (bucket_id = 'testi' and public.testi_e_admin());

create policy testi_overlay_aggiorna on storage.objects for update to authenticated
  using      (bucket_id = 'testi' and public.testi_e_admin())
  with check (bucket_id = 'testi' and public.testi_e_admin());

create policy testi_overlay_cancella on storage.objects for delete to authenticated
  using (bucket_id = 'testi' and public.testi_e_admin());
