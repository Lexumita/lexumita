import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import ReactMarkdown from 'react-markdown'
import AggiungiAEtichetta from '@/components/AggiungiAEtichetta'
import {
    Sparkles, Search, Plus, X, Loader2, AlertCircle, Check, Save,
    Tag, Edit2, Trash2, Filter, FolderOpen, MessageSquare,
    AlertTriangle, ChevronRight, GitCompare, Square, CheckSquare,
    BookOpen, Landmark, ScrollText, ExternalLink,
} from 'lucide-react'

const PALETTE = [
    '#C9A45C', '#7FA39A', '#8B7BB8', '#D49B6F',
    '#6FA3D4', '#D47F7F', '#8FB979', '#B57FD4',
]

const TIPI_RICERCA = ['ricerca_ai', 'ricerca_manuale', 'chat_lex']

const FILTRO_TIPI = [
    { id: 'tutti', label: 'Tutti' },
    { id: 'ricerca_ai', label: 'Ricerche AI' },
    { id: 'ricerca_manuale', label: 'Ricerche manuali' },
    { id: 'chat_lex', label: 'Chat con Lex' },
    { id: 'norma', label: 'Norme' },
    { id: 'sentenza', label: 'Sentenze' },
    { id: 'prassi', label: 'Prassi' },
]

const LIMITE_ORFANE = 20
const SOGLIA_AVVISO = 15
const MAX_CONFRONTO = 3

function coloreCasuale() {
    return PALETTE[Math.floor(Math.random() * PALETTE.length)]
}

function evidenziaParola(testo, cerca) {
    if (!cerca?.trim() || !testo) return testo ?? ''
    const escaped = cerca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    return testo.replace(regex, '<mark class="bg-oro/30 text-nebbia rounded px-0.5">$1</mark>')
}

function evidenziaParoleMultiple(testo, parole, classe = 'bg-salvia/30') {
    if (!parole?.length || !testo) return testo ?? ''
    let risultato = testo
    // Ordina dalle più lunghe alle più corte per evitare match parziali
    const ordinate = [...parole].sort((a, b) => b.length - a.length)
    for (const parola of ordinate) {
        if (!parola?.trim()) continue
        const escaped = parola.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`(${escaped})`, 'gi')
        risultato = risultato.replace(regex, `<mark class="${classe} text-nebbia rounded px-0.5">$1</mark>`)
    }
    return risultato
}

function chiaveElemento(el) {
    return `${el.kind}:${el.id}`
}

function corpusElemento(el) {
    if (TIPI_RICERCA.includes(el.kind)) {
        return `${el.titolo ?? ''} ${el.contenuto ?? ''}`.toLowerCase()
    }
    if (el.kind === 'norma') {
        return `${el.codice ?? ''} ${el.articolo ?? ''} ${el.rubrica ?? ''} ${el.testo ?? ''}`.toLowerCase()
    }
    if (el.kind === 'sentenza') {
        return `${el.organo ?? ''} ${el.oggetto ?? ''} ${el.principio_diritto ?? ''}`.toLowerCase()
    }
    if (el.kind === 'prassi') {
        return `${el.fonte ?? ''} ${el.oggetto ?? ''} ${el.sintesi ?? ''}`.toLowerCase()
    }
    return ''
}

