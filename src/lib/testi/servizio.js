// src/lib/testi/servizio.js
//
// Tutto ciò che il pannello "Testi" fa verso il database e verso Storage.
//
// Il gesto è UNO SOLO: salvi, e la frase va online. Non esiste un secondo
// passaggio di pubblicazione: ogni salvataggio ricompone l'overlay e lo
// carica subito. Lexum IT ha una sola lingua: overlay/it.json.

import { supabase } from '@/lib/supabase'
import i18n from '@/i18n'
import { aggiornaOverlayLocale } from '@/i18n/overlay'
import {
  LINGUA, NS_VETRINA, appiattisci, ricomponi, classifica,
  etichettaNs, gruppoNs, ordineNs,
} from './forma'

const SECONDI_CACHE = '30'   // quanto la rete tiene in memoria l'overlay

/** Carica su Storage l'overlay e lo applica anche qui, subito. */
async function pubblica(mappa) {
  const corpo = new Blob([JSON.stringify(mappa ?? {})], { type: 'application/json' })
  const { error } = await supabase.storage
    .from('testi')
    .upload(`overlay/${LINGUA}.json`, corpo, {
      upsert: true, contentType: 'application/json', cacheControl: SECONDI_CACHE,
    })
  if (error) throw new Error(`Salvato nel database, ma non è arrivato online: ${error.message}`)
  aggiornaOverlayLocale(i18n, LINGUA, mappa ?? {})
}

/** Salva una frase e la manda online. */
export async function salvaFrase(chiaveId, valore, vistoIl) {
  const { data, error } = await supabase.rpc('testi_salva', {
    p_chiave_id: chiaveId, p_valore: valore, p_visto_il: vistoIl,
  })
  if (error) throw new Error(error.message)
  await pubblica(data?.overlay ?? {})
  return data?.visto ?? null
}

/** Riporta una frase al testo che sta nel codice. */
export async function ripristinaFrase(chiaveId) {
  const { data, error } = await supabase.rpc('testi_ripristina', { p_chiave_id: chiaveId })
  if (error) throw new Error(error.message)
  await pubblica(data?.overlay ?? {})
  return { visto: data?.visto ?? null, valore: data?.valore ?? '' }
}

/** Le versioni precedenti di una frase, dalla più recente. */
export async function storicoFrase(chiaveId) {
  const { data, error } = await supabase.rpc('testi_storico_chiave', { p_chiave_id: chiaveId })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Rimette online una versione precedente della frase (passa dagli stessi controlli di Salva). */
export async function tornaAllaVersione(chiaveId, storicoId, vistoIl) {
  const { data, error } = await supabase.rpc('testi_torna_a', {
    p_chiave_id: chiaveId, p_storico_id: storicoId, p_visto_il: vistoIl,
  })
  if (error) throw new Error(error.message)
  await pubblica(data?.overlay ?? {})
  return { visto: data?.visto ?? null, valore: data?.valore ?? '' }
}

/** L'interruttore generale: spento, il sito torna all'ultimo deploy. */
export async function impostaAttivo(attivo) {
  const { data, error } = await supabase.rpc('testi_imposta_attivo', { p_attivo: attivo })
  if (error) throw new Error(error.message)
  await pubblica(data ?? {})
}

/**
 * Rilegge i testi dal codice (i file /locales già serviti da questo deploy) e
 * riallinea il catalogo. Le modifiche fatte dal pannello NON vengono toccate:
 * si sposta solo la base sotto di loro.
 */
export async function sincronizzaDalCodice(elencoNs, avanzamento) {
  const corpus = {}
  let fatti = 0

  for (const ns of elencoNs) {
    const r = await fetch(`/locales/${LINGUA}/${ns}.json`, { cache: 'no-cache' })
    if (!r.ok) throw new Error(`Non trovo /locales/${LINGUA}/${ns}.json`)
    corpus[ns] = appiattisci(await r.json())
    avanzamento?.(++fatti, elencoNs.length, `lettura ${ns}`)
  }

  const esito = { nuove: 0, base_aggiornata: 0, modifiche_tenute: 0, sparite: 0 }
  fatti = 0

  for (const ns of elencoNs) {
    const it = corpus[ns]
    const voci = Object.keys(it).map((percorso, i) => classifica(percorso, i, it[percorso]))

    const { data, error } = await supabase.rpc('testi_sincronizza_ns', {
      p_ns: ns, p_etichetta: etichettaNs(ns), p_gruppo: gruppoNs(ns),
      p_ordine: ordineNs(ns), p_voci: voci,
    })
    if (error) throw new Error(`${ns}: ${error.message}`)
    for (const k of Object.keys(esito)) esito[k] += data?.[k] ?? 0
    avanzamento?.(++fatti, elencoNs.length, `scrittura ${ns}`)
  }

  // Dopo una sincronizzazione l'overlay può essere cambiato (frasi spente,
  // basi riallineate): lo si ricompone e si ricarica.
  const { data } = await supabase.rpc('testi_overlay')
  await pubblica(data ?? {})
  return esito
}

/**
 * Scarica un file unico con TUTTI i testi correnti, pronto per essere riversato
 * nei file del repo con `node scripts/testi-applica.mjs <file>`.
 *
 * Serve perché i file restano la base che Google indica e che si vede se il
 * database non risponde: se invecchiano, peggiorano entrambe le cose.
 */
export async function esportaFile() {
  const { data, error } = await supabase.rpc('testi_tutti')
  if (error) throw new Error(error.message)

  const per = {}
  for (const r of data ?? []) {
    ;(per[r.ns] ??= []).push(r)
  }
  const fuori = { [LINGUA]: {} }
  for (const [ns, righe] of Object.entries(per)) {
    righe.sort((a, b) => a.ordine - b.ordine)
    fuori[LINGUA][ns] = ricomponi(righe.map(r => ({ percorso: r.percorso, valore: r.it })))
  }

  const blob = new Blob([JSON.stringify(fuori, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'lexum-testi.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)

  await supabase.rpc('testi_segna_export')
  return Object.keys(per).length
}

export const TUTTI_NS_VETRINA = NS_VETRINA
