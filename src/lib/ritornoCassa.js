// src/lib/ritornoCassa.js
//
// Rientro dalla cassa Tagadapay (28-10-2026). Dopo il pagamento Tagadapay manda tutti allo stesso
// indirizzo, quello impostato nel negozio («Custom Thank-You URL»): /pagamento/esito. Prima di uscire
// verso la cassa ricordiamo qui la pagina a cui tornare (lo stesso ritorno passato a tagada-checkout),
// e la pagina d'esito la riprende. Stesso file su Lexum IT e su Lexum CH.

const CHIAVE = 'lexum_ritorno_cassa'
const DURATA_MS = 2 * 60 * 60 * 1000   // un pagamento lasciato a metà vale per due ore

/** Ricorda la pagina di Lexum a cui tornare: un percorso ("/area/acquista?success=1") o un indirizzo di questo sito. */
export function ricordaRitorno(ritorno) {
    try {
        const u = new URL(ritorno, window.location.origin)
        if (u.origin !== window.location.origin) return
        localStorage.setItem(CHIAVE, JSON.stringify({ percorso: u.pathname + u.search, quando: Date.now() }))
    } catch { /* archivio non disponibile: si torna alla pagina di riserva */ }
}

/** La pagina a cui tornare (una volta sola), oppure null. */
export function prendiRitorno() {
    try {
        const dati = JSON.parse(localStorage.getItem(CHIAVE) ?? 'null')
        localStorage.removeItem(CHIAVE)
        const p = dati?.percorso
        if (!p || !p.startsWith('/') || p.startsWith('//') || Date.now() - dati.quando > DURATA_MS) return null
        return p
    } catch {
        return null
    }
}
