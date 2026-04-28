import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {
    Tag, Search, Loader2, BookOpen, Sparkles, Landmark, ScrollText,
    Trash2, X, ExternalLink, MessageSquare, ArrowLeft, AlertCircle, FolderOpen
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const TIPI = [
    { id: 'tutti', label: 'Tutti', icon: Tag },
    { id: 'ricerca_ai', label: 'Ricerche', icon: Sparkles },
    { id: 'norma', label: 'Norme', icon: BookOpen },
    { id: 'sentenza', label: 'Sentenze', icon: Landmark },
    { id: 'prassi', label: 'Prassi', icon: ScrollText },
]

// Tipi di "ricerca" che possono essere taggati
const TIPI_RICERCA = ['ricerca_ai', 'ricerca_manuale', 'chat_lex']

export default function EtichettaDettaglio() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { profile } = useAuth()

    // Path base role-aware
    const basePathRicerche = profile?.role === 'avvocato' ? '/ricerche' : '/area/ricerche'
    const basePathBancaDati = profile?.role === 'avvocato' ? '/banca-dati' : '/area'

    const [etichetta, setEtichetta] = useState(null)
    const [contenuti, setContenuti] = useState([])
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')

    const [tipoAttivo, setTipoAttivo] = useState('tutti')
    const [cerca, setCerca] = useState('')
    const [eliminando, setEliminando] = useState(null)
    const [contenutoAperto, setContenutoAperto] = useState(null)

    useEffect(() => { caricaTutto() }, [id])

    async function caricaTutto() {
        setLoading(true)
        setErrore('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { navigate('/login'); return }

            const { data: tag, error: errTag } = await supabase
                .from('etichette')
                .select('id, nome, colore, created_at, updated_at')
                .eq('id', id)
                .single()
            if (errTag) throw new Error(errTag.message)
            setEtichetta(tag)

            const { data: rels, error: errRels } = await supabase
                .from('elementi_etichette')
                .select('id, tipo, elemento_id, created_at')
                .eq('etichetta_id', id)
                .order('created_at', { ascending: false })
            if (errRels) throw new Error(errRels.message)

            const arricchiti = await Promise.all((rels ?? []).map(arricchisciContenuto))
            setContenuti(arricchiti.filter(Boolean))
        } catch (e) {
            setErrore(e.message)
        } finally {
            setLoading(false)
        }
    }

    async function arricchisciContenuto(rel) {
        try {
            if (TIPI_RICERCA.includes(rel.tipo)) {
                const { data } = await supabase
                    .from('ricerche')
                    .select('id, titolo, contenuto, metadati, tipo, created_at, pratica_id, pratica:pratica_id(id, titolo)')
                    .eq('id', rel.elemento_id)
                    .maybeSingle()
                return data ? { ...rel, dati: data, kindFiltro: 'ricerca_ai' } : null
            }

            if (rel.tipo === 'norma') {
                const { data } = await supabase
                    .from('norme')
                    .select('id, codice, articolo, rubrica, testo')
                    .eq('id', rel.elemento_id).maybeSingle()
                return data ? { ...rel, dati: data, kindFiltro: 'norma' } : null
            }

            if (rel.tipo === 'sentenza') {
                const [{ data: g }, { data: s }] = await Promise.all([
                    supabase.from('giurisprudenza')
                        .select('id, oggetto, organo, sezione, numero, anno, data_pubblicazione, principio_diritto, tipo_provvedimento')
                        .eq('id', rel.elemento_id).maybeSingle(),
                    supabase.from('sentenze')
                        .select('id, oggetto, organo, sezione, numero, anno, data_pubblicazione, principio_diritto, tipo_provvedimento')
                        .eq('id', rel.elemento_id).maybeSingle(),
                ])
                const dati = g ?? s
                return dati ? { ...rel, dati, fonte_sentenza: g ? 'lexum' : 'avvocato', kindFiltro: 'sentenza' } : null
            }

            if (rel.tipo === 'prassi') {
                const { data } = await supabase
                    .from('prassi')
                    .select('id, fonte, numero, anno, oggetto, sintesi, data_pubblicazione')
                    .eq('id', rel.elemento_id).maybeSingle()
                return data ? { ...rel, dati: data, kindFiltro: 'prassi' } : null
            }
            return null
        } catch (e) {
            return null
        }
    }

    async function rimuoviContenuto(rel) {
        if (!confirm('Rimuovere questo elemento dall\'etichetta?\n\nL\'elemento originale (ricerca, sentenza, norma, prassi) non viene cancellato.')) return
        setEliminando(rel.id)
        try {
            const { error } = await supabase
                .from('elementi_etichette')
                .delete()
                .eq('id', rel.id)
            if (error) throw new Error(error.message)
            setContenuti(prev => prev.filter(c => c.id !== rel.id))
        } catch (e) {
            setErrore(e.message)
        } finally {
            setEliminando(null)
        }
    }

    const contenutiFiltrati = contenuti.filter(c => {
        if (tipoAttivo !== 'tutti' && c.kindFiltro !== tipoAttivo) return false
        if (!cerca.trim()) return true
        const q = cerca.toLowerCase()
        if (TIPI_RICERCA.includes(c.tipo)) {
            return ((c.dati.titolo ?? '') + ' ' + (c.dati.contenuto ?? '')).toLowerCase().includes(q)
        }
        if (c.tipo === 'norma') {
            return (`${c.dati.articolo} ${c.dati.rubrica ?? ''} ${c.dati.testo ?? ''}`).toLowerCase().includes(q)
        }
        if (c.tipo === 'sentenza') {
            return (`${c.dati.oggetto ?? ''} ${c.dati.principio_diritto ?? ''} ${c.dati.organo ?? ''}`).toLowerCase().includes(q)
        }
        if (c.tipo === 'prassi') {
            return (`${c.dati.oggetto ?? ''} ${c.dati.sintesi ?? ''}`).toLowerCase().includes(q)
        }
        return false
    })

    const conteggiPerTipo = {
        tutti: contenuti.length,
        ricerca_ai: contenuti.filter(c => c.kindFiltro === 'ricerca_ai').length,
        norma: contenuti.filter(c => c.kindFiltro === 'norma').length,
        sentenza: contenuti.filter(c => c.kindFiltro === 'sentenza').length,
        prassi: contenuti.filter(c => c.kindFiltro === 'prassi').length,
    }

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <Loader2 size={20} className="animate-spin text-oro" />
        </div>
    )

    if (errore) return (
        <div className="space-y-5">
            <Link to={basePathRicerche} className="inline-flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                <ArrowLeft size={11} /> Tutte le ricerche
            </Link>
            <div className="bg-slate border border-red-500/20 p-8 text-center">
                <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
                <p className="font-body text-sm text-red-400">{errore}</p>
            </div>
        </div>
    )

    if (!etichetta) return null

    return (
        <div className="space-y-5 px-6 pt-2 pb-6">

            <Link to={basePathRicerche} className="inline-flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                <ArrowLeft size={11} /> Tutte le ricerche
            </Link>

            {/* Header etichetta — Etichetta + nome inline */}
            <div className="flex items-center gap-3 min-w-0 flex-wrap">
                <div className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: etichetta.colore || '#7FA39A' }} />
                <p className="section-label !m-0">Etichetta</p>
                <h1 className="font-display text-3xl font-light text-nebbia leading-none">{etichetta.nome}</h1>
                <p className="font-body text-xs text-nebbia/30">
                    · {contenuti.length} {contenuti.length === 1 ? 'elemento' : 'elementi'} · creata il {new Date(etichetta.created_at).toLocaleDateString('it-IT')}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Contenuti */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                        <input
                            placeholder="Cerca dentro questa etichetta..."
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
                        {TIPI.map(({ id: tid, label, icon: Icon }) => {
                            const isActive = tipoAttivo === tid
                            const count = conteggiPerTipo[tid]
                            return (
                                <button
                                    key={tid}
                                    onClick={() => setTipoAttivo(tid)}
                                    className={`flex items-center gap-2 px-3 py-1.5 font-body text-xs transition-colors whitespace-nowrap ${isActive ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'
                                        }`}
                                >
                                    <Icon size={11} />
                                    <span>{label}</span>
                                    {count > 0 && (
                                        <span className={`text-[10px] ${isActive ? 'text-oro/60' : 'text-nebbia/30'}`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* Lista */}
                    {contenutiFiltrati.length === 0 ? (
                        <div className="bg-slate border border-white/5 py-12 text-center">
                            <Tag size={28} className="text-nebbia/15 mx-auto mb-3" />
                            <p className="font-body text-sm text-nebbia/30">
                                {contenuti.length === 0
                                    ? 'Nessun contenuto in questa etichetta ancora'
                                    : 'Nessun risultato per questi filtri'}
                            </p>
                            {contenuti.length === 0 && (
                                <p className="font-body text-xs text-nebbia/20 mt-2 max-w-sm mx-auto leading-relaxed">
                                    Per aggiungere contenuti, vai nella banca dati e clicca "Aggiungi a etichetta" su sentenze, norme o prassi. Puoi anche taggare le tue ricerche dalla pagina Ricerche.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {contenutiFiltrati.map(c => (
                                <CardContenuto
                                    key={c.id}
                                    contenuto={c}
                                    onRimuovi={() => rimuoviContenuto(c)}
                                    eliminando={eliminando === c.id}
                                    aperto={contenutoAperto === c.id}
                                    onToggleApri={() => setContenutoAperto(contenutoAperto === c.id ? null : c.id)}
                                    basePathBancaDati={basePathBancaDati}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar — chat etichetta (futura) */}
                <div className="lg:col-span-1">
                    <div className="bg-slate border border-white/5 sticky top-6">
                        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                            <MessageSquare size={13} className="text-salvia/60" />
                            <p className="font-body text-sm font-medium text-nebbia">Chat etichetta</p>
                            <span className="ml-auto font-body text-[10px] text-nebbia/30 border border-white/10 px-1.5 py-0.5">
                                In arrivo
                            </span>
                        </div>
                        <div className="p-6 text-center space-y-3">
                            <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                                Presto potrai chattare con Lex usando come contesto i contenuti di questa etichetta.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// CARD CONTENUTO
// ═══════════════════════════════════════════════════════════════
function CardContenuto({ contenuto: c, onRimuovi, eliminando, aperto, onToggleApri, basePathBancaDati }) {

    // ── RICERCA (ai/manuale/chat_lex) ──
    if (TIPI_RICERCA.includes(c.tipo)) {
        const Icon = c.tipo === 'chat_lex' ? MessageSquare : c.tipo === 'ricerca_manuale' ? Search : Sparkles
        const colorIcon = c.tipo === 'ricerca_manuale' ? 'text-oro' : 'text-salvia'
        const tipoLabel = c.tipo === 'ricerca_ai' ? 'Ricerca AI'
            : c.tipo === 'chat_lex' ? 'Chat con Lex'
                : 'Ricerca manuale'

        return (
            <div className="bg-slate border border-white/5 hover:border-salvia/20 transition-colors">
                <div className="p-4 flex items-start gap-3">
                    <Icon size={14} className={`${colorIcon}/70 shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium text-nebbia leading-snug">
                            {c.dati.titolo ?? tipoLabel}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap mt-1">
                            <span className="font-body text-[10px] text-nebbia/40 uppercase tracking-wider">{tipoLabel}</span>
                            {c.dati.pratica && (
                                <Link to={`/pratiche/${c.dati.pratica.id}`}
                                    className="flex items-center gap-1 font-body text-xs text-nebbia/60 hover:text-oro transition-colors">
                                    <FolderOpen size={10} /> {c.dati.pratica.titolo}
                                </Link>
                            )}
                        </div>
                        {!aperto && (
                            <p className="font-body text-xs text-nebbia/40 mt-1 line-clamp-2">
                                {c.dati.contenuto?.replace(/[#*_`]/g, '').slice(0, 200)}
                            </p>
                        )}
                        <p className="font-body text-[10px] text-nebbia/25 mt-2">
                            {new Date(c.dati.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button onClick={onToggleApri}
                            className="font-body text-xs text-nebbia/30 hover:text-oro px-2 py-1 transition-colors">
                            {aperto ? 'Chiudi' : 'Apri'}
                        </button>
                        <button onClick={onRimuovi} disabled={eliminando}
                            className="text-nebbia/25 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                            title="Rimuovi tag">
                            {eliminando ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                    </div>
                </div>
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
                                {c.dati.contenuto}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // ── NORMA ──
    if (c.tipo === 'norma') {
        return (
            <Link to={`${basePathBancaDati}/norma/${c.dati.id}`}
                className="block bg-slate border border-white/5 hover:border-oro/20 transition-colors p-4 group">
                <div className="flex items-start gap-3">
                    <BookOpen size={14} className="text-oro/70 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-body text-xs text-oro font-medium">
                                {c.dati.codice?.toUpperCase()} · {c.dati.articolo}
                            </span>
                        </div>
                        {c.dati.rubrica && (
                            <p className="font-body text-sm text-nebbia/70 group-hover:text-oro transition-colors leading-snug">
                                {c.dati.rubrica}
                            </p>
                        )}
                        {c.dati.testo && (
                            <p className="font-body text-xs text-nebbia/40 mt-1 line-clamp-2 leading-relaxed">
                                {c.dati.testo.slice(0, 200)}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <ExternalLink size={11} className="text-nebbia/20 group-hover:text-oro transition-colors" />
                        <button onClick={(e) => { e.preventDefault(); onRimuovi() }} disabled={eliminando}
                            className="text-nebbia/25 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                            title="Rimuovi tag">
                            {eliminando ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                    </div>
                </div>
            </Link>
        )
    }

    // ── SENTENZA ──
    if (c.tipo === 'sentenza') {
        const link = c.fonte_sentenza === 'lexum'
            ? `${basePathBancaDati}/lexum/${c.dati.id}`
            : `${basePathBancaDati}/avvocato/${c.dati.id}`
        const titolo = [c.dati.organo, c.dati.sezione, c.dati.numero && `n. ${c.dati.numero}`, c.dati.anno].filter(Boolean).join(' · ')
        return (
            <Link to={link}
                className="block bg-slate border border-white/5 hover:border-oro/20 transition-colors p-4 group">
                <div className="flex items-start gap-3">
                    <Landmark size={14} className="text-oro/70 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-nebbia/50 mb-1">{titolo}</p>
                        <p className="font-body text-sm font-medium text-nebbia group-hover:text-oro transition-colors leading-snug">
                            {c.dati.oggetto ?? 'Sentenza'}
                        </p>
                        {c.dati.principio_diritto && (
                            <p className="font-body text-xs text-nebbia/40 mt-1 line-clamp-2 leading-relaxed">
                                {c.dati.principio_diritto}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <ExternalLink size={11} className="text-nebbia/20 group-hover:text-oro transition-colors" />
                        <button onClick={(e) => { e.preventDefault(); onRimuovi() }} disabled={eliminando}
                            className="text-nebbia/25 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                            title="Rimuovi tag">
                            {eliminando ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                    </div>
                </div>
            </Link>
        )
    }

    // ── PRASSI ──
    if (c.tipo === 'prassi') {
        return (
            <Link to={`${basePathBancaDati}/prassi/${c.dati.id}`}
                className="block bg-slate border border-white/5 hover:border-salvia/20 transition-colors p-4 group">
                <div className="flex items-start gap-3">
                    <ScrollText size={14} className="text-salvia/70 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-nebbia/50 mb-1">
                            {c.dati.fonte} {c.dati.numero && `· n. ${c.dati.numero}`} {c.dati.anno && `· ${c.dati.anno}`}
                        </p>
                        <p className="font-body text-sm font-medium text-nebbia group-hover:text-salvia transition-colors leading-snug">
                            {c.dati.oggetto ?? 'Prassi'}
                        </p>
                        {c.dati.sintesi && (
                            <p className="font-body text-xs text-nebbia/40 mt-1 line-clamp-2 leading-relaxed">
                                {c.dati.sintesi}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <ExternalLink size={11} className="text-nebbia/20 group-hover:text-salvia transition-colors" />
                        <button onClick={(e) => { e.preventDefault(); onRimuovi() }} disabled={eliminando}
                            className="text-nebbia/25 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                            title="Rimuovi tag">
                            {eliminando ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                    </div>
                </div>
            </Link>
        )
    }

    return null
}