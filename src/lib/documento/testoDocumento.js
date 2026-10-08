// src/lib/documento/testoDocumento.js
//
// 08-10-2026: documenti scritti da Lex in Banca Dati (modalità atto). Il testo arriva in Markdown: il
// documento, poi una riga «---» e le «Note per la revisione» per chi firma. Qui si separano le due parti e
// il documento diventa una lista di blocchi semplici, usata sia per il file Word sia per il PDF.

import { marked } from 'marked'

const RE_TITOLO_NOTE = /^\s{0,3}(?:#{1,6}\s*)?(?:\*\*)?\s*Note per la revisione\b/i
const RE_LINEA = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/

// { corpo, note }: le note non finiscono nel file da firmare
export function separaNote(markdown) {
    const righe = String(markdown ?? '').split('\n')
    const i = righe.findIndex((r) => RE_TITOLO_NOTE.test(r))
    if (i < 0) return { corpo: righe.join('\n').trim(), note: '' }
    let fine = i
    while (fine > 0 && /^\s*$/.test(righe[fine - 1])) fine--
    if (fine > 0 && RE_LINEA.test(righe[fine - 1])) fine--
    return { corpo: righe.slice(0, fine).join('\n').trim(), note: righe.slice(i + 1).join('\n').trim() }
}

// Segnaposto da completare: [NOME E COGNOME DEL CONDUTTORE], [IMPORTO]...
export function segnaposti(markdown) {
    const trovati = String(markdown ?? '').match(/\[[A-ZÀ-Ý0-9][^[\]\n]{1,150}\]/g) ?? []
    return [...new Set(trovati.filter((s) => s === s.toLocaleUpperCase('it-IT')))]
}

const ENTITA = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }
const decodifica = (s) => String(s ?? '').replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (e) => ENTITA[e])

// Pezzi di testo con il loro stile: [{ testo, grassetto, corsivo }]
function pezzi(tokens = [], stile = {}) {
    const out = []
    for (const t of tokens) {
        if (t.type === 'strong') out.push(...pezzi(t.tokens, { ...stile, grassetto: true }))
        else if (t.type === 'em') out.push(...pezzi(t.tokens, { ...stile, corsivo: true }))
        else if (t.type === 'br') out.push({ testo: '\n', ...stile })
        else if (t.type === 'codespan') out.push({ testo: decodifica(t.text), ...stile })
        else if (t.type === 'escape') out.push({ testo: decodifica(t.text), ...stile })
        else if (t.type === 'html') out.push({ testo: decodifica(String(t.text ?? '').replace(/<[^>]+>/g, '')), ...stile })
        else if (Array.isArray(t.tokens) && t.tokens.length) out.push(...pezzi(t.tokens, stile))
        else out.push({ testo: decodifica(t.text ?? t.raw ?? ''), ...stile })
    }
    return out
}

// Voci di un elenco nell'ordine del testo: { livello, segno: '1.' | '•' | '' (seguito della voce), pezzi }.
// Il testo che segue un sotto-elenco resta nella sua voce, senza segno.
function vociElenco(lista, livello, voci) {
    let numero = Number(lista.start) || 1
    for (const v of lista.items) {
        const segno = lista.ordered ? `${numero++}.` : '•'
        let primo = true
        let accumulo = []
        const scarica = (forza) => {
            const pz = pezzi(accumulo)
            accumulo = []
            if (!forza && !pz.some((x) => x.testo.trim())) return
            voci.push({ livello, segno: primo ? segno : '', pezzi: pz })
            primo = false
        }
        for (const x of v.tokens ?? []) {
            if (x.type === 'space') continue
            if (x.type === 'list') {
                scarica(primo)
                vociElenco(x, livello + 1, voci)
            } else {
                accumulo.push(...((x.type === 'paragraph' || x.type === 'text') && x.tokens ? x.tokens : [x]))
            }
        }
        scarica(primo)
    }
    return voci
}

// Blocchi: titolo (livello 1-3), paragrafo, elenco (ordinato o no, con voci a livelli), citazione, linea
export function blocchiDaMarkdown(markdown) {
    const blocchi = []
    for (const t of marked.lexer(String(markdown ?? ''))) {
        if (t.type === 'heading') blocchi.push({ tipo: 'titolo', livello: Math.min(t.depth, 3), pezzi: pezzi(t.tokens) })
        else if (t.type === 'paragraph' || t.type === 'text') blocchi.push({ tipo: 'paragrafo', pezzi: pezzi(t.tokens ?? [t]) })
        else if (t.type === 'list') blocchi.push({ tipo: 'elenco', voci: vociElenco(t, 0, []) })
        else if (t.type === 'blockquote') blocchi.push({ tipo: 'citazione', pezzi: pezzi((t.tokens ?? []).flatMap((x) => x.tokens ?? [x])) })
        else if (t.type === 'hr') blocchi.push({ tipo: 'linea' })
        else if (t.type === 'code') blocchi.push({ tipo: 'paragrafo', pezzi: [{ testo: t.text }] })
        else if (t.type === 'table') {
            const riga = (celle) => celle.flatMap((c, i) => [...(i ? [{ testo: ' – ' }] : []), ...pezzi(c.tokens)])
            blocchi.push({ tipo: 'paragrafo', pezzi: riga(t.header).map((p) => ({ ...p, grassetto: true })) })
            for (const r of t.rows) blocchi.push({ tipo: 'paragrafo', pezzi: riga(r) })
        }
    }
    return blocchi.filter((b) => b.tipo === 'linea' || b.tipo === 'elenco' || b.pezzi.some((p) => p.testo.trim()))
}

// Testo semplice di un elenco di pezzi (per il titolo del file e per copiare)
export const testoDi = (lista) => lista.map((p) => p.testo).join('')

// Nome del file: «Diffida al pagamento dei canoni - 08-10-2026»
export function nomeFileDocumento(tipo, estensione) {
    const base = String(tipo || 'Documento').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
    const oggi = new Date().toLocaleDateString('it-IT').replace(/\//g, '-')
    return `${base.charAt(0).toUpperCase()}${base.slice(1)} - ${oggi}.${estensione}`
}
