// src/pages/avvocato/clienti/Dettaglio.jsx

import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BackButton, Badge, InputField, EmptyState } from '@/components/shared'
import {
    Plus, Search, Send, Lock, FileText, MessageSquare,
    CreditCard, StickyNote, User, FolderOpen, ArrowRight, Sparkles,
    Edit2, Check, X, Calendar, Clock, AlertCircle, Trash2, Building2,
    ExternalLink, Eye, Upload, KeyRound, Mail, Eye as EyeIcon, EyeOff,
    Copy, RefreshCw, CheckCircle, ShieldOff, Wallet
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import GestioneMandati from '@/components/commercialista/GestioneMandati'

// ─────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────
const STATI_PRATICA = {
    aperta: { label: 'Aperta', variant: 'salvia' },
    chiusa: { label: 'Chiusa', variant: 'gray' },
}

const STATI_FATTURA = {
    in_attesa: { label: 'In attesa', variant: 'warning' },
    pagata: { label: 'Pagata', variant: 'salvia' },
    scaduta: { label: 'Scaduta', variant: 'red' },
    annullata: { label: 'Annullata', variant: 'gray' },
}

const STATUS_OCR = {
    pending: { label: 'In coda', variant: 'gray' },
    processing: { label: 'In elaborazione', variant: 'warning' },
    completed: { label: 'Indicizzato', variant: 'salvia' },
    failed: { label: 'Errore', variant: 'red' },
    skipped: { label: 'Manuale', variant: 'gray' },
}

const TABS = [
    { id: 'panoramica', label: 'Panoramica', icon: User },
    { id: 'pratiche', label: 'Pratiche', icon: FolderOpen },
    { id: 'documenti', label: 'Documenti', icon: FileText },
    { id: 'comunicazioni', label: 'Comunicazioni', icon: MessageSquare },
    { id: 'note_interne', label: 'Note interne', icon: Lock },
    { id: 'pagamenti', label: 'Pagamenti', icon: CreditCard },
]

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function formatSize(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function nomeCliente(c) {
    if (!c) return ''
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? c.nome ?? '—'
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

// Metodi pagamento (allineati a FatturazioneDettaglio)
const METODI_PAGAMENTO = [
    { value: 'bonifico', label: 'Bonifico bancario' },
    { value: 'contanti', label: 'Contanti' },
    { value: 'assegno', label: 'Assegno' },
    { value: 'pos', label: 'POS / Carta' },
    { value: 'altro', label: 'Altro' },
]

function fmtEUR(n) {
    const v = Number(n ?? 0)
    return v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─────────────────────────────────────────────────────────────
// SWITCHER PF / PG
// ─────────────────────────────────────────────────────────────
function SwitcherTipoSoggetto({ value, onChange, disabled = false }) {
    return (
        <div className="flex gap-1 bg-petrolio border border-white/10 p-1 w-fit">
            <button
                type="button"
                onClick={() => !disabled && onChange('persona_fisica')}
                disabled={disabled}
                className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${value === 'persona_fisica'
                    ? 'bg-oro/10 text-oro border border-oro/30'
                    : 'text-nebbia/40 hover:text-nebbia'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <User size={13} /> Persona fisica
            </button>
            <button
                type="button"
                onClick={() => !disabled && onChange('persona_giuridica')}
                disabled={disabled}
                className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${value === 'persona_giuridica'
                    ? 'bg-oro/10 text-oro border border-oro/30'
                    : 'text-nebbia/40 hover:text-nebbia'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Building2 size={13} /> Persona giuridica
            </button>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// MODAL CAMBIO PASSWORD CLIENTE (riusa pattern admin)
// ─────────────────────────────────────────────────────────────
function ModalCambiaPasswordCliente({ cliente, onClose, onSuccess }) {
    const [modo, setModo] = useState('genera') // 'genera' | 'manuale'
    const [pwdManuale, setPwdManuale] = useState('')
    const [showPwd, setShowPwd] = useState(false)
    const [inviando, setInviando] = useState(false)
    const [errore, setErrore] = useState('')
    const [risultato, setRisultato] = useState(null)
    const [copiato, setCopiato] = useState(false)

    async function handleConferma() {
        setErrore(''); setInviando(true)
        try {
            const body = { action: 'set-password', cliente_id: cliente.id }
            if (modo === 'manuale') {
                if (!pwdManuale || pwdManuale.length < 8) {
                    throw new Error('Password minimo 8 caratteri')
                }
                body.new_password = pwdManuale
            }
            const { data, error } = await supabase.functions.invoke('avvocato-cliente-actions', { body })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? 'Errore')
            setRisultato(data)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setInviando(false)
        }
    }

    function handleCopia() {
        if (!risultato?.password) return
        navigator.clipboard.writeText(risultato.password)
        setCopiato(true)
        setTimeout(() => setCopiato(false), 2000)
    }

    function handleChiudi() {
        if (risultato) {
            onSuccess(`Password aggiornata per ${nomeCliente(cliente)}`)
        }
        onClose()
    }

    if (risultato) {
        return (
            <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate border border-salvia/30 w-full max-w-md p-6 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-salvia/10 border border-salvia/30 flex items-center justify-center">
                            <CheckCircle size={18} className="text-salvia" />
                        </div>
                        <h2 className="font-display text-lg text-nebbia">Password aggiornata</h2>
                    </div>

                    {risultato.generata && (
                        <>
                            <div className="bg-amber-900/10 border border-amber-500/30 p-3">
                                <p className="font-body text-xs text-amber-400 leading-relaxed">
                                    <span className="font-medium">Importante:</span> questa password viene mostrata una sola volta.
                                    Comunicala in modo sicuro al cliente (telefono, di persona) — non via email o chat non cifrata.
                                </p>
                            </div>

                            <div>
                                <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                                    Password temporanea
                                </label>
                                <div className="flex items-center gap-2 bg-petrolio border border-white/10 p-3">
                                    <code className="flex-1 font-mono text-base text-nebbia tracking-wider">{risultato.password}</code>
                                    <button onClick={handleCopia} className="text-oro hover:text-oro/70 shrink-0">
                                        {copiato ? <Check size={15} /> : <Copy size={15} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {!risultato.generata && (
                        <p className="font-body text-sm text-nebbia/60">
                            La password e stata aggiornata. Comunicala al cliente.
                        </p>
                    )}

                    <button onClick={handleChiudi} className="btn-primary text-sm w-full justify-center">
                        Ho preso nota, chiudi
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate border border-white/10 w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-2">
                        <KeyRound size={16} className="text-oro" />
                        <h2 className="font-display text-lg text-nebbia">Cambia password cliente</h2>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                        Stai cambiando la password di <span className="text-nebbia font-medium">{nomeCliente(cliente)}</span>.
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setModo('genera')}
                            className={`flex flex-col items-start gap-1 p-3 border text-left transition-colors ${modo === 'genera'
                                ? 'border-oro bg-oro/10'
                                : 'border-white/10 hover:border-white/20'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <RefreshCw size={12} className={modo === 'genera' ? 'text-oro' : 'text-nebbia/40'} />
                                <span className="font-body text-sm font-medium text-nebbia">Genera casuale</span>
                            </div>
                            <p className="font-body text-xs text-nebbia/40">12 caratteri sicuri</p>
                        </button>
                        <button
                            onClick={() => setModo('manuale')}
                            className={`flex flex-col items-start gap-1 p-3 border text-left transition-colors ${modo === 'manuale'
                                ? 'border-oro bg-oro/10'
                                : 'border-white/10 hover:border-white/20'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <KeyRound size={12} className={modo === 'manuale' ? 'text-oro' : 'text-nebbia/40'} />
                                <span className="font-body text-sm font-medium text-nebbia">Manuale</span>
                            </div>
                            <p className="font-body text-xs text-nebbia/40">Scegli tu</p>
                        </button>
                    </div>

                    {modo === 'manuale' && (
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                                Nuova password (min 8 caratteri)
                            </label>
                            <div className="relative">
                                <input
                                    type={showPwd ? 'text' : 'password'}
                                    value={pwdManuale}
                                    onChange={e => setPwdManuale(e.target.value)}
                                    placeholder="........"
                                    autoFocus
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 pr-10 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                />
                                <button type="button" onClick={() => setShowPwd(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-oro">
                                    {showPwd ? <EyeOff size={15} /> : <EyeIcon size={15} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={onClose} disabled={inviando}
                            className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">
                            Annulla
                        </button>
                        <button onClick={handleConferma} disabled={inviando || (modo === 'manuale' && pwdManuale.length < 8)}
                            className="btn-primary text-sm flex-1 justify-center disabled:opacity-40">
                            {inviando
                                ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                                : 'Conferma cambio password'
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// SEZIONE STRUMENTI ASSISTENZA (reset email + cambia password)
// ─────────────────────────────────────────────────────────────
function SezioneStrumentiAssistenza({ cliente }) {
    const [errore, setErrore] = useState('')
    const [successo, setSuccesso] = useState('')
    const [busyReset, setBusyReset] = useState(false)
    const [modalPwd, setModalPwd] = useState(false)

    async function handleSendResetEmail() {
        if (!confirm(`Inviare email di reset password a ${cliente.email}?`)) return
        setErrore(''); setSuccesso(''); setBusyReset(true)
        try {
            const { data, error } = await supabase.functions.invoke('avvocato-cliente-actions', {
                body: { action: 'send-reset-email', cliente_id: cliente.id }
            })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? 'Errore')
            setSuccesso(data.messaggio)
            setTimeout(() => setSuccesso(''), 5000)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setBusyReset(false)
        }
    }

    return (
        <>
            <div className="bg-slate border border-amber-500/20 p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <ShieldOff size={14} className="text-amber-400" />
                    <p className="section-label !m-0">Assistenza accesso cliente</p>
                </div>

                {errore && (
                    <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                        <AlertCircle size={14} /> {errore}
                    </div>
                )}
                {successo && (
                    <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20">
                        <CheckCircle size={14} /> {successo}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        onClick={handleSendResetEmail}
                        disabled={busyReset}
                        className="flex flex-col items-start gap-2 p-4 bg-petrolio border border-white/10 hover:border-oro/40 transition-colors text-left disabled:opacity-40"
                    >
                        <div className="flex items-center gap-2">
                            {busyReset
                                ? <span className="animate-spin w-3.5 h-3.5 border-2 border-oro border-t-transparent rounded-full" />
                                : <Mail size={14} className="text-oro" />
                            }
                            <span className="font-body text-sm font-medium text-nebbia">Invia email reset password</span>
                        </div>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            Il cliente ricevera un link per impostare una nuova password da solo.
                        </p>
                    </button>

                    <button
                        onClick={() => setModalPwd(true)}
                        disabled={busyReset}
                        className="flex flex-col items-start gap-2 p-4 bg-petrolio border border-white/10 hover:border-oro/40 transition-colors text-left disabled:opacity-40"
                    >
                        <div className="flex items-center gap-2">
                            <KeyRound size={14} className="text-oro" />
                            <span className="font-body text-sm font-medium text-nebbia">Cambia password</span>
                        </div>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            Imposta tu una password temporanea dovrai comunicarla al cliente.
                        </p>
                    </button>
                </div>
            </div>

            {modalPwd && (
                <ModalCambiaPasswordCliente
                    cliente={cliente}
                    onClose={() => setModalPwd(false)}
                    onSuccess={(msg) => {
                        setSuccesso(msg)
                        setTimeout(() => setSuccesso(''), 10000)
                    }}
                />
            )}
        </>
    )
}
// ─────────────────────────────────────────────────────────────
// TAB DOCUMENTI
// ─────────────────────────────────────────────────────────────
function TabDocumenti({ clienteId }) {
    const [documenti, setDocumenti] = useState([])
    const [pratiche, setPratiche] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { caricaTutto() }, [clienteId])

    async function caricaTutto() {
        setLoading(true)
        const [{ data: docs }, { data: prat }] = await Promise.all([
            supabase
                .from('archivio_documenti')
                .select('id, titolo, tipo, dimensione, ocr_status, created_at, pratica_id, categoria_id, sottocategoria_id, metadati')
                .eq('cliente_id', clienteId)
                .order('created_at', { ascending: false }),
            supabase
                .from('pratiche')
                .select('id, titolo')
                .eq('cliente_id', clienteId)
                .order('created_at', { ascending: false }),
        ])
        setDocumenti(docs ?? [])
        setPratiche(prat ?? [])
        setLoading(false)
    }

    async function apriAnteprima(doc) {
        const { data } = await supabase
            .from('archivio_documenti')
            .select('storage_path')
            .eq('id', doc.id)
            .single()
        if (!data?.storage_path) return
        const { data: signed } = await supabase.storage
            .from('archivio')
            .createSignedUrl(data.storage_path, 3600)
        if (signed?.signedUrl) window.open(signed.signedUrl, '_blank')
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="font-body text-sm text-nebbia/40">
                    {documenti.length} {documenti.length === 1 ? 'documento' : 'documenti'}
                    {documenti.length > 0 && (
                        <span className="ml-2 text-nebbia/25">
                            · {documenti.filter(d => d.ocr_status === 'completed').length} indicizzati
                        </span>
                    )}
                </p>
                <Link
                    to={`/archivio?cliente_id=${clienteId}`}
                    className="btn-primary text-sm flex items-center gap-2"
                >
                    <Upload size={14} /> Carica in archivio
                </Link>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : documenti.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title="Nessun documento"
                    desc="Carica i documenti nell'archivio per collegarli a questo cliente"
                />
            ) : (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                {['Documento', 'Pratica', 'Dimensione', 'Stato', 'Caricato il', ''].map(h => (
                                    <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {documenti.map(doc => {
                                const sc = STATUS_OCR[doc.ocr_status] ?? STATUS_OCR.pending
                                const pratica = pratiche.find(p => p.id === doc.pratica_id)
                                return (
                                    <tr key={doc.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText size={14} className="text-oro/60 shrink-0" />
                                                <span className="font-body text-sm text-nebbia truncate max-w-xs">{doc.titolo}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/40 truncate max-w-[160px]">
                                            {pratica?.titolo ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/40">{formatSize(doc.dimensione)}</td>
                                        <td className="px-4 py-3"><Badge label={sc.label} variant={sc.variant} /></td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">
                                            {new Date(doc.created_at).toLocaleDateString('it-IT')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 justify-end">
                                                <button
                                                    onClick={() => apriAnteprima(doc)}
                                                    className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-oro hover:bg-oro/10 transition-colors"
                                                    title="Apri anteprima"
                                                >
                                                    <Eye size={13} />
                                                </button>
                                                <Link
                                                    to={`/archivio?cliente_id=${clienteId}`}
                                                    className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-oro hover:bg-oro/10 transition-colors"
                                                    title="Apri in archivio"
                                                >
                                                    <ExternalLink size={13} />
                                                </Link>
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

// ─────────────────────────────────────────────────────────────
// TAB NOTE INTERNE
// ─────────────────────────────────────────────────────────────
function TabNoteInterne({ clienteId }) {
    const [noteList, setNoteList] = useState([])
    const [loading, setLoading] = useState(true)
    const [nuovaNota, setNuovaNota] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [editVal, setEditVal] = useState('')
    const [errore, setErrore] = useState('')

    useEffect(() => { caricaNote() }, [clienteId])

    async function caricaNote() {
        setLoading(true)
        const { data } = await supabase.from('note_interne')
            .select('id, testo, created_at, autore:autore_id(nome, cognome)')
            .eq('cliente_id', clienteId).order('created_at', { ascending: false })
        setNoteList(data ?? [])
        setLoading(false)
    }

    async function aggiungiNota() {
        if (!nuovaNota.trim()) return
        setErrore(''); setSalvando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data, error } = await supabase.from('note_interne')
                .insert({ cliente_id: clienteId, autore_id: user.id, testo: nuovaNota.trim() })
                .select('id, testo, created_at, autore:autore_id(nome, cognome)').single()
            if (error) throw new Error(error.message)
            setNoteList(prev => [data, ...prev]); setNuovaNota('')
        } catch (err) { setErrore(err.message) } finally { setSalvando(false) }
    }

    async function salvaNota(id) {
        if (!editVal.trim()) return
        await supabase.from('note_interne').update({ testo: editVal.trim() }).eq('id', id)
        setNoteList(prev => prev.map(n => n.id === id ? { ...n, testo: editVal.trim() } : n))
        setEditingId(null)
    }

    async function eliminaNota(id) {
        if (!confirm('Eliminare questa nota?')) return
        await supabase.from('note_interne').delete().eq('id', id)
        setNoteList(prev => prev.filter(n => n.id !== id))
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-amber-900/10 border border-amber-500/20">
                <Lock size={14} className="text-amber-400 shrink-0" />
                <p className="font-body text-xs text-amber-400">Queste note sono visibili solo a te e a chi ha visibilità del cliente.</p>
            </div>
            <div className="bg-slate border border-white/5 p-5">
                <p className="section-label mb-3">Aggiungi nota</p>
                <textarea rows={4} value={nuovaNota} onChange={e => setNuovaNota(e.target.value)}
                    placeholder="Strategia difensiva, punti critici, promemoria interni..."
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />
                {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20 mt-3"><AlertCircle size={14} /> {errore}</div>}
                <button onClick={aggiungiNota} disabled={salvando || !nuovaNota.trim()} className="btn-primary text-sm mt-3 flex items-center gap-2">
                    {salvando ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Plus size={14} /> Aggiungi nota</>}
                </button>
            </div>
            <div className="bg-slate border border-white/5 p-5">
                <p className="section-label mb-4">Storico note</p>
                {loading ? <div className="flex items-center justify-center py-8"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
                    : noteList.length === 0 ? <EmptyState icon={StickyNote} title="Nessuna nota salvata" />
                        : (
                            <div className="space-y-3">
                                {noteList.map(n => (
                                    <div key={n.id} className="border border-white/5 p-4 group">
                                        {editingId === n.id ? (
                                            <div className="space-y-2">
                                                <textarea rows={3} value={editVal} onChange={e => setEditVal(e.target.value)}
                                                    className="w-full bg-petrolio border border-oro/30 text-nebbia font-body text-sm px-3 py-2 outline-none resize-none focus:border-oro/50" />
                                                <div className="flex gap-2">
                                                    <button onClick={() => salvaNota(n.id)} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"><Check size={12} /> Salva</button>
                                                    <button onClick={() => setEditingId(null)} className="btn-secondary text-xs px-3 py-1.5">Annulla</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="font-body text-sm text-nebbia/70 leading-relaxed">{n.testo}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={11} className="text-nebbia/25" />
                                                        <span className="font-body text-xs text-nebbia/30">{n.autore?.nome} {n.autore?.cognome} · {new Date(n.created_at).toLocaleString('it-IT')}</span>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => { setEditingId(n.id); setEditVal(n.testo) }} className="text-nebbia/30 hover:text-oro p-1 transition-colors"><Edit2 size={12} /></button>
                                                        <button onClick={() => eliminaNota(n.id)} className="text-nebbia/30 hover:text-red-400 p-1 transition-colors"><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// MODAL REGISTRA PAGAMENTO (riuso dal flusso fatturazione)
// Inserisce in pagamenti_fattura; lo stato fattura passa a 'pagata'
// automaticamente via trigger trg_aggiorna_stato_da_pagamenti.
// ─────────────────────────────────────────────────────────────
function ModalRegistraPagamento({ fattura, residuo, onClose, onSuccess }) {
    const [form, setForm] = useState({
        data_pagamento: new Date().toISOString().slice(0, 10),
        importo: residuo.toFixed(2),
        metodo: 'bonifico',
        riferimento: '',
        note: '',
    })
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')

    async function handleSalva() {
        setErrore('')
        const imp = Number(form.importo)
        if (isNaN(imp) || imp <= 0) { setErrore('Importo non valido'); return }
        if (!form.data_pagamento) { setErrore('Data pagamento obbligatoria'); return }

        setSalvando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase.from('pagamenti_fattura').insert({
                fattura_id: fattura.id,
                data_pagamento: form.data_pagamento,
                importo: imp,
                metodo: form.metodo,
                riferimento: form.riferimento?.trim() || null,
                note: form.note?.trim() || null,
                registrato_da: user.id,
            })
            if (error) throw new Error(error.message)
            onSuccess()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setSalvando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate border border-white/10 w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-2">
                        <Wallet size={16} className="text-salvia" />
                        <h2 className="font-display text-lg text-nebbia">Registra pagamento</h2>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-petrolio/40 border border-white/5 p-3 space-y-1">
                        <p className="font-body text-xs text-nebbia/40">
                            Fattura <span className="text-nebbia/70">{fattura.numero}</span>
                        </p>
                        <p className="font-body text-xs text-nebbia/40">
                            Residuo da incassare: <span className="text-oro font-medium">EUR {fmtEUR(residuo)}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Data *</label>
                            <input
                                type="date"
                                value={form.data_pagamento}
                                onChange={e => setForm(p => ({ ...p, data_pagamento: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                        </div>
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Importo (EUR) *</label>
                            <input
                                type="number" step="0.01" min="0.01"
                                value={form.importo}
                                onChange={e => setForm(p => ({ ...p, importo: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Metodo *</label>
                        <select
                            value={form.metodo}
                            onChange={e => setForm(p => ({ ...p, metodo: e.target.value }))}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                        >
                            {METODI_PAGAMENTO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                            Riferimento <span className="text-nebbia/25 normal-case tracking-normal">— opzionale</span>
                        </label>
                        <input
                            placeholder="Es. CRO bonifico, N. assegno..."
                            value={form.riferimento}
                            onChange={e => setForm(p => ({ ...p, riferimento: e.target.value }))}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                            Note <span className="text-nebbia/25 normal-case tracking-normal">— opzionale</span>
                        </label>
                        <textarea
                            rows={2}
                            value={form.note}
                            onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 resize-none"
                        />
                    </div>

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button onClick={onClose} disabled={salvando}
                            className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">
                            Annulla
                        </button>
                        <button onClick={handleSalva} disabled={salvando}
                            className="btn-primary text-sm flex-1 justify-center disabled:opacity-40">
                            {salvando
                                ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                                : <><Check size={14} /> Registra pagamento</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// TAB PAGAMENTI
// Quick "Segna pagata" apre ModalRegistraPagamento (chiede metodo/data/importo);
// lo stato fattura passa a 'pagata' via trigger DB su pagamenti_fattura.
// ─────────────────────────────────────────────────────────────
function TabPagamenti({ clienteId, avvocatoId }) {
    const [fatture, setFatture] = useState([])
    const [loading, setLoading] = useState(true)
    const [fatturaPagamento, setFatturaPagamento] = useState(null)

    useEffect(() => { caricaTutto() }, [clienteId])

    async function caricaTutto() {
        setLoading(true)
        const { data: fatt } = await supabase.from('fatture').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false })
        setFatture(fatt ?? [])
        setLoading(false)
    }

    // Residuo = (totale_lordo ?? importo) - somma pagamenti già registrati
    async function apriPagamento(fatt) {
        const { data: pag } = await supabase
            .from('pagamenti_fattura')
            .select('importo')
            .eq('fattura_id', fatt.id)
        const giaPagato = (pag ?? []).reduce((a, p) => a + Number(p.importo ?? 0), 0)
        const dovuto = Number(fatt.totale_lordo ?? fatt.importo ?? 0)
        const residuo = Math.max(0, dovuto - giaPagato)
        setFatturaPagamento({ ...fatt, residuo })
    }

    const totaleAperto = fatture.filter(f => ['in_attesa', 'scaduta'].includes(f.stato)).reduce((a, f) => a + Number(f.totale_lordo ?? f.importo ?? 0), 0)
    const totalePagato = fatture.filter(f => f.stato === 'pagata').reduce((a, f) => a + Number(f.totale_lordo ?? f.importo ?? 0), 0)

    return (
        <div className="space-y-4">
            {fatture.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate border border-white/5 p-4">
                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Da incassare</p>
                        <p className="font-display text-2xl font-semibold text-oro">EUR {fmtEUR(totaleAperto)}</p>
                    </div>
                    <div className="bg-slate border border-white/5 p-4">
                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Incassato</p>
                        <p className="font-display text-2xl font-semibold text-salvia">EUR {fmtEUR(totalePagato)}</p>
                    </div>
                </div>
            )}
            <div className="flex justify-end">
                <Link to={`/pagamenti?cliente_id=${clienteId}`} className="btn-primary text-sm flex items-center gap-2">
                    <Plus size={14} /> Vai a Pagamenti per nuova fattura
                </Link>
            </div>
            {loading ? <div className="flex items-center justify-center py-12"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
                : fatture.length === 0 ? <EmptyState icon={CreditCard} title="Nessuna fattura" desc="Vai alla pagina Pagamenti per emettere fatture" />
                    : (
                        <div className="bg-slate border border-white/5 overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        {['Numero', 'Importo', 'Descrizione', 'Emessa il', 'Scadenza', 'Stato', ''].map(h => (
                                            <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {fatture.map(fatt => {
                                        const sc = STATI_FATTURA[fatt.stato] ?? STATI_FATTURA.in_attesa
                                        return (
                                            <tr key={fatt.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                                <td className="px-4 py-3 font-body text-xs text-nebbia/60 font-medium">{fatt.numero}</td>
                                                <td className="px-4 py-3 font-body text-sm font-semibold text-oro">EUR {fmtEUR(fatt.totale_lordo ?? fatt.importo)}</td>
                                                <td className="px-4 py-3 font-body text-xs text-nebbia/50 max-w-xs truncate">{fatt.descrizione ?? '—'}</td>
                                                <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">{new Date(fatt.data_emissione).toLocaleDateString('it-IT')}</td>
                                                <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">{fatt.data_scadenza ? new Date(fatt.data_scadenza).toLocaleDateString('it-IT') : '—'}</td>
                                                <td className="px-4 py-3"><Badge label={sc.label} variant={sc.variant} /></td>
                                                <td className="px-4 py-3 text-right">
                                                    {['in_attesa', 'scaduta'].includes(fatt.stato) && (
                                                        <button onClick={() => apriPagamento(fatt)} className="font-body text-xs text-salvia hover:text-salvia/70 transition-colors whitespace-nowrap">Segna pagata</button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

            {fatturaPagamento && (
                <ModalRegistraPagamento
                    fattura={fatturaPagamento}
                    residuo={fatturaPagamento.residuo}
                    onClose={() => setFatturaPagamento(null)}
                    onSuccess={() => { setFatturaPagamento(null); caricaTutto() }}
                />
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// TAB COMUNICAZIONI
// ─────────────────────────────────────────────────────────────
function TabComunicazioni({ clienteId }) {
    const [tickets, setTickets] = useState([])
    const [ticketAperto, setTicketAperto] = useState(null)
    const [messaggi, setMessaggi] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ titolo: '' })
    const [testo, setTesto] = useState('')
    const [loading, setLoading] = useState(true)
    const [meId, setMeId] = useState(null)
    const bottomRef = useRef(null)

    useEffect(() => { caricaTickets() }, [clienteId])
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messaggi])

    async function caricaTickets() {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        setMeId(user.id)
        const { data } = await supabase.from('ticket_assistenza')
            .select('*, messaggi:messaggi_ticket(id, autore_tipo, created_at)')
            .or(`and(mittente_id.eq.${user.id},destinatario_id.eq.${clienteId}),and(mittente_id.eq.${clienteId},destinatario_id.eq.${user.id})`)
            .order('created_at', { ascending: false })
        setTickets(data ?? [])
        setLoading(false)
    }

    async function apriTicket(ticket) {
        setTicketAperto(ticket)
        const { data } = await supabase.from('messaggi_ticket').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true })
        setMessaggi(data ?? [])
    }

    async function creaNuovoTicket() {
        if (!form.titolo.trim()) return
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase.from('ticket_assistenza').insert({
            mittente_id: user.id, destinatario_id: clienteId,
            oggetto: form.titolo.trim(), mittente_ruolo: 'avvocato', stato: 'aperto',
        }).select().single()
        if (error) return
        setTickets(prev => [data, ...prev]); setShowForm(false); setForm({ titolo: '' })
        apriTicket(data)
    }

    async function inviaMessaggio() {
        if (!testo.trim() || ticketAperto?.stato === 'chiuso') return
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase.from('messaggi_ticket')
            .insert({ ticket_id: ticketAperto.id, autore_id: user.id, autore_tipo: 'avvocato', testo: testo.trim() })
            .select().single()
        if (error) return
        setMessaggi(prev => [...prev, data]); setTesto('')
    }

    async function chiudiTicket() {
        await supabase.from('ticket_assistenza').update({ stato: 'chiuso' }).eq('id', ticketAperto.id)
        setTicketAperto(prev => ({ ...prev, stato: 'chiuso' }))
        setTickets(prev => prev.map(t => t.id === ticketAperto.id ? { ...t, stato: 'chiuso' } : t))
    }

    if (ticketAperto) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => { setTicketAperto(null); setMessaggi([]) }} className="text-nebbia/40 hover:text-nebbia transition-colors">
                            <ArrowRight size={16} className="rotate-180" />
                        </button>
                        <p className="font-body text-sm font-medium text-nebbia">{ticketAperto.oggetto}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`font-body text-xs px-2 py-0.5 border ${ticketAperto.stato === 'aperto' ? 'border-salvia/25 text-salvia bg-salvia/5' : 'border-white/10 text-nebbia/30'}`}>
                            {ticketAperto.stato === 'aperto' ? 'Aperto' : 'Chiuso'}
                        </span>
                        {ticketAperto.stato === 'aperto' && (
                            <button onClick={chiudiTicket} className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors border border-white/10 hover:border-red-500/30 px-3 py-1">Chiudi ticket</button>
                        )}
                    </div>
                </div>
                <div className="bg-slate border border-white/5 flex flex-col" style={{ height: 420 }}>
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                        {messaggi.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2">
                                <MessageSquare size={28} className="text-nebbia/15" />
                                <p className="font-body text-sm text-nebbia/30">Nessun messaggio</p>
                            </div>
                        ) : messaggi.map(msg => {
                            const isMio = msg.autore_id === meId
                            return (
                                <div key={msg.id} className={`flex ${isMio ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-sm px-4 py-2.5 ${isMio ? 'bg-oro/15 border border-oro/20' : 'bg-petrolio border border-white/10'}`}>
                                        <p className="font-body text-sm text-nebbia leading-relaxed">{msg.testo}</p>
                                        <p className={`font-body text-[10px] mt-1 ${isMio ? 'text-oro/50 text-right' : 'text-nebbia/30'}`}>
                                            {new Date(msg.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={bottomRef} />
                    </div>
                    {ticketAperto.stato === 'aperto' ? (
                        <div className="border-t border-white/5 p-4 flex gap-3 items-end">
                            <textarea rows={2} value={testo} onChange={e => setTesto(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); inviaMessaggio() } }}
                                placeholder="Scrivi un messaggio..."
                                className="flex-1 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />
                            <button onClick={inviaMessaggio} disabled={!testo.trim()} className="btn-primary text-sm self-end px-4 py-3 shrink-0 disabled:opacity-40"><Send size={15} /></button>
                        </div>
                    ) : (
                        <div className="border-t border-white/5 p-4 text-center">
                            <p className="font-body text-xs text-nebbia/30">Ticket chiuso</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="font-body text-sm text-nebbia/40">{tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}</p>
                <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm flex items-center gap-2">
                    <Plus size={14} />{showForm ? 'Annulla' : 'Nuovo ticket'}
                </button>
            </div>
            {showForm && (
                <div className="bg-slate border border-oro/20 p-5 space-y-4">
                    <p className="section-label">Nuovo ticket</p>
                    <div>
                        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Titolo *</label>
                        <input value={form.titolo} onChange={e => setForm(p => ({ ...p, titolo: e.target.value }))}
                            placeholder="Es. Documenti mancanti..."
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowForm(false)} className="btn-secondary text-sm flex-1">Annulla</button>
                        <button onClick={creaNuovoTicket} disabled={!form.titolo.trim()} className="btn-primary text-sm flex-1 justify-center disabled:opacity-40">Apri ticket</button>
                    </div>
                </div>
            )}
            {loading ? <div className="flex items-center justify-center py-12"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
                : tickets.length === 0 ? <EmptyState icon={MessageSquare} title="Nessun ticket" desc="Apri un ticket per comunicare con il cliente" />
                    : (
                        <div className="space-y-2">
                            {tickets.map(t => {
                                const msgs = [...(t.messaggi ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                const nonLetto = t.stato === 'aperto' && msgs.length > 0 && msgs[0]?.autore_tipo !== 'avvocato'
                                return (
                                    <button key={t.id} onClick={() => apriTicket(t)} className="w-full text-left bg-slate border border-white/5 hover:border-oro/20 p-4 transition-all">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {nonLetto && <span className="w-1.5 h-1.5 rounded-full bg-oro shrink-0" />}
                                                <div className="min-w-0">
                                                    <p className="font-body text-sm font-medium text-nebbia truncate">{t.oggetto}</p>
                                                    <p className="font-body text-xs text-nebbia/25 mt-1">{new Date(t.created_at).toLocaleDateString('it-IT')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`font-body text-xs px-2 py-0.5 border ${t.stato === 'aperto' ? 'border-salvia/25 text-salvia bg-salvia/5' : 'border-white/10 text-nebbia/30'}`}>
                                                    {t.stato === 'aperto' ? 'Aperto' : 'Chiuso'}
                                                </span>
                                                <ArrowRight size={14} className="text-nebbia/20" />
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// PANNELLO PRATICA + PROSSIMI APPUNTAMENTI
// ─────────────────────────────────────────────────────────────
function PannelloPratica({ pratica, onClose }) {
    const [documenti, setDocumenti] = useState([])
    const [ricerche, setRicerche] = useState([])
    const [loadingExtra, setLoadingExtra] = useState(true)
    const sc = STATI_PRATICA[pratica.stato] ?? { label: pratica.stato ?? 'Aperta', variant: 'salvia' }

    useEffect(() => {
        async function carica() {
            setLoadingExtra(true)
            const [{ data: docs }, { data: rich }] = await Promise.all([
                supabase.from('documenti_pratiche')
                    .select('id, nome_file, dimensione, created_at')
                    .eq('pratica_id', pratica.id)
                    .order('created_at', { ascending: false }),
                supabase.from('note_interne')
                    .select('id, tipo, testo, metadati, created_at, autore:autore_id(nome, cognome)')
                    .eq('pratica_id', pratica.id)
                    .in('tipo', ['ricerca_ai', 'ricerca_manuale', 'sentenza_acquistata'])
                    .order('created_at', { ascending: false }),
            ])
            setDocumenti(docs ?? [])
            setRicerche(rich ?? [])
            setLoadingExtra(false)
        }
        carica()
    }, [pratica.id])

    return (
        <div className="flex flex-col h-full overflow-y-auto space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Pratica</p>
                    <h3 className="font-display text-xl font-semibold text-nebbia">{pratica.titolo}</h3>
                    <p className="font-body text-xs text-nebbia/40 mt-1">{pratica.tipo ?? '—'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Badge label={sc.label} variant={sc.variant} />
                    {onClose && (
                        <button onClick={onClose} className="text-nebbia/20 hover:text-nebbia p-1 ml-1">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>
            <Link
                to={`/pratiche/${pratica.id}`}
                className="flex items-center justify-center gap-2 w-full py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors"
            >
                <ArrowRight size={13} /> Apri e modifica pratica completa
            </Link>
            <div className="bg-petrolio/40 border border-white/5 p-4 space-y-2">
                <p className="section-label mb-2">Dettagli</p>
                {[
                    ['Tipo', pratica.tipo ?? '—'],
                    ['Creata il', new Date(pratica.created_at).toLocaleDateString('it-IT')],
                    ['Stato', sc.label],
                    ...(pratica.esito ? [['Esito', pratica.esito.charAt(0).toUpperCase() + pratica.esito.slice(1)]] : []),
                ].map(([l, v]) => (
                    <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                        <span className="font-body text-sm text-nebbia">{v}</span>
                    </div>
                ))}
            </div>
            {pratica.prossima_udienza ? (
                <div className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-500/25">
                    <Calendar size={16} className="text-red-400" />
                    <div>
                        <p className="font-body text-xs text-red-400/60 uppercase tracking-widest mb-0.5">Prossima udienza</p>
                        <span className="font-body text-sm text-red-400">{new Date(pratica.prossima_udienza).toLocaleDateString('it-IT')}</span>
                    </div>
                </div>
            ) : (
                <EmptyState icon={Calendar} title="Nessuna scadenza" />
            )}
            {pratica.note && (
                <div className="bg-petrolio/40 border border-white/5 p-4">
                    <p className="section-label mb-2">Note interne</p>
                    <p className="font-body text-sm text-nebbia/60 leading-relaxed whitespace-pre-line line-clamp-4">{pratica.note}</p>
                </div>
            )}
            {loadingExtra ? (
                <div className="flex justify-center py-4">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : (
                <>
                    <div className="bg-petrolio/40 border border-white/5 p-4">
                        <p className="section-label mb-3">Documenti ({documenti.length})</p>
                        {documenti.length === 0 ? (
                            <p className="font-body text-xs text-nebbia/30">Nessun documento</p>
                        ) : documenti.map(d => (
                            <div key={d.id} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
                                <FileText size={12} className="text-nebbia/30 shrink-0" />
                                <p className="font-body text-xs text-nebbia/70 truncate flex-1">{d.nome_file}</p>
                                <span className="font-body text-xs text-nebbia/25">
                                    {new Date(d.created_at).toLocaleDateString('it-IT')}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="bg-petrolio/40 border border-white/5 p-4">
                        <p className="section-label mb-3">Ricerche ({ricerche.length})</p>
                        {ricerche.length === 0 ? (
                            <p className="font-body text-xs text-nebbia/30">Nessuna ricerca salvata</p>
                        ) : ricerche.map(r => (
                            <div key={r.id} className="py-2 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {r.tipo === 'ricerca_ai'
                                        ? <Sparkles size={10} className="text-salvia shrink-0" />
                                        : <Search size={10} className="text-oro shrink-0" />
                                    }
                                    <p className="font-body text-xs font-medium text-nebbia/70 truncate">
                                        {r.metadati?.domanda ?? '—'}
                                    </p>
                                </div>
                                <p className="font-body text-xs text-nebbia/40 line-clamp-2 ml-4">{r.testo}</p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

function ProssimiAppuntamenti({ clienteId }) {
    const [appuntamenti, setAppuntamenti] = useState([])

    useEffect(() => {
        async function carica() {
            const oggi = new Date().toISOString()
            const { data } = await supabase
                .from('appuntamenti')
                .select('id, titolo, tipo, data_ora_inizio, stato')
                .eq('cliente_id', clienteId)
                .eq('stato', 'programmato')
                .gte('data_ora_inizio', oggi)
                .order('data_ora_inizio', { ascending: true })
                .limit(3)
            setAppuntamenti(data ?? [])
        }
        carica()
    }, [clienteId])

    if (appuntamenti.length === 0) return null

    return (
        <div className="bg-slate border border-white/5 p-5">
            <p className="section-label mb-3">Prossimi appuntamenti</p>
            <div className="space-y-2">
                {appuntamenti.map(a => (
                    <div key={a.id} className={`flex items-center gap-3 p-3 border ${a.tipo === 'udienza' ? 'bg-red-900/10 border-red-500/20' : 'bg-petrolio/40 border-white/5'}`}>
                        <Calendar size={13} className={a.tipo === 'udienza' ? 'text-red-400 shrink-0' : 'text-nebbia/30 shrink-0'} />
                        <div className="min-w-0 flex-1">
                            <p className="font-body text-sm text-nebbia truncate">{a.titolo}</p>
                            <p className={`font-body text-xs mt-0.5 ${a.tipo === 'udienza' ? 'text-red-400/60' : 'text-nebbia/30'}`}>
                                {new Date(a.data_ora_inizio).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                                {' — '}
                                {new Date(a.data_ora_inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        {a.tipo === 'udienza' && (
                            <span className="font-body text-xs text-red-400/60 border border-red-500/20 px-2 py-0.5 shrink-0">Udienza</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// MODAL RESET PASSWORD
// ─────────────────────────────────────────────────────────────
function ModalResetPassword({ cliente, onClose }) {
    const [password, setPassword] = useState('')
    const [mostraPassword, setMostraPassword] = useState(false)
    const [inviando, setInviando] = useState(false)
    const [errore, setErrore] = useState('')
    const [completato, setCompletato] = useState(false)

    async function eseguiReset() {
        setErrore('')
        if (!password) return setErrore('Inserisci una password')
        if (password.length < 8) return setErrore('Almeno 8 caratteri')

        setInviando(true)
        try {
            const { data, error } = await supabase.functions.invoke('cliente-reset-password', {
                body: { cliente_id: cliente.id, nuova_password: password }
            })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? 'Errore reset')
            setCompletato(true)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setInviando(false)
        }
    }

    if (completato) {
        return (
            <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate border border-salvia/30 w-full max-w-md p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-salvia/10 border border-salvia/30 flex items-center justify-center">
                            <CheckCircle size={18} className="text-salvia" />
                        </div>
                        <h2 className="font-display text-lg text-nebbia">Password aggiornata</h2>
                    </div>
                    <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                        La nuova password e attiva. Comunicala al cliente con il canale che preferisci (telefono, whatsapp, di persona).
                    </p>
                    <button onClick={onClose} className="btn-primary text-sm w-full justify-center">
                        Chiudi
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate border border-oro/30 w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-2">
                        <Lock size={16} className="text-oro" />
                        <h2 className="font-display text-lg text-nebbia">Reset password cliente</h2>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                        Imposta una nuova password per accedere al portale. Comunicala al cliente con il canale che preferisci. Lexum non invia email automatiche.
                    </p>

                    <div>
                        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                            Nuova password
                        </label>
                        <div className="relative">
                            <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30 pointer-events-none" />
                            <input
                                type={mostraPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Almeno 8 caratteri"
                                autoFocus
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-10 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <button
                                type="button"
                                onClick={() => setMostraPassword(v => !v)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-nebbia p-1"
                            >
                                {mostraPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={inviando}
                            className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40"
                        >
                            Annulla
                        </button>
                        <button
                            type="button"
                            onClick={eseguiReset}
                            disabled={inviando || !password}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-oro/10 border border-oro/40 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {inviando
                                ? <span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" />
                                : <><Lock size={14} /> Imposta password</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// DETTAGLIO CLIENTE — pagina principale
// ─────────────────────────────────────────────────────────────
export default function AvvocatoClientiDettaglio() {
    const { id } = useParams()
    const { profile } = useAuth()
    // Le pratiche sono uno strumento da avvocato; il commercialista lavora per
    // mandati (stessa posizione nella tab bar, componente diverso).
    const isAvvocato = profile?.role === 'avvocato'
    const isCommercialista = profile?.role === 'commercialista'
    const tabsVisibili = isAvvocato
        ? TABS
        : isCommercialista
            ? TABS.map(t => t.id === 'pratiche' ? { id: 'mandati', label: 'Mandati', icon: FolderOpen } : t)
            : TABS.filter(t => t.id !== 'pratiche')
    const [cliente, setCliente] = useState(null)
    const [tab, setTab] = useState('panoramica')
    const [pratiche, setPratiche] = useState([])
    const [collaboratori, setCollaboratori] = useState([])
    const [isStudio, setIsStudio] = useState(false)
    const [praticaSelezionata, setPraticaSelezionata] = useState(null)
    const [loading, setLoading] = useState(true)
    const [editPanoramica, setEditPanoramica] = useState(false)
    const [formCliente, setFormCliente] = useState({})
    const [salvandoCliente, setSalvandoCliente] = useState(false)
    const [erroreCliente, setErroreCliente] = useState('')
    const [avvocatoId, setAvvocatoId] = useState('')
    const [meId, setMeId] = useState(null)
    const [mostraModalReset, setMostraModalReset] = useState(false)

    useEffect(() => {
        async function carica() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            setMeId(user.id)

            const { data: c } = await supabase.from('profiles')
                .select('id, tipo_soggetto, nome, cognome, ragione_sociale, partita_iva, sede_legale, rappr_nome, rappr_cognome, rappr_cf, rappr_carica, email, telefono, pec, cf, data_nascita, luogo_nascita, indirizzo, comune, provincia, cap, note_iniziali, avvocato_id, created_at')
                .eq('id', id).single()
            if (c) {
                const cliente = { ...c, tipo_soggetto: c.tipo_soggetto ?? 'persona_fisica' }
                setCliente(cliente); setFormCliente(cliente); setAvvocatoId(c.avvocato_id ?? '')
            }

            const { data: pr } = await supabase.from('pratiche').select('*').eq('cliente_id', id).order('created_at', { ascending: false })
            setPratiche(pr ?? [])

            const { data: profilo } = await supabase.from('profiles').select('posti_acquistati').eq('id', user.id).single()
            if ((profilo?.posti_acquistati ?? 1) > 1) {
                setIsStudio(true)
                const { data: collabs } = await supabase.from('profiles').select('id, nome, cognome').eq('titolare_id', user.id)
                setCollaboratori(collabs ?? [])
            }
            setLoading(false)
        }
        carica()
    }, [id])

    async function salvaCliente() {
        setErroreCliente(''); setSalvandoCliente(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-cliente`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        cliente_id: id,
                        tipo_soggetto: formCliente.tipo_soggetto ?? 'persona_fisica',
                        nome: formCliente.nome,
                        cognome: formCliente.cognome,
                        ragione_sociale: formCliente.ragione_sociale,
                        partita_iva: formCliente.partita_iva,
                        sede_legale: formCliente.sede_legale,
                        rappr_nome: formCliente.rappr_nome,
                        rappr_cognome: formCliente.rappr_cognome,
                        rappr_cf: formCliente.rappr_cf,
                        rappr_carica: formCliente.rappr_carica,
                        cf: formCliente.cf,
                        data_nascita: formCliente.data_nascita,
                        luogo_nascita: formCliente.luogo_nascita,
                        email: formCliente.email,
                        telefono: formCliente.telefono,
                        pec: formCliente.pec,
                        indirizzo: formCliente.indirizzo,
                        comune: formCliente.comune,
                        provincia: formCliente.provincia,
                        cap: formCliente.cap,
                        regime_contabile: formCliente.regime_contabile ?? null,
                        avvocato_id: avvocatoId || null,
                    }),
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)
            setCliente(json.cliente)
            setFormCliente(json.cliente)
            setEditPanoramica(false)
        } catch (err) {
            setErroreCliente(err.message)
        } finally {
            setSalvandoCliente(false)
        }
    }

    const fc = k => ({ value: formCliente[k] ?? '', onChange: e => setFormCliente(p => ({ ...p, [k]: e.target.value })) })
    const nomeAvvocato = avvocatoId === meId ? 'Tu'
        : collaboratori.find(c => c.id === avvocatoId)
            ? `${collaboratori.find(c => c.id === avvocatoId).nome} ${collaboratori.find(c => c.id === avvocatoId).cognome}`
            : '—'

    if (loading) return <div className="flex items-center justify-center py-40"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
    if (!cliente) return <div className="space-y-5"><BackButton to="/clienti" label="Tutti i clienti" /><p className="font-body text-sm text-nebbia/40">Cliente non trovato.</p></div>

    const isPF = (cliente.tipo_soggetto ?? 'persona_fisica') === 'persona_fisica'
    const formIsPF = (formCliente.tipo_soggetto ?? 'persona_fisica') === 'persona_fisica'

    return (
        <div className="space-y-5">
            <BackButton to="/clienti" label="Tutti i clienti" />
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <p className="section-label mb-2 flex items-center gap-2">
                        {isPF ? <User size={11} /> : <Building2 size={11} />}
                        {isPF ? 'Cliente · Persona fisica' : 'Cliente · Persona giuridica'}
                    </p>
                    <h1 className="font-display text-4xl font-light text-nebbia">{nomeCliente(cliente)}</h1>
                    <p className="font-body text-sm text-nebbia/40 mt-1">{cliente.email} · {cliente.telefono ?? '—'}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {isStudio && (
                        <div className="flex items-center gap-2">
                            <span className="font-body text-xs text-nebbia/30">Assegnato a</span>
                            <select value={avvocatoId} onChange={e => setAvvocatoId(e.target.value)}
                                className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-1.5 outline-none focus:border-oro/50">
                                <option value={meId}>Tu</option>
                                {collaboratori.map(c => <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>)}
                            </select>
                        </div>
                    )}
                    <button
                        onClick={() => setMostraModalReset(true)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors"
                    >
                        <Lock size={12} /> Reset password
                    </button>
                </div>
            </div>

            {/* Strumenti di assistenza accesso cliente — sempre visibili */}
            <SezioneStrumentiAssistenza cliente={cliente} />

            <div className="flex gap-0 border-b border-white/8 overflow-x-auto">
                {tabsVisibili.map(({ id: tid, label, icon: Icon }) => (
                    <button key={tid} onClick={() => { setTab(tid); setPraticaSelezionata(null) }}
                        className={`flex items-center gap-2 px-4 py-3 font-body text-sm whitespace-nowrap border-b-2 transition-colors ${tab === tid ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'
                            } ${tid === 'note_interne' ? 'text-amber-400/70 hover:text-amber-400' : ''}`}>
                        <Icon size={14} strokeWidth={1.5} />{label}
                        {tid === 'note_interne' && <Lock size={11} className="opacity-50" />}
                    </button>
                ))}
            </div>

            {tab === 'panoramica' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-slate border border-white/5 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="section-label">Dati anagrafici</p>
                            {!editPanoramica
                                ? <button onClick={() => setEditPanoramica(true)} className="flex items-center gap-1.5 font-body text-xs text-nebbia/30 hover:text-oro transition-colors"><Edit2 size={12} /> Modifica</button>
                                : <div className="flex gap-2">
                                    <button onClick={salvaCliente} disabled={salvandoCliente} className="flex items-center gap-1 font-body text-xs text-salvia">
                                        {salvandoCliente ? <span className="animate-spin w-3 h-3 border border-salvia border-t-transparent rounded-full" /> : <Check size={12} />} Salva
                                    </button>
                                    <button onClick={() => { setFormCliente({ ...cliente }); setEditPanoramica(false); setErroreCliente('') }} className="font-body text-xs text-nebbia/30 hover:text-red-400"><X size={12} /></button>
                                </div>
                            }
                        </div>

                        {editPanoramica ? (
                            <div className="space-y-4">
                                <SwitcherTipoSoggetto
                                    value={formCliente.tipo_soggetto ?? 'persona_fisica'}
                                    onChange={t => setFormCliente(p => ({ ...p, tipo_soggetto: t }))}
                                />

                                {formIsPF ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputField label="Nome" {...fc('nome')} />
                                            <InputField label="Cognome" {...fc('cognome')} />
                                        </div>
                                        <InputField label="Codice fiscale" {...fc('cf')} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Data nascita</label>
                                                <input type="date" {...fc('data_nascita')}
                                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50" />
                                            </div>
                                            <InputField label="Luogo nascita" placeholder="Es. Milano" {...fc('luogo_nascita')} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <InputField label="Ragione sociale" {...fc('ragione_sociale')} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputField label="Partita IVA" {...fc('partita_iva')} />
                                            <InputField label="Codice fiscale" {...fc('cf')} />
                                        </div>
                                        <InputField label="Sede legale" {...fc('sede_legale')} />
                                        <div className="border-t border-white/8 pt-3 space-y-3">
                                            <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase">Rappresentante legale</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <InputField label="Nome" {...fc('rappr_nome')} />
                                                <InputField label="Cognome" {...fc('rappr_cognome')} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <InputField label="CF rappresentante" {...fc('rappr_cf')} />
                                                <InputField label="Carica" placeholder="Es. Amministratore Unico" {...fc('rappr_carica')} />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {profile?.role === 'commercialista' && (
                                    <div className="border-t border-white/8 pt-3 space-y-3">
                                        <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase">Inquadramento fiscale</p>
                                        <div>
                                            <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Regime contabile</label>
                                            <select
                                                value={formCliente.regime_contabile ?? ''}
                                                onChange={e => setFormCliente(p => ({ ...p, regime_contabile: e.target.value || null }))}
                                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                                            >
                                                <option value="">Non impostato</option>
                                                <option value="ordinario">Ordinario</option>
                                                <option value="semplificato">Semplificato</option>
                                                <option value="forfettario">Forfettario</option>
                                            </select>
                                            <p className="font-body text-xs text-nebbia/30 mt-1.5">Guida lo scadenzario fiscale precaricato nei mandati.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="border-t border-white/8 pt-3 space-y-3">
                                    <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase">Contatti</p>
                                    <InputField label="Email" type="email" {...fc('email')} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputField label="Telefono" {...fc('telefono')} />
                                        <InputField label="PEC" {...fc('pec')} />
                                    </div>
                                </div>

                                <div className="border-t border-white/8 pt-3 space-y-3">
                                    <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase">Indirizzo</p>
                                    <InputField label="Indirizzo" placeholder="Via Roma 1" {...fc('indirizzo')} />
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2">
                                            <InputField label="Comune" {...fc('comune')} />
                                        </div>
                                        <InputField label="Provincia" placeholder="MI" {...fc('provincia')} />
                                    </div>
                                    <InputField label="CAP" {...fc('cap')} />
                                </div>

                                {erroreCliente && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {erroreCliente}</div>}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {isPF ? [
                                    ['Nome completo', `${cliente.nome ?? ''} ${cliente.cognome ?? ''}`.trim() || '—'],
                                    ['Codice fiscale', cliente.cf || '—'],
                                    ['Data nascita', cliente.data_nascita ? new Date(cliente.data_nascita).toLocaleDateString('it-IT') : '—'],
                                    ['Luogo nascita', cliente.luogo_nascita || '—'],
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                        <span className="font-body text-sm text-nebbia">{v}</span>
                                    </div>
                                )) : [
                                    ['Ragione sociale', cliente.ragione_sociale || '—'],
                                    ['Partita IVA', cliente.partita_iva || '—'],
                                    ['Codice fiscale', cliente.cf || '—'],
                                    ['Sede legale', cliente.sede_legale || '—'],
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                        <span className="font-body text-sm text-nebbia">{v}</span>
                                    </div>
                                ))}

                                {!isPF && (cliente.rappr_nome || cliente.rappr_cognome || cliente.rappr_carica) && (
                                    <div className="border-t border-white/5 pt-3 mt-3 space-y-2">
                                        <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Rappresentante legale</p>
                                        {[
                                            ['Nome', `${cliente.rappr_nome ?? ''} ${cliente.rappr_cognome ?? ''}`.trim() || '—'],
                                            ['Codice fiscale', cliente.rappr_cf || '—'],
                                            ['Carica', cliente.rappr_carica || '—'],
                                        ].map(([l, v]) => (
                                            <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                                <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                                <span className="font-body text-sm text-nebbia/70">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="border-t border-white/5 pt-3 mt-3 space-y-2">
                                    <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Contatti</p>
                                    {[
                                        ['Email', cliente.email],
                                        ['Telefono', cliente.telefono || '—'],
                                        ['PEC', cliente.pec || '—'],
                                    ].map(([l, v]) => (
                                        <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                            <span className="font-body text-sm text-nebbia/70">{v}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-white/5 pt-3 mt-3 space-y-2">
                                    <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Indirizzo</p>
                                    {[
                                        ['Indirizzo', cliente.indirizzo || '—'],
                                        ['Comune', cliente.comune || '—'],
                                        ['Provincia', cliente.provincia || '—'],
                                        ['CAP', cliente.cap || '—'],
                                    ].map(([l, v]) => (
                                        <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                            <span className="font-body text-sm text-nebbia/70">{v}</span>
                                        </div>
                                    ))}
                                </div>

                                {isStudio && (
                                    <div className="border-t border-white/5 pt-3 mt-3">
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Avvocato assegnato</span>
                                            <span className="font-body text-sm text-nebbia">{nomeAvvocato}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <ProssimiAppuntamenti clienteId={id} />
                </div>
            )}

            {tab === 'mandati' && isCommercialista && <GestioneMandati clienteId={id} />}
            {tab === 'pratiche' && isAvvocato && (
                <div className="flex gap-4 min-h-[500px]">
                    <div className={`flex flex-col gap-2 ${praticaSelezionata ? 'w-[20%] shrink-0' : 'flex-1'}`}>
                        <div className="flex justify-end mb-1">
                            <Link to={`/pratiche/nuova?cliente_id=${id}`} className="btn-primary text-sm flex items-center gap-2"><Plus size={14} />Nuova pratica</Link>
                        </div>
                        {pratiche.length === 0 ? (
                            <div className="bg-slate border border-white/5 p-8 text-center"><p className="font-body text-sm text-nebbia/30">Nessuna pratica — creane una</p></div>
                        ) : pratiche.map(p => {
                            const sc = STATI_PRATICA[p.stato] ?? STATI_PRATICA.aperta
                            const sel = praticaSelezionata?.id === p.id
                            return (
                                <button key={p.id} onClick={() => setPraticaSelezionata(sel ? null : p)}
                                    className={`w-full text-left p-4 border transition-all ${sel ? 'bg-oro/8 border-oro/30' : 'bg-slate border-white/5 hover:border-oro/20'}`}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-body text-sm font-medium text-nebbia truncate">{p.titolo}</p>
                                            <p className="font-body text-xs text-nebbia/40 mt-0.5">{p.tipo}</p>
                                        </div>
                                        {p.prossima_udienza && (
                                            <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 bg-red-900/20 border border-red-500/25">
                                                <Calendar size={10} className="text-red-400" />
                                                <span className="font-body text-xs text-red-400/80">
                                                    Udienza {new Date(p.prossima_udienza).toLocaleDateString('it-IT')}
                                                </span>
                                            </div>
                                        )}
                                        <Badge label={sc.label} variant={sc.variant} />
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                    {praticaSelezionata && (
                        <div className="w-[80%] bg-slate border border-white/5 p-5 overflow-y-auto">
                            <PannelloPratica pratica={praticaSelezionata} onClose={() => setPraticaSelezionata(null)} />
                        </div>
                    )}
                </div>
            )}

            {tab === 'documenti' && <TabDocumenti clienteId={id} />}
            {tab === 'comunicazioni' && <TabComunicazioni clienteId={id} />}
            {tab === 'note_interne' && <TabNoteInterne clienteId={id} />}
            {tab === 'pagamenti' && <TabPagamenti clienteId={id} avvocatoId={avvocatoId} />}

            {mostraModalReset && cliente && (
                <ModalResetPassword
                    cliente={cliente}
                    onClose={() => setMostraModalReset(false)}
                />
            )}
        </div>
    )
}