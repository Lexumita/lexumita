// src/pages/avvocato/PraticaDettaglio.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Badge } from '@/components/shared'
import {
    Plus, Search, FileText, Calendar, Sparkles, X, Save, AlertCircle,
    Download, Gavel, ChevronRight, Clock, MapPin, ArrowLeft, StickyNote
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import UdienzaModal from '@/components/UdienzaModal'
import ContropartiBox from '@/components/ContropartiBox'
import ChatPratica from '@/components/ChatPratica'
import GeneraDocumentoMenu from '@/components/GeneraDocumentoMenu'

const STATI = {
    aperta: { label: 'Aperta', variant: 'salvia' },
    chiusa: { label: 'Chiusa', variant: 'gray' },
}

async function caricaContesto(userId) {
    const { data: profilo } = await supabase
        .from('profiles').select('posti_acquistati').eq('id', userId).single()
    const haStudio = (profilo?.posti_acquistati ?? 1) > 1
    let collaboratori = []
    if (haStudio) {
        const { data: c } = await supabase
            .from('profiles').select('id, nome, cognome').eq('titolare_id', userId)
        collaboratori = c ?? []
    }
    return { haStudio, collaboratori, ids: [userId, ...collaboratori.map(c => c.id)] }
}

// ─────────────────────────────────────────────────────────────
// MINI EMPTY
// ─────────────────────────────────────────────────────────────
function MiniEmpty({ icon: Icon, label }) {
    return (
        <div className="flex items-center gap-2 py-3 px-1 text-nebbia/30">
            <Icon size={13} />
            <span className="font-body text-xs">{label}</span>
        </div>
    )
}

function BackToPratiche() {
    return (
        <Link
            to="/pratiche"
            className="inline-flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors"
        >
            <ArrowLeft size={11} /> Tutte le pratiche
        </Link>
    )
}

// ─────────────────────────────────────────────────────────────
// NOTE MODAL
// ─────────────────────────────────────────────────────────────
function NoteInterneModal({ note, setNote, onSalva, salvando, ultimaModifica, onClose }) {
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-slate border border-white/10 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <StickyNote size={14} className="text-oro" />
                        <p className="font-body text-sm font-medium text-nebbia">Note interne</p>
                        <span className="font-body text-xs text-nebbia/30">— solo di questa pratica</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-nebbia/40 hover:text-nebbia transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    <textarea
                        rows={12}
                        autoFocus
                        placeholder="Note interne sulla pratica — strategia, promemoria, osservazioni..."
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                    />
                    <p className="font-body text-xs text-nebbia/30 mt-2">
                        Queste note sono visibili solo a te e ai collaboratori della pratica. Non vengono lette da Lex AI né dal generatore di documenti.
                    </p>
                </div>

                <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/5 shrink-0">
                    <p className="font-body text-xs text-nebbia/30">
                        {ultimaModifica
                            ? `Ultima modifica: ${ultimaModifica.autore} · ${ultimaModifica.data}`
                            : 'Mai modificate'}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors"
                        >
                            Chiudi
                        </button>
                        <button
                            onClick={onSalva}
                            disabled={salvando}
                            className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-40"
                        >
                            {salvando
                                ? <span className="animate-spin w-3 h-3 border-2 border-petrolio border-t-transparent rounded-full" />
                                : <><Save size={11} /> Salva note</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// RICERCA ESPANDIBILE
// ─────────────────────────────────────────────────────────────
function RicercaEspandibile({ contenuto, id, tipo, onSalva }) {
    const [espansa, setEspansa] = useState(false)
    const [modifica, setModifica] = useState(false)
    const [contenutoEdit, setContenutoEdit] = useState(contenuto ?? '')
    const [salvando, setSalvando] = useState(false)

    async function salva() {
        setSalvando(true)
        await supabase.from('ricerche').update({ contenuto: contenutoEdit }).eq('id', id)
        setModifica(false)
        if (onSalva) await onSalva()
        setSalvando(false)
    }

    if (modifica) return (
        <div className="ml-5 space-y-2 mt-1">
            <textarea
                rows={5}
                value={contenutoEdit}
                onChange={e => setContenutoEdit(e.target.value)}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50 resize-none"
            />
            <div className="flex gap-2">
                <button
                    onClick={salva}
                    disabled={salvando}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40"
                >
                    {salvando
                        ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                        : <><Save size={10} /> Salva</>
                    }
                </button>
                <button
                    onClick={() => { setModifica(false); setContenutoEdit(contenuto ?? '') }}
                    className="px-3 py-1.5 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors"
                >
                    Annulla
                </button>
            </div>
        </div>
    )

    return (
        <div className="ml-5 mt-1">
            {tipo === 'ricerca_ai' || tipo === 'chat_lex' ? (
                <div className={`font-body text-xs text-nebbia/50 leading-relaxed ${espansa ? '' : 'line-clamp-3'}`}>
                    <ReactMarkdown
                        components={{
                            h2: ({ children }) => <h2 className="font-body text-xs font-semibold text-nebbia mt-2 mb-1">{children}</h2>,
                            h3: ({ children }) => <h3 className="font-body text-xs font-semibold text-nebbia/70 mt-1 mb-0.5">{children}</h3>,
                            strong: ({ children }) => <strong className="font-semibold text-nebbia/70">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li className="font-body text-xs">{children}</li>,
                            p: ({ children }) => <p className="font-body text-xs text-nebbia/50 leading-relaxed mb-1">{children}</p>,
                        }}
                    >
                        {contenuto}
                    </ReactMarkdown>
                </div>
            ) : (
                <p className={`font-body text-xs text-nebbia/50 leading-relaxed ${espansa ? 'whitespace-pre-line' : 'line-clamp-3'}`}>
                    {contenuto}
                </p>
            )}
            <div className="flex items-center gap-3 mt-1">
                <button
                    onClick={() => setEspansa(!espansa)}
                    className="font-body text-xs text-nebbia/25 hover:text-nebbia/50 transition-colors"
                >
                    {espansa ? '▲ Riduci' : '▼ Espandi'}
                </button>
                {tipo === 'ricerca_manuale' && (
                    <button
                        onClick={() => setModifica(true)}
                        className="font-body text-xs text-nebbia/25 hover:text-oro transition-colors"
                    >
                        Modifica
                    </button>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function PraticaDettaglio() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [pratica, setPratica] = useState(null)
    const [collabPratica, setCP] = useState([])
    const [collabs, setCollabs] = useState([])
    const [isStudio, setIsStudio] = useState(false)
    const [meId, setMeId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [note, setNote] = useState('')
    const [salvandoNote, setSalvando] = useState(false)
    const [mostraNoteModal, setMostraNoteModal] = useState(false)

    const [mostraEsito, setMostraEsito] = useState(false)
    const [esito, setEsito] = useState('')

    const [noteEsito, setNoteEsito] = useState('')
    const [salvandoNoteEsito, setSalvandoNoteEsito] = useState(false)

    const [ricerche, setRicerche] = useState([])
    const [loadingRicerche, setLoadingRicerche] = useState(false)
    const [mostraFormRicerca, setMostraForm] = useState(false)
    const [nuovaRicerca, setNuovaRicerca] = useState({ titolo: '', contenuto: '' })
    const [salvandoRicerca, setSalvandoRicerca] = useState(false)
    const [erroreRicerca, setErroreRicerca] = useState(null)

    const [udienze, setUdienze] = useState([])
    const [loadingUdienze, setLoadingUdienze] = useState(false)
    const [udienzaModale, setUdienzaModale] = useState(null)

    const [documenti, setDocumenti] = useState([])
    const [loadingDocs, setLoadingDocs] = useState(false)
    const [caricandoDoc, setCaricandoDoc] = useState(false)
    const [erroreDoc, setErroreDoc] = useState(null)

    async function caricaRicerche() {
        setLoadingRicerche(true)
        const { data } = await supabase
            .from('ricerche')
            .select('id, tipo, titolo, contenuto, metadati, created_at, autore:autore_id(nome, cognome)')
            .eq('pratica_id', id)
            .in('tipo', ['ricerca_ai', 'ricerca_manuale', 'chat_lex'])
            .order('created_at', { ascending: false })
        setRicerche(data ?? [])
        setLoadingRicerche(false)
    }

    async function caricaUdienze() {
        setLoadingUdienze(true)
        const { data } = await supabase
            .from('udienze')
            .select('*')
            .eq('pratica_id', id)
            .order('data_ora', { ascending: false })
        setUdienze(data ?? [])
        setLoadingUdienze(false)
    }

    useEffect(() => {
        async function load() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            setMeId(user.id)

            const { data: p } = await supabase
                .from('pratiche')
                .select('id, titolo, tipo, stato, note, note_esito, esito, created_at, prossima_udienza, avvocato_id, cliente_id, cliente:cliente_id(id, nome, cognome, ragione_sociale, tipo_soggetto), aggiornato_da, aggiornatore:aggiornato_da(nome, cognome), updated_at')
                .eq('id', id).single()
            if (p) { setPratica(p); setNote(p.note ?? ''); setNoteEsito(p.note_esito ?? '') }

            const { data: cp } = await supabase
                .from('pratica_collaboratori')
                .select('avvocato_id, profilo:avvocato_id(id, nome, cognome)')
                .eq('pratica_id', id)
            setCP(cp?.map(c => ({ id: c.profilo.id, nome: `${c.profilo.nome} ${c.profilo.cognome}` })) ?? [])

            const ctx = await caricaContesto(user.id)
            setIsStudio(ctx.haStudio)
            setCollabs(ctx.collaboratori)

            await caricaRicerche()
            await caricaDocumenti()
            await caricaUdienze()
            setLoading(false)
        }
        load()
    }, [id])

    async function salvaNote() {
        setSalvando(true)
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('pratiche').update({
            note,
            aggiornato_da: user.id,
            updated_at: new Date().toISOString()
        }).eq('id', id)
        const { data: p } = await supabase
            .from('pratiche')
            .select('aggiornatore:aggiornato_da(nome, cognome), updated_at')
            .eq('id', id).single()
        if (p) setPratica(prev => ({ ...prev, ...p }))
        setSalvando(false)
    }

    async function caricaDocumenti() {
        setLoadingDocs(true)
        const { data } = await supabase
            .from('documenti_pratiche')
            .select('id, nome_file, storage_path, dimensione, tipo_file, created_at, autore:autore_id(nome, cognome)')
            .eq('pratica_id', id)
            .order('created_at', { ascending: false })
        setDocumenti(data ?? [])
        setLoadingDocs(false)
    }

    async function uploadDocumento(file) {
        if (!file) return
        setCaricandoDoc(true)
        setErroreDoc(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const ext = file.name.split('.').pop()
            const path = `${id}/${Date.now()}.${ext}`

            const { error: upErr } = await supabase.storage
                .from('documenti')
                .upload(path, file)
            if (upErr) throw new Error(upErr.message)

            await supabase.from('documenti_pratiche').insert({
                pratica_id: id,
                autore_id: user.id,
                nome_file: file.name,
                storage_path: path,
                dimensione: file.size,
                tipo_file: file.type,
            })
            await caricaDocumenti()
        } catch (e) {
            setErroreDoc(e.message)
        } finally {
            setCaricandoDoc(false)
        }
    }

    async function scaricaDocumento(doc) {
        const { data } = await supabase.storage
            .from('documenti')
            .createSignedUrl(doc.storage_path, 3600)
        if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    }

    async function eliminaDocumento(doc) {
        if (!confirm(`Eliminare "${doc.nome_file}"?`)) return
        await supabase.storage.from('documenti').remove([doc.storage_path])
        await supabase.from('documenti_pratiche').delete().eq('id', doc.id)
        setDocumenti(prev => prev.filter(d => d.id !== doc.id))
    }

    async function salvaRicercaManuale() {
        setErroreRicerca(null)
        if (!nuovaRicerca.contenuto.trim()) return setErroreRicerca('Il contenuto è obbligatorio')
        setSalvandoRicerca(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('ricerche').insert({
                pratica_id: id,
                user_id: user.id,
                autore_id: user.id,
                tipo: 'ricerca_manuale',
                titolo: nuovaRicerca.titolo.trim() || 'Ricerca manuale',
                contenuto: nuovaRicerca.contenuto.trim(),
                metadati: {
                    ts: new Date().toISOString(),
                }
            })
            setNuovaRicerca({ titolo: '', contenuto: '' })
            setMostraForm(false)
            await caricaRicerche()
        } catch (e) {
            setErroreRicerca(e.message)
        } finally {
            setSalvandoRicerca(false)
        }
    }

    async function eliminaRicerca(ricercaId) {
        if (!confirm('Eliminare questa ricerca?')) return
        await supabase.from('ricerche').delete().eq('id', ricercaId)
        setRicerche(prev => prev.filter(r => r.id !== ricercaId))
    }

    async function toggleCollab(membroId) {
        const esiste = collabPratica.find(c => c.id === membroId)
        if (esiste) {
            await supabase.from('pratica_collaboratori').delete().eq('pratica_id', id).eq('avvocato_id', membroId)
            setCP(prev => prev.filter(c => c.id !== membroId))
        } else {
            await supabase.from('pratica_collaboratori').insert({ pratica_id: id, avvocato_id: membroId })
            const m = collabs.find(c => c.id === membroId)
            if (m) setCP(prev => [...prev, { id: m.id, nome: `${m.nome} ${m.cognome}` }])
        }
    }

    function ora_corrente_globale() {
        return new Date()
    }

    function nomeClienteDisplay(c) {
        if (!c) return '—'
        if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
        return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
    }

    if (loading) return (
        <div className="flex justify-center py-40">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    if (!pratica) return (
        <div className="space-y-5 p-6">
            <BackToPratiche />
            <p className="font-body text-sm text-nebbia/40">Pratica non trovata.</p>
        </div>
    )

    const sc = STATI[pratica.stato] ?? STATI.aperta
    const nomeAvv = pratica.avvocato_id === meId ? 'Tu'
        : (() => { const c = collabs.find(c => c.id === pratica.avvocato_id); return c ? `${c.nome} ${c.cognome}` : '—' })()
    const collabDisp = collabs.filter(c => c.id !== pratica.avvocato_id && !collabPratica.find(cp => cp.id === c.id))
    const haNote = note && note.trim().length > 0
    const ultimaModifica = pratica.aggiornatore
        ? {
            autore: `${pratica.aggiornatore.nome} ${pratica.aggiornatore.cognome}`,
            data: new Date(pratica.updated_at).toLocaleDateString('it-IT')
        }
        : null

    return (
        <div className="space-y-5 p-6">
            {/* ═══════════════ Header ═══════════════ */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="section-label mb-2">Pratica</p>
                    <h1 className="font-display text-4xl font-light text-nebbia">{pratica.titolo}</h1>
                    <p className="font-body text-sm text-nebbia/40 mt-1">
                        {nomeClienteDisplay(pratica.cliente)} · {pratica.tipo ?? '—'}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-3 shrink-0">
                    <BackToPratiche />
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <button
                            onClick={() => setMostraNoteModal(true)}
                            className="relative flex items-center gap-1.5 font-body text-xs text-nebbia/60 border border-white/15 hover:border-oro/40 hover:text-oro hover:bg-oro/5 px-3 py-1.5 transition-colors"
                        >
                            <StickyNote size={11} />
                            Note interne
                            {haNote && (
                                <span className="w-1.5 h-1.5 rounded-full bg-oro ml-0.5" />
                            )}
                        </button>

                        <Badge label={sc.label} variant={sc.variant} />
                        {pratica.stato === 'aperta' ? (
                            mostraEsito ? (
                                <div className="flex items-center gap-2 bg-slate border border-white/10 p-2">
                                    <select
                                        value={esito}
                                        onChange={e => setEsito(e.target.value)}
                                        className="bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-1.5 outline-none focus:border-oro/50"
                                    >
                                        <option value="">Seleziona esito</option>
                                        <option value="vinta">Vinta</option>
                                        <option value="persa">Persa</option>
                                        <option value="transatta">Transatta</option>
                                        <option value="archiviata">Archiviata</option>
                                    </select>
                                    <button
                                        onClick={async () => {
                                            if (!esito) return
                                            await supabase.from('pratiche').update({ stato: 'chiusa', esito }).eq('id', id)
                                            setPratica(prev => ({ ...prev, stato: 'chiusa', esito }))
                                            setMostraEsito(false)
                                        }}
                                        className="font-body text-xs text-red-400 border border-red-500/30 px-3 py-1.5 hover:bg-red-500/10 transition-colors"
                                    >
                                        Conferma chiusura
                                    </button>
                                    <button
                                        onClick={() => { setMostraEsito(false); setEsito('') }}
                                        className="font-body text-xs text-nebbia/30 hover:text-nebbia transition-colors px-2"
                                    >
                                        Annulla
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setMostraEsito(true)}
                                    className="font-body text-xs text-nebbia/50 hover:text-red-400 border border-white/15 hover:border-red-500/30 hover:bg-red-500/5 px-3 py-1.5 transition-colors"
                                >
                                    Chiudi pratica
                                </button>
                            )
                        ) : (
                            <button
                                onClick={async () => {
                                    await supabase.from('pratiche').update({ stato: 'aperta', esito: null }).eq('id', id)
                                    setPratica(prev => ({ ...prev, stato: 'aperta', esito: null }))
                                }}
                                className="font-body text-xs text-salvia/70 border border-salvia/30 bg-salvia/5 hover:bg-salvia/15 px-3 py-1.5 transition-colors"
                            >
                                Riapri pratica
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════════════ SEZIONE 1 — Top con Ricerche fissa ═══════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

                {/* Sinistra (3/5) — auto height */}
                <div className="lg:col-span-3 space-y-5">

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                        {/* Dettagli — auto */}
                        <div className="bg-slate border border-white/5 p-5 space-y-3">
                            <p className="section-label">Dettagli</p>
                            {[
                                ['Cliente', nomeClienteDisplay(pratica.cliente)],
                                ['Tipo', pratica.tipo ?? '—'],
                                ['Creata il', new Date(pratica.created_at).toLocaleDateString('it-IT')],
                                ...(pratica.esito ? [['Esito', (
                                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-body border ${pratica.esito === 'vinta' ? 'bg-salvia/15 text-salvia border-salvia/30' :
                                        pratica.esito === 'persa' ? 'bg-red-900/20 text-red-400 border-red-500/30' :
                                            pratica.esito === 'transatta' ? 'bg-amber-900/20 text-amber-400 border-amber-500/30' :
                                                'bg-white/5 text-nebbia/40 border-white/10'
                                        }`}>
                                        {pratica.esito.charAt(0).toUpperCase() + pratica.esito.slice(1)}
                                    </span>
                                )]] : []),
                                ...(isStudio ? [['Avvocato', nomeAvv]] : []),
                            ].map(([l, v]) => (
                                <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                    <span className="font-body text-sm text-nebbia">{v}</span>
                                </div>
                            ))}
                            {isStudio && (
                                <div>
                                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-2">Collaboratori</p>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {collabPratica.length === 0
                                            ? <span className="font-body text-xs text-nebbia/25 italic">Nessun collaboratore</span>
                                            : collabPratica.map(c => (
                                                <span key={c.id} className="flex items-center gap-1 font-body text-xs px-2 py-1 bg-salvia/10 border border-salvia/25 text-salvia">
                                                    {c.nome}
                                                    <button onClick={() => toggleCollab(c.id)} className="text-salvia/50 hover:text-red-400 ml-0.5">×</button>
                                                </span>
                                            ))
                                        }
                                    </div>
                                    {collabDisp.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {collabDisp.map(c => (
                                                <button key={c.id} onClick={() => toggleCollab(c.id)}
                                                    className="font-body text-xs px-2 py-1 border border-white/10 text-nebbia/30 hover:border-salvia/30 hover:text-salvia transition-colors">
                                                    + {c.nome} {c.cognome}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Udienze — auto */}
                        <div className="bg-slate border border-white/5 p-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="section-label flex items-center gap-2">
                                    <Gavel size={12} className="text-oro/60" />
                                    Udienze ({udienze.length})
                                </p>
                                <button
                                    onClick={() => setUdienzaModale({})}
                                    className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors"
                                >
                                    <Plus size={11} /> Aggiungi
                                </button>
                            </div>
                            {loadingUdienze ? (
                                <div className="flex justify-center py-6">
                                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                                </div>
                            ) : udienze.length === 0 ? (
                                <MiniEmpty icon={Gavel} label="Nessuna udienza programmata" />
                            ) : (
                                <div className="space-y-2 max-h-[280px] overflow-y-auto -mr-1 pr-1">
                                    {udienze.map(u => {
                                        const dataU = new Date(u.data_ora)
                                        const ora = ora_corrente_globale()
                                        const isPassata = dataU < ora && u.stato === 'programmata'
                                        const isProssima = u.stato === 'programmata' && dataU >= ora &&
                                            !udienze.some(u2 => u2.stato === 'programmata' &&
                                                new Date(u2.data_ora) >= ora &&
                                                new Date(u2.data_ora) < dataU)

                                        const statoColors = {
                                            programmata: isProssima
                                                ? 'border-oro/40 bg-oro/5'
                                                : isPassata
                                                    ? 'border-amber-500/30 bg-amber-500/5'
                                                    : 'border-white/10',
                                            svolta: 'border-salvia/30 bg-salvia/5',
                                            rinviata: 'border-amber-500/30 bg-amber-500/5',
                                            annullata: 'border-white/10 opacity-50',
                                        }

                                        return (
                                            <button
                                                key={u.id}
                                                onClick={() => setUdienzaModale(u)}
                                                className={`w-full text-left p-3 border ${statoColors[u.stato]} hover:border-oro/50 transition-colors group`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <span className={`font-body text-sm font-medium ${isProssima ? 'text-oro' : 'text-nebbia'}`}>
                                                                {dataU.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </span>
                                                            <span className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                                                                <Clock size={10} />
                                                                {dataU.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            {isProssima && (
                                                                <span className="font-body text-[10px] text-oro border border-oro/30 px-1.5 py-0.5 uppercase tracking-wider">
                                                                    Prossima
                                                                </span>
                                                            )}
                                                            {isPassata && (
                                                                <span className="font-body text-[10px] text-amber-400 border border-amber-500/30 px-1.5 py-0.5 uppercase tracking-wider">
                                                                    Da aggiornare
                                                                </span>
                                                            )}
                                                            {u.stato !== 'programmata' && (
                                                                <span className={`font-body text-[10px] px-1.5 py-0.5 uppercase tracking-wider border ${u.stato === 'svolta' ? 'border-salvia/30 text-salvia' :
                                                                    u.stato === 'rinviata' ? 'border-amber-500/30 text-amber-400' :
                                                                        'border-white/10 text-nebbia/40'
                                                                    }`}>
                                                                    {u.stato}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="font-body text-sm text-nebbia/70 truncate">{u.tipo}</p>
                                                        {u.tribunale && (
                                                            <p className="font-body text-xs text-nebbia/40 mt-0.5 flex items-center gap-1">
                                                                <MapPin size={9} />
                                                                {[u.tribunale, u.sezione].filter(Boolean).join(' · ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <ChevronRight size={13} className="text-nebbia/20 group-hover:text-oro transition-colors shrink-0 mt-1" />
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controparti — auto */}
                    <ContropartiBox praticaId={id} />

                    {/* Documenti — auto */}
                    <div className="bg-slate border border-white/5 p-5">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <p className="section-label">Documenti pratica ({documenti.length})</p>
                            <div className="flex items-center gap-2">
                                <label className={`flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs cursor-pointer hover:bg-oro/20 transition-colors ${caricandoDoc ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {caricandoDoc
                                        ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                                        : <Plus size={11} />
                                    }
                                    {caricandoDoc ? 'Caricamento...' : 'Carica documento'}
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={e => uploadDocumento(e.target.files?.[0])}
                                        disabled={caricandoDoc}
                                    />
                                </label>
                                <a
                                    href={`/archivio?pratica_id=${id}`}
                                    className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors"
                                >
                                    Vai all'archivio →
                                </a>
                            </div>
                        </div>
                        {erroreDoc && (
                            <p className="font-body text-xs text-red-400 flex items-center gap-1.5 mb-3">
                                <AlertCircle size={11} />{erroreDoc}
                            </p>
                        )}
                        {loadingDocs ? (
                            <div className="flex justify-center py-6">
                                <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                            </div>
                        ) : documenti.length === 0 ? (
                            <div className="flex items-center gap-2 py-[30px] px-1 text-nebbia/30">
                                <FileText size={14} />
                                <span className="font-body text-xs">Nessun documento — carica i file relativi alla pratica</span>
                            </div>
                        ) : (
                            <div className={`space-y-2 ${documenti.length > 5 ? 'max-h-80 overflow-y-auto -mr-1 pr-1' : ''}`}>
                                {documenti.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between gap-3 p-3 bg-petrolio border border-white/5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <FileText size={14} className="text-nebbia/30 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-body text-sm text-nebbia truncate">{doc.nome_file}</p>
                                                <p className="font-body text-xs text-nebbia/30 mt-0.5">
                                                    {doc.autore ? `${doc.autore.nome} ${doc.autore.cognome}` : '—'} · {new Date(doc.created_at).toLocaleDateString('it-IT')}
                                                    {doc.dimensione && ` · ${(doc.dimensione / 1024 / 1024).toFixed(1)} MB`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => scaricaDocumento(doc)} className="text-nebbia/30 hover:text-oro transition-colors">
                                                <Download size={13} />
                                            </button>
                                            <button onClick={() => eliminaDocumento(doc)} className="text-nebbia/30 hover:text-red-400 transition-colors">
                                                <X size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Destra (2/5) — Ricerche con altezza fissa */}
                <div className="lg:col-span-2 bg-slate border border-white/5 flex flex-col h-[600px]">

                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                        <p className="section-label">Ricerche ({ricerche.length})</p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate('/banca-dati')}
                                className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors flex items-center gap-1"
                            >
                                <Search size={11} /> Cerca in Banca Dati
                            </button>
                            <button
                                onClick={() => setMostraForm(!mostraFormRicerca)}
                                className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors"
                            >
                                <Plus size={11} /> Aggiungi
                            </button>
                        </div>
                    </div>

                    {mostraFormRicerca && (
                        <div className="px-4 py-3 border-b border-white/5 bg-petrolio/30 shrink-0 space-y-3">
                            <input
                                placeholder="Titolo ricerca (opzionale)..."
                                value={nuovaRicerca.titolo}
                                onChange={e => setNuovaRicerca(p => ({ ...p, titolo: e.target.value }))}
                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <textarea
                                rows={4}
                                placeholder="Scrivi il tuo ragionamento legale..."
                                value={nuovaRicerca.contenuto}
                                onChange={e => setNuovaRicerca(p => ({ ...p, contenuto: e.target.value }))}
                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                            />
                            {erroreRicerca && (
                                <p className="font-body text-xs text-red-400 flex items-center gap-1">
                                    <AlertCircle size={10} />{erroreRicerca}
                                </p>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={salvaRicercaManuale}
                                    disabled={salvandoRicerca}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40"
                                >
                                    {salvandoRicerca
                                        ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                                        : <><Save size={11} /> Salva</>
                                    }
                                </button>
                                <button
                                    onClick={() => { setMostraForm(false); setNuovaRicerca({ titolo: '', contenuto: '' }); setErroreRicerca(null) }}
                                    className="px-3 py-1.5 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto">
                        {loadingRicerche ? (
                            <div className="flex justify-center py-8">
                                <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                            </div>
                        ) : ricerche.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
                                <Sparkles size={20} className="text-nebbia/20 mb-2" />
                                <p className="font-body text-sm text-nebbia/30">Nessuna ricerca</p>
                                <p className="font-body text-xs text-nebbia/20 mt-1">
                                    Aggiungi una ricerca manuale o cerca in Banca Dati
                                </p>
                            </div>
                        ) : ricerche.map(r => (
                            <div key={r.id} className="border-b border-white/5 last:border-0 p-4 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        {r.tipo === 'ricerca_ai' || r.tipo === 'chat_lex'
                                            ? <Sparkles size={11} className="text-salvia shrink-0 mt-0.5" />
                                            : <Search size={11} className="text-oro shrink-0 mt-0.5" />
                                        }
                                        <p className="font-body text-xs font-medium text-nebbia/70">
                                            {r.titolo ?? (
                                                r.tipo === 'ricerca_ai' ? 'Ricerca AI' :
                                                    r.tipo === 'chat_lex' ? 'Chat con Lex' : 'Ricerca manuale'
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-body text-xs text-nebbia/25">
                                            {r.autore ? `${r.autore.nome} ${r.autore.cognome}` : '—'} · {new Date(r.created_at).toLocaleDateString('it-IT')}
                                        </span>
                                        <button onClick={() => eliminaRicerca(r.id)} className="text-nebbia/20 hover:text-red-400 transition-colors">
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                                <RicercaEspandibile contenuto={r.contenuto} id={r.id} tipo={r.tipo} onSalva={caricaRicerche} />
                                {(r.tipo === 'ricerca_ai' || r.tipo === 'chat_lex') && r.metadati?.sentenze && (
                                    <p className="font-body text-xs text-oro/50 ml-5">Giurisprudenza correlata disponibile</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════════════ Note esito (solo se chiusa) ═══════════════ */}
            {pratica.stato === 'chiusa' && pratica.esito && (
                <div className="bg-slate border border-white/5 p-5">
                    <p className="section-label mb-3">Note sull'esito</p>
                    <p className="font-body text-xs text-nebbia/30 leading-relaxed mb-3">
                        Perché la pratica si è conclusa così? Cosa ha funzionato o non ha funzionato?
                    </p>
                    <textarea
                        rows={4}
                        placeholder="Es. La strategia difensiva basata sull'alibi ha funzionato perché..."
                        value={noteEsito}
                        onChange={e => setNoteEsito(e.target.value)}
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                    />
                    <button
                        onClick={async () => {
                            setSalvandoNoteEsito(true)
                            await supabase.from('pratiche').update({ note_esito: noteEsito }).eq('id', id)
                            setPratica(prev => ({ ...prev, note_esito: noteEsito }))
                            setSalvandoNoteEsito(false)
                        }}
                        disabled={salvandoNoteEsito}
                        className="font-body text-xs text-nebbia/50 border border-white/10 hover:border-white/25 hover:text-nebbia px-4 py-2 mt-3 transition-colors"
                    >
                        {salvandoNoteEsito
                            ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                            : 'Salva note esito'
                        }
                    </button>
                </div>
            )}

            {/* ═══════════════ SEZIONE 2 — Chat Lex (60%) | Genera doc (40%) ═══════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
                <div className="lg:col-span-3">
                    <ChatPratica praticaId={id} />
                </div>
                <div className="lg:col-span-2">
                    <GeneraDocumentoMenu praticaId={id} />
                </div>
            </div>

            {/* Modale udienza */}
            {udienzaModale && (
                <UdienzaModal
                    praticaId={id}
                    praticaTitolo={pratica.titolo}
                    clienteId={pratica.cliente_id}
                    udienza={udienzaModale.id ? udienzaModale : null}
                    onClose={() => setUdienzaModale(null)}
                    onSaved={async () => {
                        await caricaUdienze()
                        const { data: p } = await supabase
                            .from('pratiche')
                            .select('prossima_udienza')
                            .eq('id', id)
                            .single()
                        if (p) setPratica(prev => ({ ...prev, prossima_udienza: p.prossima_udienza }))
                    }}
                    onDeleted={async () => {
                        await caricaUdienze()
                        const { data: p } = await supabase
                            .from('pratiche')
                            .select('prossima_udienza')
                            .eq('id', id)
                            .single()
                        if (p) setPratica(prev => ({ ...prev, prossima_udienza: p.prossima_udienza }))
                    }}
                />
            )}

            {/* Modale Note interne */}
            {mostraNoteModal && (
                <NoteInterneModal
                    note={note}
                    setNote={setNote}
                    onSalva={salvaNote}
                    salvando={salvandoNote}
                    ultimaModifica={ultimaModifica}
                    onClose={() => setMostraNoteModal(false)}
                />
            )}
        </div>
    )
}