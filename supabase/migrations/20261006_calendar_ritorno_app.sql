-- 06-10-2026 · Google Calendar dall'app: dopo il consenso il callback portava sempre al Profilo del sito.
-- Lo state ricorda dove tornare: vuoto = sito (com'era), «lexum://…» = app installata, «exp://…» = prove
-- con Expo Go. Lo scrive google-calendar-connect (v8), lo legge google-calendar-callback (v9).

alter table public.calendar_oauth_state add column if not exists ritorno text;

alter table public.calendar_oauth_state drop constraint if exists calendar_oauth_state_ritorno_app;
alter table public.calendar_oauth_state add constraint calendar_oauth_state_ritorno_app
  check (ritorno is null or ritorno ~ '^(lexum|exps?)://');
