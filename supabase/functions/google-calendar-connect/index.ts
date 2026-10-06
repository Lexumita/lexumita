// supabase/functions/google-calendar-connect/index.ts
// Avvia il flusso OAuth Google Calendar: genera uno state legato all'utente e
// restituisce l'URL di consenso. Il frontend fa il redirect a questo URL.
// v8 (06-10-2026): l'app può chiedere di tornare a sé dopo il consenso
// ({ ritorno: "lexum://google-calendar" }, o "exp://…" con Expo Go): lo state lo
// ricorda e il callback riporta lì. Senza ritorno resta tutto come prima (sito).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
const REDIRECT_URI = "https://wnbmyiyblpinayswunxb.supabase.co/functions/v1/google-calendar-callback";
const SCOPE = "openid email https://www.googleapis.com/auth/calendar.events";
// Solo l'app: niente indirizzi web arbitrari (il vincolo sta anche nel database)
const RITORNO_APP = /^(lexum|exps?):\/\/[^\s]{0,250}$/;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!CLIENT_ID) throw new Error("GOOGLE_OAUTH_CLIENT_ID non configurato");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorizzato");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) throw new Error("Token non valido");

    const corpo = await req.json().catch(() => ({}));
    const ritorno = typeof corpo?.ritorno === "string" && RITORNO_APP.test(corpo.ritorno)
      ? corpo.ritorno
      : null;

    const state = crypto.randomUUID();
    const { error: stErr } = await supabase
      .from("calendar_oauth_state")
      .insert({ state, user_id: user.id, ritorno });
    if (stErr) throw new Error(stErr.message);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
      login_hint: user.email ?? "",
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return json({ ok: true, url });
  } catch (err) {
    console.error("google-calendar-connect:", err.message);
    return json({ ok: false, error: err.message }, 400);
  }
});
