// supabase/functions/tagada-webhook/index.ts — Lexum IT, 27-10-2026
//
// Notifiche di Tagadapay (al posto di stripe-webhook: Stripe ha chiuso il conto).
//   order/paid                       → accredita l'acquisto, come faceva stripe-webhook per ogni tipo:
//                                      crediti_ai, piano_privato, abbonamento, seat_addon,
//                                      clienti_addon, spazio_archiviazione; ricevuta via send-mail
//   payment/refunded, order/refunded → segna ordine e transazione come rimborsati (i crediti
//                                      eventualmente da togliere li valuta l'admin)
//
// Firma: X-TagadaPay-Signature = "sha256=" + HMAC-SHA256 esadecimale del corpo esatto, con il segreto
// che tagada-admin ha salvato nel Vault. Ogni evento si elabora una volta sola (tagada_eventi, chiave
// = id dell'evento); se l'accredito fallisce l'evento si toglie dal registro e Tagadapay ritenta.
// Il legame con l'utente è l'ordine aperto da tagada-checkout: il suo id (lexum_tx) viaggia
// nell'indirizzo della cassa e torna nell'ordine; si cerca in tutto il corpo, ovunque Tagadapay lo metta.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const APP_URL = Deno.env.get("APP_URL");

const ALIAS_CON_BCC_INTERNO = new Set([
  "abbonamento-attivato", "piano-personale-attivato", "crediti-ai-attivati",
  "spazio-di-archiviazione-attivato", "seat-addon-attivato", "clienti-addon-attivato",
]);

async function inviaEmail(to: string, templateAlias: string, templateModel: Record<string, unknown>, toUserId?: string) {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-mail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        to, templateAlias, templateModel,
        tipo: templateAlias.replace(/-/g, "_"),
        origine: "tagada-webhook",
        toUserId,
        bccInterno: ALIAS_CON_BCC_INTERNO.has(templateAlias),
      }),
    });
  } catch (e) {
    console.error("send-mail error:", e);
  }
}

// Come in stripe-webhook: la località arriva già composta (Mustachio, vedi i modelli Postmark).
// deno-lint-ignore no-explicit-any
function profiloRicevuta(p: any) {
  const capComune = [p?.cap, p?.comune].filter(Boolean).join(" ");
  return {
    nome: p?.nome, cognome: p?.cognome, email: p?.email, cf: p?.cf, indirizzo: p?.indirizzo,
    localita: (capComune && p?.provincia ? `${capComune} (${p.provincia})` : capComune) || null,
    ragione_sociale: p?.ragione_sociale, partita_iva: p?.partita_iva, sede_legale: p?.sede_legale,
  };
}

async function firmaValida(corpo: string, intestazione: string | null): Promise<boolean> {
  if (!intestazione) return false;
  const { data: segreto } = await supabase.rpc("tagada_webhook_segreto");
  if (!segreto) { console.error("Segreto Tagadapay assente nel Vault"); return false; }
  const chiave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const firma = new Uint8Array(await crypto.subtle.sign("HMAC", chiave, new TextEncoder().encode(corpo)));
  const attesa = Array.from(firma).map((b) => b.toString(16).padStart(2, "0")).join("");
  const ricevuta = intestazione.replace(/^sha256=/, "").trim().toLowerCase();
  if (ricevuta.length !== attesa.length) return false;
  let diff = 0;
  for (let i = 0; i < attesa.length; i++) diff |= attesa.charCodeAt(i) ^ ricevuta.charCodeAt(i);
  return diff === 0;
}

// Cerca una chiave in tutto il corpo (oggetti e array annidati, anche dentro stringhe di query).
// deno-lint-ignore no-explicit-any
function cerca(nodo: any, chiave: string, profondita = 0): string | null {
  if (nodo == null || profondita > 12) return null;
  if (typeof nodo === "string") {
    const m = nodo.match(new RegExp(`[?&]${chiave}=([0-9a-f-]{36})`, "i"));
    return m ? m[1] : null;
  }
  if (Array.isArray(nodo)) {
    for (const x of nodo) { const r = cerca(x, chiave, profondita + 1); if (r) return r; }
    return null;
  }
  if (typeof nodo === "object") {
    if (typeof nodo[chiave] === "string") return nodo[chiave];
    // attributi come [{ name, value }]
    if (nodo.name === chiave && typeof nodo.value === "string") return nodo.value;
    for (const v of Object.values(nodo)) { const r = cerca(v, chiave, profondita + 1); if (r) return r; }
  }
  return null;
}

