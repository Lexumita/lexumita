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
// Qui anche i messaggi d'errore delle funzioni del server, del 2FA e dei
// salvataggi nel database: italiano del server o messaggio generico, mai inglese.
// ─────────────────────────────────────────────────────────────

import { sanitizzaErrore } from '@/lib/sanitizzaErrore'

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
    /[àèéìòù]|\b(?:non|il|lo|la|le|gli|un|una|uno|di|del|della|dello|dei|degli|delle|da|dal|dalla|al|alla|per|con|che|tra|senza|solo|questo|questa|sono|hai|puoi|serve|esiste|gia|nessun[ao]?|errore|utente|cliente|clienti|accesso|azione|ruolo|codice|piano|studio|permessi|obbligatori[oa]|valid[oa]|trovat[oa]|errat[oa]|scadut[oa]|mancant[ei]|negato|riservato|minimo|almeno|caratteri|nuov[oa]|deve)\b/i

// Presentabile: italiano, senza parole inglesi e senza quello che la rete di
// sicurezza del sito ferma (nomi dei fornitori AI, rete, dettagli tecnici).
const testoItaliano = t => !!t && PAROLE_ITALIANE.test(t) && !PAROLE_INGLESI.test(t) && sanitizzaErrore(t) === t

/**
 * Il testo da mostrare per l'errore di una funzione del server: prima il
 * traduttore delle password; poi il testo del server, se è già italiano;
 * altrimenti un messaggio generico. Non restituisce mai testo inglese.
 * @param {unknown} err il corpo della risposta ({ ok: false, error }), il suo
 *   testo o un Error; null se il corpo non si è potuto leggere
 * @param {string} [password] la password inserita, se c'è
 * @param {string} [senzaTesto] il testo della pagina quando il server non ne
 *   manda nessuno (di solito il messaggio generico)
 * @returns {string}
 */
export function messaggioErroreFunzione(err, password, senzaTesto = ERRORE_GENERICO) {
    const daPassword = messaggioErroreAuthPassword(err, password)
    if (daPassword) return daPassword
    const testo = (typeof err === 'string'
        ? err
        : [err?.error, err?.message, err?.msg].find(t => typeof t === 'string') ?? '').trim()
    if (!testo) return senzaTesto
    return testoItaliano(testo) ? testo : ERRORE_GENERICO
}

/**
 * Lo stesso per supabase.functions.invoke: con una risposta non 2xx il testo
 * vero sta nel corpo (error.context); «Edge Function returned a non-2xx status
 * code», gli errori di rete e il testo inglese non si mostrano mai.
 *   const { data, error } = await supabase.functions.invoke(…)
 *   if (error || !data?.ok) throw new Error(await messaggioErroreInvoke(error, data))
 * @param {unknown} error l'errore restituito da functions.invoke
 * @param {unknown} [data] i dati restituiti (una risposta 2xx con ok: false)
 * @param {{ password?: string, senzaTesto?: string }} [opzioni] la password
 *   inserita; il testo della pagina per una risposta 2xx senza testo
 * @returns {Promise<string>}
 */
export async function messaggioErroreInvoke(error, data, { password, senzaTesto } = {}) {
    if (!error) return messaggioErroreFunzione(data, password, senzaTesto)
    let corpo = null
    try { corpo = await error.context.json() } catch { corpo = null }
    return messaggioErroreFunzione(corpo, password)
}

// ── Salvataggi diretti nel database ──────────────────────────
/**
 * Il testo da mostrare per un salvataggio diretto nel database non riuscito
 * (supabase.from(…).insert/update/delete): il testo di PostgREST o di Postgres
 * è tecnico e inglese, quindi il messaggio generico; resta il testo italiano di
 * un vincolo o di un controllo del database, se c'è.
 * @param {unknown} err l'errore di supabase-js o un Error
 * @returns {string}
 */
export function messaggioErroreDatabase(err) {
    const testo = (typeof err === 'string' ? err : typeof err?.message === 'string' ? err.message : '').trim()
    return testoItaliano(testo) ? testo : ERRORE_GENERICO
}

