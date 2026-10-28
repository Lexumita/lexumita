// supabase/functions/apple-acquisto/index.ts — Lexum IT, 28-10-2026
//
// Crediti comprati DENTRO l'app per iPhone, con l'acquisto di Apple. Apple chiede che i privati possano
// comprare con il suo sistema (regole 3.1.1 e 3.1.3(c)): l'app paga con StoreKit e manda qui la ricevuta
// della transazione, che Apple FIRMA (un JWS con la catena di certificati nell'intestazione, campo x5c).
//
// NIENTE SI ACCREDITA SENZA LA FIRMA DI APPLE (verifica ripresa da apple-acquisto di Vexilla):
//  1. la catena x5c finisce nella radice «Apple Root CA - G3» e porta i contrassegni di Apple;
//  2. la ricevuta è firmata (ES256) dalla chiave della foglia;
//  3. è di QUESTA app (bundleId), è un consumabile del listino qui sotto, non è stata revocata;
//  4. è di QUESTO utente: l'app compra con appAccountToken = id dell'utente in questo paese, e qui lo si
//     confronta con l'id del token di chi chiama.
// Poi accredita_acquisto_store (ruolo di servizio): l'indice unico (fornitore, transazione) impedisce il
// doppio accredito. Gli acquisti di prova (Sandbox) accreditano i crediti ma non contano negli incassi.
//
// Corpo: { jws }. Risposta: { ok: true, crediti, concludi: true } | { ok: false, errore, codice }.
// `concludi` dice all'app che può chiudere la transazione con Apple (finishTransaction).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as x509 from "npm:@peculiar/x509@1.14.3";

x509.cryptoProvider.set(crypto);

const BUNDLE = Deno.env.get("APPLE_BUNDLE_ID") ?? "ch.lexum.app";

// Il listino dell'App Store (prezzi decisi da Antonino il 28-10-2026, impostati su App Store Connect):
// prodotto → crediti. Il nome va nelle transazioni dell'admin.
const PRODOTTI: Record<string, { crediti: number; nome: string }> = {
  "ch.lexum.app.crediti.5": { crediti: 5, nome: "Pacchetto Lampo · 5 crediti Lex AI (App Store)" },
  "ch.lexum.app.crediti.30": { crediti: 30, nome: "30 crediti Lex AI (App Store)" },
  "ch.lexum.app.crediti.50": { crediti: 50, nome: "50 crediti Lex AI (App Store)" },
  "ch.lexum.app.crediti.250": { crediti: 250, nome: "250 crediti Lex AI (App Store)" },
  "ch.lexum.app.crediti.500": { crediti: 500, nome: "500 crediti Lex AI (App Store)" },
  "ch.lexum.app.crediti.1000": { crediti: 1000, nome: "1000 crediti Lex AI (App Store)" },
  "ch.lexum.app.crediti.5000": { crediti: 5000, nome: "5000 crediti Lex AI (App Store)" },
};

const intestazioni = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function risposta(corpo: unknown, stato = 200) {
  return new Response(JSON.stringify(corpo), { status: stato, headers: intestazioni });
}

/** Apple Root CA - G3 (DER in base64), da https://www.apple.com/certificateauthority/AppleRootCA-G3.cer */
const RADICE_APPLE_G3 =
  "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==";
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

/** L'id dell'utente dal SUO token: lo dice GoTrue, non il corpo della richiesta. */
async function chiEChiama(token: string): Promise<string | null> {
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
    headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")!, Authorization: token },
  });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return typeof u?.id === "string" ? u.id : null;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: intestazioni });
  if (req.method !== "POST") return risposta({ ok: false, errore: "Metodo non ammesso." }, 405);

  const token = req.headers.get("Authorization") ?? "";
  if (!token.startsWith("Bearer ")) return risposta({ ok: false, codice: "accesso", errore: "Accesso scaduto." }, 401);

  let jws = "";
  try { jws = String(((await req.json()) ?? {}).jws ?? ""); }
  catch { return risposta({ ok: false, codice: "richiesta", errore: "Richiesta illeggibile." }, 400); }
  if (!jws) return risposta({ ok: false, codice: "richiesta", errore: "Manca la ricevuta." }, 400);

  const utente = await chiEChiama(token);
  if (!utente) return risposta({ ok: false, codice: "accesso", errore: "Accesso scaduto." }, 401);

  let t: Record<string, unknown>;
  try { t = await verificaApple(jws); }
  catch (e) {
    console.error("[apple-acquisto] ricevuta rifiutata:", (e as Error).message);
    return risposta({ ok: false, codice: "ricevuta", errore: "La ricevuta di Apple non è valida." }, 400);
  }

  if (t.bundleId !== BUNDLE) return risposta({ ok: false, codice: "ricevuta", errore: "Ricevuta di un'altra app." }, 400);
  const prodotto = PRODOTTI[String(t.productId ?? "")];
  if (!prodotto || t.type !== "Consumable") {
    return risposta({ ok: false, codice: "prodotto", errore: "Questo acquisto non è un prodotto del listino." }, 400);
  }
  if (t.revocationDate) return risposta({ ok: false, codice: "revocato", errore: "Apple ha annullato questo acquisto.", concludi: true }, 400);
  if (String(t.appAccountToken ?? "").toLowerCase() !== utente.toLowerCase()) {
    // ricevuta di un altro utente (o dell'altro paese): non si chiude, la prende chi ne ha diritto
    console.error("[apple-acquisto] ricevuta di un altro utente", t.transactionId);
    return risposta({ ok: false, codice: "utente", errore: "Questa ricevuta non è di questo account." }, 403);
  }

  try {
    const esito = await rpc("accredita_acquisto_store", {
      p_user: utente,
      p_fornitore: "apple",
      p_transazione: String(t.transactionId ?? ""),
      p_prodotto_store: String(t.productId),
      p_crediti: prodotto.crediti,
      p_nome: prodotto.nome,
      p_ambiente: String(t.environment ?? ""),
      // Apple dà il prezzo in millesimi (4590 = 4,59)
      p_prezzo: typeof t.price === "number" ? Math.round(t.price / 10) / 100 : null,
      p_valuta: typeof t.currency === "string" ? t.currency : null,
      p_paese: typeof t.storefront === "string" ? t.storefront : null,
    });
    if (!esito || esito.esito !== "ok") {
      console.error("[apple-acquisto] accredito rifiutato:", esito?.motivo, t.transactionId);
      return risposta({ ok: false, codice: "accredito", errore: esito?.motivo ?? "Accredito rifiutato." }, 400);
    }
    console.log(`[apple-acquisto] ${prodotto.crediti} crediti a ${utente} (${t.environment}, ${t.transactionId})`);
    return risposta({ ok: true, crediti: prodotto.crediti, gia_accreditato: !!esito.gia_accreditato, concludi: true });
  } catch (e) {
    console.error("[apple-acquisto]", (e as Error).message);
    return risposta({ ok: false, codice: "server", errore: "Il server non ha potuto accreditare: riprova più tardi." }, 500);
  }
});
