// src/lib/sanitizzaErrore.js
// ─────────────────────────────────────────────────────────────
// Rete di sicurezza per i messaggi d'errore mostrati all'utente (24/09/2026).
// Il 24/09 un utente ha letto a schermo "Errore pre-analisi: Unexpected end of
// JSON input". Il server di Lex ora manda messaggi chiari; qui si ferma quello
// che puo' ancora sfuggire:
//   • il nome di un fornitore AI o un suo dettaglio tecnico (regola white-label,
//     come su LEXUM CH);
//   • un errore di rete del browser ("Failed to fetch", "Load failed");
//   • un messaggio tecnico in inglese del motore JavaScript o del database.
// Tutti gli altri messaggi, gia' scritti per l'utente, passano invariati.
// Il dettaglio tecnico vero resta nei log del server, mai qui.
// ─────────────────────────────────────────────────────────────

const FORNITORE =
    /openai|anthropic|mistral|\bclaude\b|claude-|\bgpt-|chatgpt|api\.(?:openai|anthropic|mistral)|x-api-key|anthropic-version|\bsk-ant-|\bsk-proj-|\bsk-[a-z0-9]{20}|text-embedding/i

const RETE = /failed to fetch|networkerror|network error|load failed|err_network|err_internet_disconnected/i

const TECNICO =
    /unexpected (?:end|token)|\bjson\b|is not a function|cannot read propert|is not defined|\bundefined\b|typeerror|syntaxerror|referenceerror|statement timeout|internal server error|bad gateway|gateway time-?out|worker_limit|econnreset/i

const MSG = {
    rate: 'Troppe richieste in questo momento. Riprova tra qualche secondo.',
    servizio: 'Il servizio è temporaneamente non disponibile. Riprova tra poco.',
    rete: 'La connessione si è interrotta. Controlla la rete e riprova.',
    generico: 'Si è verificato un errore temporaneo. Riprova tra qualche istante.',
}

/**
 * Rende presentabile un messaggio d'errore.
 * @param {unknown} input      stringa, Error o qualsiasi valore
 * @param {string}  [fallback] messaggio generico personalizzato
 * @returns {string|undefined} messaggio sicuro; `undefined` se l'input e' vuoto,
 *          cosi' `sanitizzaErrore(x) ?? 'testo di riserva'` continua a funzionare.
 */
export function sanitizzaErrore(input, fallback) {
    const raw =
        typeof input === 'string'
            ? input
            : input?.message ?? (input == null ? '' : String(input))
    if (!raw) return undefined

    if (FORNITORE.test(raw)) {
        const stato = (raw.match(/\b(429|5\d\d|401|403)\b/) || [])[1]
        if (stato === '429') return MSG.rate
        if (stato) return MSG.servizio
        return fallback ?? MSG.generico
    }
    if (RETE.test(raw)) return MSG.rete
    if (TECNICO.test(raw)) return fallback ?? MSG.generico
    return raw
}

export default sanitizzaErrore
