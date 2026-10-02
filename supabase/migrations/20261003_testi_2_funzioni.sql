-- ============================================================================
-- Pannello "Testi" — funzioni (Lexum IT, una sola lingua)
--
-- Le regole vivono QUI, non nel browser. Il validatore JavaScript del pannello
-- (src/lib/testi/regole.js) è solo uno specchio per il riscontro dal vivo:
-- chiunque abbia una sessione admin potrebbe scrivere a mano su PostgREST,
-- quindi il database deve saper dire di no da solo.
-- ============================================================================

-- ── Validazione ─────────────────────────────────────────────────────────────
-- NB: ogni messaggio aggiunto all'array porta il suo ::text. Senza, Postgres
-- legge il letterale come un array (text[] || text[]) e invece del messaggio
-- leggibile si ottiene «malformed array literal». Su CH il difetto c'è ancora.
create or replace function public.testi_valida(p_chiave_id bigint, p_valore text)
returns text[]
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  k    public.testi_chiave%rowtype;
  errs text[] := '{}';
  trovati text[];
  attesi  text[];
begin
  select * into k from public.testi_chiave where id = p_chiave_id;
  if not found    then return array['questa voce non esiste']; end if;
  if not k.attiva then return array['questa voce non è più presente nel sito']; end if;

  if p_valore is null then
    return array['il testo non può mancare'];
  end if;

  if k.obbligatoria and btrim(p_valore) = '' then
    errs := errs || 'il testo non può restare vuoto'::text;
  end if;

  if length(p_valore) > k.max_caratteri then
    errs := errs || format('massimo %s caratteri (ne hai scritti %s)',
                           k.max_caratteri, length(p_valore));
  end if;

  if k.tipo = 'booleano' and p_valore not in ('true','false') then
    errs := errs || 'valore tecnico: ammessi solo true o false'::text;
  end if;

  if k.tipo = 'enum' and not (p_valore = any(k.enum_valori)) then
    errs := errs || format('valore tecnico: ammessi solo %s',
                           array_to_string(k.enum_valori, ', '));
  end if;

  -- Segnaposto {{...}}: devono essere ESATTAMENTE quelli dichiarati dal codice.
  -- Uno di troppo stampa una parentesi graffa in pagina; uno in meno fa sparire
  -- il nome, la cifra o la data che il codice ci inserisce.
  select coalesce(array_agg(distinct m[1] order by m[1]), '{}') into trovati
    from regexp_matches(p_valore, '\{\{\s*([A-Za-z0-9_]+)', 'g') m;
  select coalesce(array_agg(distinct x order by x), '{}') into attesi
    from unnest(k.variabili) x;
  if trovati is distinct from attesi then
    errs := errs || format('i segnaposto devono essere esattamente: %s',
              coalesce(nullif(array_to_string(attesi, ', '), ''), 'nessuno'));
  end if;

  -- Tag: <b>, <link>, <hl>… Il codice li rimpiazza con veri elementi.
  -- Un tag inventato resta a schermo come testo; uno mancante fa sparire un
  -- pezzo di frase. Nessun attributo ammesso: sarebbe una via per iniettare.
  if p_valore ~ '<\s*/?\s*[A-Za-z0-9_]+\s+[^>]*>' then
    errs := errs || 'i tag non possono avere attributi'::text;
  end if;
  select coalesce(array_agg(m[1] order by m[1]), '{}') into trovati
    from regexp_matches(p_valore, '<\s*([A-Za-z0-9_]+)\s*>', 'g') m;
  select coalesce(array_agg(x order by x), '{}') into attesi
    from unnest(k.tag) x;
  if trovati is distinct from attesi then
    errs := errs || format('i tag devono essere esattamente: %s',
              coalesce(nullif(array_to_string(attesi, ', '), ''), 'nessuno'));
  end if;

  return errs;
end $$;

-- ── L'overlay: SOLO le frasi davvero cambiate ───────────────────────────────
-- Nessuna guardia di proposito: restituisce solo testo che è già pubblico sul
-- sito. Ma non è eseguibile da anon (vedi _3 e _5).
create or replace function public.testi_overlay()
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select jsonb_object_agg(c.ns || '.' || c.percorso, to_jsonb(v.valore))
       from public.testi_valore v
       join public.testi_chiave c on c.id = v.chiave_id and c.attiva
      where v.lingua = 'it'
        and v.valore is distinct from v.valore_file
        and (select attivo from public.testi_stato where id)),
    '{}'::jsonb)
$$;

