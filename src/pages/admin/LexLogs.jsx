import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {
    Sparkles, Search, Filter, Loader2, AlertCircle, TrendingUp,
    DollarSign, Activity, Zap, X, ChevronDown, ChevronRight,
    User, Clock, Hash, AlertTriangle, CheckCircle2, XCircle,
    Cpu, RefreshCw, ArrowLeft, FileText, Calendar
} from 'lucide-react'
import { Link } from 'react-router-dom'

const ENDPOINT_LABELS = {
    lead: { label: 'Lead', color: 'text-oro', icon: Sparkles },
    subagent_norme_core: { label: 'Subagent Norme', color: 'text-salvia', icon: Cpu },
    subagent_norme_archivio: { label: 'Subagent Archivio', color: 'text-salvia', icon: Cpu },
    subagent_norme_ue: { label: 'Subagent UE', color: 'text-salvia', icon: Cpu },
    subagent_prassi: { label: 'Subagent Prassi', color: 'text-salvia', icon: Cpu },
    subagent_giurisprudenza: { label: 'Subagent Giurisprudenza', color: 'text-salvia', icon: Cpu },
    synthesizer: { label: 'Synthesizer', color: 'text-oro', icon: Sparkles },
    confronta: { label: 'Chat Confronta', color: 'text-oro', icon: Sparkles },
    etichetta: { label: 'Chat Etichetta', color: 'text-oro', icon: Sparkles },
    etichetta_riassunto: { label: 'Riassunto Etichetta', color: 'text-nebbia/50', icon: FileText },
    search_pensiero: { label: 'Lex Search', color: 'text-salvia', icon: Search },
}

