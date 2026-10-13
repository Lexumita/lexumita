// src/lib/password.js
// ─────────────────────────────────────────────────────────────
// La regola delle password (13/10/2026). Antonino l'ha impostata in Supabase
// Auth, in Italia e in Svizzera: almeno 8 caratteri, con almeno una lettera
// minuscola, una maiuscola, un numero e un simbolo. Supabase rifiuta le
// password NUOVE che non la rispettano (registrazione, cambio, reimpostazione);
// quelle vecchie continuano a funzionare al login.
//
// Qui: la stessa regola del server, i testi da mostrare e la traduzione dei
// rifiuti di Supabase. Specifica comune ai due siti e all'app
// (SPEC-password.md del 13/10): la regola e i testi devono restare questi.
//   • le classi sono ASCII, come sul server: le lettere accentate non contano
//     e «€ £ § °» o lo spazio non sono simboli;
//   • il messaggio inglese di Supabase non si mostra MAI.
// ─────────────────────────────────────────────────────────────

const LUNGHEZZA_MINIMA = 8

// Gli insiemi di Supabase Auth: basta un carattere di ciascuno.
const MINUSCOLE = 'abcdefghijklmnopqrstuvwxyz'
const MAIUSCOLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const NUMERI = '0123456789'
const SIMBOLI = '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~'

// Nell'ordine in cui si elencano.
const CLASSI = [
    { problema: 'minuscola', caratteri: MINUSCOLE, voce: 'una lettera minuscola' },
    { problema: 'maiuscola', caratteri: MAIUSCOLE, voce: 'una lettera maiuscola' },
    { problema: 'numero', caratteri: NUMERI, voce: 'un numero' },
    { problema: 'simbolo', caratteri: SIMBOLI, voce: 'un simbolo (per esempio ! ? # @)' },
]

// Il testo sotto il campo password.
export const TESTO_REGOLA_PASSWORD =
    'Almeno 8 caratteri, con una lettera minuscola, una maiuscola, un numero e un simbolo (per esempio ! ? # @).'

const TESTO_CORTA = 'La password è troppo corta: servono almeno 8 caratteri.'
const TESTO_RUBATA = "Questa password compare negli elenchi di password rubate su internet: scegline un'altra."

/**
 * Che cosa manca alla password per rispettare la regola.
 * @param {string} p
 * @returns {string[]} solo quelli che mancano, in quest'ordine: 'lunghezza',
 *   'minuscola', 'maiuscola', 'numero', 'simbolo'. Vuoto = la password va bene.
 */
export function problemiPassword(p) {
    const caratteri = [...(typeof p === 'string' ? p : '')] // un'emoji conta uno
    const problemi = []
    if (caratteri.length < LUNGHEZZA_MINIMA) problemi.push('lunghezza')
    for (const c of CLASSI) {
        if (!caratteri.some(x => c.caratteri.includes(x))) problemi.push(c.problema)
    }
    return problemi
}

// «Alla password manca un numero.» / «Alla password mancano un numero e un simbolo (…).»
function testoMancano(problemi) {
    const voci = CLASSI.filter(c => problemi.includes(c.problema)).map(c => c.voce)
    if (!voci.length) return null
    if (voci.length === 1) return `Alla password manca ${voci[0]}.`
    return `Alla password mancano ${voci.slice(0, -1).join(', ')} e ${voci[voci.length - 1]}.`
}

/**
 * Il testo d'errore da mostrare prima dell'invio, o null se la password va bene.
 * Se è corta e le manca anche qualche tipo di carattere, i due testi uno dopo l'altro.
 * @param {string} p
 * @returns {string|null}
 */
export function messaggioPassword(p) {
    const problemi = problemiPassword(p)
    const testi = []
    if (problemi.includes('lunghezza')) testi.push(TESTO_CORTA)
    const mancano = testoMancano(problemi)
    if (mancano) testi.push(mancano)
    return testi.length ? testi.join(' ') : null
}

// Il messaggio inglese di Supabase, anche dentro il testo di una funzione del
// server («Errore aggiornamento password: Password should contain…»).
// «New password should be different…» (same_password) non c'entra: minuscola.
const INGLESE = /\bPassword should\b|known to be weak/

