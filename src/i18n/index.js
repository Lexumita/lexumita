// src/i18n/index.js
//
// I testi del sito stanno in public/locales/it/<namespace>.json (react-i18next),
// come su Lexum CH. Lexum IT ha UNA SOLA lingua: niente selettore, niente
// rilevamento. Il pannello admin «Testi» sovrappone a questi file le frasi
// cambiate (overlay.js).
//
// Differenza voluta rispetto a CH: i namespace del «guscio» (la vetrina) non si
// scaricano dalla rete all'avvio, entrano DENTRO il bundle. Così il primo
// disegno ha già tutte le frasi: mai una chiave grezza, mai un lampo di testo
// vuoto, nemmeno su una rete lenta. Gli stessi file restano serviti anche da
// /locales/it/*.json, perché il pannello li rilegge da lì («Rileggi dal codice»).
//
// Un namespace che non sta nel guscio (le pagine interne, in futuro) si scarica
// su richiesta con i18next-http-backend, come su CH.

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'
import { avviaOverlay } from './overlay'

export const LINGUA = 'it'

// Il guscio: tutti i file elencati qui entrano nel bundle.
export const NS_GUSCIO = [
  'common', 'comp_footer', 'comp_chat_widget',
  'home', 'per_avvocati', 'per_commercialisti', 'contatti', 'privacy', 'termini',
  'lex_ai', 'lex_demo', 'archivio_demo', 'archivio_ricerca_demo',
]

const FILE = import.meta.glob('/public/locales/it/*.json', { eager: true, import: 'default' })
const guscio = {}
for (const [percorso, contenuto] of Object.entries(FILE)) {
  const ns = percorso.split('/').pop().replace(/\.json$/, '')
  if (NS_GUSCIO.includes(ns)) guscio[ns] = contenuto
}

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: LINGUA,
    fallbackLng: LINGUA,
    supportedLngs: [LINGUA],
    load: 'currentOnly',

    resources: { [LINGUA]: guscio },
    // Il guscio arriva col bundle; il resto, se un giorno servirà, dalla rete.
    partialBundledLanguages: true,
    // Inizializzazione sincrona: le risorse ci sono già, il primo disegno le trova.
    initAsync: false,

    ns: NS_GUSCIO,
    defaultNS: 'common',

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      // Cache-busting: cambia a ogni build.
      queryStringParams: { v: typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev' },
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',   // ridisegna quando arriva l'overlay
    },
  })

// I testi cambiati dal pannello admin, sovrapposti a quelli del deploy.
// Non blocca l'avvio: se Storage non risponde resta il deploy.
avviaOverlay(i18n)

export default i18n
