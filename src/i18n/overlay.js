// src/i18n/overlay.js
//
// Sovrappone ai testi spediti col deploy le frasi cambiate dal pannello admin.
//
// Tre proprietà non negoziabili:
//  1. Non blocca mai. La pagina si disegna con i testi del deploy e l'overlay
//     arriva dopo; i18next ridisegna da solo (bindI18nStore: 'added removed').
//  2. Non rompe mai. Ogni scrittura passa da scriviPercorsoEsistente: se il
//     codice è cambiato e un percorso non c'è più, quella frase viene saltata.
//  3. Non serve. Se Storage è irraggiungibile — progetto in pausa, rete, un
//     blocco pubblicità che filtra supabase.co — il sito è esattamente quello
//     dell'ultimo deploy. Nessun errore a schermo, nessuna chiave grezza.

import { applicaMappa } from '@/lib/testi/percorso'

const BASE = import.meta.env.VITE_SUPABASE_URL
const URL_OVERLAY = (lng) => `${BASE}/storage/v1/object/public/testi/overlay/${lng}.json`

// Versionata: se un domani cambio il formato, le cache vecchie non avvelenano.
const CHIAVE = (lng) => `lexum_overlay_v1_${lng}`
const CHIAVE_BOZZA = 'lexum_testi_bozza'
const TTL = 7 * 24 * 60 * 60 * 1000   // oltre una settimana la cache si butta
const ATTESA = 2500                    // ms: oltre, si rinuncia e si tiene il deploy

const mappe = {}        // lingua -> { 'ns.percorso': 'valore' }
const indici = {}       // lingua -> { ns: { percorso: valore } }
let bozzeAttive = false

const silenzio = (f, fallback) => { try { return f() } catch { return fallback } }

/** Raggruppa la mappa piatta per namespace, una volta sola. */
function indicizza(lng) {
  const per = {}
  for (const [k, v] of Object.entries(mappe[lng] || {})) {
    const taglio = k.indexOf('.')
    if (taglio < 1) continue
    const ns = k.slice(0, taglio)
    ;(per[ns] ??= {})[k.slice(taglio + 1)] = v
  }
  indici[lng] = per
}

/** Applica l'overlay a un namespace già caricato. Se non c'è ancora, non fa nulla. */
function applicaNs(i18n, lng, ns) {
  const parziale = indici[lng]?.[ns]
  if (!parziale || Object.keys(parziale).length === 0) return

  // Se la base non è ancora arrivata NON si scrive: scriveremmo il solo delta
  // al posto dell'intero namespace, svuotando la pagina.
  const base = i18n.getResourceBundle(lng, ns)
  if (!base || typeof base !== 'object') return

  const { risultato, applicate, rifiutate } = applicaMappa(base, parziale)
  if (applicate === 0) return
  i18n.addResourceBundle(lng, ns, risultato, false, true)

  if (rifiutate.length && import.meta.env.DEV) {
    console.warn(`[testi] ${lng}/${ns}: ${rifiutate.length} frasi saltate ` +
                 `(il codice è cambiato sotto di loro):`, rifiutate)
  }
}

function applicaTutto(i18n, lng) {
  const per = indici[lng]
  if (!per) return
  for (const ns of Object.keys(per)) applicaNs(i18n, lng, ns)
}

/** Le bozze del pannello: vivono solo in questo browser, mai sul server. */
function fondiBozze(lng) {
  if (!bozzeAttive) return
  const b = silenzio(() => JSON.parse(localStorage.getItem(CHIAVE_BOZZA) || '{}'), {})
  if (b && b[lng]) mappe[lng] = { ...(mappe[lng] || {}), ...b[lng] }
}

async function scarica(i18n, lng) {
  const taglia = new AbortController()
  const timer = setTimeout(() => taglia.abort(), ATTESA)
  try {
    const r = await fetch(URL_OVERLAY(lng), { signal: taglia.signal, cache: 'no-cache' })
    if (!r.ok) return                       // 404 = non è mai stato pubblicato nulla
    const dati = await r.json()
    if (!dati || typeof dati !== 'object') return
    mappe[lng] = dati
    fondiBozze(lng)
    indicizza(lng)
    applicaTutto(i18n, lng)
    silenzio(() => localStorage.setItem(CHIAVE(lng),
      JSON.stringify({ quando: Date.now(), dati })))
  } catch {
    // Rete assente, tempo scaduto, blocco pubblicità: si tiene il deploy.
  } finally {
    clearTimeout(timer)
  }
}

function daCache(lng) {
  const grezzo = silenzio(() => localStorage.getItem(CHIAVE(lng)), null)
  if (!grezzo) return false
  const c = silenzio(() => JSON.parse(grezzo), null)
  if (!c || typeof c.quando !== 'number' || Date.now() - c.quando > TTL) {
    silenzio(() => localStorage.removeItem(CHIAVE(lng)))
    return false
  }
  mappe[lng] = c.dati || {}
  return true
}

export function avviaOverlay(i18n) {
  if (typeof window === 'undefined' || !BASE) return

  bozzeAttive = silenzio(() => {
    if (new URLSearchParams(window.location.search).get('testi_bozza') === '1') {
      sessionStorage.setItem('lexum_testi_bozza_on', '1')
    }
    return sessionStorage.getItem('lexum_testi_bozza_on') === '1'
  }, false)

  const prepara = (lng) => {
    if (daCache(lng)) { fondiBozze(lng); indicizza(lng); applicaTutto(i18n, lng) }
    scarica(i18n, lng)
  }

  prepara(i18n.language || 'it')

  // L'aggancio è PERMANENTE, non una passata dopo l'avvio: i namespace delle
  // pagine interne si caricano su richiesta, molto dopo, e devono ricevere
  // l'overlay anche loro.
  i18n.on('loaded', (caricati) => {
    for (const lng of Object.keys(caricati || {})) {
      if (!indici[lng]) continue
      for (const ns of Object.keys(caricati[lng] || {})) applicaNs(i18n, lng, ns)
    }
  })

  i18n.on('languageChanged', (lng) => { if (!indici[lng]) prepara(lng); else applicaTutto(i18n, lng) })
}

/** Il pannello la chiama dopo un salvataggio: aggiorna senza ricaricare. */
export function aggiornaOverlayLocale(i18n, lng, mappa) {
  mappe[lng] = mappa || {}
  indicizza(lng)
  applicaTutto(i18n, lng)
  silenzio(() => localStorage.setItem(CHIAVE(lng),
    JSON.stringify({ quando: Date.now(), dati: mappe[lng] })))
}
