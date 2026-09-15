// supabase/functions/postmark-webhook/index.ts
//
// Riceve gli eventi webhook di Postmark e aggiorna mail_log.
// Eventi supportati: Delivery, Bounce, SpamComplaint, Open, SubscriptionChange.
// Collegato a DUE stream del server "Lexum": outbound (transazionale) e
// broadcast (promozionale). Su Postmark i webhook si configurano per stream.
//
// Per le mail di Supabase Auth (verifica email, reset password) che NON passano
// per il wrapper send-mail, questo webhook crea il record mail_log da zero.
// Solo per lo stream outbound: le promozionali partono tutte da send-mail e
// hanno gia' la loro riga.
//
// Sicurezza: protetto da Basic Auth. Configura su Postmark le credenziali
// che corrispondono ai secret POSTMARK_WEBHOOK_USER e POSTMARK_WEBHOOK_PASSWORD.
//
// Versione: 1.1.0
//   - metadati UNITI invece che sovrascritti (SpamComplaint e SubscriptionChange
//     cancellavano message_stream, template e tutto il resto)
//   - lo stato non torna indietro: una Delivery arrivata dopo l'apertura non
//     riporta "opened" a "delivered", e niente cancella bounced/spam
//   - disiscrizione dal link = stato "unsubscribed"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const WEBHOOK_USER = Deno.env.get("POSTMARK_WEBHOOK_USER") ?? "";
const WEBHOOK_PASSWORD = Deno.env.get("POSTMARK_WEBHOOK_PASSWORD") ?? "";

// Stati che nessun evento successivo deve cancellare
const STATI_FINALI = ["bounced", "spam", "unsubscribed"];

// ─── HELPERS ────────────────────────────────────────────────

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function verificaBasicAuth(req: Request): boolean {
  if (!WEBHOOK_USER || !WEBHOOK_PASSWORD) return false;
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Basic ")) return false;
  try {
    const decoded = atob(auth.slice(6));
    const sep = decoded.indexOf(":");
    if (sep < 0) return false;
    const user = decoded.slice(0, sep);
    const pass = decoded.slice(sep + 1);
    return user === WEBHOOK_USER && pass === WEBHOOK_PASSWORD;
  } catch {
    return false;
  }
}

// Mappa subject → tipo logico per le mail di Supabase Auth
// Postmark non sa che la mail viene da Supabase Auth, quindi inferiamo dal subject.
function inferisciTipoDaSubject(subject: string): string {
  const s = (subject ?? "").toLowerCase();
  if (s.includes("conferma") || s.includes("confirm") || s.includes("verifica")) {
    return "verifica_email";
  }
  if (s.includes("reset") || s.includes("password")) {
    return "password_reset";
  }
  if (s.includes("invito") || s.includes("invite")) {
    return "invito";
  }
  if (s.includes("magic") || s.includes("link")) {
    return "magic_link";
  }
  return "supabase_auth";
}

async function risolviUserId(email: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  return data?.id ?? null;
}

function unisciMetadati(esistente: any, aggiunta: Record<string, unknown>) {
  return { ...(esistente?.metadati ?? {}), ...aggiunta };
}

