// src/pages/admin/Pagamenti.jsx

import { useState, useEffect } from 'react'
import { PageHeader, Badge, StatCard } from '@/components/shared'
import {
    Download, Search, ChevronUp, ChevronDown,
    ArrowUpDown, CheckCircle, XCircle, AlertCircle, ArrowRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const STATO_PAG_BADGE = {
    completato: { label: 'Completato', variant: 'salvia' },
    fallito: { label: 'Fallito', variant: 'red' },
    rimborsato: { label: 'Rimborsato', variant: 'warning' },
}
const STATO_COMP_BADGE = {
    da_liquidare: { label: 'Da liquidare', variant: 'warning' },
    liquidato: { label: 'Liquidato', variant: 'salvia' },
}
const STATO_RIC_BADGE = {
    in_attesa: { label: 'In attesa', variant: 'warning' },
    elaborata: { label: 'Elaborata', variant: 'salvia' },
    rifiutata: { label: 'Rifiutata', variant: 'red' },
}

// ─── Helper per label e variant tipo prodotto ───────────────
const TIPO_PRODOTTO_CONFIG = {
    abbonamento: { label: 'Abbonamento', variant: 'oro' },
    seat_addon: { label: 'Seat add-on', variant: 'warning' },
    accesso_singolo: { label: 'Accesso', variant: 'salvia' },
    crediti_ai: { label: 'Crediti AI', variant: 'salvia' },
    spazio_archiviazione: { label: 'Storage', variant: 'salvia' },
}

function tipoConfig(tipo) {
    return TIPO_PRODOTTO_CONFIG[tipo] ?? { label: tipo ?? '—', variant: 'gray' }
}

function SortTh({ label, field, sortField, sortDir, onSort }) {
    const active = sortField === field
    return (
        <th className="px-4 py-3 text-left">
            <button onClick={() => onSort(field)} className="flex items-center gap-1.5 font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase hover:text-oro transition-colors group">
                {label}
                <span className="text-nebbia/20 group-hover:text-oro/60">
                    {active ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={11} />}
                </span>
            </button>
        </th>
    )
}

function useSort(initial = 'created_at', initialDir = 'desc') {
    const [sortField, setSortField] = useState(initial)
    const [sortDir, setSortDir] = useState(initialDir)
    function handleSort(field) {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDir('asc') }
    }
    function sortFn(a, b) {
        let va = a[sortField] ?? '', vb = b[sortField] ?? ''
        if (['importo', 'quota_autore', 'prezzo'].includes(sortField)) { va = +va; vb = +vb }
        else if (sortField === 'created_at') { va = new Date(va); vb = new Date(vb) }
        else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase() }
        if (va < vb) return sortDir === 'asc' ? -1 : 1
        if (va > vb) return sortDir === 'asc' ? 1 : -1
        return 0
    }
    return { sortField, sortDir, handleSort, sortFn }
}

