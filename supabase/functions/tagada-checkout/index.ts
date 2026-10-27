// supabase/functions/tagada-checkout/index.ts — Lexum IT, 27-10-2026
//
// Apre la cassa Tagadapay per un prodotto del listino (al posto di stripe-checkout: Stripe ha chiuso
// il conto). Il prezzo lo decide il server con le stesse regole di prima:
//   - upgrade di un piano attivo: nuovo piano meno la parte non usata di quello attuale (a giorni);
//   - add-on con piano attivo (pro-rata, Modello A): oggi spento su IT, come in stripe-checkout.
// Nome, descrizione e prezzo li decide il listino di Lexum (admin → Prodotti). Tagadapay incassa solo
// articoli del suo catalogo: l'articolo giusto lo crea questa funzione al momento, se non c'è già
// (tagada_varianti, chiave = prodotto + importo + nome + descrizione). Così un prezzo cambiato
// nell'admin vale subito, e un upgrade ha il suo articolo con l'importo esatto di oggi.
//
// Ogni passaggio alla cassa crea una riga in tagada_ordini; il suo id viaggia nell'indirizzo come
// lexum_tx e torna nella notifica order/paid (tagada-webhook), che accredita l'acquisto.
// Corpo: { prodotto_id, is_upgrade?, consenso_recesso?, ritorno? }  →  { ok, url } | { ok, bonifico_url }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const API = "https://api.tagada.io/api/public/v1";
const NEGOZIO = Deno.env.get("TAGADA_STORE_ID") ?? "store_22b27a6974b3";
// Percorso di cassa pubblicato nel negozio («Simple Checkout»): senza, Tagadapay manda a store-unavailable.
const PERCORSO = Deno.env.get("TAGADA_FUNNEL_ID") ?? "funnelv2_5b88c7de4255";
const PAGINA_CASSA = Deno.env.get("TAGADA_CHECKOUT_URL") ?? "https://simple-checkout--store_22b27a6974b3.cdn.tagada.io/checkout";
const APP_URL = (Deno.env.get("APP_URL") ?? "https://www.lexum.it").replace(/\/+$/, "");
const CHIAVE = Deno.env.get("TAGADA_API_KEY") ?? "";
// Logo Lexum già caricato nel negozio Tagadapay (immagine degli articoli)
const IMMAGINE = Deno.env.get("TAGADA_IMAGE_URL")
  ?? "https://th9llsxpg16laoh4.public.blob.vercel-storage.com/orgs/acc_fd2f3cace1a8/images/06fb4d52-96ce-4aa1-9b10-ec83ee83db36";

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

// deno-lint-ignore no-explicit-any
function descrizione(p: any): string {
  const mesi = Number(p.durata_mesi ?? 0) || 0;
  const durata = mesi ? (mesi === 1 ? "1 mese" : `${mesi} mesi`) : "";
  const posti = p.posti ?? 1;
  switch (p.tipo) {
    case "crediti_ai": return `${p.crediti_ai_mensili ?? 0} ricerche con Lex AI su Lexum. I crediti non scadono.`;
    case "piano_privato": return `${p.crediti_ai_mensili ?? 0} crediti Lex AI e ${p.spazio_gb ?? 0} GB di archivio · ${durata}`;
    case "abbonamento": return [`${posti} ${posti === 1 ? "accesso" : "accessi"}`, `${p.crediti_ai_mensili ?? 0} crediti Lex AI al mese`, `${p.spazio_gb ?? 0} GB`, durata].filter(Boolean).join(" · ");
    case "seat_addon": return `+${posti} ${posti === 1 ? "accesso" : "accessi"} allo studio · ${durata}`;
    case "spazio_archiviazione": return `+${p.spazio_gb ?? 0} GB di archivio · ${durata}`;
    case "clienti_addon": return `+${p.limite_clienti ?? 0} clienti registrabili nello studio`;
    default: return p.nome;
  }
}

async function impronta(testo: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(testo)));
  return Array.from(h.slice(0, 8)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// La variante Tagadapay per questo prodotto a questo importo: dalla tabella, oppure creata adesso.
// deno-lint-ignore no-explicit-any
async function variante(prodotto: any, importo: number, upgrade: boolean): Promise<string> {
  const nome = upgrade ? `Upgrade a ${prodotto.nome}` : prodotto.nome;
  const testo = upgrade
    ? `${descrizione(prodotto)}. Prezzo del nuovo piano meno la parte non usata di quello attuale.`
    : descrizione(prodotto);
  const centesimi = Math.round(importo * 100);
  const chiave = `${prodotto.id}:${centesimi}:${await impronta(`${nome}\n${testo}`)}`;

  const { data: nota } = await supabase.from("tagada_varianti").select("variant_id").eq("chiave", chiave).maybeSingle();
  if (nota?.variant_id) return nota.variant_id;

  const res = await fetch(`${API}/products/create`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${CHIAVE}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      storeId: NEGOZIO,
      name: nome,
      description: testo,
      active: true,
      isShippable: false,
      isTaxable: false,
      variants: [{
        name: nome, active: true, default: true, sku: chiave, imageUrl: IMMAGINE, grams: 0,
        prices: [{ currencyOptions: { EUR: { amount: centesimi } }, recurring: false, default: true }],
      }],
    }),
  });
  const corpo = await res.json().catch(() => null);
  const id = corpo?.variants?.[0]?.id;
  if (!res.ok || !id) throw new Error(`Articolo Tagadapay non creato: HTTP ${res.status} ${JSON.stringify(corpo).slice(0, 300)}`);

  // Due pagamenti insieme possono crearlo due volte: vale il primo registrato.
  await supabase.from("tagada_varianti").insert({ chiave, variant_id: id, prodotto_id: prodotto.id, importo }).select().maybeSingle();
  const { data: registrata } = await supabase.from("tagada_varianti").select("variant_id").eq("chiave", chiave).single();
  return registrata?.variant_id ?? id;
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

    const upgrade = importo !== Number(prodotto.prezzo);
    const variantId = await variante(prodotto, importo, upgrade);

    const { data: ordine, error: ordErr } = await supabase.from("tagada_ordini").insert({
      user_id: user.id,
      prodotto_id: prodotto.id,
      variant_id: variantId,
      importo,
      consenso_recesso: consenso_recesso === true,
      consenso_il: consenso_recesso === true ? new Date().toISOString() : null,
    }).select("id").single();
    if (ordErr || !ordine) throw new Error(`Ordine non creato: ${ordErr?.message}`);

    const q = new URLSearchParams({
      storeId: NEGOZIO,
      funnelId: PERCORSO,
      checkoutUrl: PAGINA_CASSA,
      items: JSON.stringify([{ variantId, quantity: 1 }]),
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
    if (init.status >= 300 && init.status < 400 && url && !url.includes("store-unavailable")) {
      return risposta({ ok: true, url });
    }
    const testo = await init.text().catch(() => "");
    await supabase.from("tagada_ordini").update({ stato: "errore", errore: `init HTTP ${init.status}: ${testo.slice(0, 300)}` }).eq("id", ordine.id);
    console.error("tagada-checkout init:", init.status, testo.slice(0, 300));
    const qb = new URLSearchParams({ prodotto: prodotto.id });
    if (upgrade) qb.set("importo", String(importo));
    return risposta({ ok: false, error: "Il pagamento online non è disponibile in questo momento.", bonifico_url: `/pagamento/bonifico?${qb}` }, 502);
  } catch (e) {
    console.error("tagada-checkout:", e instanceof Error ? e.message : e);
    return risposta({ ok: false, error: "Il pagamento online non è disponibile in questo momento." }, 500);
  }
});
