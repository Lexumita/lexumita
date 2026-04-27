// src/pages/avvocato/Archivio.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { PageHeader, EmptyState, Badge } from '@/components/shared'
import {
    Upload, Search, Sparkles, FileText, File, X, Check,
    AlertCircle, ChevronDown, ChevronUp, Tag, User, FolderOpen,
    Eye, Trash2, Clock, Filter, Archive, Lock, HardDrive,
    Gavel, Calendar, ArrowRight, Scale, Landmark, AlertTriangle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import { useLocation, Link } from 'react-router-dom'

const MAX_FILES = 100
const PARALLEL = 5
const SOGLIA_STORAGE_PIENO = 0.90

// ─── Helpers ────────────────────────────────────────────────
function formatSize(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function bytesToGB(bytes) {
    return (bytes ?? 0) / (1024 * 1024 * 1024)
}

function isPdf(file) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function titoloSentenza(s) {
    const parti = [s.organo, s.sezione, s.numero && `n. ${s.numero}`, s.anno].filter(Boolean)
    return parti.join(' · ') || 'Sentenza'
}

function labelTipoProvvedimento(t) {
    const map = {
        sentenza: 'Sentenza',
        ordinanza: 'Ordinanza',
        ordinanza_interlocutoria: 'Ord. interlocutoria',
        decreto_presidenziale: 'Decreto',
        rassegna: 'Rassegna',
        relazione: 'Relazione',
    }
    return map[t] ?? t
}

const STATUS_CONFIG = {
    pending: { label: 'In coda', variant: 'gray' },
    processing: { label: 'Elaborazione', variant: 'warning' },
    completed: { label: 'Completato', variant: 'salvia' },
    failed: { label: 'Errore', variant: 'red' },
    skipped: { label: 'Manuale', variant: 'gray' },
}

// ─── Barra progresso upload ──────────────────────────────────
function BarraProgresso({ items }) {
    if (!items || items.length === 0) return null
    const completati = items.filter(i => ['completed', 'failed', 'skipped'].includes(i.status)).length
    const totale = items.length
    const pct = Math.round((completati / totale) * 100)

    return (
        <div className="bg-slate border border-oro/20 p-5 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" />
                    <p className="font-body text-sm font-medium text-nebbia">Elaborazione archivio</p>
                </div>
                <span className="font-body text-sm text-oro">{completati} di {totale}</span>
            </div>

            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full bg-oro transition-all duration-500"
                    style={{ width: `${pct}%` }}
                />
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                        {item.status === 'completed' && <Check size={12} className="text-salvia shrink-0" />}
                        {item.status === 'failed' && <X size={12} className="text-red-400 shrink-0" />}
                        {item.status === 'processing' && <span className="animate-spin w-3 h-3 border border-oro border-t-transparent rounded-full shrink-0" />}
                        {item.status === 'pending' && <div className="w-3 h-3 rounded-full border border-white/20 shrink-0" />}
                        {item.status === 'skipped' && <div className="w-3 h-3 rounded-full border border-nebbia/20 shrink-0" />}
                        <p className={`font-body text-xs truncate ${item.status === 'completed' ? 'text-nebbia/60' :
                            item.status === 'failed' ? 'text-red-400/70' :
                                item.status === 'processing' ? 'text-oro' :
                                    'text-nebbia/25'
                            }`}>
                            {item.nome}
                        </p>
                        {item.status === 'processing' && (
                            <span className="font-body text-xs text-oro/50 ml-auto shrink-0">estrazione...</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Form metadati documento ─────────────────────────────────
function FormMetadati({ file, onSalva, onAnnulla }) {
    const [titolo, setTitolo] = useState(file.name.replace(/\.[^/.]+$/, ''))

    return (
        <div className="bg-slate border border-oro/20 p-5 space-y-4">
            <p className="font-body text-xs text-oro/60 uppercase tracking-widest">
                {file.name}
                <span className="ml-2 text-nebbia/25 normal-case tracking-normal">
                    {isPdf(file) ? '— verrà digitalizzato automaticamente' : '— metadati da inserire manualmente'}
                </span>
            </p>
            <div>
                <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Titolo *</label>
                <input
                    value={titolo}
                    onChange={e => setTitolo(e.target.value)}
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                />
            </div>
            <p className="font-body text-xs text-nebbia/25 italic">
                Categoria, cliente, pratica e tag si aggiungono durante la verifica del documento.
            </p>
            <div className="flex gap-2">
                <button
                    onClick={() => onSalva({ titolo })}
                    className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors"
                >
                    <Check size={13} /> Carica documento
                </button>
                <button
                    onClick={onAnnulla}
                    className="px-4 py-2 border border-white/10 text-nebbia/40 font-body text-sm hover:text-nebbia transition-colors"
                >
                    Annulla
                </button>
            </div>
        </div>
    )
}

// ─── Card documento ──────────────────────────────────────────
function CardDocumento({ doc, onElimina, clienti }) {
    const [aperto, setAperto] = useState(false)
    const [pdfUrl, setPdfUrl] = useState(null)
    const cliente = clienti.find(c => c.id === doc.cliente_id)
    const sc = STATUS_CONFIG[doc.ocr_status] ?? STATUS_CONFIG.pending

    async function apriDocumento() {
        if (!doc.storage_path) return
        const { data } = await supabase.storage.from('archivio').createSignedUrl(doc.storage_path, 3600)
        if (data?.signedUrl) setPdfUrl(data.signedUrl)
        setAperto(true)
    }

    return (
        <div className="bg-slate border border-white/5 hover:border-white/10 transition-colors">
            <div className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 flex items-center justify-center border border-white/10 shrink-0 mt-0.5">
                    {doc.tipo === 'pdf'
                        ? <FileText size={15} className="text-oro/60" />
                        : <File size={15} className="text-nebbia/30" />
                    }
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className="font-body text-sm font-medium text-nebbia truncate">{doc.titolo}</p>
                        <Badge label={sc.label} variant={sc.variant} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        {doc.categoria && (
                            <span className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                                <FolderOpen size={10} /> {doc.categoria}
                            </span>
                        )}
                        {cliente && (
                            <span className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                                <User size={10} /> {cliente.nome} {cliente.cognome}
                            </span>
                        )}
                        <span className="font-body text-xs text-nebbia/25">
                            {new Date(doc.created_at).toLocaleDateString('it-IT')}
                        </span>
                        {doc.dimensione && (
                            <span className="font-body text-xs text-nebbia/25">{formatSize(doc.dimensione)}</span>
                        )}
                    </div>

                    {(doc.tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {doc.tags.map(t => (
                                <span key={t} className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {doc.storage_path && (
                        <a
                            href={`/archivio/${doc.id}`}
                            className="w-7 h-7 flex items-center justify-center text-nebbia/25 hover:text-oro transition-colors"
                        >
                            <Eye size={13} />
                        </a>
                    )}
                    <button
                        onClick={() => onElimina(doc)}
                        className="w-7 h-7 flex items-center justify-center text-nebbia/25 hover:text-red-400 transition-colors"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {aperto && pdfUrl && (
                <div className="border-t border-white/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="font-body text-xs text-nebbia/40">Anteprima documento</p>
                        <button onClick={() => { setAperto(false); setPdfUrl(null) }}
                            className="text-nebbia/25 hover:text-nebbia transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                    <iframe src={pdfUrl} className="w-full rounded" style={{ height: 500 }} title={doc.titolo} />
                </div>
            )}
        </div>
    )
}

// ─── TAB SENTENZE ACQUISTATE ──────────────────────────────────
function TabSentenzeAcquistate({ meId }) {
    const [acquisti, setAcquisti] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTesto, setSearchTesto] = useState('')
    const [filtroAnno, setFiltroAnno] = useState('')
    const [filtroTipo, setFiltroTipo] = useState('')

    useEffect(() => {
        async function carica() {
            if (!meId) return
            setLoading(true)
            const { data } = await supabase
                .from('accessi_sentenze')
                .select(`
                    id, prezzo, created_at,
                    sentenza:sentenza_id(
                        id, oggetto, organo, sezione, numero, anno,
                        data_pubblicazione, data_deposito,
                        tipo_provvedimento, categorie_lex, principio_diritto,
                        autore:autore_id(nome, cognome)
                    )
                `)
                .eq('acquirente_id', meId)
                .order('created_at', { ascending: false })
            setAcquisti(data ?? [])
            setLoading(false)
        }
        carica()
    }, [meId])

    const acquistiFiltrati = acquisti.filter(a => {
        const s = a.sentenza
        if (!s) return false
        if (filtroAnno && String(s.anno) !== filtroAnno) return false
        if (filtroTipo && s.tipo_provvedimento !== filtroTipo) return false
        if (searchTesto.trim()) {
            const h = `${s.oggetto ?? ''} ${s.organo ?? ''} ${(s.categorie_lex ?? []).join(' ')}`.toLowerCase()
            if (!h.includes(searchTesto.toLowerCase())) return false
        }
        return true
    })

    const totaleSpesa = acquisti.reduce((sum, a) => sum + parseFloat(a.prezzo ?? 0), 0)
    const anniDisponibili = [...new Set(acquisti.map(a => a.sentenza?.anno).filter(Boolean))].sort((a, b) => b - a)

    const TIPI_FILTRO = [
        { v: '', l: 'Tutti i tipi' },
        { v: 'sentenza', l: 'Sentenza' },
        { v: 'ordinanza', l: 'Ordinanza' },
        { v: 'ordinanza_interlocutoria', l: 'Ord. interlocutoria' },
        { v: 'decreto_presidenziale', l: 'Decreto presidenziale' },
    ]

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate border border-white/5 p-4">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Sentenze acquistate</p>
                    <p className="font-display text-2xl font-light text-oro">{acquisti.length}</p>
                </div>
                <div className="bg-slate border border-white/5 p-4">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Totale speso</p>
                    <p className="font-display text-2xl font-light text-salvia">EUR {totaleSpesa.toFixed(2)}</p>
                </div>
            </div>

            {acquisti.length > 0 && (
                <div className="bg-slate border border-white/5 p-4 space-y-3">
                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                        <input
                            placeholder="Cerca per oggetto, organo, categoria..."
                            value={searchTesto}
                            onChange={e => setSearchTesto(e.target.value)}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-nebbia/30">
                            <Filter size={12} />
                            <span className="font-body text-xs uppercase tracking-widest">Filtri</span>
                        </div>

                        {anniDisponibili.length > 0 && (
                            <select value={filtroAnno} onChange={e => setFiltroAnno(e.target.value)}
                                className="bg-petrolio border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40">
                                <option value="">Tutti gli anni</option>
                                {anniDisponibili.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        )}

                        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                            className="bg-petrolio border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40">
                            {TIPI_FILTRO.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                        </select>

                        {(searchTesto || filtroAnno || filtroTipo) && (
                            <button onClick={() => { setSearchTesto(''); setFiltroAnno(''); setFiltroTipo('') }}
                                className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors flex items-center gap-1">
                                <X size={11} /> Reset
                            </button>
                        )}
                    </div>
                </div>
            )}

            {acquisti.length === 0 ? (
                <EmptyState
                    icon={Gavel}
                    title="Nessuna sentenza acquistata"
                    desc="Esplora la banca dati per trovare e acquistare sentenze rilevanti per le tue pratiche."
                />
            ) : acquistiFiltrati.length === 0 ? (
                <div className="py-12 text-center">
                    <p className="font-body text-sm text-nebbia/30">Nessun risultato con questi filtri</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {acquistiFiltrati.map(a => {
                        const s = a.sentenza
                        if (!s) return null
                        const titolo = titoloSentenza(s)
                        const dataSentenza = s.data_pubblicazione ?? s.data_deposito
                        return (
                            <Link
                                key={a.id}
                                to={`/banca-dati/avvocato/${s.id}`}
                                className="block bg-slate border border-white/5 hover:border-oro/20 transition-colors p-5 group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="font-body text-xs text-nebbia/50">{titolo}</span>
                                            {s.tipo_provvedimento && (
                                                <span className="font-body text-[10px] text-nebbia/50 border border-white/10 px-1.5 py-0.5 uppercase tracking-wider">
                                                    {labelTipoProvvedimento(s.tipo_provvedimento)}
                                                </span>
                                            )}
                                            {dataSentenza && (
                                                <span className="font-body text-[10px] text-nebbia/30 flex items-center gap-1">
                                                    <Calendar size={9} /> {new Date(dataSentenza).toLocaleDateString('it-IT')}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-display text-base font-medium text-nebbia group-hover:text-oro transition-colors mb-1">
                                            {s.oggetto ?? 'Sentenza'}
                                        </h3>
                                        {s.principio_diritto && (
                                            <p className="font-body text-xs text-nebbia/50 leading-relaxed line-clamp-2">
                                                {s.principio_diritto}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                                            {s.autore && (
                                                <span className="font-body text-xs text-nebbia/35">
                                                    Di Avv. {s.autore.nome} {s.autore.cognome}
                                                </span>
                                            )}
                                            <span className="font-body text-xs text-nebbia/25">
                                                · Acquistata il {new Date(a.created_at).toLocaleDateString('it-IT')}
                                            </span>
                                            <span className="font-body text-xs text-oro/50">
                                                · EUR {parseFloat(a.prezzo ?? 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2 text-oro/50 group-hover:text-oro transition-colors">
                                        <span className="font-body text-xs">Apri</span>
                                        <ArrowRight size={13} />
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ─── PAGINA PRINCIPALE ───────────────────────────────────────
export default function Archivio() {
    const { profile } = useAuth()
    const location = useLocation()
    const fileInputRef = useRef(null)

    const [tabPrincipale, setTabPrincipale] = useState('documenti')

    const [meId, setMeId] = useState(null)
    const [titolareId, setTitolareId] = useState(null)
    const [documenti, setDocumenti] = useState([])
    const [clienti, setClienti] = useState([])
    const [pratiche, setPratiche] = useState([])
    const [loading, setLoading] = useState(true)

    // ── NUOVO: quota storage e stato piano ────────────────────
    const [quota, setQuota] = useState({
        gb_piano: 0,
        gb_topup: 0,
        gb_totali: 0,
        piano_attivo: false,
        occupato_gb: 0,
    })

    const [filesSelezionati, setFilesSelezionati] = useState([])
    const [fileCorrente, setFileCorrente] = useState(null)
    const [codaUpload, setCodaUpload] = useState([])
    const [uploadInCorso, setUploadInCorso] = useState(false)
    const [erroreUpload, setErroreUpload] = useState('')

    const [modalita, setModalita] = useState('tradizionale')
    const [searchTesto, setSearchTesto] = useState('')
    const [searchLex, setSearchLex] = useState('')
    const [risultati, setRisultati] = useState(null)
    const [cercando, setCercando] = useState(false)
    const [ragionamentoLex, setRagionamentoLex] = useState('')

    const [filtroCategoria, setFiltroCategoria] = useState('')
    const [filtroCliente, setFiltroCliente] = useState('')
    const [filtroStato, setFiltroStato] = useState('')

    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const clienteId = params.get('cliente_id')
        if (clienteId) setFiltroCliente(clienteId)
        const tab = params.get('tab')
        if (tab === 'sentenze') setTabPrincipale('sentenze')
    }, [location.search])

    useEffect(() => {
        async function carica() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            setMeId(user.id)

            const { data: prof } = await supabase
                .from('profiles')
                .select('titolare_id, posti_acquistati')
                .eq('id', user.id)
                .single()

            const tId = prof?.titolare_id ?? user.id
            setTitolareId(tId)

            const { data: docs } = await supabase
                .from('archivio_documenti')
                .select('*')
                .or(`titolare_id.eq.${tId},autore_id.eq.${user.id}`)
                .order('created_at', { ascending: false })
            setDocumenti(docs ?? [])

            const { data: cl } = await supabase
                .from('profiles')
                .select('id, nome, cognome')
                .eq('role', 'cliente')
                .eq('avvocato_id', tId)
            setClienti(cl ?? [])

            const { data: pr } = await supabase
                .from('pratiche')
                .select('id, titolo, cliente_id')
                .eq('avvocato_id', user.id)
                .eq('stato', 'aperta')
                .order('created_at', { ascending: false })
            setPratiche(pr ?? [])

            // Carica quota studio + spazio occupato
            const { data: quotaData } = await supabase.rpc('quota_studio', { p_proprietario_id: tId })
            const q = Array.isArray(quotaData) ? quotaData[0] : quotaData

            const { data: tuttiDocStudio } = await supabase
                .from('archivio_documenti')
                .select('dimensione')
                .eq('titolare_id', tId)

            const occupatoBytes = (tuttiDocStudio ?? []).reduce((s, d) => s + (d.dimensione ?? 0), 0)

            setQuota({
                gb_piano: q?.gb_piano ?? 0,
                gb_topup: q?.gb_topup ?? 0,
                gb_totali: q?.gb_totali ?? 0,
                piano_attivo: q?.piano_attivo ?? false,
                occupato_gb: bytesToGB(occupatoBytes),
            })

            setLoading(false)
        }
        carica()
    }, [])

    useEffect(() => {
        const inElaborazione = documenti.some(d => ['pending', 'processing'].includes(d.ocr_status))
        if (!inElaborazione) return

        const interval = setInterval(async () => {
            const ids = documenti.filter(d => ['pending', 'processing'].includes(d.ocr_status)).map(d => d.id)
            if (ids.length === 0) { clearInterval(interval); return }

            const { data } = await supabase
                .from('archivio_documenti')
                .select('id, ocr_status')
                .in('id', ids)

            if (data) {
                setDocumenti(prev => prev.map(d => {
                    const aggiornato = data.find(a => a.id === d.id)
                    return aggiornato ? { ...d, ocr_status: aggiornato.ocr_status } : d
                }))
                setCodaUpload(prev => prev.map(item => {
                    const aggiornato = data.find(a => a.id === item.documento_id)
                    return aggiornato ? { ...item, status: aggiornato.ocr_status } : item
                }))
            }
        }, 3000)

        return () => clearInterval(interval)
    }, [documenti])

    // ── Calcoli quota / blocchi ────────────────────────────
    const pianoScaduto = !quota.piano_attivo
    const storagePct = quota.gb_totali > 0 ? quota.occupato_gb / quota.gb_totali : 1
    const spazioPieno = quota.gb_totali === 0 || storagePct >= 1
    const spazioQuasiPieno = !spazioPieno && storagePct >= SOGLIA_STORAGE_PIENO
    const uploadDisabilitato = pianoScaduto || spazioPieno

    const motivoBlocco = pianoScaduto
        ? 'Piano scaduto — archivio in sola lettura'
        : spazioPieno
            ? 'Spazio esaurito — libera file o acquista un pacchetto storage'
            : null

    function handleFilesChange(e) {
        // Doppia protezione: blocca upload se piano scaduto o spazio pieno
        if (uploadDisabilitato) {
            setErroreUpload(motivoBlocco)
            e.target.value = ''
            return
        }

        const files = Array.from(e.target.files ?? [])
        if (files.length === 0) return
        if (files.length > MAX_FILES) {
            setErroreUpload(`Puoi caricare massimo ${MAX_FILES} documenti alla volta`)
            return
        }

        // Verifica che il batch non sfori la quota
        const dimensioneTotaleBytes = files.reduce((sum, f) => sum + f.size, 0)
        const dimensioneTotaleGB = bytesToGB(dimensioneTotaleBytes)
        const spazioLiberoGB = quota.gb_totali - quota.occupato_gb

        if (dimensioneTotaleGB > spazioLiberoGB) {
            setErroreUpload(
                `Spazio insufficiente. Stai caricando ${dimensioneTotaleGB.toFixed(2)} GB ma hai solo ${spazioLiberoGB.toFixed(2)} GB liberi.`
            )
            e.target.value = ''
            return
        }

        setErroreUpload('')
        setFilesSelezionati(files)
        setFileCorrente(files[0])
    }

    async function caricaDocumento(file, metadati) {
        const { data: { user } } = await supabase.auth.getUser()
        const ext = file.name.split('.').pop()
        const path = `${titolareId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const tipo = isPdf(file) ? 'pdf' : 'file'

        const { error: upErr } = await supabase.storage.from('archivio').upload(path, file)
        if (upErr) throw new Error(upErr.message)

        const { data: doc, error: dbErr } = await supabase
            .from('archivio_documenti')
            .insert({
                autore_id: user.id,
                titolare_id: titolareId,
                cliente_id: metadati.cliente_id || null,
                pratica_id: metadati.pratica_id || null,
                tipo,
                titolo: metadati.titolo || file.name,
                storage_path: path,
                tipo_file: file.type,
                dimensione: file.size,
                categoria: metadati.categoria || null,
                tags: metadati.tags ? metadati.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                ocr_status: tipo === 'pdf' ? 'pending' : 'skipped',
            })
            .select()
            .single()

        if (dbErr) throw new Error(dbErr.message)
        return doc
    }

    async function avviaUpload(metadati) {
        // Triplice protezione: ricontrolla anche al momento dell'upload effettivo
        if (uploadDisabilitato) {
            setErroreUpload(motivoBlocco)
            setFilesSelezionati([])
            setFileCorrente(null)
            return
        }

        const params = new URLSearchParams(location.search)
        const praticaId = params.get('pratica_id')
        const clienteId = params.get('cliente_id')

        const metadatiCompleti = {
            ...metadati,
            pratica_id: praticaId || '',
            cliente_id: clienteId || '',
        }

        setUploadInCorso(true)
        setFileCorrente(null)

        const filesDaCaricare = filesSelezionati
        const nuovaCoda = filesDaCaricare.map(f => ({
            nome: f.name,
            status: 'pending',
            documento_id: null,
        }))
        setCodaUpload(nuovaCoda)

        const nuoviDocs = []

        for (let i = 0; i < filesDaCaricare.length; i += PARALLEL) {
            const batch = filesDaCaricare.slice(i, i + PARALLEL)
            await Promise.all(batch.map(async (file, j) => {
                const idx = i + j
                try {
                    setCodaUpload(prev => prev.map((item, k) => k === idx ? { ...item, status: 'processing' } : item))
                    const doc = await caricaDocumento(file, metadatiCompleti)
                    nuoviDocs.push(doc)
                    setCodaUpload(prev => prev.map((item, k) => k === idx
                        ? { ...item, status: doc.ocr_status, documento_id: doc.id }
                        : item
                    ))
                } catch (err) {
                    setCodaUpload(prev => prev.map((item, k) => k === idx ? { ...item, status: 'failed' } : item))
                }
            }))
        }

        setDocumenti(prev => [...nuoviDocs, ...prev])
        setFilesSelezionati([])
        setUploadInCorso(false)

        // Aggiorna spazio occupato dopo upload
        const aggiunta = nuoviDocs.reduce((s, d) => s + (d.dimensione ?? 0), 0)
        setQuota(prev => ({ ...prev, occupato_gb: prev.occupato_gb + bytesToGB(aggiunta) }))

        const pdfDocs = nuoviDocs.filter(d => d.tipo === 'pdf')
        for (let i = 0; i < pdfDocs.length; i += PARALLEL) {
            const batch = pdfDocs.slice(i, i + PARALLEL)
            await Promise.all(batch.map(async doc => {
                try {
                    const { data: { session } } = await supabase.auth.getSession()
                    await fetch(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-archivio`,
                        {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${session.access_token}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ documento_id: doc.id }),
                        }
                    )
                } catch (_) { }
            }))
            if (i + PARALLEL < pdfDocs.length) {
                await new Promise(r => setTimeout(r, 1000))
            }
        }
    }

    async function cercaTradizionale() {
        if (!searchTesto.trim()) return
        setCercando(true)
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-archivio`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ domanda: searchTesto, modalita: 'tradizionale' }),
            }
        )
        const json = await res.json()
        if (json.ok) setRisultati(json.risultati)
        setCercando(false)
    }

    async function cercaConLex() {
        if (!searchLex.trim()) return
        setCercando(true)
        setRagionamentoLex('')
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-archivio`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ domanda: searchLex, modalita: 'lex' }),
            }
        )
        const json = await res.json()
        if (json.ok) {
            setRisultati(json.risultati)
            setRagionamentoLex(json.ragionamento ?? '')
        }
        setCercando(false)
    }

    async function eliminaDocumento(doc) {
        if (!confirm(`Eliminare "${doc.titolo}"?`)) return
        if (doc.storage_path) {
            await supabase.storage.from('archivio').remove([doc.storage_path])
        }
        await supabase.from('archivio_documenti').delete().eq('id', doc.id)
        setDocumenti(prev => prev.filter(d => d.id !== doc.id))

        // Aggiorna spazio occupato
        if (doc.dimensione) {
            setQuota(prev => ({ ...prev, occupato_gb: Math.max(0, prev.occupato_gb - bytesToGB(doc.dimensione)) }))
        }

        if (risultati) setRisultati(prev => prev.filter(d => d.id !== doc.id))
    }

    const docsFiltrati = documenti.filter(d => {
        if (filtroCategoria && d.categoria !== filtroCategoria) return false
        if (filtroCliente && d.cliente_id !== filtroCliente) return false
        if (filtroStato && d.ocr_status !== filtroStato) return false
        return true
    })

    const categorie = [...new Set(documenti.map(d => d.categoria).filter(Boolean))]
    const docsInElaborazione = codaUpload.filter(i => ['pending', 'processing'].includes(i.status)).length

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    return (
        <div className="space-y-6">
            <PageHeader
                label="Avvocato"
                title="Archivio"
                subtitle={tabPrincipale === 'documenti'
                    ? `${documenti.length} documenti · ${documenti.filter(d => d.ocr_status === 'completed').length} indicizzati · ${quota.occupato_gb.toFixed(2)}/${quota.gb_totali} GB`
                    : 'Sentenze acquistate dalla banca dati'
                }
                action={tabPrincipale === 'documenti' ? (
                    <label
                        className={`text-sm flex items-center gap-2 ${uploadDisabilitato
                            ? 'cursor-not-allowed bg-white/5 border border-white/10 text-nebbia/30 px-4 py-2'
                            : 'btn-primary cursor-pointer'
                            }`}
                        title={uploadDisabilitato ? motivoBlocco : 'Carica documenti'}
                    >
                        {uploadDisabilitato
                            ? <><Lock size={14} /> Upload bloccato</>
                            : uploadInCorso
                                ? <><span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> Caricamento...</>
                                : <><Upload size={14} /> Carica documenti</>
                        }
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.xlsx,.xls"
                            className="hidden"
                            onChange={handleFilesChange}
                            disabled={uploadInCorso || uploadDisabilitato}
                        />
                    </label>
                ) : (
                    <Link to="/banca-dati" className="btn-secondary text-sm flex items-center gap-2">
                        <Search size={13} /> Esplora banca dati
                    </Link>
                )}
            />

            {/* Tab switcher primario */}
            <div className="flex gap-0 border-b border-white/8">
                <button onClick={() => setTabPrincipale('documenti')}
                    className={`flex items-center gap-2 px-5 py-3 font-body text-sm border-b-2 transition-colors ${tabPrincipale === 'documenti' ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'
                        }`}>
                    <Archive size={14} strokeWidth={1.5} /> Documenti
                </button>
                <button onClick={() => setTabPrincipale('sentenze')}
                    className={`flex items-center gap-2 px-5 py-3 font-body text-sm border-b-2 transition-colors ${tabPrincipale === 'sentenze' ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'
                        }`}>
                    <Gavel size={14} strokeWidth={1.5} /> Sentenze acquistate
                </button>
            </div>

            {/* ═══ TAB DOCUMENTI ═══ */}
            {tabPrincipale === 'documenti' && (
                <>
                    {/* ─── BANNER STATO ARCHIVIO ─── */}
                    {pianoScaduto && (
                        <div className="border bg-red-900/10 border-red-500/30 p-4 flex items-start gap-3">
                            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-body text-sm font-medium text-red-400">Piano scaduto — archivio in sola lettura</p>
                                <p className="font-body text-xs text-red-400/70 mt-1">
                                    I tuoi {documenti.length} documenti restano accessibili e cercabili, ma non puoi caricarne di nuovi finché non rinnovi il piano.
                                </p>
                                <Link to="/studio?tab=acquista" className="mt-2 inline-block font-body text-xs text-oro border border-oro/30 px-3 py-1 hover:bg-oro/10 transition-colors">
                                    Rinnova ora →
                                </Link>
                            </div>
                        </div>
                    )}

                    {!pianoScaduto && spazioPieno && (
                        <div className="border bg-red-900/10 border-red-500/30 p-4 flex items-start gap-3">
                            <HardDrive size={16} className="text-red-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-body text-sm font-medium text-red-400">Spazio archivio esaurito</p>
                                <p className="font-body text-xs text-red-400/70 mt-1">
                                    Hai usato {quota.occupato_gb.toFixed(2)} GB su {quota.gb_totali} GB disponibili. Libera spazio o acquista un pacchetto extra.
                                </p>
                                <Link to="/studio?tab=acquista" className="mt-2 inline-block font-body text-xs text-oro border border-oro/30 px-3 py-1 hover:bg-oro/10 transition-colors">
                                    Acquista storage →
                                </Link>
                            </div>
                        </div>
                    )}

                    {!pianoScaduto && !spazioPieno && spazioQuasiPieno && (
                        <div className="border bg-amber-900/10 border-amber-500/20 p-4 flex items-start gap-3">
                            <HardDrive size={16} className="text-amber-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-body text-sm font-medium text-amber-400">
                                    Archivio quasi pieno — {(storagePct * 100).toFixed(0)}% occupato
                                </p>
                                <p className="font-body text-xs text-amber-400/70 mt-1">
                                    {quota.occupato_gb.toFixed(2)} GB su {quota.gb_totali} GB. Considera di acquistare spazio extra prima di riempire l'archivio.
                                </p>
                                <Link to="/studio?tab=acquista" className="mt-2 inline-block font-body text-xs text-oro border border-oro/30 px-3 py-1 hover:bg-oro/10 transition-colors">
                                    Acquista storage →
                                </Link>
                            </div>
                        </div>
                    )}

                    {erroreUpload && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={13} /> {erroreUpload}
                        </div>
                    )}

                    {codaUpload.length > 0 && (
                        <BarraProgresso items={codaUpload} />
                    )}

                    {fileCorrente && filesSelezionati.length > 0 && (
                        <div className="space-y-3">
                            <div className="bg-petrolio/40 border border-white/5 p-4">
                                <p className="font-body text-sm text-nebbia mb-2">
                                    {filesSelezionati.length === 1
                                        ? 'Inserisci i metadati per il documento'
                                        : `Inserisci i metadati comuni per ${filesSelezionati.length} documenti`
                                    }
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {filesSelezionati.map((f, i) => (
                                        <span key={i} className="flex items-center gap-1.5 font-body text-xs px-2 py-1 bg-slate border border-white/8 text-nebbia/50">
                                            {isPdf(f) ? <FileText size={10} className="text-oro/50" /> : <File size={10} />}
                                            {f.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <FormMetadati
                                file={fileCorrente}
                                onSalva={metadati => avviaUpload(metadati)}
                                onAnnulla={() => { setFilesSelezionati([]); setFileCorrente(null) }}
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-6 px-4 py-2.5 bg-petrolio/30 border border-white/5">
                        <p className="font-body text-xs text-nebbia/25 uppercase tracking-widest shrink-0">Visibilità</p>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-oro/50" />
                            <p className="font-body text-xs text-nebbia/35">Collegato a cliente — solo chi lo gestisce</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-salvia/50" />
                            <p className="font-body text-xs text-nebbia/35">Non collegato — tutto lo studio</p>
                        </div>
                    </div>

                    <div className="bg-slate border border-white/5 p-5 space-y-4">
                        <div className="flex gap-1 bg-petrolio border border-white/5 p-1 w-fit">
                            <button
                                onClick={() => { setModalita('tradizionale'); setRisultati(null) }}
                                className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${modalita === 'tradizionale' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'}`}
                            >
                                <Search size={13} /> Ricerca tradizionale
                            </button>
                            <button
                                onClick={() => { setModalita('lex'); setRisultati(null) }}
                                className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${modalita === 'lex' ? 'bg-salvia/10 text-salvia border border-salvia/30' : 'text-nebbia/40 hover:text-nebbia'}`}
                            >
                                <Sparkles size={13} /> Cerca con Lex
                            </button>
                        </div>

                        {modalita === 'tradizionale' ? (
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                                    <input
                                        placeholder="Cerca per titolo, categoria o contenuto..."
                                        value={searchTesto}
                                        onChange={e => setSearchTesto(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && cercaTradizionale()}
                                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                    />
                                </div>
                                <button onClick={cercaTradizionale} disabled={cercando || !searchTesto.trim()}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40">
                                    <Search size={13} /> Cerca
                                </button>
                                {risultati && (
                                    <button onClick={() => setRisultati(null)}
                                        className="px-3 py-2.5 border border-white/10 text-nebbia/40 font-body text-sm hover:text-nebbia transition-colors">
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="font-body text-xs text-nebbia/35 leading-relaxed">
                                    Descrivi cosa stai cercando — Lex troverà i documenti più pertinenti nel tuo archivio. ATTENZIONE: Lex legge solo i file che sono stati verificati
                                </p>
                                <textarea
                                    rows={3}
                                    placeholder="Es. Tutti i contratti di locazione del 2023..."
                                    value={searchLex}
                                    onChange={e => setSearchLex(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) cercaConLex() }}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 resize-none placeholder:text-nebbia/25"
                                />
                                <button
                                    onClick={cercaConLex}
                                    disabled={cercando || !searchLex.trim()}
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40"
                                >
                                    {cercando
                                        ? <><span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" /> Lex sta cercando...</>
                                        : <><Sparkles size={13} /> Cerca con Lex</>
                                    }
                                </button>

                                {ragionamentoLex && (
                                    <div className="bg-slate border border-salvia/15 p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sparkles size={12} className="text-salvia" />
                                            <p className="font-body text-xs font-medium text-salvia">Analisi Lex</p>
                                        </div>
                                        <p className="font-body text-xs text-nebbia/55 leading-relaxed">{ragionamentoLex}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-1.5 text-nebbia/30">
                            <Filter size={12} />
                            <span className="font-body text-xs uppercase tracking-widest">Filtri</span>
                        </div>

                        {categorie.length > 0 && (
                            <select
                                value={filtroCategoria}
                                onChange={e => setFiltroCategoria(e.target.value)}
                                className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40"
                            >
                                <option value="">Tutte le categorie</option>
                                {categorie.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}

                        {clienti.length > 0 && (
                            <select
                                value={filtroCliente}
                                onChange={e => setFiltroCliente(e.target.value)}
                                className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40"
                            >
                                <option value="">Tutti i clienti</option>
                                {clienti.map(c => <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>)}
                            </select>
                        )}

                        <select
                            value={filtroStato}
                            onChange={e => setFiltroStato(e.target.value)}
                            className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40"
                        >
                            <option value="">Tutti gli stati</option>
                            <option value="completed">Completati</option>
                            <option value="pending">In coda</option>
                            <option value="failed">Errore</option>
                            <option value="skipped">Manuale</option>
                        </select>

                        {(filtroCategoria || filtroCliente || filtroStato) && (
                            <button
                                onClick={() => { setFiltroCategoria(''); setFiltroCliente(''); setFiltroStato('') }}
                                className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors flex items-center gap-1"
                            >
                                <X size={11} /> Reset filtri
                            </button>
                        )}
                    </div>

                    {risultati !== null ? (
                        <div className="space-y-3">
                            <p className="font-body text-xs text-nebbia/40">
                                {risultati.length} {risultati.length === 1 ? 'risultato' : 'risultati'} per "{modalita === 'tradizionale' ? searchTesto : searchLex}"
                            </p>
                            {risultati.length === 0 ? (
                                <div className="py-10 text-center">
                                    <p className="font-body text-sm text-nebbia/30">Nessun documento trovato</p>
                                </div>
                            ) : risultati.map(doc => (
                                <div key={doc.id}>
                                    <CardDocumento doc={doc} onElimina={eliminaDocumento} clienti={clienti} />
                                    {doc.chunk_rilevante && (
                                        <div className="bg-petrolio/40 border border-salvia/10 border-t-0 px-4 py-3">
                                            <p className="font-body text-xs text-salvia/50 mb-1">Sezione rilevante</p>
                                            <p className="font-body text-xs text-nebbia/45 leading-relaxed line-clamp-3">
                                                {doc.chunk_rilevante}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="font-body text-xs text-nebbia/30">
                                {docsFiltrati.length} documenti
                                {docsInElaborazione > 0 && (
                                    <span className="ml-2 text-oro/60">· {docsInElaborazione} in elaborazione</span>
                                )}
                            </p>
                            {docsFiltrati.length === 0 ? (
                                <EmptyState
                                    icon={FileText}
                                    title="Nessun documento"
                                    desc="Carica i documenti del tuo archivio per indicizzarli e renderli cercabili"
                                />
                            ) : docsFiltrati.map(doc => (
                                <CardDocumento key={doc.id} doc={doc} onElimina={eliminaDocumento} clienti={clienti} />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ═══ TAB SENTENZE ACQUISTATE ═══ */}
            {tabPrincipale === 'sentenze' && (
                <TabSentenzeAcquistate meId={meId} />
            )}
        </div>
    )
}