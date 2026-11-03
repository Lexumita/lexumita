// src/lib/strumenti/caricaPdf.js
//
// 03-11-2026: il modulo dei PDF è pesante e sta in un file a parte. Si scarica appena si apre lo strumento, non
// al clic: chi compila per dieci minuti lo ha già in memoria, anche se nel frattempo esce una nuova versione del
// sito e il vecchio file sparisce («Failed to fetch dynamically imported module»).

let modulo = null

export function caricaPdf() {
    if (!modulo) {
        modulo = import('./pdfStrumenti').catch(() => {
            modulo = null
            throw new Error('Non riesco a preparare il PDF. Controlla la connessione e riprova; se non basta, ricarica la pagina.')
        })
    }
    return modulo
}

const CHIAVE_RICARICATA = 'lexum_strumenti_ricaricata'

// Se il file non c'è più, la pagina è di una versione vecchia del sito (la scheda era aperta da prima): appena
// aperto lo strumento non si è ancora scritto niente, quindi si ricarica. Una volta sola, per non girare a vuoto.
export function preparaPdf() {
    const inizio = Date.now()
    caricaPdf().catch(() => {
        try {
            const ultima = Number(window.sessionStorage.getItem(CHIAVE_RICARICATA)) || 0
            if (Date.now() - inizio > 5000 || Date.now() - ultima < 60000) return
            window.sessionStorage.setItem(CHIAVE_RICARICATA, String(Date.now()))
            window.location.reload()
        } catch { /* si riprova al clic */ }
    })
}
