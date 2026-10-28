// supabase/functions/abbonamento-gestisci/index.ts — Lexum IT, 28-10-2026
//
// «Gestisci» degli abbonamenti dei privati (piani e archivio in più) presi sul sito con Tagadapay.
// Corpo: { azione, abbonamento_id, prodotto_id? }
//   disdici  → non si rinnova più: resta tutto fino alla fine del mese pagato. Per l'archivio in più vale la
//              regola di Antonino (28-10-2026): prima si liberano i file, poi si toglie lo spazio.
//   riattiva → annulla la disdetta, e un eventuale passaggio a un piano più piccolo già programmato
//   cambia   → a un piano più piccolo: parte alla fine del mese pagato, solo se i file ci stanno (stessa
//              regola). Tagadapay non cambia il prezzo di un abbonamento: il vecchio si disdice a fine mese e
//              il nuovo si crea adesso con la stessa carta, con il primo addebito a quella data.
//              Per un piano più grande la risposta è { checkout: true }: si paga dalla cassa (tagada-checkout),
//              che chiude quello in corso.
// Gli abbonamenti presi su iPhone si gestiscono dalle impostazioni di Apple: qui si dice solo questo.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const API = "https://api.tagada.io/api/public/v1";
const CHIAVE = Deno.env.get("TAGADA_API_KEY") ?? "";
const NEGOZIO = Deno.env.get("TAGADA_STORE_ID") ?? "store_22b27a6974b3";
const VALUTA = "EUR";
const IMMAGINE = Deno.env.get("TAGADA_IMAGE_URL")
  ?? "https://th9llsxpg16laoh4.public.blob.vercel-storage.com/orgs/acc_fd2f3cace1a8/images/06fb4d52-96ce-4aa1-9b10-ec83ee83db36";
const GB = 1024 * 1024 * 1024;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

function risposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// «850 MB», «1,2 GB»
function misura(byte: number): string {
  if (byte < GB) return `${Math.round(byte / (1024 * 1024))} MB`;
  return `${(Math.round((byte / GB) * 10) / 10).toLocaleString("it-IT")} GB`;
}

const dataIt = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });

