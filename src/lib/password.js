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
const LUNGHEZZA_MASSIMA = 72 // Supabase: 72 byte (UTF-8), cioè 72 caratteri senza accenti

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
const TESTO_LUNGA = 'La password è troppo lunga: al massimo 72 caratteri.'
const TESTO_UGUALE = 'La nuova password deve essere diversa da quella di prima.'
const TESTO_RUBATA = "Questa password compare negli elenchi di password rubate su internet: scegline un'altra."

// Byte in UTF-8, come li conta il server.
function byteUtf8(caratteri) {
    let n = 0
    for (const ch of caratteri) {
        const c = ch.codePointAt(0)
        n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4
    }
    return n
}

/**
 * Che cosa manca (o avanza) alla password per rispettare la regola.
 * @param {string} p
 * @returns {string[]} solo i problemi che ci sono, in quest'ordine: 'corta' o
 *   'lunga', poi 'minuscola', 'maiuscola', 'numero', 'simbolo'. Vuoto = va bene.
 */
export function problemiPassword(p) {
    const caratteri = [...(typeof p === 'string' ? p : '')] // un'emoji conta uno
    const problemi = []
    if (caratteri.length < LUNGHEZZA_MINIMA) problemi.push('corta')
    else if (byteUtf8(caratteri) > LUNGHEZZA_MASSIMA) problemi.push('lunga')
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

// Che cosa manca alla password inserita, se la si ha.
const mancanoA = password => typeof password === 'string' ? testoMancano(problemiPassword(password)) : null

/**
 * Il testo d'errore da mostrare prima dell'invio, o null se la password va bene.
 * Se è corta (o lunga) e le manca anche qualche tipo di carattere, i due testi
 * uno dopo l'altro.
 * @param {string} p
 * @returns {string|null}
 */
export function messaggioPassword(p) {
    const problemi = problemiPassword(p)
    const testi = []
    if (problemi.includes('corta')) testi.push(TESTO_CORTA)
    if (problemi.includes('lunga')) testi.push(TESTO_LUNGA)
    const mancano = testoMancano(problemi)
    if (mancano) testi.push(mancano)
    return testi.length ? testi.join(' ') : null
}

// I messaggi inglesi di Supabase, anche dentro il testo di una funzione del
// server («Errore aggiornamento password: Password should contain…»).
const INGLESE = /\bPassword should\b|known to be weak/
const INGLESE_LUNGA = /cannot be longer than \d+ characters?/i
const INGLESE_UGUALE = /should be different from the old password/i

function motiviDalTesto(testo) {
    const motivi = []
    if (/at least \d+ characters?/i.test(testo)) motivi.push('length')
    if (/should contain|character of each/i.test(testo)) motivi.push('characters')
    if (/known to be weak|easy to guess/i.test(testo)) motivi.push('pwned')
    return motivi
}

/**
 * Traduce i rifiuti di Supabase per la password nuova nei testi della regola:
 * password debole (codice «weak_password»: motivi length, characters, pwned),
 * troppo lunga, uguale a quella di prima (codice «same_password»).
 * `err` può essere:
 *   • l'errore di supabase-js (AuthWeakPasswordError: motivi in err.reasons
 *     oppure in err.weak_password.reasons);
 *   • il corpo JSON di una funzione del server ({ ok: false, error: '…' }) o il
 *     suo solo testo: le funzioni girano il messaggio inglese di Supabase.
 * @param {unknown} err
 * @param {string} [password] la password inserita: serve a dire che cosa manca
 * @returns {string|null} il testo da mostrare; null se l'errore non riguarda la
 *   password (il chiamante lo gestisce come prima).
 */
export function messaggioErroreAuthPassword(err, password) {
    if (!err) return null
    const o = typeof err === 'object' ? err : null
    const testo = typeof err === 'string'
        ? err
        : [o?.message, o?.msg, o?.error].find(t => typeof t === 'string') ?? ''
    const codice = o?.code ?? o?.error_code

    if (codice === 'same_password' || INGLESE_UGUALE.test(testo)) return TESTO_UGUALE
    if (INGLESE_LUNGA.test(testo)) return [TESTO_LUNGA, mancanoA(password)].filter(Boolean).join(' ')

    const debole = codice === 'weak_password' || o?.name === 'AuthWeakPasswordError'
    let motivi = Array.isArray(o?.weak_password?.reasons) ? o.weak_password.reasons
        : debole && Array.isArray(o?.reasons) ? o.reasons
        : []
    if (!debole && !motivi.length && !INGLESE.test(testo)) return null
    if (!motivi.length) motivi = motiviDalTesto(testo)

    const corta = motivi.includes('length')
    const caratteri = motivi.includes('characters')
    const mancano = corta || caratteri ? mancanoA(password) : null
    const testi = []
    if (caratteri && !mancano) {
        // Senza la password inserita, o se qui non manca nulla (il server la
        // vede diversamente): la regola intera, che dice anche la lunghezza.
        testi.push(TESTO_REGOLA_PASSWORD)
    } else {
        if (corta) testi.push(TESTO_CORTA)
        if (mancano) testi.push(mancano)
    }
    if (motivi.includes('pwned')) testi.push(TESTO_RUBATA)
    // Rifiuto riconosciuto ma senza motivi leggibili: la regola intera.
    return testi.length ? testi.join(' ') : TESTO_REGOLA_PASSWORD
}

// ── Errori delle funzioni del server ─────────────────────────
// create-cliente, admin-create-user, admin-user-actions, avvocato-cliente-actions
// e cliente-reset-password rispondono { ok: false, error: '…' } con stato 400.
// Con functions.invoke il testo vero sta nel corpo della risposta (error.context):
// error.message è sempre «Edge Function returned a non-2xx status code» e non si
// mostra. Il testo del server di solito è italiano, ma a volte è quello inglese
// di Supabase o del database, anche dopo un prefisso italiano («Errore invio
// email: Email rate limit exceeded»): quello non si mostra.
const ERRORE_GENERICO = 'Si è verificato un errore temporaneo. Riprova tra qualche istante.'

const PAROLE_INGLESI =
    /\b(?:the|an|is|are|was|were|be|been|has|have|had|not|cannot|can't|could|should|would|must|will|with|from|this|that|of|to|for|by|and|or|please|already|invalid|failed|failure|unable|unexpected|errors?|exceeded|found|registered|exists?|allowed|denied|required|missing|returned|violates|duplicate|network|requests?|function|status|limit|session|expired|timeout|unauthorized|forbidden|unavailable|internal)\b/i
const PAROLE_ITALIANE =
    /[àèéìòù]|\b(?:non|il|lo|la|le|gli|un|una|uno|di|del|della|dello|dei|degli|delle|da|dal|dalla|al|alla|per|con|che|tra|senza|questo|questa|sono|hai|puoi|serve|esiste|gia|errore|utente|cliente|clienti|accesso|azione|ruolo|codice|piano|studio|obbligatori[oa]|valid[oa]|trovat[oa]|negato|riservato|minimo|almeno|caratteri|nuov[oa]|deve)\b/i

const testoItaliano = t => !!t && PAROLE_ITALIANE.test(t) && !PAROLE_INGLESI.test(t)

/**
 * Il testo da mostrare per l'errore di una funzione del server: prima il
 * traduttore delle password; poi il testo del server, se è già italiano;
 * altrimenti un messaggio generico. Non restituisce mai testo inglese.
 * @param {unknown} err il corpo della risposta ({ ok: false, error }), il suo
 *   testo o un Error; null se il corpo non si è potuto leggere
 * @param {string} [password] la password inserita, se c'è
 * @returns {string}
 */
export function messaggioErroreFunzione(err, password) {
    const daPassword = messaggioErroreAuthPassword(err, password)
    if (daPassword) return daPassword
    const testo = typeof err === 'string'
        ? err
        : [err?.error, err?.message, err?.msg].find(t => typeof t === 'string') ?? ''
    return testoItaliano(testo.trim()) ? testo.trim() : ERRORE_GENERICO
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