const ESITO_BADGES = {
    ok: { label: 'OK', class: 'text-green-400 border-green-500/30 bg-green-500/10' },
    error: { label: 'Errore', class: 'text-red-400 border-red-500/30 bg-red-500/10' },
    rate_limit: { label: 'Rate Limit', class: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    no_credits: { label: 'No crediti', class: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    rejected: { label: 'Rifiutato', class: 'text-nebbia/50 border-white/10 bg-petrolio' },
    timeout: { label: 'Timeout', class: 'text-red-400 border-red-500/30 bg-red-500/10' },
}

const PERIODI = [
    { id: '24h', label: '24 ore', ore: 24 },
    { id: '7g', label: '7 giorni', ore: 24 * 7 },
    { id: '30g', label: '30 giorni', ore: 24 * 30 },
    { id: 'all', label: 'Sempre', ore: null },
]

function formatCosto(usd) {
    if (usd === null || usd === undefined) return '$0.000'
    if (usd < 0.001) return `$${usd.toFixed(6)}`
    if (usd < 1) return `$${usd.toFixed(4)}`
    return `$${usd.toFixed(2)}`
}

function formatDurata(ms) {
    if (!ms) return '—'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
}

function formatNumero(n) {
    if (n === null || n === undefined) return '—'
    return new Intl.NumberFormat('it-IT').format(n)
}

function formatData(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleString('it-IT', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
}

export default function LexLogs() {
    const { profile } = useAuth()

    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')
    const [logs, setLogs] = useState([])
    const [kpi, setKpi] = useState(null)

    const [periodoAttivo, setPeriodoAttivo] = useState('7g')
    const [endpointFiltro, setEndpointFiltro] = useState('tutti')
    const [esitoFiltro, setEsitoFiltro] = useState('tutti')
    const [userFiltro, setUserFiltro] = useState('')

    const [requestIdAperto, setRequestIdAperto] = useState(null)
    const [logsCatena, setLogsCatena] = useState([])

    const [paginaCorrente, setPaginaCorrente] = useState(0)
    const RIGHE_PER_PAGINA = 50

    // Aggrega tutti i log per request_id in un'unica "richiesta utente"
    // - usa il top-level (parent_log_id IS NULL) come riga rappresentativa
    // - somma costi/token/durata di tutta la catena
    // - esito = worst-case della catena
    const richiesteUtente = useMemo(() => {
        const catenePerRequestId = new Map()
        for (const log of logs) {
            if (!log.request_id) continue
            if (!catenePerRequestId.has(log.request_id)) {
                catenePerRequestId.set(log.request_id, [])
            }
            catenePerRequestId.get(log.request_id).push(log)
        }

        const richieste = []
        for (const [requestId, catena] of catenePerRequestId) {
            // Riga rappresentativa: top-level se esiste, altrimenti la più vecchia
            const topLevel = catena.find(c => !c.parent_log_id) ?? catena[0]

            const costoTotale = catena.reduce((s, c) => s + parseFloat(c.costo_totale_usd ?? 0), 0)
            const tokenInTotale = catena.reduce((s, c) => s + (c.token_input ?? 0), 0)
            const tokenOutTotale = catena.reduce((s, c) => s + (c.token_output ?? 0), 0)
            const durataTotale = catena.reduce((s, c) => s + (c.durata_ms ?? 0), 0)

            // Esito worst-case: se anche una sola chiamata in catena ha errore → errore
            const ESITI_ORDINE = ['error', 'timeout', 'rate_limit', 'no_credits', 'rejected', 'ok']
            let esitoPeggiore = 'ok'
            for (const c of catena) {
                if (ESITI_ORDINE.indexOf(c.esito) < ESITI_ORDINE.indexOf(esitoPeggiore)) {
                    esitoPeggiore = c.esito
                }
            }

            richieste.push({
                ...topLevel,
                _aggregato: true,
                _numChiamate: catena.length,
                _costoCatena: costoTotale,
                _tokenInCatena: tokenInTotale,
                _tokenOutCatena: tokenOutTotale,
                _durataCatena: durataTotale,
                _esitoPeggiore: esitoPeggiore,
            })
        }

        // Ordine per data discendente (come prima)
        return richieste.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }, [logs])

    useEffect(() => { caricaLogs() }, [periodoAttivo, endpointFiltro, esitoFiltro, userFiltro])

    async function caricaLogs() {
        setLoading(true)
        setErrore('')
        try {
            // Calcola filtro temporale
            const periodo = PERIODI.find(p => p.id === periodoAttivo)
            const dataLimite = periodo?.ore
                ? new Date(Date.now() - periodo.ore * 60 * 60 * 1000).toISOString()
                : null

            // Query logs
            let query = supabase
                .from('lex_logs')
                .select(`
                    id, user_id, studio_id, request_id, parent_log_id,
                    endpoint, azione, domanda, conversazione_id,
                    modello, token_input, token_output, token_cached,
                    costo_totale_usd, durata_ms, iterazioni, tool_usati,
                    esito, errore, qualita_retrieval, principali_count,
                    credito_scalato, metadati, created_at,
                    profiles:user_id(nome, cognome, email)
                `)
                .order('created_at', { ascending: false })
                .limit(2000)

            if (dataLimite) query = query.gte('created_at', dataLimite)
            if (endpointFiltro !== 'tutti') query = query.eq('endpoint', endpointFiltro)
            if (esitoFiltro !== 'tutti') query = query.eq('esito', esitoFiltro)
            if (userFiltro) query = query.eq('user_id', userFiltro)

            const { data, error } = await query
            if (error) throw new Error(error.message)

            setLogs(data ?? [])
            calcolaKpi(data ?? [])
            setPaginaCorrente(0)
        } catch (e) {
            setErrore(e.message)
        } finally {
            setLoading(false)
        }
    }

    function calcolaKpi(data) {
        const totali = data.length
        const errori = data.filter(l => l.esito !== 'ok').length
        const costoTotale = data.reduce((sum, l) => sum + parseFloat(l.costo_totale_usd ?? 0), 0)
        const durataMedia = data.length > 0
            ? data.reduce((sum, l) => sum + (l.durata_ms ?? 0), 0) / data.length
            : 0

        // Spesa per endpoint
        const spesaPerEndpoint = {}
        for (const l of data) {
            const ep = l.endpoint
            if (!spesaPerEndpoint[ep]) spesaPerEndpoint[ep] = 0
            spesaPerEndpoint[ep] += parseFloat(l.costo_totale_usd ?? 0)
        }

        // Top utenti
        const spesaPerUser = {}
        for (const l of data) {
            const uid = l.user_id
            if (!uid) continue
            if (!spesaPerUser[uid]) {
                spesaPerUser[uid] = {
                    user_id: uid,
                    nome: l.profiles?.nome ?? '',
                    cognome: l.profiles?.cognome ?? '',
                    email: l.profiles?.email ?? '',
                    costo: 0,
                    chiamate: 0
                }
            }
            spesaPerUser[uid].costo += parseFloat(l.costo_totale_usd ?? 0)
            spesaPerUser[uid].chiamate++
        }
        const topUtenti = Object.values(spesaPerUser)
            .sort((a, b) => b.costo - a.costo)
            .slice(0, 10)

        // Spesa per giorno (ultimi 30 giorni max)
        const spesaPerGiorno = {}
        for (const l of data) {
            const giorno = l.created_at.slice(0, 10)
            if (!spesaPerGiorno[giorno]) spesaPerGiorno[giorno] = 0
            spesaPerGiorno[giorno] += parseFloat(l.costo_totale_usd ?? 0)
        }
        const spesaGiornalieraOrdinata = Object.entries(spesaPerGiorno)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([data, costo]) => ({ data, costo }))

        setKpi({
            totali,
            errori,
            tassoErrori: totali > 0 ? (errori / totali) * 100 : 0,
            costoTotale,
            durataMedia,
            spesaPerEndpoint,
            topUtenti,
            spesaGiornaliera: spesaGiornalieraOrdinata,
        })
    }

    async function apriCatena(requestId) {
        if (requestIdAperto === requestId) {
            setRequestIdAperto(null)
            setLogsCatena([])
            return
        }
        setRequestIdAperto(requestId)
        try {
            const { data, error } = await supabase
                .from('lex_logs')
                .select(`
                    id, parent_log_id, endpoint, azione, modello,
                    token_input, token_output, costo_totale_usd, durata_ms,
                    esito, errore, qualita_retrieval, principali_count,
                    metadati, created_at
                `)
                .eq('request_id', requestId)
                .order('created_at', { ascending: true })
            if (error) throw new Error(error.message)
            setLogsCatena(data ?? [])
        } catch (e) {
            console.error(e)
            setLogsCatena([])
        }
    }

    const logsPaginati = useMemo(() => {
        const start = paginaCorrente * RIGHE_PER_PAGINA
        return richiesteUtente.slice(start, start + RIGHE_PER_PAGINA)
    }, [richiesteUtente, paginaCorrente])

    const totalePagine = Math.ceil(richiesteUtente.length / RIGHE_PER_PAGINA)

    if (profile?.role !== 'admin') {
        return (
            <div className="space-y-5 px-6 pt-2 pb-6">
                <div className="bg-slate border border-red-500/20 p-8 text-center">
                    <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
                    <p className="font-body text-sm text-red-400">Accesso riservato agli amministratori.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-5 px-6 pt-2 pb-6">

            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <p className="section-label mb-2">Telemetria</p>
                    <h1 className="font-display text-4xl font-light text-nebbia">Lex Logs</h1>
                    <p className="font-body text-sm text-nebbia/40 mt-1">
                        Tutte le chiamate al sistema Lex — costi, durata, esiti, drill-down per sessione.
                    </p>
                </div>
                <button
                    onClick={caricaLogs}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 border border-white/10 text-nebbia/70 hover:border-oro/40 hover:text-oro font-body text-sm transition-colors disabled:opacity-40"
                >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    Aggiorna
                </button>
            </div>

            {/* Filtri periodo */}
            <div className="flex gap-1 bg-slate border border-white/5 p-1 w-fit">
                {PERIODI.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setPeriodoAttivo(p.id)}
                        className={`px-3 py-1.5 font-body text-xs transition-colors ${periodoAttivo === p.id ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'}`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-sm font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}

            {loading && !kpi ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={20} className="animate-spin text-oro" />
                </div>
            ) : kpi && (
                <>
                    {/* KPI cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <KpiCard
                            icon={DollarSign}
                            label="Spesa totale"
                            value={formatCosto(kpi.costoTotale)}
                            color="text-oro"
                        />
                        <KpiCard
                            icon={Activity}
                            label="Chiamate"
                            value={formatNumero(kpi.totali)}
                            color="text-salvia"
                        />
                        <KpiCard
                            icon={Clock}
                            label="Durata media"
                            value={formatDurata(kpi.durataMedia)}
                            color="text-nebbia"
                        />
                        <KpiCard
                            icon={AlertTriangle}
                            label="Tasso errori"
                            value={`${kpi.tassoErrori.toFixed(1)}%`}
                            color={kpi.tassoErrori > 5 ? 'text-red-400' : kpi.tassoErrori > 1 ? 'text-amber-400' : 'text-green-400'}
                            sub={`${kpi.errori} errori`}
                        />
                    </div>

                    {/* Spesa per endpoint */}
                    <div className="bg-slate border border-white/5 p-5">
                        <p className="section-label mb-4">Spesa per endpoint</p>
                        <div className="space-y-2">
                            {Object.entries(kpi.spesaPerEndpoint)
                                .sort(([, a], [, b]) => b - a)
                                .map(([endpoint, costo]) => {
                                    const pct = kpi.costoTotale > 0 ? (costo / kpi.costoTotale) * 100 : 0
                                    const meta = ENDPOINT_LABELS[endpoint] ?? { label: endpoint, color: 'text-nebbia' }
                                    return (
                                        <div key={endpoint} className="flex items-center gap-3">
                                            <div className="w-44 shrink-0">
                                                <p className={`font-body text-xs ${meta.color}`}>{meta.label}</p>
                                            </div>
                                            <div className="flex-1 h-1.5 bg-petrolio rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-oro/40"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <p className="font-body text-xs text-nebbia/60 w-20 text-right tabular-nums">
                                                {formatCosto(costo)}
                                            </p>
                                            <p className="font-body text-xs text-nebbia/30 w-12 text-right tabular-nums">
                                                {pct.toFixed(0)}%
                                            </p>
                                        </div>
                                    )
                                })}
                        </div>
                    </div>

                    {/* Spesa per giorno (mini chart) */}
                    {kpi.spesaGiornaliera.length > 1 && (
                        <div className="bg-slate border border-white/5 p-5">
                            <p className="section-label mb-4">Spesa giornaliera</p>
                            <MiniBarChart data={kpi.spesaGiornaliera} />
                        </div>
                    )}

                    {/* Top utenti */}
                    {kpi.topUtenti.length > 0 && (
                        <div className="bg-slate border border-white/5 p-5">
                            <p className="section-label mb-4">Top utenti per consumo</p>
                            <div className="space-y-1.5">
                                {kpi.topUtenti.map((u, i) => (
                                    <div key={u.user_id}
                                        className="flex items-center justify-between gap-3 px-3 py-2 bg-petrolio/40 hover:bg-petrolio/60 transition-colors cursor-pointer"
                                        onClick={() => setUserFiltro(u.user_id === userFiltro ? '' : u.user_id)}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="font-body text-xs text-nebbia/30 w-5 text-right">#{i + 1}</span>
                                            <User size={11} className="text-nebbia/40 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-body text-sm text-nebbia truncate">
                                                    {u.nome} {u.cognome}
                                                </p>
                                                <p className="font-body text-[11px] text-nebbia/40 truncate">
                                                    {u.email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            <p className="font-body text-xs text-nebbia/50 tabular-nums">
                                                {formatNumero(u.chiamate)} chiamate
                                            </p>
                                            <p className="font-body text-sm text-oro tabular-nums">
                                                {formatCosto(u.costo)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {userFiltro && (
                                <button
                                    onClick={() => setUserFiltro('')}
                                    className="mt-3 flex items-center gap-1 font-body text-xs text-nebbia/40 hover:text-red-400"
                                >
                                    <X size={11} /> Rimuovi filtro utente
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Filtri tabella */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <Filter size={12} className="text-nebbia/30" />
                    <select
                        value={endpointFiltro}
                        onChange={e => setEndpointFiltro(e.target.value)}
                        className="bg-slate border border-white/10 text-nebbia font-body text-xs px-3 py-1.5 outline-none focus:border-oro/50"
                    >
                        <option value="tutti">Tutti gli endpoint</option>
                        {Object.entries(ENDPOINT_LABELS).map(([id, meta]) => (
                            <option key={id} value={id}>{meta.label}</option>
                        ))}
                    </select>
                </div>
                <select
                    value={esitoFiltro}
                    onChange={e => setEsitoFiltro(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-xs px-3 py-1.5 outline-none focus:border-oro/50"
                >
                    <option value="tutti">Tutti gli esiti</option>
                    {Object.entries(ESITO_BADGES).map(([id, meta]) => (
                        <option key={id} value={id}>{meta.label}</option>
                    ))}
                </select>
                {(endpointFiltro !== 'tutti' || esitoFiltro !== 'tutti' || userFiltro) && (
                    <button
                        onClick={() => { setEndpointFiltro('tutti'); setEsitoFiltro('tutti'); setUserFiltro('') }}
                        className="flex items-center gap-1 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors"
                    >
                        <X size={10} /> Azzera filtri
                    </button>
                )}
            </div>

            {/* Tabella logs */}
            <div className="bg-slate border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-petrolio/40 border-b border-white/5">
                            <tr className="text-left">
                                <th className="px-3 py-2 font-body text-[10px] uppercase tracking-wider text-nebbia/40 w-8"></th>
                                <th className="px-3 py-2 font-body text-[10px] uppercase tracking-wider text-nebbia/40">Quando</th>
                                <th className="px-3 py-2 font-body text-[10px] uppercase tracking-wider text-nebbia/40">Endpoint</th>
                                <th className="px-3 py-2 font-body text-[10px] uppercase tracking-wider text-nebbia/40">Utente</th>
                                <th className="px-3 py-2 font-body text-[10px] uppercase tracking-wider text-nebbia/40">Domanda</th>
                                <th className="px-3 py-2 font-body text-[10px] uppercase tracking-wider text-nebbia/40 text-right">Token</th>
                                <th className="px-3 py-2 font-body text-[10px] uppercase tracking-wider text-nebbia/40 text-right">Costo</th>
                                <th className="px-3 py-2 font-body text-[10px] uppercase tracking-wider text-nebbia/40 text-right">Durata</th>
                                <th className="px-3 py-2 font-body text-[10px] uppercase tracking-wider text-nebbia/40">Esito</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logsPaginati.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-3 py-8 text-center font-body text-sm text-nebbia/30">
                                        Nessun log per questi filtri
                                    </td>
                                </tr>
                            ) : logsPaginati.map(log => (
                                <RigaLog
                                    key={log.id}
                                    log={log}
                                    aperto={requestIdAperto === log.request_id}
                                    onTogliApri={() => apriCatena(log.request_id)}
                                    logsCatena={logsCatena}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Paginazione */}
                {totalePagine > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                        <p className="font-body text-xs text-nebbia/40">
                            {paginaCorrente * RIGHE_PER_PAGINA + 1}-{Math.min((paginaCorrente + 1) * RIGHE_PER_PAGINA, richiesteUtente.length)} di {richiesteUtente.length} richieste
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPaginaCorrente(p => Math.max(0, p - 1))}
                                disabled={paginaCorrente === 0}
                                className="px-3 py-1 border border-white/10 text-nebbia/60 font-body text-xs hover:text-nebbia disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                ← Precedente
                            </button>
                            <span className="font-body text-xs text-nebbia/40 px-2">
                                {paginaCorrente + 1} / {totalePagine}
                            </span>
                            <button
                                onClick={() => setPaginaCorrente(p => Math.min(totalePagine - 1, p + 1))}
                                disabled={paginaCorrente >= totalePagine - 1}
                                className="px-3 py-1 border border-white/10 text-nebbia/60 font-body text-xs hover:text-nebbia disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Successiva →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── KPI CARD ───────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color, sub }) {
    return (
        <div className="bg-slate border border-white/5 p-4">
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">{label}</p>
                    <p className={`font-display text-2xl font-light ${color} tabular-nums`}>{value}</p>
                    {sub && <p className="font-body text-[11px] text-nebbia/40 mt-1">{sub}</p>}
                </div>
                <Icon size={16} className={`${color}/40`} />
            </div>
        </div>
    )
}

// ─── MINI BAR CHART (custom SVG, niente libs) ───────────────────
function MiniBarChart({ data }) {
    const maxCosto = Math.max(...data.map(d => d.costo), 0.001)
    const width = 100
    const height = 60
    const barW = width / data.length

    return (
        <div className="space-y-2">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32" preserveAspectRatio="none">
                {data.map((d, i) => {
                    const h = (d.costo / maxCosto) * height
                    return (
                        <g key={d.data}>
                            <rect
                                x={i * barW + 0.2}
                                y={height - h}
                                width={barW - 0.4}
                                height={h}
                                fill="#C9A45C"
                                opacity="0.6"
                            />
                            <title>{d.data}: {formatCosto(d.costo)}</title>
                        </g>
                    )
                })}
            </svg>
            <div className="flex items-center justify-between font-body text-[10px] text-nebbia/40">
                <span>{data[0]?.data}</span>
                <span>{data[data.length - 1]?.data}</span>
            </div>
        </div>
    )
}

// ─── RIGA LOG (aggrega catena per request_id) ────────────────────
function RigaLog({ log, aperto, onTogliApri, logsCatena }) {
    const meta = ENDPOINT_LABELS[log.endpoint] ?? { label: log.endpoint, color: 'text-nebbia', icon: Activity }

    // Quando aggregato, usa esito peggiore della catena, costi/token/durata totali
    const esitoEffettivo = log._aggregato ? log._esitoPeggiore : log.esito
    const costoEffettivo = log._aggregato ? log._costoCatena : parseFloat(log.costo_totale_usd ?? 0)
    const tokenInEffettivo = log._aggregato ? log._tokenInCatena : log.token_input
    const tokenOutEffettivo = log._aggregato ? log._tokenOutCatena : log.token_output
    const durataEffettiva = log._aggregato ? log._durataCatena : log.durata_ms

    const esitoMeta = ESITO_BADGES[esitoEffettivo] ?? { label: esitoEffettivo, class: 'border-white/10 text-nebbia' }
    const Icon = meta.icon

    const utente = log.profiles
        ? `${log.profiles.nome ?? ''} ${log.profiles.cognome ?? ''}`.trim() || log.profiles.email
        : '—'

    return (
        <>
            <tr
                className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer"
                onClick={onTogliApri}
            >
                <td className="px-3 py-2 text-nebbia/30">
                    {aperto ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </td>
                <td className="px-3 py-2 font-body text-xs text-nebbia/60 whitespace-nowrap">
                    {formatData(log.created_at)}
                </td>
                <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                        <Icon size={11} className={meta.color} />
                        <span className={`font-body text-xs ${meta.color}`}>{meta.label}</span>
                        {log.azione && (
                            <span className="font-body text-[10px] text-nebbia/40 ml-1">
                                · {log.azione}
                            </span>
                        )}
                        {log._aggregato && log._numChiamate > 1 && (
                            <span className="font-body text-[10px] text-nebbia/40 ml-1 px-1.5 py-0.5 bg-petrolio border border-white/10">
                                {log._numChiamate} chiamate
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-3 py-2 font-body text-xs text-nebbia/60 max-w-[160px] truncate">
                    {utente}
                </td>
                <td className="px-3 py-2 font-body text-xs text-nebbia/50 max-w-[280px] truncate">
                    {log.domanda ?? '—'}
                </td>
                <td className="px-3 py-2 font-body text-xs text-nebbia/40 text-right tabular-nums whitespace-nowrap">
                    {formatNumero(tokenInEffettivo)} / {formatNumero(tokenOutEffettivo)}
                </td>
                <td className="px-3 py-2 font-body text-xs text-oro text-right tabular-nums">
                    {formatCosto(costoEffettivo)}
                </td>
                <td className="px-3 py-2 font-body text-xs text-nebbia/40 text-right tabular-nums">
                    {formatDurata(durataEffettiva)}
                </td>
                <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 border font-body text-[10px] ${esitoMeta.class}`}>
                        {esitoMeta.label}
                    </span>
                </td>
            </tr>

            {/* Drill-down catena */}
            {aperto && (
                <tr className="bg-petrolio/30">
                    <td colSpan={9} className="p-4 border-b border-white/5">
                        <DettaglioCatena log={log} catena={logsCatena} />
                    </td>
                </tr>
            )}
        </>
    )
}

// ─── DETTAGLIO CATENA ───────────────────────────────────────────
function DettaglioCatena({ log, catena }) {
    if (!catena || catena.length === 0) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 size={14} className="animate-spin text-oro" />
            </div>
        )
    }

    const totaleCatena = catena.reduce((sum, c) => sum + parseFloat(c.costo_totale_usd ?? 0), 0)
    const totaleDurata = catena.reduce((sum, c) => sum + (c.durata_ms ?? 0), 0)

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="font-body text-xs text-nebbia/60">
                    Catena richiesta · <span className="text-nebbia/40">{log.request_id.slice(0, 8)}…</span>
                </p>
                <div className="flex items-center gap-4 font-body text-xs">
                    <span className="text-nebbia/40">{catena.length} chiamate</span>
                    <span className="text-oro tabular-nums">{formatCosto(totaleCatena)}</span>
                    <span className="text-nebbia/40 tabular-nums">{formatDurata(totaleDurata)}</span>
                </div>
            </div>

            <div className="space-y-1">
                {catena.map((c) => {
                    const meta = ENDPOINT_LABELS[c.endpoint] ?? { label: c.endpoint, color: 'text-nebbia', icon: Activity }
                    const isChild = c.parent_log_id !== null
                    const Icon = meta.icon

                    return (
                        <div
                            key={c.id}
                            className={`flex items-center gap-3 px-3 py-2 bg-petrolio/40 ${isChild ? 'ml-6 border-l-2 border-salvia/20' : ''}`}
                        >
                            <Icon size={12} className={`${meta.color}/70 shrink-0`} />
                            <div className="flex-1 min-w-0 flex items-center gap-3">
                                <span className={`font-body text-xs ${meta.color}`}>{meta.label}</span>
                                {c.azione && (
                                    <span className="font-body text-[10px] text-nebbia/40">· {c.azione}</span>
                                )}
                                <span className="font-body text-[10px] text-nebbia/40">{c.modello}</span>
                                {c.qualita_retrieval && (
                                    <span className={`font-body text-[10px] px-1.5 py-0.5 border ${c.qualita_retrieval === 'alta' ? 'text-green-400 border-green-500/30' :
                                        c.qualita_retrieval === 'media' ? 'text-amber-400 border-amber-500/30' :
                                            'text-red-400 border-red-500/30'
                                        }`}>
                                        {c.qualita_retrieval}
                                    </span>
                                )}
                                {c.principali_count !== null && (
                                    <span className="font-body text-[10px] text-nebbia/40">
                                        {c.principali_count} principali
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0 font-body text-[11px] tabular-nums">
                                <span className="text-nebbia/40">
                                    {formatNumero(c.token_input)}/{formatNumero(c.token_output)}
                                </span>
                                <span className="text-oro/80 w-16 text-right">
                                    {formatCosto(parseFloat(c.costo_totale_usd ?? 0))}
                                </span>
                                <span className="text-nebbia/40 w-12 text-right">
                                    {formatDurata(c.durata_ms)}
                                </span>
                                <span className={`px-1.5 py-0.5 border font-body text-[10px] ${ESITO_BADGES[c.esito]?.class ?? ''}`}>
                                    {ESITO_BADGES[c.esito]?.label ?? c.esito}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {log.errore && (
                <div className="flex items-start gap-2 p-3 bg-red-900/10 border border-red-500/20">
                    <XCircle size={12} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-xs font-medium text-red-400 mb-1">Errore</p>
                        <p className="font-body text-xs text-nebbia/60 leading-relaxed">{log.errore}</p>
                    </div>
                </div>
            )}

            {log.metadati && Object.keys(log.metadati).length > 0 && (
                <details className="bg-petrolio/40 border border-white/5">
                    <summary className="px-3 py-2 cursor-pointer font-body text-xs text-nebbia/50 hover:text-nebbia">
                        Metadati
                    </summary>
                    <pre className="px-3 pb-2 font-mono text-[10px] text-nebbia/50 overflow-x-auto">
                        {JSON.stringify(log.metadati, null, 2)}
                    </pre>
                </details>
            )}
        </div>
    )
}