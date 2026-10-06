-- 06-10-2026 · In Italia si lavora SENZA approvazione (decisione del 03-10-2026): il ruolo lo assegna
-- stripe-webhook all'acquisto e la verifica dei documenti serve solo per il distintivo. Ma
-- is_professionista() chiedeva ancora verification_status = 'approved', quindi chi non era verificato
-- (2 avvocati su 6 al 06-10) non poteva inserire in 12 tabelle: documenti_fiscali, deleghe_fiscali,
-- scadenze_mandato, mandati, movimenti, piano_conti, registrazioni, righe_registrazione, saldi_cassa,
-- clienti_dipendenti, dipendenti_bonus, mapping_categorie. Basta il ruolo.
-- In Svizzera la verifica resta (lì l'approvazione è vera): questa migrazione è solo per IT.

create or replace function public.is_professionista()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('avvocato', 'commercialista')
  );
$function$;
