-- ============================================================================
-- Ticket di assistenza: chiudere le falle trovate il 11-10-2026 (IT)
--
-- Prima: chi partecipa a un ticket poteva cancellare o riscrivere i messaggi
-- dell'altra parte, cancellare l'intero ticket, cambiarne mittente o destinatario,
-- scrivere le note interne dell'admin, firmarsi come «admin»/«avvocato», scrivere
-- nei ticket di altri (conoscendone l'id), aprire un ticket «da» un'altra persona o
-- nella lista di uno studio estraneo.
-- Dopo:
--   * messaggi: si scrivono solo nei propri ticket e a proprio nome; si cancellano
--     solo i propri; non si modificano (il sito e l'app non lo fanno mai);
--   * ticket: si aprono solo a proprio nome; dei ticket si cambiano solo stato,
--     ultimo_mittente e updated_at (le uniche colonne che sito e app aggiornano);
--     non si cancellano (lo fa solo il servizio);
--   * il ruolo scritto (autore_tipo, mittente_ruolo) lo decide il database dal
--     ruolo vero di chi scrive: un cliente non può firmarsi «avvocato» o «admin».
--     Per i professionisti si tiene il valore mandato (il sito 'avvocato', l'app
--     'commercialista'), purché ammesso dal vincolo di questo database.
--   * anon: nessun permesso (prima li aveva tutti, fermati solo dalle regole RLS).
-- Le funzioni del servizio (service_role) non sono toccate.
-- ============================================================================

-- Il ruolo da scrivere per chi scrive davvero. NULL per un ruolo che non scrive ticket.
create or replace function public.ticket_ruolo_vero(p_utente uuid, p_proposto text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
           when p.role = 'admin' then 'admin'
           when p.role in ('cliente', 'user') then p.role
           when p.role in ('avvocato', 'commercialista', 'fiduciario', 'progettista') then
             case when p_proposto in ('avvocato', 'commercialista') then p_proposto else 'avvocato' end
           else null
         end
    from public.profiles p
   where p.id = p_utente
$$;
revoke all on function public.ticket_ruolo_vero(uuid, text) from public, anon, authenticated;

create or replace function public.ticket_allinea_ruolo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then          -- servizio, funzioni del database: non si tocca
    return new;
  end if;
  if tg_table_name = 'messaggi_ticket' then
    new.autore_tipo := public.ticket_ruolo_vero(new.autore_id, new.autore_tipo);
  else
    new.mittente_ruolo := public.ticket_ruolo_vero(new.mittente_id, new.mittente_ruolo);
  end if;
  return new;
end $$;
revoke all on function public.ticket_allinea_ruolo() from public, anon, authenticated;

drop trigger if exists trg_messaggi_ticket_ruolo on public.messaggi_ticket;
create trigger trg_messaggi_ticket_ruolo before insert on public.messaggi_ticket
  for each row execute function public.ticket_allinea_ruolo();
drop trigger if exists trg_ticket_assistenza_ruolo on public.ticket_assistenza;
create trigger trg_ticket_assistenza_ruolo before insert on public.ticket_assistenza
  for each row execute function public.ticket_allinea_ruolo();

-- ── Permessi sulle tabelle ──────────────────────────────────────────────────
revoke all on public.ticket_assistenza, public.messaggi_ticket from anon;
revoke update, delete on public.ticket_assistenza from authenticated;
grant update (stato, ultimo_mittente, updated_at) on public.ticket_assistenza to authenticated;
revoke update on public.messaggi_ticket from authenticated;

-- ── Regole: ticket_assistenza ───────────────────────────────────────────────
drop policy if exists "avvocato gestisce ticket clienti" on public.ticket_assistenza;
drop policy if exists "gestione ticket" on public.ticket_assistenza;
drop policy if exists "ticket: insert own" on public.ticket_assistenza;
drop policy if exists "ticket: read own" on public.ticket_assistenza;

create policy ticket_leggi on public.ticket_assistenza for select to authenticated
  using (mittente_id = (select auth.uid()) or destinatario_id = (select auth.uid())
         or studio_id = public.get_my_studio_id() or public.is_admin());
-- un ticket nuovo indica solo il proprio studio (o nessuno): nessuna pagina lo scrive,
-- ma prima si poteva far comparire un ticket nella lista di uno studio estraneo
create policy ticket_apri on public.ticket_assistenza for insert to authenticated
  with check (mittente_id = (select auth.uid())
              and (studio_id is null or studio_id = public.get_my_studio_id()));
create policy ticket_aggiorna on public.ticket_assistenza for update to authenticated
  using (mittente_id = (select auth.uid()) or destinatario_id = (select auth.uid())
         or studio_id = public.get_my_studio_id() or public.is_admin())
  with check (mittente_id = (select auth.uid()) or destinatario_id = (select auth.uid())
         or studio_id = public.get_my_studio_id() or public.is_admin());

-- ── Regole: messaggi_ticket ─────────────────────────────────────────────────
drop policy if exists "avvocato gestisce messaggi ticket" on public.messaggi_ticket;
drop policy if exists "gestione messaggi ticket" on public.messaggi_ticket;
drop policy if exists "Autori eliminano i propri messaggi" on public.messaggi_ticket;
drop policy if exists "messaggi_ticket: insert" on public.messaggi_ticket;
drop policy if exists "messaggi_ticket: read" on public.messaggi_ticket;

create policy messaggi_leggi on public.messaggi_ticket for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.ticket_assistenza t
     where t.id = messaggi_ticket.ticket_id
       and (t.mittente_id = (select auth.uid()) or t.destinatario_id = (select auth.uid())
            or t.studio_id = public.get_my_studio_id())));
create policy messaggi_scrivi on public.messaggi_ticket for insert to authenticated
  with check (autore_id = (select auth.uid()) and (public.is_admin() or exists (
    select 1 from public.ticket_assistenza t
     where t.id = messaggi_ticket.ticket_id
       and (t.mittente_id = (select auth.uid()) or t.destinatario_id = (select auth.uid())
            or t.studio_id = public.get_my_studio_id()))));
create policy messaggi_cancella_propri on public.messaggi_ticket for delete to authenticated
  using (autore_id = (select auth.uid()));

comment on column public.ticket_assistenza.note_interne_admin is
  'NON USARE per note riservate: la riga la leggono mittente e destinatario (select *). Vuota e inutilizzata al 11-10-2026.';
comment on column public.ticket_assistenza.nota_interna is
  'NON USARE per note riservate: la riga la leggono mittente e destinatario (select *). Vuota e inutilizzata al 11-10-2026.';