function motiviDalTesto(testo) {
    const motivi = []
    if (/at least \d+ characters?/i.test(testo)) motivi.push('length')
    if (/should contain|character of each/i.test(testo)) motivi.push('characters')
    if (/known to be weak|easy to guess/i.test(testo)) motivi.push('pwned')
    return motivi
}

/**
 * Traduce il rifiuto di Supabase per una password debole (codice
 * «weak_password») nei testi della regola. `err` può essere:
 *   • l'errore di supabase-js (AuthWeakPasswordError: motivi in err.reasons
 *     oppure in err.weak_password.reasons);
 *   • il corpo JSON di una funzione del server ({ ok: false, error: '…' }) o il
 *     suo solo testo: le funzioni girano il messaggio inglese di Supabase.
 * @param {unknown} err
 * @param {string} [password] la password inserita: serve a dire che cosa manca
 * @returns {string|null} il testo da mostrare; null se l'errore non riguarda la
 *   regola delle password (il chiamante lo gestisce come prima).
 */
export function messaggioErroreAuthPassword(err, password) {
    if (!err) return null
    const o = typeof err === 'object' ? err : null
    const testo = typeof err === 'string'
        ? err
        : [o?.message, o?.msg, o?.error].find(t => typeof t === 'string') ?? ''
    const codice = o?.code ?? o?.error_code
    if (codice === 'same_password') return null

    const debole = codice === 'weak_password' || o?.name === 'AuthWeakPasswordError'
    let motivi = Array.isArray(o?.weak_password?.reasons) ? o.weak_password.reasons
        : debole && Array.isArray(o?.reasons) ? o.reasons
        : []
    if (!debole && !motivi.length && !INGLESE.test(testo)) return null
    if (!motivi.length) motivi = motiviDalTesto(testo)

    const testi = []
    // «characters»: che cosa manca, calcolato sulla password inserita. Se non
    // la si ha, o se qui non manca nulla (il server la vede diversamente), la
    // regola intera, che dice già anche la lunghezza.
    const mancano = motivi.includes('characters') && typeof password === 'string'
        ? testoMancano(problemiPassword(password))
        : null
    if (motivi.includes('characters') && !mancano) {
        testi.push(TESTO_REGOLA_PASSWORD)
    } else {
        if (motivi.includes('length')) testi.push(TESTO_CORTA)
        if (mancano) testi.push(mancano)
    }
    if (motivi.includes('pwned')) testi.push(TESTO_RUBATA)
    // Rifiuto riconosciuto ma senza motivi leggibili: la regola intera.
    return testi.length ? testi.join(' ') : TESTO_REGOLA_PASSWORD
}

// ── Password generate ────────────────────────────────────────
// 12 caratteri da un alfabeto senza quelli che si confondono (0/O, 1/l/I),
// almeno uno per tipo, ciascuno in una posizione a caso; simboli facili da
// dettare, tutti nell'elenco di Supabase.
const GEN_MINUSCOLE = 'abcdefghijkmnopqrstuvwxyz'
const GEN_MAIUSCOLE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const GEN_NUMERI = '23456789'
const GEN_SIMBOLI = '!#$%*?@-_+='
const GEN_TUTTI = GEN_MINUSCOLE + GEN_MAIUSCOLE + GEN_NUMERI + GEN_SIMBOLI

// Intero uniforme in [0, n): crypto.getRandomValues quando c'è.
function casuale(n) {
    const c = globalThis.crypto
    if (!c?.getRandomValues) return Math.floor(Math.random() * n)
    const limite = Math.floor(0x100000000 / n) * n // niente sbilanciamento del modulo
    const buf = new Uint32Array(1)
    do { c.getRandomValues(buf) } while (buf[0] >= limite)
    return buf[0] % n
}

/** Una password di 12 caratteri che rispetta sempre la regola. */
export function generaPassword() {
    const scegli = s => s[casuale(s.length)]
    const caratteri = [scegli(GEN_MINUSCOLE), scegli(GEN_MAIUSCOLE), scegli(GEN_NUMERI), scegli(GEN_SIMBOLI)]
    while (caratteri.length < 12) caratteri.push(scegli(GEN_TUTTI))
    for (let i = caratteri.length - 1; i > 0; i--) {
        const j = casuale(i + 1)
        ;[caratteri[i], caratteri[j]] = [caratteri[j], caratteri[i]]
    }
    return caratteri.join('')
}
