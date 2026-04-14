-- ─────────────────────────────────────────────────────────────
-- Lexum — Schema Calendario Avvocati
-- Esegui in aggiunta a schema.sql
-- ─────────────────────────────────────────────────────────────

-- ── SLOT DISPONIBILITÀ ────────────────────────────────────────
-- L'avvocato crea slot: liberi o già assegnati a un cliente
create table if not exists slot_disponibilita (
  id               uuid primary key default gen_random_uuid(),
  avvocato_id      uuid not null references auth.users(id) on delete cascade,
  data_ora_inizio  timestamptz not null,
  data_ora_fine    timestamptz not null,
  stato            text not null default 'disponibile'
                     check (stato in ('disponibile', 'prenotato', 'annullato')),
  assegnato_a      uuid references auth.users(id) on delete set null,
  assegnato_at     timestamptz,
  note_interne     text,        -- visibili solo all'avvocato
  note_cliente     text,        -- visibili anche al cliente (es. link call, indirizzo)
  created_at       timestamptz not null default now()
);

alter table slot_disponibilita enable row level security;

-- Avvocato vede e gestisce solo i propri slot
create policy "avvocato_own_slots" on slot_disponibilita
  for all using (auth.uid() = avvocato_id);

-- ── APPUNTAMENTI ──────────────────────────────────────────────
-- Creato automaticamente quando uno slot viene assegnato a un cliente
create table if not exists appuntamenti (
  id               uuid primary key default gen_random_uuid(),
  avvocato_id      uuid not null references auth.users(id) on delete cascade,
  cliente_id       uuid not null references auth.users(id) on delete cascade,
  slot_id          uuid references slot_disponibilita(id) on delete set null,
  titolo           text not null default 'Consulenza',
  tipo             text not null default 'presenza'
                     check (tipo in ('presenza', 'videocall', 'telefonico')),
  stato            text not null default 'confermato'
                     check (stato in ('confermato', 'completato', 'annullato')),
  data_ora_inizio  timestamptz not null,
  data_ora_fine    timestamptz not null,
  note_cliente     text,        -- visibili al cliente nel suo portale
  note_interne     text,        -- solo avvocato (e admin)
  link_videocall   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table appuntamenti enable row level security;

-- Avvocato vede i propri appuntamenti
create policy "avvocato_own_appuntamenti" on appuntamenti
  for all using (auth.uid() = avvocato_id);

-- Cliente vede solo i propri appuntamenti (portale)
create policy "cliente_own_appuntamenti" on appuntamenti
  for select using (auth.uid() = cliente_id);

-- Trigger updated_at
create trigger appuntamenti_updated_at
  before update on appuntamenti
  for each row execute function set_updated_at();

-- ── VISTE ─────────────────────────────────────────────────────

-- Vista appuntamenti con dati cliente
create or replace view v_appuntamenti_avvocato as
select
  a.*,
  p_cli.raw_user_meta_data->>'nome'    as cliente_nome,
  p_cli.raw_user_meta_data->>'cognome' as cliente_cognome,
  p_cli.email                          as cliente_email,
  extract(epoch from (a.data_ora_fine - a.data_ora_inizio)) / 60 as durata_minuti
from appuntamenti a
join auth.users p_cli on p_cli.id = a.cliente_id;

-- Vista slot con dati cliente assegnato
create or replace view v_slot_avvocato as
select
  s.*,
  p_cli.raw_user_meta_data->>'nome'    as cliente_nome,
  p_cli.raw_user_meta_data->>'cognome' as cliente_cognome,
  p_cli.email                          as cliente_email
from slot_disponibilita s
left join auth.users p_cli on p_cli.id = s.assegnato_a;

-- ── NOTA ──────────────────────────────────────────────────────
-- "Prossimo appuntamento" per il portale cliente:
-- select * from appuntamenti
--   where cliente_id = auth.uid()
--     and stato = 'confermato'
--     and data_ora_inizio > now()
--   order by data_ora_inizio asc
--   limit 1;
