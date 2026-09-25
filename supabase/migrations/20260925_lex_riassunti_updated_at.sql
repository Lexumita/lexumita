-- La memoria dei riassunti di Lex (pratica, etichetta, confronto) non ha mai
-- salvato nulla: le funzioni scrivono updated_at, colonna che mancava, e ogni
-- upsert falliva. 25/09/2026. Applicata in produzione il 25/09/2026.
alter table public.lex_riassunti_cached
  add column if not exists updated_at timestamptz not null default now();
