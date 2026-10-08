-- it-push-senza-doppioni.sql (09-10-2026) — progetto IT (wnbmyiyblpinayswunxb, connettore 9c532d55)
-- Risposte recuperate, punto 5 della specifica: in push_da_notifica() si esce senza mettere niente in
-- push_coda quando coalesce(new.metadati->>'senza_push', '') = 'true'.
--
-- Base: la definizione in linea letta il 09-10-2026 con pg_get_functiondef (md5 6d2656818097672de96a652a31c0fd58),
-- copiata byte per byte; si aggiunge solo il blocco «09-10-2026» in testa. Proprietario (postgres),
-- SECURITY DEFINER, search_path ('public', 'pg_temp') e permessi ({postgres=X/postgres,service_role=X/postgres})
-- restano: CREATE OR REPLACE non li cambia. Il trigger notifiche_push (AFTER INSERT ON notifiche) non si tocca.
-- Prima di applicare: rileggere pg_get_functiondef e confrontare l'md5 qui sopra (se e' cambiato, rifare il file).
-- Per tornare indietro: il file *-indietro.sql (la definizione di prima, identica).

CREATE OR REPLACE FUNCTION public.push_da_notifica()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  -- 09-10-2026: la notifica porta gia' il suo avviso sul telefono: lex-risposta-recuperata mette
  -- metadati.senza_push = true quando negli ultimi 15 minuti c'e' gia' in push_coda l'avviso 'lex'
  -- («La risposta di Lex e' pronta»). Cosi' il telefono non suona due volte. Tutto il resto e' identico.
  if coalesce(new.metadati->>'senza_push', '') = 'true' then
    return null;
  end if;
  begin
    if exists (select 1 from dispositivi_push d
                where d.user_id = new.user_id and d.attivo and d.studio) then
      insert into push_coda (user_id, genere, titolo, dati)
      values (new.user_id, 'studio',
              coalesce(nullif(btrim(new.titolo), ''), 'Lexum'),
              jsonb_build_object('paese', 'IT', 'link', new.link, 'notifica_id', new.id));
    end if;
  exception when others then
    null;
  end;
  return null;
end;
$function$;
