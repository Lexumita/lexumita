// src/pages/admin/Assistenza.jsx

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader, BackButton, Badge, StatCard } from '@/components/shared'
import {
  Send, Lock, Search, ChevronUp, ChevronDown,
  ArrowUpDown, ArrowRight, AlertCircle, MessageSquare
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function SortTh({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field
  return (
    <th className="px-4 py-3 text-left">
      <button onClick={() => onSort(field)}
        className="flex items-center gap-1.5 font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase hover:text-oro transition-colors group">
        {label}
        <span className="text-nebbia/20 group-hover:text-oro/60">
          {active ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={11} />}
        </span>
      </button>
    </th>
  )
}

function useSort(initField = 'created_at', initDir = 'desc') {
  const [sortField, setSortField] = useState(initField)
  const [sortDir, setSortDir] = useState(initDir)

  function handleSort(f) {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(f); setSortDir('asc') }
  }

  function sortFn(a, b) {
    let va = a[sortField] ?? '', vb = b[sortField] ?? ''
    if (sortField === 'created_at') { va = new Date(va); vb = new Date(vb) }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase() }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  }

  return { sortField, sortDir, handleSort, sortFn }
}

const RUOLO_BADGE = {
  avvocato: { label: 'Avvocato', variant: 'oro' },
  user: { label: 'User', variant: 'salvia' },
  cliente: { label: 'Cliente', variant: 'gray' },
  admin: { label: 'Admin', variant: 'red' },
}

