-- ============================================================================
-- Pannello "Testi" — schema (Lexum IT, una sola lingua: italiano)
--
-- Copia di Lexum CH (20260904_testi_1_schema.sql) con la sola lingua 'it'.
--
-- I file public/locales/it/<namespace>.json restano la BASE del sito e
-- restano deployati. Questo schema conserva SOLO le frasi che l'admin cambia
-- dal pannello; il sito le sovrappone alla base (src/i18n/overlay.js).
--
-- Conseguenza voluta: se il database non risponde, la vetrina è esattamente
-- quella dell'ultimo deploy. Il pannello non può far cadere il sito.
--
-- Da applicare in ordine: _1_schema, _2_funzioni, _3_sincronizza, _4_bucket,
-- _5_chiudi_anon.
-- ============================================================================

-- Guardia propria, come su CH e come public.questionario_e_admin() di IT:
-- security definer, search_path fisso, niente dipendenze da funzioni fuori
-- dal controllo di versione.
create or replace function public.testi_e_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.role = 'admin'
  )
$$;

-- ── I namespace, divisi nelle due schede del pannello ───────────────────────
create table if not exists public.testi_namespace (
  ns         text primary key,                                   -- 'home'
  etichetta  text not null,                                      -- 'Home'
  gruppo     text not null default 'backend'
             check (gruppo in ('vetrina', 'backend')),
  ordine     int  not null default 100,
  aggiornato_il timestamptz not null default now()
);

-- ── Il catalogo: dichiarato dal CODICE, il pannello non lo inventa mai ──────
create table if not exists public.testi_chiave (
  id            bigint generated always as identity primary key,
  ns            text not null references public.testi_namespace(ns)
                on update cascade on delete cascade,
  percorso      text not null,                     -- 'hero.features[0].t'
  ordine        int  not null default 0,           -- ordine nel file: diff leggibili
  tipo          text not null default 'testo'
                check (tipo in ('testo','booleano','enum')),
  enum_valori   text[],                            -- non usato in vetrina, tenuto come CH
  variabili     text[] not null default '{}',      -- {'year'}  da {{year}}
  tag           text[] not null default '{}',      -- {'b','link'} da <b>…</b>
  obbligatoria  boolean not null default true,     -- false se il file la manda vuota
  max_caratteri int  not null default 1000,
  array_padre   text,                              -- 'hero.features'
  array_indice  int,
  attiva        boolean not null default true,     -- false = sparita dal codice
  unique (ns, percorso),
  constraint testi_chiave_percorso_valido
    check (percorso ~ '^[^.\[\]]+(\.[^.\[\]]+|\[[0-9]+\])*$'),
  constraint testi_chiave_enum_ha_dominio
    check (tipo <> 'enum' or coalesce(array_length(enum_valori, 1), 0) > 0),
  constraint testi_chiave_array_coerente
    check ((array_padre is null) = (array_indice is null))
);
create index if not exists testi_chiave_ns_ordine on public.testi_chiave (ns, ordine);
create index if not exists testi_chiave_attiva    on public.testi_chiave (ns) where attiva;

-- ── I valori: una riga per chiave (una sola lingua) ─────────────────────────
--    valore      = quello che va online
--    valore_file = com'era nel file all'ultima sincronizzazione dal codice
--    Il delta fra i due È l'overlay. Uguali ⇒ la chiave non viaggia.
--    La colonna lingua resta (sempre 'it') per tenere la stessa forma di CH.
create table if not exists public.testi_valore (
  chiave_id     bigint not null references public.testi_chiave(id) on delete cascade,
  lingua        text not null default 'it' check (lingua = 'it'),
  valore        text not null,          -- '' è legittimo se il file la manda vuota
  valore_file   text not null,
  aggiornato_il timestamptz not null default now(),
  aggiornato_da uuid references auth.users(id),
  primary key (chiave_id, lingua)
);
-- L'indice che regge la composizione dell'overlay: solo le righe modificate.
create index if not exists testi_valore_modificati on public.testi_valore (lingua)
  where valore is distinct from valore_file;

-- ── Lo storico: ogni modifica, per poter tornare indietro ───────────────────
create table if not exists public.testi_storico (
  id            bigserial primary key,
  chiave_id     bigint not null references public.testi_chiave(id) on delete cascade,
  lingua        text not null default 'it',
  valore_prima  text,
  valore_dopo   text,
  azione        text not null
                check (azione in ('modifica','ripristino','versione','sincronizzazione')),
  attore        uuid references auth.users(id),
  quando        timestamptz not null default now()
);
create index if not exists testi_storico_chiave on public.testi_storico (chiave_id, quando desc);

-- ── Lo stato: l'interruttore generale ───────────────────────────────────────
--    attivo = false  ⇒  si pubblica un overlay vuoto e il sito torna, in meno
--    di un minuto, esattamente all'ultimo deploy. Senza VS Code.
create table if not exists public.testi_stato (
  id             boolean primary key default true check (id),
  attivo         boolean not null default true,
  ultimo_invio   timestamptz,
  ultimo_export  timestamptz,          -- ultima volta che i file del repo sono stati riallineati
  aggiornato_il  timestamptz not null default now()
);
insert into public.testi_stato (id) values (true) on conflict (id) do nothing;
