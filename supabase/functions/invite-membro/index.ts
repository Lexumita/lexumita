// supabase/functions/invite-membro/index.ts — Lexum IT
//
// Invito di un collaboratore nello studio. v36 del 06-10-2026: lo stesso modello di
// Lexum CH (rifatto lì il 04-10-2026), in italiano.
//
// Prima (v35) l'invitato entrava SUBITO nello studio, senza il suo consenso, e la
// funzione voleva un `ruolo_studio` che il sito non manda: rispondeva sempre
// «Ruolo non valido». Ora le regole stanno tutte nel database, in
// studio_invita_collaboratore(), chiamata con il token di chi invita
// (auth.uid() = titolare): stesso ruolo, posti liberi, invitato non già in uno
// studio. L'invito resta IN ATTESA finché l'invitato non lo accetta dalla pagina
// Studio (sito o app): entrando, quello che registra va nello studio del titolare.
// La notifica nella campanella la scrive il database; qui si spedisce solo la
// mail (Postmark, testo qui: il modello «invito-studio» diceva che si era già
// dentro) e la si registra in mail_log come fa send-mail.
//
// INPUT  { email }
// OUTPUT { ok: true, invito_id, scade_il, mail_inviata } | { ok: false, codice, error }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// La chiave pubblica per chiamare il database a nome dell'utente: su IT la vecchia «anon» è spenta,
// quindi prima la nuova (SUPABASE_PUBLISHABLE_KEYS, un dizionario JSON), poi la vecchia come ripiego.
function chiavePubblica(): string {
  try {
    const tutte = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    const prima = tutte?.default ?? Object.values(tutte ?? {})[0];
    if (typeof prima === "string" && prima) return prima;
  } catch (_) { /* non c'è: si usa la vecchia */ }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

const POSTMARK_API_KEY = Deno.env.get("POSTMARK_API_KEY") ?? "";
const MITTENTE = Deno.env.get("POSTMARK_DEFAULT_FROM") ?? "noreply@lexum.it";
const RISPONDI_A = "info@lexum.it";
const LINK_STUDIO = "https://www.lexum.it/studio";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function risposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

interface Dati { nome: string; titolare: string; studio: string; scade: string }

// Frasi senza genere: «ti invita», «la persona che ti invita».
function testi(d: Dati) {
  return {
    oggetto:  `${d.titolare} ti invita nel suo studio su Lexum`,
    saluto:   d.nome ? `Buongiorno ${d.nome},` : "Buongiorno,",
    invito:   `${d.titolare}${d.studio} ti invita a lavorare nel suo studio su Lexum.`,
    come:     `Per rispondere accedi a Lexum: trovi l'invito nella pagina Studio, sul sito o nell'app, con i pulsanti Accetta e Rifiuta. L'invito vale fino al ${d.scade}.`,
    bottone:  "Apri l'invito",
    consenso: "Se accetti, lavorerai nello studio: vedrai i suoi clienti e il suo lavoro, e quello che registri da quel momento (clienti, pratiche, documenti) sarà dello studio e conterà nel piano del titolare. Potrai lasciare lo studio quando vuoi.",
    ignora:   "Se non conosci questa persona, ignora questa mail: senza una tua risposta non cambia nulla.",
    firma:    "Il team di Lexum",
  };
}

type Testi = ReturnType<typeof testi>;

// Colori pieni e bgcolor ovunque; tema chiaro e scuro dichiarati con gli stessi colori:
// così Gmail non ribalta la mail (vedi la nota sulle mail nel repo dell'app).
function corpoHtml(t: Testi): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${t.oggetto}</title>
<style>
  :root { color-scheme: light dark; }
  @media (prefers-color-scheme: dark) {
    .fondo { background:#f3f1ec !important; }
    .foglio { background:#ffffff !important; }
    .testo { color:#22343b !important; }
  }
  [data-ogsc] .testo { color:#22343b !important; }
  [data-ogsb] .fondo { background:#f3f1ec !important; }
  [data-ogsb] .foglio { background:#ffffff !important; }
</style>
</head>
<body class="fondo" bgcolor="#f3f1ec" style="margin:0;padding:0;background:#f3f1ec;">
<table role="presentation" class="fondo" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f3f1ec" style="background:#f3f1ec;padding:32px 12px;">
<tr><td align="center" bgcolor="#f3f1ec">
<table role="presentation" class="foglio" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:560px;background:#ffffff;border:1px solid #e4ded2;">
<tr><td bgcolor="#ffffff" style="padding:28px 32px 4px;font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:2px;color:#0e2a33;">LEXUM</td></tr>
<tr><td class="testo" bgcolor="#ffffff" style="padding:12px 32px 28px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#22343b;">
<p style="margin:0 0 14px;">${t.saluto}</p>
<p style="margin:0 0 14px;">${t.invito}</p>
<p style="margin:0 0 22px;">${t.come}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#0e2a33" style="background:#0e2a33;">
<a href="${LINK_STUDIO}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;">${t.bottone}</a>
</td></tr></table>
<p style="margin:26px 0 12px;font-size:13px;color:#5b6b71;">${t.consenso}</p>
<p style="margin:0 0 20px;font-size:13px;color:#5b6b71;">${t.ignora}</p>
<p style="margin:0;font-size:14px;color:#22343b;">${t.firma}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function corpoTesto(t: Testi): string {
  return [t.saluto, "", t.invito, "", t.come, "", `${t.bottone}: ${LINK_STUDIO}`, "",
          t.consenso, "", t.ignora, "", t.firma].join("\n");
}

// true = spedita. Un errore della mail non annulla l'invito: la notifica nella
// campanella c'è comunque e il titolare vede l'invito in attesa.
// deno-lint-ignore no-explicit-any
async function spedisciInvito(esito: any): Promise<boolean> {
  const inv = esito?.invitato ?? {};
  const tit = esito?.titolare ?? {};
  if (!inv.email) return false;

  const scade = new Date(esito.scade_il).toLocaleDateString("it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Rome",
  });
  const dati: Dati = {
    nome:     `${inv.nome ?? ""} ${inv.cognome ?? ""}`.trim(),
    titolare: `${tit.nome ?? ""} ${tit.cognome ?? ""}`.trim() || "Lexum",
    studio:   tit.studio ? ` (${tit.studio})` : "",
    scade,
  };
  const t = testi(dati);
  // Nella versione HTML i nomi scritti dagli utenti si mettono al sicuro
  const tHtml = testi({
    nome: esc(dati.nome), titolare: esc(dati.titolare), studio: esc(dati.studio), scade: esc(dati.scade),
  });

  let messageId: string | null = null;
  let errore: string | null = null;
  if (!POSTMARK_API_KEY) {
    errore = "POSTMARK_API_KEY mancante";
  } else {
    try {
      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": POSTMARK_API_KEY,
        },
        body: JSON.stringify({
          From:          MITTENTE,
          To:            inv.email,
          ReplyTo:       RISPONDI_A,
          Subject:       t.oggetto,
          HtmlBody:      corpoHtml(tHtml),
          TextBody:      corpoTesto(t),
          MessageStream: "outbound",
          Tag:           "invito-studio",
          Metadata:      { invito_id: String(esito.invito_id) },
        }),
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ErrorCode === 0) messageId = j.MessageID ?? null;
      else errore = j?.Message ?? `HTTP ${res.status}`;
    } catch (e) {
      errore = e instanceof Error ? e.message : String(e);
    }
  }

  const { error: logErr } = await supabase.from("mail_log").insert({
    postmark_message_id: messageId,
    to_email:            inv.email,
    to_user_id:          inv.id ?? null,
    from_email:          MITTENTE,
    reply_to:            RISPONDI_A,
    subject:             t.oggetto,
    tipo:                "invito_studio",
    origine:             "invite-membro",
    stato:               messageId ? "sent" : "failed",
    error_message:       errore,
    sent_at:             messageId ? new Date().toISOString() : null,
    metadati:            { invito_id: esito.invito_id },
  });
  if (logErr) console.error("invite-membro, mail_log:", logErr.message);
  if (errore) console.error("invite-membro, mail non spedita:", errore);
  return messageId !== null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return risposta({ ok: false, codice: "NON_AUTENTICATO", error: "Non autorizzato" }, 401);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return risposta({ ok: false, codice: "NON_AUTENTICATO", error: "Token non valido" }, 401);

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email) return risposta({ ok: false, codice: "EMAIL_MANCANTE", error: "Email obbligatoria" }, 400);

    // Il database decide con l'identità di chi invita: auth.uid() = titolare
    const comeUtente = createClient(SUPABASE_URL, chiavePubblica(), {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: esito, error } = await comeUtente.rpc("studio_invita_collaboratore", { p_email: email });
    if (error) {
      console.error("invite-membro, studio_invita_collaboratore:", error.message);
      return risposta({ ok: false, codice: "ERRORE", error: "Errore nell'invio dell'invito" }, 500);
    }
    if (!esito?.ok) {
      return risposta(esito ?? { ok: false, codice: "ERRORE", error: "Errore nell'invio dell'invito" }, 400);
    }

    const mailInviata = await spedisciInvito(esito);
    return risposta({
      ok:           true,
      invito_id:    esito.invito_id,
      scade_il:     esito.scade_il,
      mail_inviata: mailInviata,
    });
  } catch (err) {
    console.error("invite-membro:", (err as Error).message);
    return risposta({ ok: false, codice: "ERRORE", error: "Errore nell'invio dell'invito" }, 500);
  }
});
