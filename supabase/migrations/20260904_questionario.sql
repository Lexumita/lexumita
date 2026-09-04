-- ============================================================================
-- QUESTIONARIO DI FEEDBACK — LEXUM IT
-- Applicato in produzione il 04-09-2026 in 5 passaggi, qui riunito.
--
-- Il senso di tre scelte, per chi legge fra un anno:
--
-- 1. I TESTI SONO jsonb {it: "..."} anche se IT e' monolingua. Quando la
--    funzione verra' portata su CH (trilingue), lo schema non si tocca.
--
-- 2. LE RISPOSTE CONSERVANO UNA COPIA DEL TESTO LETTO (domanda_testo) e la
--    VERSIONE della domanda. Cosi' l'admin puo' correggere una domanda anche
--    dopo che sono arrivate risposte, senza falsare quelle vecchie.
--
-- 3. IL TOKEN NON SI CONSERVA IN CHIARO: solo sha256. Chi legge il database
--    non puo' rispondere al posto di nessuno.
--
-- NB SUI PERMESSI: Supabase applica ALTER DEFAULT PRIVILEGES sullo schema
-- public, quindi ogni tabella nuova nasce con TUTTI i privilegi concessi
-- DIRETTAMENTE ad anon. "revoke from public" NON li toglie: serve
-- "revoke from anon" esplicito. In fondo al file c'e'.
-- ============================================================================

create or replace function public.questionario_e_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles p
                  where p.id = auth.uid() and p.role = 'admin')
$$;

create or replace function public.questionario_t(j jsonb, l text default 'it')
returns text language sql immutable as $$
  select coalesce(nullif(j->>l, ''), j->>'it')
$$;

create table if not exists public.questionario (
  id     bigint generated always as identity primary key,
  codice text not null unique check (codice ~ '^[a-z0-9_]{3,40}$'),
  attivo boolean not null default false,
  titolo         jsonb not null check (titolo ? 'it'),
  intro          jsonb not null default '{"it":""}'        check (intro ? 'it'),
  ringraziamento jsonb not null default '{"it":"Grazie."}' check (ringraziamento ? 'it'),
  creato_il timestamptz not null default now()
);

create table if not exists public.questionario_domanda (
  id bigint generated always as identity primary key,
  questionario_id bigint not null references public.questionario(id) on delete restrict,
  codice text not null check (codice ~ '^[a-z0-9_]{2,40}$'),
  ordine int  not null default 100,
  tipo   text not null check (tipo in
          ('scala_1_5','scelta_singola','scelta_multipla','si_no','testo_libero')),
  testo   jsonb not null check (testo ? 'it'),
  aiuto   jsonb,
  opzioni jsonb not null default '[]'::jsonb,   -- [{"codice":"x","it":"etichetta"}]
  obbligatoria  boolean not null default false,
  max_selezioni int,
  max_caratteri int not null default 2000 check (max_caratteri between 1 and 5000),
  attiva   boolean not null default true,
  versione int not null default 1,
  creata_il     timestamptz not null default now(),
  aggiornata_il timestamptz not null default now(),
  unique (questionario_id, codice)
);
create index if not exists questionario_domanda_ord
  on public.questionario_domanda (questionario_id, ordine) where attiva;

create table if not exists public.questionario_invito (
  id bigint generated always as identity primary key,
  questionario_id bigint not null references public.questionario(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash bytea not null unique,
  creato_il    timestamptz not null default now(),
  scade_il     timestamptz not null default now() + interval '30 days',
  aperto_il    timestamptz,
  consumato_il timestamptz,
  revocato     boolean not null default false,
  unique (questionario_id, user_id)
);

create table if not exists public.questionario_compilazione (
  id bigint generated always as identity primary key,
  questionario_id bigint not null references public.questionario(id) on delete restrict,
  invito_id bigint unique references public.questionario_invito(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  inviata_il timestamptz not null default now()
);

create table if not exists public.questionario_risposta (
  id bigint generated always as identity primary key,
  compilazione_id bigint not null references public.questionario_compilazione(id) on delete cascade,
  domanda_id       bigint not null references public.questionario_domanda(id) on delete restrict,
  domanda_versione int  not null,
  domanda_testo    text not null,
  valore_num     int check (valore_num between 1 and 5),
  valore_testo   text,
  valore_opzioni text[],
  unique (compilazione_id, domanda_id),
  constraint risposta_una_forma_sola check (
    (valore_num is not null)::int + (valore_testo is not null)::int
                                  + (valore_opzioni is not null)::int = 1)
);
create index if not exists questionario_risposta_domanda
  on public.questionario_risposta (domanda_id);

-- Il versionamento: in bozza si rifa' tutto; con risposte il TIPO si congela e
-- la versione sale solo se cambia l'insieme dei codici opzione (il dominio).
create or replace function public.questionario_domanda_versiona()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_risposte boolean; v_old text[]; v_new text[];
begin
  new.versione := old.versione; new.codice := old.codice; new.aggiornata_il := now();
  select exists (select 1 from public.questionario_risposta r where r.domanda_id = old.id)
    into v_risposte;
  if not v_risposte then return new; end if;
  if new.tipo is distinct from old.tipo then
    raise exception 'La domanda "%" ha gia'' delle risposte: il tipo non si puo'' piu'' cambiare.',
      old.codice using errcode = '23514';
  end if;
  select array(select o->>'codice' from jsonb_array_elements(old.opzioni) o order by 1),
         array(select o->>'codice' from jsonb_array_elements(new.opzioni) o order by 1)
    into v_old, v_new;
  if v_old is distinct from v_new then new.versione := old.versione + 1; end if;
  return new;
end $$;

drop trigger if exists questionario_domanda_versiona_trg on public.questionario_domanda;
create trigger questionario_domanda_versiona_trg
  before update on public.questionario_domanda
  for each row execute function public.questionario_domanda_versiona();

-- ============================================================================
-- Le funzioni applicative sono state applicate come migrazioni separate:
--   questionario_2_funzioni            (destinatari, crea_inviti, apri, invia)
--   questionario_3_risultati_e_permessi (risultati, risposte_singole, RLS, grant)
--   questionario_4_domande             (le 7 domande di feedback_uso_2026)
--   questionario_5_chiudi_trigger      (revoca da anon della funzione trigger)
-- Il loro testo integrale e' recuperabile con:
--   select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n
--     on n.oid = p.pronamespace where n.nspname='public' and p.proname like 'questionario%';
--
-- PROMEMORIA DEI PERMESSI, che e' la parte che si sbaglia:
--   revoke all on <tutte le tabelle questionario_*> from public, anon;
--   grant select,insert,update,delete on questionario, questionario_domanda to authenticated;
--   grant select on questionario_invito, questionario_compilazione, questionario_risposta
--     to authenticated;
--   -- LE UNICHE DUE aperte senza login (la credenziale e' il token, non la sessione):
--   grant execute on function public.questionario_apri(text)         to anon, authenticated;
--   grant execute on function public.questionario_invia(text, jsonb) to anon, authenticated;
--   -- tutte le altre: revoke da public+anon, grant a authenticated.
-- ============================================================================
