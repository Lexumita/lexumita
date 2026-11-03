-- 03-11-2026: gli argomenti degli articoli (src/lib/argomenti.js), ognuno con la sua pagina /novita/argomento/<slug>.
-- Un articolo può stare in più argomenti. I 63 articoli esistenti sono stati classificati a mano in questa stessa
-- migrazione, applicata con il connettore (il dettaglio degli slug è nella cronologia del database).
alter table public.novita add column if not exists argomenti text[] not null default '{}';
grant select (argomenti) on public.novita to anon;
grant select, insert, update (argomenti) on public.novita to authenticated;

-- Gemini si distingue da Google; i collegamenti tracciati di Postmark sono mail: vedi provenienza_visita nel database.
