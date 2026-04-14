// src/pages/admin/Utenti.jsx

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Badge, StatCard } from '@/components/shared'
import { Search, ArrowRight, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ROLE_BADGE = {
  admin: { label: 'Admin', variant: 'red' },
  avvocato: { label: 'Avvocato', variant: 'oro' },
  cliente: { label: 'Cliente', variant: 'salvia' },
  user: { label: 'User', variant: 'gray' },
}

// ─────────────────────────────────────────────────────────────
// TABELLA UTENTI
// ─────────────────────────────────────────────────────────────
function TabellaUtenti({ data, loading }) {
  const [search, setSearch] = useState('')
  const [roleF, setRoleF] = useState('')
  const [statusF, setStatusF] = useState('')

  const rows = data.filter(u => {
    if (roleF && u.role !== roleF) return false
    if (statusF && u.verification_status !== statusF) return false
    if (search) {
      const q = search.toLowerCase()
      return `${u.nome} ${u.cognome} ${u.email} ${u.studio ?? ''}`.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
          <input placeholder="Cerca nome, email, studio..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
        </div>
        <select value={roleF} onChange={e => setRoleF(e.target.value)}
          className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
          <option value="">Tutti i ruoli</option>
          <option value="avvocato">Avvocato</option>
          <option value="cliente">Cliente</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select value={statusF} onChange={e => setStatusF(e.target.value)}
          className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
          <option value="">Tutti gli stati</option>
          <option value="pending">In attesa</option>
          <option value="approved">Approvato</option>
          <option value="rejected">Rifiutato</option>
        </select>
        {(search || roleF || statusF) && (
          <button onClick={() => { setSearch(''); setRoleF(''); setStatusF('') }}
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
                {['Nome', 'Email', 'Ruolo', 'Verifica', 'Registrato il', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">Nessun utente trovato</td>
                </tr>
              ) : rows.map(u => {
                const rb = ROLE_BADGE[u.role] ?? ROLE_BADGE.user
                return (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-body text-sm font-medium text-nebbia">{u.nome} {u.cognome}</p>
                      {u.studio && (
                        <p className="font-body text-xs text-nebbia/30 mt-0.5">{u.studio}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-nebbia/60">{u.email}</td>
                    <td className="px-4 py-3"><Badge label={rb.label} variant={rb.variant} /></td>
                    <td className="px-4 py-3">
                      {u.verification_status === 'pending' && <span className="font-body text-xs px-2 py-0.5 bg-amber-400/10 border border-amber-400/25 text-amber-400">In attesa</span>}
                      {u.verification_status === 'approved' && <span className="font-body text-xs px-2 py-0.5 bg-salvia/10 border border-salvia/25 text-salvia">Approvato</span>}
                      {u.verification_status === 'rejected' && <span className="font-body text-xs px-2 py-0.5 bg-red-900/10 border border-red-500/25 text-red-400">Rifiutato</span>}
                      {!u.verification_status && <span className="font-body text-xs text-nebbia/20">—</span>}
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/utenti/${u.id}`}
                        className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-oro hover:bg-oro/10 transition-colors">
                        <ArrowRight size={14} />
                      </Link>
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
// TAB VERIFICHE
// ─────────────────────────────────────────────────────────────
function TabVerifiche({ data, loading, onDecision }) {
  const [selected, setSelected] = useState(null)
  const [motivazione, setMotivazione] = useState('')
  const [elaborando, setElaborando] = useState(false)
  const [errore, setErrore] = useState('')

  const pending = data.filter(u => u.verification_status === 'pending')

  async function handleDecisione(userId, tipo) {
    if (tipo === 'rejected' && !motivazione.trim()) return setErrore('La motivazione è obbligatoria per il rifiuto')
    setErrore(''); setElaborando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fnName = tipo === 'approved' ? 'approve-verifica' : 'reject-verifica'
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ user_id: userId, motivazione }),
        }
      )
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      onDecision(userId, tipo)
      setSelected(null); setMotivazione('')
    } catch (err) { setErrore(err.message) } finally { setElaborando(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>

  if (pending.length === 0) return (
    <div className="bg-slate border border-white/5 p-16 text-center">
      <CheckCircle size={40} className="text-salvia mx-auto mb-4" />
      <p className="font-display text-xl font-light text-nebbia/40">Nessuna verifica in attesa</p>
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-2">
        {pending.map(u => (
          <button key={u.id}
            onClick={() => { setSelected(selected?.id === u.id ? null : u); setMotivazione(''); setErrore('') }}
            className={`w-full text-left p-4 border transition-all ${selected?.id === u.id ? 'bg-oro/8 border-oro/30' : 'bg-slate border-white/5 hover:border-amber-500/30'}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                <span className="font-display text-sm font-semibold text-amber-400">{(u.nome ?? '?')[0]}</span>
              </div>
              <div className="min-w-0">
                <p className="font-body text-sm font-medium text-nebbia">{u.nome} {u.cognome}</p>
                {u.studio && <p className="font-body text-xs text-nebbia/30">{u.studio}</p>}
                <p className="font-body text-xs text-nebbia/40 truncate">{u.email}</p>
                <p className="font-body text-[10px] text-nebbia/25 mt-0.5">Registrato il {new Date(u.created_at).toLocaleDateString('it-IT')}</p>
              </div>
              <ArrowRight size={14} className={`ml-auto shrink-0 ${selected?.id === u.id ? 'text-oro' : 'text-nebbia/20'}`} />
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="bg-slate border border-white/5 p-5 space-y-4">
          <div>
            <p className="section-label mb-2">Verifica identità</p>
            <p className="font-body text-lg font-medium text-nebbia">{selected.nome} {selected.cognome}</p>
            {selected.studio && <p className="font-body text-sm text-nebbia/40">{selected.studio}</p>}
            <p className="font-body text-sm text-nebbia/40">{selected.email}</p>
          </div>
          <div className="bg-petrolio/40 border border-white/5 p-4">
            <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-3">Documenti caricati</p>
            <div className="flex items-center gap-2 p-2 border border-white/5">
              <FileText size={13} className="text-nebbia/30" />
              <span className="font-body text-xs text-nebbia/50">I documenti caricati dall'utente appariranno qui</span>
            </div>
          </div>
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
              Motivazione <span className="text-nebbia/25 normal-case tracking-normal">(obbligatoria in caso di rifiuto)</span>
            </label>
            <textarea rows={3} value={motivazione} onChange={e => setMotivazione(e.target.value)}
              placeholder="Es. documento di identità non leggibile..."
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />
          </div>
          {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errore}</div>}
          <div className="flex gap-3">
            <button onClick={() => handleDecisione(selected.id, 'approved')} disabled={elaborando}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40">
              {elaborando ? <span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" /> : <><CheckCircle size={14} /> Approva</>}
            </button>
            <button onClick={() => handleDecisione(selected.id, 'rejected')} disabled={elaborando}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-900/10 border border-red-500/30 text-red-400 font-body text-sm hover:bg-red-900/20 transition-colors disabled:opacity-40">
              {elaborando ? <span className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" /> : <><XCircle size={14} /> Rifiuta</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PAGINA PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function AdminUtenti() {
  const [utenti, setUtenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('tutti')

  useEffect(() => { carica() }, [])

  async function carica() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, cognome, email, role, studio, verification_status, created_at')
      .order('created_at', { ascending: false })
    setUtenti(data ?? [])
    setLoading(false)
  }

  function handleDecision(userId, tipo) {
    setUtenti(prev => prev.map(u =>
      u.id === userId ? { ...u, verification_status: tipo, role: tipo === 'approved' ? 'avvocato' : u.role } : u
    ))
  }

  const nAvvocati = utenti.filter(u => u.role === 'avvocato').length
  const nClienti = utenti.filter(u => u.role === 'cliente').length
  const nUser = utenti.filter(u => u.role === 'user').length
  const nVerifiche = utenti.filter(u => u.verification_status === 'pending').length

  const TABS = [
    { id: 'tutti', label: 'Tutti', badge: null },
    { id: 'verifiche', label: 'Da verificare', badge: nVerifiche },
  ]

  return (
    <div className="space-y-5">
      <PageHeader label="Admin" title="Utenti" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Avvocati" value={nAvvocati} colorClass="text-oro" />
        <StatCard label="Clienti" value={nClienti} colorClass="text-salvia" />
        <StatCard label="Registrati" value={nUser} colorClass="text-nebbia/40" />
        <StatCard label="Da verificare" value={nVerifiche} colorClass={nVerifiche > 0 ? 'text-amber-400' : 'text-nebbia/30'} />
      </div>

      <div className="flex gap-0 border-b border-white/8">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 font-body text-sm border-b-2 transition-colors ${tab === t.id ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'}`}>
            {t.label}
            {t.badge > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tab === t.id ? 'bg-oro/20 text-oro' : 'bg-amber-400/15 text-amber-400'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'verifiche'
        ? <TabVerifiche data={utenti} loading={loading} onDecision={handleDecision} />
        : <TabellaUtenti data={utenti} loading={loading} />
      }
    </div>
  )
}