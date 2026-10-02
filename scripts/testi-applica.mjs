// scripts/testi-applica.mjs
//
// Riversa nei file del repo i testi scaricati dal pannello admin ("Scarica i file").
//   node scripts/testi-applica.mjs ~/Downloads/lexum-testi.json
//
// Perche serve: public/locales/it/** resta la BASE del sito. E' quello che Google
// legge, quello che si vede se il database non risponde, e il punto di partenza
// su cui il pannello sovrappone le modifiche. Se invecchia, peggiorano tutte e tre.
import fs from 'node:fs'
import path from 'node:path'

const sorgente = process.argv[2]
if (!sorgente) {
  console.error('Uso: node scripts/testi-applica.mjs <lexum-testi.json>')
  process.exit(1)
}

const radice = path.resolve(import.meta.dirname, '..')
const dati = JSON.parse(fs.readFileSync(sorgente, 'utf8'))
let scritti = 0, invariati = 0
const saltati = []

const lingua = 'it'
const cartella = path.join(radice, 'public/locales', lingua)
if (!dati[lingua]) {
  console.error(`manca la lingua ${lingua} nel file`)
  process.exit(1)
}

for (const [ns, contenuto] of Object.entries(dati[lingua])) {
  const file = path.join(cartella, `${ns}.json`)
  if (!fs.existsSync(file)) { saltati.push(ns); continue }
  const nuovo = JSON.stringify(contenuto, null, 2) + '\n'
  if (fs.readFileSync(file, 'utf8') === nuovo) { invariati++; continue }
  fs.writeFileSync(file, nuovo)
  scritti++
}

console.log(`riscritti ${scritti} file, ${invariati} gia allineati`)
if (saltati.length) {
  console.warn(`NON scritti (il file non esiste nel repo): ${saltati.join(', ')}`)
  console.warn('Sono sezioni presenti nel database ma non nel codice: creale a mano se servono.')
}
console.log('Ora controlla il diff con git prima di fare commit.')
