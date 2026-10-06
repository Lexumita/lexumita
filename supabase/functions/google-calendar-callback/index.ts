// supabase/functions/google-calendar-callback/index.ts
// Callback OAuth: Google reindirizza qui (GET, senza JWT -> verify_jwt=false).
// Verifica lo state, scambia il code per i token, salva il refresh token e
// riporta l'utente alla sezione Profilo del sito.
// v9 (06-10-2026): se lo state viene dall'app (colonna `ritorno`), si torna
// all'app con «calendar=connesso|errore» invece che al sito; anche quando
// l'utente rifiuta il consenso.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;
const REDIRECT_URI = "https://wnbmyiyblpinayswunxb.supabase.co/functions/v1/google-calendar-callback";
// Rimuove eventuali slash finali per evitare URL tipo https://lexum.it//profilo
const APP_URL = (Deno.env.get("APP_URL") ?? "https://lexum.it").replace(/\/+$/, "");
const RITORNO_APP = /^(lexum|exps?):\/\//;

function backTo(status: string, ritorno: string | null = null) {
  if (ritorno && RITORNO_APP.test(ritorno)) {
    const sep = ritorno.includes("?") ? "&" : "?";
    return Response.redirect(`${ritorno}${sep}calendar=${status}`, 302);
  }
  return Response.redirect(`${APP_URL}/profilo?calendar=${status}`, 302);
}

function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(payload));
    return json.email ?? null;
  } catch (_) {
    return null;
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthErr = url.searchParams.get("error");

  // 1) Consuma lo state (anti-CSRF): chi è e dove tornare
  let user_id: string | null = null;
  let ritorno: string | null = null;
  if (state) {
    const { data: st } = await supabase
      .from("calendar_oauth_state")
      .select("user_id, ritorno")
      .eq("state", state)
      .maybeSingle();
    if (st) {
      user_id = st.user_id as string;
      ritorno = (st.ritorno as string | null) ?? null;
      await supabase.from("calendar_oauth_state").delete().eq("state", state);
    }
  }
  if (oauthErr || !code || !user_id) return backTo("errore", ritorno);

  try {
    if (!CLIENT_ID || !CLIENT_SECRET) throw new Error("OAuth non configurato");

    // 2) Scambia il code per i token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tok = await tokenRes.json();
    if (!tokenRes.ok || !tok.access_token) {
      console.error("token exchange fallito:", tok);
      return backTo("errore", ritorno);
    }

    const email = emailFromIdToken(tok.id_token);
    const expiry = new Date(Date.now() + ((tok.expires_in ?? 3600) * 1000)).toISOString();

    // 3) Salva la connessione (non sovrascrive refresh_token se assente ne' la visibilita)
    const record: Record<string, unknown> = {
      user_id,
      provider: "google",
      google_email: email,
      access_token: tok.access_token,
      token_expiry: expiry,
      scope: tok.scope ?? null,
      stato: "connesso",
      updated_at: new Date().toISOString(),
    };
    if (tok.refresh_token) record.refresh_token = tok.refresh_token;

    const { error: upErr } = await supabase
      .from("calendar_connessioni")
      .upsert(record, { onConflict: "user_id" });
    if (upErr) {
      console.error("upsert connessione:", upErr.message);
      return backTo("errore", ritorno);
    }

    return backTo("connesso", ritorno);
  } catch (err) {
    console.error("google-calendar-callback:", err.message);
    return backTo("errore", ritorno);
  }
});
