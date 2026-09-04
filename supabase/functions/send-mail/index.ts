// supabase/functions/send-mail/index.ts
//
// Wrapper generico per invio email tramite Postmark Templates.
// Logga ogni invio in mail_log per il tracking nel pannello admin.
//
// ─── SICUREZZA (04-09-2026) ────────────────────────────────────────────────
// Fino alla versione precedente questa funzione NON controllava nulla: era
// deployata con verify_jwt: false e il commento diceva "Auth opzionale",
// usando l'header Authorization solo per riempire un campo del log.
// L'indirizzo della funzione sta nel bundle JavaScript del sito, quindi e'
// pubblico: chiunque poteva spedire da noreply@lexum.it, a qualunque
// destinatario, con qualunque template. Una mail di phishing partita da qui
// avrebbe avuto SPF e DKIM validi del dominio vero.
//
// Ora sono ammessi due soli chiamanti:
//   1. le funzioni interne, che passano SUPABASE_SERVICE_ROLE_KEY
//      (stripe-webhook fa esattamente cosi': non si rompe nulla)
//   2. un admin autenticato dal pannello
//
// Il CORS resta '*' DI PROPOSITO: non e' mai stato lui la falla. Il CORS
// impedisce a un browser di LEGGERE la risposta, non a un programma di fare
// la chiamata. Stringerlo avrebbe rotto il pannello senza chiudere niente.
//
// Input:
//   {
//     to: "user@example.com" | ["a@x.it", "b@y.it"],
//     templateAlias: "verifica-email",
//     templateModel: { nome: "Mario", ... },
//     from?: "noreply@lexum.it",   // solo per chiamate server-to-server
//     replyTo?: "info@lexum.it",
//     tipo?: "verifica_email",
//     origine?: "stripe-webhook",
//     toUserId?: "uuid"
//   }
//
// Versione: 2.0.0

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const POSTMARK_API_KEY = Deno.env.get("POSTMARK_API_KEY")!;
const DEFAULT_FROM = Deno.env.get("POSTMARK_DEFAULT_FROM") ?? "noreply@lexum.it";
const INTERNAL_BCC = Deno.env.get("POSTMARK_INTERNAL_BCC") ?? "";

