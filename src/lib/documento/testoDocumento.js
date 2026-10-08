// src/lib/documento/testoDocumento.js
//
// 08-10-2026: documenti scritti da Lex in Banca Dati (modalità atto). Il testo arriva in Markdown: il
// documento, poi una riga «---» e le «Note per la revisione» per chi firma. Qui si separano le due parti e
// il documento diventa una lista di blocchi semplici, usata sia per il file Word sia per il PDF.

import { marked } from 'marked'

const RE_TITOLO_NOTE = /^\s{0,3}(?:#{1,6}\s*)?(?:\*\*)?\s*Note per la revisione\b/i
const RE_LINEA = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/

// { corpo, note, coda }: le note non finiscono nel file da firmare; coda è la parte delle note com'era
// (riga «---» e titolo compresi), per ricomporre il testo dopo una modifica del documento
export function separaNote(markdown) {
    const righe = String(markdown ?? '').split('\n')
    const i = righe.findIndex((r) => RE_TITOLO_NOTE.test(r))
    if (i < 0) return { corpo: righe.join('\n').trim(), note: '', coda: '' }
    let fine = i
    while (fine > 0 && /^\s*$/.test(righe[fine - 1])) fine--
    if (fine > 0 && RE_LINEA.test(righe[fine - 1])) fine--
    return { corpo: righe.slice(0, fine).join('\n').trim(), note: righe.slice(i + 1).join('\n').trim(), coda: righe.slice(fine).join('\n').trim() }
}

// Il testo intero dopo una modifica del documento: documento nuovo e note di prima
export const ricomponi = (corpo, coda) => (coda ? `${corpo.trim()}\n\n${coda}\n` : corpo.trim())

// Segnaposto da completare: [NOME E COGNOME DEL CONDUTTORE], [IMPORTO]... In maiuscolo e con almeno una
// lettera: «[Luogo]» o «[12]» non lo sono.
const RE_SEGNAPOSTO = /\[[A-ZÀ-Ý0-9][^[\]\n]{1,150}\]/g
const eSegnaposto = (s) => s === s.toLocaleUpperCase('it-IT') && /[A-ZÀ-Ý]/.test(s)

export function segnaposti(markdown) {
    const trovati = String(markdown ?? '').match(RE_SEGNAPOSTO) ?? []
    return [...new Set(trovati.filter(eSegnaposto))]
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

// ── Segnaposto numerati: «Compila con i dati di una pratica / di un mandato» (08-10-2026) ──
// Ogni segnaposto ha il suo numero nell'ordine del documento, perché lo stesso testo può indicare
// persone diverse in punti diversi: «[NOME E COGNOME]» del legale rappresentante del cliente e quello
// dell'avvocato che firma. I numeri si danno sui pezzi dei blocchi, gli stessi che si vedono nel foglio
// e finiscono in Word e PDF: un segnaposto spezzato fra due pezzi non si conta e resta da completare.

const mappaBlocchi = (blocchi, f) => blocchi.map((b) => (b.tipo === 'elenco'
    ? { ...b, voci: b.voci.map((v) => ({ ...v, pezzi: f(v.pezzi) })) }
    : b.pezzi ? { ...b, pezzi: f(b.pezzi) } : b))

// { blocchi, segnaposti }: ogni pezzo ha `segmenti` [{ testo } | { segnaposto, n }];
// segnaposti è l'elenco [{ n, segnaposto }] nell'ordine del documento
export function numeraSegnaposti(blocchi) {
    let n = 0
    const elenco = []
    const numerati = mappaBlocchi(blocchi, (pezzi) => pezzi.map((p) => {
        const segmenti = []
        let ultimo = 0
        for (const m of p.testo.matchAll(RE_SEGNAPOSTO)) {
            if (!eSegnaposto(m[0])) continue
            if (m.index > ultimo) segmenti.push({ testo: p.testo.slice(ultimo, m.index) })
            n += 1
            segmenti.push({ segnaposto: m[0], n })
            elenco.push({ n, segnaposto: m[0] })
            ultimo = m.index + m[0].length
        }
        if (ultimo < p.testo.length) segmenti.push({ testo: p.testo.slice(ultimo) })
        return { ...p, segmenti }
    }))
    return { blocchi: numerati, segnaposti: elenco }
}

// Il documento come testo semplice con il numero accanto a ogni segnaposto, «[NOME E COGNOME]⟨3⟩»:
// è quello che legge il modello per decidere gli abbinamenti
export function testoNumerato(numerati) {
    const riga = (pezzi) => pezzi.map((p) => p.segmenti.map((s) => s.testo ?? `${s.segnaposto}⟨${s.n}⟩`).join('')).join('')
    const righe = []
    for (const b of numerati) {
        if (b.tipo === 'titolo') righe.push(`${'#'.repeat(b.livello)} ${riga(b.pezzi)}`)
        else if (b.tipo === 'linea') righe.push('---')
        else if (b.tipo === 'elenco') {
            for (const v of b.voci) righe.push(`${'  '.repeat(v.livello)}${v.segno ? `${v.segno} ` : ''}${riga(v.pezzi)}`)
        } else if (b.tipo === 'citazione') righe.push(`> ${riga(b.pezzi)}`)
        else righe.push(riga(b.pezzi))
    }
    return righe.join('\n\n')
}

// I blocchi con i valori al posto dei segnaposto compilati ({ [n]: 'Mario Rossi' }), per Word, PDF e copia
export function blocchiCompilati(numerati, valori = {}) {
    return mappaBlocchi(numerati, (pezzi) => pezzi.map((p) => ({
        ...p,
        testo: p.segmenti ? p.segmenti.map((s) => s.testo ?? valori[s.n] ?? s.segnaposto).join('') : p.testo,
    })))
}

// Nome del file: «Diffida al pagamento dei canoni - 08-10-2026»
export function nomeFileDocumento(tipo, estensione) {
    const base = String(tipo || 'Documento').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
    const oggi = new Date().toLocaleDateString('it-IT').replace(/\//g, '-')
    return `${base.charAt(0).toUpperCase()}${base.slice(1)} - ${oggi}.${estensione}`
}

// ── Correzioni e modifiche a mano (08-10-2026) ──
// Prima di correggere, i dati della compilazione (in verde) entrano nel testo al posto dei loro segnaposto.
// I segnaposto si contano sul testo come sui pezzi del foglio; se i due conti non coincidono (un segnaposto
// spezzato da un grassetto) si scrivono solo quelli che hanno lo stesso valore in tutti i punti.
const proteggi = (v) => String(v).replace(/([\\`*_[\]])/g, '\\$1')

export function cuociValori(corpo, segnaposti, valori = {}) {
    if (!segnaposti.some((s) => valori[s.n] != null)) return corpo
    const trovati = [...corpo.matchAll(RE_SEGNAPOSTO)].filter((m) => eSegnaposto(m[0]))
    if (trovati.length === segnaposti.length && trovati.every((m, i) => m[0] === segnaposti[i].segnaposto)) {
        let out = ''
        let ultimo = 0
        trovati.forEach((m, i) => {
            const v = valori[segnaposti[i].n]
            out += corpo.slice(ultimo, m.index) + (v != null ? proteggi(v) : m[0])
            ultimo = m.index + m[0].length
        })
        return out + corpo.slice(ultimo)
    }
    let out = corpo
    for (const testo of new Set(segnaposti.map((s) => s.segnaposto))) {
        const punti = segnaposti.filter((s) => s.segnaposto === testo)
        const v = valori[punti[0].n]
        if (v != null && punti.every((s) => valori[s.n] === v)) out = out.split(testo).join(proteggi(v))
    }
    return out
}

// Le sostituzioni della correzione una dopo l'altra (come in lex-correggi-documento); quelle il cui testo
// non c'è più si saltano
export function applicaSostituzioni(testo, sostituzioni = []) {
    let t = testo
    let applicate = 0
    for (const s of sostituzioni) {
        if (!s?.trova || !t.includes(s.trova)) continue
        t = s.tutte ? t.split(s.trova).join(s.sostituisci ?? '') : t.replace(s.trova, () => s.sostituisci ?? '')
        applicate++
    }
    return { testo: t, applicate }
}