// deno-lint-ignore no-explicit-any
function metodoPagamento(corpo: any): string {
  const ultime = cerca(corpo, "last4") ?? cerca(corpo, "lastFour");
  const marca = cerca(corpo, "brand") ?? cerca(corpo, "cardBrand");
  return ultime ? `${(marca ?? "Carta").toUpperCase()} **** ${ultime}` : "Carta";
}

const oggi = () => new Date().toLocaleDateString("it-IT");

Deno.serve(async (req) => {
  const corpoGrezzo = await req.text();
  if (!(await firmaValida(corpoGrezzo, req.headers.get("x-tagadapay-signature")))) {
    return new Response("Firma non valida", { status: 401 });
  }
  // deno-lint-ignore no-explicit-any
  let evento: any;
  try { evento = JSON.parse(corpoGrezzo); } catch { return new Response("JSON non valido", { status: 400 }); }

  const eventId = String(evento?.id ?? "");
  const tipo = String(evento?.type ?? "");
  if (!eventId) return new Response("Evento senza id", { status: 400 });

  const { error: idemErr } = await supabase.from("tagada_eventi").insert({ event_id: eventId, tipo, payload: evento });
  if (idemErr?.code === "23505") return new Response("OK (già elaborato)", { status: 200 });

  const dati = evento?.data ?? {};
  const orderId = String(dati?.orderId ?? dati?.order?.id ?? "");

  try {
    // ─── Rimborsi ───
    if (tipo === "payment/refunded" || tipo === "order/refunded") {
      if (orderId) {
        await supabase.from("tagada_ordini").update({ stato: "rimborsato" }).eq("order_id", orderId);
        await supabase.from("transazioni").update({ stato: "rimborsato" }).eq("metadati->>order_id", orderId);
      }
      console.log(`Rimborso Tagadapay registrato: ordine ${orderId}`);
      return new Response("OK", { status: 200 });
    }
    if (tipo !== "order/paid") return new Response("OK (evento ignorato)", { status: 200 });

    // Acquisti di prova (draft) di Tagadapay: niente accredito.
    if (dati?.draft === true) {
      console.log(`Ordine di prova Tagadapay ${orderId}: non accreditato`);
      return new Response("OK (prova)", { status: 200 });
    }

    // Senza il riferimento all'ordine Lexum non si può accreditare da soli: l'evento resta nel registro
    // (tagada_eventi, con tutto il corpo) per l'accredito a mano, e Tagadapay non deve ritentare.
    const lexumTx = cerca(evento, "lexum_tx");
    const { data: ordine } = lexumTx
      ? await supabase.from("tagada_ordini").select("*").eq("id", lexumTx).maybeSingle()
      : { data: null };
    if (!lexumTx || !ordine) {
      console.error(`order/paid ${orderId}: ordine Lexum non trovato (lexum_tx ${lexumTx ?? "assente"}), da accreditare a mano`);
      return new Response("OK (ordine Lexum non trovato)", { status: 200 });
    }
    if (ordine.stato === "pagato") return new Response("OK (già accreditato)", { status: 200 });

    const userId: string = ordine.user_id;
    const prodottoId: string = ordine.prodotto_id;
    const { data: prodotto } = await supabase.from("prodotti").select("*").eq("id", prodottoId).single();
    if (!prodotto) throw new Error(`Prodotto ${prodottoId} non trovato`);
    const prodottoTipo: string = prodotto.tipo;

    const centesimi = Number(dati?.order?.paidAmount ?? dati?.order?.totalAdjustedAmount ?? dati?.order?.totalAmount ?? NaN);
    const importoPagato = Number.isFinite(centesimi) ? centesimi / 100 : Number(ordine.importo);
    const pagamento = {
      data: oggi(),
      metodo: metodoPagamento(evento),
      importo: importoPagato.toFixed(2).replace(".", ","),
      valuta: "EUR",
    };
    // Conferma del recesso nella ricevuta (Termini 4.6): oggetto, per l'ambito di Mustachio.
    const recesso = ordine.consenso_recesso
      ? { data: new Date(ordine.consenso_il ?? Date.now()).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) }
      : null;
    const metadatiTx = {
      fornitore: "tagada",
      order_id: orderId || null,
      payment_id: dati?.paymentId ?? null,
      lexum_tx: lexumTx,
      consenso_recesso: ordine.consenso_recesso,
      consenso_il: ordine.consenso_il,
    };

    const { data: profilo } = await supabase
      .from("profiles")
      .select(`id, email, nome, cognome, studio_id, role, titolare_id, tipo_account,
               cf, indirizzo, cap, comune, provincia,
               ragione_sociale, partita_iva, sede_legale, tipo_soggetto, tipo_richiesta`)
      .eq("id", userId).single();

    let scadenza: string | null = null;
    if (prodotto.durata_mesi) {
      const s = new Date();
      s.setMonth(s.getMonth() + Number(prodotto.durata_mesi));
      scadenza = s.toISOString();
    }

    // ═══ SEAT ADD-ON ═══
    if (prodottoTipo === "seat_addon") {
      if (!profilo?.studio_id) throw new Error("Seat add-on senza studio attivo");
      const { data: studio } = await supabase.from("studios").select("posti_totali").eq("id", profilo.studio_id).single();
      const nuoviPosti = (studio?.posti_totali ?? 1) + (prodotto.posti ?? 1);
      await supabase.from("studios").update({ posti_totali: nuoviPosti }).eq("id", profilo.studio_id);
      if (nuoviPosti > 1 && profilo.tipo_account === "singolo") {
        await supabase.from("profiles").update({ tipo_account: "titolare" }).eq("id", userId);
      }
      await supabase.from("audit_log").insert({
        studio_id: profilo.studio_id, user_id: userId, user_nome: `${profilo.nome} ${profilo.cognome}`,
        azione: "Seat add-on acquistato", entita_tipo: "prodotti", entita_id: prodottoId,
        dettaglio: `+${prodotto.posti ?? 1} posto/i — totale: ${nuoviPosti}`,
      });
      await inviaEmail(profilo.email, "seat-addon-attivato", {
        profilo: profiloRicevuta(profilo), prodotto: { nome: prodotto.nome, posti: prodotto.posti ?? 1 },
        nuoviPosti, pagamento, recesso, app_url: APP_URL,
      });
    }

    // ═══ CLIENTI ADD-ON ═══
    else if (prodottoTipo === "clienti_addon") {
      const clientiExtra = prodotto.limite_clienti ?? 0;
      if (clientiExtra <= 0) throw new Error("Clienti add-on senza limite configurato");
      const propId = profilo?.titolare_id ?? userId;
      const { data: prop } = await supabase.from("profiles")
        .select("id, email, nome, cognome, studio_id, cf, indirizzo, cap, comune, provincia, ragione_sociale, partita_iva, sede_legale, limite_clienti_extra")
        .eq("id", propId).single();
      if (!prop) throw new Error("Proprietario clienti_addon non trovato");
      const nuovoTotaleExtra = (prop.limite_clienti_extra ?? 0) + clientiExtra;
      await supabase.from("profiles").update({ limite_clienti_extra: nuovoTotaleExtra }).eq("id", propId);
      if (prop.studio_id) {
        await supabase.from("audit_log").insert({
          studio_id: prop.studio_id, user_id: userId, user_nome: `${profilo?.nome} ${profilo?.cognome}`,
          azione: "Clienti add-on acquistato", entita_tipo: "prodotti", entita_id: prodottoId,
          dettaglio: `+${clientiExtra} clienti — totale extra: ${nuovoTotaleExtra}`,
        });
      }
      await inviaEmail(prop.email, "clienti-addon-attivato", {
        profilo: profiloRicevuta(prop), prodotto: { nome: prodotto.nome, clienti_extra: clientiExtra },
        nuovoTotaleExtra, scadenza: scadenza ? new Date(scadenza).toLocaleDateString("it-IT") : null,
        pagamento, recesso, app_url: APP_URL,
      });
    }

    // ═══ ABBONAMENTO (professionisti) ═══
    else if (prodottoTipo === "abbonamento") {
      const posti = prodotto.posti ?? 1;
      const tipoAccount = posti === 1 ? "singolo" : "titolare";
      const studioData = {
        piano_id: prodottoId, posti_totali: posti, posti_usati: 1,
        include_banca_dati: prodotto.include_banca_dati, include_monetizzazione: prodotto.include_monetizzazione,
        scadenza, stato: "attivo", stripe_sub_id: orderId || null,
      };
      const nuovoRuolo = ["avvocato", "commercialista"].includes(profilo?.role)
        ? profilo!.role
        : (profilo?.tipo_richiesta === "commercialista" ? "commercialista" : "avvocato");
      const profiloUpdate = {
        role: nuovoRuolo, tipo_account: tipoAccount, piano_id: prodottoId,
        abbonamento_tipo: prodotto.nome, abbonamento_scadenza: scadenza, abbonamento_stato: "attivo",
        grazia_fino_al: null, spazio_gb_piano: prodotto.spazio_gb ?? 0, posti_acquistati: posti,
        limite_clienti_piano: prodotto.limite_clienti ?? 0, limite_clienti_extra: 0,
        include_banca_dati: prodotto.include_banca_dati ?? false,
        include_monetizzazione: prodotto.include_monetizzazione ?? false,
      };
      let studioId = profilo?.studio_id ?? null;
      if (studioId) {
        await supabase.from("studios").update(studioData).eq("id", studioId);
        await supabase.from("profiles").update(profiloUpdate).eq("id", userId);
      } else {
        const nomeStudio = posti === 1 ? `Studio di ${profilo?.nome} ${profilo?.cognome}` : "Il mio studio";
        const { data: nuovo, error: sErr } = await supabase.from("studios")
          .insert({ ...studioData, nome: nomeStudio, titolare_id: userId }).select().single();
        if (sErr || !nuovo) throw new Error("Errore creazione studio");
        studioId = nuovo.id;
        await supabase.from("profiles").update({ ...profiloUpdate, studio_id: studioId }).eq("id", userId);
        await supabase.from("studio_members").insert({
          studio_id: studioId, user_id: userId, ruolo_studio: "titolare", visibilita: "tutto",
          is_active: true, joined_at: new Date().toISOString(),
        });
      }
      if (prodotto.crediti_ai_mensili > 0) {
        const fine = new Date();
        fine.setMonth(fine.getMonth() + 1);
        await supabase.from("crediti_ai").insert({
          user_id: userId, studio_id: studioId, tipo: "piano",
          crediti_totali: prodotto.crediti_ai_mensili, crediti_usati: 0,
          periodo_inizio: new Date().toISOString(), periodo_fine: fine.toISOString(),
        });
      }
      if (studioId) {
        await supabase.from("audit_log").insert({
          studio_id: studioId, user_id: userId, user_nome: `${profilo?.nome} ${profilo?.cognome}`,
          azione: "Abbonamento acquistato", entita_tipo: "prodotti", entita_id: prodottoId,
          dettaglio: `${prodotto.nome} — EUR ${importoPagato} — ${posti} posto/i`,
        });
      }
      await inviaEmail(profilo?.email ?? "", "abbonamento-attivato", {
        profilo: profiloRicevuta(profilo),
        prodotto: {
          nome: prodotto.nome, crediti_ai_mensili: prodotto.crediti_ai_mensili ?? 0, spazio_gb: prodotto.spazio_gb ?? 0,
          posti: prodotto.posti ?? 1, include_banca_dati: prodotto.include_banca_dati,
          include_monetizzazione: prodotto.include_monetizzazione,
        },
        scadenza: scadenza ? new Date(scadenza).toLocaleDateString("it-IT") : null,
        pagamento, recesso, app_url: APP_URL,
      });
    }

    // ═══ PIANO PERSONALE (privati) ═══
    else if (prodottoTipo === "piano_privato") {
      const { data: att, error: attErr } = await supabase.rpc("attiva_piano_privato", {
        p_user: userId, p_prodotto: prodottoId, p_sessione: `tagada:${orderId || lexumTx}`,
      });
      if (attErr) throw new Error(`Attivazione Piano Personale non riuscita: ${attErr.message}`);
      const a = Array.isArray(att) ? att[0] : att;
      await inviaEmail(profilo?.email ?? "", "piano-personale-attivato", {
        profilo: profiloRicevuta(profilo),
        prodotto: { nome: prodotto.nome, crediti_ai_mensili: a?.crediti ?? prodotto.crediti_ai_mensili ?? 0, spazio_gb: prodotto.spazio_gb ?? 0 },
        scadenza: new Date(a?.scadenza ?? Date.now()).toLocaleDateString("it-IT"),
        pagamento, recesso, app_url: APP_URL,
      }, userId);
    }

    // ═══ CREDITI AI (non scadono) ═══
    else if (prodottoTipo === "crediti_ai") {
      const crediti = prodotto.crediti_ai_mensili ?? 0;
      const { error: cErr } = await supabase.from("crediti_ai").insert({
        user_id: userId, studio_id: profilo?.studio_id ?? null, tipo: "topup",
        crediti_totali: crediti, crediti_usati: 0, periodo_inizio: new Date().toISOString(), periodo_fine: null,
      });
      if (cErr) throw new Error(`Accredito crediti non riuscito: ${cErr.message}`);
      await inviaEmail(profilo?.email ?? "", "crediti-ai-attivati", {
        profilo: profiloRicevuta(profilo), prodotto: { nome: prodotto.nome },
        creditiAcquistati: crediti, pagamento, recesso, app_url: APP_URL,
      });
    }

    // ═══ SPAZIO DI ARCHIVIAZIONE ═══
    else if (prodottoTipo === "spazio_archiviazione") {
      const gb = prodotto.spazio_gb ?? 0;
      const durataMesi = prodotto.durata_mesi ?? 1;
      if (gb <= 0) throw new Error("Prodotto storage senza GB configurati");
      const fine = new Date();
      fine.setMonth(fine.getMonth() + durataMesi);
      const { data: prop } = await supabase.from("profiles")
        .select("id, email, nome, cognome, studio_id, cf, indirizzo, cap, comune, provincia, ragione_sociale, partita_iva, sede_legale")
        .eq("id", userId).single();
      if (!prop) throw new Error("Proprietario storage non trovato");
      const { data: tx, error: txErr } = await supabase.from("transazioni").insert({
        user_id: userId, studio_id: prop.studio_id ?? null, prodotto_id: prodottoId, prodotto_nome: prodotto.nome,
        tipo: prodottoTipo, importo: importoPagato, stato: "completato", metadati: metadatiTx,
      }).select().single();
      if (txErr) throw new Error(`Transazione non salvata: ${txErr.message}`);
      await supabase.from("spazio_archiviazione").insert({
        proprietario_id: userId, gb, prodotto_id: prodottoId, transazione_id: tx?.id ?? null,
        periodo_inizio: new Date().toISOString(), periodo_fine: fine.toISOString(),
      });
      if (prop.studio_id) {
        await supabase.from("audit_log").insert({
          studio_id: prop.studio_id, user_id: userId, user_nome: `${profilo?.nome} ${profilo?.cognome}`,
          azione: "Storage acquistato", entita_tipo: "spazio_archiviazione", entita_id: prodottoId,
          dettaglio: `+${gb} GB — scade il ${fine.toLocaleDateString("it-IT")}`,
        });
      }
      await inviaEmail(prop.email ?? "", "spazio-di-archiviazione-attivato", {
        profilo: profiloRicevuta(prop),
        prodotto: {
          nome: prodotto.nome, gb_aggiunti: gb, durata_mesi: durataMesi, durata_singolare: durataMesi === 1,
          scadenza: fine.toLocaleDateString("it-IT"),
        },
        pagamento, recesso, app_url: APP_URL,
      });
      await supabase.from("tagada_ordini").update({ stato: "pagato", order_id: orderId || null, payment_id: dati?.paymentId ?? null, pagato_il: new Date().toISOString() }).eq("id", lexumTx);
      return new Response("OK", { status: 200 });
    } else {
      throw new Error(`Tipo di prodotto non venduto con la cassa: ${prodottoTipo}`);
    }

    const { error: txErr } = await supabase.from("transazioni").insert({
      user_id: userId, studio_id: profilo?.studio_id ?? null, prodotto_id: prodottoId, prodotto_nome: prodotto.nome,
      tipo: prodottoTipo, importo: importoPagato, stato: "completato", metadati: metadatiTx,
    });
    if (txErr) console.error("Transazione non salvata (acquisto già accreditato):", txErr.message);

    await supabase.from("tagada_ordini").update({
      stato: "pagato", order_id: orderId || null, payment_id: dati?.paymentId ?? null, pagato_il: new Date().toISOString(),
    }).eq("id", lexumTx);

    console.log(`✅ Tagadapay: ${prodotto.nome} accreditato a ${userId} (ordine ${orderId})`);
    return new Response("OK", { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("tagada-webhook:", msg);
    // Si toglie l'evento dal registro, così il ritentativo di Tagadapay lo rielabora.
    await supabase.from("tagada_eventi").delete().eq("event_id", eventId);
    return new Response("Errore", { status: 500 });
  }
});
