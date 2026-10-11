-- ============================================================================
-- Assistenza: quanti ticket aspettano la MIA risposta (il pallino nel menu)
--
-- Un ticket aperto aspetta la mia risposta quando l'ultimo messaggio è dell'altra
-- parte; senza messaggi, quando l'ha aperto qualcuno dell'altra parte (si guarda chi
-- l'ha aperto, mittente_id: mittente_ruolo non basta, c'è un vecchio 'lex_user').
-- Un messaggio è della mia parte se l'ha scritto qualcuno della mia parte (per l'admin
-- gli amministratori; per gli altri io, i miei collaboratori, il mio titolare) oppure se
-- il suo autore_tipo è della mia parte. Servono tutte e due: il sito scrive 'avvocato'
-- per ogni professionista, l'app scrive 'commercialista' / 'fiduciario', o niente per
-- un ruolo che il vincolo non elenca. Le parti di autore_tipo:
--   admin           -> 'admin'
--   avvocato e commercialista, su CH anche fiduciario e progettista (stessa pagina
--   /assistenza) -> 'avvocato'
--   privato         -> 'user'
--   cliente         -> 'cliente'
-- Quali ticket contano, come nelle pagine del sito:
--   admin: i ticket del supporto Lexum (verso un admin, senza destinatario, o aperti
--          da un admin);
--   gli altri: i ticket in cui sono mittente o destinatario; il titolare di uno
--          studio anche i ticket dei suoi collaboratori con i clienti.
-- SECURITY INVOKER: valgono le regole di accesso di chi chiede, quindi ognuno conta
-- solo i ticket che può già vedere. La usano il sito e l'app. Stesso testo su IT e CH.
--
-- ticket_da_rispondere_dettaglio() dà anche le due parti, per l'app che le mostra in
-- posti diversi: con_lexum (richieste al supporto: aperte da un amministratore, verso
-- un amministratore o senza destinatario) e con_clienti (tutte le altre).
-- ticket_da_rispondere() = il totale, per il pallino dei siti.
-- ============================================================================

create or replace function public.ticket_da_rispondere_dettaglio()
returns table (totale integer, con_lexum integer, con_clienti integer)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with io as (
    select p.id, p.titolare_id,
           case when p.role = 'admin' then 'admin'
                when p.role in ('avvocato', 'commercialista', 'fiduciario', 'progettista') then 'avvocato'
                else p.role end as lato
      from public.profiles p
     where p.id = auth.uid()
  ),
  supporto as (
    select unnest(public.get_supporto_admin_ids()) as id
  ),
  collaboratori as (
    select p.id
      from public.profiles p, io
     where io.lato = 'avvocato' and p.titolare_id = io.id
  ),
  parte_mia as (
    select s.id from supporto s, io where io.lato = 'admin'
    union select io.id from io
    union select c.id from collaboratori c
    union select io.titolare_id from io where io.lato = 'avvocato' and io.titolare_id is not null
  ),
  miei as (
    select t.id, io.lato,
           (t.mittente_id is null or t.mittente_id not in (select id from parte_mia)) as aperto_da_altri,
           (t.destinatario_id is null
            or t.mittente_id in (select id from supporto)
            or t.destinatario_id in (select id from supporto)) as con_lexum
      from public.ticket_assistenza t, io
     where t.stato = 'aperto'
       and case when io.lato = 'admin' then
                 t.destinatario_id is null
              or t.mittente_ruolo = 'admin'
              or t.destinatario_id in (select id from supporto)
            else
                 t.mittente_id = io.id
              or t.destinatario_id = io.id
              or (io.lato = 'avvocato' and (
                     (t.mittente_id in (select id from collaboratori)
                      and t.destinatario_id not in (select id from supporto))
                  or (t.destinatario_id in (select id from collaboratori)
                      and t.mittente_ruolo = 'cliente')))
            end
  ),
  da_rispondere as (
    select m.con_lexum
      from miei m
      left join lateral (
        select mt.id, mt.autore_id, mt.autore_tipo
          from public.messaggi_ticket mt
         where mt.ticket_id = m.id
         order by mt.created_at desc
         limit 1
      ) ultimo on true
     where case when ultimo.id is null then m.aperto_da_altri
                else not coalesce(
                       ultimo.autore_id in (select id from parte_mia)
                       or (case when ultimo.autore_tipo in ('avvocato', 'commercialista', 'fiduciario', 'progettista')
                                then 'avvocato' else ultimo.autore_tipo end) = m.lato,
                       false)
           end
  )
  select count(*)::integer,
         (count(*) filter (where con_lexum))::integer,
         (count(*) filter (where not con_lexum))::integer
    from da_rispondere
$$;

create or replace function public.ticket_da_rispondere()
returns integer
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select totale from public.ticket_da_rispondere_dettaglio()
$$;

revoke all on function public.ticket_da_rispondere_dettaglio() from public, anon;
grant execute on function public.ticket_da_rispondere_dettaglio() to authenticated;
revoke all on function public.ticket_da_rispondere() from public, anon;
grant execute on function public.ticket_da_rispondere() to authenticated;
