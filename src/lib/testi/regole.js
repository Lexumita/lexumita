// src/lib/testi/regole.js
//
// Specchio in JavaScript della funzione SQL testi_valida.
// Serve al riscontro dal vivo mentre scrivi: l'ultima parola resta al database,
// che dice di no anche a chi provasse a scrivere fuori dal pannello.

const RE_VAR = /\{\{\s*([A-Za-z0-9_]+)/g
const RE_TAG_APERTO = /<\s*([A-Za-z0-9_]+)\s*>/g
const RE_TAG_ATTRIBUTI = /<\s*\/?\s*[A-Za-z0-9_]+\s+[^>]*>/

const raccogli = (testo, re, distinti) => {
  const out = []
  re.lastIndex = 0
  let m
  while ((m = re.exec(testo)) !== null) out.push(m[1])
  const ord = out.sort()
  return distinti ? [...new Set(ord)] : ord
}

const uguali = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])

/** Ritorna l'elenco (eventualmente vuoto) dei problemi. */
export function valida(chiave, valore) {
  const errs = []
  const v = valore ?? ''

  if (chiave.obbligatoria && v.trim() === '') {
    errs.push('il testo non può restare vuoto')
  }
  if (v.length > chiave.max_caratteri) {
    errs.push(`massimo ${chiave.max_caratteri} caratteri (ne hai scritti ${v.length})`)
  }
  if (chiave.tipo === 'booleano' && v !== 'true' && v !== 'false') {
    errs.push('valore tecnico: ammessi solo true o false')
  }
  if (chiave.tipo === 'enum' && !(chiave.enum_valori || []).includes(v)) {
    errs.push(`valore tecnico: ammessi solo ${(chiave.enum_valori || []).join(', ')}`)
  }

  const attesiVar = [...(chiave.variabili || [])].sort()
  if (!uguali(raccogli(v, RE_VAR, true), attesiVar)) {
    errs.push(`i segnaposto devono essere esattamente: ${attesiVar.join(', ') || 'nessuno'}`)
  }

  if (RE_TAG_ATTRIBUTI.test(v)) errs.push('i tag non possono avere attributi')
  const attesiTag = [...(chiave.tag || [])].sort()
  if (!uguali(raccogli(v, RE_TAG_APERTO, false), attesiTag)) {
    errs.push(`i tag devono essere esattamente: ${attesiTag.join(', ') || 'nessuno'}`)
  }

  return errs
}

/** Una riga d'aiuto sotto la casella: cosa DEVE restare nel testo. */
export function promemoria(chiave) {
  const p = []
  if (chiave.variabili?.length) p.push(chiave.variabili.map(x => `{{${x}}}`).join(' '))
  if (chiave.tag?.length) p.push([...new Set(chiave.tag)].map(x => `<${x}>`).join(' '))
  return p.join('  ·  ')
}
