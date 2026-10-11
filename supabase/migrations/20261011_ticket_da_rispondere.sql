-- ============================================================================
-- Assistenza: quanti ticket aspettano la MIA risposta (il pallino nel menu)
--
-- Un ticket aperto aspetta la mia risposta quando l'ultimo messaggio è dell'altra
-- parte; senza messaggi, quando l'ha aperto qualcuno dell'altra parte (si guarda chi
-- l'ha aperto, mittente_id: mittente_ruolo non basta, c'è un vecchio 'lex_user').
-- La parte di un messaggio è messaggi_ticket.autore_tipo:
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
-- ============================================================================

create or replace function public.ticket_da_rispondere()
returns integer
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with io as (
    select p.id,
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
  miei as (
    select t.id, io.lato,
           case when io.lato = 'admin'
                then t.mittente_id is null or t.mittente_id not in (select id from supporto)
                else t.mittente_id is distinct from io.id
                     and (t.mittente_id is null or t.mittente_id not in (select id from collaboratori))
           end as aperto_da_altri
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
  )
  select count(*)::integer
    from miei m
    left join lateral (
      select mt.autore_tipo
        from public.messaggi_ticket mt
       where mt.ticket_id = m.id
       order by mt.created_at desc
       limit 1
    ) ultimo on true
   where case when ultimo.autore_tipo is null then m.aperto_da_altri
              else ultimo.autore_tipo <> m.lato end
$$;

revoke all on function public.ticket_da_rispondere() from public, anon;
grant execute on function public.ticket_da_rispondere() to authenticated;
