// supabase/functions/tagada-admin/index.ts — Lexum IT, 27-10-2026
//
// Strumenti dell'admin per la cassa Tagadapay (al posto di Stripe, che ha chiuso il conto). La chiave
// TAGADA_API_KEY sta solo nei segreti del server: questa funzione la usa e restituisce solo quello che
// serve vedere (negozi, processori, prodotti, webhook), mai la chiave né il segreto delle notifiche.
// Solo per gli admin (is_admin(): ruolo admin con la sessione verificata in due passaggi).
//
// Azioni (corpo JSON { azione }):
//   stato     → prova della chiave e situazione dell'account Tagadapay
//   prodotti  → crea su Tagadapay i prodotti del listino che mancano (SKU = id del prodotto Lexum)
//               e scrive la variante in prodotti.tagada_variant_id
//   webhook   → registra l'indirizzo di tagada-webhook; il segreto va dritto nel Vault

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const API = "https://api.tagada.io/api/public/v1";
const CHIAVE = Deno.env.get("TAGADA_API_KEY") ?? "";
const NEGOZIO = Deno.env.get("TAGADA_STORE_ID") ?? "store_22b27a6974b3";
const URL_WEBHOOK = `${Deno.env.get("SUPABASE_URL")}/functions/v1/tagada-webhook`;
const EVENTI = ["order/paid", "payment/refunded", "order/refunded"];

// Tipi venduti con la cassa. Gratuito e accesso_singolo (sentenze, percorso chiuso) restano fuori.
const TIPI_IN_VENDITA = ["crediti_ai", "piano_privato", "abbonamento", "seat_addon", "spazio_archiviazione", "clienti_addon"];

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

function risposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

