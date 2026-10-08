-- 08-10-2026 (controllo di sicurezza, fase 2): i documenti temporanei di Lex li scrive solo il server.
--
-- documenti_effimeri (un documento da analizzare con Lex, che scade dopo qualche ora) e i suoi pezzi
-- (documenti_effimeri_chunk) li scrive solo la funzione analizza-documento, con la chiave del server.
-- Ma la regola «doc_eff_proprio» valeva per tutte le operazioni: ognuno poteva inserire direttamente
-- documenti enormi o con scadenza nel 2100, o allungare quella dei propri, saltando il tetto giornaliero
-- e la pulizia oraria. Agli utenti resta solo la lettura dei propri: siti e app non scrivono qui.

drop policy if exists doc_eff_proprio on public.documenti_effimeri;
create policy doc_eff_proprio_lettura on public.documenti_effimeri
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists doc_eff_chunk_proprio on public.documenti_effimeri_chunk;
create policy doc_eff_chunk_proprio_lettura on public.documenti_effimeri_chunk
  for select to authenticated
  using (exists (select 1 from public.documenti_effimeri d
                 where d.id = documenti_effimeri_chunk.documento_id
                   and d.user_id = (select auth.uid())));

revoke insert, update, delete on public.documenti_effimeri, public.documenti_effimeri_chunk from anon, authenticated;
-- e nemmeno TRUNCATE (non è soggetto alle regole RLS), REFERENCES e TRIGGER: in CH c'erano ancora
revoke truncate, references, trigger on public.documenti_effimeri, public.documenti_effimeri_chunk from anon, authenticated;
