-- =====================================================================================
-- Lexum ITALIA (progetto 9c532d55) - 08-10-2026 - Gruppo F, SOLO LE FATTURE (prima parte, notte dell'08-10)
-- =====================================================================================
--
-- Dal file completo F-it-scritture-studio.sql si applicano qui solo:
--   1. le funzioni di sola lettura «lo studio di chi scrive» (servono al controllo delle fatture);
--   3. il controllo sulle fatture scritte dal browser: niente inserimenti diretti (le crea
--      crea-fattura con la chiave del server; nessun sito o app le inserisce), e cliente,
--      avvocato, studio, numero, anno e invio del PDF non si cambiano; la pratica collegata
--      (in CH anche il mandato) dev'essere dello studio. Stato, pagamento, note: come prima.
-- PERCHE': con la chiave pubblica e il proprio accesso si poteva inserire una fattura «di» un
-- altro avvocato verso un cliente qualunque, che la vedeva nel portale (con la notifica).
-- Le altre tabelle (pratiche, mandati, appuntamenti, archivio...) restano per dopo, quando
-- si potranno provare i gesti normali con un account di prova.
-- Per togliere il controllo: drop trigger if exists a_fattura_dal_browser on public.fatture;
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. «Lo studio di chi scrive»: funzioni di sola lettura (SECURITY DEFINER)
-- -------------------------------------------------------------------------------------
-- Girano come proprietario con search_path fisso: leggono profili, appartenenze,
-- pratiche... senza le regole d'accesso (per esempio un collaboratore di pratica non
-- vede la pratica con le regole) e rispondono solo si'/no su chi chiama (auth.uid()).
-- Le usa solo il controllo qui sotto; agli anonimi non servono.
--
-- Gli studi di chi scrive sono TUTTE le strade che usano siti, app e funzioni:
--   - gli studi in cui e' membro attivo (studio_members, come le regole d'accesso);
--   - lo studio scritto nel suo profilo (profiles.studio_id, dal browser non si cambia);
--   - gli studi di cui il suo titolare e' titolare (studios.titolare_id, come crea-fattura).
-- Il professionista titolare di due studi (oggi uno, con due appartenenze attive) li ha
-- tutti e due: qui non c'e' il «limit 1» di get_my_studio_id().

create or replace function public.miei_studi()
returns setof uuid
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select m.studio_id
    from public.studio_members m
   where m.user_id = auth.uid()
     and m.is_active
     and m.studio_id is not null
  union
  select p.studio_id
    from public.profiles p
   where p.id = auth.uid()
     and p.studio_id is not null
  union
  select s.id
    from public.studios s
    join public.profiles p on p.id = auth.uid()
   where s.titolare_id = coalesce(p.titolare_id, p.id)
$function$;

-- Il titolare dell'archivio di chi scrive (il titolare, o lui stesso se e' il titolare)
create or replace function public.mio_titolare()
returns uuid
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select coalesce(p.titolare_id, p.id)
    from public.profiles p
   where p.id = auth.uid()
$function$;

-- Un professionista (o l'autore di una riga) e' dello studio di chi scrive se:
-- e' lui stesso; ha lo stesso titolare (il titolare e i suoi collaboratori, come
-- update-cliente, create-cliente e gli elenchi dei siti); oppure e' membro attivo di uno
-- dei suoi studi.
create or replace function public.professionista_del_mio_studio(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select p_id is not null and (
    p_id = auth.uid()
    or exists (
      select 1
        from public.profiles me
        join public.profiles x on x.id = p_id
       where me.id = auth.uid()
         and coalesce(x.titolare_id, x.id) = coalesce(me.titolare_id, me.id)
    )
    or exists (
      select 1
        from public.studio_members m
       where m.user_id = p_id
         and m.is_active
         and m.studio_id in (select public.miei_studi())
    )
  )
$function$;

-- Una pratica si puo' usare se: e' di un professionista dello studio o ha uno dei suoi
-- studi; chi scrive ci lavora come collaboratore (pratica_collaboratori, anche da un
-- altro studio: lo prevedono le regole di udienze e termini); oppure chi scrive e' il
-- cliente della pratica. Un cliente vede solo le sue.
create or replace function public.pratica_del_mio_studio(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1
      from public.pratiche r
     where r.id = p_id
       and (
         r.cliente_id = auth.uid()
         or (
           not exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'cliente')
           and (
             public.professionista_del_mio_studio(r.avvocato_id)
             or (r.studio_id is not null and r.studio_id in (select public.miei_studi()))
             or exists (
               select 1
                 from public.pratica_collaboratori pc
                where pc.pratica_id = r.id
                  and pc.avvocato_id = auth.uid()
             )
           )
         )
       )
  )
$function$;

-- Un mandato si puo' usare se e' di un professionista dello studio o ha uno dei suoi
-- studi (o chi scrive e' il cliente del mandato).
create or replace function public.mandato_del_mio_studio(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1
      from public.mandati r
     where r.id = p_id
       and (
         r.cliente_id = auth.uid()
         or (
           not exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'cliente')
           and (
             public.professionista_del_mio_studio(r.avvocato_id)
             or (r.studio_id is not null and r.studio_id in (select public.miei_studi()))
           )
         )
       )
  )
$function$;

-- Un appuntamento si puo' collegare (udienze, termini, scadenze) se e' di un
-- professionista dello studio o ha uno dei suoi studi. Un cliente non ne collega.
create or replace function public.appuntamento_del_mio_studio(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1
      from public.appuntamenti a
     where a.id = p_id
       and not exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'cliente')
       and (
         public.professionista_del_mio_studio(a.avvocato_id)
         or (a.studio_id is not null and a.studio_id in (select public.miei_studi()))
       )
  )