// ─── HELPERS ────────────────────────────────────────────────

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Confronto a tempo costante: un confronto normale perde informazione sul
// numero di caratteri iniziali indovinati.
function ugualiCostante(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Cio' che non deve finire in chiaro in mail_log. Il collegamento del
// questionario contiene un token che vale come una credenziale: se resta in
// chiaro qui, conservarne solo l'impronta nella tabella accanto non serve.
const CHIAVI_DA_REDIGERE = /token|link_questionario|password|secret|codice_accesso/i;

function redigi(modello: Record<string, any>): Record<string, any> {
  const fuori: Record<string, any> = {};
  for (const [k, v] of Object.entries(modello ?? {})) {
    if (CHIAVI_DA_REDIGERE.test(k)) fuori[k] = "[redatto]";
    else if (v && typeof v === "object" && !Array.isArray(v)) fuori[k] = redigi(v);
    else fuori[k] = v;
  }
  return fuori;
}

async function inviaPostmark(payload: {
  From: string;
  To: string;
  Bcc?: string;
  ReplyTo?: string;
  TemplateAlias?: string;
  TemplateId?: number;
  TemplateModel: Record<string, any>;
  MessageStream?: string;
}): Promise<{ MessageID: string; SubmittedAt: string; To: string; ErrorCode: number; Message: string }> {
  const res = await fetch("https://api.postmarkapp.com/email/withTemplate", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": POSTMARK_API_KEY,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || data.ErrorCode !== 0) {
    throw new Error(
      `Postmark ${res.status}: ${data.Message ?? JSON.stringify(data).slice(0, 200)}`
    );
  }
  return data;
}

async function risolviUserId(email: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  return data?.id ?? null;
}

// ─── HANDLER ────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // ─── AUTORIZZAZIONE ───────────────────────────────────────────────────
    // Prima di leggere il corpo: non si spreca lavoro su una chiamata che va
    // comunque respinta, e non si logga niente di chi bussa senza chiave.
    const authHeader = req.headers.get("Authorization") ?? "";
    const chiave = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!chiave) {
      return jsonResponse({ ok: false, error: "Non autorizzato" }, 401);
    }

    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    let chiamanteId: string | null = null;
    const daServizio = ugualiCostante(chiave, SERVICE_KEY);

    if (!daServizio) {
      const { data: { user }, error: authErr } = await supabase.auth.getUser(chiave);
      if (authErr || !user) {
        return jsonResponse({ ok: false, error: "Non autorizzato" }, 401);
      }
      const { data: profilo } = await supabase
        .from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profilo?.role !== "admin") {
        return jsonResponse({ ok: false, error: "Riservato agli amministratori" }, 403);
      }
      chiamanteId = user.id;
    }

    const body = await req.json();
    const {
      to,
      templateAlias,
      templateId,
      templateModel = {},
      replyTo,
      tipo = null,
      origine = "send-mail",
      toUserId = null,
      bccInterno = false,
    } = body;

    // Il mittente lo sceglie solo chi chiama server-to-server: altrimenti un
    // admin potrebbe spedire "da" un indirizzo qualunque del dominio.
    const from = daServizio ? (body.from ?? DEFAULT_FROM) : DEFAULT_FROM;

    // Validazione minima
    if (!to) {
      return jsonResponse({ ok: false, error: "Campo 'to' obbligatorio" }, 400);
    }
    if (!templateAlias && !templateId) {
      return jsonResponse(
        { ok: false, error: "Specifica 'templateAlias' o 'templateId'" },
        400
      );
    }

    const destinatari: string[] = Array.isArray(to) ? to : [to];
    const modelloPerLog = redigi(templateModel);

    const risultati = await Promise.all(
      destinatari.map(async (emailDest) => {
        const emailNorm = String(emailDest).toLowerCase().trim();
        const userId = toUserId ?? (await risolviUserId(emailNorm));

        const { data: log, error: logErr } = await supabase
          .from("mail_log")
          .insert({
            to_email: emailNorm,
            to_user_id: userId,
            from_email: from,
            reply_to: replyTo ?? null,
            template_alias: templateAlias ?? null,
            template_model: modelloPerLog,
            tipo,
            origine,
            stato: "queued",
            metadati: {
              chiamante_id: chiamanteId,
              da_servizio: daServizio,
              template_id: templateId ?? null,
            },
          })
          .select("id")
          .single();

        if (logErr) {
          console.error("Errore creazione log:", logErr.message);
        }

        const logId = log?.id;

        try {
          const postmarkPayload: any = {
            From: from,
            To: emailNorm,
            TemplateModel: templateModel,
            MessageStream: "outbound",
          };
          if (templateAlias) postmarkPayload.TemplateAlias = templateAlias;
          if (templateId) postmarkPayload.TemplateId = templateId;
          if (replyTo) postmarkPayload.ReplyTo = replyTo;
          if (bccInterno && INTERNAL_BCC) {
            postmarkPayload.Bcc = INTERNAL_BCC;
          }

          const result = await inviaPostmark(postmarkPayload);

          if (logId) {
            await supabase
              .from("mail_log")
              .update({
                postmark_message_id: result.MessageID,
                stato: "sent",
                sent_at: new Date().toISOString(),
              })
              .eq("id", logId);
          }

          return { ok: true, to: emailNorm, messageId: result.MessageID, logId };
        } catch (err: any) {
          if (logId) {
            await supabase
              .from("mail_log")
              .update({
                stato: "failed",
                error_message: err.message?.slice(0, 500),
              })
              .eq("id", logId);
          }
          return { ok: false, to: emailNorm, error: err.message, logId };
        }
      })
    );

    const successi = risultati.filter((r) => r.ok).length;
    const fallimenti = risultati.length - successi;

    return jsonResponse({
      ok: fallimenti === 0,
      inviati: successi,
      falliti: fallimenti,
      risultati,
    });
  } catch (err: any) {
    console.error("send-mail error:", err.message);
    return jsonResponse({ ok: false, error: err.message }, 500);
  }
});
