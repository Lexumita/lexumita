// src/lib/testi/percorso.js
//
// La difesa terminale dell'overlay. Vive nel browser, davanti a i18next, e non
// dipende da RLS, da vincoli o dal pannello: anche se tutto il resto fallisse,
// da qui non passa una scrittura capace di rompere una pagina.
//
// La regola è una sola: si può SOVRASCRIVERE un valore che esiste già, mai
// crearne uno nuovo, mai allungare un elenco, mai cambiare il tipo di un nodo.
//
// Perché conta davvero: in più pagine le icone stanno nel codice e sono legate
// agli elenchi tradotti per POSIZIONE (Home.jsx, PerAvvocati.jsx, PerFiduciari.jsx,
// PerProgettisti.jsx, Contatti.jsx). Un elenco che cresce di un elemento manda
// il codice a cercare l'icona numero N+1, che non esiste: schermata bianca.

const PEZZO = /([^.[\]]+)|\[(\d+)\]/g

/** Spezza 'lexai.features[0].t' in ['lexai','features',0,'t']. */
export function pezzi(percorso) {
  const out = []
  let m
  PEZZO.lastIndex = 0
  while ((m = PEZZO.exec(percorso)) !== null) {
    out.push(m[2] !== undefined ? Number(m[2]) : m[1])
  }
  return out
}

/** Legge un percorso; restituisce undefined se una tappa non esiste. */
export function leggiPercorso(radice, percorso) {
  let n = radice
  for (const p of pezzi(percorso)) {
    if (n === null || typeof n !== 'object') return undefined
    n = n[p]
  }
  return n
}

/**
 * Scrive SOLO se il percorso esiste già e il tipo non cambia.
 * Ritorna true se ha scritto, false se ha rifiutato (e non tocca nulla).
 */
export function scriviPercorsoEsistente(radice, percorso, valore) {
  const p = pezzi(percorso)
  if (p.length === 0) return false

  let n = radice
  for (let i = 0; i < p.length - 1; i++) {
    const passo = p[i]
    if (n === null || typeof n !== 'object') return false
    // Un indice numerico vuole un array, un nome vuole un oggetto: mai il contrario.
    if (typeof passo === 'number') {
      if (!Array.isArray(n) || passo < 0 || passo >= n.length) return false
    } else {
      if (Array.isArray(n) || !Object.prototype.hasOwnProperty.call(n, passo)) return false
    }
    n = n[passo]
  }

  const ultimo = p[p.length - 1]
  if (n === null || typeof n !== 'object') return false

  if (typeof ultimo === 'number') {
    if (!Array.isArray(n) || ultimo < 0 || ultimo >= n.length) return false
  } else {
    if (Array.isArray(n) || !Object.prototype.hasOwnProperty.call(n, ultimo)) return false
  }

  const attuale = n[ultimo]

  // Il tipo del nodo non cambia mai. I booleani del corpus (6 in tutto) arrivano
  // dal database come 'true'/'false' e vanno riconvertiti.
  if (typeof attuale === 'boolean') {
    if (valore !== 'true' && valore !== 'false' && typeof valore !== 'boolean') return false
    n[ultimo] = valore === true || valore === 'true'
    return true
  }
  if (typeof attuale !== 'string') return false
  if (typeof valore !== 'string') return false

  n[ultimo] = valore
  return true
}

/**
 * Applica una mappa piatta { 'percorso': 'valore' } a una copia della radice.
 * Ritorna { risultato, applicate, rifiutate }.
 */
export function applicaMappa(radice, mappa) {
  const risultato = structuredClone(radice)
  const rifiutate = []
  let applicate = 0
  for (const [percorso, valore] of Object.entries(mappa)) {
    if (scriviPercorsoEsistente(risultato, percorso, valore)) applicate++
    else rifiutate.push(percorso)
  }
  return { risultato, applicate, rifiutate }
}
