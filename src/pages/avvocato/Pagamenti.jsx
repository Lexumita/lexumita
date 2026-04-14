// src/pages/avvocato/Pagamenti.jsx

import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Badge, StatCard } from '@/components/shared'
import { Search, Plus, ChevronUp, ChevronDown, ArrowUpDown, FileText, CreditCard, AlertCircle, Check, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const STATO_CONFIG = {
    pagata: { label: 'Pagata', variant: 'salvia' },
    in_attesa: { label: 'In attesa', variant: 'warning' },
    scaduta: { label: 'Scaduta', variant: 'red' },
    annullata: { label: 'Annullata', variant: 'gray' },
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

function FormNuovaFattura({ meId, ids, onSaved, onCancel }) {
    const [clienti, setClienti] = useState([])
    const [pratiche, setPratiche] = useState([])
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')
    const [form, setForm] = useState({
        cliente_id: '', pratica_id: '', descrizione: '', importo: '',
        data_emissione: new Date().toISOString().slice(0, 10), data_scadenza: '', numero: '',
    })

    const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

    useEffect(() => {
        async function carica() {
            const [{ data: cl }, { data: pr }] = await Promise.all([
                supabase.from('profiles').select('id, nome, cognome').eq('role', 'cliente').in('avvocato_id', ids).order('cognome'),
                supabase.from('pratiche').select('id, titolo').in('avvocato_id', ids).neq('stato', 'archiviata').order('titolo'),
            ])
            setClienti(cl ?? [])
            setPratiche(pr ?? [])
        }
        carica()
    }, [ids.join(',')])

    async function handleSalva() {
        setErrore('')
        if (!form.importo || isNaN(+form.importo)) return setErrore('Importo non valido')
        if (!form.data_scadenza) return setErrore('Data scadenza obbligatoria')
        setSalvando(true)
        try {
            let numero = form.numero.trim()
            if (!numero) {
                const anno = new Date().getFullYear()
                const { count } = await supabase.from('fatture').select('id', { count: 'exact', head: true }).eq('avvocato_id', meId)
                numero = `F-${anno}-${String((count ?? 0) + 1).padStart(3, '0')}`
            }
            const { error } = await supabase.from('fatture').insert({
                numero, cliente_id: form.cliente_id || null, pratica_id: form.pratica_id || null,
                avvocato_id: meId, importo: parseFloat(form.importo),
                descrizione: form.descrizione.trim() || null, stato: 'in_attesa',
                data_emissione: form.data_emissione, data_scadenza: form.data_scadenza,
            })
            if (error) throw new Error(error.message)
            onSaved()
        } catch (err) { setErrore(err.message) }
        finally { setSalvando(false) }
    }

    return (
        <div className="bg-slate border border-oro/20 p-5 space-y-4">
            <p className="section-label">Nuova fattura</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Numero fattura</label>
                    <input placeholder="Es. F-2024-001 (auto se vuoto)" {...f('numero')}
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                </div>
                <div>
                    <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Importo (€) *</label>
                    <input type="number" min="0" step="0.01" placeholder="0.00" {...f('importo')}
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Cliente</label>
                    <select {...f('cliente_id')} className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                        <option value="">Seleziona cliente</option>
                        {clienti.map(c => <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Pratica</label>
                    <select {...f('pratica_id')} className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                        <option value="">Seleziona pratica</option>
                        {pratiche.map(p => <option key={p.id} value={p.id}>{p.titolo}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Descrizione</label>
                <input placeholder="Es. Consulenza legale, udienza..." {...f('descrizione')}
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Data emissione</label>
                    <input type="date" {...f('data_emissione')} className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50" />
                </div>
                <div>
                    <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Data scadenza *</label>
                    <input type="date" {...f('data_scadenza')} className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50" />
                </div>
            </div>
            {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errore}</div>}
            <div className="flex gap-3">
                <button onClick={handleSalva} disabled={salvando} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">
                    {salvando ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Check size={14} /> Salva fattura</>}
                </button>
                <button onClick={onCancel} className="btn-secondary text-sm">Annulla</button>
            </div>
        </div>
    )
}

export default function AvvocatoPagamenti() {
    const [fatture, setFatture] = useState([])
    const [loading, setLoading] = useState(true)
    const [meId, setMeId] = useState(null)
    const [ids, setIds] = useState([])
    const [showForm, setShowForm] = useState(false)

    const [search, setSearch] = useState('')
    const [statoF, setStatoF] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [sortField, setSortField] = useState('data_emissione')
    const [sortDir, setSortDir] = useState('desc')
    const [updatingId, setUpdatingId] = useState(null)

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            setMeId(user.id)
            const { data: profilo } = await supabase.from('profiles').select('posti_acquistati').eq('id', user.id).single()
            const haStudio = (profilo?.posti_acquistati ?? 1) > 1
            let allIds = [user.id]
            if (haStudio) {
                const { data: collabs } = await supabase.from('profiles').select('id').eq('titolare_id', user.id)
                allIds = [user.id, ...(collabs ?? []).map(c => c.id)]
            }
            setIds(allIds)
        }
        init()
    }, [])

    const carica = useCallback(async () => {
        if (!meId || ids.length === 0) return
        setLoading(true)
        const { data } = await supabase
            .from('fatture')
            .select('id, numero, importo, stato, data_emissione, data_scadenza, data_pagamento, descrizione, cliente:cliente_id(id, nome, cognome), pratica:pratica_id(id, titolo)')
            .in('avvocato_id', ids)
            .order('data_emissione', { ascending: false })
        setFatture(data ?? [])
        setLoading(false)
    }, [meId, ids])

    useEffect(() => { carica() }, [carica])

    function handleSort(f) {
        if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(f); setSortDir('asc') }
    }

    async function cambiaStato(id, nuovoStato) {
        setUpdatingId(id)
        const extra = nuovoStato === 'pagata' ? { data_pagamento: new Date().toISOString().slice(0, 10) } : {}
        await supabase.from('fatture').update({ stato: nuovoStato, ...extra }).eq('id', id)
        setFatture(prev => prev.map(f => f.id === id ? { ...f, stato: nuovoStato, ...extra } : f))
        setUpdatingId(null)
    }

    const totPagate = fatture.filter(f => f.stato === 'pagata').reduce((a, f) => a + parseFloat(f.importo ?? 0), 0)
    const totAttesa = fatture.filter(f => f.stato === 'in_attesa').reduce((a, f) => a + parseFloat(f.importo ?? 0), 0)
    const totScadute = fatture.filter(f => f.stato === 'scaduta').reduce((a, f) => a + parseFloat(f.importo ?? 0), 0)

    const rows = fatture
        .filter(f => {
            if (statoF && f.stato !== statoF) return false
            if (dateFrom && f.data_emissione < dateFrom) return false
            if (dateTo && f.data_emissione > dateTo) return false
            if (search) {
                const cl = `${f.cliente?.nome ?? ''} ${f.cliente?.cognome ?? ''}`
                if (!`${cl} ${f.pratica?.titolo ?? ''} ${f.numero ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
            }
            return true
        })
        .sort((a, b) => {
            let va = a[sortField] ?? '', vb = b[sortField] ?? ''
            if (sortField === 'importo') { va = +va; vb = +vb }
            else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase() }
            if (va < vb) return sortDir === 'asc' ? -1 : 1
            if (va > vb) return sortDir === 'asc' ? 1 : -1
            return 0
        })

    const hasFilters = search || statoF || dateFrom || dateTo

    return (
        <div className="space-y-5">
            <PageHeader label="Pagamenti" title="Fatture clienti"
                action={
                    <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm flex items-center gap-2">
                        <Plus size={15} /> Nuova fattura
                    </button>
                }
            />

            {showForm && meId && (
                <FormNuovaFattura meId={meId} ids={ids} onSaved={() => { setShowForm(false); carica() }} onCancel={() => setShowForm(false)} />
            )}

            <div className="grid grid-cols-3 gap-4">
                <StatCard label="Incassato" value={`€ ${totPagate.toFixed(2)}`} colorClass="text-salvia" />
                <StatCard label="In attesa" value={`€ ${totAttesa.toFixed(2)}`} colorClass="text-amber-400" />
                <StatCard label="Scaduto" value={`€ ${totScadute.toFixed(2)}`} colorClass="text-red-400" />
            </div>

            {totScadute > 0 && (
                <div className="bg-red-900/10 border border-red-500/20 p-4 flex items-center gap-3">
                    <CreditCard size={14} className="text-red-400 shrink-0" />
                    <p className="font-body text-sm text-nebbia/60">
                        Hai <span className="text-red-400 font-medium">€ {totScadute.toFixed(2)}</span> in fatture scadute.
                    </p>
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-44">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                    <input placeholder="Cerca cliente, pratica, numero..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                </div>
                <select value={statoF} onChange={e => setStatoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    <option value="">Tutti gli stati</option>
                    {Object.entries(STATO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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
                    <button onClick={() => { setSearch(''); setStatoF(''); setDateFrom(''); setDateTo('') }}
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
                                <SortTh label="N°" field="numero" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                <SortTh label="Cliente" field="data_emissione" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Pratica</th>
                                <SortTh label="Importo" field="importo" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                <SortTh label="Emessa il" field="data_emissione" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                <SortTh label="Scadenza" field="data_scadenza" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                <SortTh label="Stato" field="stato" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 w-24" />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr><td colSpan={8} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">
                                    {fatture.length === 0 ? 'Nessuna fattura ancora. Crea la prima.' : 'Nessuna fattura trovata'}
                                </td></tr>
                            ) : rows.map(f => {
                                const sc = STATO_CONFIG[f.stato] ?? STATO_CONFIG.in_attesa
                                const isScaduta = f.stato === 'scaduta'
                                const cliente = `${f.cliente?.nome ?? ''} ${f.cliente?.cognome ?? ''}`.trim() || '—'
                                const busy = updatingId === f.id
                                return (
                                    <tr key={f.id} className={`border-b border-white/5 hover:bg-petrolio/40 transition-colors ${isScaduta ? 'bg-red-900/5' : ''}`}>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/50 font-medium">{f.numero ?? '—'}</td>
                                        <td className="px-4 py-3 font-body text-sm font-medium text-nebbia">{cliente}</td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/50 max-w-xs truncate">{f.pratica?.titolo ?? f.descrizione ?? '—'}</td>
                                        <td className="px-4 py-3 font-body text-sm font-medium text-oro">€ {parseFloat(f.importo).toFixed(2)}</td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/50 whitespace-nowrap">{f.data_emissione ? new Date(f.data_emissione).toLocaleDateString('it-IT') : '—'}</td>
                                        <td className={`px-4 py-3 font-body text-xs whitespace-nowrap ${isScaduta ? 'text-red-400' : 'text-nebbia/50'}`}>{f.data_scadenza ? new Date(f.data_scadenza).toLocaleDateString('it-IT') : '—'}</td>
                                        <td className="px-4 py-3"><Badge label={sc.label} variant={sc.variant} /></td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                {f.stato === 'in_attesa' && (
                                                    <button onClick={() => cambiaStato(f.id, 'pagata')} disabled={busy} title="Segna come pagata"
                                                        className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-salvia hover:bg-salvia/10 transition-colors disabled:opacity-40">
                                                        {busy ? <span className="animate-spin w-3 h-3 border border-salvia border-t-transparent rounded-full" /> : <Check size={13} />}
                                                    </button>
                                                )}
                                                {f.stato === 'pagata' && (
                                                    <button onClick={() => cambiaStato(f.id, 'in_attesa')} disabled={busy} title="Rimetti in attesa"
                                                        className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-40">
                                                        {busy ? <span className="animate-spin w-3 h-3 border border-amber-400 border-t-transparent rounded-full" /> : <X size={13} />}
                                                    </button>
                                                )}
                                                <button title="Dettaglio" className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-oro hover:bg-oro/10 transition-colors">
                                                    <FileText size={13} />
                                                </button>
                                            </div>
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