// ─── HANDLER ────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Solo POST" }, 405);
  }

  // Auth Basic
  if (!verificaBasicAuth(req)) {
    return jsonResponse({ ok: false, error: "Non autorizzato" }, 401);
  }

  try {
    const evento = await req.json();
    const tipoEvento = evento.RecordType;
    const stream = evento.MessageStream ?? "outbound";

    // Postmark MessageID univoco identifica la mail
    const messageId = evento.MessageID;
    if (!messageId) {
      console.warn("Webhook senza MessageID:", JSON.stringify(evento).slice(0, 200));
      return jsonResponse({ ok: true, skipped: true });
    }

    // "Send test" di Postmark: MessageID tutto zeri, destinatario john@example.com.
    // Risponde 200 (cosi' la prova dice se la password e' giusta) ma non tocca
    // mail_log: il 15-09 una prova su Delivery/Bounce aveva creato una riga finta.
    if (messageId === "00000000-0000-0000-0000-000000000000") {
      return jsonResponse({ ok: true, test: true });
    }

    // Cerca il record esistente in mail_log
    const { data: esistente } = await supabase
      .from("mail_log")
      .select("id, to_user_id, tipo, stato, opened_at, metadati")
      .eq("postmark_message_id", messageId)
      .maybeSingle();

    // Righe create da zero solo per le mail di Supabase Auth (stream outbound)
    const puoCreare = !esistente && stream === "outbound";
    const statoFinale = STATI_FINALI.includes(esistente?.stato);

    const oraIso = new Date().toISOString();

    // ─── Routing per tipo evento ───────────────────────────────
    switch (tipoEvento) {
      case "Delivery": {
        if (esistente) {
          const aggiorna: Record<string, unknown> = {
            delivered_at: evento.DeliveredAt ?? oraIso,
          };
          // "opened" o uno stato finale valgono piu' di "delivered"
          if (!statoFinale && esistente.stato !== "opened") aggiorna.stato = "delivered";
          await supabase.from("mail_log").update(aggiorna).eq("id", esistente.id);
        } else if (puoCreare) {
          // Mail di Supabase Auth: creiamo il record da zero
          const toEmail = evento.Recipient ?? evento.Email ?? "";
          const userId = await risolviUserId(toEmail);
          await supabase.from("mail_log").insert({
            postmark_message_id: messageId,
            to_email: toEmail,
            to_user_id: userId,
            from_email: evento.From ?? "info@lexum.it",
            subject: evento.Subject ?? null,
            tipo: inferisciTipoDaSubject(evento.Subject ?? ""),
            origine: "supabase-auth",
            stato: "delivered",
            sent_at: evento.SubmittedAt ?? oraIso,
            delivered_at: evento.DeliveredAt ?? oraIso,
            metadati: {
              ricreato_da_webhook: true,
              tag: evento.Tag,
              server_id: evento.ServerID,
              message_stream: stream,
            },
          });
        } else {
          console.warn("Delivery su mail non registrata:", stream, messageId);
        }
        break;
      }

      case "Bounce": {
        const tipoBounce = evento.Type ?? null;
        const messaggio =
          evento.Description ?? evento.Details ?? "Bounce non specificato";
        if (esistente) {
          const aggiorna: Record<string, unknown> = {
            bounce_type: tipoBounce,
            error_message: messaggio.slice(0, 500),
            bounced_at: evento.BouncedAt ?? oraIso,
          };
          // una segnalazione spam resta la notizia piu' grave
          if (esistente.stato !== "spam") aggiorna.stato = "bounced";
          await supabase.from("mail_log").update(aggiorna).eq("id", esistente.id);
        } else if (puoCreare) {
          // Bounce su una mail che non abbiamo nel log: la registriamo comunque
          const toEmail = evento.Email ?? "";
          const userId = await risolviUserId(toEmail);
          await supabase.from("mail_log").insert({
            postmark_message_id: messageId,
            to_email: toEmail,
            to_user_id: userId,
            from_email: evento.From ?? "info@lexum.it",
            subject: evento.Subject ?? null,
            tipo: inferisciTipoDaSubject(evento.Subject ?? ""),
            origine: "supabase-auth",
            stato: "bounced",
            bounce_type: tipoBounce,
            error_message: messaggio.slice(0, 500),
            bounced_at: evento.BouncedAt ?? oraIso,
            metadati: { ricreato_da_webhook: true, message_stream: stream },
          });
        } else {
          console.warn("Bounce su mail non registrata:", stream, messageId);
        }
        break;
      }

      case "SpamComplaint": {
        if (esistente) {
          await supabase
            .from("mail_log")
            .update({
              stato: "spam",
              error_message: "Segnalata come spam dal destinatario",
              metadati: unisciMetadati(esistente, {
                spam_complaint_at: evento.BouncedAt ?? oraIso,
              }),
            })
            .eq("id", esistente.id);
        }
        break;
      }

      case "Open": {
        // Solo la prima apertura; non tocca bounced/spam/unsubscribed
        if (esistente && !esistente.opened_at) {
          const aggiorna: Record<string, unknown> = {
            opened_at: evento.ReceivedAt ?? oraIso,
          };
          if (!statoFinale) aggiorna.stato = "opened";
          await supabase.from("mail_log").update(aggiorna).eq("id", esistente.id);
        }
        break;
      }

      case "SubscriptionChange": {
        if (esistente) {
          const aggiorna: Record<string, unknown> = {
            metadati: unisciMetadati(esistente, {
              subscription_change: {
                suppressed: evento.SuppressSending,
                reason: evento.SuppressionReason,
                origin: evento.Origin,
                changed_at: evento.ChangedAt ?? oraIso,
              },
            }),
          };
          // Clic sul link di disiscrizione. HardBounce e SpamComplaint hanno
          // gia' il loro evento e il loro stato.
          if (evento.SuppressSending === true && evento.SuppressionReason === "ManualSuppression"
              && !["bounced", "spam"].includes(esistente.stato)) {
            aggiorna.stato = "unsubscribed";
          }
          await supabase.from("mail_log").update(aggiorna).eq("id", esistente.id);
        }
        break;
      }

      default:
        console.log("Tipo evento non gestito:", tipoEvento);
    }

    return jsonResponse({ ok: true });
  } catch (err: any) {
    console.error("postmark-webhook error:", err.message);
    // Importante: torniamo 200 anche su errore interno, altrimenti Postmark
    // ritenta indefinitamente. Logghiamo e basta.
    return jsonResponse({ ok: false, error: err.message }, 200);
  }
});
