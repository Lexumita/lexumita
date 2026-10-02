// scripts/testi-controlla.mjs
//
// Controllo della vetrina dopo il passaggio a react-i18next.
//   node scripts/testi-controlla.mjs
//
// Fa due cose sui file convertiti (elenco FILE qui sotto):
//  1. Cerca testo italiano rimasto scritto a mano nel JSX: testi fra i tag,
//     attributi visibili (placeholder, alt, title, aria-label) e stringhe con
//     piu parole nel codice. Le eccezioni volute stanno in ECCEZIONI.
//  2. Controlla che ogni chiave chiamata con t('...') o <Trans i18nKey="...">
//     esista davvero nel JSON del suo namespace: una chiave mancante
//     comparirebbe a schermo grezza.
//
// Esce con codice 1 se trova qualcosa.
//
// Usa @babel/parser, che arriva gia con @vitejs/plugin-react.

import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@babel/parser'

const radice = path.resolve(import.meta.dirname, '..')

// File della vetrina convertiti → namespace di default (quello di useTranslation)
const FILE = [
  'src/pages/Home.jsx',
  'src/pages/PerAvvocati.jsx',
  'src/pages/PerCommercialisti.jsx',
  'src/pages/Contatti.jsx',
  'src/pages/PrivacyPolicy.jsx',
  'src/pages/TerminiServizio.jsx',
  'src/components/Navbar.jsx',
  'src/components/Footer.jsx',
  'src/components/ChatWidget.jsx',
  'src/components/LexAnimatedDemo.jsx',
  'src/components/ClientiLexAnimatedDemo.jsx',
  'src/components/ArchivioAnimatedDemo.jsx',
  'src/components/ArchivioRicercaAnimatedDemo.jsx',
]

// Testi che restano nel codice di proposito: marchi, sigle, simboli.
// Confronto esatto sul testo ripulito dagli spazi ai bordi.
const ECCEZIONI = new Set([
  'Lexum',            // alt del logo: è il marchio
  'Lex',              // nome del prodotto dentro le demo animate
  'Lex AI',
])

// Attributi JSX che finiscono a schermo (o ai lettori di schermo).
const ATTR_VISIBILI = new Set(['placeholder', 'alt', 'title', 'aria-label', 'label'])

// Attributi che contengono codice, non testo.
const ATTR_TECNICI = new Set(['className', 'to', 'href', 'src', 'type', 'name', 'id', 'key', 'rel',
  'target', 'variant', 'style', 'role', 'd', 'viewBox', 'fill', 'stroke', 'i18nKey', 'ns',
  'autoComplete', 'inputMode', 'method', 'accept', 'pattern', 'property', 'content'])

const HA_LETTERE = /[A-Za-zÀ-ÿ]{2,}/
// Parole che da sole sono classi Tailwind (senza trattino).
const CLASSI = new Set(['flex', 'grid', 'block', 'inline', 'hidden', 'relative', 'absolute', 'fixed',
  'sticky', 'uppercase', 'lowercase', 'capitalize', 'italic', 'truncate', 'underline', 'shrink',
  'grow', 'border', 'rounded', 'shadow', 'transition', 'group', 'peer', 'container', 'contents',
  'visible', 'invisible', 'static', 'antialiased', 'outline', 'resize', 'ring', 'blur', 'filter',
  'transform', 'isolate', 'table', 'prose', 'sr-only'])
const CSSOSO = (tok) => /[-:/[\]]/.test(tok) || CLASSI.has(tok) || !/[A-Za-zÀ-ÿ]/.test(tok)
  || /^-?\d+(\.\d+)?(px|rem|em|ms|s|vh|vw|deg)$/.test(tok)               // misure: '0px', '300ms'
// Una stringa di codice "sembra prosa" se ha almeno due parole e non è fatta
// soltanto di classi Tailwind, percorsi o selettori; o se ha lettere accentate.
const SEMBRA_PROSA = (s) => {
  const t = s.trim()
  if (/[{};]/.test(t) && /:\s*[^;]+;/.test(t)) return false        // un blocco CSS (<style>)
  if (/[àèéìòùÀÈÉÌÒÙ«»]/.test(t) && HA_LETTERE.test(t)) return true
  const tok = t.split(/\s+/).filter(Boolean)
  if (tok.length < 2) return false
  if (tok.every(CSSOSO)) return false
  return tok.filter(x => /[A-Za-zÀ-ÿ]{2,}/.test(x) && !CSSOSO(x)).length >= 2
}

function figli(nodo) {
  const out = []
  for (const k of Object.keys(nodo)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'extra' || k === 'leadingComments'
      || k === 'trailingComments' || k === 'innerComments') continue
    const v = nodo[k]
    if (Array.isArray(v)) v.forEach(x => x && typeof x.type === 'string' && out.push(x))
    else if (v && typeof v.type === 'string') out.push(v)
  }
  return out
}

function leggiJson(ns) {
  const f = path.join(radice, 'public/locales/it', `${ns}.json`)
  if (!fs.existsSync(f)) return null
  return JSON.parse(fs.readFileSync(f, 'utf8'))
}

