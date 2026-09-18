// src/lib/contatoriAdmin.js
//
// Contatori dell'area admin (Dashboard e Utenti) da UNA sola fonte: la
// funzione admin_contatori() nel DB. Prima ogni pagina contava per conto suo
// e i numeri non tornavano fra loro. Lo stato degli abbonamenti il DB lo
// deriva dalla data di scadenza, non dal campo memorizzato.

import { supabase } from '@/lib/supabase'

// Ordine ed etichette dei riquadri per ruolo. Quali ruoli sono
// "professionisti" lo decide il DB (chiavi di `professionisti`).
export const RUOLI = [
  { id: 'avvocato',       label: 'Avvocati',       uno: 'avvocato',       molti: 'avvocati',       colorClass: 'text-oro' },
  { id: 'commercialista', label: 'Commercialisti', uno: 'commercialista', molti: 'commercialisti', colorClass: 'text-oro' },
  { id: 'cliente',        label: 'Clienti',        uno: 'cliente',        molti: 'clienti',        colorClass: 'text-salvia' },
  { id: 'commerciale',    label: 'Commerciali',    uno: 'commerciale',    molti: 'commerciali',    colorClass: 'text-amber-400' },
  { id: 'user',           label: 'User',           uno: 'user',           molti: 'user',           colorClass: 'text-nebbia/40' },
  { id: 'admin',          label: 'Admin',          uno: 'admin',          molti: 'admin',          colorClass: 'text-nebbia/60' },
]

export async function caricaContatoriAdmin() {
  const { data, error } = await supabase.rpc('admin_contatori')
  if (error) throw error
  return data
}

// Un riquadro per ogni ruolo presente: prima quelli noti nell'ordine di RUOLI,
// poi eventuali ruoli nuovi, così la somma fa sempre il totale.
export function riquadriPerRuolo(c) {
  const perRuolo = c?.per_ruolo ?? {}
  const noti = RUOLI.map(r => ({ ...r, n: perRuolo[r.id] ?? 0 }))
  const altri = Object.keys(perRuolo)
    .filter(id => !RUOLI.some(r => r.id === id))
    .map(id => ({ id, label: id, uno: id, molti: id, colorClass: 'text-nebbia/40', n: perRuolo[id] }))
  return [...noti, ...altri]
}

// Stati degli abbonamenti sommati su tutti i ruoli professionali
export function totaliProfessionisti(c) {
  const t = { totale: 0, attivi: 0, in_scadenza: 0, in_grazia: 0, scaduti: 0, senza_piano: 0 }
  for (const s of Object.values(c?.professionisti ?? {}))
    for (const k of Object.keys(t)) t[k] += s[k] ?? 0
  return t
}

// "1 attivo · 1 scaduto": le voci sommate fanno il totale del ruolo
// (in_scadenza è già dentro "attivi", quindi non si ripete)
export function descriviStati(s) {
  if (!s?.totale) return null
  const parti = []
  if (s.attivi) parti.push(`${s.attivi} ${s.attivi === 1 ? 'attivo' : 'attivi'}`)
  if (s.in_grazia) parti.push(`${s.in_grazia} in grazia`)
  if (s.scaduti) parti.push(`${s.scaduti} ${s.scaduti === 1 ? 'scaduto' : 'scaduti'}`)
  if (s.senza_piano) parti.push(`${s.senza_piano} senza piano`)
  return parti.join(' · ')
}

// "7 professionisti · 10 clienti · 1 commerciale · 65 user · 3 admin": la composizione del totale
export function composizioneIscritti(c) {
  const prof = c?.professionisti ?? {}
  const nProf = totaliProfessionisti(c).totale
  const parti = [`${nProf} ${nProf === 1 ? 'professionista' : 'professionisti'}`]
  for (const r of riquadriPerRuolo(c)) {
    if (r.id in prof || !r.n) continue
    parti.push(`${r.n} ${r.n === 1 ? r.uno : r.molti}`)
  }
  return parti.join(' · ')
}

export function formattaImporto(importo, valuta) {
  const n = Number(importo ?? 0)
  const decimali = Number.isInteger(n) ? 0 : 2
  return new Intl.NumberFormat(valuta === 'CHF' ? 'de-CH' : 'it-IT', {
    style: 'currency', currency: valuta, minimumFractionDigits: decimali, maximumFractionDigits: decimali,
  }).format(n)
}
