// supabase/functions/invia-push/index.ts — Lexum IT e CH (stesso codice), 06-10-2026
//
// Spedisce gli avvisi sul telefono che il database ha messo in push_coda: «la risposta di Lex è
// pronta» e le notifiche della campanella. La sveglia il database a ogni riga nuova (trigger su
// push_coda con pg_net); prende le righe con push_prendi(), che le segna, così due chiamate insieme
// non le mandano due volte; le manda con il servizio push di Expo ai telefoni dell'utente che hanno
// quel genere di avviso acceso. Un telefono che Expo non riconosce più (DeviceNotRegistered) si spegne.
// Chiunque può chiamarla (verify_jwt = false): manda solo quello che è già in coda.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const EXPO = "https://exp.host/--/api/v2/push/send";
// Facoltativo: serve solo se su Expo è accesa la «sicurezza avanzata» delle notifiche push
const EXPO_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN") ?? "";

type Lingua = "it" | "de" | "fr";
const TESTI_LEX: Record<Lingua, { titolo: string; testo: string }> = {
  it: { titolo: "La risposta di Lex è pronta", testo: "Tocca per leggerla." },
  de: { titolo: "Die Antwort von Lex ist bereit", testo: "Tippen Sie, um sie zu lesen." },
  fr: { titolo: "La réponse de Lex est prête", testo: "Touchez pour la lire." },
};

interface Riga {
  id: string;
  user_id: string;
  genere: "lex" | "studio";
  titolo: string;
  testo: string;
  dati: Record<string, unknown>;
}
interface Telefono { token: string; lingua: string }
interface Esito { status?: string; details?: { error?: string } }

function risposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}

// A gruppi di 100 (il massimo di Expo); un esito per messaggio, nello stesso ordine.
async function manda(messaggi: unknown[]): Promise<Esito[]> {
  const esiti: Esito[] = [];
  for (let i = 0; i < messaggi.length; i += 100) {
    const gruppo = messaggi.slice(i, i + 100);
    try {
      const res = await fetch(EXPO, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          ...(EXPO_TOKEN ? { "Authorization": `Bearer ${EXPO_TOKEN}` } : {}),
        },
        body: JSON.stringify(gruppo),
      });
      const j = await res.json().catch(() => null);
      const dati: Esito[] = Array.isArray(j?.data) ? j.data : [];
      for (let k = 0; k < gruppo.length; k++) {
        esiti.push(dati[k] ?? { status: "error", details: { error: `HTTP ${res.status}` } });
      }
    } catch (e) {
      for (let k = 0; k < gruppo.length; k++) {
        esiti.push({ status: "error", details: { error: e instanceof Error ? e.message : String(e) } });
      }
    }
  }
  return esiti;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  const { data: righe, error } = await supabase.rpc("push_prendi", { p_quanti: 100 });
  if (error) {
    console.error("invia-push, push_prendi:", error.message);
    return risposta({ ok: false }, 500);
  }

  let mandati = 0;
  for (const r of (righe ?? []) as Riga[]) {
    const { data: telefoni } = await supabase
      .from("dispositivi_push")
      .select("token, lingua")
      .eq("user_id", r.user_id)
      .eq("attivo", true)
      .eq(r.genere === "lex" ? "risposte_lex" : "studio", true);
    const lista = (telefoni ?? []) as Telefono[];
    if (!lista.length) {
      await supabase.from("push_coda").update({ esito: "nessun telefono" }).eq("id", r.id);
      continue;
    }

    const messaggi = lista.map((t) => {
      const lingua = (["it", "de", "fr"].includes(t.lingua) ? t.lingua : "it") as Lingua;
      const testo = r.genere === "lex" ? TESTI_LEX[lingua] : { titolo: r.titolo, testo: r.testo };
      return {
        to:        t.token,
        title:     testo.titolo,
        body:      testo.testo || undefined,
        data:      { ...r.dati, genere: r.genere },
        sound:     "default",
        priority:  "high",
        channelId: "default",
      };
    });

    const esiti = await manda(messaggi);
    const ok = esiti.filter((e) => e.status === "ok").length;
    const spenti = lista
      .filter((_, k) => esiti[k]?.details?.error === "DeviceNotRegistered")
      .map((t) => t.token);
    if (spenti.length) {
      await supabase
        .from("dispositivi_push")
        .update({ attivo: false, updated_at: new Date().toISOString() })
        .in("token", spenti);
    }
    const errori = [...new Set(esiti.filter((e) => e.status !== "ok").map((e) => e.details?.error ?? "errore"))];
    await supabase
      .from("push_coda")
      .update({ esito: `${ok}/${lista.length}${errori.length ? ` · ${errori.join(", ")}` : ""}` })
      .eq("id", r.id);
    mandati += ok;
  }

  return risposta({ ok: true, righe: righe?.length ?? 0, mandati });
});
