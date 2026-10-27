// supabase/functions/tagada-checkout/index.ts — Lexum IT, 27-10-2026
//
// Apre la cassa Tagadapay per un prodotto del listino (al posto di stripe-checkout: Stripe ha chiuso
// il conto). Il prezzo lo decide il server con le stesse regole di prima:
//   - upgrade di un piano attivo: nuovo piano meno la parte non usata di quello attuale (a giorni);
//   - add-on con piano attivo (pro-rata, Modello A): oggi spento su IT, come in stripe-checkout.
// Tagadapay vende solo a prezzo di listino (varianti fisse): quando l'importo di oggi è diverso
// (upgrade) la risposta rimanda al bonifico con l'importo giusto (bonifico_url).
//
// Ogni passaggio alla cassa crea una riga in tagada_ordini; il suo id viaggia nell'indirizzo come
// lexum_tx e torna nella notifica order/paid (tagada-webhook), che accredita l'acquisto.
// Corpo: { prodotto_id, is_upgrade?, consenso_recesso?, ritorno? }  →  { ok, url } | { ok, bonifico_url }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const API = "https://api.tagada.io/api/public/v1";
const NEGOZIO = Deno.env.get("TAGADA_STORE_ID") ?? "store_22b27a6974b3";
const APP_URL = (Deno.env.get("APP_URL") ?? "https://www.lexum.it").replace(/\/+$/, "");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

function risposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// UPGRADE A GIORNI (08-10-2026), identico a stripe-checkout e alla pagina Studio del sito.
const MS_GIORNO = 24 * 60 * 60 * 1000;
function creditoUpgrade(prezzoAttuale: number, durataMesiAttuale: number, scadenzaAttuale: string): number {
  const fine = new Date(scadenzaAttuale);
  const inizio = new Date(fine.getTime());
  inizio.setUTCMonth(inizio.getUTCMonth() - Math.trunc(Number(durataMesiAttuale) || 0));
  const giorniPeriodo = Math.round((fine.getTime() - inizio.getTime()) / MS_GIORNO);
  if (!(prezzoAttuale > 0) || !(giorniPeriodo > 0)) return 0;
  const giorni = Math.min(giorniPeriodo, Math.max(0, Math.ceil((fine.getTime() - Date.now()) / MS_GIORNO)));
  return Math.min(prezzoAttuale, Math.round(prezzoAttuale * giorni / giorniPeriodo * 100) / 100);
}

// Solo percorsi del sito come ritorno (niente indirizzi esterni).
function percorsoRitorno(r: unknown): string {
  const s = typeof r === "string" ? r : "";
  return /^\/[A-Za-z0-9/_\-?=&%.]*$/.test(s) && !s.startsWith("//") ? s : "/";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return risposta({ ok: false, error: "Accesso scaduto: entra di nuovo." }, 401);

    const { prodotto_id, is_upgrade, consenso_recesso, ritorno } = await req.json().catch(() => ({}));
    if (!prodotto_id) return risposta({ ok: false, error: "Prodotto mancante." }, 400);

    const { data: prodotto } = await supabase
      .from("prodotti").select("*").eq("id", prodotto_id).eq("attivo", true).maybeSingle();
    if (!prodotto) return risposta({ ok: false, error: "Prodotto non trovato." }, 404);

    const { data: profilo } = await supabase
      .from("profiles")
      .select("email, nome, cognome, telefono, role, piano_id, scadenza:abbonamento_scadenza")
      .eq("id", user.id).single();

    if (prodotto.tipo === "piano_privato" && profilo?.role !== "user") {
      return risposta({ ok: false, error: "Il Piano Personale è riservato agli utenti privati." }, 400);
    }
    // I privati chiedono l'attivazione immediata (Termini, punto 4.6): senza la spunta non si paga.
    if (profilo?.role === "user" && consenso_recesso !== true) {
      return risposta({ ok: false, error: "Per procedere spunta la casella sull'attivazione immediata." }, 400);
    }

    // Prezzo di oggi, con le regole di stripe-checkout
    let importo = Number(prodotto.prezzo);
    const pianoAttivo = !!profilo?.scadenza && new Date(profilo.scadenza) > new Date();
    if (is_upgrade && prodotto.tipo === "abbonamento" && profilo?.piano_id && pianoAttivo) {
      const { data: attuale } = await supabase
        .from("prodotti").select("prezzo, tipo, durata_mesi").eq("id", profilo.piano_id).single();
      if (attuale?.tipo === "abbonamento") {
        if (Number(prodotto.prezzo) <= Number(attuale.prezzo)) {
          return risposta({ ok: false, error: "Con il piano attuale ancora attivo puoi passare solo a un piano più caro." }, 400);
        }
        importo = Math.round((Number(prodotto.prezzo) - creditoUpgrade(Number(attuale.prezzo), Number(attuale.durata_mesi), profilo.scadenza)) * 100) / 100;
      }
    }
    if (!(importo > 0)) return risposta({ ok: false, error: "Importo non valido." }, 400);

    // Importo diverso dal listino o prodotto non ancora su Tagadapay: bonifico
    if (importo !== Number(prodotto.prezzo) || !prodotto.tagada_variant_id) {
      const q = new URLSearchParams({ prodotto: prodotto.id });
      if (importo !== Number(prodotto.prezzo)) q.set("importo", String(importo));
      return risposta({ ok: true, bonifico_url: `/pagamento/bonifico?${q}` });
    }

    const { data: ordine, error: ordErr } = await supabase.from("tagada_ordini").insert({
      user_id: user.id,
      prodotto_id: prodotto.id,
      variant_id: prodotto.tagada_variant_id,
      importo,
      consenso_recesso: consenso_recesso === true,
      consenso_il: consenso_recesso === true ? new Date().toISOString() : null,
    }).select("id").single();
    if (ordErr || !ordine) throw new Error(`Ordine non creato: ${ordErr?.message}`);

    const q = new URLSearchParams({
      storeId: NEGOZIO,
      items: JSON.stringify([{ variantId: prodotto.tagada_variant_id, quantity: 1 }]),
      currency: "EUR",
      locale: "it",
      returnUrl: `${APP_URL}${percorsoRitorno(ritorno)}`,
      lexum_tx: ordine.id,
    });
    if (profilo?.email ?? user.email) q.set("customerEmail", profilo?.email ?? user.email!);
    if (profilo?.nome) q.set("customerFirstName", profilo.nome);
    if (profilo?.cognome) q.set("customerLastName", profilo.cognome);

    // /checkout/init risponde con un rinvio (307) alla pagina di pagamento: lo leggiamo qui, così un
    // negozio chiuso (403) o una cassa non pubblicata si vedono subito invece che nel browser.
    const init = await fetch(`${API}/checkout/init?${q}`, { redirect: "manual" });
    const url = init.headers.get("location");
    if (init.status >= 300 && init.status < 400 && url) {
      return risposta({ ok: true, url });
    }
    const testo = await init.text().catch(() => "");
    await supabase.from("tagada_ordini").update({ stato: "errore", errore: `init HTTP ${init.status}: ${testo.slice(0, 300)}` }).eq("id", ordine.id);
    console.error("tagada-checkout init:", init.status, testo.slice(0, 300));
    return risposta({ ok: false, error: "Il pagamento online non è disponibile in questo momento.", bonifico_url: `/pagamento/bonifico?prodotto=${prodotto.id}` }, 502);
  } catch (e) {
    console.error("tagada-checkout:", e instanceof Error ? e.message : e);
    return risposta({ ok: false, error: "Il pagamento online non è disponibile in questo momento." }, 500);
  }
});
