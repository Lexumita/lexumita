// supabase/functions/apple-notifiche/index.ts — Lexum IT, 28-10-2026
//
// Notifiche di Apple (App Store Server Notifications V2) per gli acquisti fatti nell'app per iPhone
// (apple-acquisto). Su un rimborso (REFUND) o una revoca (REVOKE) i crediti non ancora usati di
// quell'acquisto si tolgono e la transazione passa a «rimborsato» (rimborsa_acquisto_store).
//
// Abbonamenti (29-10-2026: piani personali e archivio in più, mensili con rinnovo automatico):
// - un mese pagato (SUBSCRIBED, DID_RENEW, passaggio a un piano più grande, OFFER_REDEEMED) →
//   abbonamento_apple_pagamento, anche se l'app non ha mandato la ricevuta (l'utente è l'appAccountToken);
// - lo stato del rinnovo, da ogni avviso (signedRenewalInfo): rinnovo acceso → attivo, spento → disdetto,
//   Apple riprova a farsi pagare → in_ritardo; il piano con cui si rinnoverà, se più piccolo;
// - EXPIRED / GRACE_PERIOD_EXPIRED → chiuso (resta quello che era pagato, già finito);
// - REFUND / REVOKE → se è il mese in corso, via i crediti del piano non usati e lo spazio.
//
// Apple accetta UN indirizzo per app, ma l'app serve Italia e Svizzera: l'indirizzo impostato su App Store
// Connect è quello di Lexum IT; se l'acquisto lì non c'è, la notifica passa così com'è a Lexum CH
// (che la riverifica da sé: è firmata da Apple, non serve altro segreto).
//
// Niente si tocca senza la firma di Apple: la notifica e la transazione che contiene sono due JWS,
// verificati entrambi fino alla radice «Apple Root CA - G3» (come apple-acquisto).
// verify_jwt spento: chiama Apple, senza token di Supabase.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as x509 from "npm:@peculiar/x509@1.14.3";

x509.cryptoProvider.set(crypto);

const BUNDLE = Deno.env.get("APPLE_BUNDLE_ID") ?? "ch.lexum.app";
// Dove passa le notifiche che non sono di questo paese (vuoto su CH: lì la catena finisce).
const INOLTRO = "https://wotkrgsxjiijakeulxjl.supabase.co/functions/v1/apple-notifiche";

/** Apple Root CA - G3 (DER in base64), da https://www.apple.com/certificateauthority/AppleRootCA-G3.cer */
const RADICE_APPLE_G3 =
  "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==";

