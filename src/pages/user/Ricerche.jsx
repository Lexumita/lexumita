import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import {
    Sparkles, Search, Plus, X, Loader2, AlertCircle, Check, Save,
    Tag, Edit2, Trash2, ChevronDown, Filter, FolderOpen, MessageSquare,
    AlertTriangle, ChevronRight
} from 'lucide-react'

const PALETTE = [
    '#C9A45C', '#7FA39A', '#8B7BB8', '#D49B6F',
    '#6FA3D4', '#D47F7F', '#8FB979', '#B57FD4',
]

const TIPI = [
    { id: 'tutti', label: 'Tutti' },
    { id: 'ricerca_ai', label: 'AI' },
    { id: 'ricerca_manuale', label: 'Manuali' },
    { id: 'chat_lex', label: 'Chat con Lex' },
]

const LIMITE_ORFANE = 20
const SOGLIA_AVVISO = 15  // mostra avviso quando si avvicina al limite

function coloreCasuale() {
    return PALETTE[Math.floor(Math.random() * PALETTE.length)]
}

export default function Ricerche() {
    const [searchParams, setSearchParams] = useSearchParams()

    // Dati
    const [ricerche, setRicerche] = useState([])
    const [etichette, setEtichette] = useState([])
    const [pratiche, setPratiche] = useState([])
    const [tagsByRicerca, setTagsByRicerca] = useState({}) // { ricerca_id: [etichetta_ids] }
    const [loading, setLoading] = useState(true)

    // Filtri
    const [cerca, setCerca] = useState('')
    const [tipoAttivo, setTipoAttivo] = useState('tutti')
    const [etichetteSelezionate, setEtichetteSelezionate] = useState(
        searchParams.get('etichette')?.split(',').filter(Boolean) ?? []
    )
    const [praticaSelezionata, setPraticaSelezionata] = useState(searchParams.get('pratica') ?? '')

    // UI
    const [contenutoAperto, setContenutoAperto] = useState(null)
    const [mostraGestioneEtichette, setMostraGestioneEtichette] = useState(false)
    const [mostraNuovaRicerca, setMostraNuovaRicerca] = useState(false)
    const [mostraNuovaEtichetta, setMostraNuovaEtichetta] = useState(false)
    const [errore, setErrore] = useState('')

    // Conteggi orfane
    const [conteggioOrfane, setConteggioOrfane] = useState(0)

    useEffect(() => { caricaTutto() }, [])

    async function caricaTutto() {
        setLoading(true)
        setErrore('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const [
                { data: r },
                { data: e },
                { data: p },
            ] = await Promise.all([
                supabase
                    .from('ricerche')
                    .select('id, tipo, titolo, contenuto, metadati, pratica_id, created_at, autore:autore_id(nome, cognome), pratica:pratica_id(id, titolo)')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('etichette')
                    .select('id, nome, colore')
                    .eq('user_id', user.id)
                    .order('nome', { ascending: true }),
                supabase
                    .from('pratiche')
                    .select('id, titolo')
                    .order('updated_at', { ascending: false })
                    .limit(200),
            ])

            setRicerche(r ?? [])
            setEtichette(e ?? [])
            setPratiche(p ?? [])

            // Carica tag per ogni ricerca
            if ((r ?? []).length > 0) {
                const ids = r.map(x => x.id)
                const { data: tags } = await supabase
                    .from('elementi_etichette')
                    .select('elemento_id, etichetta_id')
                    .in('elemento_id', ids)
                    .in('tipo', ['ricerca_ai', 'ricerca_manuale', 'chat_lex'])

                const map = {}
                for (const t of tags ?? []) {
                    if (!map[t.elemento_id]) map[t.elemento_id] = []
                    map[t.elemento_id].push(t.etichetta_id)
                }
                setTagsByRicerca(map)

                // Conta orfane
                const tagSet = new Set(Object.keys(map))
                const orfane = r.filter(x => !x.pratica_id && !tagSet.has(x.id)).length
                setConteggioOrfane(orfane)
            }
        } catch (e) {
            setErrore(e.message)
        } finally {
            setLoading(false)
        }
    }

    // ─── Filtri ───
    const ricercheFiltrate = useMemo(() => {
        return ricerche.filter(r => {
            if (tipoAttivo !== 'tutti' && r.tipo !== tipoAttivo) return false
            if (praticaSelezionata && r.pratica_id !== praticaSelezionata) return false
            if (etichetteSelezionate.length > 0) {
                const tags = tagsByRicerca[r.id] ?? []
                const hasAny = etichetteSelezionate.some(eid => tags.includes(eid))
                if (!hasAny) return false
            }
            if (cerca.trim()) {
                const q = cerca.toLowerCase()
                const corpus = `${r.titolo ?? ''} ${r.contenuto ?? ''}`.toLowerCase()
                if (!corpus.includes(q)) return false
            }
            return true
        })
    }, [ricerche, tipoAttivo, praticaSelezionata, etichetteSelezionate, cerca, tagsByRicerca])

    // Aggiorna URL quando cambiano filtri pratica/etichette (per shareability)
    useEffect(() => {
        const params = {}
        if (praticaSelezionata) params.pratica = praticaSelezionata
        if (etichetteSelezionate.length) params.etichette = etichetteSelezionate.join(',')
        setSearchParams(params, { replace: true })
    }, [praticaSelezionata, etichetteSelezionate])

    function toggleEtichettaFiltro(eid) {
        setEtichetteSelezionate(prev =>
            prev.includes(eid) ? prev.filter(x => x !== eid) : [...prev, eid]
        )
    }

    function azzeraFiltri() {
        setTipoAttivo('tutti')
        setPraticaSelezionata('')
        setEtichetteSelezionate([])
        setCerca('')
    }

    const haFiltriAttivi = tipoAttivo !== 'tutti' || praticaSelezionata || etichetteSelezionate.length > 0 || cerca

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <Loader2 size={20} className="animate-spin text-oro" />
        </div>
    )

    return (
        <div className="space-y-5">

            {/* ═══════════════ Header ═══════════════ */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <p className="section-label mb-2">Pensiero legale</p>
                    <h1 className="font-display text-4xl font-light text-nebbia">Ricerche</h1>
                    <p className="font-body text-sm text-nebbia/40 mt-1">
                        Tutte le tue ricerche AI, manuali e chat con Lex, dentro e fuori le pratiche.
                    </p>
                </div>
                <button
                    onClick={() => setMostraNuovaRicerca(true)}
                    className="btn-primary text-sm"
                >
                    <Plus size={14} /> Nuova ricerca
                </button>
            </div>

            {/* ═══════════════ Banner limite orfane ═══════════════ */}
            {conteggioOrfane >= SOGLIA_AVVISO && (
                <div className={`flex items-start gap-3 p-4 border ${conteggioOrfane >= LIMITE_ORFANE
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-amber-500/10 border-amber-500/30'
                    }`}>
                    <AlertTriangle size={16} className={conteggioOrfane >= LIMITE_ORFANE ? 'text-red-400 shrink-0 mt-0.5' : 'text-amber-400 shrink-0 mt-0.5'} />
                    <div className="flex-1 min-w-0">
                        <p className={`font-body text-sm font-medium ${conteggioOrfane >= LIMITE_ORFANE ? 'text-red-400' : 'text-amber-400'}`}>
                            {conteggioOrfane}/{LIMITE_ORFANE} ricerche fuori da pratiche e senza etichette
                        </p>
                        <p className="font-body text-xs text-nebbia/60 mt-1 leading-relaxed">
                            Quando superi il limite, le orfane più vecchie vengono <strong>eliminate automaticamente</strong> per fare spazio alle nuove.
                            Salva una ricerca dentro una pratica o assegnale almeno un'etichetta per proteggerla.
                        </p>
                    </div>
                </div>
            )}

            {/* ═══════════════ Search + Filtri ═══════════════ */}
            <div className="space-y-3">

                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                    <input
                        placeholder="Cerca nel testo delle ricerche..."
                        value={cerca}
                        onChange={e => setCerca(e.target.value)}
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-9 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                    />
                    {cerca && (
                        <button onClick={() => setCerca('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-nebbia">
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Tab tipo */}
                <div className="flex gap-1 bg-slate border border-white/5 p-1 overflow-x-auto">
                    {TIPI.map(t => {
                        const isActive = tipoAttivo === t.id
                        const count = t.id === 'tutti'
                            ? ricerche.length
                            : ricerche.filter(r => r.tipo === t.id).length
                        return (
                            <button
                                key={t.id}
                                onClick={() => setTipoAttivo(t.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 font-body text-xs transition-colors whitespace-nowrap ${isActive ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'
                                    }`}
                            >
                                <span>{t.label}</span>
                                {count > 0 && (
                                    <span className={`text-[10px] ${isActive ? 'text-oro/60' : 'text-nebbia/30'}`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Filtro pratica + etichette */}
                <div className="flex items-start gap-3 flex-wrap">

                    {/* Pratica */}
                    <div className="flex items-center gap-2">
                        <FolderOpen size={12} className="text-nebbia/30" />
                        <select
                            value={praticaSelezionata}
                            onChange={e => setPraticaSelezionata(e.target.value)}
                            className="bg-slate border border-white/10 text-nebbia font-body text-xs px-3 py-1.5 outline-none focus:border-oro/50 max-w-[200px]"
                        >
                            <option value="">Tutte le pratiche</option>
                            {pratiche.map(p => (
                                <option key={p.id} value={p.id}>{p.titolo}</option>
                            ))}
                        </select>
                    </div>

                    {/* Etichette */}
                    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <Tag size={12} className="text-nebbia/30" />
                        {etichette.map(e => {
                            const isAttiva = etichetteSelezionate.includes(e.id)
                            return (
                                <button
                                    key={e.id}
                                    onClick={() => toggleEtichettaFiltro(e.id)}
                                    className={`flex items-center gap-1.5 px-2 py-1 font-body text-xs border transition-colors ${isAttiva
                                            ? 'border-nebbia/40 text-nebbia'
                                            : 'border-white/10 text-nebbia/40 hover:text-nebbia hover:border-white/20'
                                        }`}
                                >
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: e.colore || '#7FA39A' }}
                                    />
                                    {e.nome}
                                </button>
                            )
                        })}
                        <button
                            onClick={() => setMostraNuovaEtichetta(true)}
                            className="flex items-center gap-1 px-2 py-1 font-body text-xs text-oro border border-oro/30 hover:bg-oro/10 transition-colors"
                        >
                            <Plus size={10} /> Etichetta
                        </button>
                        {etichette.length > 0 && (
                            <button
                                onClick={() => setMostraGestioneEtichette(true)}
                                className="font-body text-xs text-nebbia/30 hover:text-nebbia transition-colors px-1.5 py-1"
                            >
                                Gestisci…
                            </button>
                        )}
                    </div>

                    {/* Reset filtri */}
                    {haFiltriAttivi && (
                        <button
                            onClick={azzeraFiltri}
                            className="flex items-center gap-1 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors"
                        >
                            <X size={10} /> Azzera
                        </button>
                    )}
                </div>
            </div>

            {/* ═══════════════ Lista ricerche ═══════════════ */}
            {ricercheFiltrate.length === 0 ? (
                <div className="bg-slate border border-white/5 py-16 text-center">
                    <Sparkles size={32} className="text-nebbia/15 mx-auto mb-3" />
                    <p className="font-body text-sm text-nebbia/30 mb-2">
                        {ricerche.length === 0 ? 'Nessuna ricerca ancora' : 'Nessun risultato'}
                    </p>
                    <p className="font-body text-xs text-nebbia/20 max-w-md mx-auto leading-relaxed">
                        {ricerche.length === 0
                            ? 'Le ricerche che fai con Lex AI o salvi manualmente compariranno qui. Puoi anche organizzarle con etichette tematiche.'
                            : 'Prova a cambiare i filtri o a cercare con parole diverse.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {ricercheFiltrate.map(r => (
                        <CardRicerca
                            key={r.id}
                            ricerca={r}
                            etichetteRicerca={
                                (tagsByRicerca[r.id] ?? [])
                                    .map(eid => etichette.find(e => e.id === eid))
                                    .filter(Boolean)
                            }
                            etichetteDisponibili={etichette}
                            aperto={contenutoAperto === r.id}
                            onToggleApri={() => setContenutoAperto(contenutoAperto === r.id ? null : r.id)}
                            onAggiornata={caricaTutto}
                        />
                    ))}
                </div>
            )}

            {/* ═══════════════ Modali ═══════════════ */}
            {mostraNuovaRicerca && (
                <ModaleNuovaRicerca
                    pratiche={pratiche}
                    etichette={etichette}
                    onClose={() => setMostraNuovaRicerca(false)}
                    onSalvata={() => { setMostraNuovaRicerca(false); caricaTutto() }}
                />
            )}

            {mostraNuovaEtichetta && (
                <ModaleNuovaEtichetta
                    onClose={() => setMostraNuovaEtichetta(false)}
                    onSalvata={() => { setMostraNuovaEtichetta(false); caricaTutto() }}
                />
            )}

            {mostraGestioneEtichette && (
                <ModaleGestioneEtichette
                    etichette={etichette}
                    onClose={() => setMostraGestioneEtichette(false)}
                    onAggiornate={caricaTutto}
                />
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// CARD RICERCA
// ═══════════════════════════════════════════════════════════════
function CardRicerca({ ricerca: r, etichetteRicerca, etichetteDisponibili, aperto, onToggleApri, onAggiornata }) {
    const [mostraTagPicker, setMostraTagPicker] = useState(false)
    const [eliminando, setEliminando] = useState(false)

    const Icon = r.tipo === 'ricerca_ai' ? Sparkles
        : r.tipo === 'chat_lex' ? MessageSquare
            : Search
    const colorIcon = r.tipo === 'ricerca_manuale' ? 'text-oro' : 'text-salvia'

    const tipoLabel = r.tipo === 'ricerca_ai' ? 'Ricerca AI'
        : r.tipo === 'chat_lex' ? 'Chat con Lex'
            : 'Ricerca manuale'

    async function elimina() {
        if (!confirm('Eliminare questa ricerca? L\'azione è irreversibile.')) return
        setEliminando(true)
        await supabase.from('ricerche').delete().eq('id', r.id)
        if (onAggiornata) await onAggiornata()
    }

    async function toggleEtichetta(etichettaId) {
        const giaPresente = etichetteRicerca.some(e => e.id === etichettaId)
        if (giaPresente) {
            await supabase.from('elementi_etichette')
                .delete()
                .eq('elemento_id', r.id)
                .eq('etichetta_id', etichettaId)
                .eq('tipo', r.tipo)
        } else {
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('elementi_etichette').insert({
                etichetta_id: etichettaId,
                elemento_id: r.id,
                tipo: r.tipo,
                user_id: user.id,
            })
        }
        if (onAggiornata) await onAggiornata()
    }

    return (
        <div className="bg-slate border border-white/5 hover:border-white/10 transition-colors">

            {/* Header card */}
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <Icon size={14} className={`${colorIcon} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">

                        {/* Titolo + meta */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="font-body text-sm font-medium text-nebbia leading-snug">
                                {r.titolo ?? tipoLabel}
                            </p>
                            <span className="font-body text-[10px] text-nebbia/30 shrink-0">
                                {new Date(r.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                        </div>

                        {/* Pratica + tipo + autore */}
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                            <span className="font-body text-[10px] text-nebbia/40 uppercase tracking-wider">{tipoLabel}</span>
                            {r.pratica
                                ? <Link to={`/pratiche/${r.pratica.id}`}
                                    className="flex items-center gap-1 font-body text-xs text-nebbia/60 hover:text-oro transition-colors">
                                    <FolderOpen size={10} /> {r.pratica.titolo}
                                </Link>
                                : <span className="font-body text-xs text-nebbia/30 italic">Senza pratica</span>
                            }
                            {r.autore && (
                                <span className="font-body text-xs text-nebbia/30">
                                    {r.autore.nome} {r.autore.cognome}
                                </span>
                            )}
                        </div>

                        {/* Preview contenuto */}
                        {!aperto && (
                            <p className="font-body text-xs text-nebbia/50 line-clamp-2 leading-relaxed mb-2">
                                {r.contenuto?.replace(/[#*_`]/g, '').slice(0, 250)}
                            </p>
                        )}

                        {/* Etichette */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {etichetteRicerca.map(e => (
                                <span
                                    key={e.id}
                                    className="flex items-center gap-1 font-body text-[10px] px-1.5 py-0.5 border"
                                    style={{
                                        borderColor: `${e.colore}40`,
                                        color: e.colore,
                                        backgroundColor: `${e.colore}10`
                                    }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.colore }} />
                                    {e.nome}
                                </span>
                            ))}
                            <button
                                onClick={() => setMostraTagPicker(!mostraTagPicker)}
                                className="font-body text-[10px] text-nebbia/30 hover:text-oro border border-dashed border-white/10 hover:border-oro/30 px-1.5 py-0.5 transition-colors"
                            >
                                + tag
                            </button>
                        </div>

                        {/* Tag picker */}
                        {mostraTagPicker && (
                            <div className="mt-2 p-2 bg-petrolio/40 border border-white/5">
                                {etichetteDisponibili.length === 0 ? (
                                    <p className="font-body text-xs text-nebbia/40 text-center py-2">
                                        Nessuna etichetta disponibile
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {etichetteDisponibili.map(e => {
                                            const giaPresente = etichetteRicerca.some(et => et.id === e.id)
                                            return (
                                                <button
                                                    key={e.id}
                                                    onClick={() => toggleEtichetta(e.id)}
                                                    className={`flex items-center gap-1 font-body text-xs px-2 py-1 border transition-colors ${giaPresente
                                                            ? 'border-nebbia/40 text-nebbia'
                                                            : 'border-white/10 text-nebbia/40 hover:text-nebbia hover:border-white/20'
                                                        }`}
                                                >
                                                    {giaPresente && <Check size={10} />}
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.colore }} />
                                                    {e.nome}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Azioni */}
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={onToggleApri}
                            className="font-body text-xs text-nebbia/30 hover:text-oro px-2 py-1 transition-colors">
                            {aperto ? 'Chiudi' : 'Apri'}
                        </button>
                        <button onClick={elimina} disabled={eliminando}
                            className="text-nebbia/25 hover:text-red-400 transition-colors p-1 disabled:opacity-40">
                            {eliminando ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Contenuto espanso */}
            {aperto && (
                <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-petrolio/30">
                    <div className="font-body text-sm text-nebbia/70 leading-relaxed">
                        <ReactMarkdown
                            components={{
                                h2: ({ children }) => <h2 className="font-body text-sm font-semibold text-nebbia mt-3 mb-1">{children}</h2>,
                                h3: ({ children }) => <h3 className="font-body text-xs font-semibold text-nebbia/80 mt-2 mb-0.5">{children}</h3>,
                                strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
                                p: ({ children }) => <p className="mb-2 leading-relaxed text-sm">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2">{children}</ul>,
                                li: ({ children }) => <li className="text-nebbia/60">{children}</li>,
                            }}
                        >
                            {r.contenuto}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// MODALE NUOVA RICERCA
// ═══════════════════════════════════════════════════════════════
function ModaleNuovaRicerca({ pratiche, etichette, onClose, onSalvata }) {
    const [titolo, setTitolo] = useState('')
    const [contenuto, setContenuto] = useState('')
    const [praticaId, setPraticaId] = useState('')
    const [etichetteSelezionate, setEtichetteSelezionate] = useState([])
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    async function salva() {
        setErrore('')
        if (!contenuto.trim()) return setErrore('Il contenuto è obbligatorio')
        setSalvando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            // Insert ricerca
            const { data: ric, error } = await supabase
                .from('ricerche')
                .insert({
                    user_id: user.id,
                    autore_id: user.id,
                    pratica_id: praticaId || null,
                    tipo: 'ricerca_manuale',
                    titolo: titolo.trim() || 'Ricerca manuale',
                    contenuto: contenuto.trim(),
                    metadati: { ts: new Date().toISOString() }
                })
                .select('id')
                .single()
            if (error) throw new Error(error.message)

            // Aggiungi etichette
            if (etichetteSelezionate.length > 0) {
                const links = etichetteSelezionate.map(eid => ({
                    etichetta_id: eid,
                    elemento_id: ric.id,
                    tipo: 'ricerca_manuale',
                    user_id: user.id,
                }))
                await supabase.from('elementi_etichette').insert(links)
            }

            onSalvata()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate border border-white/10 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <Plus size={14} className="text-oro" />
                        <p className="font-body text-sm font-medium text-nebbia">Nuova ricerca</p>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Titolo (opzionale)</label>
                        <input
                            value={titolo}
                            onChange={e => setTitolo(e.target.value)}
                            placeholder="Es. Riflessioni su responsabilità contrattuale"
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Contenuto</label>
                        <textarea
                            rows={10}
                            value={contenuto}
                            onChange={e => setContenuto(e.target.value)}
                            placeholder="Scrivi il tuo ragionamento, appunti, citazioni..."
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Pratica (opzionale)</label>
                        <select
                            value={praticaId}
                            onChange={e => setPraticaId(e.target.value)}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                        >
                            <option value="">Nessuna pratica (ricerca libera)</option>
                            {pratiche.map(p => (
                                <option key={p.id} value={p.id}>{p.titolo}</option>
                            ))}
                        </select>
                    </div>

                    {etichette.length > 0 && (
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Etichette (opzionali)</label>
                            <div className="flex flex-wrap gap-1.5">
                                {etichette.map(e => {
                                    const isAttiva = etichetteSelezionate.includes(e.id)
                                    return (
                                        <button
                                            key={e.id}
                                            type="button"
                                            onClick={() => setEtichetteSelezionate(prev =>
                                                isAttiva ? prev.filter(x => x !== e.id) : [...prev, e.id]
                                            )}
                                            className={`flex items-center gap-1 px-2 py-1 font-body text-xs border transition-colors ${isAttiva
                                                    ? 'border-nebbia/40 text-nebbia'
                                                    : 'border-white/10 text-nebbia/40 hover:text-nebbia hover:border-white/20'
                                                }`}
                                        >
                                            {isAttiva && <Check size={10} />}
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.colore }} />
                                            {e.nome}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {!praticaId && etichetteSelezionate.length === 0 && (
                        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/25">
                            <AlertCircle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                            <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                Senza pratica e senza etichetta, questa sarà una <strong>ricerca orfana</strong>. Puoi averne al massimo {LIMITE_ORFANE}; le più vecchie verranno rimosse automaticamente.
                            </p>
                        </div>
                    )}

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={13} /> {errore}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={salva}
                        disabled={salvando || !contenuto.trim()}
                        className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-40"
                    >
                        {salvando
                            ? <Loader2 size={12} className="animate-spin" />
                            : <><Save size={11} /> Salva ricerca</>
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// MODALE NUOVA ETICHETTA
// ═══════════════════════════════════════════════════════════════
function ModaleNuovaEtichetta({ onClose, onSalvata }) {
    const [nome, setNome] = useState('')
    const [colore, setColore] = useState(coloreCasuale())
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    async function salva() {
        if (!nome.trim() || salvando) return
        setSalvando(true)
        setErrore('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase
                .from('etichette')
                .insert({ user_id: user.id, nome: nome.trim(), colore })
            if (error) throw new Error(
                error.code === '23505'
                    ? 'Esiste già un\'etichetta con questo nome'
                    : error.message
            )
            onSalvata()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate border border-white/10 w-full max-w-md p-5 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between">
                    <p className="section-label">Nuova etichetta</p>
                    <button onClick={onClose} className="text-nebbia/30 hover:text-nebbia">
                        <X size={14} />
                    </button>
                </div>

                <div>
                    <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Nome</label>
                    <input
                        autoFocus
                        value={nome}
                        onChange={e => setNome(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && salva()}
                        placeholder="Es. Violenza sulle donne, Diritto del lavoro..."
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                    />
                </div>

                <div>
                    <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Colore</label>
                    <div className="flex gap-2 flex-wrap">
                        {PALETTE.map(c => (
                            <button
                                key={c}
                                onClick={() => setColore(c)}
                                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${colore === c ? 'ring-2 ring-offset-2 ring-offset-slate ring-nebbia' : ''
                                    }`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                {errore && (
                    <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                        <AlertCircle size={13} /> {errore}
                    </div>
                )}

                <button
                    onClick={salva}
                    disabled={!nome.trim() || salvando}
                    className="btn-primary w-full justify-center text-sm disabled:opacity-40"
                >
                    {salvando
                        ? <Loader2 size={14} className="animate-spin" />
                        : <><Check size={14} /> Crea etichetta</>
                    }
                </button>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// MODALE GESTIONE ETICHETTE (rinomina, ricolora, elimina)
// ═══════════════════════════════════════════════════════════════
function ModaleGestioneEtichette({ etichette, onClose, onAggiornate }) {
    const [modificando, setModificando] = useState(null)
    const [nomeMod, setNomeMod] = useState('')
    const [coloreMod, setColoreMod] = useState('')
    const [errore, setErrore] = useState('')

    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    function avviaModifica(t) {
        setModificando(t.id)
        setNomeMod(t.nome)
        setColoreMod(t.colore || PALETTE[0])
        setErrore('')
    }

    async function salvaModifica() {
        if (!nomeMod.trim()) return
        try {
            const { error } = await supabase
                .from('etichette')
                .update({ nome: nomeMod.trim(), colore: coloreMod })
                .eq('id', modificando)
            if (error) throw new Error(
                error.code === '23505'
                    ? 'Esiste già un\'etichetta con questo nome'
                    : error.message
            )
            setModificando(null)
            await onAggiornate()
        } catch (e) {
            setErrore(e.message)
        }
    }

    async function elimina(t) {
        if (!confirm(`Eliminare l'etichetta "${t.nome}"?\n\nLe ricerche taggate non verranno cancellate, perderanno solo questo tag.`)) return
        try {
            const { error } = await supabase
                .from('etichette')
                .delete()
                .eq('id', t.id)
            if (error) throw new Error(error.message)
            await onAggiornate()
        } catch (e) {
            setErrore(e.message)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate border border-white/10 w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <Tag size={14} className="text-oro" />
                        <p className="font-body text-sm font-medium text-nebbia">Gestisci etichette</p>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-2">
                    {etichette.length === 0 ? (
                        <p className="font-body text-sm text-nebbia/30 text-center py-6">
                            Nessuna etichetta da gestire
                        </p>
                    ) : etichette.map(t => modificando === t.id ? (
                        <div key={t.id} className="bg-petrolio border border-oro/30 p-3 space-y-3">
                            <input
                                value={nomeMod}
                                onChange={e => setNomeMod(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && salvaModifica()}
                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                            <div className="flex gap-1.5 flex-wrap">
                                {PALETTE.map(c => (
                                    <button key={c} onClick={() => setColoreMod(c)}
                                        className={`w-6 h-6 rounded-full ${coloreMod === c ? 'ring-1 ring-offset-1 ring-offset-slate ring-nebbia' : ''}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setModificando(null)}
                                    className="flex-1 px-3 py-1.5 border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors">
                                    Annulla
                                </button>
                                <button onClick={salvaModifica}
                                    className="flex-1 btn-primary text-xs justify-center">
                                    Salva
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div key={t.id} className="flex items-center justify-between gap-3 p-3 bg-petrolio border border-white/5 hover:border-white/10 transition-colors">
                            <Link
                                to={`/area/ricerche/${t.id}`}
                                className="flex items-center gap-2 flex-1 min-w-0 group"
                                onClick={onClose}
                            >
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.colore || '#7FA39A' }} />
                                <span className="font-body text-sm text-nebbia truncate group-hover:text-oro transition-colors">
                                    {t.nome}
                                </span>
                                <ChevronRight size={11} className="text-nebbia/30 group-hover:text-oro transition-colors shrink-0" />
                            </Link>
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => avviaModifica(t)}
                                    className="text-nebbia/30 hover:text-oro p-1 transition-colors">
                                    <Edit2 size={11} />
                                </button>
                                <button onClick={() => elimina(t)}
                                    className="text-nebbia/30 hover:text-red-400 p-1 transition-colors">
                                    <Trash2 size={11} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={13} /> {errore}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}