// ─────────────────────────────────────────────────────────────
// TAB 1 — SUPPORTO LEXUM
// ticket verso admin (destinatario_id = null) — naviga a /admin/assistenza/:id
// ─────────────────────────────────────────────────────────────
function TabSupporto() {
  const navigate = useNavigate()
  const { sortField, sortDir, handleSort, sortFn } = useSort('created_at', 'desc')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statoF, setStatoF] = useState('')
  const [ruoloF, setRuoloF] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    async function carica() {
      setLoading(true)
      const { data } = await supabase
        .from('ticket_assistenza')
        .select(`
          id, oggetto, stato, created_at, mittente_ruolo,
          mittente:mittente_id(id, nome, cognome),
          messaggi:messaggi_ticket(id, autore_tipo, created_at)
        `)
        .is('destinatario_id', null)
        .order('created_at', { ascending: false })
      setTickets(data ?? [])
      setLoading(false)
    }
    carica()
  }, [])

  const nAperti = tickets.filter(t => t.stato === 'aperto').length
  const nDaRisp = tickets.filter(t => {
    if (t.stato !== 'aperto') return false
    const msgs = [...(t.messaggi ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return msgs[0]?.autore_tipo !== 'admin'
  }).length

  const rows = tickets
    .filter(t => {
      if (statoF && t.stato !== statoF) return false
      if (ruoloF && t.mittente_ruolo !== ruoloF) return false
      if (dateFrom && t.created_at < dateFrom) return false
      if (dateTo && t.created_at > dateTo + 'T23:59:59') return false
      if (search) {
        const mitt = `${t.mittente?.nome ?? ''} ${t.mittente?.cognome ?? ''}`
        if (!`${t.oggetto} ${mitt}`.toLowerCase().includes(search.toLowerCase())) return false
      }
      return true
    })
    .sort(sortFn)

  const hasFilters = search || statoF || ruoloF || dateFrom || dateTo

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Aperti" value={nAperti} colorClass={nAperti > 0 ? 'text-red-400' : 'text-nebbia/30'} />
        <StatCard label="Da rispondere" value={nDaRisp} colorClass={nDaRisp > 0 ? 'text-amber-400' : 'text-nebbia/30'} />
        <StatCard label="Totale" value={tickets.length} colorClass="text-nebbia/60" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-44">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
          <input placeholder="Cerca titolo, mittente..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
        </div>
        <select value={statoF} onChange={e => setStatoF(e.target.value)}
          className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
          <option value="">Tutti gli stati</option>
          <option value="aperto">Aperto</option>
          <option value="chiuso">Chiuso</option>
        </select>
        <select value={ruoloF} onChange={e => setRuoloF(e.target.value)}
          className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
          <option value="">Tutti i ruoli</option>
          <option value="avvocato">Avvocato</option>
          <option value="user">User</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="font-body text-xs text-nebbia/30 whitespace-nowrap">Dal</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50" />
        </div>
        <div className="flex items-center gap-2">
          <label className="font-body text-xs text-nebbia/30 whitespace-nowrap">Al</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50" />
        </div>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatoF(''); setRuoloF(''); setDateFrom(''); setDateTo('') }}
            className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors px-3 py-2.5 border border-white/5 hover:border-red-500/30">
            Reset
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-slate border border-white/5 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 w-6" />
                <SortTh label="Titolo" field="oggetto"    {...{ sortField, sortDir, onSort: handleSort }} />
                <SortTh label="Mittente" field="created_at" {...{ sortField, sortDir, onSort: handleSort }} />
                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Ruolo</th>
                <SortTh label="Data" field="created_at" {...{ sortField, sortDir, onSort: handleSort }} />
                <SortTh label="Stato" field="stato"      {...{ sortField, sortDir, onSort: handleSort }} />
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">
                    Nessun ticket trovato
                  </td>
                </tr>
              ) : rows.map(t => {
                const msgs = [...(t.messaggi ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                const daRisp = t.stato === 'aperto' && msgs.length > 0 && msgs[0]?.autore_tipo !== 'admin'
                const rb = RUOLO_BADGE[t.mittente_ruolo] ?? RUOLO_BADGE.user
                const mitt = `${t.mittente?.nome ?? ''} ${t.mittente?.cognome ?? ''}`.trim() || '—'

                return (
                  <tr key={t.id}
                    onClick={() => navigate(`/admin/assistenza/${t.id}`)}
                    className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      {daRisp && <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />}
                    </td>
                    <td className="px-4 py-3 font-body text-sm font-medium text-nebbia">{t.oggetto}</td>
                    <td className="px-4 py-3 font-body text-sm text-nebbia/60">{mitt}</td>
                    <td className="px-4 py-3"><Badge label={rb.label} variant={rb.variant} /></td>
                    <td className="px-4 py-3 font-body text-xs text-nebbia/50 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={t.stato === 'aperto' ? 'Aperto' : 'Chiuso'} variant={t.stato === 'aperto' ? 'red' : 'gray'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20">
                        <ArrowRight size={14} />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB 2 — AVVOCATO ↔ CLIENTE
// sola lettura — clic sulla riga apre la chat inline
// ─────────────────────────────────────────────────────────────
function TabComunicazioni() {
  const { sortField, sortDir, handleSort, sortFn } = useSort('created_at', 'desc')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [ticketAperto, setTicketAperto] = useState(null)
  const [messaggi, setMessaggi] = useState([])
  const [loadingChat, setLoadingChat] = useState(false)
  const [search, setSearch] = useState('')
  const [statoF, setStatoF] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    async function carica() {
      setLoading(true)
      const { data } = await supabase
        .from('ticket_assistenza')
        .select(`
          id, oggetto, stato, created_at, mittente_ruolo,
          mittente:mittente_id(nome, cognome),
          destinatario:destinatario_id(nome, cognome)
        `)
        .not('destinatario_id', 'is', null)
        .order('created_at', { ascending: false })
      setTickets(data ?? [])
      setLoading(false)
    }
    carica()
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messaggi])

  async function apriChat(t) {
    setTicketAperto(t)
    setLoadingChat(true)
    const { data } = await supabase
      .from('messaggi_ticket')
      .select('id, testo, autore_tipo, created_at, autore:autore_id(nome, cognome)')
      .eq('ticket_id', t.id)
      .order('created_at', { ascending: true })
    setMessaggi(data ?? [])
    setLoadingChat(false)
  }

  const rows = tickets
    .filter(t => {
      if (statoF && t.stato !== statoF) return false
      if (dateFrom && t.created_at < dateFrom) return false
      if (dateTo && t.created_at > dateTo + 'T23:59:59') return false
      if (search) {
        const mitt = `${t.mittente?.nome ?? ''} ${t.mittente?.cognome ?? ''}`
        const dest = `${t.destinatario?.nome ?? ''} ${t.destinatario?.cognome ?? ''}`
        if (!`${t.oggetto} ${mitt} ${dest}`.toLowerCase().includes(search.toLowerCase())) return false
      }
      return true
    })
    .sort(sortFn)

  const hasFilters = search || statoF || dateFrom || dateTo

  // Vista chat inline
  if (ticketAperto) {
    return (
      <div className="space-y-4">
        <div className="bg-petrolio/40 border border-white/5 px-4 py-3">
          <p className="font-body text-xs text-nebbia/40">Sola lettura — l'admin non partecipa a questa conversazione.</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => { setTicketAperto(null); setMessaggi([]) }}
            className="text-nebbia/40 hover:text-nebbia transition-colors">
            <ArrowRight size={16} className="rotate-180" />
          </button>
          <div className="min-w-0">
            <p className="font-body text-sm font-medium text-nebbia">{ticketAperto.oggetto}</p>
            <p className="font-body text-xs text-nebbia/40">
              {`${ticketAperto.mittente?.nome ?? ''} ${ticketAperto.mittente?.cognome ?? ''}`.trim()}
              {' → '}
              {`${ticketAperto.destinatario?.nome ?? ''} ${ticketAperto.destinatario?.cognome ?? ''}`.trim()}
            </p>
          </div>
          <Badge
            label={ticketAperto.stato === 'aperto' ? 'Aperto' : 'Chiuso'}
            variant={ticketAperto.stato === 'aperto' ? 'salvia' : 'gray'}
          />
        </div>

        <div className="bg-slate border border-white/5 overflow-y-auto p-5 space-y-3" style={{ maxHeight: 480 }}>
          {loadingChat ? (
            <div className="flex items-center justify-center py-12">
              <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
            </div>
          ) : messaggi.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <MessageSquare size={28} className="text-nebbia/15" />
              <p className="font-body text-sm text-nebbia/30">Nessun messaggio</p>
            </div>
          ) : messaggi.map(msg => {
            const isMio = msg.autore_tipo === 'avvocato'
            return (
              <div key={msg.id} className={`flex ${isMio ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-sm px-4 py-2.5 ${isMio ? 'bg-oro/15 border border-oro/20' : 'bg-petrolio border border-white/10'}`}>
                  <p className={`font-body text-[10px] font-medium mb-1 ${isMio ? 'text-oro/60 text-right' : 'text-nebbia/40'}`}>
                    {msg.autore?.nome} {msg.autore?.cognome} · {msg.autore_tipo}
                  </p>
                  <p className="font-body text-sm text-nebbia leading-relaxed">{msg.testo}</p>
                  <p className={`font-body text-[10px] text-nebbia/25 mt-1 ${isMio ? 'text-right' : ''}`}>
                    {new Date(msg.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>
    )
  }

  // Lista ticket
  return (
    <div className="space-y-4">
      <div className="bg-petrolio/40 border border-white/5 px-4 py-3">
        <p className="font-body text-xs text-nebbia/40">
          Supervisione dei messaggi tra avvocati e clienti. Clicca su una riga per leggere la conversazione.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-44">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
          <input placeholder="Cerca titolo, mittente, destinatario..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
        </div>
        <select value={statoF} onChange={e => setStatoF(e.target.value)}
          className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
          <option value="">Tutti gli stati</option>
          <option value="aperto">Aperto</option>
          <option value="chiuso">Chiuso</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="font-body text-xs text-nebbia/30 whitespace-nowrap">Dal</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50" />
        </div>
        <div className="flex items-center gap-2">
          <label className="font-body text-xs text-nebbia/30 whitespace-nowrap">Al</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50" />
        </div>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatoF(''); setDateFrom(''); setDateTo('') }}
            className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors px-3 py-2.5 border border-white/5 hover:border-red-500/30">
            Reset
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-slate border border-white/5 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <SortTh label="Titolo" field="oggetto"    {...{ sortField, sortDir, onSort: handleSort }} />
                <SortTh label="Mittente" field="created_at" {...{ sortField, sortDir, onSort: handleSort }} />
                <SortTh label="Destinatario" field="created_at" {...{ sortField, sortDir, onSort: handleSort }} />
                <SortTh label="Data" field="created_at" {...{ sortField, sortDir, onSort: handleSort }} />
                <SortTh label="Stato" field="stato"      {...{ sortField, sortDir, onSort: handleSort }} />
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">
                    Nessun messaggio trovato
                  </td>
                </tr>
              ) : rows.map(t => (
                <tr key={t.id}
                  onClick={() => apriChat(t)}
                  className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-body text-sm font-medium text-nebbia">{t.oggetto}</td>
                  <td className="px-4 py-3 font-body text-sm text-nebbia/60">
                    {`${t.mittente?.nome ?? ''} ${t.mittente?.cognome ?? ''}`.trim() || '—'}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-nebbia/60">
                    {`${t.destinatario?.nome ?? ''} ${t.destinatario?.cognome ?? ''}`.trim() || '—'}
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-nebbia/50 whitespace-nowrap">
                    {new Date(t.created_at).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={t.stato === 'aperto' ? 'Aperto' : 'Chiuso'} variant={t.stato === 'aperto' ? 'salvia' : 'gray'} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20">
                      <ArrowRight size={14} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PAGINA LISTA
// ─────────────────────────────────────────────────────────────
export function AdminAssistenza() {
  const [tab, setTab] = useState('supporto')
  const [nAperti, setNAperti] = useState(0)

  useEffect(() => {
    supabase
      .from('ticket_assistenza')
      .select('id', { count: 'exact', head: true })
      .is('destinatario_id', null)
      .eq('stato', 'aperto')
      .then(({ count }) => setNAperti(count ?? 0))
  }, [])

  return (
    <div className="space-y-5">
      <PageHeader label="Admin" title="Assistenza" />

      <div className="flex gap-0 border-b border-white/8">
        {[
          { id: 'supporto', label: 'Supporto Lexum', badge: nAperti },
          { id: 'comunicazioni', label: 'Avvocato / Cliente', badge: 0 },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 font-body text-sm border-b-2 transition-colors ${tab === t.id ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'
              }`}>
            {t.label}
            {t.badge > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tab === t.id ? 'bg-oro/20 text-oro' : 'bg-amber-400/15 text-amber-400'
                }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'supporto' && <TabSupporto />}
      {tab === 'comunicazioni' && <TabComunicazioni />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DETTAGLIO TICKET (solo per Supporto Lexum)
// ─────────────────────────────────────────────────────────────
export function AdminAssistenzaDettaglio() {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [messaggi, setMessaggi] = useState([])
  const [meId, setMeId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [testo, setTesto] = useState('')
  const [stato, setStato] = useState('aperto')
  const [inviando, setInviando] = useState(false)
  const [errore, setErrore] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => { carica() }, [id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messaggi])

  async function carica() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setMeId(user.id)

    const { data: t } = await supabase
      .from('ticket_assistenza')
      .select(`
        id, oggetto, stato, created_at, mittente_ruolo, nota_interna,
        mittente:mittente_id(id, nome, cognome, role)
      `)
      .eq('id', id)
      .single()

    if (t) { setTicket(t); setStato(t.stato); }

    const { data: msgs } = await supabase
      .from('messaggi_ticket')
      .select('id, testo, autore_tipo, created_at, autore:autore_id(nome, cognome)')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    setMessaggi(msgs ?? [])
    setLoading(false)
  }

  async function inviaMessaggio() {
    if (!testo.trim() || stato === 'chiuso') return
    setInviando(true)
    setErrore('')
    try {
      const { data, error } = await supabase
        .from('messaggi_ticket')
        .insert({ ticket_id: id, autore_id: meId, autore_tipo: 'admin', testo: testo.trim() })
        .select('id, testo, autore_tipo, created_at, autore:autore_id(nome, cognome)')
        .single()

      if (error) throw new Error(error.message)

      const { error: upErr } = await supabase.from('ticket_assistenza').update({ ultimo_mittente: 'admin' }).eq('id', id)
      console.log('update ultimo_mittente:', upErr)
      setMessaggi(prev => [...prev, data])
      setTesto('')
    } catch (err) {
      setErrore(err.message)
    } finally {
      setInviando(false)
    }
  }

  async function aggiornaStato(nuovoStato) {
    await supabase.from('ticket_assistenza').update({ stato: nuovoStato }).eq('id', id)
    setStato(nuovoStato)
  }

  async function salvaNota() {
    setSalvandoNota(true)
    await supabase.from('ticket_assistenza').update({ nota_interna: notaInterna }).eq('id', id)
    setSalvandoNota(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="space-y-5">
        <BackButton to="/admin/assistenza" label="Tutti i ticket" />
        <p className="font-body text-sm text-nebbia/40">Ticket non trovato.</p>
      </div>
    )
  }

  const rb = RUOLO_BADGE[ticket.mittente_ruolo] ?? RUOLO_BADGE.user
  const mitt = `${ticket.mittente?.nome ?? ''} ${ticket.mittente?.cognome ?? ''}`.trim() || '—'

  return (
    <div className="space-y-5">
      <BackButton to="/admin/assistenza" label="Tutti i ticket" />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="section-label mb-2">Ticket</p>
          <h1 className="font-display text-3xl font-light text-nebbia">{ticket.oggetto}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="font-body text-xs text-nebbia/40">{mitt}</p>
            <Badge label={rb.label} variant={rb.variant} />
            <span className="font-body text-xs text-nebbia/30">·</span>
            <p className="font-body text-xs text-nebbia/40">{new Date(ticket.created_at).toLocaleDateString('it-IT')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge label={stato === 'aperto' ? 'Aperto' : 'Chiuso'} variant={stato === 'aperto' ? 'red' : 'gray'} />
          {stato === 'aperto' ? (
            <button onClick={() => aggiornaStato('chiuso')}
              className="font-body text-xs text-nebbia/30 hover:text-salvia border border-white/10 hover:border-salvia/30 px-3 py-1.5 transition-colors">
              Chiudi ticket
            </button>
          ) : (
            <button onClick={() => aggiornaStato('aperto')}
              className="font-body text-xs text-nebbia/30 hover:text-oro border border-white/10 hover:border-oro/30 px-3 py-1.5 transition-colors">
              Riapri
            </button>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="bg-slate border border-white/5">
        <div className="overflow-y-auto p-5 space-y-3" style={{ minHeight: 320, maxHeight: 520 }}>
          {messaggi.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <MessageSquare size={28} className="text-nebbia/15" />
              <p className="font-body text-sm text-nebbia/30">Nessun messaggio</p>
            </div>
          ) : messaggi.map(msg => {
            const isMio = msg.autore_tipo === 'admin'
            return (
              <div key={msg.id} className={`flex ${isMio ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xl px-4 py-3 ${isMio ? 'bg-oro/15 border border-oro/20' : 'bg-petrolio/60 border border-white/8'}`}>
                  <p className={`font-body text-[10px] font-medium mb-1 ${isMio ? 'text-oro/60 text-right' : 'text-nebbia/40'}`}>
                    {msg.autore?.nome} {msg.autore?.cognome}
                  </p>
                  <p className="font-body text-sm text-nebbia leading-relaxed">{msg.testo}</p>
                  <p className={`font-body text-[10px] text-nebbia/25 mt-1 ${isMio ? 'text-right' : ''}`}>
                    {new Date(msg.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {stato === 'aperto' ? (
          <div className="border-t border-white/5 p-4 space-y-2">
            <div className="flex gap-3 items-end">
              <textarea rows={2} value={testo} onChange={e => setTesto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); inviaMessaggio() } }}
                placeholder="Scrivi una risposta... (Invio per inviare)"
                className="flex-1 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />
              <button onClick={inviaMessaggio} disabled={inviando || !testo.trim()}
                className="btn-primary text-sm self-end px-4 py-3 shrink-0 disabled:opacity-40">
                {inviando ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <Send size={15} />}
              </button>
            </div>
            {errore && (
              <div className="flex items-center gap-2 text-red-400 text-xs font-body">
                <AlertCircle size={12} /> {errore}
              </div>
            )}
            <p className="font-body text-[10px] text-nebbia/20">Invio con Enter · A capo con Shift+Enter</p>
          </div>
        ) : (
          <div className="border-t border-white/5 p-4 text-center">
            <p className="font-body text-xs text-nebbia/30">Ticket chiuso — non è possibile inviare altri messaggi</p>
          </div>
        )}
      </div>
    </div>
  )
}