// Gli abbonamenti dell'App Store: prodotto → codice del listino (come in apple-acquisto).
const ABBONAMENTI: Record<string, string> = {
  "ch.lexum.app.piano.personale": "piano_personale",
  "ch.lexum.app.piano.plus": "piano_personale_plus",
  "ch.lexum.app.piano.pro": "piano_personale_pro",
  "ch.lexum.app.archivio.10": "archivio_mese_10",
  "ch.lexum.app.archivio.25": "archivio_mese_25",
  "ch.lexum.app.archivio.50": "archivio_mese_50",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OID_INTERMEDIO_APPLE = "1.2.840.113635.100.6.2.1";
const OID_FOGLIA_APPLE = "1.2.840.113635.100.6.11.1";

function daBase64Url(s: string): Uint8Array {
  const b = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}

/**
 * Verifica un JWS firmato da Apple (ricevuta di StoreKit o notifica del server) e ne restituisce il
 * contenuto, oppure lancia un errore che dice perché no. Come apple-acquisto di Vexilla: la catena x5c
 * deve finire nella radice «Apple Root CA - G3» (confrontata byte per byte), intermedio e foglia devono
 * portare i contrassegni di Apple ed essere firmati in catena, e la firma ES256 dev'essere della foglia.
 */
async function verificaApple(jws: string): Promise<Record<string, unknown>> {
  const parti = jws.split(".");
  if (parti.length !== 3) throw new Error("ricevuta non in formato JWS");
  const testa = JSON.parse(new TextDecoder().decode(daBase64Url(parti[0])));
  if (testa.alg !== "ES256") throw new Error("algoritmo di firma inatteso: " + testa.alg);
  const x5c: string[] = Array.isArray(testa.x5c) ? testa.x5c : [];
  if (x5c.length !== 3) throw new Error("catena di certificati incompleta");
  if (x5c[2] !== RADICE_APPLE_G3) throw new Error("la catena non finisce nella radice di Apple");

  const radice = new x509.X509Certificate(x5c[2]);
  const intermedio = new x509.X509Certificate(x5c[1]);
  const foglia = new x509.X509Certificate(x5c[0]);
  if (!intermedio.getExtension(OID_INTERMEDIO_APPLE)) throw new Error("intermedio senza il contrassegno di Apple");
  if (!foglia.getExtension(OID_FOGLIA_APPLE)) throw new Error("foglia senza il contrassegno di Apple");
  if (!(await intermedio.verify({ publicKey: radice.publicKey, signatureOnly: true }))) {
    throw new Error("intermedio non firmato dalla radice di Apple");
  }
  if (!(await foglia.verify({ publicKey: intermedio.publicKey, signatureOnly: true }))) {
    throw new Error("foglia non firmata dall'intermedio");
  }

  const chiave = await foglia.publicKey.export({ name: "ECDSA", namedCurve: "P-256" }, ["verify"]);
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    chiave,
    daBase64Url(parti[2]) as BufferSource,
    new TextEncoder().encode(parti[0] + "." + parti[1]),
  );
  if (!ok) throw new Error("firma della ricevuta non valida");

  const dati = JSON.parse(new TextDecoder().decode(daBase64Url(parti[1])));
  // I certificati devono essere validi quando Apple ha firmato (signedDate), come consiglia Apple.
  const firmataIl = new Date(Number(dati.signedDate ?? Date.now()));
  for (const c of [radice, intermedio, foglia]) {
    if (firmataIl < c.notBefore || firmataIl > c.notAfter) throw new Error("certificato fuori validità");
  }
  return dati;
}

async function rpc(funzione: string, corpo: Record<string, unknown>) {
  const servizio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/${funzione}`, {
    method: "POST",
    headers: { apikey: servizio, Authorization: `Bearer ${servizio}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const testo = await r.text();
  if (!r.ok) throw new Error(`${funzione}: il database ha risposto ${r.status} ${testo}`);
  return testo ? JSON.parse(testo) : null;
}

/** L'avviso non è di questo paese: passa così com'è all'altro (che lo riverifica da sé). */
async function inoltra(req: Request, testo: string, motivo: string): Promise<Response | null> {
  if (!INOLTRO || req.headers.get("x-lexum-inoltro")) return null;
  const r = await fetch(INOLTRO, { method: "POST", headers: { "Content-Type": "application/json", "x-lexum-inoltro": "1" }, body: testo });
  console.log(`[apple-notifiche] ${motivo}: non è qui, passata all'altro paese (${r.status})`);
  // se l'altro paese non risponde, Apple ritenta
  return new Response(r.ok ? "OK" : "Riprova", { status: r.ok ? 200 : 500 });
}