function esiste(radiceJson, chiave) {
  let n = radiceJson
  for (const p of chiave.split('.')) {
    if (n === null || typeof n !== 'object' || !(p in n)) return false
    n = n[p]
  }
  return true
}

const problemi = []
let chiaviControllate = 0

for (const rel of FILE) {
  const file = path.join(radice, rel)
  const codice = fs.readFileSync(file, 'utf8')
  const ast = parse(codice, { sourceType: 'module', plugins: ['jsx'] })
  const riga = (n) => `${rel}:${n.loc.start.line}`

  // namespace di default del file: il primo useTranslation('ns')
  const m = codice.match(/useTranslation\(\s*['"]([\w]+)['"]/)
  const nsDefault = m ? m[1] : null

  const visita = (nodo, genitore, nonno) => {
    // 1a. testo fra i tag
    if (nodo.type === 'JSXText') {
      const t = nodo.value.replace(/\s+/g, ' ').trim()
      if (HA_LETTERE.test(t) && !ECCEZIONI.has(t)) problemi.push(`${riga(nodo)}  testo nel JSX: «${t}»`)
    }

    // 1b. attributi visibili
    if (nodo.type === 'JSXAttribute') {
      const nome = nodo.name?.name
      const v = nodo.value
      if (v?.type === 'StringLiteral' && ATTR_VISIBILI.has(nome) && HA_LETTERE.test(v.value)
        && !ECCEZIONI.has(v.value.trim())) {
        problemi.push(`${riga(nodo)}  attributo ${nome}: «${v.value}»`)
      }
      if (ATTR_TECNICI.has(nome)) return   // dentro non c'è testo da tradurre
    }

    // 1c. stringhe nel codice che sembrano prosa
    if (nodo.type === 'StringLiteral' || nodo.type === 'TemplateLiteral') {
      const testo = nodo.type === 'StringLiteral'
        ? nodo.value
        : nodo.quasis.map(q => q.value.cooked).join('{}')
      const eImport = genitore?.type === 'ImportDeclaration'
      const eArgT = genitore?.type === 'CallExpression'
        && (genitore.callee?.name === 't' || genitore.callee?.property?.name === 't'
          || genitore.callee?.name === 'useTranslation')
      const eChiaveOggetto = genitore?.type === 'ObjectProperty' && genitore.key === nodo
      const eConsole = genitore?.type === 'CallExpression' && genitore.callee?.object?.name === 'console'
      if (!eImport && !eArgT && !eChiaveOggetto && !eConsole && SEMBRA_PROSA(testo)
        && !ECCEZIONI.has(testo.trim())) {
        problemi.push(`${riga(nodo)}  stringa nel codice: «${testo.slice(0, 90)}»`)
      }
    }

    // 2. chiavi t('...') e <Trans i18nKey="...">
    let chiave = null, ns = nsDefault, dinamica = false
    if (nodo.type === 'CallExpression' && (nodo.callee?.name === 't' || nodo.callee?.property?.name === 't')) {
      const a = nodo.arguments[0]
      if (a?.type === 'StringLiteral') chiave = a.value
      else if (a?.type === 'TemplateLiteral') { chiave = a.quasis[0].value.cooked.replace(/\.$/, ''); dinamica = true }
      const opz = nodo.arguments[1]
      const nsOpz = opz?.type === 'ObjectExpression'
        && opz.properties.find(p => p.key?.name === 'ns' && p.value?.type === 'StringLiteral')
      if (nsOpz) ns = nsOpz.value.value
    }
    if (nodo.type === 'JSXOpeningElement' && nodo.name?.name === 'Trans') {
      const k = nodo.attributes.find(a => a.name?.name === 'i18nKey')
      if (k?.value?.type === 'StringLiteral') chiave = k.value.value
      else if (k?.value?.expression?.type === 'TemplateLiteral') {
        chiave = k.value.expression.quasis[0].value.cooked.replace(/\.$/, ''); dinamica = true
      }
      const n = nodo.attributes.find(a => a.name?.name === 'ns')
      if (n?.value?.type === 'StringLiteral') ns = n.value.value
    }
    if (chiave !== null) {
      if (chiave.includes(':')) [ns, chiave] = chiave.split(':')
      if (!(dinamica && chiave === '')) {
        chiaviControllate++
        const json = ns && leggiJson(ns)
        // per una chiave dinamica (`a.b.${x}`) basta che esista il prefisso
        const pref = dinamica ? chiave.replace(/\[$/, '').replace(/\.$/, '') : chiave
        if (!json) problemi.push(`${riga(nodo)}  namespace sconosciuto: ${ns}`)
        else if (pref && !esiste(json, pref)) problemi.push(`${riga(nodo)}  chiave mancante: ${ns}:${chiave}`)
      }
    }

    for (const f of figli(nodo)) visita(f, nodo, genitore)
  }
  visita(ast.program, null, null)
}

if (problemi.length) {
  console.log(problemi.join('\n'))
  console.log(`\n${problemi.length} problemi.`)
  process.exit(1)
}
console.log(`Nessun testo scritto a mano nei ${FILE.length} file della vetrina; ${chiaviControllate} chiavi controllate, tutte presenti.`)
