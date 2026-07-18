// src/components/avvocato/BoxGoogleCalendar.jsx
//
// Sezione "Google Calendar" nel Profilo del professionista: collega/scollega
// l'account Google (flusso OAuth server-side), mostra lo stato e la visibilità
// verso i colleghi. I token restano lato server; qui si legge solo lo stato.

import { useState, useEffect } from 'react'
import { Calendar, Check, AlertCircle, Link2, Unlink, Loader2, Users, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const VISIBILITA = [
  { id: 'privato', label: 'Privato', desc: 'I colleghi non vedono nulla' },
  { id: 'occupato', label: 'Occupato', desc: 'I colleghi vedono solo le fasce occupate, senza dettagli' },
  { id: 'completo', label: 'Completo', desc: 'I colleghi vedono titolo e dettagli degli impegni' },
]

export default function BoxGoogleCalendar() {
  const [loading, setLoading] = useState(true)
  const [stato, setStato] = useState(null) // { connesso, google_email, visibilita }
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [banner, setBanner] = useState(null) // 'connesso' | 'errore'
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  async function carica() {
    const { data } = await supabase.rpc('mio_calendar_stato')
    setStato(Array.isArray(data) && data.length > 0 ? data[0] : null)
    setLoading(false)
  }

  async function sincronizza(silenzioso = false) {
    if (!silenzioso) { setSyncing(true); setSyncMsg('') }
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync')
      if (error) throw new Error(error.message)
      if (!data?.ok) throw new Error(data?.error ?? 'Errore')
      const tot = (data.creati ?? 0) + (data.aggiornati ?? 0)
      setSyncMsg(tot > 0
        ? `Sincronizzati ${tot} eventi${data.eliminati ? `, rimossi ${data.eliminati}` : ''}.`
        : 'Agenda già aggiornata.')
    } catch (e) { if (!silenzioso) setSyncMsg('Sincronizzazione non riuscita.') }
    finally { if (!silenzioso) setSyncing(false) }
  }

  useEffect(() => {
    // Gestione ritorno dal callback OAuth (?calendar=connesso|errore)
    const p = new URLSearchParams(window.location.search)
    const c = p.get('calendar')
    if (c === 'connesso' || c === 'errore') {
      setBanner(c)
      const url = new URL(window.location.href)
      url.searchParams.delete('calendar')
      window.history.replaceState({}, '', url.toString())
    }
    // Al primo collegamento, avvia una sincronizzazione iniziale silenziosa
    carica().then(() => { if (c === 'connesso') sincronizza(true) })
  }, [])

  async function collega() {
    setBusy(true); setErr('')
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-connect')
      if (error) throw new Error(error.message)
      if (!data?.ok || !data.url) throw new Error(data?.error ?? 'Errore avvio collegamento')
      window.location.href = data.url
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  async function scollega() {
    if (!confirm('Scollegare Google Calendar? La sincronizzazione verrà interrotta.')) return
    setBusy(true); setErr('')
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-disconnect')
      if (error) throw new Error(error.message)
      if (!data?.ok) throw new Error(data?.error ?? 'Errore')
      setBanner(null)
      await carica()
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  async function cambiaVisibilita(v) {
    const prec = stato?.visibilita
    setStato(s => ({ ...s, visibilita: v }))
    const { error } = await supabase.rpc('imposta_visibilita_calendario', { p_visibilita: v })
    if (error) { setErr(error.message); setStato(s => ({ ...s, visibilita: prec })) }
  }

  const connesso = !!stato?.connesso

  return (
    <div className="bg-slate border border-white/5 p-6 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-oro/60" />
          <p className="section-label !m-0">Google Calendar</p>
        </div>
        <span className={`font-body text-[10px] px-2 py-0.5 uppercase tracking-wider whitespace-nowrap ${connesso
          ? 'text-salvia border border-salvia/30 bg-salvia/5'
          : 'text-nebbia/40 border border-white/10 bg-white/5'}`}>
          {connesso ? 'Connesso' : 'Non connesso'}
        </span>
      </div>

      {banner === 'connesso' && (
        <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20">
          <Check size={14} /> Google Calendar collegato con successo.
        </div>
      )}
      {banner === 'errore' && (
        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
          <AlertCircle size={14} /> Collegamento non riuscito. Riprova.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={20} className="animate-spin text-oro" />
        </div>
      ) : !connesso ? (
        <>
          <p className="font-body text-xs text-nebbia/40 leading-relaxed">
            Collega il tuo Google Calendar per tenere appuntamenti, udienze e scadenze sempre
            sincronizzati, e per condividerli con i colleghi dello studio secondo la visibilità che scegli.
          </p>
          <button onClick={collega} disabled={busy} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            Collega Google Calendar
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between p-4 bg-petrolio border border-white/5">
            <div className="min-w-0">
              <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-1">Account collegato</p>
              <p className="font-body text-sm text-nebbia truncate">{stato.google_email ?? 'Account Google'}</p>
            </div>
            <button onClick={scollega} disabled={busy}
              className="shrink-0 font-body text-xs text-red-400/80 hover:text-red-400 border border-red-500/30 hover:border-red-500/60 px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-40">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />} Scollega
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users size={12} className="text-nebbia/40" />
              <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest">Visibilità verso i colleghi</p>
            </div>
            <div className="space-y-2">
              {VISIBILITA.map(v => (
                <button key={v.id} onClick={() => cambiaVisibilita(v.id)}
                  className={`w-full text-left p-3 border transition-colors ${stato.visibilita === v.id
                    ? 'border-oro/40 bg-oro/5'
                    : 'border-white/8 hover:border-white/20'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded-full border shrink-0 ${stato.visibilita === v.id ? 'border-oro bg-oro' : 'border-white/25'}`} />
                    <span className="font-body text-sm text-nebbia">{v.label}</span>
                  </div>
                  <p className="font-body text-xs text-nebbia/40 mt-0.5 ml-5">{v.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap border-t border-white/5 pt-4">
            <button onClick={() => sincronizza()} disabled={syncing}
              className="font-body text-xs text-oro border border-oro/30 hover:bg-oro/10 px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-40 transition-colors">
              {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Sincronizza ora
            </button>
            {syncMsg && <span className="font-body text-xs text-nebbia/40">{syncMsg}</span>}
          </div>
          <p className="font-body text-[11px] text-nebbia/30">
            Appuntamenti, udienze e scadenze della tua agenda vengono copiati nel tuo Google Calendar.
            La sincronizzazione avviene al collegamento e quando premi "Sincronizza ora".
          </p>
        </>
      )}

      {err && (
        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
          <AlertCircle size={14} /> {err}
        </div>
      )}
    </div>
  )
}
