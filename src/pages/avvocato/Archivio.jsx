// src/pages/avvocato/Archivio.jsx
import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { PageHeader, EmptyState, Badge } from '@/components/shared'
import {
    Upload, Search, Sparkles, FileText, File, X, Check,
    AlertCircle, Tag, User, FolderOpen, Folder, Eye, Trash2, Filter,
    Archive, Lock, HardDrive, Gavel, Calendar, ArrowRight, ArrowLeft,
    AlertTriangle, Loader2, Building2, CalendarDays, Plus,
    ChevronRight, ChevronDown, Edit2, Save, Tags,
} from 'lucide-react'
import AggiungiAEtichetta from '@/components/AggiungiAEtichetta'
import { supabase } from '@/lib/supabase'
import { useLocation, useNavigate, Link } from 'react-router-dom'

const MAX_FILES = 100
const PARALLEL = 5
const SOGLIA_STORAGE_PIENO = 0.90

// ─── HELPERS ────────────────────────────────────────────────

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

function evidenziaParole(testo, parole, classe = 'bg-salvia/30') {
    if (!parole?.length || !testo) return testo ?? ''
    let risultato = testo
    const ordinate = [...parole].sort((a, b) => b.length - a.length)
    for (const parola of ordinate) {
        if (!parola?.trim()) continue
        const escaped = parola.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`(${escaped})`, 'gi')
        risultato = risultato.replace(regex, `<mark class="${classe} text-nebbia rounded px-0.5">$1</mark>`)
    }
    return risultato
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

const TIPI_DOCUMENTO_LABEL = {
    contratto: 'Contratto',
    preliminare: 'Preliminare',
    procura: 'Procura',
    perizia: 'Perizia',
    consulenza_tecnica: 'CT',
    citazione: 'Citazione',
    comparsa: 'Comparsa',
    ricorso: 'Ricorso',
    memoria: 'Memoria',
    appello: 'Appello',
    decreto_ingiuntivo: 'D. Ingiuntivo',
    atto_amministrativo: 'Atto amm.',
    verbale: 'Verbale',
    delibera: 'Delibera',
    raccomandata: 'Raccomandata',
    diffida: 'Diffida',
    lettera: 'Lettera',
    email: 'Email',
    fattura: 'Fattura',
    ricevuta: 'Ricevuta',
    preventivo: 'Preventivo',
    estratto_conto: 'E/C',
    documento_identita: 'ID',
    documento_societario: 'Doc. soc.',
    denuncia: 'Denuncia',
    querela: 'Querela',
    sentenza: 'Sentenza',
    ordinanza: 'Ordinanza',
    decreto: 'Decreto',
    altro: 'Altro',
}

const STATUS_CONFIG = {
    pending: { label: 'In coda', variant: 'gray' },
    processing: { label: 'Elaborazione', variant: 'warning' },
    completed: { label: 'Indicizzato', variant: 'salvia' },
    failed: { label: 'Errore', variant: 'red' },
    skipped: { label: 'Manuale', variant: 'gray' },
}

const COLORE_DEFAULT_CATEGORIA = '#C9A45C'

// Normalizza una sentenza propria nella stessa shape usata per i documenti
function normalizzaSentenza(s) {
    const titoloComp = titoloSentenza(s)
    const titoloFinale = s.oggetto ? `${titoloComp} — ${s.oggetto}` : titoloComp
    return {
        _kind: 'sentenza',
        id: s.id,
        titolo: titoloFinale,
        categoria_id: s.categoria_id ?? null,
        sottocategoria_id: s.sottocategoria_id ?? null,
        cliente_id: null,
        pratica_id: null,
        tipo: 'pdf',
        storage_path: s.pdf_storage_path,
        tipo_file: 'application/pdf',
        dimensione: s.pdf_size_bytes,
        ocr_status: 'completed',
        verificato: true,
        created_at: s.created_at,
        tags: s.parole_chiave ?? [],
        categoria: null,
        metadati: {
            suggeriti: {
                riepilogo: s.principio_diritto?.slice(0, 240) ?? null,
                categoria_suggerita: null,
                tipo_documento: s.tipo_provvedimento ?? null,
                tags: s.parole_chiave ?? [],
                soggetti: [],
            }
        },
        _sentenza: s,
    }
}

// Filtro data caricamento
function passaFiltroData(doc, filtroData, dataDa, dataA) {
    if (!filtroData || filtroData === 'tutti') return true
    const created = new Date(doc.created_at)
    const ora = new Date()

    if (filtroData === '7gg') {
        const limite = new Date(ora.getTime() - 7 * 24 * 60 * 60 * 1000)
        return created >= limite
    }
    if (filtroData === '30gg') {
        const limite = new Date(ora.getTime() - 30 * 24 * 60 * 60 * 1000)
        return created >= limite
    }
    if (filtroData === 'range') {
        if (dataDa && created < new Date(dataDa)) return false
        if (dataA) {
            const fine = new Date(dataA)
            fine.setHours(23, 59, 59, 999)
            if (created > fine) return false
        }
        return true
    }
    return true
}

// ─── BARRA PROGRESSO UPLOAD ────────────────────────────────

