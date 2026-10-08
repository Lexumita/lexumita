-- 08-10-2026 (upgrade a giorni, deciso da Antonino): ognuno legge anche il prodotto del proprio piano,
-- pure se non è più in vendita (attivo = false). Serve alla pagina Studio («Cambia piano») per mostrare
-- lo stesso importo che chiede stripe-checkout: prezzo nuovo meno la parte non usata del piano attuale.
-- Senza, chi ha un piano non più in vendita vedeva il prezzo pieno e Stripe chiedeva meno.
drop policy if exists prodotti_leggi_proprio_piano on public.prodotti;
create policy prodotti_leggi_proprio_piano on public.prodotti
  for select to authenticated
  using (id = (select p.piano_id from public.profiles p where p.id = (select auth.uid())));
