// src/pages/avvocato/clienti/Lista.jsx

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/shared'
import {
    Plus, Search, User, ArrowRight, ChevronUp, ChevronDown, ArrowUpDown,
    AlertCircle, Building2, Trash2, X, CheckCircle, Sparkles, Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import RispostaLexClienti from '@/components/avvocato/RispostaLexClienti'

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function nomeCliente(c) {
    if (!c) return ''
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? c.nome ?? '—'
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
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
// MODAL ELIMINA CLIENTE (richiede digitazione del nome)
// ─────────────────────────────────────────────────────────────
function ModalEliminaCliente({ cliente, onClose, onEliminato }) {
    const nome = nomeCliente(cliente)
    const [conferma, setConferma] = useState('')
    const [inviando, setInviando] = useState(false)
    const [errore, setErrore] = useState('')
    const [risultato, setRisultato] = useState(null)
    const matchEsatto = conferma.trim() === nome

    async function elimina() {
        if (!matchEsatto) return
        setErrore(''); setInviando(true)
        try {
            const { data, error } = await supabase.functions.invoke('avvocato-cliente-actions', {
                body: { action: 'elimina-cliente', cliente_id: cliente.id }
            })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? 'Errore')
            setRisultato(data)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setInviando(false)
        }
    }

    if (risultato) {
        const totale = Object.values(risultato.conteggi ?? {}).reduce((a, n) => a + n, 0)
        return (
            <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto">
                <div className="bg-slate border border-salvia/30 w-full max-w-md p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-salvia/10 border border-salvia/30 flex items-center justify-center">
                            <CheckCircle size={18} className="text-salvia" />
                        </div>
                        <h2 className="font-display text-lg text-nebbia">Cliente eliminato</h2>
                    </div>
                    <p className="font-body text-sm text-nebbia/60">{risultato.messaggio}</p>
                    {totale > 0 && (
                        <div className="bg-petrolio/40 border border-white/5 p-3 space-y-1">
                            <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-2">Dati cancellati</p>
                            {Object.entries(risultato.conteggi)
                                .filter(([_, n]) => n > 0)
                                .map(([k, n]) => (
                                    <div key={k} className="flex justify-between font-body text-xs">
                                        <span className="text-nebbia/50">{k.replace(/_/g, ' ')}</span>
                                        <span className="text-nebbia">{n}</span>
                                    </div>
                                ))
                            }
                        </div>
                    )}
                    <button onClick={() => { onClose(); onEliminato() }}
                        className="btn-primary text-sm w-full justify-center">
                        Chiudi
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate border border-red-500/30 w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-2">
                        <Trash2 size={16} className="text-red-400" />
                        <h2 className="font-display text-lg text-nebbia">Elimina cliente</h2>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="bg-red-900/15 border border-red-500/30 p-4">
                        <p className="font-body text-sm text-red-400 leading-relaxed mb-2">
                            <span className="font-semibold">Operazione irreversibile.</span>
                        </p>
                        <p className="font-body text-xs text-red-400/80 leading-relaxed">
                            Saranno cancellati definitivamente: anagrafica cliente, pratiche, fatture,
                            note interne, appuntamenti, documenti, comunicazioni. I file caricati
                            nello storage diventeranno orfani e inaccessibili.
                        </p>
                    </div>

                    <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                        Per confermare digita il nome esatto del cliente:
                    </p>
                    <p className="font-body text-base font-semibold text-oro">{nome}</p>

                    <input
                        value={conferma}
                        onChange={e => setConferma(e.target.value)}
                        placeholder="Digita qui per confermare"
                        autoFocus
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                    />

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}

                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                        <button onClick={onClose} disabled={inviando}
                            className="w-full sm:w-auto font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">
                            Annulla
                        </button>
                        <button onClick={elimina} disabled={!matchEsatto || inviando}
                            className="w-full sm:w-auto sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/15 border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                            {inviando
                                ? <span className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" />
                                : <><Trash2 size={14} /> Elimina definitivamente</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// LISTA CLIENTI
// ─────────────────────────────────────────────────────────────
export function AvvocatoClienti() {
    // ─── State ricerca tradizionale ───────────────────────────
    const [search, setSearch] = useState('')
    const [cercaApplicata, setCercaApplicata] = useState('')
    const [cercando, setCercando] = useState(false)

    // ─── State Lex (assistente Haiku) ─────────────────────────
    const [cercandoLex, setCercandoLex] = useState(false)
    const [rispostaLex, setRispostaLex] = useState(null)
    // rispostaLex = { risposta: string, clienti_menzionati: string[], oltre_limite?: boolean }
    const [erroreLex, setErroreLex] = useState('')

    // ─── State filtri tradizionali ────────────────────────────
    const [avvF, setAvvF] = useState('')
    const [tipoF, setTipoF] = useState('')
    const [sortField, setSortField] = useState('cognome')
    const [sortDir, setSortDir] = useState('asc')

    // ─── State dati ───────────────────────────────────────────
    const [clienti, setClienti] = useState([])
    const [collaboratori, setCollaboratori] = useState([])
    const [isStudio, setIsStudio] = useState(false)
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')
    const [clienteDaEliminare, setClienteDaEliminare] = useState(null)

    useEffect(() => { carica() }, [])

    async function carica() {
        setLoading(true); setErrore('')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profilo } = await supabase
            .from('profiles')
            .select('posti_acquistati, titolare_id')
            .eq('id', user.id).single()

        const haStudio = (profilo?.posti_acquistati ?? 1) > 1
        setIsStudio(haStudio)

        let ids = [user.id]
        if (haStudio) {
            const { data: collabs } = await supabase
                .from('profiles').select('id, nome, cognome').eq('titolare_id', user.id)
            setCollaboratori(collabs ?? [])
            ids = [user.id, ...(collabs ?? []).map(c => c.id)]
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('id, nome, cognome, ragione_sociale, tipo_soggetto, email, telefono, created_at, avvocato_id')
            .eq('role', 'cliente')
            .in('avvocato_id', ids)
            .order('cognome')

        if (error) { setErrore('Errore nel caricamento dei clienti'); setLoading(false); return }
        setClienti(data ?? [])
        setLoading(false)
    }

    function handleSort(f) {
        if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(f); setSortDir('asc') }
    }

    function azzeraRicerca() {
        setRispostaLex(null)
        setErroreLex('')
        setCercaApplicata('')
    }

    async function cercaTradizionale() {
        if (!search.trim()) return
        setCercando(true)
        setRispostaLex(null)
        setErroreLex('')
        setCercaApplicata(search.trim())
        setTimeout(() => setCercando(false), 200)
    }

    async function cercaConLex() {
        if (!search.trim()) return
        setCercandoLex(true)
        setErroreLex('')
        setRispostaLex(null)
        setCercaApplicata('')
        try {
            const { data, error } = await supabase.functions.invoke('lex-assistente-studio', {
                body: { domanda: search.trim() }
            })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? 'Errore Lex')
            setRispostaLex({
                risposta: data.risposta,
                clienti_menzionati: data.clienti_menzionati ?? [],
                oltre_limite: data.oltre_limite ?? false,
            })
        } catch (err) {
            setErroreLex(err.message)
        } finally {
            setCercandoLex(false)
        }
    }

    // Mappa clienti per lookup veloce nel componente risposta Lex
    const clientiMap = useMemo(() => {
        const m = {}
        for (const c of clienti) m[c.id] = c
        return m
    }, [clienti])

    const inRicerca = cercaApplicata !== ''

    // ─── Applica filtri tradizionali + sort ───────────────────
    const rows = useMemo(() => {
        let result = clienti
            .filter(c => {
                if (avvF && c.avvocato_id !== avvF) return false
                if (tipoF && c.tipo_soggetto !== tipoF) return false
                if (cercaApplicata && !rispostaLex) {
                    const s = cercaApplicata.toLowerCase()
                    return `${nomeCliente(c)} ${c.email}`.toLowerCase().includes(s)
                }
                return true
            })

        result = [...result].sort((a, b) => {
            let va, vb
            if (sortField === 'cognome') { va = nomeCliente(a); vb = nomeCliente(b) }
            else { va = a[sortField]; vb = b[sortField] }
            va = String(va ?? '').toLowerCase()
            vb = String(vb ?? '').toLowerCase()
            if (va < vb) return sortDir === 'asc' ? -1 : 1
            if (va > vb) return sortDir === 'asc' ? 1 : -1
            return 0
        })

        return result
    }, [clienti, avvF, tipoF, cercaApplicata, rispostaLex, sortField, sortDir])

    return (
        <div className="space-y-5">
            <PageHeader
                label="Clienti"
                title={isStudio ? 'Clienti dello studio' : 'I tuoi clienti'}
                subtitle={`${clienti.length} ${clienti.length === 1 ? 'cliente' : 'clienti'} in totale`}
                action={<Link to="/clienti/nuovo" className="btn-primary text-sm"><Plus size={15} />Nuovo cliente</Link>}
            />

            {/* ─── BOX RICERCA stile archivio + Lex ─────────────── */}
            <div className="bg-slate border border-white/5 p-4 space-y-3">
                <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                    Cerca clienti per nome o email. Oppure fai a Lex domande sui clienti e chiedi info su di essi. Lex non ha accesso alle note interne dei clienti.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <div className="relative flex-1">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Cerca o chiedi a Lex..."
                            value={search}
                            onChange={e => {
                                setSearch(e.target.value)
                                if (e.target.value.trim() === '' && (inRicerca || rispostaLex)) azzeraRicerca()
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) cercaConLex()
                                else if (e.key === 'Enter') { e.preventDefault(); cercaTradizionale() }
                            }}
                            className="w-full h-11 sm:h-[38px] bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-9 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                        {search && (
                            <button
                                onClick={() => { setSearch(''); azzeraRicerca() }}
                                className="absolute top-1/2 -translate-y-1/2 right-2 text-nebbia/30 hover:text-nebbia p-1"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={cercaTradizionale}
                        disabled={cercando || cercandoLex || !search.trim()}
                        className="flex items-center justify-center gap-2 px-4 h-11 sm:h-[38px] bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                        {cercando
                            ? <Loader2 size={13} className="animate-spin" />
                            : <><Search size={13} /> Cerca</>
                        }
                    </button>

                    <button
                        onClick={cercaConLex}
                        disabled={cercando || cercandoLex || !search.trim()}
                        className="flex items-center justify-center gap-2 px-4 h-11 sm:h-[38px] bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                        {cercandoLex
                            ? <><Loader2 size={13} className="animate-spin" /> <span className="sm:hidden md:inline">Lex sta pensando...</span></>
                            : <><Sparkles size={13} /> <span className="sm:hidden md:inline">Chiedi a Lex</span><span className="hidden sm:inline md:hidden">Lex</span></>
                        }
                    </button>
                </div>

                {erroreLex && (
                    <p className="font-body text-xs text-red-400 flex items-center gap-1.5">
                        <AlertCircle size={11} /> {erroreLex}
                    </p>
                )}

                {/* Risposta Lex (componente isolato che gestisce link cliccabili) */}
                {rispostaLex && (
                    <RispostaLexClienti
                        risposta={rispostaLex.risposta}
                        clientiMenzionati={rispostaLex.clienti_menzionati}
                        clientiMap={clientiMap}
                    />
                )}

                {/* Banner ricerca tradizionale attiva (solo se non c'e' Lex) */}
                {inRicerca && !rispostaLex && !erroreLex && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-oro/5 border border-oro/20">
                        <p className="font-body text-xs text-oro">
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

            {/* ─── FILTRI tradizionali ─────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
                <select value={tipoF} onChange={e => setTipoF(e.target.value)}
                    className="w-full sm:w-auto bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-3 py-2.5 sm:py-1.5 outline-none focus:border-oro/40">
                    <option value="">Tutti i tipi</option>
                    <option value="persona_fisica">Persone fisiche</option>
                    <option value="persona_giuridica">Persone giuridiche</option>
                </select>
                {isStudio && collaboratori.length > 0 && (
                    <select value={avvF} onChange={e => setAvvF(e.target.value)}
                        className="w-full sm:w-auto bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-3 py-2.5 sm:py-1.5 outline-none focus:border-oro/40">
                        <option value="">Tutti gli avvocati</option>
                        {collaboratori.map(c => <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>)}
                    </select>
                )}
                {(avvF || tipoF) && (
                    <button onClick={() => { setAvvF(''); setTipoF('') }}
                        className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors flex items-center justify-center sm:justify-start gap-1 py-2.5 sm:py-0">
                        <X size={11} /> Reset filtri
                    </button>
                )}
            </div>

            {/* ─── Tabella ────────────────────────────────────────── */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : errore ? (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-4 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            ) : (
                <div className="bg-slate border border-white/5">

                    {/* Mobile: lista di card */}
                    <div className="lg:hidden divide-y divide-white/5">
                        {rows.length === 0 ? (
                            <div className="px-4 py-12 text-center font-body text-sm text-nebbia/30">
                                {clienti.length === 0 ? "Nessun cliente. Crea il primo." : "Nessun cliente con questi filtri."}
                            </div>
                        ) : rows.map(c => {
                            const avv = collaboratori.find(col => col.id === c.avvocato_id)
                            return (
                                <div key={c.id} className="relative">
                                    <Link
                                        to={`/clienti/${c.id}`}
                                        className="block p-4 pr-14 space-y-2 active:bg-petrolio/40 transition-colors"
                                    >
                                        <div className="flex items-start gap-2">
                                            {c.tipo_soggetto === 'persona_giuridica'
                                                ? <Building2 size={14} className="text-nebbia/30 shrink-0 mt-0.5" />
                                                : <User size={14} className="text-nebbia/30 shrink-0 mt-0.5" />
                                            }
                                            <span className="font-body text-sm font-medium text-nebbia break-words">
                                                {nomeCliente(c)}
                                            </span>
                                        </div>

                                        <div className="space-y-0.5 pl-6">
                                            <p className="font-body text-xs text-nebbia/60 break-all">{c.email}</p>
                                            <p className="font-body text-xs text-nebbia/40">{c.telefono ?? '—'}</p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 pl-6">
                                            {isStudio && (
                                                <span className="font-body text-xs text-nebbia/60 bg-petrolio/60 border border-white/5 px-2 py-0.5">
                                                    {avv ? `${avv.nome} ${avv.cognome}` : 'Tu'}
                                                </span>
                                            )}
                                            <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">
                                                {new Date(c.created_at).toLocaleDateString('it-IT')}
                                            </span>
                                        </div>
                                    </Link>

                                    <button
                                        onClick={(e) => { e.preventDefault(); setClienteDaEliminare(c) }}
                                        title="Elimina cliente"
                                        aria-label="Elimina cliente"
                                        className="absolute top-3 right-3 inline-flex items-center justify-center w-10 h-10 text-nebbia/30 hover:text-red-400 active:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>

                    {/* Desktop: tabella invariata */}
                    <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <SortTh label="Cliente" field="cognome" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                <SortTh label="Email" field="email" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Telefono</th>
                                {isStudio && <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Avvocato</th>}
                                <SortTh label="Creato il" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 w-20" />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr><td colSpan={isStudio ? 6 : 5} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">
                                    {clienti.length === 0 ? "Nessun cliente. Crea il primo." : "Nessun cliente con questi filtri."}
                                </td></tr>
                            ) : rows.map(c => (
                                <tr key={c.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {c.tipo_soggetto === 'persona_giuridica'
                                                ? <Building2 size={12} className="text-nebbia/30 shrink-0" />
                                                : <User size={12} className="text-nebbia/30 shrink-0" />
                                            }
                                            <Link to={`/clienti/${c.id}`} className="font-body text-sm font-medium text-nebbia hover:text-oro transition-colors">
                                                {nomeCliente(c)}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-body text-sm text-nebbia/60">{c.email}</td>
                                    <td className="px-4 py-3 font-body text-sm text-nebbia/50">{c.telefono ?? '—'}</td>
                                    {isStudio && (
                                        <td className="px-4 py-3 font-body text-sm text-nebbia/60">
                                            {collaboratori.find(col => col.id === c.avvocato_id)
                                                ? `${collaboratori.find(col => col.id === c.avvocato_id).nome} ${collaboratori.find(col => col.id === c.avvocato_id).cognome}`
                                                : 'Tu'}
                                        </td>
                                    )}
                                    <td className="px-4 py-3 font-body text-sm text-nebbia/50 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString('it-IT')}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.preventDefault(); setClienteDaEliminare(c) }}
                                                title="Elimina cliente"
                                                className="inline-flex items-center justify-center w-7 h-7 text-nebbia/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                            <Link to={`/clienti/${c.id}`} className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-oro hover:bg-oro/10 transition-colors">
                                                <ArrowRight size={14} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}

            {clienteDaEliminare && (
                <ModalEliminaCliente
                    cliente={clienteDaEliminare}
                    onClose={() => setClienteDaEliminare(null)}
                    onEliminato={() => { setClienteDaEliminare(null); carica() }}
                />
            )}
        </div>
    )
}