export default function Ricerche() {
    const { profile } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()

    const basePathEtichette = profile?.role === 'avvocato' ? '/etichette' : '/area/etichette'
    const basePathBancaDati = profile?.role === 'avvocato' ? '/banca-dati' : '/area'

    const [elementi, setElementi] = useState([])
    const [etichette, setEtichette] = useState([])
    const [pratiche, setPratiche] = useState([])
    const [tagsByElemento, setTagsByElemento] = useState({})
    const [loading, setLoading] = useState(true)

    const [cerca, setCerca] = useState('')
    const [cercaApplicata, setCercaApplicata] = useState('')
    const [tipoAttivo, setTipoAttivo] = useState('tutti')
    const [praticaSelezionata, setPraticaSelezionata] = useState(searchParams.get('pratica') ?? '')

    const [contenutoAperto, setContenutoAperto] = useState(null)
    const [mostraGestioneEtichette, setMostraGestioneEtichette] = useState(false)
    const [mostraNuovaRicerca, setMostraNuovaRicerca] = useState(false)
    const [mostraNuovaEtichetta, setMostraNuovaEtichetta] = useState(false)
    const [errore, setErrore] = useState('')

    const [modalitaSelezione, setModalitaSelezione] = useState(false)
    const [selezionate, setSelezionate] = useState([])
    const [vistaConfronto, setVistaConfronto] = useState(false)

    const [cercandoLex, setCercandoLex] = useState(false)
    const [risultatiLexChiavi, setRisultatiLexChiavi] = useState(null)
    const [paroleChiaveLex, setParoleChiaveLex] = useState([])
    const [rateLimitInfo, setRateLimitInfo] = useState({ rimasti: 30, limite: 30 })
    const [erroreLex, setErroreLex] = useState('')

    const [conteggioOrfane, setConteggioOrfane] = useState(0)

    useEffect(() => { caricaTutto() }, [])
    useEffect(() => { caricaRateLimit() }, [])

    async function caricaRateLimit() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from('lex_search_rate_limit')
                .select('data_giorno, conteggio')
                .eq('user_id', user.id)
                .maybeSingle()

            const oggi = new Date().toISOString().slice(0, 10)
            if (!data || data.data_giorno !== oggi) {
                setRateLimitInfo({ rimasti: 30, limite: 30 })
            } else {
                setRateLimitInfo({
                    rimasti: Math.max(0, 30 - data.conteggio),
                    limite: 30
                })
            }
        } catch {
            // silenzioso, defaulta a 30
        }
    }

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
                { data: relAll },
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
                supabase
                    .from('elementi_etichette')
                    .select('elemento_id, etichetta_id, tipo'),
            ])

            setEtichette(e ?? [])
            setPratiche(p ?? [])

            const idsPerTipo = { norma: [], sentenza: [], prassi: [] }
            for (const rel of relAll ?? []) {
                if (idsPerTipo[rel.tipo]) idsPerTipo[rel.tipo].push(rel.elemento_id)
            }
            for (const k of Object.keys(idsPerTipo)) {
                idsPerTipo[k] = [...new Set(idsPerTipo[k])]
            }

            const [normeRes, giurRes, sentRes, prassiRes] = await Promise.all([
                idsPerTipo.norma.length > 0
                    ? supabase.from('norme')
                        .select('id, codice, articolo, rubrica, testo')
                        .in('id', idsPerTipo.norma)
                    : Promise.resolve({ data: [] }),
                idsPerTipo.sentenza.length > 0
                    ? supabase.from('giurisprudenza')
                        .select('id, organo, sezione, numero, anno, oggetto, principio_diritto, tipo_provvedimento, data_pubblicazione')
                        .in('id', idsPerTipo.sentenza)
                    : Promise.resolve({ data: [] }),
                idsPerTipo.sentenza.length > 0
                    ? supabase.from('sentenze')
                        .select('id, organo, sezione, numero, anno, oggetto, principio_diritto, tipo_provvedimento, data_pubblicazione')
                        .in('id', idsPerTipo.sentenza)
                    : Promise.resolve({ data: [] }),
                idsPerTipo.prassi.length > 0
                    ? supabase.from('prassi')
                        .select('id, fonte, numero, anno, oggetto, sintesi, data_pubblicazione')
                        .in('id', idsPerTipo.prassi)
                    : Promise.resolve({ data: [] }),
            ])

            const elementiUnificati = []

            for (const ric of r ?? []) {
                elementiUnificati.push({
                    kind: ric.tipo,
                    id: ric.id,
                    titolo: ric.titolo,
                    contenuto: ric.contenuto,
                    metadati: ric.metadati,
                    pratica_id: ric.pratica_id,
                    pratica: ric.pratica,
                    autore: ric.autore,
                    created_at: ric.created_at,
                })
            }
            for (const n of normeRes.data ?? []) {
                elementiUnificati.push({
                    kind: 'norma',
                    id: n.id,
                    codice: n.codice,
                    articolo: n.articolo,
                    rubrica: n.rubrica,
                    testo: n.testo,
                    created_at: null,
                })
            }
            for (const s of giurRes.data ?? []) {
                elementiUnificati.push({
                    kind: 'sentenza',
                    fonte_sentenza: 'lexum',
                    id: s.id,
                    organo: s.organo,
                    sezione: s.sezione,
                    numero: s.numero,
                    anno: s.anno,
                    oggetto: s.oggetto,
                    principio_diritto: s.principio_diritto,
                    tipo_provvedimento: s.tipo_provvedimento,
                    created_at: s.data_pubblicazione,
                })
            }
            for (const s of sentRes.data ?? []) {
                if (!elementiUnificati.find(x => x.kind === 'sentenza' && x.id === s.id)) {
                    elementiUnificati.push({
                        kind: 'sentenza',
                        fonte_sentenza: 'avvocato',
                        id: s.id,
                        organo: s.organo,
                        sezione: s.sezione,
                        numero: s.numero,
                        anno: s.anno,
                        oggetto: s.oggetto,
                        principio_diritto: s.principio_diritto,
                        tipo_provvedimento: s.tipo_provvedimento,
                        created_at: s.data_pubblicazione,
                    })
                }
            }
            for (const pr of prassiRes.data ?? []) {
                elementiUnificati.push({
                    kind: 'prassi',
                    id: pr.id,
                    fonte: pr.fonte,
                    numero: pr.numero,
                    anno: pr.anno,
                    oggetto: pr.oggetto,
                    sintesi: pr.sintesi,
                    created_at: pr.data_pubblicazione,
                })
            }

            elementiUnificati.sort((a, b) => {
                if (!a.created_at && !b.created_at) return 0
                if (!a.created_at) return 1
                if (!b.created_at) return -1
                return new Date(b.created_at) - new Date(a.created_at)
            })

            setElementi(elementiUnificati)

            const map = {}
            for (const rel of relAll ?? []) {
                const k = `${rel.tipo}:${rel.elemento_id}`
                if (!map[k]) map[k] = []
                map[k].push(rel.etichetta_id)
            }
            setTagsByElemento(map)

            const tagSet = new Set(
                Object.keys(map).filter(k => TIPI_RICERCA.some(t => k.startsWith(t + ':')))
                    .map(k => k.split(':')[1])
            )
            const orfane = (r ?? []).filter(x => !x.pratica_id && !tagSet.has(x.id)).length
            setConteggioOrfane(orfane)
        } catch (e) {
            setErrore(e.message)
        } finally {
            setLoading(false)
        }
    }

    const elementiFiltrati = useMemo(() => {
        let base = elementi

        if (risultatiLexChiavi !== null) {
            const setKeys = new Set(risultatiLexChiavi)
            base = elementi
                .filter(el => setKeys.has(chiaveElemento(el)))
                .sort((a, b) =>
                    risultatiLexChiavi.indexOf(chiaveElemento(a)) - risultatiLexChiavi.indexOf(chiaveElemento(b))
                )
        }

        return base.filter(el => {
            if (tipoAttivo !== 'tutti' && el.kind !== tipoAttivo) return false
            if (praticaSelezionata) {
                if (!TIPI_RICERCA.includes(el.kind)) return false
                if (el.pratica_id !== praticaSelezionata) return false
            }
            // Quando Lex ha filtrato, NON applichiamo anche il match letterale
            // (Lex ha già selezionato semanticamente). La barra di ricerca rimane visibile
            // per consentire di iniziare una nuova ricerca, ma il filtraggio letterale
            // si attiva solo se Lex non è attivo E l'utente ha cliccato "Cerca".
            if (risultatiLexChiavi === null && cercaApplicata.trim()) {
                if (!corpusElemento(el).includes(cercaApplicata.toLowerCase())) return false
            }
            return true
        })
    }, [elementi, tipoAttivo, praticaSelezionata, cercaApplicata, tagsByElemento, risultatiLexChiavi])

    useEffect(() => {
        const params = {}
        if (praticaSelezionata) params.pratica = praticaSelezionata
        setSearchParams(params, { replace: true })
    }, [praticaSelezionata])

    function azzeraFiltri() {
        setTipoAttivo('tutti')
        setPraticaSelezionata('')
        setCerca('')
        setCercaApplicata('')
        azzeraRicercaLex()
    }

    function applicaCercaTradizionale() {
        // Click esplicito su "Cerca" → applica il testo corrente al filtro
        setCercaApplicata(cerca)
        // Se Lex era attivo, lo azzera (mutuo esclusione)
        if (risultatiLexChiavi !== null) azzeraRicercaLex()
    }

    function azzeraRicercaLex() {
        setRisultatiLexChiavi(null)
        setParoleChiaveLex([])
        setErroreLex('')
    }

    function cercaConLexDallaBarra() {
        if (!cerca.trim()) return
        if (rateLimitInfo.rimasti <= 0) return
        if (elementi.length > 100) return
        cercaConLexConValore(cerca)
    }

    async function cercaConLexConValore(query) {
        if (!query.trim()) return
        if (rateLimitInfo.rimasti <= 0) return

        setCercandoLex(true)
        setErroreLex('')
        setRisultatiLexChiavi(null)
        setParoleChiaveLex([])
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lex-search-pensiero`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query,
                        elementi: elementi.map(el => ({
                            key: chiaveElemento(el),
                            kind: el.kind,
                            estratto: corpusElemento(el).slice(0, 1500),
                        })),
                    }),
                }
            )

            const json = await res.json()

            if (res.status === 429) {
                setErroreLex(json.error ?? 'Limite giornaliero raggiunto')
                if (json.limite) {
                    setRateLimitInfo({ rimasti: 0, limite: json.limite })
                }
                return
            }

            if (res.status === 400 && json.troppo_grande) {
                setErroreLex(json.error)
                return
            }

            if (!res.ok) throw new Error(json.error ?? `Errore ${res.status}`)

            setRisultatiLexChiavi(json.keys ?? [])
            setParoleChiaveLex(json.parole_chiave ?? [])
            if (json.rate_limit) {
                setRateLimitInfo({
                    rimasti: json.rate_limit.rimasti,
                    limite: json.rate_limit.limite
                })
            }
        } catch (e) {
            console.error('Errore ricerca Lex:', e)
            setErroreLex(e.message ?? 'Errore durante la ricerca')
            setRisultatiLexChiavi([])
        } finally {
            setCercandoLex(false)
        }
    }

    function avviaSelezione() {
        setModalitaSelezione(true)
        setSelezionate([])
    }

    function annullaSelezione() {
        setModalitaSelezione(false)
        setSelezionate([])
        setVistaConfronto(false)
    }

    function toggleSelezione(key) {
        setSelezionate(prev => {
            if (prev.includes(key)) return prev.filter(x => x !== key)
            if (prev.length >= MAX_CONFRONTO) return prev
            return [...prev, key]
        })
    }

    function avviaConfronto() {
        if (selezionate.length < 2) return
        setVistaConfronto(true)
    }

    const elementiSelezionati = useMemo(
        () => selezionate
            .map(key => elementi.find(el => chiaveElemento(el) === key))
            .filter(Boolean),
        [selezionate, elementi]
    )

    const haFiltriAttivi = tipoAttivo !== 'tutti' || praticaSelezionata || cerca

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <Loader2 size={20} className="animate-spin text-oro" />
        </div>
    )

    return (
        <div className="space-y-5 pb-24">

            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <p className="section-label mb-2">Le mie ricerche legali</p>
                    <h1 className="font-display text-4xl font-light text-nebbia">Ricerche</h1>
                    <p className="font-body text-sm text-nebbia/40 mt-1">
                        Tutto quello che hai pensato, ricercato e taggato — ricerche, norme, sentenze e prassi.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {vistaConfronto && (
                        <>
                            <div className="flex items-center gap-2 px-3 py-2 border border-salvia/20 bg-salvia/5">
                                <GitCompare size={13} className="text-salvia" />
                                <p className="font-body text-sm">
                                    <span className="font-medium text-salvia">Confronto</span>
                                    <span className="text-nebbia/50"> · {elementiSelezionati.length} elementi</span>
                                </p>
                            </div>
                            <button
                                onClick={annullaSelezione}
                                className="flex items-center gap-1.5 px-3 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-colors font-body text-sm"
                            >
                                <X size={13} /> Chiudi confronto
                            </button>
                        </>
                    )}

                    {modalitaSelezione && !vistaConfronto && (
                        <>
                            <div className="flex items-center gap-2 px-3 py-2 border border-salvia/20 bg-salvia/5">
                                <GitCompare size={13} className="text-salvia" />
                                <p className="font-body text-sm">
                                    <span className="font-medium text-salvia">{selezionate.length}</span>
                                    <span className="text-nebbia/50"> / {MAX_CONFRONTO} selezionati</span>
                                </p>
                            </div>
                            <button
                                onClick={annullaSelezione}
                                className="px-4 py-2 border border-white/10 text-nebbia/50 font-body text-sm hover:text-nebbia transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={avviaConfronto}
                                disabled={selezionate.length < 2}
                                className="flex items-center gap-2 px-4 py-2 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <GitCompare size={13} /> Confronta affiancati
                            </button>
                        </>
                    )}

                    {!modalitaSelezione && !vistaConfronto && (
                        <>
                            {elementi.length >= 2 && (
                                <button
                                    onClick={avviaSelezione}
                                    className="flex items-center gap-2 px-4 py-2 border border-white/10 text-nebbia/70 hover:border-salvia/40 hover:text-salvia font-body text-sm transition-colors"
                                >
                                    <GitCompare size={13} /> Confronta
                                </button>
                            )}
                            <button
                                onClick={() => setMostraNuovaRicerca(true)}
                                className="btn-primary text-sm"
                            >
                                <Plus size={14} /> Nuova ricerca
                            </button>
                        </>
                    )}
                </div>
            </div>

            {conteggioOrfane >= SOGLIA_AVVISO && !vistaConfronto && (
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
                            Quando superi il limite, le orfane più vecchie vengono <strong>eliminate automaticamente</strong>.
                            Salva una ricerca dentro una pratica o assegnale almeno un'etichetta per proteggerla.
                        </p>
                    </div>
                </div>
            )}

            {vistaConfronto ? (
                <PannelloConfronto
                    elementi={elementiSelezionati}
                    etichette={etichette}
                    pratiche={pratiche}
                    basePathBancaDati={basePathBancaDati}
                    onChiudi={annullaSelezione}
                    onSintesiSalvata={async () => {
                        await caricaTutto()
                        annullaSelezione()
                    }}
                />
            ) : (
                <>
                    <div className="bg-slate border border-white/5 p-4 space-y-3">
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            Cerca tra le tue ricerche, norme, sentenze e prassi. Usa la ricerca tradizionale per parole chiave letterali, o Lex per query in linguaggio naturale.
                        </p>

                        <div className="flex items-stretch gap-2">
                            <div className="relative flex-1">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Cerca tra le tue ricerche, norme, sentenze, prassi..."
                                    value={cerca}
                                    onChange={e => {
                                        const v = e.target.value
                                        setCerca(v)
                                        if (v.trim() === '') {
                                            setCercaApplicata('')
                                            if (risultatiLexChiavi !== null) azzeraRicercaLex()
                                        } else if (risultatiLexChiavi !== null) {
                                            azzeraRicercaLex()
                                        }
                                    }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                            cercaConLexDallaBarra()
                                        } else if (e.key === 'Enter') {
                                            e.preventDefault()
                                            if (cerca.trim()) applicaCercaTradizionale()
                                        }
                                    }}
                                    className="w-full h-[38px] bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-9 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                />
                                {cerca && (
                                    <button
                                        onClick={() => { setCerca(''); setCercaApplicata(''); azzeraRicercaLex() }}
                                        className="absolute top-1/2 -translate-y-1/2 right-2 text-nebbia/30 hover:text-nebbia p-1"
                                        title="Svuota"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={applicaCercaTradizionale}
                                disabled={!cerca.trim() || cerca === cercaApplicata}
                                className="flex items-center justify-center gap-2 px-4 h-[38px] bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                title="Cerca per parole chiave letterali (Invio)"
                            >
                                <Search size={13} /> Cerca
                            </button>

                            <button
                                onClick={cercaConLexDallaBarra}
                                disabled={cercandoLex || !cerca.trim() || rateLimitInfo.rimasti <= 0 || elementi.length > 100}
                                className="flex items-center justify-center gap-2 px-4 h-[38px] bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                title={rateLimitInfo.rimasti <= 0
                                    ? 'Limite giornaliero raggiunto'
                                    : elementi.length > 100
                                        ? 'Troppi elementi: filtra prima per tipo o pratica (max 100)'
                                        : 'Ricerca semantica (Cmd/Ctrl+Invio)'}
                            >
                                {cercandoLex
                                    ? <><Loader2 size={13} className="animate-spin" /> <span className="hidden md:inline">Lex sta cercando...</span></>
                                    : <>
                                        <Sparkles size={13} />
                                        <span className="hidden md:inline">Cerca con Lex</span>
                                        <span className="md:hidden">Lex</span>
                                        <span className="hidden lg:inline text-[10px] text-salvia/60 font-normal ml-1">
                                            ({rateLimitInfo.rimasti}/{rateLimitInfo.limite})
                                        </span>
                                    </>
                                }
                            </button>
                        </div>

                        {elementi.length > 100 && (
                            <p className="font-body text-xs text-amber-400/80 flex items-center gap-1.5">
                                <AlertCircle size={11} />
                                Hai {elementi.length} elementi. Per usare Lex, restringi prima per tipo o pratica (max 100).
                            </p>
                        )}

                        {erroreLex && (
                            <p className="font-body text-xs text-red-400 flex items-center gap-1.5">
                                <AlertCircle size={11} /> {erroreLex}
                            </p>
                        )}

                        {risultatiLexChiavi !== null && (
                            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-salvia/5 border border-salvia/20">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Sparkles size={12} className="text-salvia shrink-0" />
                                    <p className="font-body text-xs text-salvia">
                                        Lex ha trovato <strong>{risultatiLexChiavi.length}</strong> {risultatiLexChiavi.length === 1 ? 'elemento' : 'elementi'}
                                    </p>
                                </div>
                                <button
                                    onClick={azzeraRicercaLex}
                                    className="flex items-center gap-1 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors shrink-0"
                                >
                                    <X size={11} /> Azzera Lex
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-start gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Filter size={12} className="text-nebbia/30" />
                            <select
                                value={tipoAttivo}
                                onChange={e => setTipoAttivo(e.target.value)}
                                className="bg-slate border border-white/10 text-nebbia font-body text-xs px-3 py-1.5 outline-none focus:border-oro/50"
                            >
                                {FILTRO_TIPI.map(t => {
                                    const count = t.id === 'tutti'
                                        ? elementi.length
                                        : elementi.filter(el => el.kind === t.id).length
                                    return (
                                        <option key={t.id} value={t.id}>
                                            {t.label} ({count})
                                        </option>
                                    )
                                })}
                            </select>
                        </div>

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

                        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                            <Tag size={14} className="text-nebbia/30" />
                            {etichette.map(e => (
                                <button
                                    key={e.id}
                                    type="button"
                                    onClick={() => navigate(`${basePathEtichette}/${e.id}`)}
                                    className="flex items-center gap-2 px-3 py-1.5 font-body text-sm font-medium border transition-all hover:opacity-80"
                                    style={{
                                        borderColor: `${e.colore}80`,
                                        color: e.colore,
                                        backgroundColor: `${e.colore}22`,
                                    }}
                                    title={`Apri etichetta "${e.nome}"`}
                                >
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.colore || '#7FA39A' }} />
                                    {e.nome}
                                </button>
                            ))}
                            <button
                                onClick={() => setMostraNuovaEtichetta(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 font-body text-sm text-oro border border-oro/30 hover:bg-oro/10 transition-colors"
                            >
                                <Plus size={12} /> Etichetta
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

                        {haFiltriAttivi && (
                            <button
                                onClick={azzeraFiltri}
                                className="flex items-center gap-1 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors"
                            >
                                <X size={10} /> Azzera
                            </button>
                        )}
                    </div>

                    {elementiFiltrati.length === 0 ? (
                        <div className="bg-slate border border-white/5 py-16 text-center">
                            <Sparkles size={32} className="text-nebbia/15 mx-auto mb-3" />
                            <p className="font-body text-sm text-nebbia/30 mb-2">
                                {elementi.length === 0 ? 'Nessun elemento ancora' : 'Nessun risultato'}
                            </p>
                            <p className="font-body text-xs text-nebbia/20 max-w-md mx-auto leading-relaxed">
                                {elementi.length === 0
                                    ? 'Le ricerche AI, manuali, chat e gli articoli/sentenze/prassi che taggherai compariranno qui.'
                                    : 'Prova a cambiare i filtri o a cercare con parole diverse.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
                            {elementiFiltrati.map(el => {
                                const key = chiaveElemento(el)
                                return (
                                    <CardElemento
                                        key={key}
                                        elemento={el}
                                        chiave={key}
                                        etichetteElemento={
                                            (tagsByElemento[key] ?? [])
                                                .map(eid => etichette.find(e => e.id === eid))
                                                .filter(Boolean)
                                        }
                                        etichetteDisponibili={etichette}
                                        aperto={contenutoAperto === key}
                                        onToggleApri={() => setContenutoAperto(contenutoAperto === key ? null : key)}
                                        onAggiornata={caricaTutto}
                                        modalitaSelezione={modalitaSelezione}
                                        isSelezionata={selezionate.includes(key)}
                                        canSelezionare={selezionate.length < MAX_CONFRONTO || selezionate.includes(key)}
                                        onToggleSelezione={() => toggleSelezione(key)}
                                        cerca={cercaApplicata}
                                        paroleChiaveLex={paroleChiaveLex}
                                        attivoLex={risultatiLexChiavi !== null}
                                        basePathEtichette={basePathEtichette}
                                        basePathBancaDati={basePathBancaDati}
                                        navigate={navigate}
                                    />
                                )
                            })}
                        </div>
                    )}
                </>
            )}

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
                    basePathEtichette={basePathEtichette}
                    onClose={() => setMostraGestioneEtichette(false)}
                    onAggiornate={caricaTutto}
                />
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// CARD ELEMENTO (invariato)
// ═══════════════════════════════════════════════════════════════
function CardElemento({
    elemento: el, chiave, etichetteElemento, etichetteDisponibili, aperto, onToggleApri, onAggiornata,
    modalitaSelezione, isSelezionata, canSelezionare, onToggleSelezione,
    cerca, paroleChiaveLex = [], attivoLex = false, basePathEtichette, basePathBancaDati, navigate,
}) {
    const [mostraTagPicker, setMostraTagPicker] = useState(false)
    const [eliminando, setEliminando] = useState(false)

    // Helper: usa evidenziazione Lex (salvia, multipla) se attivo, altrimenti
    // ricerca tradizionale (oro, singola)
    const evidenzia = (testo) => {
        if (attivoLex && paroleChiaveLex?.length > 0) {
            return evidenziaParoleMultiple(testo, paroleChiaveLex, 'bg-salvia/30')
        }
        return evidenziaParola(testo, cerca)
    }

    const meta = (() => {
        if (el.kind === 'ricerca_ai') return { Icon: Sparkles, color: 'text-salvia', label: 'Ricerca AI' }
        if (el.kind === 'chat_lex') return { Icon: MessageSquare, color: 'text-salvia', label: 'Chat con Lex' }
        if (el.kind === 'ricerca_manuale') return { Icon: Search, color: 'text-oro', label: 'Ricerca manuale' }
        if (el.kind === 'norma') return { Icon: BookOpen, color: 'text-oro', label: 'Norma' }
        if (el.kind === 'sentenza') return { Icon: Landmark, color: 'text-oro', label: 'Sentenza' }
        if (el.kind === 'prassi') return { Icon: ScrollText, color: 'text-salvia', label: 'Prassi' }
        return { Icon: Search, color: 'text-nebbia', label: el.kind }
    })()
    const { Icon, color, label } = meta

    const titolo = (() => {
        if (TIPI_RICERCA.includes(el.kind)) return el.titolo ?? label
        if (el.kind === 'norma') return `${el.codice?.toUpperCase() ?? ''} · Art. ${el.articolo}`
        if (el.kind === 'sentenza') {
            const parti = [el.organo, el.sezione, el.numero && `n. ${el.numero}`, el.anno].filter(Boolean)
            return parti.join(' · ') || 'Sentenza'
        }
        if (el.kind === 'prassi') {
            const parti = [el.fonte, el.numero && `n. ${el.numero}`, el.anno].filter(Boolean)
            return parti.join(' · ') || 'Prassi'
        }
        return label
    })()

    const sottotitolo = (() => {
        if (el.kind === 'norma') return el.rubrica ?? ''
        if (el.kind === 'sentenza') return el.oggetto ?? ''
        if (el.kind === 'prassi') return el.oggetto ?? ''
        return null
    })()

    const anteprima = (() => {
        if (TIPI_RICERCA.includes(el.kind)) {
            return (el.contenuto ?? '').replace(/[#*_`]/g, '').slice(0, 400)
        }
        if (el.kind === 'norma') return (el.testo ?? '').slice(0, 400)
        if (el.kind === 'sentenza') return el.principio_diritto ?? ''
        if (el.kind === 'prassi') return el.sintesi ?? ''
        return ''
    })()

    const linkDettaglio = (() => {
        if (el.kind === 'norma') return `${basePathBancaDati}/norma/${el.id}`
        if (el.kind === 'sentenza') {
            return el.fonte_sentenza === 'lexum'
                ? `${basePathBancaDati}/lexum/${el.id}`
                : `${basePathBancaDati}/avvocato/${el.id}`
        }
        if (el.kind === 'prassi') return `${basePathBancaDati}/prassi/${el.id}`
        return null
    })()

    async function elimina() {
        if (TIPI_RICERCA.includes(el.kind)) {
            if (!confirm('Eliminare questa ricerca? L\'azione è irreversibile.')) return
            setEliminando(true)
            await supabase.from('ricerche').delete().eq('id', el.id)
            if (onAggiornata) await onAggiornata()
        } else {
            if (!confirm(`Rimuovere tutti i tag da questo elemento?\nL'elemento originale (${label.toLowerCase()}) non verrà cancellato.`)) return
            setEliminando(true)
            await supabase.from('elementi_etichette')
                .delete()
                .eq('elemento_id', el.id)
                .eq('tipo', el.kind)
            if (onAggiornata) await onAggiornata()
        }
    }

    async function toggleEtichetta(etichettaId) {
        const giaPresente = etichetteElemento.some(e => e.id === etichettaId)
        if (giaPresente) {
            await supabase.from('elementi_etichette')
                .delete()
                .eq('elemento_id', el.id)
                .eq('etichetta_id', etichettaId)
                .eq('tipo', el.kind)
        } else {
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('elementi_etichette').insert({
                etichetta_id: etichettaId,
                elemento_id: el.id,
                tipo: el.kind,
                user_id: user.id,
            })
        }
        if (onAggiornata) await onAggiornata()
    }

    const cardClasses = `bg-slate border transition-colors flex flex-col h-full ${aperto ? 'md:col-span-2 xl:col-span-3' : ''
        } ${modalitaSelezione && isSelezionata
            ? 'border-salvia/50'
            : modalitaSelezione && !canSelezionare
                ? 'border-white/5 opacity-40'
                : 'border-white/5 hover:border-white/10'
        }`

    return (
        <div className={cardClasses}>
            <div className="p-4 flex flex-col gap-3 flex-1 min-w-0 relative">
                {modalitaSelezione && (
                    <button
                        onClick={onToggleSelezione}
                        disabled={!canSelezionare}
                        className="absolute -top-2 -left-2 w-7 h-7 flex items-center justify-center bg-slate border border-white/20 hover:border-salvia transition-colors disabled:cursor-not-allowed z-10"
                    >
                        {isSelezionata
                            ? <CheckSquare size={14} className="text-salvia" />
                            : <Square size={14} className="text-nebbia/40" />
                        }
                    </button>
                )}

                <div className="flex items-start gap-2.5">
                    <Icon size={14} className={`${color} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                        <p
                            className="font-body text-sm font-medium text-nebbia leading-snug line-clamp-2 mb-1"
                            dangerouslySetInnerHTML={{ __html: evidenzia(titolo) }}
                        />
                        {sottotitolo && (
                            <p
                                className="font-body text-xs text-nebbia/70 line-clamp-1 mb-1"
                                dangerouslySetInnerHTML={{ __html: evidenzia(sottotitolo) }}
                            />
                        )}
                        <p className="font-body text-[10px] text-nebbia/40 uppercase tracking-wider">
                            {label}
                            {el.created_at && (
                                <> · {new Date(el.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                            )}
                        </p>
                    </div>
                    {!modalitaSelezione && (
                        <div className="flex items-center gap-0.5 shrink-0 -mt-0.5">
                            {linkDettaglio && (
                                <Link
                                    to={linkDettaglio}
                                    className="text-nebbia/30 hover:text-oro p-1 transition-colors"
                                    title="Apri nella banca dati"
                                >
                                    <ExternalLink size={12} />
                                </Link>
                            )}
                            {TIPI_RICERCA.includes(el.kind) && (
                                <button
                                    onClick={onToggleApri}
                                    className="font-body text-xs text-nebbia/30 hover:text-oro px-2 py-1 transition-colors">
                                    {aperto ? 'Chiudi' : 'Apri'}
                                </button>
                            )}
                            <button onClick={elimina} disabled={eliminando}
                                className="text-nebbia/25 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                                title={TIPI_RICERCA.includes(el.kind) ? 'Elimina ricerca' : 'Rimuovi tag'}>
                                {eliminando ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                        </div>
                    )}
                </div>

                {TIPI_RICERCA.includes(el.kind) && (
                    <div className="flex items-center gap-3 flex-wrap text-xs">
                        {el.pratica
                            ? <Link to={`/pratiche/${el.pratica.id}`}
                                className="flex items-center gap-1 font-body text-nebbia/60 hover:text-oro transition-colors min-w-0 max-w-[220px]">
                                <FolderOpen size={11} className="shrink-0" />
                                <span className="truncate">{el.pratica.titolo}</span>
                            </Link>
                            : <span className="font-body text-nebbia/30 italic">Senza pratica</span>
                        }
                        {el.autore && (
                            <span className="font-body text-nebbia/30 truncate">
                                {el.autore.nome} {el.autore.cognome}
                            </span>
                        )}
                    </div>
                )}

                {!aperto && anteprima && (
                    <p
                        className="font-body text-xs text-nebbia/55 line-clamp-3 leading-relaxed flex-1"
                        dangerouslySetInnerHTML={{ __html: evidenzia(anteprima) }}
                    />
                )}

                <div className="flex items-center gap-2 flex-wrap mt-auto">
                    {etichetteElemento.map(e => (
                        <button
                            key={e.id}
                            type="button"
                            onClick={(ev) => {
                                ev.stopPropagation()
                                navigate(`${basePathEtichette}/${e.id}`)
                            }}
                            className="flex items-center gap-2 font-body text-xs font-medium px-2.5 py-1 border transition-all hover:opacity-80"
                            style={{
                                borderColor: `${e.colore}80`,
                                color: e.colore,
                                backgroundColor: `${e.colore}22`
                            }}
                            title={`Apri etichetta "${e.nome}"`}
                        >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.colore }} />
                            {e.nome}
                        </button>
                    ))}
                </div>

                {mostraTagPicker && (
                    <div className="p-2 bg-petrolio/40 border border-white/5">
                        {etichetteDisponibili.length === 0 ? (
                            <p className="font-body text-xs text-nebbia/40 text-center py-2">
                                Nessuna etichetta disponibile
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {etichetteDisponibili.map(e => {
                                    const giaPresente = etichetteElemento.some(et => et.id === e.id)
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

            {aperto && TIPI_RICERCA.includes(el.kind) && (
                <div className="px-4 pb-4 pt-3 border-t border-white/5 bg-petrolio/30 space-y-3">
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
                            {el.contenuto}
                        </ReactMarkdown>
                    </div>
                    <div className="pt-3 border-t border-white/5 flex items-center justify-end">
                        <AggiungiAEtichetta
                            elemento={{ tipo: el.kind, id: el.id }}
                            variant="compact"
                            onCambio={onAggiornata}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// AZIONI GUIDATE — CONFRONTO
// ═══════════════════════════════════════════════════════════════

const AZIONI_CONFRONTO = [
    {
        id: 'sintesi_unificata',
        emoji: '📊',
        label: 'Sintesi unificata',
        descr: 'Fonde gli elementi in un quadro unitario',
    },
    {
        id: 'conflitti',
        emoji: '⚖️',
        label: 'Conflitti & tensioni',
        descr: 'Evidenzia divergenze e contraddizioni',
    },
    {
        id: 'comuni',
        emoji: '🎯',
        label: 'Punti in comune',
        descr: 'Estrae il fil rouge condiviso',
    },
    {
        id: 'parere',
        emoji: '📝',
        label: 'Parere completo',
        descr: 'Documento strutturato pronto da copiare',
    },
]

const FRASI_CONFRONTO = {
    sintesi_unificata: [
        'Sto leggendo gli elementi che mi hai dato',
        'Identifico i punti di tangenza',
        'Cerco il filo conduttore',
        'Compongo il quadro unitario',
        'Sto cucendo i tasselli',
        'Verifico la coerenza interna',
        'Rileggo per assicurarmi',
        'Affino la sintesi finale',
    ],
    conflitti: [
        'Sto leggendo gli elementi',
        'Cerco le tensioni nascoste',
        'Identifico le divergenze',
        'Confronto le posizioni',
        'Valuto quale prevale',
        'Verifico le contraddizioni',
        'Soppeso le argomentazioni',
        'Compongo l\'analisi critica',
    ],
    comuni: [
        'Sto leggendo gli elementi',
        'Cerco il fil rouge',
        'Estraggo i principi condivisi',
        'Identifico le convergenze',
        'Verifico gli orientamenti comuni',
        'Compongo il costrutto unitario',
        'Mostro come si rinforzano',
        'Affino la lettura d\'insieme',
    ],
    parere: [
        'Sto leggendo gli elementi',
        'Inquadrolo le premesse',
        'Ricostruisco il quadro',
        'Articolo le considerazioni',
        'Cerco le tensioni interpretative',
        'Compongo le conclusioni',
        'Strutturo il parere',
        'Rifinisco il documento',
    ],
    libera: [
        'Sto leggendo gli elementi',
        'Analizzo la tua domanda',
        'Cerco i punti rilevanti',
        'Compongo la risposta',
        'Verifico l\'aderenza agli elementi',
        'Affino il ragionamento',
    ],
}

// ═══════════════════════════════════════════════════════════════
// LEX ANIMAZIONE — Confronto (frasi personalizzate per azione)
// ═══════════════════════════════════════════════════════════════
function LexAnimazioneConfronto({ azione }) {
    const frasiRotative = FRASI_CONFRONTO[azione] ?? FRASI_CONFRONTO.libera
    const [indiceFrase, setIndiceFrase] = useState(0)

    useEffect(() => {
        setIndiceFrase(0)
        const interval = setInterval(() => {
            setIndiceFrase((i) => (i + 1) % frasiRotative.length)
        }, 4000)
        return () => clearInterval(interval)
    }, [azione])

    const testoVisibile = frasiRotative[indiceFrase]

    return (
        <div className="px-3 py-4 max-w-[600px] mx-auto">
            <style>{`
                .lex-stage-c { position: relative; width: 100%; aspect-ratio: 16 / 7; margin: 0 auto; }
                .lex-stage-c svg { width: 100%; height: 100%; display: block; }

                .lex-c-ray { animation: lexCRayCycle 27s ease-in-out infinite; }
                @keyframes lexCRayCycle {
                    0%   { transform: translateX(-30px); opacity: 0; }
                    3%   { opacity: 0.8; }
                    8%   { transform: translateX(85px); opacity: 0.9; }
                    12%  { transform: translateX(85px); opacity: 1; }
                    16%  { transform: translateX(85px); opacity: 0; }
                    33%  { transform: translateX(85px); opacity: 0; }
                    34%  { transform: translateX(-30px); opacity: 0; }
                    37%  { opacity: 0.8; }
                    42%  { transform: translateX(180px); opacity: 0.9; }
                    46%  { transform: translateX(180px); opacity: 1; }
                    50%  { transform: translateX(180px); opacity: 0; }
                    66%  { transform: translateX(180px); opacity: 0; }
                    67%  { transform: translateX(-30px); opacity: 0; }
                    70%  { opacity: 0.8; }
                    78%  { transform: translateX(290px); opacity: 0.9; }
                    82%  { transform: translateX(290px); opacity: 1; }
                    86%  { transform: translateX(290px); opacity: 0; }
                    100% { transform: translateX(290px); opacity: 0; }
                }

                .lex-c-book-a { animation: lexCBookGlowA 27s ease-in-out infinite; }
                @keyframes lexCBookGlowA {
                    0%, 8% { fill: #243447; stroke: rgba(127, 163, 154, 0.2); stroke-width: 1; transform: translateY(0); }
                    12% { fill: rgba(127, 163, 154, 0.25); stroke: #7FA39A; stroke-width: 1.5; transform: translateY(0); }
                    16% { fill: rgba(127, 163, 154, 0.15); stroke: rgba(127, 163, 154, 0.4); stroke-width: 1; transform: translateY(8px); }
                    24% { fill: rgba(127, 163, 154, 0.05); stroke: rgba(127, 163, 154, 0.3); stroke-width: 1; transform: translateY(8px); }
                    32%, 100% { fill: #243447; stroke: rgba(127, 163, 154, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-c-book-b { animation: lexCBookGlowB 27s ease-in-out infinite; }
                @keyframes lexCBookGlowB {
                    0%, 41% { fill: #243447; stroke: rgba(127, 163, 154, 0.2); stroke-width: 1; transform: translateY(0); }
                    46% { fill: rgba(127, 163, 154, 0.25); stroke: #7FA39A; stroke-width: 1.5; transform: translateY(0); }
                    50% { fill: rgba(127, 163, 154, 0.15); stroke: rgba(127, 163, 154, 0.4); stroke-width: 1; transform: translateY(8px); }
                    58% { fill: rgba(127, 163, 154, 0.05); stroke: rgba(127, 163, 154, 0.3); stroke-width: 1; transform: translateY(8px); }
                    66%, 100% { fill: #243447; stroke: rgba(127, 163, 154, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-c-book-c { animation: lexCBookGlowC 27s ease-in-out infinite; }
                @keyframes lexCBookGlowC {
                    0%, 75% { fill: #243447; stroke: rgba(127, 163, 154, 0.2); stroke-width: 1; transform: translateY(0); }
                    82% { fill: rgba(127, 163, 154, 0.25); stroke: #7FA39A; stroke-width: 1.5; transform: translateY(0); }
                    86% { fill: rgba(127, 163, 154, 0.15); stroke: rgba(127, 163, 154, 0.4); stroke-width: 1; transform: translateY(8px); }
                    94% { fill: rgba(127, 163, 154, 0.05); stroke: rgba(127, 163, 154, 0.3); stroke-width: 1; transform: translateY(8px); }
                    100% { fill: #243447; stroke: rgba(127, 163, 154, 0.2); stroke-width: 1; transform: translateY(0); }
                }

                .lex-c-fade-text { animation: lexCFadeIn 0.6s ease-out; }
                @keyframes lexCFadeIn {
                    0%   { opacity: 0; transform: translateY(4px); }
                    100% { opacity: 1; transform: translateY(0); }
                }

                .lex-c-dots-container { display: inline-flex; gap: 3px; margin-left: 6px; align-items: center; }
                .lex-c-dot {
                    display: inline-block; width: 3px; height: 3px;
                    border-radius: 50%; background: #7FA39A; opacity: 0.4;
                    animation: lexCDotPulse 1.4s ease-in-out infinite;
                }
                .lex-c-dot:nth-child(1) { animation-delay: 0s; }
                .lex-c-dot:nth-child(2) { animation-delay: 0.2s; }
                .lex-c-dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes lexCDotPulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.3); }
                }
            `}</style>

            <div className="lex-stage-c">
                <svg viewBox="62 27 416 185" xmlns="http://www.w3.org/2000/svg" role="img">
                    <title>Lex sta ragionando</title>
                    <line x1="60" y1="172" x2="480" y2="172" stroke="rgba(127, 163, 154, 0.4)" strokeWidth="0.8" />

                    <rect x="80" y="100" width="22" height="72" rx="1" fill="#243447" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />
                    <rect x="105" y="92" width="20" height="80" rx="1" fill="#1d2c3a" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />
                    <rect x="128" y="105" width="24" height="67" rx="1" fill="#2a3b4f" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />

                    <rect className="lex-c-book-a" x="155" y="96" width="22" height="76" rx="1" fill="#243447" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />

                    <rect x="180" y="108" width="20" height="64" rx="1" fill="#1d2c3a" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />
                    <rect x="203" y="98" width="22" height="74" rx="1" fill="#2a3b4f" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />
                    <rect x="228" y="103" width="24" height="69" rx="1" fill="#243447" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />

                    <rect className="lex-c-book-b" x="255" y="90" width="26" height="82" rx="1.5" fill="#243447" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />

                    <rect x="284" y="97" width="22" height="75" rx="1" fill="#1d2c3a" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />
                    <rect x="309" y="104" width="24" height="68" rx="1" fill="#2a3b4f" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />
                    <rect x="336" y="93" width="22" height="79" rx="1" fill="#243447" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />

                    <rect className="lex-c-book-c" x="361" y="106" width="20" height="66" rx="1" fill="#1d2c3a" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />

                    <rect x="384" y="100" width="22" height="72" rx="1" fill="#2a3b4f" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />
                    <rect x="409" y="95" width="24" height="77" rx="1" fill="#243447" stroke="rgba(127, 163, 154, 0.2)" strokeWidth="1" />

                    <g className="lex-c-ray">
                        <ellipse cx="80" cy="135" rx="22" ry="55" fill="#7FA39A" opacity="0.18" />
                        <ellipse cx="80" cy="135" rx="14" ry="45" fill="#7FA39A" opacity="0.25" />
                        <ellipse cx="80" cy="135" rx="6" ry="35" fill="#7FA39A" opacity="0.4" />
                        <line x1="80" y1="80" x2="80" y2="180" stroke="#7FA39A" strokeWidth="0.5" opacity="0.6" />
                    </g>
                </svg>
            </div>

            <div className="text-center mt-3 min-h-[24px]">
                {testoVisibile && (
                    <span
                        key={indiceFrase}
                        className="lex-c-fade-text font-body text-sm text-nebbia/70 tracking-wide inline-flex items-center"
                    >
                        {testoVisibile}
                        <span className="lex-c-dots-container">
                            <span className="lex-c-dot" />
                            <span className="lex-c-dot" />
                            <span className="lex-c-dot" />
                        </span>
                    </span>
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// PANNELLO CONFRONTO (CON CHAT LEX + AZIONI GUIDATE + STREAMING)
// ═══════════════════════════════════════════════════════════════
function PannelloConfronto({ elementi, etichette, pratiche, basePathBancaDati, onChiudi, onSintesiSalvata }) {
    const [tabMobile, setTabMobile] = useState(0)

    const [conversazione, setConversazione] = useState([])
    const [input, setInput] = useState('')
    const [cercando, setCercando] = useState(false)
    const [azioneCorrente, setAzioneCorrente] = useState('libera')
    const [streamingTesto, setStreamingTesto] = useState('')
    const [erroreLex, setErroreLex] = useState('')
    const [mostraModaleSalva, setMostraModaleSalva] = useState(false)
    const [contenutoSalva, setContenutoSalva] = useState('')
    const abortControllerRef = useRef(null)

    const numCol = elementi.length

    async function eseguiAzioneOLibera({ azione, domandaTesto }) {
        if (cercando) return
        setErroreLex('')
        setStreamingTesto('')
        setAzioneCorrente(azione)

        // Costruisci messaggio "user" da mostrare in chat
        let etichettaInput = ''
        if (azione === 'libera') {
            etichettaInput = domandaTesto
        } else {
            const meta = AZIONI_CONFRONTO.find(a => a.id === azione)
            etichettaInput = `${meta?.emoji ?? ''} ${meta?.label ?? azione}${domandaTesto ? `\n\nFocus: ${domandaTesto}` : ''}`
        }

        const nuovaConv = [...conversazione, { role: 'user', content: etichettaInput }]
        setConversazione(nuovaConv)
        setInput('')
        setCercando(true)

        const controller = new AbortController()
        abortControllerRef.current = controller

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lex-confronta`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        azione,
                        domanda: domandaTesto,
                        messaggi: conversazione,
                        elementi: elementi.map(el => ({
                            kind: el.kind,
                            titolo: titoloElemento(el),
                            contenuto: contenutoElemento(el),
                        })),
                    }),
                    signal: controller.signal,
                }
            )

            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error ?? `Errore ${res.status}`)
            }

            // Streaming SSE
            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let testoAccumulato = ''

            while (true) {
                const { value, done } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                    if (!line.trim() || !line.startsWith('data: ')) continue
                    try {
                        const payload = JSON.parse(line.slice(6).trim())
                        if (payload.text) {
                            testoAccumulato += payload.text
                            setStreamingTesto(testoAccumulato)
                        }
                    } catch {
                        // ignora
                    }
                }
            }

            // Finalizza conversazione
            setConversazione([...nuovaConv, { role: 'assistant', content: testoAccumulato, azione }])
            setStreamingTesto('')
        } catch (e) {
            if (e.name !== 'AbortError') {
                setErroreLex(e.message)
                setConversazione(conversazione)
            }
        } finally {
            setCercando(false)
            abortControllerRef.current = null
        }
    }

    function inviaLibera() {
        if (!input.trim()) return
        eseguiAzioneOLibera({ azione: 'libera', domandaTesto: input.trim() })
    }

    function eseguiAzione(azioneId) {
        eseguiAzioneOLibera({ azione: azioneId, domandaTesto: input.trim() })
    }

    function nuovaSessione() {
        if (abortControllerRef.current) abortControllerRef.current.abort()
        setConversazione([])
        setStreamingTesto('')
        setErroreLex('')
        setInput('')
        setAzioneCorrente('libera')
    }

    function salvaMessaggio(content) {
        setContenutoSalva(content)
        setMostraModaleSalva(true)
    }

    return (
        <div className="space-y-5">

            {/* ─── Colonne affiancate ─── */}
            <div className="bg-slate border border-salvia/20">
                <div className="md:hidden flex border-b border-white/5">
                    {elementi.map((el, i) => (
                        <button
                            key={chiaveElemento(el)}
                            onClick={() => setTabMobile(i)}
                            className={`flex-1 px-3 py-2.5 font-body text-xs border-b-2 transition-colors truncate ${tabMobile === i ? 'border-salvia text-salvia' : 'border-transparent text-nebbia/40'}`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-${numCol} divide-y md:divide-y-0 md:divide-x divide-white/5`}>
                    {elementi.map((el, i) => (
                        <div
                            key={chiaveElemento(el)}
                            className={`${tabMobile === i ? 'block' : 'hidden md:block'} max-h-[60vh] overflow-y-auto`}
                        >
                            <ColonnaConfronto elemento={el} basePathBancaDati={basePathBancaDati} />
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── Chat Lex con azioni guidate ─── */}
            <div className="bg-slate border border-salvia/20">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-salvia" />
                        <p className="font-body text-sm font-medium text-nebbia">Lex — Chat sul confronto</p>
                        {conversazione.length > 0 && (
                            <span className="font-body text-xs text-salvia/60 border border-salvia/20 px-2 py-0.5">
                                {Math.floor(conversazione.length / 2) + (cercando || streamingTesto ? 1 : 0)} scambi
                            </span>
                        )}
                    </div>
                    {(conversazione.length > 0 || cercando) && (
                        <button
                            onClick={nuovaSessione}
                            className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors"
                        >
                            Nuova sessione
                        </button>
                    )}
                </div>

                {/* Storia conversazione */}
                {(conversazione.length > 0 || cercando || streamingTesto) && (
                    <div className="px-5 py-4 space-y-5 max-h-[55vh] overflow-y-auto">
                        {conversazione.map((m, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`font-body text-xs font-medium ${m.role === 'user' ? 'text-oro/70' : 'text-salvia/70'}`}>
                                        {m.role === 'user' ? 'Tu' : 'Lex'}
                                    </span>
                                    {m.role === 'assistant' && (
                                        <button
                                            onClick={() => salvaMessaggio(m.content)}
                                            className="flex items-center gap-1 font-body text-xs text-nebbia/30 hover:text-oro transition-colors"
                                        >
                                            <Save size={10} /> Salva come ricerca
                                        </button>
                                    )}
                                </div>

                                {m.role === 'user' ? (
                                    <p className="font-body text-sm text-nebbia/60 leading-relaxed whitespace-pre-line">{m.content}</p>
                                ) : (
                                    <div className="font-body text-sm text-nebbia/80 leading-relaxed space-y-2">
                                        <ReactMarkdown
                                            components={{
                                                h2: ({ children }) => <h2 className="font-display text-base font-semibold text-nebbia mt-4 mb-2">{children}</h2>,
                                                h3: ({ children }) => <h3 className="font-body text-sm font-semibold text-nebbia/80 mt-3 mb-1">{children}</h3>,
                                                strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
                                                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                                                li: ({ children }) => <li>{children}</li>,
                                                p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                                            }}
                                        >
                                            {m.content}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Streaming in corso */}
                        {streamingTesto && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-body text-xs font-medium text-salvia/70">Lex</span>
                                </div>
                                <div className="font-body text-sm text-nebbia/80 leading-relaxed">
                                    <ReactMarkdown
                                        components={{
                                            h2: ({ children }) => <h2 className="font-display text-base font-semibold text-nebbia mt-4 mb-2">{children}</h2>,
                                            h3: ({ children }) => <h3 className="font-body text-sm font-semibold text-nebbia/80 mt-3 mb-1">{children}</h3>,
                                            strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
                                            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                                            li: ({ children }) => <li>{children}</li>,
                                            p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                                        }}
                                    >
                                        {streamingTesto}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {/* Animazione mentre attende il primo chunk */}
                        {cercando && !streamingTesto && (
                            <LexAnimazioneConfronto azione={azioneCorrente} />
                        )}
                    </div>
                )}

                {/* Pannello azioni guidate */}
                {!cercando && (
                    <div className="px-5 py-4 space-y-3">
                        {conversazione.length === 0 && (
                            <p className="font-body text-xs text-nebbia/30">
                                Scegli un'azione guidata o scrivi una domanda libera. Lex ragionerà sui {numCol} elementi confrontati.
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            {AZIONI_CONFRONTO.map(a => (
                                <button
                                    key={a.id}
                                    onClick={() => eseguiAzione(a.id)}
                                    disabled={cercando}
                                    className="group flex items-start gap-2 p-3 bg-petrolio border border-white/5 hover:border-salvia/30 transition-colors text-left disabled:opacity-40"
                                >
                                    <span className="text-base shrink-0 mt-0.5">{a.emoji}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-body text-xs font-medium text-nebbia group-hover:text-salvia transition-colors leading-snug">
                                            {a.label}
                                        </p>
                                        <p className="font-body text-[10px] text-nebbia/40 mt-0.5 leading-snug">
                                            {a.descr}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <textarea
                            rows={2}
                            placeholder={conversazione.length > 0
                                ? 'Approfondisci o fai una nuova domanda...'
                                : 'Oppure scrivi una domanda libera...'}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) inviaLibera() }}
                            disabled={cercando}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 resize-none placeholder:text-nebbia/25 disabled:opacity-50"
                        />

                        {erroreLex && (
                            <p className="font-body text-xs text-red-400 flex items-center gap-1.5">
                                <AlertCircle size={11} /> {erroreLex}
                            </p>
                        )}

                        <button
                            onClick={inviaLibera}
                            disabled={cercando || !input.trim()}
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40"
                        >
                            <Sparkles size={13} /> Invia domanda libera
                        </button>
                    </div>
                )}

                {/* Stato cercando senza storia precedente: non mostra nulla qui (animazione è dentro la storia) */}
            </div>

            {mostraModaleSalva && (
                <ModaleSalvaSintesi
                    sintesi={contenutoSalva}
                    elementiConfrontati={elementi}
                    pratiche={pratiche}
                    etichette={etichette}
                    onClose={() => setMostraModaleSalva(false)}
                    onSalvata={() => {
                        setMostraModaleSalva(false)
                        onSintesiSalvata()
                    }}
                />
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// HELPER COMUNI
// ═══════════════════════════════════════════════════════════════
function titoloElemento(el) {
    if (TIPI_RICERCA.includes(el.kind)) return el.titolo ?? '(senza titolo)'
    if (el.kind === 'norma') return `${el.codice?.toUpperCase() ?? ''} Art. ${el.articolo}${el.rubrica ? ` — ${el.rubrica}` : ''}`
    if (el.kind === 'sentenza') {
        const parti = [el.organo, el.sezione, el.numero && `n. ${el.numero}`, el.anno].filter(Boolean)
        return parti.join(' · ')
    }
    if (el.kind === 'prassi') {
        const parti = [el.fonte, el.numero && `n. ${el.numero}`, el.anno].filter(Boolean)
        return parti.join(' · ')
    }
    return ''
}

function contenutoElemento(el) {
    if (TIPI_RICERCA.includes(el.kind)) return el.contenuto ?? ''
    if (el.kind === 'norma') return el.testo ?? ''
    if (el.kind === 'sentenza') return [el.oggetto, el.principio_diritto].filter(Boolean).join('\n\n')
    if (el.kind === 'prassi') return [el.oggetto, el.sintesi].filter(Boolean).join('\n\n')
    return ''
}

function ColonnaConfronto({ elemento: el, basePathBancaDati }) {
    const meta = (() => {
        if (el.kind === 'ricerca_ai') return { Icon: Sparkles, color: 'text-salvia', label: 'Ricerca AI' }
        if (el.kind === 'chat_lex') return { Icon: MessageSquare, color: 'text-salvia', label: 'Chat con Lex' }
        if (el.kind === 'ricerca_manuale') return { Icon: Search, color: 'text-oro', label: 'Ricerca manuale' }
        if (el.kind === 'norma') return { Icon: BookOpen, color: 'text-oro', label: 'Norma' }
        if (el.kind === 'sentenza') return { Icon: Landmark, color: 'text-oro', label: 'Sentenza' }
        if (el.kind === 'prassi') return { Icon: ScrollText, color: 'text-salvia', label: 'Prassi' }
        return { Icon: Search, color: 'text-nebbia', label: el.kind }
    })()

    const titolo = titoloElemento(el)
    const contenuto = contenutoElemento(el)

    const linkDettaglio = (() => {
        if (el.kind === 'norma') return `${basePathBancaDati}/norma/${el.id}`
        if (el.kind === 'sentenza') {
            return el.fonte_sentenza === 'lexum'
                ? `${basePathBancaDati}/lexum/${el.id}`
                : `${basePathBancaDati}/avvocato/${el.id}`
        }
        if (el.kind === 'prassi') return `${basePathBancaDati}/prassi/${el.id}`
        return null
    })()

    return (
        <div className="p-4 space-y-3">
            <div className="flex items-start gap-2">
                <meta.Icon size={13} className={`${meta.color} shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-nebbia leading-snug">
                        {titolo}
                    </p>
                    <p className="font-body text-[10px] text-nebbia/40 uppercase tracking-wider mt-0.5">
                        {meta.label}
                        {el.created_at && (
                            <> · {new Date(el.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                        )}
                    </p>
                </div>
                {linkDettaglio && (
                    <Link
                        to={linkDettaglio}
                        className="flex items-center gap-1 text-oro/70 hover:text-oro hover:bg-oro/10 px-2 py-1 border border-oro/20 hover:border-oro/40 transition-colors"
                        title="Apri nella banca dati"
                    >
                        <ExternalLink size={11} />
                        <span className="font-body text-[10px] uppercase tracking-wider">Apri</span>
                    </Link>
                )}
            </div>

            {TIPI_RICERCA.includes(el.kind) && el.pratica && (
                <Link to={`/pratiche/${el.pratica.id}`}
                    className="flex items-center gap-1 font-body text-xs text-nebbia/50 hover:text-oro transition-colors">
                    <FolderOpen size={10} className="shrink-0" />
                    <span className="truncate">{el.pratica.titolo}</span>
                </Link>
            )}

            <div className="font-body text-xs text-nebbia/65 leading-relaxed">
                {TIPI_RICERCA.includes(el.kind) ? (
                    <ReactMarkdown
                        components={{
                            h2: ({ children }) => <h2 className="font-body text-sm font-semibold text-nebbia mt-3 mb-1">{children}</h2>,
                            h3: ({ children }) => <h3 className="font-body text-xs font-semibold text-nebbia/80 mt-2 mb-0.5">{children}</h3>,
                            strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
                            p: ({ children }) => <p className="mb-2 leading-relaxed text-xs">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2">{children}</ul>,
                            li: ({ children }) => <li className="text-nebbia/60 text-xs">{children}</li>,
                        }}
                    >
                        {contenuto}
                    </ReactMarkdown>
                ) : (
                    <p className="whitespace-pre-line text-xs leading-relaxed">{contenuto}</p>
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// MODALE SALVA SINTESI (invariata)
// ═══════════════════════════════════════════════════════════════
function ModaleSalvaSintesi({ sintesi, elementiConfrontati, pratiche, etichette, onClose, onSalvata }) {
    const titoloAuto = `Confronto: ${elementiConfrontati.map(el => titoloElemento(el)).join(' · ').slice(0, 100)}`
    const [titolo, setTitolo] = useState(titoloAuto)
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
        setSalvando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            const contenutoCompleto = sintesi + '\n\n---\n\n*Sintesi generata da Lex confrontando ' +
                elementiConfrontati.length + ' elementi.*'

            const { data: ric, error } = await supabase
                .from('ricerche')
                .insert({
                    user_id: user.id,
                    autore_id: user.id,
                    pratica_id: praticaId || null,
                    tipo: 'ricerca_ai',
                    titolo: titolo.trim() || titoloAuto,
                    contenuto: contenutoCompleto,
                    metadati: {
                        ts: new Date().toISOString(),
                        tipo_ricerca: 'confronto_sintesi',
                        elementi_origine: elementiConfrontati.map(el => ({ kind: el.kind, id: el.id })),
                    }
                })
                .select('id')
                .single()
            if (error) throw new Error(error.message)

            if (etichetteSelezionate.length > 0) {
                const links = etichetteSelezionate.map(eid => ({
                    etichetta_id: eid,
                    elemento_id: ric.id,
                    tipo: 'ricerca_ai',
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
                        <Save size={14} className="text-oro" />
                        <p className="font-body text-sm font-medium text-nebbia">Salva sintesi come ricerca</p>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Titolo</label>
                        <input
                            value={titolo}
                            onChange={e => setTitolo(e.target.value)}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                        />
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Pratica (opzionale)</label>
                        <select
                            value={praticaId}
                            onChange={e => setPraticaId(e.target.value)}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                        >
                            <option value="">Nessuna pratica</option>
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

                    <div className="bg-petrolio/30 border border-white/5 p-3">
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            La sintesi verrà salvata come <strong className="text-nebbia/70">ricerca AI</strong> e potrai
                            ritrovarla in questa pagina o nella pratica selezionata.
                        </p>
                    </div>

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
                        disabled={salvando || !titolo.trim()}
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
// MODALE NUOVA RICERCA (invariata)
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
// MODALE NUOVA ETICHETTA (invariata)
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
// MODALE GESTIONE ETICHETTE (invariata)
// ═══════════════════════════════════════════════════════════════
function ModaleGestioneEtichette({ etichette, basePathEtichette, onClose, onAggiornate }) {
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
                                to={`${basePathEtichette}/${t.id}`}
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