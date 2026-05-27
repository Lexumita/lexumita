// src/pages/admin/Assistenza.jsx

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader, BackButton, Badge, StatCard } from '@/components/shared'
import {
  Send, Search, ChevronUp, ChevronDown,
  ArrowUpDown, ArrowRight, AlertCircle, MessageSquare,
  Plus, X, Trash2
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
// MODAL — NUOVO TICKET ADMIN → UTENTE
// L'admin sceglie un destinatario e l'oggetto.
// Il primo messaggio verra' scritto nella pagina di dettaglio del ticket.
// ─────────────────────────────────────────────────────────────
function ModalNuovoTicket({ open, onClose, onCreato, adminId }) {
  const [destinatari, setDestinatari] = useState([])
  const [destinatarioId, setDestinatarioId] = useState('')
  const [filtroRuolo, setFiltroRuolo] = useState('') // '', 'avvocato', 'user'
  const [searchDest, setSearchDest] = useState('')
  const [oggetto, setOggetto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    if (!open) return
    setDestinatarioId('')
    setOggetto('')
    setErrore('')
    setSearchDest('')
    setFiltroRuolo('')

    async function caricaDestinatari() {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, cognome, email, role')
        .in('role', ['avvocato', 'user'])
        .order('cognome', { ascending: true })
      setDestinatari(data ?? [])
    }
    caricaDestinatari()
  }, [open])

  if (!open) return null

  const destinatariFiltrati = destinatari.filter(d => {
    if (filtroRuolo && d.role !== filtroRuolo) return false
    if (searchDest) {
      const hay = `${d.nome ?? ''} ${d.cognome ?? ''} ${d.email ?? ''}`.toLowerCase()
      if (!hay.includes(searchDest.toLowerCase())) return false
    }
    return true
  })

  async function creaTicket() {
    setErrore('')
    if (!destinatarioId) { setErrore('Seleziona un destinatario'); return }
    if (!oggetto.trim()) { setErrore('Inserisci un oggetto'); return }

    setSalvando(true)
    try {
      const { data: ticket, error: ticketErr } = await supabase
        .from('ticket_assistenza')
        .insert({
          mittente_id: adminId,
          mittente_ruolo: 'admin',
          destinatario_id: destinatarioId,
          oggetto: oggetto.trim(),
          stato: 'aperto',
          ultimo_mittente: 'admin',
        })
        .select('id')
        .single()

      if (ticketErr) throw new Error(ticketErr.message)

      onCreato(ticket.id)
    } catch (err) {
      setErrore(err.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-slate border border-white/10 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <p className="font-body text-sm font-medium text-nebbia">Nuovo ticket</p>
          <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Destinatario */}
          <div className="space-y-2">
            <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest">Destinatario</p>

            <div className="flex gap-2">
              <select value={filtroRuolo} onChange={e => setFiltroRuolo(e.target.value)}
                className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50">
                <option value="">Tutti</option>
                <option value="avvocato">Avvocati</option>
                <option value="user">User</option>
              </select>
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                <input value={searchDest} onChange={e => setSearchDest(e.target.value)}
                  placeholder="Cerca per nome o email..."
                  className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
              </div>
            </div>

            <div className="bg-petrolio border border-white/5 max-h-48 overflow-y-auto">
              {destinatariFiltrati.length === 0 ? (
                <p className="px-3 py-3 font-body text-xs text-nebbia/30 text-center">Nessun risultato</p>
              ) : destinatariFiltrati.map(d => {
                const rb = RUOLO_BADGE[d.role] ?? RUOLO_BADGE.user
                return (
                  <button key={d.id} onClick={() => setDestinatarioId(d.id)}
                    className={`w-full text-left px-3 py-2 border-b border-white/5 last:border-0 transition-colors ${destinatarioId === d.id ? 'bg-oro/10' : 'hover:bg-slate'
                      }`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-sm text-nebbia truncate">
                          {`${d.nome ?? ''} ${d.cognome ?? ''}`.trim() || '(senza nome)'}
                        </p>
                        <p className="font-body text-xs text-nebbia/40 truncate">{d.email}</p>
                      </div>
                      <Badge label={rb.label} variant={rb.variant} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Oggetto */}
          <div className="space-y-2">
            <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest">Oggetto</p>
            <input value={oggetto} onChange={e => setOggetto(e.target.value)}
              placeholder="Es. Verifica account, comunicazione importante..."
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
            <p className="font-body text-[10px] text-nebbia/30 italic">
              Dopo la creazione potrai scrivere i messaggi nella pagina di dettaglio del ticket.
            </p>
          </div>

          {errore && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
              <AlertCircle size={13} /> {errore}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/5">
          <button onClick={onClose}
            className="px-4 py-2 border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors">
            Annulla
          </button>
          <button onClick={creaTicket} disabled={salvando}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-40">
            {salvando ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin w-3 h-3 border-2 border-petrolio border-t-transparent rounded-full" />
                Creazione...
              </span>
            ) : (
              'Crea ticket'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB SUPPORTO — UNICA VISTA
// Include i ticket "Supporto Lexum":
//   - entranti aperti da utenti verso un admin specifico (destinatario_id = admin)
//   - entranti aperti verso il supporto senza destinatario (destinatario_id IS NULL, legacy)
//   - uscenti aperti dall'admin verso utenti (mittente_ruolo = 'admin')
// Esclude esplicitamente i ticket cliente <-> avvocato (li gestisce l'avvocato).
// ─────────────────────────────────────────────────────────────
function ListaTicketSupporto({ adminId, onNuovoTicket }) {
  const navigate = useNavigate()
  const { sortField, sortDir, handleSort, sortFn } = useSort('created_at', 'desc')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statoF, setStatoF] = useState('')
  const [ruoloF, setRuoloF] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  async function carica() {
    setLoading(true)

    // Carica TUTTI gli admin id, per coprire il caso in cui ci sia piu' di un admin
    // (cosi' qualunque admin loggato vede tutti i ticket entranti verso qualsiasi admin).
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
    const adminIds = (admins ?? []).map(a => a.id)

    if (adminIds.length === 0) {
      setTickets([])
      setLoading(false)
      return
    }

    const adminIdsCsv = adminIds.join(',')

    // Filtro:
    //   destinatario_id IS NULL                    -> entranti legacy senza destinatario
    //   mittente_ruolo = 'admin'                   -> uscenti aperti da un admin
    //   destinatario_id IN (admin_ids)             -> entranti diretti verso un admin
    const { data, error } = await supabase
      .from('ticket_assistenza')
      .select(`
        id, oggetto, stato, created_at, mittente_ruolo, destinatario_id,
        mittente:mittente_id(id, nome, cognome),
        destinatario:destinatario_id(id, nome, cognome, role),
        messaggi:messaggi_ticket(id, autore_tipo, created_at)
      `)
      .or(`destinatario_id.is.null,mittente_ruolo.eq.admin,destinatario_id.in.(${adminIdsCsv})`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('carica ticket admin:', error.message)
      setTickets([])
    } else {
      setTickets(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { carica() }, [adminId])

  const nAperti = tickets.filter(t => t.stato === 'aperto').length
  // "Da rispondere" = ticket aperti dove l'ultimo messaggio NON è dell'admin.
  // Vale sia per ticket entranti (utente scrive, admin deve rispondere)
  // sia per ticket uscenti (admin ha scritto, utente ha risposto, admin deve replicare).
  // Eccezione: ticket appena aperti dall'utente senza messaggi (msgs.length === 0)
  // sono comunque "da rispondere" perché l'admin non ha ancora interagito.
  const nDaRisp = tickets.filter(t => {
    if (t.stato !== 'aperto') return false
    const msgs = [...(t.messaggi ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    // Nessun messaggio + ticket aperto da non-admin -> da rispondere
    if (msgs.length === 0) return t.mittente_ruolo !== 'admin'
    return msgs[0]?.autore_tipo !== 'admin'
  }).length

  const rows = tickets
    .filter(t => {
      if (statoF && t.stato !== statoF) return false
      // Filtro per "ruolo controparte":
      // - ticket entrante (destinatario_id null o uguale a un admin) -> ruolo del mittente
      // - ticket uscente (mittente_ruolo admin) -> ruolo del destinatario
      if (ruoloF) {
        const isUscente = t.mittente_ruolo === 'admin'
        const ruoloControparte = isUscente ? t.destinatario?.role : t.mittente_ruolo
        if (ruoloControparte !== ruoloF) return false
      }
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
          <input placeholder="Cerca titolo, mittente, destinatario..." value={search} onChange={e => setSearch(e.target.value)}
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
          <option value="cliente">Cliente</option>
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
                <SortTh label="Titolo" field="oggetto" {...{ sortField, sortDir, onSort: handleSort }} />
                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Direzione</th>
                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Controparte</th>
                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Ruolo</th>
                <SortTh label="Data" field="created_at" {...{ sortField, sortDir, onSort: handleSort }} />
                <SortTh label="Stato" field="stato" {...{ sortField, sortDir, onSort: handleSort }} />
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">
                    Nessun ticket trovato
                  </td>
                </tr>
              ) : rows.map(t => {
                const msgs = [...(t.messaggi ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                const daRisp = t.stato === 'aperto' && (
                  msgs.length === 0
                    ? t.mittente_ruolo !== 'admin'
                    : msgs[0]?.autore_tipo !== 'admin'
                )

                // Direzione e controparte
                const isUscente = t.mittente_ruolo === 'admin'
                const controparteProfile = isUscente ? t.destinatario : t.mittente
                const controparteNome = `${controparteProfile?.nome ?? ''} ${controparteProfile?.cognome ?? ''}`.trim() || '—'
                const ruoloControparte = isUscente ? controparteProfile?.role : t.mittente_ruolo
                const rb = RUOLO_BADGE[ruoloControparte] ?? RUOLO_BADGE.user

                return (
                  <tr key={t.id}
                    onClick={() => navigate(`/admin/assistenza/${t.id}`)}
                    className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      {daRisp && <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />}
                    </td>
                    <td className="px-4 py-3 font-body text-sm font-medium text-nebbia">{t.oggetto}</td>
                    <td className="px-4 py-3">
                      <span className={`font-body text-[10px] px-1.5 py-0.5 uppercase tracking-wider ${isUscente ? 'bg-oro/10 border border-oro/30 text-oro' : 'bg-salvia/10 border border-salvia/30 text-salvia'
                        }`}>
                        {isUscente ? 'Uscente' : 'Entrante'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-nebbia/60">{controparteNome}</td>
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
// PAGINA LISTA
// ─────────────────────────────────────────────────────────────
export function AdminAssistenza() {
  const navigate = useNavigate()
  const [adminId, setAdminId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAdminId(data?.user?.id ?? null)
    })
  }, [])

  function onTicketCreato(ticketId) {
    setModalOpen(false)
    navigate(`/admin/assistenza/${ticketId}`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        label="Admin"
        title="Assistenza"
        action={
          <button onClick={() => setModalOpen(true)}
            className="btn-primary text-sm flex items-center gap-2">
            <Plus size={14} /> Nuovo ticket
          </button>
        }
      />

      <ListaTicketSupporto adminId={adminId} onNuovoTicket={() => setModalOpen(true)} />

      <ModalNuovoTicket
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreato={onTicketCreato}
        adminId={adminId}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DETTAGLIO TICKET
// Funziona sia per ticket entranti (utente -> admin) sia uscenti
// (admin -> utente). Lo schema è lo stesso, cambia solo chi ha aperto.
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
        id, oggetto, stato, created_at, mittente_ruolo, destinatario_id,
        mittente:mittente_id(id, nome, cognome, role),
        destinatario:destinatario_id(id, nome, cognome, role)
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

      await supabase.from('ticket_assistenza').update({ ultimo_mittente: 'admin' }).eq('id', id)
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

  async function eliminaMessaggio(msgId) {
    if (!window.confirm('Eliminare definitivamente questo messaggio?')) return
    const { error } = await supabase
      .from('messaggi_ticket')
      .delete()
      .eq('id', msgId)
      .eq('autore_id', meId)  // safety: solo i propri messaggi
    if (error) {
      alert(`Errore eliminazione: ${error.message}`)
      return
    }
    setMessaggi(prev => prev.filter(m => m.id !== msgId))
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

  // Calcola direzione e controparte
  const isUscente = ticket.mittente_ruolo === 'admin'
  const controparteProfile = isUscente ? ticket.destinatario : ticket.mittente
  const controparteNome = `${controparteProfile?.nome ?? ''} ${controparteProfile?.cognome ?? ''}`.trim() || '—'
  const ruoloControparte = isUscente ? controparteProfile?.role : ticket.mittente_ruolo
  const rb = RUOLO_BADGE[ruoloControparte] ?? RUOLO_BADGE.user

  return (
    <div className="space-y-5">
      <BackButton to="/admin/assistenza" label="Tutti i ticket" />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="section-label mb-2">Ticket {isUscente ? 'uscente' : 'entrante'}</p>
          <h1 className="font-display text-3xl font-light text-nebbia">{ticket.oggetto}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="font-body text-xs text-nebbia/40">
              {isUscente ? 'A: ' : 'Da: '}{controparteNome}
            </p>
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
              <div key={msg.id} className={`group flex ${isMio ? 'justify-end' : 'justify-start'} items-start gap-2`}>
                {/* Bottone elimina (solo se messaggio mio, visibile on-hover) */}
                {isMio && (
                  <button
                    onClick={() => eliminaMessaggio(msg.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity self-center text-nebbia/30 hover:text-red-400 p-1"
                    title="Elimina messaggio"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <div className={`max-w-xl px-4 py-3 ${isMio ? 'bg-oro/15 border border-oro/20' : 'bg-petrolio/60 border border-white/8'}`}>
                  <p className={`font-body text-[10px] font-medium mb-1 ${isMio ? 'text-oro/60 text-right' : 'text-nebbia/40'}`}>
                    {msg.autore?.nome} {msg.autore?.cognome}
                  </p>
                  <p className="font-body text-sm text-nebbia leading-relaxed whitespace-pre-wrap">{msg.testo}</p>
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