$function$;

-- Un cliente e' dello studio se il suo professionista e' dello studio o il suo studio e'
-- uno dei miei (cosi' i clienti restano allo studio anche se il collaboratore esce).
-- Vale anche il cliente della pratica o del mandato che la riga collega, se quelli si
-- possono usare (pratica condivisa con un collaboratore). Un cliente indica solo se stesso.
create or replace function public.cliente_del_mio_studio(p_cliente uuid, p_pratica uuid default null, p_mandato uuid default null)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select p_cliente is not null and (
    p_cliente = auth.uid()
    or (
      not exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'cliente')
      and (
        exists (
          select 1
            from public.profiles c
           where c.id = p_cliente
             and (
               (c.avvocato_id is not null and public.professionista_del_mio_studio(c.avvocato_id))
               or (c.studio_id is not null and c.studio_id in (select public.miei_studi()))
             )
        )
        or (
          p_pratica is not null
          and exists (select 1 from public.pratiche r where r.id = p_pratica and r.cliente_id = p_cliente)
          and public.pratica_del_mio_studio(p_pratica)
        )
        or (
          p_mandato is not null
          and exists (select 1 from public.mandati r where r.id = p_mandato and r.cliente_id = p_cliente)
          and public.mandato_del_mio_studio(p_mandato)
        )
      )
    )
  )
$function$;

-- Uno studio_id si puo' scrivere se e' uno degli studi di chi scrive, oppure se e' lo
-- studio della pratica o del mandato che la riga collega (e che si possono usare).
create or replace function public.studio_mio(p_studio uuid, p_pratica uuid default null, p_mandato uuid default null)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select p_studio is not null and (
    p_studio in (select public.miei_studi())
    or (
      p_pratica is not null
      and exists (select 1 from public.pratiche r where r.id = p_pratica and r.studio_id = p_studio)
      and public.pratica_del_mio_studio(p_pratica)
    )
    or (
      p_mandato is not null
      and exists (select 1 from public.mandati r where r.id = p_mandato and r.studio_id = p_studio)
      and public.mandato_del_mio_studio(p_mandato)
    )
  )
$function$;

revoke all on function public.miei_studi() from public, anon;
revoke all on function public.mio_titolare() from public, anon;
revoke all on function public.professionista_del_mio_studio(uuid) from public, anon;
revoke all on function public.pratica_del_mio_studio(uuid) from public, anon;
revoke all on function public.mandato_del_mio_studio(uuid) from public, anon;
revoke all on function public.appuntamento_del_mio_studio(uuid) from public, anon;
revoke all on function public.cliente_del_mio_studio(uuid, uuid, uuid) from public, anon;
revoke all on function public.studio_mio(uuid, uuid, uuid) from public, anon;
grant execute on function public.miei_studi() to authenticated;
grant execute on function public.mio_titolare() to authenticated;
grant execute on function public.professionista_del_mio_studio(uuid) to authenticated;
grant execute on function public.pratica_del_mio_studio(uuid) to authenticated;
grant execute on function public.mandato_del_mio_studio(uuid) to authenticated;
grant execute on function public.appuntamento_del_mio_studio(uuid) to authenticated;
grant execute on function public.cliente_del_mio_studio(uuid, uuid, uuid) to authenticated;
grant execute on function public.studio_mio(uuid, uuid, uuid) to authenticated;



-- -------------------------------------------------------------------------------------
-- 3. Le fatture dal browser
-- -------------------------------------------------------------------------------------
-- Nessun sito e nessuna app inseriscono fatture direttamente: le crea crea-fattura (chiave
-- di servizio, numero dal contatore, controlli sullo studio). Dal browser si fanno solo:
-- collega/scollega pratica (pratica_id). Quindi:
--   - inserimento dal browser: vietato;
--   - modifica: i dati d'identita' restano quelli di crea-fattura (cliente, avvocato,
--     studio, numero, anno, tipo documento, fattura d'origine della nota di credito) e
--     pdf_generato_at lo scrive solo genera-fattura-pdf (fa partire la notifica al
--     cliente); il percorso del PDF lo protegge gia' percorso_file_protetto;
--   - la pratica collegata dev'essere dello studio.
-- Lo stato, le note, il pagamento ecc. restano come oggi.
-- Si chiama «a_...» per girare prima degli altri trigger (come a_profili_colonne_protette).
create or replace function public.fattura_dal_browser()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if auth.uid() is null then
    raise exception 'Accesso richiesto' using errcode = '42501';
  end if;
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'La fattura si crea dal modulo Nuova fattura' using errcode = '42501';
  end if;

  if new.cliente_id is distinct from old.cliente_id
     or new.avvocato_id is distinct from old.avvocato_id
     or new.studio_id is distinct from old.studio_id
     or new.numero is distinct from old.numero
     or new.anno_numerazione is distinct from old.anno_numerazione
     or new.tipo_documento is distinct from old.tipo_documento
     or new.fattura_origine_id is distinct from old.fattura_origine_id
     or new.pdf_generato_at is distinct from old.pdf_generato_at
  then
    raise exception 'Questo dato della fattura non si può cambiare' using errcode = '42501';
  end if;

  if new.pratica_id is not null
     and new.pratica_id is distinct from old.pratica_id
     and not public.pratica_del_mio_studio(new.pratica_id)
  then
    raise exception 'La pratica non è del tuo studio' using errcode = '42501';
  end if;

  return new;
end
$function$;

revoke all on function public.fattura_dal_browser() from public, anon, authenticated;

drop trigger if exists a_fattura_dal_browser on public.fatture;
create trigger a_fattura_dal_browser
  before insert or update on public.fatture
  for each row execute function public.fattura_dal_browser();


