// src/lib/bonifico.js
//
// Pagamento con bonifico (27-10-2026). Stripe ha chiuso il conto di Lexum e il nuovo processore non è
// ancora collegato: tutti i pulsanti «Paga» portano a /pagamento/bonifico, che mostra importo, coordinate
// e causale. Chi paga manda la ricevuta a info@lexum.it e l'acquisto si attiva a mano dall'admin.
// Quando arriva il nuovo processore, i pulsanti tornano alla cassa e questa pagina si spegne.

export const DATI_BONIFICO = {
    beneficiario: 'Mosaico Experiences SA',
    indirizzo: 'Via Cantonale 1, 6900 Lugano, Svizzera',
    iban: 'CH37 0024 7247 2398 8860 X',
    bic: 'UBSWCHZH80A',
    banca: 'UBS Switzerland AG, Bahnhofstrasse 45, 8048 Zürich, Svizzera',
    valuta: 'EUR',
    emailRicevuta: 'info@lexum.it',
}

/** Indirizzo della pagina del bonifico per un prodotto; `importo` solo quando differisce dal listino (upgrade). */
export function paginaBonifico(prodottoId, importo) {
    const q = new URLSearchParams({ prodotto: prodottoId })
    if (importo != null) q.set('importo', String(importo))
    return `/pagamento/bonifico?${q}`
}