function BarraProgresso({ items }) {
    if (!items || items.length === 0) return null
    const completati = items.filter(i => ['completed', 'failed', 'skipped'].includes(i.status)).length
    const totale = items.length
    const pct = Math.round((completati / totale) * 100)

    return (
        <div className="bg-slate border border-oro/20 p-5 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-oro" />
                    <p className="font-body text-sm font-medium text-nebbia">Elaborazione archivio</p>
                </div>
                <span className="font-body text-sm text-oro">{completati} di {totale}</span>
            </div>

            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-oro transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                        {item.status === 'completed' && <Check size={12} className="text-salvia shrink-0" />}
                        {item.status === 'failed' && <X size={12} className="text-red-400 shrink-0" />}
                        {item.status === 'processing' && <Loader2 size={12} className="animate-spin text-oro shrink-0" />}
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
                            <span className="font-body text-xs text-oro/50 ml-auto shrink-0">analisi...</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── FORM METADATI UPLOAD ──────────────────────────────────

function FormMetadatiMulti({
    files,
    onSalva,
    onAnnulla,
    onRimuoviFile,
    onAggiungiAltri,
    categorie = [],
    sottocategorie = [],
}) {
    // Stato: array di titoli, uno per file, indicizzato per posizione
    const [titoli, setTitoli] = useState(
        () => files.map(f => f.name.replace(/\.[^/.]+$/, ''))
    )
    const [categoriaBatch, setCategoriaBatch] = useState('')
    const [sottocatBatch, setSottocatBatch] = useState('')

    // Reset sottocat quando cambia categoria
    useEffect(() => { setSottocatBatch('') }, [categoriaBatch])

    const sottocatPerCat = sottocategorie.filter(s => s.categoria_id === categoriaBatch)

    // Sincronizza l'array titoli quando files cambia (aggiunte/rimozioni)
    useEffect(() => {
        setTitoli(prev => {
            const nuovi = files.map((f, i) => prev[i] ?? f.name.replace(/\.[^/.]+$/, ''))
            return nuovi.slice(0, files.length)
        })
    }, [files])

    function aggiornaTitolo(idx, valore) {
        setTitoli(prev => prev.map((t, i) => i === idx ? valore : t))
    }

    function applicaTitoloDaNome(idx) {
        aggiornaTitolo(idx, files[idx].name.replace(/\.[^/.]+$/, ''))
    }

    const tuttiTitoliValidi = titoli.every(t => t && t.trim().length > 0)
    const dimensioneTotaleMB = (files.reduce((s, f) => s + f.size, 0) / (1024 * 1024)).toFixed(1)

    return (
        <div className="bg-slate border border-oro/20 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="font-body text-sm text-nebbia">
                    {files.length === 1
                        ? 'Inserisci il titolo del documento'
                        : `Inserisci i titoli per ${files.length} documenti`
                    }
                    <span className="ml-2 text-nebbia/40 text-xs">({dimensioneTotaleMB} MB totali)</span>
                </p>
                <label className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 text-nebbia/60 hover:border-oro/30 hover:text-oro font-body text-xs cursor-pointer transition-colors">
                    <Plus size={11} /> Aggiungi altri
                    <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.xlsx,.xls"
                        className="hidden"
                        onChange={onAggiungiAltri}
                    />
                </label>
            </div>

            {categorie.length > 0 && (
                <div className="bg-petrolio/40 border border-white/5 p-3 space-y-2">
                    <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest">
                        Categoria per tutti (opzionale)
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        <select
                            value={categoriaBatch}
                            onChange={e => setCategoriaBatch(e.target.value)}
                            className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                        >
                            <option value="">Nessuna categoria</option>
                            {categorie.map(c => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                        </select>

                        {categoriaBatch && sottocatPerCat.length > 0 && (
                            <select
                                value={sottocatBatch}
                                onChange={e => setSottocatBatch(e.target.value)}
                                className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            >
                                <option value="">Nessuna sottocategoria</option>
                                {sottocatPerCat.map(s => (
                                    <option key={s.id} value={s.id}>{s.nome}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    <p className="font-body text-xs text-nebbia/30 italic">
                        Potrai modificare la categoria per ogni documento singolarmente dopo il caricamento.
                    </p>
                </div>
            )}

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {files.map((f, idx) => (
                    <div key={`${f.name}-${f.size}-${idx}`} className="bg-petrolio/40 border border-white/5 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                {isPdf(f)
                                    ? <FileText size={12} className="text-oro/60 shrink-0" />
                                    : <File size={12} className="text-nebbia/40 shrink-0" />
                                }
                                <span className="font-body text-xs text-nebbia/50 truncate">{f.name}</span>
                                <span className="font-body text-[10px] text-nebbia/30 shrink-0">
                                    {(f.size / 1024 / 1024).toFixed(1)} MB
                                </span>
                                {!isPdf(f) && f.name.toLowerCase().endsWith('.txt') && (
                                    <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/5 border border-salvia/20 text-salvia/70 shrink-0">
                                        TXT
                                    </span>
                                )}
                                {!isPdf(f) && !f.name.toLowerCase().endsWith('.txt') && (
                                    <span className="font-body text-[10px] px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0" title="Verrà caricato ma non digitalizzato automaticamente">
                                        Manuale
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => onRimuoviFile(idx)}
                                className="text-nebbia/30 hover:text-red-400 transition-colors p-1 shrink-0"
                                title="Rimuovi dalla coda"
                            >
                                <X size={11} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                value={titoli[idx] ?? ''}
                                onChange={e => aggiornaTitolo(idx, e.target.value)}
                                placeholder="Titolo del documento"
                                className="flex-1 bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                            <button
                                onClick={() => applicaTitoloDaNome(idx)}
                                className="font-body text-[10px] text-nebbia/30 hover:text-oro px-2 py-1 transition-colors shrink-0"
                                title="Usa il nome del file come titolo"
                            >
                                ↺ Nome file
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <p className="font-body text-xs text-nebbia/25 italic">
                Categoria, soggetti, riepilogo e tag verranno suggeriti automaticamente da Lex dopo l'upload (solo per PDF e TXT).
            </p>

            <div className="flex gap-2">
                <button
                    onClick={() => onSalva(titoli, categoriaBatch || null, sottocatBatch || null)}
                    disabled={!tuttiTitoliValidi}
                    className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Check size={13} />
                    {files.length === 1 ? 'Carica documento' : `Carica ${files.length} documenti`}
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

// ─── CARD CARTELLA (categoria) ─────────────────────────────

function CardCartella({ categoria, count, onClick, vuota = false }) {
    return (
        <button
            onClick={onClick}
            className={`p-5 text-left transition-all group ${vuota
                    ? 'bg-slate/40 border border-dashed border-white/5 hover:border-oro/20 hover:bg-petrolio/20 opacity-60 hover:opacity-100'
                    : 'bg-slate border border-white/5 hover:border-oro/30 hover:bg-petrolio/40'
                }`}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className={`w-10 h-10 flex items-center justify-center border ${vuota ? 'border-white/10 bg-white/5' : 'border-oro/20 bg-oro/5'
                    }`}>
                    <Folder size={16} className={vuota ? 'text-nebbia/40' : 'text-oro'} strokeWidth={1.5} />
                </div>
                <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro transition-colors mt-1" />
            </div>
            <p className={`font-display text-base mb-1 line-clamp-2 leading-snug ${vuota ? 'text-nebbia/60' : 'text-nebbia'
                }`}>
                {categoria?.nome ?? 'Senza categoria'}
            </p>
            <p className="font-body text-xs text-nebbia/40">
                {vuota ? 'vuota' : `${count} ${count === 1 ? 'documento' : 'documenti'}`}
            </p>
        </button>
    )
}

// ─── PICKER CATEGORIA INLINE ───────────────────────────────

function PickerCategoria({ doc, categorie, sottocategorie, onAggiornata, onChiudi }) {
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState(null)

    const tabella = doc._kind === 'sentenza' ? 'sentenze' : 'archivio_documenti'
    const idRecord = doc._kind === 'sentenza' ? doc._sentenza?.id : doc.id

    async function assegna(catId, subId) {
        setSalvando(true); setErrore(null)
        try {
            const update = {
                categoria_id: catId,
                sottocategoria_id: subId,
            }
            if (tabella === 'archivio_documenti') {
                update.updated_at = new Date().toISOString()
            }
            const { error } = await supabase
                .from(tabella)
                .update(update)
                .eq('id', idRecord)
            if (error) throw new Error(error.message)
            if (onAggiornata) await onAggiornata()
            onChiudi()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(false)
        }
    }

    return (
        <div className="absolute z-30 top-full left-0 mt-1 w-72 bg-slate border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between p-2 border-b border-white/5">
                <p className="font-body text-xs text-nebbia/40">Assegna categoria</p>
                <button onClick={onChiudi} className="text-nebbia/30 hover:text-nebbia">
                    <X size={12} />
                </button>
            </div>

            {errore && (
                <p className="p-2 font-body text-xs text-red-400 border-b border-red-500/20">{errore}</p>
            )}

            <div className="max-h-72 overflow-y-auto">
                <button
                    onClick={() => assegna(null, null)}
                    disabled={salvando}
                    className="w-full text-left px-3 py-2 hover:bg-petrolio/50 transition-colors border-b border-white/5 disabled:opacity-50"
                >
                    <p className="font-body text-xs text-nebbia/40 italic">Nessuna categoria</p>
                </button>

                {categorie.length === 0 ? (
                    <p className="p-3 text-center font-body text-xs text-nebbia/25">
                        Nessuna categoria — usa "Gestisci categorie" per crearne
                    </p>
                ) : categorie.map(cat => {
                    const subs = sottocategorie.filter(s => s.categoria_id === cat.id)
                    return (
                        <div key={cat.id} className="border-b border-white/5 last:border-0">
                            <button
                                onClick={() => assegna(cat.id, null)}
                                disabled={salvando}
                                className="w-full text-left px-3 py-2 hover:bg-petrolio/50 transition-colors disabled:opacity-50"
                            >
                                <div className="flex items-center gap-2">
                                    <Folder size={11} className="text-oro" />
                                    <p className="font-body text-sm text-nebbia/70">{cat.nome}</p>
                                </div>
                            </button>
                            {subs.length > 0 && (
                                <div className="bg-petrolio/30">
                                    {subs.map(sub => (
                                        <button
                                            key={sub.id}
                                            onClick={() => assegna(cat.id, sub.id)}
                                            disabled={salvando}
                                            className="w-full text-left px-3 py-1.5 pl-9 hover:bg-petrolio/50 transition-colors disabled:opacity-50"
                                        >
                                            <p className="font-body text-xs text-nebbia/55">└ {sub.nome}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── MODAL GESTIONE CATEGORIE ──────────────────────────────

function ModalGestioneCategorie({
    titolareId,
    categorie,
    sottocategorie,
    documenti,
    onAggiornata,
    onClose,
}) {
    const [editing, setEditing] = useState(null) // {tipo: 'cat'|'sub', id, valore}
    const [creandoCat, setCreandoCat] = useState(false)
    const [nuovaCatNome, setNuovaCatNome] = useState('')
    const [creandoSubFor, setCreandoSubFor] = useState(null)
    const [nuovaSubNome, setNuovaSubNome] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState(null)

    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    function countDocPerCategoria(catId) {
        return documenti.filter(d => d.categoria_id === catId).length
    }

    function countDocPerSottocat(subId) {
        return documenti.filter(d => d.sottocategoria_id === subId).length
    }

    async function creaCategoria() {
        const nome = nuovaCatNome.trim()
        if (!nome) return
        setSalvando(true); setErrore(null)
        try {
            const { error } = await supabase.from('categorie_archivio').insert({
                titolare_id: titolareId,
                nome,
                colore: COLORE_DEFAULT_CATEGORIA,
            })
            if (error) throw new Error(error.message)
            setNuovaCatNome(''); setCreandoCat(false)
            await onAggiornata()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(false)
        }
    }

    async function rinominaCategoria(id, nuovoNome) {
        const nome = nuovoNome.trim()
        if (!nome) return
        setSalvando(true); setErrore(null)
        try {
            const { error } = await supabase
                .from('categorie_archivio')
                .update({ nome })
                .eq('id', id)
            if (error) throw new Error(error.message)
            setEditing(null)
            await onAggiornata()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(false)
        }
    }

    async function eliminaCategoria(cat) {
        const docCount = countDocPerCategoria(cat.id)
        const subCount = sottocategorie.filter(s => s.categoria_id === cat.id).length
        const msg = docCount > 0
            ? `Eliminare la categoria "${cat.nome}"?\n\n${docCount} ${docCount === 1 ? 'documento perderà' : 'documenti perderanno'} la categoria.${subCount > 0 ? `\n${subCount} ${subCount === 1 ? 'sottocategoria sarà eliminata' : 'sottocategorie saranno eliminate'}.` : ''}`
            : `Eliminare la categoria "${cat.nome}"?${subCount > 0 ? `\n\n${subCount} ${subCount === 1 ? 'sottocategoria sarà eliminata' : 'sottocategorie saranno eliminate'}.` : ''}`
        if (!confirm(msg)) return
        setSalvando(true); setErrore(null)
        try {
            const { error } = await supabase
                .from('categorie_archivio')
                .delete()
                .eq('id', cat.id)
            if (error) throw new Error(error.message)
            await onAggiornata()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(false)
        }
    }

    async function creaSottocategoria(catId) {
        const nome = nuovaSubNome.trim()
        if (!nome) return
        setSalvando(true); setErrore(null)
        try {
            const { error } = await supabase.from('sottocategorie_archivio').insert({
                categoria_id: catId,
                nome,
            })
            if (error) throw new Error(error.message)
            setNuovaSubNome(''); setCreandoSubFor(null)
            await onAggiornata()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(false)
        }
    }

    async function rinominaSottocategoria(id, nuovoNome) {
        const nome = nuovoNome.trim()
        if (!nome) return
        setSalvando(true); setErrore(null)
        try {
            const { error } = await supabase
                .from('sottocategorie_archivio')
                .update({ nome })
                .eq('id', id)
            if (error) throw new Error(error.message)
            setEditing(null)
            await onAggiornata()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(false)
        }
    }

    async function eliminaSottocategoria(sub) {
        const docCount = countDocPerSottocat(sub.id)
        const msg = docCount > 0
            ? `Eliminare "${sub.nome}"?\n\n${docCount} ${docCount === 1 ? 'documento perderà' : 'documenti perderanno'} la sottocategoria (la categoria principale resta).`
            : `Eliminare "${sub.nome}"?`
        if (!confirm(msg)) return
        setSalvando(true); setErrore(null)
        try {
            const { error } = await supabase
                .from('sottocategorie_archivio')
                .delete()
                .eq('id', sub.id)
            if (error) throw new Error(error.message)
            await onAggiornata()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(false)
        }
    }

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
                        <Tags size={14} className="text-oro" />
                        <p className="font-body text-sm font-medium text-nebbia">Gestisci categorie</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-nebbia/40 hover:text-nebbia transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={13} /> {errore}
                        </div>
                    )}

                    {categorie.length === 0 && !creandoCat && (
                        <div className="text-center py-8">
                            <Folder size={28} className="text-nebbia/20 mx-auto mb-2" />
                            <p className="font-body text-sm text-nebbia/40">Nessuna categoria ancora</p>
                            <p className="font-body text-xs text-nebbia/25 mt-1">
                                Crea la prima categoria per organizzare il tuo archivio
                            </p>
                        </div>
                    )}

                    {categorie.map(cat => {
                        const subs = sottocategorie.filter(s => s.categoria_id === cat.id)
                        const isEdit = editing?.tipo === 'cat' && editing.id === cat.id
                        return (
                            <div key={cat.id} className="bg-petrolio/40 border border-white/5 p-3">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Folder size={13} className="text-oro shrink-0" />
                                        {isEdit ? (
                                            <input
                                                autoFocus
                                                value={editing.valore}
                                                onChange={e => setEditing({ ...editing, valore: e.target.value })}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') rinominaCategoria(cat.id, editing.valore)
                                                    if (e.key === 'Escape') setEditing(null)
                                                }}
                                                className="flex-1 bg-slate border border-oro/40 text-nebbia font-body text-sm px-2 py-1 outline-none"
                                            />
                                        ) : (
                                            <p className="font-body text-sm font-medium text-nebbia truncate">{cat.nome}</p>
                                        )}
                                        <span className="font-body text-xs text-nebbia/30 shrink-0">
                                            {countDocPerCategoria(cat.id)} doc
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {isEdit ? (
                                            <>
                                                <button
                                                    onClick={() => rinominaCategoria(cat.id, editing.valore)}
                                                    disabled={salvando}
                                                    className="p-1.5 text-salvia hover:bg-salvia/10 transition-colors"
                                                    title="Salva"
                                                >
                                                    <Save size={12} />
                                                </button>
                                                <button
                                                    onClick={() => setEditing(null)}
                                                    className="p-1.5 text-nebbia/40 hover:text-nebbia transition-colors"
                                                    title="Annulla"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setEditing({ tipo: 'cat', id: cat.id, valore: cat.nome })}
                                                    className="p-1.5 text-nebbia/40 hover:text-oro transition-colors"
                                                    title="Rinomina"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                                <button
                                                    onClick={() => eliminaCategoria(cat)}
                                                    disabled={salvando}
                                                    className="p-1.5 text-nebbia/40 hover:text-red-400 transition-colors"
                                                    title="Elimina"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="ml-5 space-y-1 mt-2">
                                    {subs.map(sub => {
                                        const isSubEdit = editing?.tipo === 'sub' && editing.id === sub.id
                                        return (
                                            <div key={sub.id} className="flex items-center justify-between gap-2 py-1">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <span className="text-nebbia/30">└</span>
                                                    {isSubEdit ? (
                                                        <input
                                                            autoFocus
                                                            value={editing.valore}
                                                            onChange={e => setEditing({ ...editing, valore: e.target.value })}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') rinominaSottocategoria(sub.id, editing.valore)
                                                                if (e.key === 'Escape') setEditing(null)
                                                            }}
                                                            className="flex-1 bg-slate border border-oro/40 text-nebbia font-body text-xs px-2 py-1 outline-none"
                                                        />
                                                    ) : (
                                                        <p className="font-body text-xs text-nebbia/70 truncate">{sub.nome}</p>
                                                    )}
                                                    <span className="font-body text-xs text-nebbia/25 shrink-0">
                                                        {countDocPerSottocat(sub.id)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {isSubEdit ? (
                                                        <>
                                                            <button
                                                                onClick={() => rinominaSottocategoria(sub.id, editing.valore)}
                                                                disabled={salvando}
                                                                className="p-1 text-salvia hover:bg-salvia/10 transition-colors"
                                                            >
                                                                <Save size={11} />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditing(null)}
                                                                className="p-1 text-nebbia/40 hover:text-nebbia transition-colors"
                                                            >
                                                                <X size={11} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => setEditing({ tipo: 'sub', id: sub.id, valore: sub.nome })}
                                                                className="p-1 text-nebbia/30 hover:text-oro transition-colors"
                                                            >
                                                                <Edit2 size={11} />
                                                            </button>
                                                            <button
                                                                onClick={() => eliminaSottocategoria(sub)}
                                                                disabled={salvando}
                                                                className="p-1 text-nebbia/30 hover:text-red-400 transition-colors"
                                                            >
                                                                <Trash2 size={11} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {creandoSubFor === cat.id ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-nebbia/30">└</span>
                                            <input
                                                autoFocus
                                                value={nuovaSubNome}
                                                onChange={e => setNuovaSubNome(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') creaSottocategoria(cat.id)
                                                    if (e.key === 'Escape') { setCreandoSubFor(null); setNuovaSubNome('') }
                                                }}
                                                placeholder="Nome sottocategoria..."
                                                className="flex-1 bg-slate border border-oro/40 text-nebbia font-body text-xs px-2 py-1 outline-none"
                                            />
                                            <button
                                                onClick={() => creaSottocategoria(cat.id)}
                                                disabled={salvando || !nuovaSubNome.trim()}
                                                className="p-1 text-salvia hover:bg-salvia/10 transition-colors disabled:opacity-40"
                                            >
                                                <Save size={11} />
                                            </button>
                                            <button
                                                onClick={() => { setCreandoSubFor(null); setNuovaSubNome('') }}
                                                className="p-1 text-nebbia/40 hover:text-nebbia transition-colors"
                                            >
                                                <X size={11} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => { setCreandoSubFor(cat.id); setNuovaSubNome('') }}
                                            className="flex items-center gap-1 mt-1 font-body text-[11px] text-nebbia/30 hover:text-oro transition-colors"
                                        >
                                            <Plus size={10} /> Aggiungi sottocategoria
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {creandoCat ? (
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                value={nuovaCatNome}
                                onChange={e => setNuovaCatNome(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') creaCategoria()
                                    if (e.key === 'Escape') { setCreandoCat(false); setNuovaCatNome('') }
                                }}
                                placeholder="Nome categoria..."
                                className="flex-1 bg-petrolio border border-oro/40 text-nebbia font-body text-sm px-3 py-2 outline-none"
                            />
                            <button
                                onClick={creaCategoria}
                                disabled={salvando || !nuovaCatNome.trim()}
                                className="px-3 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40"
                            >
                                <Save size={12} />
                            </button>
                            <button
                                onClick={() => { setCreandoCat(false); setNuovaCatNome('') }}
                                className="p-2 text-nebbia/40 hover:text-nebbia transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setCreandoCat(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-white/10 text-nebbia/40 hover:border-oro/40 hover:text-oro font-body text-sm transition-colors"
                        >
                            <Plus size={13} /> Nuova categoria
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/5 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── CARD DOCUMENTO ────────────────────────────────────────

function CardDocumento({
    doc,
    onElimina,
    onAggiornata,
    clienti,
    pratiche = [],
    categorie = [],
    sottocategorie = [],
    etichetteUtente = [],
    tagsByDoc = {},
    paroleChiave = [],
    chunkRilevante = null,
    mostraPath = false,
}) {
    const navigate = useNavigate()
    const isSentenza = doc._kind === 'sentenza'

    const etichetteAssegnate = (tagsByDoc[doc.id] ?? [])
        .map(eid => etichetteUtente.find(e => e.id === eid))
        .filter(Boolean)
    const [aperto, setAperto] = useState(false)
    const [pdfUrl, setPdfUrl] = useState(null)
    const [testoFile, setTestoFile] = useState(null)
    const [caricandoAnteprima, setCaricandoAnteprima] = useState(false)
    const cliente = clienti.find(c => c.id === doc.cliente_id)
    const sc = STATUS_CONFIG[doc.ocr_status] ?? STATUS_CONFIG.pending

    const [pickerPratica, setPickerPratica] = useState(false)
    const [pickerCat, setPickerCat] = useState(false)
    const [salvandoPratica, setSalvandoPratica] = useState(false)
    const praticaCorrente = pratiche.find(p => p.id === doc.pratica_id) ?? null
    const categoriaCorrente = categorie.find(c => c.id === doc.categoria_id) ?? null
    const sottocatCorrente = sottocategorie.find(s => s.id === doc.sottocategoria_id) ?? null

    async function assegnaAPratica(praticaId) {
        setSalvandoPratica(true)
        try {
            await supabase
                .from('archivio_documenti')
                .update({ pratica_id: praticaId, updated_at: new Date().toISOString() })
                .eq('id', doc.id)
            if (onAggiornata) await onAggiornata()
            setPickerPratica(false)
        } catch (err) {
            console.error('Errore assegnazione pratica:', err)
        } finally {
            setSalvandoPratica(false)
        }
    }

    async function rimuoviDaPratica() {
        setSalvandoPratica(true)
        try {
            await supabase
                .from('archivio_documenti')
                .update({ pratica_id: null, updated_at: new Date().toISOString() })
                .eq('id', doc.id)
            if (onAggiornata) await onAggiornata()
        } catch (err) {
            console.error('Errore rimozione pratica:', err)
        } finally {
            setSalvandoPratica(false)
        }
    }

    const sugg = doc.metadati?.suggeriti ?? null
    const verAuto = doc.metadati?.verificato_auto === true
    const tipoDocLabel = sugg?.tipo_documento && sugg.tipo_documento !== 'altro'
        ? TIPI_DOCUMENTO_LABEL[sugg.tipo_documento] ?? sugg.tipo_documento
        : null

    const evidenzia = (testo) => evidenziaParole(testo, paroleChiave)

    async function apriDocumento() {
        // Per le sentenze, naviga alla pagina dedicata
        if (isSentenza) {
            navigate(`/sentenze/${doc.id}`)
            return
        }

        if (!doc.storage_path && !doc.id) return
        setAperto(true)
        setCaricandoAnteprima(true)

        try {
            // Recupera storage_path se non presente nel doc (es. risultati search)
            let path = doc.storage_path
            if (!path) {
                const { data } = await supabase
                    .from('archivio_documenti')
                    .select('storage_path')
                    .eq('id', doc.id)
                    .single()
                path = data?.storage_path
            }
            if (!path) {
                setCaricandoAnteprima(false)
                return
            }

            const { data: signed } = await supabase.storage.from('archivio').createSignedUrl(path, 3600)
            if (!signed?.signedUrl) {
                setCaricandoAnteprima(false)
                return
            }

            setPdfUrl(signed.signedUrl)

            // Per i .txt scarichiamo il contenuto e lo renderizziamo come <pre>
            if (doc.tipo === 'txt') {
                try {
                    const res = await fetch(signed.signedUrl)
                    if (!res.ok) throw new Error(`HTTP ${res.status}`)
                    const text = await res.text()
                    setTestoFile(text)
                } catch (err) {
                    setTestoFile(`Impossibile caricare il contenuto: ${err.message}`)
                }
            }
        } finally {
            setCaricandoAnteprima(false)
        }
    }

    return (
        <div className="bg-slate border border-white/5 hover:border-white/10 transition-colors">
            <div className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 flex items-center justify-center border border-white/10 shrink-0 mt-0.5">
                    {isSentenza
                        ? <Gavel size={15} className="text-oro/60" />
                        : doc.tipo === 'pdf'
                            ? <FileText size={15} className="text-oro/60" />
                            : <File size={15} className="text-nebbia/30" />
                    }
                </div>

                <div className="flex-1 min-w-0">
                    {/* Riga 1: badge categoria avv (sx) + badge Haiku/status (dx) */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                        {/* Badge categoria/sottocategoria avvocato (oro, sx) */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {!isSentenza && (
                                <div className="relative">
                                    <button
                                        onClick={() => setPickerCat(v => !v)}
                                        className={`flex items-center gap-1 px-1.5 py-0.5 font-body text-[10px] uppercase tracking-wider transition-colors ${categoriaCorrente
                                            ? 'bg-oro/15 border border-oro/40 text-oro hover:bg-oro/25'
                                            : 'border border-dashed border-white/15 text-nebbia/30 hover:border-oro/30 hover:text-oro'
                                            }`}
                                        title="Cambia categoria"
                                    >
                                        <Folder size={9} />
                                        {categoriaCorrente?.nome ?? 'No categoria'}
                                    </button>
                                    {pickerCat && (
                                        <PickerCategoria
                                            doc={doc}
                                            categorie={categorie}
                                            sottocategorie={sottocategorie}
                                            onAggiornata={onAggiornata}
                                            onChiudi={() => setPickerCat(false)}
                                        />
                                    )}
                                </div>
                            )}
                            {isSentenza && categoriaCorrente && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-oro/15 border border-oro/40 text-oro font-body text-[10px] uppercase tracking-wider">
                                    <Folder size={9} />
                                    {categoriaCorrente.nome}
                                </span>
                            )}
                            {sottocatCorrente && (
                                <span className="font-body text-[10px] px-1.5 py-0.5 bg-oro/5 border border-oro/20 text-oro/80 uppercase tracking-wider">
                                    {sottocatCorrente.nome}
                                </span>
                            )}
                            {isSentenza && (
                                <span className="font-body text-[10px] px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                    <Gavel size={9} /> Sentenza
                                </span>
                            )}
                        </div>

                        {/* Status + tipo Haiku (salvia, dx) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {tipoDocLabel && (
                                <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/5 border border-salvia/20 text-salvia uppercase tracking-wider flex items-center gap-1">
                                    <Sparkles size={9} /> {tipoDocLabel}
                                </span>
                            )}
                            {!isSentenza && <Badge label={sc.label} variant={sc.variant} />}
                            {verAuto && doc.ocr_status === 'completed' && (
                                <span
                                    title="Verificato automaticamente — controlla i metadati estratti"
                                    className="font-body text-[10px] px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1"
                                >
                                    <Sparkles size={9} /> Auto
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Titolo */}
                    <p
                        className="font-body text-sm font-medium text-nebbia mt-1.5 leading-snug"
                        dangerouslySetInnerHTML={{ __html: evidenzia(doc.titolo) }}
                    />

                    {/* Path (mostrato in vista lista flat / ricerca) */}
                    {mostraPath && (categoriaCorrente || sottocatCorrente) && (
                        <p className="font-body text-[10px] text-nebbia/30 mt-0.5 flex items-center gap-1">
                            {categoriaCorrente && <span>{categoriaCorrente.nome}</span>}
                            {categoriaCorrente && sottocatCorrente && <ChevronRight size={9} />}
                            {sottocatCorrente && <span>{sottocatCorrente.nome}</span>}
                        </p>
                    )}

                    {sugg?.riepilogo && (
                        <p
                            className="font-body text-xs text-nebbia/55 mt-1.5 leading-relaxed line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: evidenzia(sugg.riepilogo) }}
                        />
                    )}

                    {/* Metadati riga: cliente, data, dimensione */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
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

                    {/* Tag manuali + tag suggeriti Haiku */}
                    {((doc.tags ?? []).length > 0 || (sugg?.tags ?? []).length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {(doc.tags ?? []).map(t => (
                                <span
                                    key={`m-${t}`}
                                    className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35"
                                    dangerouslySetInnerHTML={{ __html: evidenzia(t) }}
                                />
                            ))}
                            {(sugg?.tags ?? []).map(t => (
                                <span
                                    key={`s-${t}`}
                                    className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/5 border border-salvia/15 text-salvia/70"
                                    title="Suggerito da Lex"
                                    dangerouslySetInnerHTML={{ __html: evidenzia(t) }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Soggetti estratti (compatti) */}
                    {!isSentenza && (sugg?.soggetti ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {sugg.soggetti.slice(0, 3).map((s, i) => (
                                <span
                                    key={i}
                                    className="font-body text-[10px] text-nebbia/40 flex items-center gap-1"
                                >
                                    {s.tipo === 'persona_giuridica' || s.tipo === 'ente_pubblico'
                                        ? <Building2 size={9} />
                                        : <User size={9} />}
                                    <span dangerouslySetInnerHTML={{ __html: evidenzia(s.nome) }} />
                                    {s.ruolo && s.ruolo !== 'altro' && (
                                        <span className="text-nebbia/25">({s.ruolo})</span>
                                    )}
                                </span>
                            ))}
                            {sugg.soggetti.length > 3 && (
                                <span className="font-body text-[10px] text-nebbia/30">
                                    +{sugg.soggetti.length - 3} altri
                                </span>
                            )}
                        </div>
                    )}

                    {/* Azioni: pratica + etichette (solo per documenti, non sentenze) */}
                    {!isSentenza && (
                        <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-white/5">
                            {/* Aggiungi a pratica */}
                            {praticaCorrente ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-oro/5 border border-oro/20 text-oro font-body text-xs">
                                    <FolderOpen size={10} />
                                    <span className="max-w-[160px] truncate">{praticaCorrente.titolo}</span>
                                    <button
                                        onClick={rimuoviDaPratica}
                                        disabled={salvandoPratica}
                                        className="text-oro/50 hover:text-red-400 transition-colors ml-1"
                                        title="Rimuovi dalla pratica"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <button
                                        onClick={() => setPickerPratica(v => !v)}
                                        className="flex items-center gap-1.5 px-2 py-1 border border-white/10 text-nebbia/50 hover:border-oro/30 hover:text-oro transition-colors font-body text-xs"
                                    >
                                        <FolderOpen size={10} />
                                        Aggiungi a pratica
                                    </button>
                                    {pickerPratica && (
                                        <div className="absolute z-20 top-full left-0 mt-1 w-72 bg-slate border border-white/10 shadow-2xl">
                                            <div className="flex items-center justify-between p-2 border-b border-white/5">
                                                <p className="font-body text-xs text-nebbia/40">Scegli una pratica</p>
                                                <button onClick={() => setPickerPratica(false)} className="text-nebbia/30 hover:text-nebbia">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto">
                                                {pratiche.length === 0 ? (
                                                    <p className="p-3 text-center font-body text-xs text-nebbia/25">
                                                        Nessuna pratica aperta
                                                    </p>
                                                ) : pratiche.map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => assegnaAPratica(p.id)}
                                                        disabled={salvandoPratica}
                                                        className="w-full text-left px-3 py-2 hover:bg-petrolio/50 transition-colors disabled:opacity-50"
                                                    >
                                                        <p className="font-body text-sm text-nebbia/70 truncate">{p.titolo}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Etichette assegnate (display) */}
                            {etichetteAssegnate.map(e => (
                                <span
                                    key={e.id}
                                    className="flex items-center gap-1.5 px-2 py-1 font-body text-xs border"
                                    style={{
                                        borderColor: `${e.colore}80`,
                                        color: e.colore,
                                        backgroundColor: `${e.colore}22`,
                                    }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.colore }} />
                                    {e.nome}
                                </span>
                            ))}

                            {/* Aggiungi a etichetta — usa il componente esistente */}
                            <AggiungiAEtichetta
                                elemento={{ tipo: 'archivio_documento', id: doc.id }}
                                variant="compact"
                                onCambio={onAggiornata}
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={apriDocumento}
                        className="w-7 h-7 flex items-center justify-center text-nebbia/25 hover:text-oro transition-colors"
                        title={isSentenza ? "Apri sentenza" : "Anteprima"}
                    >
                        {isSentenza ? <ArrowRight size={13} /> : <Eye size={13} />}
                    </button>
                    {!isSentenza && (
                        <button
                            onClick={() => onElimina(doc)}
                            className="w-7 h-7 flex items-center justify-center text-nebbia/25 hover:text-red-400 transition-colors"
                            title="Elimina"
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            </div>


            {chunkRilevante && (
                <div className="bg-petrolio/40 border-t border-salvia/10 px-4 py-3">
                    <p className="font-body text-[10px] text-salvia/50 mb-1 uppercase tracking-widest">Sezione rilevante</p>
                    <p
                        className="font-body text-xs text-nebbia/50 leading-relaxed line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: evidenzia(chunkRilevante) }}
                    />
                </div>
            )}
            {aperto && !isSentenza && (
                <div className="border-t border-white/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="font-body text-xs text-nebbia/40">Anteprima documento</p>
                        <button onClick={() => { setAperto(false); setPdfUrl(null); setTestoFile(null) }}
                            className="text-nebbia/25 hover:text-nebbia transition-colors">
                            <X size={14} />
                        </button>
                    </div>

                    {caricandoAnteprima ? (
                        <div className="flex items-center justify-center py-12 bg-petrolio/40 border border-white/5">
                            <Loader2 size={18} className="animate-spin text-oro" />
                        </div>
                    ) : doc.tipo === 'txt' && testoFile !== null ? (
                        <pre className="bg-petrolio/40 border border-white/5 p-4 text-nebbia/70 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                            {testoFile}
                        </pre>
                    ) : pdfUrl && (doc.tipo === 'pdf' || !doc.tipo) ? (
                        <iframe src={pdfUrl} className="w-full rounded" style={{ height: 500 }} title={doc.titolo} />
                    ) : pdfUrl ? (
                        <div className="bg-petrolio/40 border border-white/5 p-6 text-center space-y-3">
                            <FileText size={32} className="text-nebbia/20 mx-auto" />
                            <p className="font-body text-xs text-nebbia/40">
                                Anteprima non disponibile per questo formato
                            </p>
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors"
                            >
                                Apri in nuova scheda
                            </a>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    )
}

// ─── TAB SENTENZE ACQUISTATE (invariato) ───────────────────

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
            <Loader2 size={24} className="animate-spin text-oro" />
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

// ─── PAGINA PRINCIPALE ─────────────────────────────────────

export default function Archivio() {
    const { profile } = useAuth()
    const location = useLocation()
    const fileInputRef = useRef(null)

    const [tabPrincipale, setTabPrincipale] = useState('documenti')

    const [meId, setMeId] = useState(null)
    const [titolareId, setTitolareId] = useState(null)
    const [documenti, setDocumenti] = useState([]) // include sentenze proprie normalizzate
    const [tagsByDoc, setTagsByDoc] = useState({})
    const [etichetteUtente, setEtichetteUtente] = useState([])
    const [clienti, setClienti] = useState([])
    const [pratiche, setPratiche] = useState([])
    const [categorie, setCategorie] = useState([])
    const [sottocategorie, setSottocategorie] = useState([])
    const [loading, setLoading] = useState(true)

    // Modal categorie
    const [mostraModalCategorie, setMostraModalCategorie] = useState(false)

    const [quota, setQuota] = useState({
        gb_piano: 0, gb_topup: 0, gb_totali: 0,
        piano_attivo: false, occupato_gb: 0,
    })

    const [filesSelezionati, setFilesSelezionati] = useState([])
    const [fileCorrente, setFileCorrente] = useState(null)
    const [codaUpload, setCodaUpload] = useState([])
    const [uploadInCorso, setUploadInCorso] = useState(false)
    const [erroreUpload, setErroreUpload] = useState('')

    // ── Stato ricerca unificato (pattern Ricerche.jsx) ────────
    const [cerca, setCerca] = useState('')
    const [cercaApplicata, setCercaApplicata] = useState('')
    const [risultatiTrad, setRisultatiTrad] = useState(null)
    const [risultatiLex, setRisultatiLex] = useState(null)
    const [paroleChiave, setParoleChiave] = useState([])
    const [ragionamentoLex, setRagionamentoLex] = useState('')
    const [cercando, setCercando] = useState(false)
    const [cercandoLex, setCercandoLex] = useState(false)
    const [erroreLex, setErroreLex] = useState('')

    const [filtroCliente, setFiltroCliente] = useState('')
    const [filtroPratica, setFiltroPratica] = useState('')
    const [filtroEtichetta, setFiltroEtichetta] = useState('')
    const [filtroStato, setFiltroStato] = useState('')
    const [filtroData, setFiltroData] = useState('tutti') // tutti | 7gg | 30gg | range
    const [filtroDataDa, setFiltroDataDa] = useState('')
    const [filtroDataA, setFiltroDataA] = useState('')

    // Modello cartelle
    const [vistaArchivio, setVistaArchivio] = useState('catalogo') // catalogo | cartella
    const [categoriaCorrente, setCategoriaCorrente] = useState(null)
    const [sottocatCollassate, setSottocatCollassate] = useState(new Set())

    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const clienteId = params.get('cliente_id')
        if (clienteId) setFiltroCliente(clienteId)
        const praticaId = params.get('pratica_id')
        if (praticaId) setFiltroPratica(praticaId)
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

            await ricaricaDati(tId, user.id)
            setLoading(false)
        }
        carica()
    }, [])

    async function ricaricaDati(tId, uId) {
        const tIdF = tId ?? titolareId
        const uIdF = uId ?? meId
        if (!tIdF || !uIdF) return

        const [
            { data: docs },
            { data: cl },
            { data: pr },
            { data: tagList },
            { data: tagAssign },
            { data: cats },
            { data: sentenzeProprie },
        ] = await Promise.all([
            supabase
                .from('archivio_documenti')
                .select('*')
                .or(`titolare_id.eq.${tIdF},autore_id.eq.${uIdF}`)
                .order('created_at', { ascending: false }),
            supabase
                .from('profiles')
                .select('id, nome, cognome')
                .eq('role', 'cliente')
                .eq('avvocato_id', tIdF),
            supabase
                .from('pratiche')
                .select('id, titolo, cliente_id')
                .eq('avvocato_id', uIdF)
                .eq('stato', 'aperta')
                .order('created_at', { ascending: false }),
            supabase
                .from('etichette')
                .select('id, nome, colore')
                .eq('user_id', uIdF)
                .order('nome'),
            supabase
                .from('elementi_etichette')
                .select('elemento_id, etichetta_id')
                .eq('tipo', 'archivio_documento')
                .eq('user_id', uIdF),
            supabase
                .from('categorie_archivio')
                .select('id, nome, colore')
                .eq('titolare_id', tIdF)
                .order('nome'),
            supabase
                .from('sentenze')
                .select('id, organo, sezione, numero, anno, oggetto, principio_diritto, tipo_provvedimento, data_pubblicazione, data_deposito, parole_chiave, pdf_storage_path, pdf_size_bytes, categoria_id, sottocategoria_id, created_at, stato')
                .eq('autore_id', uIdF)
                .order('created_at', { ascending: false }),
        ])

        // Sottocategorie: query separata su FK
        let subs = []
        if ((cats ?? []).length > 0) {
            const { data: subsData } = await supabase
                .from('sottocategorie_archivio')
                .select('id, categoria_id, nome, ordine')
                .in('categoria_id', cats.map(c => c.id))
                .order('ordine')
                .order('nome')
            subs = subsData ?? []
        }

        // Merge documenti + sentenze proprie normalizzate
        const sentenzeNormalizzate = (sentenzeProprie ?? []).map(normalizzaSentenza)
        const tutti = [...(docs ?? []), ...sentenzeNormalizzate]
        tutti.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

        setDocumenti(tutti)
        setClienti(cl ?? [])
        setPratiche(pr ?? [])
        setEtichetteUtente(tagList ?? [])
        setCategorie(cats ?? [])
        setSottocategorie(subs)

        const map = {}
        for (const a of tagAssign ?? []) {
            if (!map[a.elemento_id]) map[a.elemento_id] = []
            map[a.elemento_id].push(a.etichetta_id)
        }
        setTagsByDoc(map)

        // Quota storage (include sia documenti che sentenze)
        const { data: quotaData } = await supabase.rpc('quota_studio', { p_proprietario_id: tIdF })
        const q = Array.isArray(quotaData) ? quotaData[0] : quotaData

        const { data: tuttiDocStudio } = await supabase
            .from('archivio_documenti')
            .select('dimensione')
            .eq('titolare_id', tIdF)

        const occupatoBytes = (tuttiDocStudio ?? []).reduce((s, d) => s + (d.dimensione ?? 0), 0)
            + (sentenzeProprie ?? []).reduce((s, sn) => s + (sn.pdf_size_bytes ?? 0), 0)

        setQuota({
            gb_piano: q?.gb_piano ?? 0,
            gb_topup: q?.gb_topup ?? 0,
            gb_totali: q?.gb_totali ?? 0,
            piano_attivo: q?.piano_attivo ?? false,
            occupato_gb: bytesToGB(occupatoBytes),
        })
    }

    // Polling stato OCR + auto-cleanup barra progresso
    useEffect(() => {
        const inElaborazione = documenti.some(d => d._kind !== 'sentenza' && ['pending', 'processing'].includes(d.ocr_status))
        const codaAttiva = codaUpload.some(i => ['pending', 'processing'].includes(i.status))
        if (!inElaborazione && !codaAttiva) return

        const interval = setInterval(async () => {
            const idsDocs = documenti
                .filter(d => d._kind !== 'sentenza' && ['pending', 'processing'].includes(d.ocr_status))
                .map(d => d.id)
            const idsCoda = codaUpload.filter(i => i.documento_id).map(i => i.documento_id)
            const idsTutti = [...new Set([...idsDocs, ...idsCoda])]

            if (idsTutti.length === 0) {
                clearInterval(interval)
                return
            }

            const { data } = await supabase
                .from('archivio_documenti')
                .select('id, ocr_status, metadati, testo_estratto, verificato, titolo, categoria, tags, dimensione')
                .in('id', idsTutti)

            if (!data) return

            setDocumenti(prev => prev.map(d => {
                if (d._kind === 'sentenza') return d
                const aggiornato = data.find(a => a.id === d.id)
                return aggiornato ? { ...d, ...aggiornato } : d
            }))

            setCodaUpload(prev => prev.map(item => {
                const aggiornato = data.find(a => a.id === item.documento_id)
                return aggiornato ? { ...item, status: aggiornato.ocr_status } : item
            }))
        }, 3000)

        return () => clearInterval(interval)
    }, [documenti, codaUpload])

    // Auto-nasconde barra progresso 2s dopo che tutto è completato
    useEffect(() => {
        if (codaUpload.length === 0) return
        const tuttoFinito = codaUpload.every(i =>
            ['completed', 'failed', 'skipped'].includes(i.status)
        )
        if (!tuttoFinito) return

        const timeout = setTimeout(() => setCodaUpload([]), 2000)
        return () => clearTimeout(timeout)
    }, [codaUpload])

    // Polling metadati Haiku per i doc completed senza suggeriti
    useEffect(() => {
        const senzaMetadati = documenti.filter(d =>
            d._kind !== 'sentenza' && d.ocr_status === 'completed' && !d.metadati?.suggeriti
        )
        if (senzaMetadati.length === 0) return

        const ids = senzaMetadati.map(d => d.id)
        const interval = setInterval(async () => {
            const { data } = await supabase
                .from('archivio_documenti')
                .select('id, metadati')
                .in('id', ids)
                .not('metadati->suggeriti', 'is', null)

            if (data && data.length > 0) {
                setDocumenti(prev => prev.map(d => {
                    if (d._kind === 'sentenza') return d
                    const trovato = data.find(a => a.id === d.id)
                    return trovato ? { ...d, metadati: trovato.metadati } : d
                }))
            }
        }, 4000)

        // Stop dopo 60 secondi (Haiku impiega max 10-15s, oltre è fallito)
        const timeout = setTimeout(() => clearInterval(interval), 60000)

        return () => {
            clearInterval(interval)
            clearTimeout(timeout)
        }
    }, [documenti.map(d => `${d.id}:${d.ocr_status}:${d.metadati?.suggeriti ? 1 : 0}`).join('|')])

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
        if (uploadDisabilitato) {
            setErroreUpload(motivoBlocco)
            e.target.value = ''
            return
        }

        const nuovi = Array.from(e.target.files ?? [])
        if (nuovi.length === 0) return

        // Accumula con quelli già selezionati, evitando duplicati per nome+size
        const tutti = [...filesSelezionati]
        for (const f of nuovi) {
            const giaPresente = tutti.some(x => x.name === f.name && x.size === f.size)
            if (!giaPresente) tutti.push(f)
        }

        if (tutti.length > MAX_FILES) {
            setErroreUpload(`Puoi caricare massimo ${MAX_FILES} documenti alla volta. Hai selezionato ${tutti.length}.`)
            e.target.value = ''
            return
        }

        const dimensioneTotaleBytes = tutti.reduce((sum, f) => sum + f.size, 0)
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
        setFilesSelezionati(tutti)
        setFileCorrente(tutti[0])

        // Reset input per permettere riselezione dello stesso file dopo
        e.target.value = ''
    }

    async function caricaDocumento(file, metadati) {
        const { data: { user } } = await supabase.auth.getUser()
        const ext = file.name.split('.').pop()
        const path = `${titolareId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const lower = file.name.toLowerCase()
        const isTxt = lower.endsWith('.txt')
        const tipo = isPdf(file) ? 'pdf' : (isTxt ? 'txt' : 'file')

        const { error: upErr } = await supabase.storage.from('archivio').upload(path, file)
        if (upErr) throw new Error(upErr.message)

        const { data: doc, error: dbErr } = await supabase
            .from('archivio_documenti')
            .insert({
                autore_id: user.id,
                titolare_id: titolareId,
                cliente_id: metadati.cliente_id || null,
                pratica_id: metadati.pratica_id || null,
                categoria_id: metadati.categoria_id || null,
                sottocategoria_id: metadati.sottocategoria_id || null,
                tipo,
                titolo: metadati.titolo || file.name,
                storage_path: path,
                tipo_file: file.type,
                dimensione: file.size,
                tags: metadati.tags ? metadati.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                ocr_status: (tipo === 'pdf' || tipo === 'txt') ? 'pending' : 'skipped',
            })
            .select()
            .single()

        if (dbErr) throw new Error(dbErr.message)
        return doc
    }

    async function avviaUpload(titoli, categoriaBatch, sottocatBatch) {
        if (uploadDisabilitato) {
            setErroreUpload(motivoBlocco)
            setFilesSelezionati([])
            setFileCorrente(null)
            return
        }

        const params = new URLSearchParams(location.search)
        const praticaId = params.get('pratica_id')
        const clienteId = params.get('cliente_id')

        setUploadInCorso(true)
        setFileCorrente(null)

        const filesDaCaricare = filesSelezionati
        const nuovaCoda = filesDaCaricare.map(f => ({
            nome: f.name, status: 'pending', documento_id: null,
        }))
        setCodaUpload(nuovaCoda)

        const nuoviDocs = []

        for (let i = 0; i < filesDaCaricare.length; i += PARALLEL) {
            const batch = filesDaCaricare.slice(i, i + PARALLEL)
            await Promise.all(batch.map(async (file, j) => {
                const idx = i + j
                try {
                    setCodaUpload(prev => prev.map((item, k) => k === idx ? { ...item, status: 'processing' } : item))
                    const metadatiPerFile = {
                        titolo: (titoli[idx] ?? '').trim() || file.name,
                        pratica_id: praticaId || '',
                        cliente_id: clienteId || '',
                        categoria_id: categoriaBatch || '',
                        sottocategoria_id: sottocatBatch || '',
                    }
                    const doc = await caricaDocumento(file, metadatiPerFile)
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

        const aggiunta = nuoviDocs.reduce((s, d) => s + (d.dimensione ?? 0), 0)
        setQuota(prev => ({ ...prev, occupato_gb: prev.occupato_gb + bytesToGB(aggiunta) }))

        // Trigger process-archivio per i PDF e TXT
        const docsDaProcessare = nuoviDocs.filter(d => d.tipo === 'pdf' || d.tipo === 'txt')
        for (let i = 0; i < docsDaProcessare.length; i += PARALLEL) {
            const batch = docsDaProcessare.slice(i, i + PARALLEL)
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
            if (i + PARALLEL < docsDaProcessare.length) {
                await new Promise(r => setTimeout(r, 1000))
            }
        }
    }

    // ─── RICERCA ────────────────────────────────────────────

    function azzeraRicerca() {
        setRisultatiTrad(null)
        setRisultatiLex(null)
        setParoleChiave([])
        setRagionamentoLex('')
        setErroreLex('')
        setCercaApplicata('')
    }

    async function cercaTradizionale() {
        if (!cerca.trim()) return
        setCercando(true)
        setRisultatiLex(null)
        setRagionamentoLex('')
        setErroreLex('')
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-archivio`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ domanda: cerca.trim(), modalita: 'tradizionale' }),
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)
            setRisultatiTrad(json.risultati ?? [])
            setParoleChiave(json.parole_chiave ?? [])
            setCercaApplicata(cerca)
        } catch (err) {
            setErroreLex(err.message)
        } finally {
            setCercando(false)
        }
    }

    async function cercaConLex() {
        if (!cerca.trim()) return
        setCercandoLex(true)
        setRisultatiTrad(null)
        setErroreLex('')
        setRagionamentoLex('')
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-archivio`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ domanda: cerca.trim(), modalita: 'lex' }),
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)
            setRisultatiLex(json.risultati ?? [])
            setParoleChiave(json.parole_chiave ?? [])
            setRagionamentoLex(json.ragionamento ?? '')
            setCercaApplicata(cerca)
        } catch (err) {
            setErroreLex(err.message)
        } finally {
            setCercandoLex(false)
        }
    }

    async function eliminaDocumento(doc) {
        if (!confirm(`Eliminare "${doc.titolo}"?`)) return
        if (doc.storage_path) {
            await supabase.storage.from('archivio').remove([doc.storage_path])
        }
        await supabase.from('archivio_documenti').delete().eq('id', doc.id)
        setDocumenti(prev => prev.filter(d => d.id !== doc.id))

        if (doc.dimensione) {
            setQuota(prev => ({ ...prev, occupato_gb: Math.max(0, prev.occupato_gb - bytesToGB(doc.dimensione)) }))
        }

        if (risultatiTrad) setRisultatiTrad(prev => prev.filter(d => d.id !== doc.id))
        if (risultatiLex) setRisultatiLex(prev => prev.filter(d => d.id !== doc.id))
    }
    async function ricaricaDocumenti() {
        await ricaricaDati(titolareId, meId)
    }

    // ─── DERIVAZIONI ────────────────────────────────────────

    function passaFiltriBase(d) {
        if (filtroCliente && d.cliente_id !== filtroCliente) return false
        if (filtroPratica && d.pratica_id !== filtroPratica) return false
        if (filtroEtichetta) {
            const etDoc = tagsByDoc[d.id] ?? []
            if (!etDoc.includes(filtroEtichetta)) return false
        }
        if (filtroStato && d.ocr_status !== filtroStato) return false
        if (!passaFiltroData(d, filtroData, filtroDataDa, filtroDataA)) return false
        return true
    }

    const docsFiltrati = useMemo(
        () => documenti.filter(passaFiltriBase),
        [documenti, filtroCliente, filtroPratica, filtroEtichetta, filtroStato, filtroData, filtroDataDa, filtroDataA, tagsByDoc]
    )

    const docsInElaborazione = codaUpload.filter(i => ['pending', 'processing'].includes(i.status)).length

    const inRicerca = risultatiTrad !== null || risultatiLex !== null
    const risultatiAttivi = risultatiLex ?? risultatiTrad ?? []

    const filtriAttivi = filtroCliente || filtroPratica || filtroEtichetta || filtroStato || filtroData !== 'tutti'

    function entraInCartella(cat) {
        setCategoriaCorrente(cat)
        setVistaArchivio('cartella')
        setSottocatCollassate(new Set())
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    function tornaCatalogo() {
        setVistaArchivio('catalogo')
        setCategoriaCorrente(null)
    }

    function toggleSottocat(subId) {
        setSottocatCollassate(prev => {
            const nuovo = new Set(prev)
            if (nuovo.has(subId)) nuovo.delete(subId)
            else nuovo.add(subId)
            return nuovo
        })
    }

    function resetFiltri() {
        setFiltroCliente('')
        setFiltroPratica('')
        setFiltroEtichetta('')
        setFiltroStato('')
        setFiltroData('tutti')
        setFiltroDataDa('')
        setFiltroDataA('')
    }

    useEffect(() => {
        if (vistaArchivio !== 'cartella' || !categoriaCorrente) return
        const restano = docsFiltrati.filter(d => d.categoria_id === categoriaCorrente.id).length
        if (restano === 0) {
            setVistaArchivio('catalogo')
            setCategoriaCorrente(null)
        }
    }, [docsFiltrati, vistaArchivio, categoriaCorrente])

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <Loader2 size={24} className="animate-spin text-oro" />
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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMostraModalCategorie(true)}
                            className="flex items-center gap-1.5 text-sm border border-white/10 text-nebbia/60 hover:border-oro/30 hover:text-oro font-body px-3 py-2 transition-colors"
                            title="Gestisci categorie e sottocategorie"
                        >
                            <Tags size={13} /> Categorie
                        </button>
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
                                    ? <><Loader2 size={14} className="animate-spin" /> Caricamento...</>
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
                    </div>
                ) : (
                    <Link to="/banca-dati" className="btn-secondary text-sm flex items-center gap-2">
                        <Search size={13} /> Esplora banca dati
                    </Link>
                )}
            />

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

                    {codaUpload.length > 0 && <BarraProgresso items={codaUpload} />}

                    {filesSelezionati.length > 0 && (
                        <FormMetadatiMulti
                            files={filesSelezionati}
                            onSalva={(titoli, catBatch, subBatch) => avviaUpload(titoli, catBatch, subBatch)}
                            onAnnulla={() => { setFilesSelezionati([]); setFileCorrente(null) }}
                            onRimuoviFile={(idx) => {
                                setFilesSelezionati(prev => {
                                    const nuovi = prev.filter((_, i) => i !== idx)
                                    if (nuovi.length === 0) setFileCorrente(null)
                                    else if (idx === 0) setFileCorrente(nuovi[0])
                                    return nuovi
                                })
                            }}
                            onAggiungiAltri={handleFilesChange}
                            categorie={categorie}
                            sottocategorie={sottocategorie}
                        />
                    )}
                    {mostraModalCategorie && (
                        <ModalGestioneCategorie
                            titolareId={titolareId}
                            categorie={categorie}
                            sottocategorie={sottocategorie}
                            documenti={documenti}
                            onAggiornata={ricaricaDocumenti}
                            onClose={() => setMostraModalCategorie(false)}
                        />
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

                    {/* ═══ BOX RICERCA UNIFICATO (pattern Ricerche.jsx) ═══ */}
                    <div className="bg-slate border border-white/5 p-4 space-y-3">
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            Cerca tra i documenti del tuo archivio. Usa la ricerca tradizionale per parole chiave letterali, o Lex per query in linguaggio naturale che cercano semanticamente nel contenuto e nei metadati.
                        </p>

                        <div className="flex items-stretch gap-2">
                            <div className="relative flex-1">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Cerca tra i tuoi documenti..."
                                    value={cerca}
                                    onChange={e => {
                                        setCerca(e.target.value)
                                        if (e.target.value.trim() === '' && inRicerca) azzeraRicerca()
                                    }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                            cercaConLex()
                                        } else if (e.key === 'Enter') {
                                            e.preventDefault()
                                            if (cerca.trim()) cercaTradizionale()
                                        }
                                    }}
                                    className="w-full h-[38px] bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-9 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                />
                                {cerca && (
                                    <button
                                        onClick={() => { setCerca(''); azzeraRicerca() }}
                                        className="absolute top-1/2 -translate-y-1/2 right-2 text-nebbia/30 hover:text-nebbia p-1"
                                        title="Svuota"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={cercaTradizionale}
                                disabled={cercando || cercandoLex || !cerca.trim()}
                                className="flex items-center justify-center gap-2 px-4 h-[38px] bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                title="Cerca per parole chiave letterali (Invio)"
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
                                title="Ricerca semantica (Cmd/Ctrl+Invio)"
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
                                    <strong>{risultatiAttivi.length}</strong> {risultatiAttivi.length === 1 ? 'risultato' : 'risultati'} per "{cercaApplicata}"
                                </p>
                                <button
                                    onClick={azzeraRicerca}
                                    className="flex items-center gap-1 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors shrink-0"
                                >
                                    <X size={11} /> Azzera
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Filtri (sempre attivi) */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-1.5 text-nebbia/30">
                            <Filter size={12} />
                            <span className="font-body text-xs uppercase tracking-widest">Filtri</span>
                        </div>

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

                        {pratiche.length > 0 && (
                            <select
                                value={filtroPratica}
                                onChange={e => setFiltroPratica(e.target.value)}
                                className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40"
                            >
                                <option value="">Tutte le pratiche</option>
                                {pratiche.map(p => <option key={p.id} value={p.id}>{p.titolo}</option>)}
                            </select>
                        )}

                        {etichetteUtente.length > 0 && (
                            <select
                                value={filtroEtichetta}
                                onChange={e => setFiltroEtichetta(e.target.value)}
                                className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40"
                            >
                                <option value="">Tutte le etichette</option>
                                {etichetteUtente.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                            </select>
                        )}

                        <select
                            value={filtroStato}
                            onChange={e => setFiltroStato(e.target.value)}
                            className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40"
                        >
                            <option value="">Tutti gli stati</option>
                            <option value="completed">Indicizzati</option>
                            <option value="pending">In coda</option>
                            <option value="processing">In elaborazione</option>
                            <option value="failed">Errore</option>
                            <option value="skipped">Manuale</option>
                        </select>

                        <select
                            value={filtroData}
                            onChange={e => setFiltroData(e.target.value)}
                            className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40"
                        >
                            <option value="tutti">Qualsiasi data</option>
                            <option value="7gg">Ultimi 7 giorni</option>
                            <option value="30gg">Ultimi 30 giorni</option>
                            <option value="range">Periodo personalizzato</option>
                        </select>

                        {filtroData === 'range' && (
                            <>
                                <input
                                    type="date"
                                    value={filtroDataDa}
                                    onChange={e => setFiltroDataDa(e.target.value)}
                                    className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-2 py-1.5 outline-none focus:border-oro/40"
                                    title="Da"
                                />
                                <span className="font-body text-xs text-nebbia/30">→</span>
                                <input
                                    type="date"
                                    value={filtroDataA}
                                    onChange={e => setFiltroDataA(e.target.value)}
                                    className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-2 py-1.5 outline-none focus:border-oro/40"
                                    title="A"
                                />
                            </>
                        )}

                        {filtriAttivi && (
                            <button
                                onClick={resetFiltri}
                                className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors flex items-center gap-1"
                            >
                                <X size={11} /> Reset filtri
                            </button>
                        )}
                    </div>

                    {/* RISULTATI */}
                    {inRicerca ? (
                        // VISTA LISTA FLAT (durante ricerca)
                        <div className="space-y-3">
                            {risultatiAttivi.length === 0 ? (
                                <div className="py-10 text-center">
                                    <p className="font-body text-sm text-nebbia/30">Nessun documento trovato</p>
                                    <p className="font-body text-xs text-nebbia/20 mt-2">
                                        {risultatiLex !== null
                                            ? 'Prova a riformulare con termini diversi.'
                                            : 'Prova con la ricerca semantica di Lex per trovare documenti correlati.'}
                                    </p>
                                </div>
                            ) : risultatiAttivi.map(doc => (
                                <CardDocumento
                                    key={doc.id}
                                    doc={doc}
                                    onElimina={eliminaDocumento}
                                    onAggiornata={ricaricaDocumenti}
                                    clienti={clienti}
                                    pratiche={pratiche}
                                    categorie={categorie}
                                    sottocategorie={sottocategorie}
                                    etichetteUtente={etichetteUtente}
                                    tagsByDoc={tagsByDoc}
                                    paroleChiave={paroleChiave}
                                    chunkRilevante={doc.chunk_rilevante}
                                    mostraPath
                                />
                            ))}
                        </div>
                    ) : vistaArchivio === 'catalogo' ? (
                        // VISTA CATALOGO CARTELLE
                        <div className="space-y-4">
                            <p className="font-body text-xs text-nebbia/30">
                                {docsFiltrati.length} {docsFiltrati.length === 1 ? 'elemento' : 'elementi'}
                                {docsInElaborazione > 0 && (
                                    <span className="ml-2 text-oro/60">· {docsInElaborazione} in elaborazione</span>
                                )}
                            </p>

                            {docsFiltrati.length === 0 ? (
                                <EmptyState
                                    icon={FileText}
                                    title="Nessun documento"
                                    desc={filtriAttivi
                                        ? "Nessun risultato con questi filtri"
                                        : "Carica i documenti del tuo archivio per indicizzarli e renderli cercabili"
                                    }
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {categorie.map(cat => {
                                        const count = docsFiltrati.filter(d => d.categoria_id === cat.id).length
                                        // Se ci sono filtri attivi e la cartella si svuota, nascondila
                                        // (così i filtri restano utili). Se invece non ci sono filtri,
                                        // mostriamo la cartella anche se vuota, in stile spento.
                                        if (count === 0 && filtriAttivi) return null
                                        return (
                                            <CardCartella
                                                key={cat.id}
                                                categoria={cat}
                                                count={count}
                                                vuota={count === 0}
                                                onClick={() => entraInCartella(cat)}
                                            />
                                        )
                                    })}
                                    {(() => {
                                        const senzaCount = docsFiltrati.filter(d => !d.categoria_id).length
                                        if (senzaCount === 0) return null
                                        return (
                                            <CardCartella
                                                categoria={null}
                                                count={senzaCount}
                                                onClick={() => entraInCartella(null)}
                                            />
                                        )
                                    })()}
                                </div>
                            )}
                        </div>
                    ) : (
                        // VISTA DENTRO CARTELLA (raggruppato per sottocategoria)
                        (() => {
                            const docsCartella = docsFiltrati.filter(d =>
                                categoriaCorrente
                                    ? d.categoria_id === categoriaCorrente.id
                                    : !d.categoria_id
                            )
                            const subsCat = categoriaCorrente
                                ? sottocategorie.filter(s => s.categoria_id === categoriaCorrente.id)
                                : []
                            const docsPerSub = (subId) =>
                                docsCartella.filter(d => d.sottocategoria_id === subId)
                            const docsSenzaSub = docsCartella.filter(d => !d.sottocategoria_id)

                            return (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/5">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={tornaCatalogo}
                                                className="flex items-center gap-1.5 text-nebbia/40 hover:text-oro transition-colors font-body text-xs"
                                            >
                                                <ArrowLeft size={13} /> Tutte le categorie
                                            </button>
                                            <span className="text-nebbia/20">·</span>
                                            <p className="font-display text-lg text-nebbia flex items-center gap-2">
                                                <Folder size={14} className={categoriaCorrente ? 'text-oro' : 'text-nebbia/30'} />
                                                {categoriaCorrente?.nome ?? 'Senza categoria'}
                                            </p>
                                            <span className="font-body text-xs text-nebbia/30">
                                                {docsCartella.length} {docsCartella.length === 1 ? 'elemento' : 'elementi'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Sezioni per sottocategoria */}
                                    {subsCat.map(sub => {
                                        const ds = docsPerSub(sub.id)
                                        if (ds.length === 0) return null
                                        const collassata = sottocatCollassate.has(sub.id)
                                        return (
                                            <div key={sub.id} className="space-y-2">
                                                <button
                                                    onClick={() => toggleSottocat(sub.id)}
                                                    className="flex items-center gap-2 w-full text-left py-1 group"
                                                >
                                                    {collassata
                                                        ? <ChevronRight size={14} className="text-nebbia/40 group-hover:text-oro transition-colors" />
                                                        : <ChevronDown size={14} className="text-oro" />
                                                    }
                                                    <p className="font-body text-sm font-medium text-nebbia">{sub.nome}</p>
                                                    <span className="font-body text-xs text-nebbia/30">
                                                        ({ds.length})
                                                    </span>
                                                </button>
                                                {!collassata && (
                                                    <div className="space-y-2 pl-6">
                                                        {ds.map(doc => (
                                                            <CardDocumento
                                                                key={doc.id}
                                                                doc={doc}
                                                                onElimina={eliminaDocumento}
                                                                onAggiornata={ricaricaDocumenti}
                                                                clienti={clienti}
                                                                pratiche={pratiche}
                                                                categorie={categorie}
                                                                sottocategorie={sottocategorie}
                                                                etichetteUtente={etichetteUtente}
                                                                tagsByDoc={tagsByDoc}
                                                                paroleChiave={paroleChiave}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}

                                    {/* Senza sottocategoria (sempre ultima sezione se presente) */}
                                    {docsSenzaSub.length > 0 && (
                                        <div className="space-y-2">
                                            {subsCat.length > 0 && (
                                                <p className="font-body text-sm font-medium text-nebbia/50 italic py-1 flex items-center gap-2">
                                                    <ChevronDown size={14} className="text-nebbia/30" />
                                                    Senza sottocategoria
                                                    <span className="font-body text-xs text-nebbia/30 not-italic">
                                                        ({docsSenzaSub.length})
                                                    </span>
                                                </p>
                                            )}
                                            <div className={subsCat.length > 0 ? "space-y-2 pl-6" : "space-y-2"}>
                                                {docsSenzaSub.map(doc => (
                                                    <CardDocumento
                                                        key={doc.id}
                                                        doc={doc}
                                                        onElimina={eliminaDocumento}
                                                        onAggiornata={ricaricaDocumenti}
                                                        clienti={clienti}
                                                        pratiche={pratiche}
                                                        categorie={categorie}
                                                        sottocategorie={sottocategorie}
                                                        etichetteUtente={etichetteUtente}
                                                        tagsByDoc={tagsByDoc}
                                                        paroleChiave={paroleChiave}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })()
                    )}
                </>
            )}

            {tabPrincipale === 'sentenze' && (
                <TabSentenzeAcquistate meId={meId} />
            )}
        </div>
    )
}