-- Tutto cio' che serve alla tabella dei destinatari in UNA chiamata sola:
-- anagrafica, se la persona ha gia' usato Lexum, e se ha crediti assegnati.
-- Prima il pannello chiamava una edge function con filtri lato server e
-- l'admin doveva premere "carica destinatari" a ogni cambio di filtro.
--
-- ATTENZIONE: la gemella nel repo LEXUM CH e' DIVERSA, e la differenza e'
-- voluta: CH non ha `ricerche_bancadati` ne' `profiles.disattivato_at`, e usa
-- testi_e_admin() come guardia. Non "riallineare" i due file.
--
-- Sul nome della guardia: questionario_e_admin() e' nata per il questionario
-- ma e' un controllo admin generico. La riuso invece di aggiungere una terza
-- funzione identica. Non uso is_admin(), che esiste in produzione ma non in
-- nessun file di migrations/, quindi non e' sotto controllo di versione.
create or replace function public.utenti_per_invio()
returns table (id uuid, nome text, cognome text, email text, role text,
               ha_usato boolean, ha_crediti boolean, registrato date,
               e_di_prova boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  with usato as (
    select distinct l.user_id from public.lex_logs l            where l.user_id is not null
    union select distinct r.user_id from public.ricerche r      where r.user_id is not null
    union select distinct b.user_id from public.ricerche_bancadati b where b.user_id is not null
  )
  select p.id, p.nome, p.cognome, p.email, p.role,
         (p.id in (select u.user_id from usato u)),
         exists (select 1 from public.crediti_ai c where c.user_id = p.id),
         p.created_at::date,
         -- Segnalati, non nascosti: la decisione resta all'admin, ma l'account
         -- di prova non deve piu' finire in un invio per distrazione.
         (lower(coalesce(p.nome,'') || coalesce(p.cognome,'') || p.email) like '%test%'
          or p.email like '%@lexum.it'
          or p.email = 'info@cronobid.com')
    from public.profiles p
   where public.questionario_e_admin()
     and p.email is not null
     and p.disattivato_at is null
   order by lower(coalesce(nullif(btrim(p.cognome), ''), p.nome, p.email));
$$;

revoke execute on function public.utenti_per_invio() from public, anon;
grant  execute on function public.utenti_per_invio() to authenticated;
