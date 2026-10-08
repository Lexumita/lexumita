-- 08-10-2026 (controllo di sicurezza, fase 2): tetti d'uso per utente contati in modo ATOMICO.
--
-- Le funzioni di Lex senza credito (impaginazione del PDF, ricerca col ragionamento, assistente
-- dello studio, pagamenti, analisi di un documento) avevano un tetto contato sul registro lex_logs:
-- si leggeva quante chiamate c'erano state e poi si chiamava il modello. Una raffica di richieste
-- in parallelo leggeva lo stesso numero e passava tutta. consuma_limite_uso conta e controlla
-- nella stessa istruzione: oltre il tetto risponde false e la funzione non chiama il modello.
-- Finestre fisse: p_finestra_secondi = 86400 vuol dire «al giorno», dalle 00:00 UTC.
-- La chiama solo il server (service_role); la tabella non ha regole per gli utenti.

create table if not exists public.limiti_uso (
  user_id uuid not null,
  chiave text not null,
  finestra_inizio timestamptz not null,
  conteggio integer not null default 0,
  primary key (user_id, chiave, finestra_inizio)
);
alter table public.limiti_uso enable row level security;
revoke all on table public.limiti_uso from anon, authenticated;

create or replace function public.consuma_limite_uso(
  p_user_id uuid, p_chiave text, p_massimo integer, p_finestra_secondi integer)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_inizio timestamptz;
  v_conteggio integer;
begin
  if p_user_id is null or coalesce(p_chiave, '') = '' or coalesce(p_massimo, 0) < 1
     or coalesce(p_finestra_secondi, 0) < 1 then
    return false;
  end if;
  v_inizio := to_timestamp((floor(extract(epoch from now()) / p_finestra_secondi) * p_finestra_secondi)::double precision);
  insert into public.limiti_uso as l (user_id, chiave, finestra_inizio, conteggio)
  values (p_user_id, p_chiave, v_inizio, 1)
  on conflict (user_id, chiave, finestra_inizio)
    do update set conteggio = l.conteggio + 1
    where l.conteggio < p_massimo
  returning l.conteggio into v_conteggio;
  return v_conteggio is not null;
end
$function$;

revoke all on function public.consuma_limite_uso(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consuma_limite_uso(uuid, text, integer, integer) to service_role;

-- Le finestre passate non servono più: ogni notte via quelle chiuse da più di 8 giorni.
select cron.schedule('pulisci-limiti-uso', '50 3 * * *',
  $$delete from public.limiti_uso where finestra_inizio < now() - interval '8 days'$$);
