// src/pages/commercialista/Dashboard.jsx
//
// Dashboard del commercialista — STUDIO-centrica (port della Dashboard
// fiduciario CH, versione Fase 0).
//
// Mostra il quadro dello studio: clienti, fatturato/incassato/da incassare,
// fatture scadute, prossimi appuntamenti e andamento fatturazione mensile.
// Le sezioni mandati/scadenzario fiscale e conto economico per cliente
// arrivano con le Fasi 1-2 del modulo commercialista.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, StatCard } from '@/components/shared'
import {
  Users, CreditCard, Wallet, AlertCircle, Calendar,
  FileText, ChevronRight, MapPin, Video, Phone,
  Briefcase, CalendarClock, Clock, AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { TIPI_SCADENZA } from '@/lib/scadenzarioFiscale'

const TIPO_APP_ICON = { presenza: MapPin, videocall: Video, telefonico: Phone, udienza: Calendar }

function giorniA(iso) {
  if (!iso) return null
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  const t = new Date(iso); t.setHours(0, 0, 0, 0)
  return Math.round((t - oggi) / 86400000)
}

function fmtEUR(n) {
  return Number(n ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function nomeCliente(c) {
  if (!c) return '—'
  if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
  return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

const MESI_ABBR = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

export default function CommercialistaDashboard() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [nClienti, setNClienti] = useState(0)
  const [fatt, setFatt] = useState({ fatturato: 0, incassato: 0, daIncassare: 0, scadute: 0 })
  const [mesi, setMesi] = useState([])           // [{label, tot}]
  const [appuntamenti, setAppuntamenti] = useState([])
  const [nMandati, setNMandati] = useState(0)
  const [scadenze, setScadenze] = useState([])

  useEffect(() => {
    if (!profile?.id) return
    carica()
  }, [profile?.id])

  async function carica() {
    setLoading(true)
    const oggi = new Date()
    const annoCorr = oggi.getFullYear()

    const [cliRes, fattRes, appRes, mandRes, scadRes] = await Promise.all([
      // Clienti dello studio (RPC server-side, stessa del layout)
      supabase.rpc('conteggio_clienti_studio', { p_proprietario_id: profile.titolare_id ?? profile.id }),

      // Tutte le fatture del professionista (per KPI anno + scadenzario)
      supabase.from('fatture')
        .select('totale_lordo, stato, data_emissione, data_scadenza')
        .eq('avvocato_id', profile.id),

      // Prossimi appuntamenti (7 giorni)
      supabase.from('appuntamenti')
        .select('id, titolo, tipo, data_ora_inizio, cliente:cliente_id(nome, cognome, ragione_sociale, tipo_soggetto)')
        .eq('avvocato_id', profile.id)
        .eq('stato', 'programmato')
        .gte('data_ora_inizio', oggi.toISOString())
        .lte('data_ora_inizio', new Date(oggi.getTime() + 7 * 86400000).toISOString())
        .order('data_ora_inizio', { ascending: true })
        .limit(6),

      // Mandati attivi dello studio (RLS filtra allo studio)
      supabase.from('mandati').select('id', { count: 'exact', head: true }).eq('stato', 'attivo'),

      // Prossime scadenze aperte dello studio (le prime 8 per data)
      supabase.from('scadenze_mandato')
        .select('id, titolo, tipo, data_scadenza, mandato_id, cliente:cliente_id(nome, cognome, ragione_sociale, tipo_soggetto), mandato:mandato_id(titolo)')
        .eq('stato', 'aperta')
        .order('data_scadenza', { ascending: true })
        .limit(8),
    ])

    const cliRow = Array.isArray(cliRes.data) ? cliRes.data[0] : cliRes.data
    setNClienti(cliRow?.conteggio ?? 0)
    setNMandati(mandRes.count ?? 0)
    setScadenze(scadRes.data ?? [])

    const fatture = fattRes.data ?? []
    let fatturato = 0, incassato = 0, daIncassare = 0, scadute = 0
    for (const f of fatture) {
      const imp = Number(f.totale_lordo) || 0
      const emessaQuestAnno = f.data_emissione?.startsWith(String(annoCorr))
      if (emessaQuestAnno && f.stato !== 'bozza' && f.stato !== 'annullata') fatturato += imp
      if (emessaQuestAnno && f.stato === 'pagata') incassato += imp
      if (f.stato === 'in_attesa' || f.stato === 'scaduta') daIncassare += imp
      if (f.stato === 'scaduta') scadute++
    }
    setFatt({ fatturato, incassato, daIncassare, scadute })

    // Andamento fatturazione: ultimi 6 mesi (emesse, escluse bozze/annullate)
    const buckets = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(annoCorr, oggi.getMonth() - i, 1)
      const chiave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      buckets.push({ chiave, label: MESI_ABBR[d.getMonth()], tot: 0 })
    }
    for (const f of fatture) {
      if (f.stato === 'bozza' || f.stato === 'annullata' || !f.data_emissione) continue
      const b = buckets.find(b => f.data_emissione.startsWith(b.chiave))
      if (b) b.tot += Number(f.totale_lordo) || 0
    }
    setMesi(buckets)

    setAppuntamenti(appRes.data ?? [])
    setLoading(false)
  }

  const STATS = [
    { label: 'Clienti', value: loading ? '—' : nClienti, colorClass: 'text-oro', icon: Users },
    { label: 'Mandati attivi', value: loading ? '—' : nMandati, colorClass: 'text-oro', icon: Briefcase },
    { label: 'Fatturato anno', value: loading ? '—' : `€ ${fmtEUR(fatt.fatturato)}`, colorClass: 'text-salvia', icon: CreditCard },
    { label: 'Incassato anno', value: loading ? '—' : `€ ${fmtEUR(fatt.incassato)}`, colorClass: 'text-salvia', icon: Wallet },
    { label: 'Da incassare', value: loading ? '—' : `€ ${fmtEUR(fatt.daIncassare)}`, colorClass: fatt.daIncassare > 0 ? 'text-amber-400' : 'text-nebbia/40', icon: FileText },
  ]

  const maxMese = Math.max(1, ...mesi.map(m => m.tot))

  return (
    <div className="space-y-6">
      <PageHeader label="Commercialista" title="Dashboard" subtitle="Il quadro del tuo studio" />

      {/* KPI studio */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Alert fatture scadute */}
      {!loading && fatt.scadute > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-900/10 border border-red-500/20">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <p className="font-body text-sm text-red-400">
            {fatt.scadute} {fatt.scadute === 1 ? 'fattura scaduta' : 'fatture scadute'} da incassare
          </p>
          <Link to="/fatturazione" className="font-body text-xs text-red-400 border border-red-500/30 px-3 py-1.5 hover:bg-red-400/10 transition-colors ml-auto whitespace-nowrap">
            Gestisci →
          </Link>
        </div>
      )}

      {/* Prossime scadenze fiscali (cuore del banco di lavoro) */}
      <div className="bg-slate border border-white/5">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <CalendarClock size={14} className="text-oro/60" />
            <p className="section-label">Prossime scadenze fiscali</p>
          </div>
          <Link to="/banco-lavoro" className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors flex items-center gap-1">
            Banco di lavoro <ChevronRight size={11} />
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
        ) : scadenze.length === 0 ? (
          <p className="font-body text-sm text-nebbia/30 text-center py-10">Nessuna scadenza aperta — apri un mandato con anno di riferimento e genera lo scadenzario.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {scadenze.map(s => {
              const gg = giorniA(s.data_scadenza)
              const scaduta = gg !== null && gg < 0
              const urgente = gg !== null && gg >= 0 && gg <= 7
              const tipoCfg = s.tipo ? TIPI_SCADENZA[s.tipo] : null
              const d = new Date(s.data_scadenza)
              return (
                <Link key={s.id} to={`/banco-lavoro/${s.mandato_id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-petrolio/40 transition-colors">
                  <div className={`w-8 h-8 flex items-center justify-center border shrink-0 ${scaduta ? 'bg-red-900/10 border-red-500/25' : urgente ? 'bg-amber-900/10 border-amber-500/25' : 'bg-oro/5 border-oro/20'}`}>
                    {scaduta ? <AlertTriangle size={13} className="text-red-400" /> : <Clock size={13} className={urgente ? 'text-amber-400' : 'text-oro/70'} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-body text-sm text-nebbia truncate">{s.titolo}</p>
                      {tipoCfg && <span className={`font-body text-[10px] px-1.5 py-0.5 border uppercase tracking-wider ${tipoCfg.cls}`}>{tipoCfg.label}</span>}
                    </div>
                    <p className="font-body text-xs text-nebbia/40 truncate">
                      {nomeCliente(s.cliente)}{s.mandato?.titolo ? ` · ${s.mandato.titolo}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-body text-xs text-nebbia/60">{d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <p className={`font-body text-xs ${scaduta ? 'text-red-400' : urgente ? 'text-amber-400' : 'text-nebbia/35'}`}>
                      {scaduta ? `scaduta da ${Math.abs(gg)} gg` : gg === 0 ? 'oggi' : `tra ${gg} gg`}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Prossimi appuntamenti */}
        <div className="bg-slate border border-white/5">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <p className="section-label">Prossimi appuntamenti (7 giorni)</p>
            <Link to="/calendario" className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors flex items-center gap-1">
              Calendario <ChevronRight size={11} />
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
          ) : appuntamenti.length === 0 ? (
            <p className="font-body text-sm text-nebbia/30 text-center py-10">Nessun appuntamento in programma</p>
          ) : (
            <div>
              {appuntamenti.map(a => {
                const Icon = TIPO_APP_ICON[a.tipo] ?? Calendar
                const d = new Date(a.data_ora_inizio)
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                    <div className="w-8 h-8 bg-oro/5 border border-oro/20 flex items-center justify-center shrink-0">
                      <Icon size={13} className="text-oro/70" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm text-nebbia truncate">{a.titolo}</p>
                      <p className="font-body text-xs text-nebbia/40 truncate">{nomeCliente(a.cliente)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-body text-xs text-nebbia/60">{d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      <p className="font-body text-xs text-nebbia/35">{d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Fatturazione ultimi 6 mesi */}
        <div className="bg-slate border border-white/5">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <p className="section-label">Studio — fatturazione ultimi 6 mesi</p>
            <Link to="/fatturazione" className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors flex items-center gap-1">
              Fatturazione <ChevronRight size={11} />
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
          ) : (
            <div className="p-4 space-y-2.5">
              {mesi.map(m => (
                <div key={m.chiave} className="flex items-center gap-3">
                  <span className="font-body text-xs text-nebbia/40 w-8 shrink-0">{m.label}</span>
                  <div className="flex-1 h-4 bg-petrolio/60 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-salvia/40" style={{ width: `${(m.tot / maxMese) * 100}%` }} />
                  </div>
                  <span className="font-body text-xs text-nebbia/60 w-24 text-right shrink-0">€ {fmtEUR(m.tot)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
