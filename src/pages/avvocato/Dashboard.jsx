// src/pages/avvocato/Dashboard.jsx
//
// Agenda operativa + sintesi periodo. Box contatori in alto (clienti,
// pratiche aperte, pratiche chiuse nel periodo, fatturato nel periodo).
// Range globale in alto a destra che pilota: pratiche chiuse + fatturato.
// Agenda (Oggi/7gg/Messaggi/Pratiche attenzione) NON dipende dal range.

import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Calendar, AlertTriangle, Briefcase, Receipt, MessageSquare,
  ArrowRight, Clock, Scale, FileText, TrendingUp, Inbox,
  User, Building2, Users, FolderOpen, FolderCheck, ChevronDown
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function nomeCliente(c) {
  if (!c) return ''
  if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? c.nome ?? '—'
  return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

function plural(n, sing, plur) {
  return n === 1 ? `1 ${sing}` : `${n} ${plur}`
}

function fmtEUR(n) {
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n ?? 0)
}

function giorniDa(data) {
  if (!data) return null
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const d = new Date(data)
  d.setHours(0, 0, 0, 0)
  return Math.floor((d - oggi) / (1000 * 60 * 60 * 24))
}

function badgeUrgenza(gg) {
  if (gg < 0) return { label: `${Math.abs(gg)}gg fa`, color: 'text-red-400 border-red-400/30 bg-red-500/10' }
  if (gg === 0) return { label: 'Oggi', color: 'text-red-400 border-red-400/30 bg-red-500/10' }
  if (gg <= 3) return { label: `Fra ${gg}gg`, color: 'text-oro border-oro/30 bg-oro/10' }
  if (gg <= 7) return { label: `Fra ${gg}gg`, color: 'text-salvia border-salvia/30 bg-salvia/10' }
  return { label: `Fra ${gg}gg`, color: 'text-nebbia/50 border-white/10 bg-petrolio/40' }
}

// ─────────────────────────────────────────────────────────────
// RANGE DATE: helper
// ─────────────────────────────────────────────────────────────
function calcolaRange(preset, customStart, customEnd) {
  const oggi = new Date()
  let inizio, fine, label

  switch (preset) {
    case 'mese-corrente': {
      inizio = new Date(oggi.getFullYear(), oggi.getMonth(), 1)
      fine = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0)
      label = oggi.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
      label = label.charAt(0).toUpperCase() + label.slice(1)
      break
    }
    case 'mese-scorso': {
      inizio = new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1)
      fine = new Date(oggi.getFullYear(), oggi.getMonth(), 0)
      label = inizio.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
      label = label.charAt(0).toUpperCase() + label.slice(1)
      break
    }
    case 'ultimi-90': {
      fine = new Date(oggi)
      inizio = new Date(oggi); inizio.setDate(inizio.getDate() - 90)
      label = 'Ultimi 90 giorni'
      break
    }
    case 'personalizzato': {
      inizio = customStart ? new Date(customStart) : new Date(oggi.getFullYear(), oggi.getMonth(), 1)
      fine = customEnd ? new Date(customEnd) : new Date(oggi)
      label = `${inizio.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} - ${fine.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}`
      break
    }
    default: {
      inizio = new Date(oggi.getFullYear(), oggi.getMonth(), 1)
      fine = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0)
      label = 'Questo mese'
    }
  }

  inizio.setHours(0, 0, 0, 0)
  fine.setHours(23, 59, 59, 999)
  return { inizio, fine, label }
}

