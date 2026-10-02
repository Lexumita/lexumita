// src/lib/testi/forma.js
//
// Dà forma ai testi: appiattisce i JSON annidati in percorsi leggibili,
// li ricompone, e classifica ogni frase per capire cosa si può cambiare.
// Lo usano sia la sincronizzazione dal codice sia lo scarico dei file.
//
// Lexum IT ha una sola lingua: l'italiano. Il resto è come su Lexum CH.

import { pezzi } from './percorso.js'

export const LINGUA = 'it'
export const LINGUE = [LINGUA]

// ── Le due schede del pannello ──────────────────────────────────────────────
// Per ora esistono solo i testi della vetrina. La scheda Backend arriverà
// quando l'area riservata passerà ai file di traduzione.
export const NS_VETRINA = [
  'home', 'per_avvocati', 'per_commercialisti', 'contatti', 'privacy', 'termini',
  'lex_ai', 'lex_demo', 'archivio_demo', 'archivio_ricerca_demo',
  'common', 'comp_footer', 'comp_chat_widget',
]

const ETICHETTE = {
  home: 'Home', per_avvocati: 'Per avvocati', per_commercialisti: 'Per commercialisti',
  contatti: 'Contatti', privacy: 'Informativa privacy', termini: 'Termini di servizio',
  lex_ai: 'Dimostrazione Lex', lex_demo: 'Dimostrazione Lex per i clienti',
  archivio_demo: 'Dimostrazione archivio', archivio_ricerca_demo: 'Dimostrazione ricerca in archivio',
  common: 'Menu in alto', comp_footer: 'Piè di pagina', comp_chat_widget: 'Riquadro «Parla con noi»',
}

const AREE = [
  ['comp_layout_', 'Menu · '], ['comp_modal_', 'Finestra · '], ['comp_', 'Componente · '],
  ['avv_', 'Avvocato · '], ['comm_', 'Commercialista · '], ['cli_', 'Portale cliente · '],
  ['user_', 'Utente · '],
]

export function etichettaNs(ns) {
  if (ETICHETTE[ns]) return ETICHETTE[ns]
  for (const [pre, testa] of AREE) {
    if (ns.startsWith(pre)) {
      const resto = ns.slice(pre.length).replace(/_/g, ' ')
      return testa + resto.charAt(0).toUpperCase() + resto.slice(1)
    }
  }
  const r = ns.replace(/_/g, ' ')
  return r.charAt(0).toUpperCase() + r.slice(1)
}

export const gruppoNs = (ns) => (NS_VETRINA.includes(ns) ? 'vetrina' : 'backend')
export const ordineNs = (ns) => {
  const i = NS_VETRINA.indexOf(ns)
  return i >= 0 ? i : 100
}

// ── Appiattire e ricomporre ─────────────────────────────────────────────────

/** { a: { b: [ { c: 'x' } ] } }  →  { 'a.b[0].c': 'x' }, nell'ordine del file. */
export function appiattisci(nodo, prefisso = '', fuori = {}) {
  if (Array.isArray(nodo)) {
    nodo.forEach((v, i) => appiattisci(v, `${prefisso}[${i}]`, fuori))
    return fuori
  }
  if (nodo !== null && typeof nodo === 'object') {
    for (const k of Object.keys(nodo)) {
      appiattisci(nodo[k], prefisso ? `${prefisso}.${k}` : k, fuori)
    }
    return fuori
  }
  fuori[prefisso] = nodo
  return fuori
}

/** L'inverso: da [{percorso, valore}] ordinati torna l'oggetto annidato. */
export function ricomponi(voci) {
  const radice = {}
  for (const { percorso, valore } of voci) {
    const p = pezzi(percorso)
    let n = radice
    for (let i = 0; i < p.length - 1; i++) {
      const passo = p[i]
      const prossimo = p[i + 1]
      if (n[passo] === undefined) n[passo] = typeof prossimo === 'number' ? [] : {}
      n = n[passo]
    }
    n[p[p.length - 1]] = valore
  }
  return radice
}

// ── Classificazione ─────────────────────────────────────────────────────────
// Su CH un «valore tecnico» (enum) si riconosce perché è la stessa parola
// minuscola nelle tre lingue. Con una lingua sola quel segnale non c'è: nella
// vetrina IT i JSON contengono solo testo da leggere (icone, colori e percorsi
// restano nel codice), quindi ogni frase è 'testo', o 'booleano' se lo è.

const RE_VAR = /\{\{\s*([A-Za-z0-9_]+)/g
const RE_TAG_APERTO = /<\s*([A-Za-z0-9_]+)\s*>/g

const estrai = (testo, re, distinti) => {
  const out = []
  re.lastIndex = 0
  let m
  while ((m = re.exec(testo)) !== null) out.push(m[1])
  const ord = out.sort()
  return distinti ? [...new Set(ord)] : ord
}

/** La scheda di una frase: cosa è, cosa deve restare uguale, quanto può crescere. */
export function classifica(percorso, ordine, it) {
  const chiusura = percorso.match(/^(.*)\[(\d+)\](?:\.[^.[\]]+)?$/)
  const base = {
    percorso,
    ordine,
    array_padre: chiusura ? chiusura[1] : null,
    array_indice: chiusura ? Number(chiusura[2]) : null,
    it: typeof it === 'boolean' ? String(it) : it,
  }

  if (typeof it === 'boolean') {
    return { ...base, tipo: 'booleano', variabili: [], tag: [], obbligatoria: true, max_caratteri: 5 }
  }

  const testo = String(it ?? '')
  return {
    ...base,
    tipo: 'testo',
    variabili: estrai(testo, RE_VAR, true),
    tag: estrai(testo, RE_TAG_APERTO, false),
    obbligatoria: testo !== '',
    // Spazio per respirare, ma non abbastanza per incollare un romanzo
    // dentro l'etichetta di un pulsante.
    max_caratteri: Math.max(120, Math.ceil(testo.length * 3)),
  }
}

// ── Dove si vede, questa sezione ────────────────────────────────────────────
const ROTTE = {
  home: '/', per_avvocati: '/per-avvocati', per_commercialisti: '/per-commercialisti',
  contatti: '/contatti', privacy: '/privacy', termini: '/termini',
  common: '/', comp_footer: '/', comp_chat_widget: '/',
  lex_ai: '/', lex_demo: '/', archivio_demo: '/', archivio_ricerca_demo: '/per-avvocati',
}

/** L'indirizzo dove guardare le modifiche non ancora salvate. null se non c'è. */
export function rottaAnteprima(ns) {
  if (!(ns in ROTTE)) return null
  return `${ROTTE[ns]}?testi_bozza=1`
}
