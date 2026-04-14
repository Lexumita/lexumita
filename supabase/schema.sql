-- ─────────────────────────────────────────────────────────────
-- Lexum — Schema iniziale Supabase / PostgreSQL
-- Esegui questo file nella SQL Editor di Supabase
-- ─────────────────────────────────────────────────────────────

-- Abilita UUID
create extension if not exists "pgcrypto";

-- ── CONTACT REQUESTS ──────────────────────────────────────────
create table if not exists contact_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  studio      text,
  phone       text,
  message     text not null,
  type        text not null default 'info'
                check (type in ('demo', 'info', 'pricing', 'support')),
  status      text not null default 'new'
                check (status in ('new', 'in_progress', 'resolved')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS: solo gli admin leggono le richieste, nessuno le scrive dal client
alter table contact_requests enable row level security;

-- Nessuna policy di lettura pubblica (solo service_role via Edge Function)

-- ── DEMO REQUESTS ─────────────────────────────────────────────
create table if not exists demo_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  studio      text not null,
  phone       text,
  avvocati    int,
  interessi   text[] default '{}',
  note        text,
  status      text not null default 'pending'
                check (status in ('pending', 'scheduled', 'completed', 'cancelled')),
  demo_date   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table demo_requests enable row level security;

-- ── TRIGGER: aggiorna updated_at automaticamente ───────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contact_requests_updated_at
  before update on contact_requests
  for each row execute function set_updated_at();

create trigger demo_requests_updated_at
  before update on demo_requests
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- NOTE FUTURE (da aggiungere quando si sviluppa la piattaforma)
-- ─────────────────────────────────────────────────────────────
-- table: studios         — studi legali registrati
-- table: lawyers         — avvocati (collegati a uno studio)
-- table: clients         — clienti dello studio
-- table: cases           — pratiche
-- table: documents       — documenti per pratica
-- table: payments        — pagamenti / fatture
-- table: legal_documents — sentenze/casi banca dati
-- table: legal_doc_views — accessi alla banca dati (per revenue tracking)
-- table: revenue_shares  — quote distribuite agli studi