/** Un avviso su un abbonamento (piano personale o archivio in più). */
async function avvisoAbbonamento(
  req: Request, testo: string, tipo: string, sotto: string,
  t: Record<string, unknown>, rinnovo: Record<string, unknown> | null, codice: string,
): Promise<Response> {
  const originale = String(t.originalTransactionId ?? "");
  const etichetta = `${tipo}${sotto ? "/" + sotto : ""} ${originale}`;
  let esito: Record<string, unknown> | null = null;

  if (tipo === "REFUND" || tipo === "REVOKE") {
    esito = await rpc("abbonamento_apple_stato", { p_originale: originale, p_chiudi: "subito", p_transazione: String(t.transactionId ?? "") });
  } else if (tipo === "EXPIRED" || tipo === "GRACE_PERIOD_EXPIRED") {
    esito = await rpc("abbonamento_apple_stato", { p_originale: originale, p_chiudi: "fine" });
  } else {
    // un mese pagato: primo acquisto, rinnovo, passaggio a un piano più grande, codice offerta
    const pagato = ["SUBSCRIBED", "DID_RENEW", "OFFER_REDEEMED"].includes(tipo) ||
      (tipo === "DID_CHANGE_RENEWAL_PREF" && sotto === "UPGRADE");
    if (pagato && !t.revocationDate && t.isUpgraded !== true) {
      const token = String(t.appAccountToken ?? "");
      esito = await rpc("abbonamento_apple_pagamento", {
        p_user: UUID.test(token) ? token : null,
        p_originale: originale,
        p_transazione: String(t.transactionId ?? ""),
        p_codice: codice,
        p_fine: t.expiresDate ? new Date(Number(t.expiresDate)).toISOString() : null,
        p_ambiente: String(t.environment ?? ""),
        p_prezzo: typeof t.price === "number" ? Math.round(t.price / 10) / 100 : null,
        p_valuta: typeof t.currency === "string" ? t.currency : null,
        p_paese: typeof t.storefront === "string" ? t.storefront : null,
      });
    }
    // lo stato del rinnovo come lo dice Apple adesso, e il piano con cui si rinnoverà
    if (rinnovo && esito?.esito !== "sconosciuto") {
      const stato = rinnovo.autoRenewStatus === 1 ? (rinnovo.isInBillingRetryPeriod === true ? "in_ritardo" : "attivo") : "disdetto";
      const prossimo = String(rinnovo.autoRenewProductId ?? "");
      const e2 = await rpc("abbonamento_apple_stato", {
        p_originale: originale,
        p_stato: stato,
        p_successivo: prossimo && prossimo !== t.productId ? ABBONAMENTI[prossimo] ?? null : null,
      });
      esito = esito ? { ...esito, rinnovo: stato } : e2;
    }
  }

  if (esito?.esito === "sconosciuto") {
    const passata = await inoltra(req, testo, etichetta);
    if (passata) return passata;
  }
  console.log(`[apple-notifiche] ${etichetta}: ${JSON.stringify(esito)}`);
  return new Response("OK", { status: 200 });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Metodo non ammesso", { status: 405 });
  const testo = await req.text();
  let firmata = "";
  try { firmata = String(JSON.parse(testo)?.signedPayload ?? ""); } catch { /* corpo illeggibile */ }
  if (!firmata) return new Response("Manca signedPayload", { status: 400 });

  let notifica: Record<string, unknown>;
  let transazione: Record<string, unknown> | null = null;
  let rinnovo: Record<string, unknown> | null = null;
  try {
    notifica = await verificaApple(firmata);
    const dati = (notifica.data ?? {}) as Record<string, unknown>;
    if (dati.bundleId && dati.bundleId !== BUNDLE) return new Response("Altra app", { status: 200 });
    if (typeof dati.signedTransactionInfo === "string") transazione = await verificaApple(dati.signedTransactionInfo);
    if (typeof dati.signedRenewalInfo === "string") rinnovo = await verificaApple(dati.signedRenewalInfo);
  } catch (e) {
    console.error("[apple-notifiche] notifica rifiutata:", (e as Error).message);
    return new Response("Firma non valida", { status: 400 });
  }

  const tipo = String(notifica.notificationType ?? "");
  const codice = ABBONAMENTI[String(transazione?.productId ?? "")];
  if (transazione && codice) {
    try {
      return await avvisoAbbonamento(req, testo, tipo, String(notifica.subtype ?? ""), transazione, rinnovo, codice);
    } catch (e) {
      console.error("[apple-notifiche]", (e as Error).message);
      return new Response("Riprova", { status: 500 });
    }
  }
  if (tipo !== "REFUND" && tipo !== "REVOKE") {
    console.log(`[apple-notifiche] ${tipo || "?"}: niente da fare`);
    return new Response("OK", { status: 200 });
  }
  const id = String(transazione?.transactionId ?? "");
  if (!id) return new Response("OK", { status: 200 });

  try {
    const esito = await rpc("rimborsa_acquisto_store", { p_fornitore: "apple", p_transazione: id });
    if (esito?.esito === "sconosciuto") {
      const passata = await inoltra(req, testo, `${tipo} ${id}`);
      if (passata) return passata;
    }
    console.log(`[apple-notifiche] ${tipo} ${id}: ${JSON.stringify(esito)}`);
    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("[apple-notifiche]", (e as Error).message);
    return new Response("Riprova", { status: 500 });
  }
});