// ─────────────────────────────────────────────────────────────
// SELETTORE RANGE
// ─────────────────────────────────────────────────────────────
function SelettoreRange({ preset, onPresetChange, customStart, customEnd, onCustomChange, label }) {
  const [aperto, setAperto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setAperto(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const opzioni = [
    { value: 'mese-corrente', label: 'Questo mese' },
    { value: 'mese-scorso', label: 'Mese scorso' },
    { value: 'ultimi-90', label: 'Ultimi 90 giorni' },
    { value: 'personalizzato', label: 'Personalizzato' },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAperto(v => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-petrolio/60 border border-white/10 text-nebbia/70 font-body text-xs hover:border-oro/30 hover:text-nebbia transition-colors"
      >
        <Calendar size={11} className="text-oro/60" />
        <span>{label}</span>
        <ChevronDown size={10} className={`text-nebbia/40 transition-transform ${aperto ? 'rotate-180' : ''}`} />
      </button>

      {aperto && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-slate border border-white/10 z-20 shadow-xl">
          {opzioni.map(o => (
            <button
              key={o.value}
              onClick={() => {
                onPresetChange(o.value)
                if (o.value !== 'personalizzato') setAperto(false)
              }}
              className={`w-full text-left px-3 py-2 font-body text-xs hover:bg-petrolio/60 transition-colors flex items-center justify-between ${preset === o.value ? 'text-oro' : 'text-nebbia/70'
                }`}
            >
              {o.label}
              {preset === o.value && <span className="w-1 h-1 bg-oro rounded-full" />}
            </button>
          ))}

          {preset === 'personalizzato' && (
            <div className="border-t border-white/10 p-3 space-y-2">
              <div>
                <label className="block font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">Da</label>
                <input
                  type="date"
                  value={customStart || ''}
                  onChange={e => onCustomChange('start', e.target.value)}
                  className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-xs px-2 py-1.5 outline-none focus:border-oro/40"
                />
              </div>
              <div>
                <label className="block font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">A</label>
                <input
                  type="date"
                  value={customEnd || ''}
                  onChange={e => onCustomChange('end', e.target.value)}
                  className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-xs px-2 py-1.5 outline-none focus:border-oro/40"
                />
              </div>
              <button
                onClick={() => setAperto(false)}
                className="w-full px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors"
              >
                Applica
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BOX CONTATORE
// ─────────────────────────────────────────────────────────────
function BoxContatore({ icon: Icon, label, value, sublabel, accent = 'nebbia', link }) {
  const accentClasses = {
    nebbia: 'text-nebbia/85',
    oro: 'text-oro',
    salvia: 'text-salvia',
  }
  const iconClasses = {
    nebbia: 'text-nebbia/40 bg-petrolio/40 border-white/10',
    oro: 'text-oro bg-oro/10 border-oro/20',
    salvia: 'text-salvia bg-salvia/10 border-salvia/20',
  }
  const content = (
    <div className="bg-slate border border-white/5 p-4 hover:border-oro/20 transition-colors group h-full">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 flex items-center justify-center border ${iconClasses[accent]}`}>
          <Icon size={13} />
        </div>
        {link && (
          <ArrowRight size={12} className="text-nebbia/20 group-hover:text-oro transition-colors" />
        )}
      </div>
      <p className={`font-display text-2xl font-light leading-none mb-1 ${accentClasses[accent]}`}>{value}</p>
      <p className="font-body text-[11px] text-nebbia/40 uppercase tracking-widest">{label}</p>
      {sublabel && <p className="font-body text-[10px] text-nebbia/30 mt-1">{sublabel}</p>}
    </div>
  )
  return link ? <Link to={link} className="block h-full">{content}</Link> : content
}

// ─────────────────────────────────────────────────────────────
// SECTION CARD
// ─────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, count, link, linkLabel, children, empty }) {
  return (
    <div className="bg-slate border border-white/5 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={13} className="text-nebbia/40" />}
          <h3 className="font-body text-xs font-medium text-nebbia/60 tracking-widest uppercase">{title}</h3>
          {count !== undefined && count > 0 && (
            <span className="font-body text-[10px] text-nebbia/30">({count})</span>
          )}
        </div>
        {link && (
          <Link to={link} className="font-body text-[10px] text-nebbia/30 hover:text-oro transition-colors flex items-center gap-1">
            {linkLabel ?? 'Vedi tutti'} <ArrowRight size={9} />
          </Link>
        )}
      </div>
      <div className="flex-1 p-3">
        {children || (
          <p className="font-body text-xs text-nebbia/30 italic text-center py-6">{empty ?? 'Niente da mostrare.'}</p>
        )}
      </div>
    </div>
  )
}

function EventoItem({ icon: Icon, titolo, sottotitolo, badge, link, accent = 'oro' }) {
  const iconColor = accent === 'red' ? 'text-red-400' : accent === 'salvia' ? 'text-salvia' : 'text-oro'
  const content = (
    <div className="flex items-center gap-3 px-2.5 py-2 hover:bg-petrolio/40 transition-colors group">
      <Icon size={12} className={`${iconColor} shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="font-body text-xs text-nebbia/85 truncate group-hover:text-oro transition-colors">{titolo}</p>
        {sottotitolo && <p className="font-body text-[11px] text-nebbia/40 truncate">{sottotitolo}</p>}
      </div>
      {badge && (
        <span className={`font-body text-[10px] px-2 py-0.5 border ${badge.color} shrink-0`}>
          {badge.label}
        </span>
      )}
    </div>
  )
  return link ? <Link to={link}>{content}</Link> : content
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function AvvocatoDashboard() {
  const { profile } = useAuth()

  const [showTrialFeedback, setShowTrialFeedback] = useState(false)
  const [loading, setLoading] = useState(true)

  // ─── Range globale ───────────────────────────────────────
  const [rangePreset, setRangePreset] = useState('mese-corrente')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const range = useMemo(
    () => calcolaRange(rangePreset, customStart, customEnd),
    [rangePreset, customStart, customEnd]
  )

  // ─── Dati: contatori globali (snapshot, no range) ────────
  const [tot, setTot] = useState({ clienti: 0, pratiche_aperte: 0 })

  // ─── Dati: metriche di periodo (col range) ───────────────
  const [periodo, setPeriodo] = useState({ pratiche_chiuse: 0, fatturato_tot: 0, incassato: 0, da_incassare: 0 })

  // ─── Dati: agenda (no range, sempre "adesso") ────────────
  const [eventiOggi, setEventiOggi] = useState([])
  const [eventiSettimana, setEventiSettimana] = useState([])
  const [praticheAttenzione, setPraticheAttenzione] = useState([])
  const [fatture, setFatture] = useState({ scadute: [], in_scadenza: [] })
  const [messaggi, setMessaggi] = useState([])

  // ─── Carica agenda (una volta) ───────────────────────────
  useEffect(() => {
    if (!profile?.id) return
    caricaAgenda()
    caricaContatoriGlobali()
    controllaTrial()
  }, [profile?.id])

  // ─── Carica metriche periodo (ad ogni cambio range) ──────
  useEffect(() => {
    if (!profile?.id) return
    caricaPeriodo()
  }, [profile?.id, range.inizio.getTime(), range.fine.getTime()])

  async function controllaTrial() {
    const { data: prof } = await supabase
      .from('profiles')
      .select('prova_gratuita_usata, abbonamento_scadenza, piano_id')
      .eq('id', profile.id)
      .single()

    if (
      prof?.prova_gratuita_usata &&
      prof?.abbonamento_scadenza &&
      new Date(prof.abbonamento_scadenza) < new Date() &&
      !prof?.piano_id
    ) {
      setShowTrialFeedback(true)
    }
  }

  async function caricaContatoriGlobali() {
    // Clienti totali
    const { count: countClienti } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'cliente')
      .eq('avvocato_id', profile.id)

    // Pratiche aperte
    const { count: countAperte } = await supabase
      .from('pratiche')
      .select('*', { count: 'exact', head: true })
      .eq('avvocato_id', profile.id)
      .eq('stato', 'aperta')

    setTot({
      clienti: countClienti ?? 0,
      pratiche_aperte: countAperte ?? 0,
    })
  }

  async function caricaPeriodo() {
    const inizioISO = range.inizio.toISOString()
    const fineISO = range.fine.toISOString()
    const inizioDate = inizioISO.split('T')[0]
    const fineDate = fineISO.split('T')[0]

    // Pratiche chiuse nel periodo
    const { count: countChiuse } = await supabase
      .from('pratiche')
      .select('*', { count: 'exact', head: true })
      .eq('avvocato_id', profile.id)
      .eq('stato', 'chiusa')
      .gte('updated_at', inizioISO)
      .lte('updated_at', fineISO)

    // ─── Fatture emesse nel periodo (per: fatturato totale e incassato del periodo) ───
    const { data: fattPeriodo } = await supabase
      .from('fatture')
      .select('totale_lordo, stato')
      .eq('avvocato_id', profile.id)
      .gte('data_emissione', inizioDate)
      .lte('data_emissione', fineDate)

    let fatturatoTot = 0
    let incassato = 0
    for (const f of fattPeriodo ?? []) {
      const imp = Number(f.totale_lordo) || 0
      if (f.stato !== 'bozza' && f.stato !== 'annullata') fatturatoTot += imp
      if (f.stato === 'pagata') incassato += imp
    }

    // ─── Da incassare: TUTTO il debito attivo, indipendente dal periodo ───
    // Tutte le fatture in attesa (anche scadute) escluso bozza/pagata/annullata
    const { data: fattAttive } = await supabase
      .from('fatture')
      .select('totale_lordo, stato, data_scadenza')
      .eq('avvocato_id', profile.id)
      .in('stato', ['in_attesa', 'scaduta'])

    const daIncassare = (fattAttive ?? []).reduce(
      (sum, f) => sum + (Number(f.totale_lordo) || 0),
      0
    )

    setPeriodo({
      pratiche_chiuse: countChiuse ?? 0,
      fatturato_tot: fatturatoTot,
      incassato,
      da_incassare: daIncassare,
    })
  }

  async function caricaAgenda() {
    setLoading(true)

    const oggi = new Date()
    const inizioGiorno = new Date(oggi); inizioGiorno.setHours(0, 0, 0, 0)
    const fineGiorno = new Date(oggi); fineGiorno.setHours(23, 59, 59, 999)
    const fra7gg = new Date(oggi); fra7gg.setDate(fra7gg.getDate() + 7)
    const fra3gg = new Date(oggi); fra3gg.setDate(fra3gg.getDate() + 3); fra3gg.setHours(23, 59, 59, 999)
    const fra14gg = new Date(oggi); fra14gg.setDate(fra14gg.getDate() + 14)

    // OGGI
    const { data: appOggi } = await supabase
      .from('appuntamenti')
      .select('id, titolo, data_inizio, tipo, pratica_id, pratica:pratica_id(titolo)')
      .eq('avvocato_id', profile.id)
      .gte('data_inizio', inizioGiorno.toISOString())
      .lte('data_inizio', fineGiorno.toISOString())
      .order('data_inizio')

    // SETTIMANA
    const domani = new Date(oggi); domani.setDate(domani.getDate() + 1); domani.setHours(0, 0, 0, 0)
    const { data: appSettimana } = await supabase
      .from('appuntamenti')
      .select('id, titolo, data_inizio, tipo, pratica_id, pratica:pratica_id(titolo)')
      .eq('avvocato_id', profile.id)
      .gte('data_inizio', domani.toISOString())
      .lte('data_inizio', fra7gg.toISOString())
      .order('data_inizio')
      .limit(8)

    // PRATICHE ATTENZIONE
    const { data: praticheUrgenti } = await supabase
      .from('pratiche')
      .select(`
                id, titolo, tipo, stato, updated_at, prossima_udienza,
                cliente:cliente_id(nome, cognome, ragione_sociale, tipo_soggetto)
            `)
      .eq('avvocato_id', profile.id)
      .eq('stato', 'aperta')
      .or(`prossima_udienza.gte.${oggi.toISOString()},prossima_udienza.lte.${fra14gg.toISOString()}`)
      .order('prossima_udienza', { ascending: true, nullsFirst: false })
      .limit(5)

    // FATTURE in attesa (scadute + in scadenza 3gg) - NO range, è agenda
    const { data: tutteFatture } = await supabase
      .from('fatture')
      .select(`
                id, numero, anno_numerazione, data_scadenza, data_pagamento, totale_lordo, stato,
                cliente:cliente_id(nome, cognome, ragione_sociale, tipo_soggetto)
            `)
      .eq('avvocato_id', profile.id)
      .order('data_scadenza', { ascending: true })

    let scadute = []
    let inScadenza = []

    for (const f of tutteFatture ?? []) {
      if (f.stato === 'pagata' || f.stato === 'bozza') continue
      const dataScad = f.data_scadenza ? new Date(f.data_scadenza) : null
      if (!dataScad) continue
      if (dataScad < inizioGiorno) scadute.push(f)
      else if (dataScad <= fra3gg) inScadenza.push(f)
    }
    scadute = scadute.slice(0, 5)
    inScadenza = inScadenza.slice(0, 4)

    // MESSAGGI
    const { data: tickets } = await supabase
      .from('ticket_assistenza')
      .select(`
                id, oggetto, ultimo_messaggio_at, stato,
                cliente:cliente_id(nome, cognome, ragione_sociale, tipo_soggetto),
                ultimo_messaggio_autore_id
            `)
      .eq('avvocato_id', profile.id)
      .neq('ultimo_messaggio_autore_id', profile.id)
      .in('stato', ['aperto', 'in_lavorazione'])
      .order('ultimo_messaggio_at', { ascending: false })
      .limit(5)

    setEventiOggi(appOggi ?? [])
    setEventiSettimana(appSettimana ?? [])
    setPraticheAttenzione(praticheUrgenti ?? [])
    setFatture({ scadute, in_scadenza: inScadenza })
    setMessaggi(tickets ?? [])
    setLoading(false)
  }

  function handleCustomChange(key, value) {
    if (key === 'start') setCustomStart(value)
    else setCustomEnd(value)
  }

  // ─── Sommario header ─────────────────────────────────────
  const sommario = useMemo(() => {
    const udienze = eventiOggi.filter(e => e.tipo === 'udienza').length
    const termini = eventiOggi.filter(e => e.tipo === 'scadenza').length
    const appuntamenti = eventiOggi.filter(e => e.tipo === 'appuntamento' || e.tipo === 'chiamata').length

    const parti = []
    if (udienze > 0) parti.push(plural(udienze, 'udienza', 'udienze'))
    if (termini > 0) parti.push(plural(termini, 'termine', 'termini'))
    if (appuntamenti > 0) parti.push(plural(appuntamenti, 'appuntamento', 'appuntamenti'))

    const totFatture = fatture.scadute.length + fatture.in_scadenza.length
    let frase = ''

    if (parti.length === 0 && totFatture === 0 && messaggi.length === 0) {
      frase = 'Niente in calendario per oggi. Approfittane per aggiornare le pratiche o organizzare le ricerche.'
    } else {
      if (parti.length > 0) frase = `Oggi hai ${parti.join(', ')}.`
      if (totFatture > 0) frase += (frase ? ' ' : '') + `${plural(totFatture, 'fattura', 'fatture')} in attesa.`
      if (messaggi.length > 0) frase += (frase ? ' ' : '') + `${plural(messaggi.length, 'messaggio nuovo', 'messaggi nuovi')}.`
    }
    return frase
  }, [eventiOggi, fatture, messaggi])

  const orarioGiorno = useMemo(() => {
    const h = new Date().getHours()
    if (h < 6) return 'Buonanotte'
    if (h < 13) return 'Buongiorno'
    if (h < 19) return 'Buon pomeriggio'
    return 'Buonasera'
  }, [])

  return (
    <div className="space-y-5">
      {/* ─── HEADER + range selector ───────────────────── */}
      <div className="bg-slate border border-white/5 px-6 py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="font-body text-xs text-oro/60 tracking-widest uppercase mb-1">Dashboard</p>
            <h1 className="font-display text-2xl font-light text-nebbia mb-2">
              {orarioGiorno}, {profile?.nome ?? ''}.
            </h1>
            <p className="font-body text-sm text-nebbia/55 leading-relaxed">{sommario}</p>
          </div>
          <div className="shrink-0">
            <SelettoreRange
              preset={rangePreset}
              onPresetChange={setRangePreset}
              customStart={customStart}
              customEnd={customEnd}
              onCustomChange={handleCustomChange}
              label={range.label}
            />
          </div>
        </div>
      </div>

      {/* ─── Banner trial scaduto ───────────────────────── */}
      {showTrialFeedback && (
        <div className="bg-slate border border-oro/25 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-oro/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1.5">
              <p className="font-body text-sm font-medium text-oro">La tua prova gratuita e scaduta</p>
              <p className="font-body text-xs text-nebbia/50 leading-relaxed max-w-lg">
                Scegli un piano per continuare a lavorare con le tue pratiche, clienti e documenti.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => setShowTrialFeedback(false)}
                className="font-body text-xs text-nebbia/30 hover:text-nebbia transition-colors">
                Dopo
              </button>
              <Link to="/studio?tab=acquista"
                className="flex items-center gap-2 px-5 py-2.5 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors">
                Vedi i piani →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3 BOX CONTATORI ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <BoxContatore
          icon={Users}
          label="Clienti"
          value={tot.clienti}
          sublabel="Totale"
          accent="nebbia"
          link="/clienti"
        />
        <BoxContatore
          icon={FolderOpen}
          label="Pratiche aperte"
          value={tot.pratiche_aperte}
          sublabel="Adesso"
          accent="oro"
          link="/pratiche"
        />
        <BoxContatore
          icon={FolderCheck}
          label="Pratiche chiuse"
          value={periodo.pratiche_chiuse}
          sublabel={range.label}
          accent="salvia"
          link="/pratiche"
        />
      </div>

      {/* ─── Loading ───────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      )}

      {/* ─── Griglia agenda ─────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* OGGI */}
          <SectionCard
            title="Oggi"
            icon={Clock}
            count={eventiOggi.length}
            link="/calendario"
            empty="Nessun impegno oggi."
          >
            {eventiOggi.length > 0 && (
              <div className="space-y-0.5">
                {eventiOggi.map(e => {
                  const ora = new Date(e.data_inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                  const tipoIcon = e.tipo === 'udienza' ? Scale : e.tipo === 'scadenza' ? AlertTriangle : Calendar
                  const accent = e.tipo === 'scadenza' ? 'red' : e.tipo === 'udienza' ? 'oro' : 'salvia'
                  return (
                    <EventoItem
                      key={e.id}
                      icon={tipoIcon}
                      titolo={e.titolo}
                      sottotitolo={e.pratica?.titolo}
                      badge={{ label: ora, color: 'text-nebbia/60 border-white/10 bg-petrolio/40' }}
                      link={e.pratica_id ? `/pratiche/${e.pratica_id}` : '/calendario'}
                      accent={accent}
                    />
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* FATTURE */}
          <SectionCard
            title="Fatturazione"
            icon={Receipt}
            link="/pagamenti"
          >
            {/* Hero stat: incassato + da incassare nel range */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-salvia/5 border border-salvia/15 px-3 py-2.5">
                <p className="font-body text-[10px] text-salvia/60 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <TrendingUp size={9} /> Incassato
                </p>
                <p className="font-body text-base text-salvia">EUR {fmtEUR(periodo.incassato)}</p>
                <p className="font-body text-[10px] text-nebbia/30 mt-0.5 truncate">{range.label}</p>
              </div>
              <div className="bg-petrolio/40 border border-white/5 px-3 py-2.5">
                <p className="font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">Da incassare</p>
                <p className="font-body text-base text-nebbia/85">EUR {fmtEUR(periodo.da_incassare)}</p>
                <p className="font-body text-[10px] text-nebbia/30 mt-0.5 truncate">Totale debito attivo</p>
              </div>
            </div>

            {/* Fatture scadute (agenda, non range) */}
            {fatture.scadute.length > 0 && (
              <div className="space-y-0.5 pt-1">
                {fatture.scadute.map(f => {
                  const gg = giorniDa(f.data_scadenza)
                  return (
                    <EventoItem
                      key={f.id}
                      icon={FileText}
                      titolo={`Fattura ${f.anno_numerazione}/${f.numero}`}
                      sottotitolo={`${nomeCliente(f.cliente)} - EUR ${fmtEUR(f.totale_lordo)}`}
                      badge={badgeUrgenza(gg)}
                      link="/pagamenti"
                      accent="red"
                    />
                  )
                })}
              </div>
            )}

            {fatture.in_scadenza.length > 0 && (
              <div className="space-y-0.5">
                {fatture.in_scadenza.map(f => {
                  const gg = giorniDa(f.data_scadenza)
                  return (
                    <EventoItem
                      key={f.id}
                      icon={FileText}
                      titolo={`Fattura ${f.anno}/${f.numero}`}
                      sottotitolo={`${nomeCliente(f.cliente)} - EUR ${fmtEUR(f.totale_lordo)}`}
                      badge={badgeUrgenza(gg)}
                      link="/pagamenti"
                      accent="oro"
                    />
                  )
                })}
              </div>
            )}

            {fatture.scadute.length === 0 && fatture.in_scadenza.length === 0 && (
              <p className="font-body text-xs text-nebbia/30 italic text-center py-3">Nessuna fattura in attesa.</p>
            )}
          </SectionCard>

          {/* PROSSIMI 7 GIORNI */}
          <SectionCard
            title="Prossimi 7 giorni"
            icon={Calendar}
            count={eventiSettimana.length}
            link="/calendario"
            empty="Nessun impegno nei prossimi 7 giorni."
          >
            {eventiSettimana.length > 0 && (
              <div className="space-y-0.5">
                {eventiSettimana.map(e => {
                  const gg = giorniDa(e.data_inizio)
                  const tipoIcon = e.tipo === 'udienza' ? Scale : e.tipo === 'scadenza' ? AlertTriangle : Calendar
                  const accent = e.tipo === 'scadenza' ? 'red' : e.tipo === 'udienza' ? 'oro' : 'salvia'
                  return (
                    <EventoItem
                      key={e.id}
                      icon={tipoIcon}
                      titolo={e.titolo}
                      sottotitolo={e.pratica?.titolo}
                      badge={badgeUrgenza(gg)}
                      link={e.pratica_id ? `/pratiche/${e.pratica_id}` : '/calendario'}
                      accent={accent}
                    />
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* MESSAGGI */}
          <SectionCard
            title="Messaggi non letti"
            icon={MessageSquare}
            count={messaggi.length}
            link="/assistenza"
            empty="Nessun messaggio in attesa."
          >
            {messaggi.length > 0 && (
              <div className="space-y-0.5">
                {messaggi.map(t => {
                  const data = t.ultimo_messaggio_at
                    ? new Date(t.ultimo_messaggio_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
                    : null
                  return (
                    <EventoItem
                      key={t.id}
                      icon={Inbox}
                      titolo={t.oggetto || 'Senza oggetto'}
                      sottotitolo={nomeCliente(t.cliente)}
                      badge={data ? { label: data, color: 'text-nebbia/60 border-white/10 bg-petrolio/40' } : null}
                      link={`/assistenza/${t.id}`}
                      accent="salvia"
                    />
                  )
                })}
              </div>
            )}
          </SectionCard>

        </div>
      )}

      {/* ─── PRATICHE ATTENZIONE (sempre visibile con empty) ─── */}
      {!loading && (
        <SectionCard
          title="Pratiche che richiedono attenzione"
          icon={Briefcase}
          count={praticheAttenzione.length}
          link="/pratiche"
          empty="Nessuna pratica con scadenza imminente."
        >
          {praticheAttenzione.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {praticheAttenzione.map(p => {
                const gg = p.prossima_udienza ? giorniDa(p.prossima_udienza) : null
                const badge = gg !== null ? badgeUrgenza(gg) : null
                const cli = p.cliente
                const IconCli = cli?.tipo_soggetto === 'persona_giuridica' ? Building2 : User
                return (
                  <Link
                    key={p.id}
                    to={`/pratiche/${p.id}`}
                    className="block bg-petrolio/40 border border-white/5 p-3 hover:border-oro/25 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-body text-xs font-medium text-nebbia/85 leading-snug group-hover:text-oro transition-colors line-clamp-2">
                        {p.titolo}
                      </p>
                      {badge && (
                        <span className={`font-body text-[10px] px-2 py-0.5 border ${badge.color} shrink-0`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-nebbia/40">
                      <IconCli size={10} />
                      <p className="font-body text-[11px] truncate">{nomeCliente(cli)}</p>
                    </div>
                    {p.tipo && (
                      <p className="font-body text-[10px] text-nebbia/30 mt-1 uppercase tracking-widest">{p.tipo}</p>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  )
}