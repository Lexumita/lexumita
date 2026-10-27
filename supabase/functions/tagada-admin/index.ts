// supabase/functions/tagada-admin/index.ts — Lexum IT, 27-10-2026
//
// Strumenti dell'admin per la cassa Tagadapay (al posto di Stripe, che ha chiuso il conto). La chiave
// TAGADA_API_KEY sta solo nei segreti del server: questa funzione la usa e restituisce solo quello che
// serve vedere (negozi, processori, prodotti, webhook), mai la chiave né il segreto delle notifiche.
// Solo per gli admin (is_admin(): ruolo admin con la sessione verificata in due passaggi).
//
// Azioni (corpo JSON { azione }):
//   stato     → prova della chiave e situazione dell'account Tagadapay
//   (gli articoli del catalogo li crea tagada-checkout al momento del pagamento, dal listino Lexum)
//   webhook   → registra l'indirizzo di tagada-webhook; il segreto va dritto nel Vault

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const API = "https://api.tagada.io/api/public/v1";
const CHIAVE = Deno.env.get("TAGADA_API_KEY") ?? "";
const NEGOZIO = Deno.env.get("TAGADA_STORE_ID") ?? "store_22b27a6974b3";
const URL_WEBHOOK = `${Deno.env.get("SUPABASE_URL")}/functions/v1/tagada-webhook`;
const EVENTI = ["order/paid", "payment/refunded", "order/refunded"];

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
      const { data: articoli } = await admin.from("tagada_varianti").select("chiave, variant_id, importo, creato_il").order("creato_il", { ascending: false }).limit(50);
      return risposta({
        ok: true, negozi, processori, prodotti,
        // deno-lint-ignore no-explicit-any
        webhook: Array.isArray(webhook.dati) ? webhook.dati.map((w: any) => ({ id: w.id, url: w.url, eventTypes: w.eventTypes, enabled: w.enabled })) : webhook,
        articoli,
      });
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
