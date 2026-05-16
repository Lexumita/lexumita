// src/pages/avvocato/Fatturazione.jsx

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Badge, StatCard, EmptyState } from '@/components/shared'
import {
    Plus, Search, FileText, AlertCircle, Check, X, Sparkles,
    ChevronUp, ChevronDown, ArrowUpDown, Filter, Loader2,
    CalendarDays, Calendar, ArrowRight, Building2, User,
    TrendingUp, AlertTriangle, Clock, Wallet, Trash2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ModalEliminaFattura } from './FatturazioneDettaglio'

// ─────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────
const STATO_CONFIG = {
    pagata: { label: 'Pagata', variant: 'salvia' },
    in_attesa: { label: 'In attesa', variant: 'warning' },
    scaduta: { label: 'Scaduta', variant: 'red' },
    annullata: { label: 'Annullata', variant: 'gray' },
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function fmtEUR(n) {
    const v = Number(n ?? 0)
    return v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function nomeCliente(c) {
    if (!c) return '—'
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

function isScaduta(f) {
    if (f.stato !== 'in_attesa' || !f.data_scadenza) return false
    return new Date(f.data_scadenza) < new Date(new Date().toISOString().slice(0, 10))
}

function statoEffettivo(f) {
    if (f.stato === 'in_attesa' && isScaduta(f)) return 'scaduta'
    return f.stato
}

function giorniScadenza(f) {
    if (!f.data_scadenza) return null
    const oggi = new Date(new Date().toISOString().slice(0, 10))
    const scad = new Date(f.data_scadenza)
    const diff = Math.round((scad - oggi) / (1000 * 60 * 60 * 24))
    return diff
}

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

// ─────────────────────────────────────────────────────────────
// TAB PANORAMICA
// ─────────────────────────────────────────────────────────────
function TabPanoramica({ fatture, clienti }) {
    const annoCorrente = new Date().getFullYear()

    // KPI
    const fattureAnno = fatture.filter(f =>
        new Date(f.data_emissione).getFullYear() === annoCorrente &&
        f.stato !== 'annullata'
    )

    const totFatturatoAnno = fattureAnno.reduce((s, f) => s + Number(f.totale_lordo ?? f.importo ?? 0), 0)
    const totIncassatoAnno = fattureAnno.filter(f => f.stato === 'pagata').reduce((s, f) => s + Number(f.totale_lordo ?? f.importo ?? 0), 0)
    const totDaIncassare = fatture.filter(f => f.stato === 'in_attesa' && !isScaduta(f)).reduce((s, f) => s + Number(f.totale_lordo ?? f.importo ?? 0), 0)
    const totScaduto = fatture.filter(f => isScaduta(f) || f.stato === 'scaduta').reduce((s, f) => s + Number(f.totale_lordo ?? f.importo ?? 0), 0)

    // Top clienti anno
    const perCliente = {}
    for (const f of fattureAnno) {
        const cid = f.cliente?.id ?? 'altro'
        if (!perCliente[cid]) perCliente[cid] = { cliente: f.cliente, totale: 0, fatture: 0 }
        perCliente[cid].totale += Number(f.totale_lordo ?? f.importo ?? 0)
        perCliente[cid].fatture += 1
    }
    const topClienti = Object.values(perCliente)
        .sort((a, b) => b.totale - a.totale)
        .slice(0, 5)

    // Grafico ultimi 12 mesi
    const meseLabels = []
    const meseDati = []
    for (let i = 11; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const meseKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')
        meseLabels.push({ key: meseKey, label, anno: d.getFullYear() })
    }
    for (const m of meseLabels) {
        const emesso = fatture
            .filter(f => f.data_emissione?.startsWith(m.key) && f.stato !== 'annullata')
            .reduce((s, f) => s + Number(f.totale_lordo ?? f.importo ?? 0), 0)
        const incassato = fatture
            .filter(f => f.data_pagamento?.startsWith(m.key))
            .reduce((s, f) => s + Number(f.totale_lordo ?? f.importo ?? 0), 0)
        meseDati.push({ ...m, emesso, incassato })
    }
    const maxValore = Math.max(1, ...meseDati.map(m => Math.max(m.emesso, m.incassato)))

    // Da incassare urgenti
    const urgenti = fatture
        .filter(f => f.stato === 'in_attesa')
        .map(f => ({ ...f, giorni: giorniScadenza(f) }))
        .filter(f => f.giorni !== null && f.giorni <= 7)
        .sort((a, b) => (a.giorni ?? 0) - (b.giorni ?? 0))
        .slice(0, 6)

    return (
        <div className="space-y-5">
            {/* KPI principali */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={13} className="text-oro/60" />
                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Fatturato {annoCorrente}</p>
                    </div>
                    <p className="font-display text-2xl font-light text-oro">EUR {fmtEUR(totFatturatoAnno)}</p>
                    <p className="font-body text-xs text-nebbia/30 mt-1">{fattureAnno.length} fatture</p>
                </div>

                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Check size={13} className="text-salvia/70" />
                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Incassato {annoCorrente}</p>
                    </div>
                    <p className="font-display text-2xl font-light text-salvia">EUR {fmtEUR(totIncassatoAnno)}</p>
                    <p className="font-body text-xs text-nebbia/30 mt-1">
                        {totFatturatoAnno > 0 ? `${Math.round((totIncassatoAnno / totFatturatoAnno) * 100)}% del fatturato` : '—'}
                    </p>
                </div>

                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={13} className="text-amber-400/70" />
                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Da incassare</p>
                    </div>
                    <p className="font-display text-2xl font-light text-amber-400">EUR {fmtEUR(totDaIncassare)}</p>
                    <p className="font-body text-xs text-nebbia/30 mt-1">non scadute</p>
                </div>

                <div className={`bg-slate border p-5 ${totScaduto > 0 ? 'border-red-500/30' : 'border-white/5'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={13} className={totScaduto > 0 ? 'text-red-400' : 'text-nebbia/30'} />
                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Scaduto</p>
                    </div>
                    <p className={`font-display text-2xl font-light ${totScaduto > 0 ? 'text-red-400' : 'text-nebbia/40'}`}>
                        EUR {fmtEUR(totScaduto)}
                    </p>
                    <p className="font-body text-xs text-nebbia/30 mt-1">richiede attenzione</p>
                </div>
            </div>

            {/* Grafico ultimi 12 mesi */}
            <div className="bg-slate border border-white/5 p-5">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <p className="section-label mb-1">Ultimi 12 mesi</p>
                        <p className="font-body text-xs text-nebbia/40">Emesso vs incassato per mese</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-oro/70" />
                            <span className="font-body text-xs text-nebbia/50">Emesso</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-salvia/70" />
                            <span className="font-body text-xs text-nebbia/50">Incassato</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-end gap-2 h-44">
                    {meseDati.map(m => (
                        <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5">
                            <div className="w-full flex items-end gap-1 h-36">
                                <div className="flex-1 flex items-end">
                                    <div
                                        className="w-full bg-oro/70 hover:bg-oro transition-colors min-h-[2px]"
                                        style={{ height: `${(m.emesso / maxValore) * 100}%` }}
                                        title={`Emesso: EUR ${fmtEUR(m.emesso)}`}
                                    />
                                </div>
                                <div className="flex-1 flex items-end">
                                    <div
                                        className="w-full bg-salvia/70 hover:bg-salvia transition-colors min-h-[2px]"
                                        style={{ height: `${(m.incassato / maxValore) * 100}%` }}
                                        title={`Incassato: EUR ${fmtEUR(m.incassato)}`}
                                    />
                                </div>
                            </div>
                            <p className="font-body text-[10px] text-nebbia/40 uppercase tracking-wider">{m.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Top clienti */}
                <div className="bg-slate border border-white/5 p-5">
                    <p className="section-label mb-4">Top clienti {annoCorrente}</p>
                    {topClienti.length === 0 ? (
                        <p className="font-body text-sm text-nebbia/30 text-center py-8">Nessun cliente fatturato quest'anno</p>
                    ) : (
                        <div className="space-y-2">
                            {topClienti.map((tc, i) => {
                                const pct = totFatturatoAnno > 0 ? (tc.totale / totFatturatoAnno) * 100 : 0
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-7 h-7 bg-petrolio border border-oro/20 flex items-center justify-center shrink-0">
                                            <span className="font-body text-xs text-oro">{i + 1}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    {tc.cliente?.tipo_soggetto === 'persona_giuridica'
                                                        ? <Building2 size={11} className="text-nebbia/30 shrink-0" />
                                                        : <User size={11} className="text-nebbia/30 shrink-0" />
                                                    }
                                                    <span className="font-body text-sm text-nebbia truncate">{nomeCliente(tc.cliente)}</span>
                                                </div>
                                                <span className="font-body text-sm font-semibold text-oro shrink-0">EUR {fmtEUR(tc.totale)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1 bg-petrolio">
                                                    <div className="h-full bg-oro/60" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="font-body text-xs text-nebbia/30 w-12 text-right">{tc.fatture} fatt.</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Urgenti */}
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="section-label">In scadenza (7 giorni)</p>
                        {urgenti.length > 0 && (
                            <span className="font-body text-xs px-2 py-0.5 bg-amber-400/10 border border-amber-400/30 text-amber-400">
                                {urgenti.length}
                            </span>
                        )}
                    </div>
                    {urgenti.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2">
                            <Check size={24} className="text-salvia/40" />
                            <p className="font-body text-sm text-nebbia/30">Tutto in regola</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {urgenti.map(f => (
                                <Link
                                    key={f.id}
                                    to={`/fatturazione/${f.id}`}
                                    className={`flex items-center justify-between gap-3 p-3 border transition-colors hover:border-oro/30 ${f.giorni < 0 ? 'bg-red-900/10 border-red-500/20' : 'bg-petrolio/40 border-white/5'
                                        }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-body text-sm text-nebbia truncate">{nomeCliente(f.cliente)}</p>
                                        <p className="font-body text-xs text-nebbia/40 mt-0.5">{f.numero}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-body text-sm font-semibold text-oro">EUR {fmtEUR(f.totale_lordo ?? f.importo)}</p>
                                        <p className={`font-body text-xs mt-0.5 ${f.giorni < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                                            {f.giorni < 0 ? `Scaduta ${Math.abs(f.giorni)}g fa` : f.giorni === 0 ? 'Oggi' : `Tra ${f.giorni}g`}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// TAB FATTURE (lista con filtri + Lex search)
// ─────────────────────────────────────────────────────────────
function TabFatture({ fatture, clienti, onReload }) {
    // Search box stile archivio
    const [cerca, setCerca] = useState('')
    const [cercaApplicata, setCercaApplicata] = useState('')
    const [cercando, setCercando] = useState(false)
    const [cercandoLex, setCercandoLex] = useState(false)
    const [idsLex, setIdsLex] = useState(null) // null = no ricerca attiva
    const [ragionamentoLex, setRagionamentoLex] = useState('')
    const [erroreLex, setErroreLex] = useState('')

    // Filtri
    const [statoF, setStatoF] = useState('')
    const [clienteF, setClienteF] = useState('')
    const [annoF, setAnnoF] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const [sortField, setSortField] = useState('data_emissione')
    const [sortDir, setSortDir] = useState('desc')

    // Stato modale eliminazione (riusa ModalEliminaFattura dal Dettaglio)
    const [eliminando, setEliminando] = useState(null) // fattura object | null

    // Anni disponibili
    const anniDisp = [...new Set(fatture.map(f => new Date(f.data_emissione).getFullYear()))].sort((a, b) => b - a)

    function handleSort(f) {
        if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(f); setSortDir('asc') }
    }

    function azzeraRicerca() {
        setIdsLex(null)
        setRagionamentoLex('')
        setErroreLex('')
        setCercaApplicata('')
    }

    async function cercaTradizionale() {
        if (!cerca.trim()) return
        setCercando(true)
        setIdsLex(null)
        setRagionamentoLex('')
        setErroreLex('')
        setCercaApplicata(cerca.trim())
        setTimeout(() => setCercando(false), 200) // ricerca lato client istantanea
    }

    async function cercaConLex() {
        if (!cerca.trim()) return
        setCercandoLex(true)
        setErroreLex('')
        setRagionamentoLex('')
        setCercaApplicata(cerca.trim())
        try {
            const { data, error } = await supabase.functions.invoke('lex-pagamenti', {
                body: { domanda: cerca.trim() }
            })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? 'Errore Lex')
            setIdsLex(data.fatture_ids ?? [])
            setRagionamentoLex(data.ragionamento ?? '')
        } catch (err) {
            setErroreLex(err.message)
            setIdsLex(null)
        } finally {
            setCercandoLex(false)
        }
    }

    const inRicerca = cercaApplicata !== ''

    // Applica filtri + ordinamento
    const rows = useMemo(() => {
        let result = fatture

        // Ricerca Lex (vince sui filtri tradizionali se attiva)
        if (idsLex !== null) {
            const set = new Set(idsLex)
            result = result.filter(f => set.has(f.id))
            // Ordina secondo ranking Lex
            const ordineMap = new Map(idsLex.map((id, i) => [id, i]))
            result = [...result].sort((a, b) => (ordineMap.get(a.id) ?? 999) - (ordineMap.get(b.id) ?? 999))
            return result
        }

        // Ricerca tradizionale per testo
        if (cercaApplicata && idsLex === null) {
            const s = cercaApplicata.toLowerCase()
            result = result.filter(f => {
                const cl = nomeCliente(f.cliente).toLowerCase()
                const pr = (f.pratica?.titolo ?? '').toLowerCase()
                const desc = (f.descrizione ?? '').toLowerCase()
                const num = (f.numero ?? '').toLowerCase()
                return cl.includes(s) || pr.includes(s) || desc.includes(s) || num.includes(s)
            })
        }

        // Filtri
        if (statoF) {
            if (statoF === 'scaduta') {
                result = result.filter(f => f.stato === 'scaduta' || isScaduta(f))
            } else {
                result = result.filter(f => f.stato === statoF && !isScaduta(f))
            }
        }
        if (clienteF) result = result.filter(f => f.cliente_id === clienteF)
        if (annoF) result = result.filter(f => new Date(f.data_emissione).getFullYear() === Number(annoF))
        if (dateFrom) result = result.filter(f => f.data_emissione >= dateFrom)
        if (dateTo) result = result.filter(f => f.data_emissione <= dateTo)

        // Ordinamento
        result = [...result].sort((a, b) => {
            let va = a[sortField], vb = b[sortField]
            if (sortField === 'cliente') {
                va = nomeCliente(a.cliente); vb = nomeCliente(b.cliente)
            }
            if (sortField === 'totale_lordo') {
                va = Number(a.totale_lordo ?? a.importo ?? 0); vb = Number(b.totale_lordo ?? b.importo ?? 0)
            }
            va = va ?? ''; vb = vb ?? ''
            if (typeof va === 'string') va = va.toLowerCase()
            if (typeof vb === 'string') vb = vb.toLowerCase()
            if (va < vb) return sortDir === 'asc' ? -1 : 1
            if (va > vb) return sortDir === 'asc' ? 1 : -1
            return 0
        })

        return result
    }, [fatture, idsLex, cercaApplicata, statoF, clienteF, annoF, dateFrom, dateTo, sortField, sortDir])

    const hasFilters = statoF || clienteF || annoF || dateFrom || dateTo

    return (
        <div className="space-y-4">
            {/* Box ricerca stile archivio */}
            <div className="bg-slate border border-white/5 p-4 space-y-3">
                <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                    Cerca tra le fatture per numero, cliente o descrizione. Usa Lex per domande in linguaggio naturale come "fatture scadute dei clienti aziendali" o "quanto ho incassato da Rossi quest'anno".
                </p>

                <div className="flex items-stretch gap-2">
                    <div className="relative flex-1">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Cerca o chiedi a Lex..."
                            value={cerca}
                            onChange={e => {
                                setCerca(e.target.value)
                                if (e.target.value.trim() === '' && inRicerca) azzeraRicerca()
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) cercaConLex()
                                else if (e.key === 'Enter') { e.preventDefault(); cercaTradizionale() }
                            }}
                            className="w-full h-[38px] bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-9 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                        {cerca && (
                            <button
                                onClick={() => { setCerca(''); azzeraRicerca() }}
                                className="absolute top-1/2 -translate-y-1/2 right-2 text-nebbia/30 hover:text-nebbia p-1"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={cercaTradizionale}
                        disabled={cercando || cercandoLex || !cerca.trim()}
                        className="flex items-center justify-center gap-2 px-4 h-[38px] bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                        {cercando
                            ? <Loader2 size={13} className="animate-spin" />
                            : <><Search size={13} /> Cerca</>
                        }
                    </button>

                    <button
                        onClick={cercaConLex}
                        disabled={cercando || cercandoLex || !cerca.trim()}
                        className="flex items-center justify-center gap-2 px-4 h-[38px] bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                        {cercandoLex
                            ? <><Loader2 size={13} className="animate-spin" /> <span className="hidden md:inline">Lex sta cercando...</span></>
                            : <><Sparkles size={13} /> <span className="hidden md:inline">Cerca con Lex</span><span className="md:hidden">Lex</span></>
                        }
                    </button>
                </div>

                {erroreLex && (
                    <p className="font-body text-xs text-red-400 flex items-center gap-1.5">
                        <AlertCircle size={11} /> {erroreLex}
                    </p>
                )}

                {ragionamentoLex && (
                    <div className="bg-petrolio/40 border border-salvia/15 p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles size={11} className="text-salvia" />
                            <p className="font-body text-[10px] font-medium text-salvia uppercase tracking-widest">Analisi Lex</p>
                        </div>
                        <p className="font-body text-xs text-nebbia/55 leading-relaxed">{ragionamentoLex}</p>
                    </div>
                )}

                {inRicerca && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-salvia/5 border border-salvia/20">
                        <p className="font-body text-xs text-salvia">
                            <strong>{rows.length}</strong> {rows.length === 1 ? 'risultato' : 'risultati'} per "{cercaApplicata}"
                        </p>
                        <button
                            onClick={azzeraRicerca}
                            className="flex items-center gap-1 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors"
                        >
                            <X size={11} /> Azzera
                        </button>
                    </div>
                )}
            </div>

            {/* Filtri */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-1.5 text-nebbia/30">
                    <Filter size={12} />
                    <span className="font-body text-xs uppercase tracking-widest">Filtri</span>
                </div>

                <select value={statoF} onChange={e => setStatoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40">
                    <option value="">Tutti gli stati</option>
                    <option value="in_attesa">In attesa</option>
                    <option value="pagata">Pagate</option>
                    <option value="scaduta">Scadute</option>
                    <option value="annullata">Annullate</option>
                </select>

                {clienti.length > 0 && (
                    <select value={clienteF} onChange={e => setClienteF(e.target.value)}
                        className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40">
                        <option value="">Tutti i clienti</option>
                        {clienti.map(c => <option key={c.id} value={c.id}>{nomeCliente(c)}</option>)}
                    </select>
                )}

                {anniDisp.length > 0 && (
                    <select value={annoF} onChange={e => setAnnoF(e.target.value)}
                        className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40">
                        <option value="">Tutti gli anni</option>
                        {anniDisp.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                )}

                <div className="flex items-center gap-1">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-2 py-1.5 outline-none focus:border-oro/40"
                        title="Da" />
                    <span className="font-body text-xs text-nebbia/30">→</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-2 py-1.5 outline-none focus:border-oro/40"
                        title="A" />
                </div>

                {hasFilters && (
                    <button onClick={() => { setStatoF(''); setClienteF(''); setAnnoF(''); setDateFrom(''); setDateTo('') }}
                        className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors flex items-center gap-1">
                        <X size={11} /> Reset filtri
                    </button>
                )}
            </div>

            {/* Tabella */}
            <div className="bg-slate border border-white/5 overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            <SortTh label="Numero" field="numero" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                            <SortTh label="Cliente" field="cliente" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Pratica</th>
                            <SortTh label="Totale" field="totale_lordo" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                            <SortTh label="Emessa il" field="data_emissione" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                            <SortTh label="Scadenza" field="data_scadenza" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                            <SortTh label="Stato" field="stato" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                            <th className="px-4 py-3 w-20" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr><td colSpan={8} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">
                                {fatture.length === 0 ? 'Nessuna fattura ancora. Crea la prima.' : 'Nessuna fattura trovata'}
                            </td></tr>
                        ) : rows.map(f => {
                            const stato = statoEffettivo(f)
                            const sc = STATO_CONFIG[stato] ?? STATO_CONFIG.in_attesa
                            const sc_scaduta = stato === 'scaduta'
                            return (
                                <tr key={f.id} className={`border-b border-white/5 hover:bg-petrolio/40 transition-colors ${sc_scaduta ? 'bg-red-900/5' : ''}`}>
                                    <td className="px-4 py-3">
                                        <Link to={`/fatturazione/${f.id}`} className="font-body text-xs text-oro/70 hover:text-oro font-medium">
                                            {f.numero ?? '—'}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            {f.cliente?.tipo_soggetto === 'persona_giuridica'
                                                ? <Building2 size={11} className="text-nebbia/30 shrink-0" />
                                                : <User size={11} className="text-nebbia/30 shrink-0" />
                                            }
                                            <span className="font-body text-sm text-nebbia">{nomeCliente(f.cliente)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-body text-xs text-nebbia/50 max-w-xs truncate">{f.pratica?.titolo ?? '—'}</td>
                                    <td className="px-4 py-3 font-body text-sm font-semibold text-oro whitespace-nowrap">EUR {fmtEUR(f.totale_lordo ?? f.importo)}</td>
                                    <td className="px-4 py-3 font-body text-xs text-nebbia/50 whitespace-nowrap">{f.data_emissione ? new Date(f.data_emissione).toLocaleDateString('it-IT') : '—'}</td>
                                    <td className={`px-4 py-3 font-body text-xs whitespace-nowrap ${f.stato === 'pagata' ? 'text-salvia' : sc_scaduta ? 'text-red-400' : 'text-nebbia/50'
                                        }`}>
                                        {f.stato === 'pagata' && f.data_pagamento
                                            ? `Pagata ${new Date(f.data_pagamento).toLocaleDateString('it-IT')}`
                                            : f.stato === 'pagata'
                                                ? 'Pagata'
                                                : f.data_scadenza
                                                    ? new Date(f.data_scadenza).toLocaleDateString('it-IT')
                                                    : '—'}
                                    </td>
                                    <td className="px-4 py-3"><Badge label={sc.label} variant={sc.variant} /></td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {f.stato !== 'pagata' && (
                                                <button
                                                    onClick={(e) => { e.preventDefault(); setEliminando(f); }}
                                                    title="Elimina fattura"
                                                    className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                            <Link to={`/fatturazione/${f.id}`} className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-oro hover:bg-oro/10 transition-colors">
                                                <ArrowRight size={13} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal eliminazione centralizzato (usa edge function elimina-fattura) */}
            {eliminando && (
                <ModalEliminaFattura
                    fattura={eliminando}
                    onClose={() => setEliminando(null)}
                    onEliminata={() => {
                        setEliminando(null)
                        onReload()
                    }}
                />
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// TAB SCADENZARIO
// ─────────────────────────────────────────────────────────────
function TabScadenzario({ fatture }) {
    const oggi = new Date(new Date().toISOString().slice(0, 10))
    const in7gg = new Date(oggi); in7gg.setDate(in7gg.getDate() + 7)
    const in30gg = new Date(oggi); in30gg.setDate(in30gg.getDate() + 30)

    const conScadenza = fatture
        .filter(f => f.stato === 'in_attesa' && f.data_scadenza)
        .map(f => ({ ...f, scadDate: new Date(f.data_scadenza), giorni: giorniScadenza(f) }))

    const scadute = conScadenza.filter(f => f.scadDate < oggi).sort((a, b) => a.scadDate - b.scadDate)
    const in7 = conScadenza.filter(f => f.scadDate >= oggi && f.scadDate <= in7gg).sort((a, b) => a.scadDate - b.scadDate)
    const in30 = conScadenza.filter(f => f.scadDate > in7gg && f.scadDate <= in30gg).sort((a, b) => a.scadDate - b.scadDate)
    const oltre = conScadenza.filter(f => f.scadDate > in30gg).sort((a, b) => a.scadDate - b.scadDate)

    function Sezione({ titolo, lista, variant }) {
        if (lista.length === 0) return null
        const totale = lista.reduce((s, f) => s + Number(f.totale_lordo ?? f.importo ?? 0), 0)
        const colorVariant = {
            red: 'border-red-500/30 bg-red-900/10',
            amber: 'border-amber-400/30 bg-amber-400/5',
            slate: 'border-white/5 bg-slate',
        }
        const textColor = {
            red: 'text-red-400',
            amber: 'text-amber-400',
            slate: 'text-nebbia',
        }

        return (
            <div className={`border ${colorVariant[variant]} p-5 space-y-3`}>
                <div className="flex items-center justify-between">
                    <p className={`section-label !m-0 ${textColor[variant]} !text-current`}>{titolo}</p>
                    <div className="flex items-center gap-3">
                        <span className="font-body text-xs text-nebbia/40">{lista.length} {lista.length === 1 ? 'fattura' : 'fatture'}</span>
                        <span className={`font-body text-sm font-semibold ${textColor[variant]}`}>EUR {fmtEUR(totale)}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    {lista.map(f => (
                        <Link
                            key={f.id}
                            to={`/fatturazione/${f.id}`}
                            className="flex items-center justify-between gap-3 p-3 bg-petrolio/40 border border-white/5 hover:border-oro/30 transition-colors"
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <Calendar size={13} className={`shrink-0 ${textColor[variant]}`} />
                                <div className="min-w-0 flex-1">
                                    <p className="font-body text-sm text-nebbia truncate">{nomeCliente(f.cliente)}</p>
                                    <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                        {f.numero} · {new Date(f.data_scadenza).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className={`font-body text-xs ${textColor[variant]}`}>
                                    {f.giorni < 0 ? `${Math.abs(f.giorni)}g fa` : f.giorni === 0 ? 'Oggi' : `tra ${f.giorni}g`}
                                </span>
                                <p className="font-body text-sm font-semibold text-oro whitespace-nowrap">EUR {fmtEUR(f.totale_lordo ?? f.importo)}</p>
                                <ArrowRight size={13} className="text-nebbia/20" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        )
    }

    if (conScadenza.length === 0) {
        return (
            <EmptyState
                icon={CalendarDays}
                title="Nessuna scadenza"
                desc="Non hai fatture in attesa con scadenza impostata"
            />
        )
    }

    return (
        <div className="space-y-4">
            <Sezione titolo="Scadute" lista={scadute} variant="red" />
            <Sezione titolo="In scadenza (7 giorni)" lista={in7} variant="amber" />
            <Sezione titolo="Prossime (30 giorni)" lista={in30} variant="slate" />
            <Sezione titolo="Oltre i 30 giorni" lista={oltre} variant="slate" />
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// PAGINA PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function AvvocatoFatturazione() {
    const [fatture, setFatture] = useState([])
    const [clienti, setClienti] = useState([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState('panoramica')

    async function carica() {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profilo } = await supabase
            .from('profiles')
            .select('id, titolare_id')
            .eq('id', user.id).single()

        const titolareId = profilo?.titolare_id ?? user.id
        const { data: collabIds } = await supabase
            .from('profiles').select('id').eq('titolare_id', titolareId)
        const idsAvvocati = [titolareId, ...(collabIds ?? []).map(c => c.id)]

        const [{ data: fatt }, { data: cli }] = await Promise.all([
            supabase
                .from('fatture')
                .select(`
          id, numero, stato, data_emissione, data_scadenza, data_pagamento,
          importo, totale_lordo, totale_netto, applica_ritenuta,
          descrizione, pdf_storage_path,
          cliente:cliente_id(id, nome, cognome, ragione_sociale, tipo_soggetto),
          pratica:pratica_id(id, titolo)
        `)
                .in('avvocato_id', idsAvvocati)
                .order('data_emissione', { ascending: false }),
            supabase
                .from('profiles')
                .select('id, nome, cognome, ragione_sociale, tipo_soggetto')
                .eq('role', 'cliente')
                .in('avvocato_id', idsAvvocati)
                .order('cognome'),
        ])

        setFatture(fatt ?? [])
        setClienti(cli ?? [])
        setLoading(false)
    }

    useEffect(() => { carica() }, [])

    const TABS = [
        { id: 'panoramica', label: 'Panoramica', icon: TrendingUp },
        { id: 'fatture', label: 'Fatture', icon: FileText },
        { id: 'scadenzario', label: 'Scadenzario', icon: CalendarDays },
    ]

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <Loader2 size={24} className="animate-spin text-oro" />
        </div>
    )

    return (
        <div className="space-y-5">
            <PageHeader
                label="Fatturazione"
                title="Fatture studio"
                subtitle={`${fatture.length} ${fatture.length === 1 ? 'fattura' : 'fatture'} in totale`}
                action={
                    <Link to="/fatturazione/nuova" className="btn-primary text-sm flex items-center gap-2">
                        <Plus size={15} /> Nuova fattura
                    </Link>
                }
            />

            <div className="flex gap-0 border-b border-white/8 overflow-x-auto">
                {TABS.map(({ id: tid, label, icon: Icon }) => (
                    <button
                        key={tid}
                        onClick={() => setTab(tid)}
                        className={`flex items-center gap-2 px-5 py-3 font-body text-sm border-b-2 transition-colors whitespace-nowrap ${tab === tid ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'
                            }`}
                    >
                        <Icon size={14} strokeWidth={1.5} /> {label}
                    </button>
                ))}
            </div>

            {tab === 'panoramica' && <TabPanoramica fatture={fatture} clienti={clienti} />}
            {tab === 'fatture' && <TabFatture fatture={fatture} clienti={clienti} onReload={carica} />}
            {tab === 'scadenzario' && <TabScadenzario fatture={fatture} />}
        </div>
    )
}