// src/lib/visite.js
//
// 19-10-2026: contatore delle visite della vetrina (pannello admin → Metriche).
// A ogni pagina vista si registra solo l'indirizzo della pagina, il giorno e il canale di
// provenienza. Niente cookie, niente dati salvati nel browser, niente dati personali.
// La prima pagina della visita porta con sé il dominio di chi ha rimandato qui (instagram.com,
// google.it…) o l'utm_source del collegamento; le pagine dopo, nella stessa scheda, sono
// navigazione interna. Il canale lo decide il database (provenienza_visita).

import { supabase } from '@/lib/supabase'

let primaPagina = true
// 06-11-2026: le visite che arrivano dalle mail o senza provenienza si contano solo dopo un gesto vero (mouse,
// scorrimento, tocco, tastiera). I filtri antivirus della posta aprono ogni link della mail da soli e non fanno
// niente: il 05/11 avevano gonfiato le visite (privacy, iscrizione e home quasi pari, 24 passaggi a una seconda
// pagina su 3.883). Chi arriva da Google, dalle AI, dai social o da un altro sito si conta subito, come prima.
let aspetta = false
let gestoFatto = false
const coda = []
const GESTI = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'wheel', 'touchstart']

function invia(args) {
  if (aspetta && !gestoFatto) { coda.push(args); return }
  // Le statistiche non devono mai disturbare la pagina: un errore si ignora.
  supabase.rpc('registra_visita', args).then(() => {}, () => {})
}

function aspettaUnGesto() {
  aspetta = true
  const via = () => {
    GESTI.forEach(g => window.removeEventListener(g, via, true))
    gestoFatto = true
    coda.splice(0).forEach(invia)
  }
  GESTI.forEach(g => window.addEventListener(g, via, { capture: true, passive: true }))
}

// Un altro sito (Google, un'AI, un social) ha mandato qui la persona: non è un link aperto da un filtro della posta
function daFuori(referrer) {
  return !!referrer && referrer !== window.location.hostname
}
// La stessa pagina chiesta di nuovo entro 2 secondi non si conta due volte (in sviluppo
// React fa partire gli effetti due volte; un layout può rimontarsi).
let ultima = { percorso: null, quando: 0 }

// 03-11-2026: non si contano le prove in locale né i browser automatici che si dichiarano tali
// (gli antivirus delle mail che aprono ogni link, in parte). La stessa regola vale per gli eventi.
function daNonContare() {
  try {
    return /^(localhost|127\.|\[::1\])/.test(window.location.hostname) || navigator.webdriver === true
  } catch { return false }
}

export function registraVisita(percorso) {
  if (daNonContare()) return
  const adesso = Date.now()
  if (percorso === ultima.percorso && adesso - ultima.quando < 2000) return
  ultima = { percorso, quando: adesso }
  let referrer = 'interno'
  let utm = null
  if (primaPagina) {
    primaPagina = false
    try { referrer = document.referrer ? new URL(document.referrer).hostname : null } catch { referrer = null }
    try { utm = new URLSearchParams(window.location.search).get('utm_source') } catch { utm = null }
    if (utm === 'email' || (!utm && !daFuori(referrer))) aspettaUnGesto()
  }
  invia({ p_percorso: percorso, p_referrer: referrer, p_utm: utm })
}

// Un gesto che vale la pena contare, come una pagina finta (03-11-2026): /strumenti/fattura/documento
// = un documento creato con uno strumento gratuito. Compare nelle pagine più viste.
export function registraEvento(percorso) {
  if (daNonContare()) return
  invia({ p_percorso: percorso, p_referrer: 'interno', p_utm: null })
}
