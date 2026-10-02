// scripts/testi-elenco.mjs
// Rigenera src/lib/testi/elenco-ns.js leggendo public/locales/it.
// Va rilanciato quando si aggiunge o si toglie un file di traduzione.
//   node scripts/testi-elenco.mjs
import fs from 'node:fs'
import path from 'node:path'

const radice = path.resolve(import.meta.dirname, '..')
const ns = fs.readdirSync(path.join(radice, 'public/locales/it'))
  .filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).sort()

const testo = `// src/lib/testi/elenco-ns.js
//
// GENERATO da: node scripts/testi-elenco.mjs
// Il browser non puo elencare una cartella, quindi i nomi dei file di traduzione
// vanno scritti qui. Se aggiungi un namespace nuovo, rigenera questo file:
// altrimenti la sincronizzazione dal codice non lo vede e il pannello non lo mostra.

export const ELENCO_NS = [
${ns.map(n => `  ${JSON.stringify(n)},`).join('\n')}
]
`
fs.writeFileSync(path.join(radice, 'src/lib/testi/elenco-ns.js'), testo)
console.log(`elenco-ns.js rigenerato: ${ns.length} namespace`)

// Un namespace che non sta nel guscio (src/i18n/index.js) non entra nel bundle:
// si scarica dalla rete quando serve. Per la vetrina sarebbe un lampo di testo
// vuoto: meglio saperlo subito.
const guscio = fs.readFileSync(path.join(radice, 'src/i18n/index.js'), 'utf8')
const fuori = ns.filter(n => !new RegExp(`['"]${n}['"]`).test(guscio))
if (fuori.length) {
  console.warn(`  NB: fuori dal guscio (caricati su richiesta): ${fuori.join(', ')}`)
}
