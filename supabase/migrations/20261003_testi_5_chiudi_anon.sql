-- ============================================================================
-- Pannello "Testi" — chiusura di anon (Lexum IT)
--
-- Perché esiste, e non basta il revoke della _3 (lezione imparata su CH):
-- Supabase applica ALTER DEFAULT PRIVILEGES sullo schema public, quindi ogni
-- tabella e funzione nuova nasce con i privilegi concessi DIRETTAMENTE ad
-- anon, authenticated e service_role. Un "revoke ... from public" non tocca
-- una concessione diretta: senza questo file anon avrebbe ancora
-- SELECT/INSERT/UPDATE/DELETE sulle 5 tabelle ed EXECUTE sulle funzioni.
--
-- Due strati, perché il primo può essere riconcesso per sbaglio dalla
-- prossima migrazione che tocca lo schema:
--   1. revoca esplicita da anon (qui);
--   2. la guardia testi_e_admin() DENTRO ogni funzione che legge o scrive
--      (già presente nella _2 e nella _3).
--
-- NB: una funzione testi_* NUOVA nasce di nuovo con i privilegi di default:
-- se in futuro se ne aggiunge una, va revocata anche qui.
-- ============================================================================

revoke all on public.testi_namespace, public.testi_chiave, public.testi_valore,
              public.testi_storico,   public.testi_stato from anon;
revoke all on sequence public.testi_storico_id_seq from anon;

revoke execute on function public.testi_e_admin()                                    from anon;
revoke execute on function public.testi_valida(bigint, text)                         from anon;
revoke execute on function public.testi_overlay()                                    from anon;
revoke execute on function public.testi_salva(bigint, text, timestamptz)             from anon;
revoke execute on function public.testi_ripristina(bigint)                           from anon;
revoke execute on function public.testi_storico_chiave(bigint)                       from anon;
revoke execute on function public.testi_torna_a(bigint, bigint, timestamptz)         from anon;
revoke execute on function public.testi_imposta_attivo(boolean)                      from anon;
revoke execute on function public.testi_sincronizza_ns(text, text, text, int, jsonb) from anon;
revoke execute on function public.testi_riepilogo()                                  from anon;
revoke execute on function public.testi_elenco(text)                                 from anon;
revoke execute on function public.testi_cerca(text, text, int)                       from anon;
revoke execute on function public.testi_tutti()                                      from anon;
revoke execute on function public.testi_segna_export()                               from anon;

-- Controllo: dopo questo file anon non deve avere nulla. Se trova qualcosa,
-- la migrazione fallisce invece di lasciare una porta aperta in silenzio.
-- has_*_privilege tiene conto anche di cio' che anon eredita da PUBLIC.
do $$
declare t text; f text;
begin
  foreach t in array array['public.testi_namespace', 'public.testi_chiave',
                           'public.testi_valore', 'public.testi_storico', 'public.testi_stato'] loop
    if has_table_privilege('anon', t, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') then
      raise exception 'anon ha ancora privilegi su %', t;
    end if;
  end loop;

  foreach f in array array[
      'public.testi_e_admin()', 'public.testi_valida(bigint, text)', 'public.testi_overlay()',
      'public.testi_salva(bigint, text, timestamptz)', 'public.testi_ripristina(bigint)',
      'public.testi_storico_chiave(bigint)', 'public.testi_torna_a(bigint, bigint, timestamptz)',
      'public.testi_imposta_attivo(boolean)',
      'public.testi_sincronizza_ns(text, text, text, int, jsonb)', 'public.testi_riepilogo()',
      'public.testi_elenco(text)', 'public.testi_cerca(text, text, int)', 'public.testi_tutti()',
      'public.testi_segna_export()'] loop
    if has_function_privilege('anon', f, 'EXECUTE') then
      raise exception 'anon puo ancora eseguire %', f;
    end if;
  end loop;
end $$;
