-- Cassa Tagadapay (27-10-2026). Stripe ha chiuso il conto di Lexum: i pagamenti passano da Tagadapay
-- (account di Mosaico Experiences SA). Le funzioni tagada-checkout, tagada-webhook e tagada-admin
-- usano queste tabelle con la chiave di servizio; agli utenti non sono visibili (RLS senza policy).

-- Un ordine aperto per ogni passaggio alla cassa: l'id viaggia nell'indirizzo della cassa (lexum_tx)
-- e torna nella notifica order/paid, così il pagamento si lega all'utente e al prodotto giusti.
create table if not exists public.tagada_ordini (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete set null,
  prodotto_id       uuid references public.prodotti(id) on delete set null,
  variant_id        text not null,
  importo           numeric(10,2) not null,
  consenso_recesso  boolean not null default false,
  consenso_il       timestamptz,
  stato             text not null default 'aperto'
                    check (stato in ('aperto', 'pagato', 'rimborsato', 'errore')),
  order_id          text unique,
  payment_id        text,
  errore            text,
  creato_il         timestamptz not null default now(),
  pagato_il         timestamptz
);
create index if not exists tagada_ordini_utente_idx on public.tagada_ordini (user_id, creato_il desc);
alter table public.tagada_ordini enable row level security;

-- Registro delle notifiche ricevute: una sola elaborazione per evento (Tagadapay può ripeterle).
create table if not exists public.tagada_eventi (
  event_id     text primary key,
  tipo         text,
  payload      jsonb,
  ricevuto_il  timestamptz not null default now()
);
alter table public.tagada_eventi enable row level security;

grant all on public.tagada_ordini, public.tagada_eventi to service_role;
revoke all on public.tagada_ordini, public.tagada_eventi from anon, authenticated;

-- Il prodotto Lexum corrispondente su Tagadapay (variante con il prezzo del listino).
alter table public.prodotti add column if not exists tagada_variant_id text;

-- Segreto delle notifiche: lo restituisce Tagadapay quando si registra l'indirizzo del webhook e
-- finisce direttamente nel Vault, senza passare da nessuno. Solo la chiave di servizio lo legge.
create or replace function public.tagada_webhook_segreto_salva(p_segreto text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'tagada_webhook_secret';
  if v_id is null then
    perform vault.create_secret(p_segreto, 'tagada_webhook_secret', 'Segreto delle notifiche Tagadapay (Lexum IT)');
  else
    perform vault.update_secret(v_id, p_segreto);
  end if;
end;
$$;

create or replace function public.tagada_webhook_segreto()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'tagada_webhook_secret';
$$;

revoke all on function public.tagada_webhook_segreto_salva(text) from public, anon, authenticated;
revoke all on function public.tagada_webhook_segreto() from public, anon, authenticated;
grant execute on function public.tagada_webhook_segreto_salva(text) to service_role;
grant execute on function public.tagada_webhook_segreto() to service_role;

-- 27-10 sera: il catalogo su Tagadapay lo riempie tagada-checkout al momento del pagamento, dal
-- listino di Lexum (nome, descrizione, prezzo) e per gli upgrade con l'importo esatto di oggi. Qui si
-- ricorda quale variante Tagadapay corrisponde a ogni combinazione, così non la si ricrea ogni volta.
-- La chiave cambia se cambiano prezzo, nome o descrizione: un prezzo nuovo crea un articolo nuovo.
create table if not exists public.tagada_varianti (
  chiave       text primary key,
  variant_id   text not null,
  prodotto_id  uuid references public.prodotti(id) on delete set null,
  importo      numeric(10,2) not null,
  creato_il    timestamptz not null default now()
);
alter table public.tagada_varianti enable row level security;
grant all on public.tagada_varianti to service_role;
revoke all on public.tagada_varianti from anon, authenticated;

-- Non serve più: il collegamento prodotto→variante sta in tagada_varianti.
alter table public.prodotti drop column if exists tagada_variant_id;
