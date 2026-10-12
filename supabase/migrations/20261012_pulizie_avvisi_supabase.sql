-- ============================================================================
-- Pulizie segnalate dal controllo automatico di Supabase (12-10-2026).
-- Nessun effetto per gli utenti.
--
-- 1) Funzioni dei trigger chiamabili «da chiunque» (anon/authenticated):
--    una funzione di trigger non si può chiamare direttamente e i trigger partono
--    anche senza il permesso EXECUTE (verificato col trigger dei ticket), quindi il
--    permesso si toglie e basta. I trigger restano attaccati alle loro tabelle:
--      trg_nota_credito_aggiorna_origine → fatture (stato della fattura d'origine)
--      genera_provvigione                → provvigioni dei commerciali
--      questionario_domanda_versiona     → versioni delle domande del questionario
-- 2) questionario_t (sceglie il testo nella lingua giusta, ripiego in italiano):
--    percorso di ricerca fisso. Usa solo funzioni di sistema, quindi basta ''.
-- ============================================================================

revoke execute on function public.trg_nota_credito_aggiorna_origine() from public, anon, authenticated;
revoke execute on function public.genera_provvigione() from public, anon, authenticated;
revoke execute on function public.questionario_domanda_versiona() from public, anon, authenticated;

alter function public.questionario_t(jsonb, text) set search_path = '';