async function tagada(metodo: "GET" | "POST", percorso: string, corpo?: unknown) {
  const res = await fetch(`${API}${percorso}`, {
    method: metodo,
    headers: { "Authorization": `Bearer ${CHIAVE}`, "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const testo = await res.text();
  // deno-lint-ignore no-explicit-any
  let dati: any = testo;
  try { dati = JSON.parse(testo); } catch { /* resta testo */ }
  return { status: res.status, dati };
}

// deno-lint-ignore no-explicit-any
type ProdottoTagada = { id: string; name: string; variants?: any[] };

async function prodottiTagada(): Promise<ProdottoTagada[]> {
  const r = await tagada("POST", "/products/list", { storeId: NEGOZIO, page: 1, per_page: 1000, includeVariants: true });
  if (r.status !== 200) throw new Error(`Elenco prodotti Tagadapay: HTTP ${r.status}`);
  return r.dati?.items ?? [];
}

// deno-lint-ignore no-explicit-any
function descrizione(p: any): string {
  const mesi = Number(p.durata_mesi ?? 0) || 0;
  const durata = mesi ? (mesi === 1 ? "1 mese" : `${mesi} mesi`) : "";
  switch (p.tipo) {
    case "crediti_ai": return `${p.crediti_ai_mensili ?? 0} ricerche con Lex AI su Lexum. I crediti non scadono.`;
    case "piano_privato": return `${p.crediti_ai_mensili ?? 0} crediti Lex AI e ${p.spazio_gb ?? 0} GB di archivio · ${durata}`;
    case "abbonamento": return [`${p.posti ?? 1} ${(p.posti ?? 1) === 1 ? "accesso" : "accessi"}`, `${p.crediti_ai_mensili ?? 0} crediti Lex AI al mese`, `${p.spazio_gb ?? 0} GB`, durata].filter(Boolean).join(" · ");
    case "seat_addon": return `+${p.posti ?? 1} ${(p.posti ?? 1) === 1 ? "accesso" : "accessi"} allo studio · ${durata}`;
    case "spazio_archiviazione": return `+${p.spazio_gb ?? 0} GB di archivio · ${durata}`;
    case "clienti_addon": return `+${p.limite_clienti ?? 0} clienti registrabili nello studio`;
    default: return p.nome;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const utente = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: eAdmin } = await utente.rpc("is_admin");
    if (eAdmin !== true) return risposta({ ok: false, error: "Solo per gli amministratori" }, 403);
    if (!CHIAVE) return risposta({ ok: false, error: "TAGADA_API_KEY mancante nei segreti" }, 500);

    const { azione } = await req.json().catch(() => ({}));

    if (azione === "stato") {
      const negozi = await tagada("POST", "/stores/list", { page: 1, pageSize: 50 });
      const processori = await tagada("GET", "/processors");
      const prodotti = (await prodottiTagada()).map((p) => ({
        id: p.id, nome: p.name,
        varianti: (p.variants ?? []).map((v) => ({ id: v.id, sku: v.sku })),
      }));
      const webhook = await tagada("GET", `/webhooks?storeId=${encodeURIComponent(NEGOZIO)}`);
      const { data: collegati } = await admin.from("prodotti").select("id, nome, tagada_variant_id").not("tagada_variant_id", "is", null);
      return risposta({
        ok: true, negozi, processori, prodotti,
        // deno-lint-ignore no-explicit-any
        webhook: Array.isArray(webhook.dati) ? webhook.dati.map((w: any) => ({ id: w.id, url: w.url, eventTypes: w.eventTypes, enabled: w.enabled })) : webhook,
        collegati,
      });
    }

    if (azione === "prodotti") {
      const { data: listino, error } = await admin
        .from("prodotti").select("*").eq("attivo", true).gt("prezzo", 0).in("tipo", TIPI_IN_VENDITA);
      if (error) throw new Error(error.message);
      const esistenti = await prodottiTagada();
      // immagine: la stessa del primo prodotto (il logo Lexum caricato nel negozio)
      const immagine = esistenti.flatMap((p) => p.variants ?? []).find((v) => v.imageUrl)?.imageUrl ?? null;
      const esito = [];
      for (const p of listino ?? []) {
        let variante = esistenti.flatMap((t) => t.variants ?? []).find((v) => v.sku === p.id);
        let creato = false;
        if (!variante) {
          const r = await tagada("POST", "/products/create", {
            storeId: NEGOZIO,
            name: p.nome,
            description: descrizione(p),
            active: true,
            isShippable: false,
            isTaxable: false,
            variants: [{
              name: p.nome,
              active: true,
              default: true,
              sku: p.id,
              imageUrl: immagine,
              grams: 0,
              prices: [{ currencyOptions: { EUR: { amount: Math.round(Number(p.prezzo) * 100) } }, recurring: false, default: true }],
            }],
          });
          if (r.status !== 200) { esito.push({ prodotto: p.nome, errore: `HTTP ${r.status}`, dettaglio: r.dati }); continue; }
          variante = r.dati?.variants?.[0];
          creato = true;
        }
        if (!variante?.id) { esito.push({ prodotto: p.nome, errore: "variante non trovata dopo la creazione" }); continue; }
        await admin.from("prodotti").update({ tagada_variant_id: variante.id }).eq("id", p.id);
        esito.push({ prodotto: p.nome, prezzo: p.prezzo, variante: variante.id, creato });
      }
      return risposta({ ok: true, esito });
    }

    if (azione === "webhook") {
      const elenco = await tagada("GET", `/webhooks?storeId=${encodeURIComponent(NEGOZIO)}`);
      // deno-lint-ignore no-explicit-any
      const gia = Array.isArray(elenco.dati) ? elenco.dati.find((w: any) => w.url === URL_WEBHOOK) : null;
      if (gia) return risposta({ ok: true, gia_registrato: true, id: gia.id, eventTypes: gia.eventTypes });
      const r = await tagada("POST", "/webhooks", {
        storeId: NEGOZIO, url: URL_WEBHOOK, eventTypes: EVENTI, description: "Lexum IT: accredito acquisti",
      });
      if (r.status !== 200 || !r.dati?.secret) {
        return risposta({ ok: false, error: `Registrazione webhook: HTTP ${r.status}`, dettaglio: { ...r.dati, secret: undefined } }, 502);
      }
      const { error } = await admin.rpc("tagada_webhook_segreto_salva", { p_segreto: r.dati.secret });
      if (error) throw new Error(`Segreto non salvato nel Vault: ${error.message}`);
      return risposta({ ok: true, id: r.dati.id, eventTypes: r.dati.eventTypes, segreto_nel_vault: true });
    }

    return risposta({ ok: false, error: "Azione sconosciuta" }, 400);
  } catch (e) {
    return risposta({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
