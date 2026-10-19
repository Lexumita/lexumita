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
// La stessa pagina chiesta di nuovo entro 2 secondi non si conta due volte (in sviluppo
// React fa partire gli effetti due volte; un layout può rimontarsi).
let ultima = { percorso: null, quando: 0 }

export function registraVisita(percorso) {
  const adesso = Date.now()
  if (percorso === ultima.percorso && adesso - ultima.quando < 2000) return
  ultima = { percorso, quando: adesso }
  let referrer = 'interno'
  let utm = null
  if (primaPagina) {
    primaPagina = false
    try { referrer = document.referrer ? new URL(document.referrer).hostname : null } catch { referrer = null }
    try { utm = new URLSearchParams(window.location.search).get('utm_source') } catch { utm = null }
  }
  // Le statistiche non devono mai disturbare la pagina: un errore si ignora.
  supabase.rpc('registra_visita', { p_percorso: percorso, p_referrer: referrer, p_utm: utm })
    .then(() => {}, () => {})
}
