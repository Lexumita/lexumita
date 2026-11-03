// src/pages/admin/Pagamenti.jsx

import { useState, useEffect } from 'react'
import { PageHeader, Badge, StatCard } from '@/components/shared'
import {
    Download, Search, ChevronUp, ChevronDown, Plus,
    ArrowUpDown, CheckCircle, XCircle, AlertCircle, ArrowRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ModalGeneraAcquisto from '@/components/admin/ModalGeneraAcquisto'
import { formatImporto } from '@/lib/prezzi'

const STATO_PAG_BADGE = {
    completato: { label: 'Completato', variant: 'salvia' },
    fallito: { label: 'Fallito', variant: 'red' },
    rimborsato: { label: 'Rimborsato', variant: 'warning' },
}
// ─── Helper per label e variant tipo prodotto ───────────────
const TIPO_PRODOTTO_CONFIG = {
    abbonamento: { label: 'Abbonamento', variant: 'oro' },
    seat_addon: { label: 'Seat add-on', variant: 'warning' },
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
        if (['importo', 'prezzo'].includes(sortField)) { va = +va; vb = +vb }
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
            {/* 5 stats: Revenue + 3 tipi + Falliti */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard label="Revenue totale" value={`${formatImporto(totale)}`} colorClass="text-oro" />
                <StatCard label="Abbonamenti" value={nAbb} colorClass="text-salvia" />
                <StatCard label="Crediti AI" value={nCrediti} colorClass="text-salvia" />
                <StatCard label="Storage" value={nStorage} colorClass="text-salvia" />
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
                                        <td className="px-4 py-3 font-body text-sm text-oro font-medium">{formatImporto(p.importo)}</td>
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
// PAGINA PRINCIPALE
// ─────────────────────────────────────────────────────────────
export function AdminPagamenti() {
    const [mostraModal, setMostraModal] = useState(false)

    return (
        <div className="space-y-5">
            {/* HEADER con bottone "Genera acquisto manuale" allineato a destra */}
            <div className="flex items-start justify-between gap-4">
                <PageHeader label="Admin" title="Pagamenti" />
                <button
                    onClick={() => setMostraModal(true)}
                    className="btn-primary text-sm flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                    <Plus size={14} /> Genera acquisto manuale
                </button>
            </div>

            <TabPagamenti />

            {/* MODAL GENERA ACQUISTO */}
            {mostraModal && (
                <ModalGeneraAcquisto
                    onClose={() => setMostraModal(false)}
                    onSuccess={() => window.location.reload()}
                />
            )}
        </div>
    )
}

// NB: la pagina "Compensi" ora vive in src/pages/admin/Compensi.jsx
// (gestione provvigioni commerciali). Qui restava un alias segnaposto.