-- ============================================================================
-- CORREZIONE: "column reference user_id is ambiguous"
-- Applicata in produzione il 07-09-2026 (nome in Supabase:
-- questionario_6_fix_ambiguita_user_id).
--
-- IL DIFETTO, per chi lo rincontrasse altrove:
-- la funzione dichiara `returns table (user_id uuid, ...)`. Quel nome diventa
-- un parametro d'uscita, e collideva con la colonna `user_id` dentro
-- `on conflict (questionario_id, user_id)`: PL/pgSQL non puo' sapere se stiamo
-- nominando il parametro o la colonna, e si ferma a ESECUZIONE, non alla
-- creazione. Per questo la funzione si era creata senza un fiato e ha fallito
-- solo al primo uso vero dal pannello.
--
-- LA CORREZIONE: si indica il VINCOLO PER NOME invece dell'elenco di colonne,
-- cosi' non resta alcun identificatore da disambiguare. Le variabili interne
-- prendono il prefisso v_ per la stessa ragione, un passo prima che il
-- problema si ripresenti (p.es. se `profiles` guadagnasse una colonna `uid`).
-- ============================================================================

create or replace function public.questionario_crea_inviti(p_codice text, p_user_ids uuid[])
returns table (user_id uuid, email text, nome text, cognome text, token text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_q_id bigint; v_uid uuid; v_tok text;
begin
  if not public.questionario_e_admin() then
    raise exception 'accesso negato' using errcode = '42501';
  end if;
  select q.id into v_q_id from public.questionario q
   where q.codice = p_codice and q.attivo;
  if not found then
    raise exception 'Questionario "%" inesistente o non attivo', p_codice using errcode = '23503';
  end if;

  foreach v_uid in array p_user_ids loop
    -- 32 byte = 64 caratteri esadecimali. Un invito vivo per persona: il
    -- precedente viene sostituito, cosi' un vecchio collegamento smette di valere.
    v_tok := encode(extensions.gen_random_bytes(32), 'hex');

    insert into public.questionario_invito (questionario_id, user_id, token_hash)
         values (v_q_id, v_uid, sha256(v_tok::bytea))
    on conflict on constraint questionario_invito_questionario_id_user_id_key do update
       set token_hash   = excluded.token_hash,
           creato_il    = now(),
           scade_il     = now() + interval '30 days',
           aperto_il    = null,
           consumato_il = null,
           revocato     = false;

    return query
      select p.id, p.email, p.nome, p.cognome, v_tok
        from public.profiles p where p.id = v_uid;
  end loop;
end $$;

revoke execute on function public.questionario_crea_inviti(text, uuid[]) from public, anon;
grant  execute on function public.questionario_crea_inviti(text, uuid[]) to authenticated;