// ─────────────────────────────────────────────────────────────
// TAB 1 — PAGAMENTI
// ─────────────────────────────────────────────────────────────
function TabPagamenti() {
    const { sortField, sortDir, handleSort, sortFn } = useSort('created_at', 'desc')
    const [dati, setDati] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [tipoF, setTipoF] = useState('')
    const [statoF, setStatoF] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    useEffect(() => {
        async function carica() {
            setLoading(true)
            const { data } = await supabase
                .from('transazioni')
                .select('id, tipo, importo, stato, created_at, prodotto_nome, stripe_payment_id, utente:user_id(id, nome, cognome, studio)')
                .order('created_at', { ascending: false })
            setDati(data ?? [])
            setLoading(false)
        }
        carica()
    }, [])

    // Stats per tipo
    const completate = dati.filter(p => p.stato === 'completato')
    const totale = completate.reduce((a, p) => a + parseFloat(p.importo ?? 0), 0)
    const nFalliti = dati.filter(p => p.stato === 'fallito').length
    const nAbb = completate.filter(p => p.tipo === 'abbonamento' || p.tipo === 'seat_addon').length
    const nCrediti = completate.filter(p => p.tipo === 'crediti_ai').length
    const nStorage = completate.filter(p => p.tipo === 'spazio_archiviazione').length
    const nAccessi = completate.filter(p => p.tipo === 'accesso_singolo').length

    const rows = dati.filter(p => {
        if (tipoF && p.tipo !== tipoF) return false
        if (statoF && p.stato !== statoF) return false
        if (dateFrom && p.created_at < dateFrom) return false
        if (dateTo && p.created_at > dateTo + 'T23:59:59') return false
        if (search) {
            const nome = `${p.utente?.nome ?? ''} ${p.utente?.cognome ?? ''}`
            const studio = p.utente?.studio ?? ''
            if (!`${nome} ${studio} ${p.prodotto_nome ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
        }
        return true
    }).sort(sortFn)

    const hasFilters = search || tipoF || statoF || dateFrom || dateTo

    return (
        <div className="space-y-4">
            {/* 6 stats: Revenue + 4 tipi + Falliti */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard label="Revenue totale" value={`€ ${totale.toFixed(2)}`} colorClass="text-oro" />
                <StatCard label="Abbonamenti" value={nAbb} colorClass="text-salvia" />
                <StatCard label="Crediti AI" value={nCrediti} colorClass="text-salvia" />
                <StatCard label="Storage" value={nStorage} colorClass="text-salvia" />
                <StatCard label="Accessi singoli" value={nAccessi} colorClass="text-nebbia/60" />
                <StatCard label="Falliti" value={nFalliti} colorClass={nFalliti > 0 ? 'text-red-400' : 'text-nebbia/30'} />
            </div>

            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-44">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                    <input placeholder="Cerca utente, studio, prodotto..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                </div>
                <select value={tipoF} onChange={e => setTipoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    <option value="">Tutti i tipi</option>
                    <option value="abbonamento">Abbonamento</option>
                    <option value="seat_addon">Seat add-on</option>
                    <option value="crediti_ai">Crediti AI</option>
                    <option value="spazio_archiviazione">Storage</option>
                    <option value="accesso_singolo">Accesso singolo</option>
                </select>
                <select value={statoF} onChange={e => setStatoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    <option value="">Tutti gli stati</option>
                    <option value="completato">Completato</option>
                    <option value="fallito">Fallito</option>
                    <option value="rimborsato">Rimborsato</option>
                </select>
                <div className="flex items-center gap-2">
                    <label className="font-body text-xs text-nebbia/30 whitespace-nowrap">Dal</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50" />
                </div>
                <div className="flex items-center gap-2">
                    <label className="font-body text-xs text-nebbia/30 whitespace-nowrap">Al</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50" />
                </div>
                {hasFilters && (
                    <button onClick={() => { setSearch(''); setTipoF(''); setStatoF(''); setDateFrom(''); setDateTo('') }}
                        className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors px-3 py-2.5 border border-white/5 hover:border-red-500/30">
                        Reset
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
            ) : (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <SortTh label="Data" field="created_at"    {...{ sortField, sortDir, onSort: handleSort }} />
                                <SortTh label="Utente" field="utente"         {...{ sortField, sortDir, onSort: handleSort }} />
                                <SortTh label="Prodotto" field="prodotto_nome"  {...{ sortField, sortDir, onSort: handleSort }} />
                                <SortTh label="Importo" field="importo"        {...{ sortField, sortDir, onSort: handleSort }} />
                                <SortTh label="Tipo" field="tipo"           {...{ sortField, sortDir, onSort: handleSort }} />
                                <SortTh label="Stato" field="stato"          {...{ sortField, sortDir, onSort: handleSort }} />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">Nessun pagamento trovato</td></tr>
                            ) : rows.map(p => {
                                const sb = STATO_PAG_BADGE[p.stato] ?? STATO_PAG_BADGE.completato
                                const tc = tipoConfig(p.tipo)
                                const nome = `${p.utente?.nome ?? ''} ${p.utente?.cognome ?? ''}`.trim() || '—'
                                return (
                                    <tr key={p.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                        <td className="px-4 py-3 font-body text-sm text-nebbia/60 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString('it-IT')}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-body text-sm font-medium text-nebbia">{nome}</p>
                                            {p.utente?.studio && <p className="font-body text-xs text-nebbia/30 mt-0.5">{p.utente.studio}</p>}
                                        </td>
                                        <td className="px-4 py-3 font-body text-sm text-nebbia/70">{p.prodotto_nome ?? '—'}</td>
                                        <td className="px-4 py-3 font-body text-sm text-oro font-medium">€ {parseFloat(p.importo).toFixed(2)}</td>
                                        <td className="px-4 py-3"><Badge label={tc.label} variant={tc.variant} /></td>
                                        <td className="px-4 py-3"><Badge label={sb.label} variant={sb.variant} /></td>
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
// TAB 2 — COMPENSI
// ─────────────────────────────────────────────────────────────
function TabCompensi() {
    const { sortField, sortDir, handleSort, sortFn } = useSort('created_at', 'desc')
    const [dati, setDati] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statoF, setStatoF] = useState('')
    const [avvF, setAvvF] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    useEffect(() => {
        async function carica() {
            setLoading(true)
            const { data } = await supabase
                .from('accessi_sentenze')
                .select('id, prezzo, quota_autore, stato, created_at, sentenza:sentenza_id(titolo, autore:autore_id(id, nome, cognome, studio)), acquirente:acquirente_id(nome, cognome)')
                .order('created_at', { ascending: false })
            setDati(data ?? [])
            setLoading(false)
        }
        carica()
    }, [])

    const daLiquidare = dati.filter(c => c.stato === 'da_liquidare').reduce((a, c) => a + parseFloat(c.quota_autore ?? 0), 0)
    const liquidato = dati.filter(c => c.stato === 'liquidato').reduce((a, c) => a + parseFloat(c.quota_autore ?? 0), 0)

    const avvocati = [...new Map(dati.map(c => {
        const a = c.sentenza?.autore; return a ? [a.id, `${a.nome} ${a.cognome}`] : null
    }).filter(Boolean)).entries()].map(([id, nome]) => ({ id, nome }))

    const rows = dati.filter(c => {
        if (statoF && c.stato !== statoF) return false
        if (avvF && c.sentenza?.autore?.id !== avvF) return false
        if (dateFrom && c.created_at < dateFrom) return false
        if (dateTo && c.created_at > dateTo + 'T23:59:59') return false
        if (search) {
            const avv = `${c.sentenza?.autore?.nome ?? ''} ${c.sentenza?.autore?.cognome ?? ''}`
            const acq = `${c.acquirente?.nome ?? ''} ${c.acquirente?.cognome ?? ''}`
            if (!`${avv} ${acq} ${c.sentenza?.titolo ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
        }
        return true
    }).sort(sortFn)

    const hasFilters = search || statoF || avvF || dateFrom || dateTo

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
                <StatCard label="Da liquidare" value={`€ ${daLiquidare.toFixed(2)}`} colorClass="text-amber-400" />
                <StatCard label="Già liquidato" value={`€ ${liquidato.toFixed(2)}`} colorClass="text-salvia" />
                <StatCard label="Righe totali" value={dati.length} colorClass="text-nebbia/60" />
            </div>

            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-44">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                    <input placeholder="Cerca avvocato, acquirente, sentenza..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                </div>
                <select value={avvF} onChange={e => setAvvF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    <option value="">Tutti gli avvocati</option>
                    {avvocati.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
                <select value={statoF} onChange={e => setStatoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    <option value="">Tutti gli stati</option>
                    <option value="da_liquidare">Da liquidare</option>
                    <option value="liquidato">Liquidato</option>
                </select>
                <div className="flex items-center gap-2">
                    <label className="font-body text-xs text-nebbia/30 whitespace-nowrap">Dal</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50" />
                </div>
                <div className="flex items-center gap-2">
                    <label className="font-body text-xs text-nebbia/30 whitespace-nowrap">Al</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50" />
                </div>
                {hasFilters && (
                    <button onClick={() => { setSearch(''); setStatoF(''); setAvvF(''); setDateFrom(''); setDateTo('') }}
                        className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors px-3 py-2.5 border border-white/5 hover:border-red-500/30">
                        Reset
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
            ) : (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <SortTh label="Data" field="created_at"  {...{ sortField, sortDir, onSort: handleSort }} />
                                <SortTh label="Sentenza" field="created_at"  {...{ sortField, sortDir, onSort: handleSort }} />
                                <SortTh label="Acquirente" field="created_at"  {...{ sortField, sortDir, onSort: handleSort }} />
                                <SortTh label="Avvocato" field="created_at"  {...{ sortField, sortDir, onSort: handleSort }} />
                                <SortTh label="Prezzo" field="prezzo"      {...{ sortField, sortDir, onSort: handleSort }} />
                                <SortTh label="Quota" field="quota_autore" {...{ sortField, sortDir, onSort: handleSort }} />
                                <SortTh label="Stato" field="stato"       {...{ sortField, sortDir, onSort: handleSort }} />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">Nessun compenso trovato</td></tr>
                            ) : rows.map(c => {
                                const sb = STATO_COMP_BADGE[c.stato] ?? STATO_COMP_BADGE.da_liquidare
                                const avv = `${c.sentenza?.autore?.nome ?? ''} ${c.sentenza?.autore?.cognome ?? ''}`.trim() || '—'
                                const acq = `${c.acquirente?.nome ?? ''} ${c.acquirente?.cognome ?? ''}`.trim() || '—'
                                return (
                                    <tr key={c.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                        <td className="px-4 py-3 font-body text-sm text-nebbia/60 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString('it-IT')}</td>
                                        <td className="px-4 py-3 font-body text-sm text-nebbia max-w-xs truncate">{c.sentenza?.titolo ?? '—'}</td>
                                        <td className="px-4 py-3 font-body text-sm text-nebbia/60">{acq}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-body text-sm font-medium text-nebbia">Avv. {avv}</p>
                                            {c.sentenza?.autore?.studio && <p className="font-body text-xs text-nebbia/30 mt-0.5">{c.sentenza.autore.studio}</p>}
                                        </td>
                                        <td className="px-4 py-3 font-body text-sm text-nebbia/60">€ {parseFloat(c.prezzo ?? 0).toFixed(2)}</td>
                                        <td className="px-4 py-3 font-body text-sm text-salvia font-medium">€ {parseFloat(c.quota_autore ?? 0).toFixed(2)}</td>
                                        <td className="px-4 py-3"><Badge label={sb.label} variant={sb.variant} /></td>
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
// TAB 3 — RICHIESTE PAGAMENTO
// ─────────────────────────────────────────────────────────────
function TabRichieste() {
    const { sortField, sortDir, handleSort, sortFn } = useSort('created_at', 'desc')
    const [dati, setDati] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statoF, setStatoF] = useState('in_attesa')
    const [selected, setSelected] = useState(null)
    const [nota, setNota] = useState('')
    const [elaborando, setElaborando] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => { carica() }, [])

    async function carica() {
        setLoading(true)
        const { data } = await supabase
            .from('richieste_pagamento')
            .select('id, importo, stato, note, nota_admin, created_at, avvocato:avvocato_id(id, nome, cognome, studio)')
            .order('created_at', { ascending: false })
        setDati(data ?? [])
        setLoading(false)
    }

    async function handleDecisione(tipo) {
        if (!selected) return
        setElaborando(true); setErrore('')
        try {
            const { error } = await supabase.from('richieste_pagamento')
                .update({ stato: tipo, nota_admin: nota.trim() || null }).eq('id', selected.id)
            if (error) throw new Error(error.message)
            setDati(prev => prev.map(r => r.id === selected.id ? { ...r, stato: tipo, nota_admin: nota } : r))
            setSelected(null); setNota('')
        } catch (err) { setErrore(err.message) }
        finally { setElaborando(false) }
    }

    const rows = dati.filter(r => {
        if (statoF && r.stato !== statoF) return false
        if (search) {
            const avv = `${r.avvocato?.nome ?? ''} ${r.avvocato?.cognome ?? ''}`
            const studio = r.avvocato?.studio ?? ''
            if (!`${avv} ${studio}`.toLowerCase().includes(search.toLowerCase())) return false
        }
        return true
    }).sort(sortFn)

    if (selected) {
        return (
            <div className="space-y-5 max-w-2xl">
                <button onClick={() => { setSelected(null); setNota(''); setErrore('') }}
                    className="flex items-center gap-2 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                    ← Torna alla lista
                </button>
                <div className="bg-slate border border-white/5 p-5 space-y-3">
                    <p className="section-label">Richiesta di pagamento</p>
                    {[
                        ['Avvocato', `Avv. ${selected.avvocato?.nome ?? ''} ${selected.avvocato?.cognome ?? ''}`],
                        ['Studio', selected.avvocato?.studio ?? '—'],
                        ['Data richiesta', new Date(selected.created_at).toLocaleDateString('it-IT')],
                        ['Importo richiesto', `€ ${parseFloat(selected.importo).toFixed(2)}`],
                    ].map(([l, v]) => (
                        <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                            <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                            <span className="font-body text-sm text-nebbia">{v}</span>
                        </div>
                    ))}
                    {selected.note && (
                        <div className="bg-petrolio/60 border border-white/5 p-3">
                            <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Note avvocato</p>
                            <p className="font-body text-sm text-nebbia/70">{selected.note}</p>
                        </div>
                    )}
                </div>
                <div className="bg-slate border border-white/5 p-5">
                    <p className="section-label mb-3">Nota admin</p>
                    <textarea rows={3} value={nota} onChange={e => setNota(e.target.value)} placeholder="Es. Bonifico effettuato il 10/11/2024..."
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25 mb-4" />
                    {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20 mb-3"><AlertCircle size={14} /> {errore}</div>}
                    <div className="flex gap-3">
                        <button onClick={() => handleDecisione('elaborata')} disabled={elaborando}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40">
                            {elaborando ? <span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" /> : <><CheckCircle size={14} /> Segna elaborata</>}
                        </button>
                        <button onClick={() => handleDecisione('rifiutata')} disabled={elaborando}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-900/10 border border-red-500/30 text-red-400 font-body text-sm hover:bg-red-900/20 transition-colors disabled:opacity-40">
                            {elaborando ? <span className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" /> : <><XCircle size={14} /> Rifiuta</>}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-44">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                    <input placeholder="Cerca avvocato o studio..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                </div>
                <select value={statoF} onChange={e => setStatoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    <option value="">Tutti gli stati</option>
                    <option value="in_attesa">In attesa</option>
                    <option value="elaborata">Elaborata</option>
                    <option value="rifiutata">Rifiutata</option>
                </select>
                {(search || statoF) && (
                    <button onClick={() => { setSearch(''); setStatoF('') }}
                        className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors px-3 py-2.5 border border-white/5 hover:border-red-500/30">
                        Reset
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
            ) : (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <SortTh label="Data" field="created_at" {...{ sortField, sortDir, onSort: handleSort }} />
                                <SortTh label="Avvocato" field="created_at" {...{ sortField, sortDir, onSort: handleSort }} />
                                <SortTh label="Importo" field="importo"    {...{ sortField, sortDir, onSort: handleSort }} />
                                <SortTh label="Stato" field="stato"      {...{ sortField, sortDir, onSort: handleSort }} />
                                <th className="px-4 py-3 w-10" />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">Nessuna richiesta trovata</td></tr>
                            ) : rows.map(r => {
                                const sb = STATO_RIC_BADGE[r.stato] ?? STATO_RIC_BADGE.in_attesa
                                const nome = `Avv. ${r.avvocato?.nome ?? ''} ${r.avvocato?.cognome ?? ''}`.trim()
                                return (
                                    <tr key={r.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                        <td className="px-4 py-3 font-body text-sm text-nebbia/60 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('it-IT')}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-body text-sm font-medium text-nebbia">{nome}</p>
                                            {r.avvocato?.studio && <p className="font-body text-xs text-nebbia/30 mt-0.5">{r.avvocato.studio}</p>}
                                        </td>
                                        <td className="px-4 py-3 font-body text-sm text-oro font-medium">€ {parseFloat(r.importo).toFixed(2)}</td>
                                        <td className="px-4 py-3"><Badge label={sb.label} variant={sb.variant} /></td>
                                        <td className="px-4 py-3 text-right">
                                            {r.stato === 'in_attesa' && (
                                                <button onClick={() => { setSelected(r); setNota(r.nota_admin ?? '') }}
                                                    className="inline-flex items-center justify-center w-7 h-7 text-amber-400/50 hover:text-amber-400 hover:bg-amber-400/10 transition-colors">
                                                    <ArrowRight size={14} />
                                                </button>
                                            )}
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
// PAGINA PRINCIPALE
// ─────────────────────────────────────────────────────────────
export function AdminPagamenti() {
    const [tab, setTab] = useState('pagamenti')
    const [nRichieste, setNRichieste] = useState(0)

    useEffect(() => {
        supabase.from('richieste_pagamento').select('id', { count: 'exact', head: true }).eq('stato', 'in_attesa')
            .then(({ count }) => setNRichieste(count ?? 0))
    }, [])

    const TABS = [
        { id: 'pagamenti', label: 'Pagamenti', badge: 0 },
        { id: 'compensi', label: 'Compensi', badge: 0 },
        { id: 'richieste', label: 'Richieste pagamento', badge: nRichieste },
    ]

    return (
        <div className="space-y-5">
            <PageHeader label="Admin" title="Pagamenti & Compensi" />

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

            {tab === 'pagamenti' && <TabPagamenti />}
            {tab === 'compensi' && <TabCompensi />}
            {tab === 'richieste' && <TabRichieste />}
        </div>
    )
}

export function AdminCompensi() { return <AdminPagamenti /> }