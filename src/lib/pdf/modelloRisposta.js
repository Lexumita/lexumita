// src/lib/pdf/modelloRisposta.js
// ─────────────────────────────────────────────────────────────
// Dalla risposta di Lex (Markdown del Synthesizer) al MODELLO del documento
// PDF, senza AI (25/09/2026). Legge solo la struttura che la risposta ha gia':
// titoli di sezione, paragrafi, elenchi, citazioni in link alla banca dati.
// Le parti editoriali (titolo, quesito in sintesi, punti fermi, sintesi,
// descrizione delle fonti) le aggiunge `unisciEditoriale` se Sonnet le ha
// scritte: il testo della risposta resta comunque quello di Lex, parola per parola.
// ─────────────────────────────────────────────────────────────

import { marked } from 'marked'

export const NOTA_FINALE = 'Documento generato con Lex AI sulle fonti normative e giurisprudenziali indicizzate nella banca dati Lexum. Non costituisce un parere legale né sostituisce la valutazione professionale dell\'avvocato incaricato.'

const decodifica = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
const piatto = (tokens) => tokens.map((t) => (t.tokens ? piatto(t.tokens) : t.text ?? '')).join('')
const unaRiga = (s) => s.replace(/\s*\n\s*/g, ' ').trim()

// Titolo di ripiego: la prima frase della domanda se e' corta, altrimenti
// generico (il quesito completo sta comunque nel suo riquadro).
function titoloDaDomanda(domanda) {
    const prima = (domanda ?? '').trim().split(/(?<=[.?!])\s/)[0] ?? ''
    return prima.length > 0 && prima.length <= 80 ? prima.replace(/[.]$/, '') : 'Analisi giuridica'
}

// Fonti: i link alla banca dati nell'ordine in cui compaiono, una volta sola.
function fontiDaLink(risposta) {
    const perUrl = new Map()
    for (const [, testo, url] of risposta.matchAll(/\[([^\]]+)\]\((\/banca-dati\/[^)\s]+)\)/g)) {
        const pulito = testo.trim()
        const gia = perUrl.get(url)
        if (!gia || pulito.length < gia.length) perUrl.set(url, pulito)
    }
    return [...perUrl.values()].map((testo) => ({ citazione: testo, descrizione: '' }))
}

export function modelloMeccanico({ domanda, risposta }) {
    const tokens = marked.lexer(risposta ?? '')
    const livelli = tokens.filter((t) => t.type === 'heading').map((t) => t.depth)
    const livelloSezione = livelli.length ? Math.min(...livelli) : 2

    const premessa = []
    const sezioni = []
    let corrente = null
    const aggiungi = (b) => (corrente ? corrente.blocchi : premessa).push(b)

    for (const t of tokens) {
        if (t.type === 'heading') {
            if (t.depth === livelloSezione) {
                corrente = { titolo: decodifica(piatto(t.tokens)), blocchi: [] }
                sezioni.push(corrente)
            } else {
                aggiungi({ tipo: 'titoletto', testo: t.text })
            }
        } else if (t.type === 'paragraph') {
            aggiungi({ tipo: 'paragrafo', testo: unaRiga(t.text) })
        } else if (t.type === 'list') {
            aggiungi({ tipo: 'elenco', ordinato: t.ordered, voci: t.items.map((i) => unaRiga(i.text)) })
        } else if (t.type === 'blockquote') {
            aggiungi({ tipo: 'principio', testo: unaRiga(t.text.replace(/^>\s?/gm, '')) })
        }
        // hr, spazi, codice e html non entrano nel documento
    }

    // Risposta senza titoli: un'unica sezione, niente premessa.
    if (sezioni.length === 0) sezioni.push({ titolo: 'La risposta di Lex', blocchi: premessa.splice(0) })

    // Chiusura "In sintesi: ..." o "In conclusione, ...": va nel riquadro finale.
    let sintesi
    const ultimi = sezioni[sezioni.length - 1].blocchi
    const coda = ultimi[ultimi.length - 1]
    const apertura = /^\*{0,2}(in sintesi|in conclusione|in definitiva)\*{0,2}\s*[:,.]\s*/i
    if (coda?.tipo === 'paragrafo' && apertura.test(coda.testo)) {
        sintesi = coda.testo.replace(apertura, '')
        sintesi = sintesi.charAt(0).toUpperCase() + sintesi.slice(1)
        ultimi.pop()
    }

    return {
        titolo: titoloDaDomanda(domanda),
        sottotitolo: sezioni.slice(0, 4).map((s) => s.titolo).join(' · '),
        quesito: { etichetta: 'Il quesito', testo: (domanda ?? '').trim() },
        premessa,
        sezioni,
        sintesi,
        fonti: fontiDaLink(risposta ?? ''),
        nota_finale: NOTA_FINALE,
    }
}

// Aggiunge al modello meccanico le parti scritte da Sonnet (edge lex-impagina).
// Se la risposta chiudeva gia' con "In sintesi", resta quella di Lex.
export function unisciEditoriale(base, ed) {
    if (!ed) return base
    return {
        ...base,
        titolo: ed.titolo || base.titolo,
        sottotitolo: ed.sottotitolo || base.sottotitolo,
        quesito: ed.quesito ? { etichetta: 'Il quesito, in sintesi', testo: ed.quesito } : base.quesito,
        sezioni: base.sezioni.map((s, i) => ({
            ...s,
            etichetta: ed.sezioni?.[i]?.etichetta || s.etichetta,
            titolo: ed.sezioni?.[i]?.titolo || s.titolo,
        })),
        punti_fermi: ed.punti_fermi?.length ? ed.punti_fermi.slice(0, 3) : base.punti_fermi,
        sintesi: base.sintesi || ed.sintesi,
        fonti: ed.fonti?.length ? ed.fonti : base.fonti,
    }
}