-- ── Salvataggio ─────────────────────────────────────────────────────────────
-- Un solo gesto: salva E restituisce l'overlay aggiornato, che il pannello
-- carica subito su Storage. Non esiste un secondo passaggio.
--
-- p_visto_il è il lucchetto ottimistico: se nel frattempo la riga è cambiata
-- (un'altra scheda aperta), il salvataggio si ferma invece di sovrascrivere.
create or replace function public.testi_salva(
  p_chiave_id bigint, p_valore text, p_visto_il timestamptz)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare errs text[]; prima text; adesso timestamptz;
begin
  if not public.testi_e_admin() then
    raise exception 'accesso negato' using errcode = '42501';
  end if;

  errs := public.testi_valida(p_chiave_id, p_valore);
  if coalesce(array_length(errs, 1), 0) > 0 then
    raise exception '%', array_to_string(errs, ' · ') using errcode = '23514';
  end if;

  select valore into prima from public.testi_valore
   where chiave_id = p_chiave_id and lingua = 'it'
     and (p_visto_il is null or aggiornato_il = p_visto_il)
   for update;
  if not found then
    raise exception 'questa frase è stata modificata altrove: ricarica la pagina'
      using errcode = '40001';
  end if;

  update public.testi_valore
     set valore = p_valore, aggiornato_il = now(), aggiornato_da = auth.uid()
   where chiave_id = p_chiave_id and lingua = 'it'
   returning aggiornato_il into adesso;

  insert into public.testi_storico (chiave_id, lingua, valore_prima, valore_dopo, azione, attore)
       values (p_chiave_id, 'it', prima, p_valore, 'modifica', auth.uid());

  update public.testi_stato set ultimo_invio = now(), aggiornato_il = now() where id;
  -- Restituisce ANCHE il nuovo timestamp: il pannello deve ripartire da quello
  -- vero, o il prossimo salvataggio della stessa cella sembrerebbe un conflitto.
  return jsonb_build_object('overlay', public.testi_overlay(), 'visto', adesso);
end $$;

-- ── Ripristino: la frase torna al testo che sta nel codice ──────────────────
create or replace function public.testi_ripristina(p_chiave_id bigint)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare prima text; base text; adesso timestamptz;
begin
  if not public.testi_e_admin() then
    raise exception 'accesso negato' using errcode = '42501';
  end if;
  select valore, valore_file into prima, base from public.testi_valore
   where chiave_id = p_chiave_id and lingua = 'it' for update;
  if not found then raise exception 'voce inesistente'; end if;

  update public.testi_valore
     set valore = base, aggiornato_il = now(), aggiornato_da = auth.uid()
   where chiave_id = p_chiave_id and lingua = 'it'
   returning aggiornato_il into adesso;
  insert into public.testi_storico (chiave_id, lingua, valore_prima, valore_dopo, azione, attore)
       values (p_chiave_id, 'it', prima, base, 'ripristino', auth.uid());
  update public.testi_stato set ultimo_invio = now(), aggiornato_il = now() where id;
  return jsonb_build_object('overlay', public.testi_overlay(),
                            'visto', adesso, 'valore', base);
end $$;

-- ── Le versioni precedenti di una frase ─────────────────────────────────────
create or replace function public.testi_storico_chiave(p_chiave_id bigint)
returns table (id bigint, valore_prima text, valore_dopo text, azione text, quando timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.id, s.valore_prima, s.valore_dopo, s.azione, s.quando
    from public.testi_storico s
   where s.chiave_id = p_chiave_id and public.testi_e_admin()
   order by s.quando desc, s.id desc
   limit 50;
$$;

-- ── Torna a una versione precedente ─────────────────────────────────────────
-- Rimette online il testo di una riga dello storico. Passa dagli STESSI
-- controlli di testi_salva: se intanto il codice ha cambiato segnaposto o tag,
-- una versione vecchia non compatibile viene rifiutata invece di rompere la pagina.
create or replace function public.testi_torna_a(
  p_chiave_id bigint, p_storico_id bigint, p_visto_il timestamptz)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare errs text[]; prima text; scelto text; adesso timestamptz;
begin
  if not public.testi_e_admin() then
    raise exception 'accesso negato' using errcode = '42501';
  end if;

  select s.valore_dopo into scelto from public.testi_storico s
   where s.id = p_storico_id and s.chiave_id = p_chiave_id;
  if not found or scelto is null then
    raise exception 'versione inesistente per questa frase';
  end if;

  errs := public.testi_valida(p_chiave_id, scelto);
  if coalesce(array_length(errs, 1), 0) > 0 then
    raise exception 'questa versione non è più compatibile con il sito: %',
      array_to_string(errs, ' · ') using errcode = '23514';
  end if;

  select valore into prima from public.testi_valore
   where chiave_id = p_chiave_id and lingua = 'it'
     and (p_visto_il is null or aggiornato_il = p_visto_il)
   for update;
  if not found then
    raise exception 'questa frase è stata modificata altrove: ricarica la pagina'
      using errcode = '40001';
  end if;

  update public.testi_valore
     set valore = scelto, aggiornato_il = now(), aggiornato_da = auth.uid()
   where chiave_id = p_chiave_id and lingua = 'it'
   returning aggiornato_il into adesso;
  insert into public.testi_storico (chiave_id, lingua, valore_prima, valore_dopo, azione, attore)
       values (p_chiave_id, 'it', prima, scelto, 'versione', auth.uid());
  update public.testi_stato set ultimo_invio = now(), aggiornato_il = now() where id;
  return jsonb_build_object('overlay', public.testi_overlay(),
                            'visto', adesso, 'valore', scelto);
end $$;

-- ── L'interruttore generale: spento, il sito torna all'ultimo deploy ────────
create or replace function public.testi_imposta_attivo(p_attivo boolean)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.testi_e_admin() then
    raise exception 'accesso negato' using errcode = '42501';
  end if;
  update public.testi_stato set attivo = p_attivo, aggiornato_il = now() where id;
  return public.testi_overlay();
end $$;