async function tagada(metodo: "GET" | "POST", percorso: string, corpo?: unknown) {
  const r = await fetch(`${API}${percorso}`, {
    method: metodo,
    headers: { "Authorization": `Bearer ${CHIAVE}`, "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const testo = await r.text();
  // deno-lint-ignore no-explicit-any
  let dati: any = testo;
  try { dati = JSON.parse(testo); } catch { /* resta testo */ }
  return { ok: r.ok, status: r.status, dati };
}

// Il prezzo mensile di Tagadapay per un piano, al prezzo di listino: quello già creato dalla cassa, oppure
// uno nuovo (stesso formato di tagada-checkout).
// deno-lint-ignore no-explicit-any
async function prezzoMensile(prodotto: any): Promise<string> {
  const { data: noti } = await supabase.from("tagada_varianti").select("price_id")
    .eq("prodotto_id", prodotto.id).eq("importo", prodotto.prezzo).not("price_id", "is", null).limit(1);
  if (noti?.[0]?.price_id) return noti[0].price_id;
  const centesimi = Math.round(Number(prodotto.prezzo) * 100);
  const testo = `${prodotto.crediti_ai_mensili ?? 0} crediti Lex AI e ${prodotto.spazio_gb ?? 0} GB di archivio · 1 mese. Si rinnova ogni mese finché non lo disdici.`;
  const chiave = `${prodotto.id}:${centesimi}:gestisci-mensile`;
  const r = await tagada("POST", "/products/create", {
    storeId: NEGOZIO, name: prodotto.nome, description: testo, active: true, isShippable: false, isTaxable: false,
    variants: [{
      name: prodotto.nome, active: true, default: true, sku: chiave, imageUrl: IMMAGINE, grams: 0,
      prices: [{ currencyOptions: { [VALUTA]: { amount: centesimi } }, recurring: true, interval: "month", intervalCount: 1, default: true }],
    }],
  });
  const variantId = r.dati?.variants?.[0]?.id;
  const priceId = r.dati?.variants?.[0]?.prices?.[0]?.id;
  if (!r.ok || !priceId) throw new Error(`Prezzo mensile non creato: HTTP ${r.status} ${JSON.stringify(r.dati).slice(0, 200)}`);
  await supabase.from("tagada_varianti").insert({ chiave, variant_id: variantId, prodotto_id: prodotto.id, importo: prodotto.prezzo, price_id: priceId });
  return priceId;
}

// Un passaggio a un piano più piccolo già programmato (abbonamento creato, non ancora addebitato).
async function chiudiProgrammati(userId: string, genere: string) {
  const { data: programmati } = await supabase.from("abbonamenti").select("id, riferimento")
    .eq("user_id", userId).eq("genere", genere).eq("fornitore", "tagada")
    .is("periodo_fine", null).neq("stato", "chiuso").is("ordine_id", null);
  for (const p of programmati ?? []) {
    if (p.riferimento) await tagada("POST", "/subscriptions/cancel", { subscriptionIds: [p.riferimento], cancelAtPeriodEnd: false });
    await supabase.rpc("abbonamento_chiudi", { p_abbonamento: p.id, p_subito: false });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return risposta({ ok: false, error: "Accesso scaduto: entra di nuovo." }, 401);

    const { azione, abbonamento_id, prodotto_id } = await req.json().catch(() => ({}));
    const { data: ab } = await supabase.from("abbonamenti").select("*, prodotti:prodotto_id(*)")
      .eq("id", abbonamento_id ?? "").eq("user_id", user.id).maybeSingle();
    if (!ab) return risposta({ ok: false, error: "Abbonamento non trovato." }, 404);
    if (ab.fornitore === "apple") {
      return risposta({ ok: false, apple: true, error: "Questo abbonamento è stato preso su iPhone: si gestisce dalle impostazioni dell'iPhone, alla voce Abbonamenti." }, 400);
    }
    if (ab.stato === "chiuso") return risposta({ ok: false, error: "Questo abbonamento è già chiuso." }, 400);
    if (!ab.riferimento || !CHIAVE) {
      return risposta({ ok: false, error: "L'abbonamento non è ancora pronto da gestire: riprova tra qualche minuto." }, 409);
    }

    const { data: righe } = await supabase.rpc("archivio_spazio_calcolo", { p_titolare: user.id });
    const spazio = (Array.isArray(righe) ? righe[0] : righe) ?? {};
    const usati = Number(spazio.usati_bytes ?? 0);

    if (azione === "disdici") {
      if (ab.genere === "archivio") {
        const senza = Number(spazio.quota_bytes ?? 0) - Number(ab.prodotti?.spazio_gb ?? 0) * GB;
        if (usati > senza) {
          return risposta({ ok: false, spazio: true, error: `Prima libera spazio: usi ${misura(usati)}, senza questo archivio in più avresti ${misura(senza)}. Cancella dei file e riprova.` }, 400);
        }
      }
      const r = await tagada("POST", "/subscriptions/cancel", { subscriptionIds: [ab.riferimento], cancelAtPeriodEnd: true });
      if (!r.ok) throw new Error(`Disdetta Tagadapay: HTTP ${r.status} ${JSON.stringify(r.dati).slice(0, 200)}`);
      if (ab.genere === "piano") await chiudiProgrammati(user.id, "piano");
      await supabase.from("abbonamenti").update({ stato: "disdetto", prodotto_successivo_id: null, aggiornato_il: new Date().toISOString() }).eq("id", ab.id);
      return risposta({ ok: true, fino_al: ab.periodo_fine, messaggio: ab.periodo_fine ? `Disdetto: resta attivo fino al ${dataIt(ab.periodo_fine)}.` : "Disdetto." });
    }

    if (azione === "riattiva") {
      if (ab.stato !== "disdetto") return risposta({ ok: true, messaggio: "L'abbonamento è già attivo." });
      const r = await tagada("POST", "/subscriptions/resume", { subscriptionIds: [ab.riferimento] });
      if (!r.ok) {
        return risposta({ ok: false, error: "Non si può più riattivare: alla scadenza scegli di nuovo il piano da Acquista." }, 409);
      }
      if (ab.genere === "piano") await chiudiProgrammati(user.id, "piano");
      await supabase.from("abbonamenti").update({ stato: "attivo", prodotto_successivo_id: null, aggiornato_il: new Date().toISOString() }).eq("id", ab.id);
      return risposta({ ok: true, messaggio: "Riattivato: si rinnova di nuovo ogni mese." });
    }

    if (azione === "cambia") {
      if (ab.genere !== "piano") return risposta({ ok: false, error: "Si cambia solo il piano." }, 400);
      const { data: nuovo } = await supabase.from("prodotti").select("*")
        .eq("id", prodotto_id ?? "").eq("tipo", "piano_privato").eq("attivo", true).maybeSingle();
      if (!nuovo || !nuovo.rinnovo_automatico) return risposta({ ok: false, error: "Piano non disponibile." }, 404);
      if (nuovo.id === ab.prodotto_id) return risposta({ ok: false, error: "È già il tuo piano." }, 400);
      if (Number(nuovo.prezzo) > Number(ab.prodotti?.prezzo ?? 0)) return risposta({ ok: true, checkout: true });

      const quota = Number(spazio.gratuiti_bytes ?? 0) + Number(nuovo.spazio_gb ?? 0) * GB + Number(spazio.extra_bytes ?? 0);
      if (usati > quota) {
        return risposta({ ok: false, spazio: true, error: `Per passare a ${nuovo.nome} libera prima spazio: usi ${misura(usati)}, con questo piano avresti ${misura(quota)}. Cancella dei file e riprova.` }, 400);
      }
      if (!ab.periodo_fine) return risposta({ ok: false, error: "L'abbonamento non è ancora pronto da gestire: riprova tra qualche minuto." }, 409);

      // la carta dell'abbonamento in corso
      const sub = await tagada("GET", `/subscriptions/${encodeURIComponent(ab.riferimento)}`);
      const s = sub.dati?.subscription ?? sub.dati ?? {};
      const clienteId = s.customer?.id ?? s.customerId;
      if (!sub.ok || !clienteId) throw new Error(`Abbonamento Tagadapay ${ab.riferimento}: HTTP ${sub.status} ${JSON.stringify(sub.dati).slice(0, 200)}`);
      const strumenti = await tagada("GET", `/customers/${encodeURIComponent(clienteId)}/payment-instruments`);
      // deno-lint-ignore no-explicit-any
      const elenco: any[] = strumenti.dati?.instruments ?? [];
      const carta = s.defaultPaymentInstrumentId ?? elenco.find((x) => x.isDefault && x.isActive)?.id ?? elenco.find((x) => x.isActive)?.id;
      if (!carta) throw new Error(`Nessuna carta salvata per ${clienteId}`);

      await chiudiProgrammati(user.id, "piano");
      const crea = await tagada("POST", "/subscriptions/create", {
        customerId: clienteId, priceId: await prezzoMensile(nuovo), storeId: NEGOZIO, currency: VALUTA,
        defaultPaymentInstrumentId: carta, billingCycleAnchor: new Date(ab.periodo_fine).getTime(),
        metadata: { lexum_user: user.id, lexum_prodotto: nuovo.id },
      });
      const nuovoId = crea.dati?.subscription?.id ?? crea.dati?.id;
      if (!crea.ok || !nuovoId) throw new Error(`Nuovo abbonamento Tagadapay: HTTP ${crea.status} ${JSON.stringify(crea.dati).slice(0, 200)}`);
      const disdetta = await tagada("POST", "/subscriptions/cancel", { subscriptionIds: [ab.riferimento], cancelAtPeriodEnd: true });
      if (!disdetta.ok) {
        await tagada("POST", "/subscriptions/cancel", { subscriptionIds: [nuovoId], cancelAtPeriodEnd: false });
        throw new Error(`Disdetta Tagadapay: HTTP ${disdetta.status}`);
      }
      await supabase.from("abbonamenti").insert({
        user_id: user.id, fornitore: "tagada", riferimento: nuovoId, prodotto_id: nuovo.id, genere: "piano", stato: "attivo",
      });
      await supabase.from("abbonamenti").update({ stato: "disdetto", prodotto_successivo_id: nuovo.id, aggiornato_il: new Date().toISOString() }).eq("id", ab.id);
      return risposta({ ok: true, dal: ab.periodo_fine, messaggio: `Dal ${dataIt(ab.periodo_fine)} passi a ${nuovo.nome}: fino ad allora resta il piano di adesso.` });
    }

    return risposta({ ok: false, error: "Azione sconosciuta." }, 400);
  } catch (e) {
    console.error("abbonamento-gestisci:", e instanceof Error ? e.message : e);
    return risposta({ ok: false, error: "Non è stato possibile completare l'operazione: riprova o scrivici dall'assistenza." }, 500);
  }
});