// ── Registrazione e reimpostazione (Supabase Auth) ───────────
// Gli altri rifiuti di Supabase in queste pagine, con gli stessi testi dell'app.
const TESTO_EMAIL_REGISTRATA = "Con questa email c'è già un account: accedi."
const TESTO_TROPPI_TENTATIVI = 'Troppi tentativi. Riprova tra qualche minuto.'
const TESTO_EMAIL_NON_VALIDA = "L'indirizzo email non è valido."
const TESTO_LINK_SCADUTO = 'Il link non è più valido. Chiedine uno nuovo.'

/**
 * Il testo da mostrare per un errore di Supabase Auth nelle pagine di
 * registrazione, recupero e reimpostazione della password: prima la password,
 * poi email già registrata, troppi tentativi, email non valida, link scaduto;
 * il resto (rete compresa) col messaggio generico del sito. Mai l'inglese.
 * @param {unknown} err errore di supabase-js
 * @param {string} [password] la password inserita, se c'è
 * @param {{ link?: boolean }} [opzioni] link: pagina aperta dal link della mail,
 *   dove la sessione che manca vuol dire che il link non vale più
 * @returns {string}
 */
export function messaggioErroreAccesso(err, password, { link = false } = {}) {
    const daPassword = messaggioErroreAuthPassword(err, password)
    if (daPassword) return daPassword
    const o = err && typeof err === 'object' ? err : null
    const testo = (typeof err === 'string'
        ? err
        : [o?.message, o?.msg, o?.error].find(t => typeof t === 'string') ?? '').trim()
    const codice = String(o?.code ?? o?.error_code ?? '')

    // Prima del controllo sull'email: «Email link is invalid or has expired».
    if (codice === 'otp_expired' || /expired/i.test(testo)) return TESTO_LINK_SCADUTO
    if (link && (o?.name === 'AuthSessionMissingError' || /session missing/i.test(testo))) return TESTO_LINK_SCADUTO
    if (codice === 'user_already_exists' || codice === 'email_exists' || /already (?:been )?(?:registered|exists)/i.test(testo)) {
        return TESTO_EMAIL_REGISTRATA
    }
    if (o?.status === 429 || /^over_\w*_limit$/.test(codice) || /rate limit|too many/i.test(testo)) return TESTO_TROPPI_TENTATIVI
    if (codice === 'email_address_invalid' || /invalid.*email|email.*invalid/i.test(testo)) return TESTO_EMAIL_NON_VALIDA
    return testoItaliano(testo) ? testo : ERRORE_GENERICO
}

// ── Il codice a 6 cifre del 2FA (attivazione e login) ────────
const TESTO_CODICE_2FA = "Codice non valido. Controlla che l'ora del telefono sia giusta e riprova."

/**
 * Il testo da mostrare per un errore di Supabase Auth nei passaggi del 2FA
 * (supabase.auth.mfa: creazione del codice QR, verifica del codice a 6 cifre):
 * codice sbagliato, troppi tentativi, altrimenti il messaggio generico.
 * @param {unknown} err l'errore di supabase-js
 * @returns {string}
 */
export function messaggioErrore2FA(err) {
    const o = err && typeof err === 'object' ? err : null
    const testo = typeof err === 'string' ? err : typeof o?.message === 'string' ? o.message : ''
    const codice = String(o?.code ?? '')
    if (o?.status === 429 || /^over_\w*_limit$/.test(codice) || /rate limit|too many/i.test(testo)) return TESTO_TROPPI_TENTATIVI
    if (codice === 'mfa_verification_failed' || /invalid totp/i.test(testo)) return TESTO_CODICE_2FA
    return ERRORE_GENERICO
}

/**
 * Il link della mail scaduto o già usato: Supabase rimanda alla pagina con
 * l'errore nell'indirizzo (#error=access_denied&error_code=otp_expired&error_description=…).
 * @param {string} [hash] window.location.hash
 * @param {string} [search] window.location.search
 * @returns {string} il testo da mostrare; '' se l'indirizzo non porta errori
 */
export function messaggioErroreLink(hash = '', search = '') {
    const parametri = [hash, search].map(s => new URLSearchParams(String(s).replace(/^[#?]/, '')))
    const leggi = k => parametri.map(p => p.get(k)).find(Boolean)
    if (!leggi('error') && !leggi('error_code') && !leggi('error_description')) return ''
    return messaggioErroreAccesso({ code: leggi('error_code'), message: leggi('error_description') ?? '' }, undefined, { link: true })
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
