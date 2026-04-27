// src/components/GeneraDocumentoWizard.jsx
//
// Wizard modale per generare un documento legale.
// 4 step: prerequisiti -> controparti -> campi input -> generazione/anteprima
//
// Chiamata streaming a /functions/v1/genera-documento
// Esporta in Markdown e HTML stampabile
// Salva nella pratica come documento

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import {
    X, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Loader2,
    User, Building2, Wand2, Download, Save, FileText, Edit2, Eye,
    Info, Scale
} from 'lucide-react'

const ENDPOINT = '/functions/v1/genera-documento'

// ─────────────────────────────────────────────────────────────
// HELPER: nome completo soggetto (cliente o controparte)
// ─────────────────────────────────────────────────────────────
function nomeSoggetto(s) {
    if (!s) return '—'
    if (s.tipo_soggetto === 'persona_giuridica') return s.ragione_sociale ?? '—'
    return `${s.nome ?? ''} ${s.cognome ?? ''}`.trim() || '—'
}

// ─────────────────────────────────────────────────────────────
// HELPER: parser SSE (uguale a ChatPratica)
// ─────────────────────────────────────────────────────────────
async function leggiStreamSSE(response, onEvent) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
            const linea = part.trim()
            if (!linea.startsWith('data:')) continue
            const payload = linea.slice(5).trim()
            if (!payload) continue
            try {
                const parsed = JSON.parse(payload)
                onEvent(parsed)
            } catch { /* ignora */ }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// HELPER: download blob come file
// ─────────────────────────────────────────────────────────────
function scaricaFile(contenuto, nomeFile, mimeType) {
    const blob = new Blob([contenuto], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nomeFile
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────
// HELPER: Markdown -> HTML stampabile
// ─────────────────────────────────────────────────────────────
function markdownToHtmlStampabile(markdown, titoloDoc) {
    // Conversione minimale Markdown -> HTML (per i casi più comuni)
    // Per casi complessi l'avvocato apre il .md in editor dedicato
    let html = markdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^---$/gm, '<hr/>')
        .replace(/\n\n/g, '</p><p>')
    html = `<p>${html}</p>`

    return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>${titoloDoc}</title>
<style>
  @page { size: A4; margin: 2.5cm 2cm; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #000; }
  h1 { font-size: 16pt; margin: 1.5em 0 0.8em; }
  h2 { font-size: 14pt; margin: 1.2em 0 0.6em; text-transform: uppercase; }
  h3 { font-size: 12pt; margin: 1em 0 0.4em; font-weight: bold; }
  p { margin: 0.6em 0; text-align: justify; }
  strong { font-weight: bold; }
  em { font-style: italic; }
  hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
  @media print { body { font-size: 11pt; } }
</style>
</head>
<body>
${html}
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE CAMPO INPUT DINAMICO
// Renderizza un singolo campo da campi_input del template
// ─────────────────────────────────────────────────────────────
function CampoInput({ campo, value, onChange, errore }) {
    const baseClasses = "w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"

    return (
        <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                {campo.label}
                {campo.obbligatorio && <span className="text-oro ml-1">*</span>}
                {campo.unita && <span className="text-nebbia/30 normal-case tracking-normal ml-2">({campo.unita})</span>}
            </label>

            {campo.tipo === 'textarea' ? (
                <textarea
                    rows={4}
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder={campo.placeholder ?? ''}
                    className={`${baseClasses} resize-none`}
                />
            ) : campo.tipo === 'select' ? (
                <select value={value ?? ''} onChange={e => onChange(e.target.value)} className={baseClasses}>
                    <option value="">— Seleziona —</option>
                    {(campo.opzioni ?? []).map(o => (
                        <option key={o.v} value={o.v}>{o.l}</option>
                    ))}
                </select>
            ) : campo.tipo === 'date' ? (
                <input
                    type="date"
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value)}
                    className={baseClasses}
                />
            ) : campo.tipo === 'number' ? (
                <input
                    type="number"
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder={campo.placeholder ?? campo.default?.toString() ?? ''}
                    min={campo.min}
                    max={campo.max}
                    step={campo.step ?? 1}
                    className={baseClasses}
                />
            ) : campo.tipo === 'currency' ? (
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/40 font-body text-sm">EUR</span>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={value ?? ''}
                        onChange={e => onChange(e.target.value)}
                        placeholder={campo.placeholder ?? '0.00'}
                        className={`${baseClasses} pl-12`}
                    />
                </div>
            ) : (
                <input
                    type="text"
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder={campo.placeholder ?? ''}
                    className={baseClasses}
                />
            )}

            {campo.help && (
                <p className="font-body text-xs text-nebbia/35 mt-1.5 flex items-start gap-1">
                    <Info size={10} className="shrink-0 mt-0.5" />
                    <span>{campo.help}</span>
                </p>
            )}
            {errore && (
                <p className="font-body text-xs text-red-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle size={11} /> {errore}
                </p>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE — WIZARD
// ─────────────────────────────────────────────────────────────
export default function GeneraDocumentoWizard({ template, praticaId, onClose }) {
    // Step corrente: 'prerequisiti' | 'controparti' | 'campi' | 'genera'
    const [step, setStep] = useState('prerequisiti')

    // Dati caricati al mount
    const [loadingDati, setLoadingDati] = useState(true)
    const [erroreDati, setErroreDati] = useState('')
    const [pratica, setPratica] = useState(null)
    const [cliente, setCliente] = useState(null)
    const [controparti, setControparti] = useState([])
    const [avvocato, setAvvocato] = useState(null)

    // Selezione controparti
    const [contropartiSelezionate, setContropartiSelezionate] = useState([])

    // Compilazione campi input
    const [campiValori, setCampiValori] = useState({})
    const [erroriCampi, setErroriCampi] = useState({})

    // Generazione
    const [generando, setGenerando] = useState(false)
    const [erroreGen, setErroreGen] = useState('')
    const [documentoMd, setDocumentoMd] = useState('')
    const [sezioniCompletate, setSezioniCompletate] = useState([])
    const [slotCorrente, setSlotCorrente] = useState(null)
    const [risultato, setRisultato] = useState(null)  // { documento_id, nome_file, ... }
    const [vistaAnteprima, setVistaAnteprima] = useState('preview')  // 'preview' | 'edit'
    const [docModificato, setDocModificato] = useState(false)

    // Controllo se il wizard è in stato che richiede conferma per chiudere
    const haGenerato = !!risultato || generando || documentoMd.length > 0

    // ─────────────────────────────────────────────────────────
    // CARICA dati al mount
    // ─────────────────────────────────────────────────────────
    useEffect(() => {
        async function caricaTutto() {
            setLoadingDati(true)
            setErroreDati('')
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) throw new Error('Utente non autenticato')

                // Pratica + cliente
                const { data: pr, error: prErr } = await supabase
                    .from('pratiche')
                    .select('id, titolo, tipo, avvocato_id, cliente:cliente_id(*)')
                    .eq('id', praticaId)
                    .single()
                if (prErr) throw new Error(prErr.message)
                setPratica(pr)
                setCliente(pr.cliente)

                // Controparti della pratica
                const { data: cp } = await supabase
                    .from('controparti')
                    .select('*')
                    .eq('pratica_id', praticaId)
                    .order('ordine', { ascending: true })
                setControparti(cp ?? [])

                // Profilo avvocato (titolare pratica)
                const { data: avv } = await supabase
                    .from('profiles')
                    .select('nome, cognome, foro, numero_albo, pec')
                    .eq('id', pr.avvocato_id)
                    .single()
                setAvvocato(avv)

                // Pre-selezione controparti per template selezione=tutte
                if (template.selezione_controparti === 'tutte') {
                    setContropartiSelezionate((cp ?? []).map(c => c.id))
                }

                // Pre-popola campi_input con i default
                const defaults = {}
                    ; (template.campi_input ?? []).forEach(c => {
                        if (c.default !== undefined) defaults[c.id] = c.default
                    })
                setCampiValori(defaults)

            } catch (err) {
                setErroreDati(err.message)
            } finally {
                setLoadingDati(false)
            }
        }
        caricaTutto()
    }, [praticaId, template.id])

    // ─────────────────────────────────────────────────────────
    // VERIFICA prerequisiti hard
    // ─────────────────────────────────────────────────────────
    function verificaPrerequisitiHard() {
        const problemi = []

        // Avvocato
        if (!avvocato?.foro) problemi.push({
            tipo: 'avvocato', label: 'Foro mancante nel profilo avvocato',
            azione: { label: 'Vai al profilo', to: '/profilo' }
        })
        if (!avvocato?.numero_albo) problemi.push({
            tipo: 'avvocato', label: 'Numero albo mancante nel profilo avvocato',
            azione: { label: 'Vai al profilo', to: '/profilo' }
        })
        if (!avvocato?.pec) problemi.push({
            tipo: 'avvocato', label: 'PEC mancante nel profilo avvocato',
            azione: { label: 'Vai al profilo', to: '/profilo' }
        })

        // Cliente
        if (!cliente) problemi.push({
            tipo: 'cliente', label: 'Cliente non associato alla pratica',
            azione: null
        })
        else {
            const isPF = cliente.tipo_soggetto !== 'persona_giuridica'
            if (isPF) {
                if (!cliente.nome || !cliente.cognome) problemi.push({
                    tipo: 'cliente', label: 'Nome o cognome cliente mancante',
                    azione: { label: 'Apri scheda cliente', to: `/clienti/${cliente.id}` }
                })
            } else {
                if (!cliente.ragione_sociale) problemi.push({
                    tipo: 'cliente', label: 'Ragione sociale cliente mancante',
                    azione: { label: 'Apri scheda cliente', to: `/clienti/${cliente.id}` }
                })
            }
        }

        // Controparti
        if (controparti.length === 0) problemi.push({
            tipo: 'controparti', label: 'Nessuna controparte aggiunta alla pratica',
            azione: null  // si aggiungono nella stessa pagina
        })

        return problemi
    }

    // ─────────────────────────────────────────────────────────
    // VERIFICA controparti selezionate (per step 2)
    // ─────────────────────────────────────────────────────────
    function verificaContropartiSelezione() {
        const sel = template.selezione_controparti ?? 'una'
        if (sel === 'tutte') return null  // sempre ok
        if (sel === 'una' && contropartiSelezionate.length !== 1) {
            return 'Seleziona esattamente 1 controparte'
        }
        if (sel === 'multipla' && contropartiSelezionate.length === 0) {
            return 'Seleziona almeno 1 controparte'
        }
        return null
    }

    // ─────────────────────────────────────────────────────────
    // VERIFICA campi input (per step 3)
    // ─────────────────────────────────────────────────────────
    function verificaCampi() {
        const errori = {}
            ; (template.campi_input ?? []).forEach(c => {
                if (c.obbligatorio) {
                    const v = campiValori[c.id]
                    if (v === undefined || v === null || v === '') {
                        errori[c.id] = 'Campo obbligatorio'
                    }
                }
                if (c.tipo === 'number' || c.tipo === 'currency') {
                    const v = campiValori[c.id]
                    if (v !== undefined && v !== '' && v !== null) {
                        const n = Number(v)
                        if (isNaN(n)) errori[c.id] = 'Inserisci un numero valido'
                        else if (c.min !== undefined && n < c.min) errori[c.id] = `Minimo: ${c.min}`
                        else if (c.max !== undefined && n > c.max) errori[c.id] = `Massimo: ${c.max}`
                    }
                }
            })
        setErroriCampi(errori)
        return Object.keys(errori).length === 0
    }

    // ─────────────────────────────────────────────────────────
    // NAVIGAZIONE STEP
    // ─────────────────────────────────────────────────────────
    const problemiPrereq = !loadingDati ? verificaPrerequisitiHard() : []
    const prereqOk = problemiPrereq.length === 0

    function avanti() {
        if (step === 'prerequisiti') {
            if (!prereqOk) return
            // Se template selezione=tutte, salta step controparti
            if (template.selezione_controparti === 'tutte') {
                if ((template.campi_input ?? []).length === 0) {
                    setStep('genera')
                } else {
                    setStep('campi')
                }
            } else {
                setStep('controparti')
            }
        } else if (step === 'controparti') {
            if (verificaContropartiSelezione()) return
            if ((template.campi_input ?? []).length === 0) {
                setStep('genera')
            } else {
                setStep('campi')
            }
        } else if (step === 'campi') {
            if (!verificaCampi()) return
            setStep('genera')
        }
    }

    function indietro() {
        if (step === 'controparti') setStep('prerequisiti')
        else if (step === 'campi') {
            setStep(template.selezione_controparti === 'tutte' ? 'prerequisiti' : 'controparti')
        } else if (step === 'genera') {
            if ((template.campi_input ?? []).length > 0) setStep('campi')
            else if (template.selezione_controparti !== 'tutte') setStep('controparti')
            else setStep('prerequisiti')
        }
    }

    // ─────────────────────────────────────────────────────────
    // GENERAZIONE — chiamata streaming SSE
    // ─────────────────────────────────────────────────────────
    async function generaDocumento() {
        setGenerando(true)
        setErroreGen('')
        setDocumentoMd('')
        setSezioniCompletate([])
        setSlotCorrente(null)
        setRisultato(null)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Sessione scaduta. Ricarica la pagina.')

            const url = `${import.meta.env.VITE_SUPABASE_URL}${ENDPOINT}`
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    template_codice: template.codice,
                    pratica_id: praticaId,
                    controparti_ids: contropartiSelezionate,
                    campi_input: campiValori,
                }),
            })

            if (!response.ok) {
                const t = await response.text()
                throw new Error(`HTTP ${response.status}: ${t.slice(0, 200)}`)
            }

            // Accumulatore per slot in corso (visualizzazione live "preview" dei chunk)
            const slotsTesto = {}

            await leggiStreamSSE(response, (event) => {
                if (event.error) {
                    setErroreGen(event.error)
                    return
                }
                if (event.chunk && event.slot_id) {
                    setSlotCorrente(event.slot_id)
                    slotsTesto[event.slot_id] = (slotsTesto[event.slot_id] ?? '') + event.chunk
                    // Mostra anteprima parziale: concatena tutti gli slot finora generati
                    const anteprimaParziale = Object.entries(slotsTesto)
                        .map(([id, txt]) => `### ${id}\n\n${txt}`)
                        .join('\n\n---\n\n')
                    setDocumentoMd(anteprimaParziale)
                }
                if (event.sezione_completata) {
                    setSezioniCompletate(prev => [...prev, event.sezione_completata])
                }
                if (event.done) {
                    setRisultato({
                        documento_id: event.documento_id,
                        documento_path: event.documento_path,
                        nome_file: event.nome_file,
                    })
                    if (event.documento_markdown) {
                        setDocumentoMd(event.documento_markdown)
                    }
                    setSlotCorrente(null)
                }
            })
        } catch (err) {
            setErroreGen(err.message)
        } finally {
            setGenerando(false)
        }
    }

    // ─────────────────────────────────────────────────────────
    // EXPORT
    // ─────────────────────────────────────────────────────────
    function esportaMarkdown() {
        const nome = risultato?.nome_file?.replace(/\.md$/, '') ?? `${template.codice}_${Date.now()}`
        scaricaFile(documentoMd, `${nome}.md`, 'text/markdown')
    }

    function esportaHtmlStampabile() {
        const nome = risultato?.nome_file?.replace(/\.md$/, '') ?? `${template.codice}_${Date.now()}`
        const html = markdownToHtmlStampabile(documentoMd, template.nome)
        scaricaFile(html, `${nome}.html`, 'text/html')
    }

    // ─────────────────────────────────────────────────────────
    // CHIUSURA con conferma se ci sono dati non salvati
    // ─────────────────────────────────────────────────────────
    function richiediChiusura() {
        if (haGenerato && !risultato) {
            if (!confirm('La generazione è in corso o non completata. Chiudere comunque?')) return
        } else if (docModificato) {
            if (!confirm('Hai modifiche non salvate al documento. Chiudere comunque?')) return
        }
        onClose()
    }

    // ─────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────
    if (loadingDati) {
        return (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                <div className="bg-slate border border-white/10 p-8 flex items-center gap-3">
                    <Loader2 size={20} className="animate-spin text-oro" />
                    <p className="font-body text-sm text-nebbia/60">Caricamento dati...</p>
                </div>
            </div>
        )
    }

    if (erroreDati) {
        return (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-slate border border-red-500/30 p-6 max-w-md" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle size={18} className="text-red-400" />
                        <p className="font-body text-base font-medium text-red-400">Errore</p>
                    </div>
                    <p className="font-body text-sm text-nebbia/70">{erroreDati}</p>
                    <button onClick={onClose} className="mt-4 px-4 py-2 border border-white/10 text-nebbia/60 hover:text-nebbia">
                        Chiudi
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate border border-oro/20 w-full max-w-4xl flex flex-col max-h-[90vh]">

                {/* HEADER WIZARD */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <Wand2 size={18} className="text-oro shrink-0" />
                        <div className="min-w-0">
                            <p className="font-body text-xs text-oro/70 uppercase tracking-widest">Genera documento</p>
                            <p className="font-body text-base font-medium text-nebbia truncate">{template.nome}</p>
                        </div>
                    </div>
                    <button onClick={richiediChiusura} className="text-nebbia/40 hover:text-nebbia transition-colors shrink-0 ml-3">
                        <X size={18} />
                    </button>
                </div>

                {/* STEP INDICATOR */}
                <div className="flex items-center justify-center gap-2 px-6 py-3 border-b border-white/5 bg-petrolio/30 shrink-0">
                    {[
                        { id: 'prerequisiti', label: 'Verifica' },
                        ...(template.selezione_controparti !== 'tutte' ? [{ id: 'controparti', label: 'Controparti' }] : []),
                        ...((template.campi_input ?? []).length > 0 ? [{ id: 'campi', label: 'Dati atto' }] : []),
                        { id: 'genera', label: 'Genera' },
                    ].map((s, i, arr) => {
                        const idx = arr.findIndex(x => x.id === s.id)
                        const idxAttuale = arr.findIndex(x => x.id === step)
                        const passato = idx < idxAttuale
                        const attuale = idx === idxAttuale
                        return (
                            <div key={s.id} className="flex items-center gap-2">
                                <div className={`flex items-center gap-1.5 px-3 py-1 ${attuale ? 'text-oro' : passato ? 'text-salvia' : 'text-nebbia/30'}`}>
                                    <div className={`w-5 h-5 flex items-center justify-center border ${attuale ? 'border-oro bg-oro/10' : passato ? 'border-salvia bg-salvia/10' : 'border-white/15'}`}>
                                        {passato ? <CheckCircle size={11} /> : <span className="font-body text-[10px]">{idx + 1}</span>}
                                    </div>
                                    <span className="font-body text-xs uppercase tracking-wider">{s.label}</span>
                                </div>
                                {i < arr.length - 1 && <ChevronRight size={11} className="text-nebbia/20" />}
                            </div>
                        )
                    })}
                </div>

                {/* CONTENUTO STEP */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* ───── STEP 1: PREREQUISITI ───── */}
                    {step === 'prerequisiti' && (
                        <div className="space-y-5">
                            <div>
                                <p className="font-body text-sm font-medium text-nebbia mb-1">Verifica prerequisiti</p>
                                <p className="font-body text-xs text-nebbia/50">
                                    Per generare il documento devono essere disponibili tutti i dati essenziali.
                                </p>
                            </div>

                            {/* Stato verifica hard */}
                            <div className={`p-4 border ${prereqOk ? 'bg-salvia/5 border-salvia/30' : 'bg-amber-500/5 border-amber-500/30'}`}>
                                {prereqOk ? (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle size={15} className="text-salvia" />
                                        <p className="font-body text-sm text-salvia font-medium">Tutti i dati essenziali sono presenti</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 mb-3">
                                            <AlertCircle size={15} className="text-amber-400" />
                                            <p className="font-body text-sm text-amber-400 font-medium">Mancano alcuni dati essenziali</p>
                                        </div>
                                        <ul className="space-y-2 ml-7">
                                            {problemiPrereq.map((p, i) => (
                                                <li key={i} className="flex items-center justify-between gap-3">
                                                    <span className="font-body text-sm text-nebbia/70">• {p.label}</span>
                                                    {p.azione && (
                                                        <Link to={p.azione.to} className="font-body text-xs text-oro hover:text-oro/70 whitespace-nowrap">
                                                            {p.azione.label} →
                                                        </Link>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>

                            {/* Checklist informativa: prerequisiti dichiarati nel template */}
                            {(template.prerequisiti ?? []).length > 0 && (
                                <div className="p-4 border border-white/8 bg-petrolio/30">
                                    <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-3">Checklist consigliata per questo atto</p>
                                    <ul className="space-y-1.5">
                                        {template.prerequisiti.map((req, i) => (
                                            <li key={i} className="font-body text-sm text-nebbia/60 flex items-start gap-2">
                                                <span className="text-nebbia/30 mt-0.5">▢</span>
                                                <span>{req}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="font-body text-xs text-nebbia/30 italic mt-3">
                                        Lex genererà comunque il documento; per i dati mancanti userà placeholder esplicito.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ───── STEP 2: CONTROPARTI ───── */}
                    {step === 'controparti' && (
                        <div className="space-y-5">
                            <div>
                                <p className="font-body text-sm font-medium text-nebbia mb-1">
                                    {template.selezione_controparti === 'una' ? 'Seleziona la controparte' : 'Seleziona le controparti'}
                                </p>
                                <p className="font-body text-xs text-nebbia/50">
                                    {template.selezione_controparti === 'una'
                                        ? 'Questo atto si dirige verso una sola controparte.'
                                        : 'Puoi selezionare una o più controparti.'}
                                </p>
                            </div>

                            {controparti.length === 0 ? (
                                <div className="p-4 border border-amber-500/30 bg-amber-500/5">
                                    <p className="font-body text-sm text-amber-400">
                                        Nessuna controparte presente. Aggiungile dalla pratica prima di procedere.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {controparti.map(c => {
                                        const isSel = contropartiSelezionate.includes(c.id)
                                        const isPF = c.tipo_soggetto !== 'persona_giuridica'
                                        return (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    if (template.selezione_controparti === 'una') {
                                                        setContropartiSelezionate([c.id])
                                                    } else {
                                                        setContropartiSelezionate(prev =>
                                                            isSel ? prev.filter(x => x !== c.id) : [...prev, c.id]
                                                        )
                                                    }
                                                }}
                                                className={`w-full text-left p-4 border transition-colors ${isSel
                                                    ? 'bg-oro/8 border-oro/40'
                                                    : 'bg-petrolio/30 border-white/8 hover:border-oro/20'}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-4 h-4 mt-0.5 shrink-0 border flex items-center justify-center ${template.selezione_controparti === 'una' ? 'rounded-full' : ''} ${isSel ? 'bg-oro border-oro' : 'border-white/20'}`}>
                                                        {isSel && <CheckCircle size={11} className="text-petrolio" />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {isPF
                                                                ? <User size={11} className="text-nebbia/40" />
                                                                : <Building2 size={11} className="text-nebbia/40" />
                                                            }
                                                            <p className="font-body text-sm font-medium text-nebbia">{nomeSoggetto(c)}</p>
                                                            {c.ruolo && (
                                                                <span className="font-body text-[10px] text-nebbia/50 border border-white/10 px-1.5 py-0.5 uppercase tracking-wider">
                                                                    {c.ruolo}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {(c.cf || c.partita_iva) && (
                                                            <p className="font-mono text-[11px] text-nebbia/40">
                                                                {c.partita_iva && <>P.IVA {c.partita_iva}</>}
                                                                {c.partita_iva && c.cf && ' · '}
                                                                {c.cf && <>CF {c.cf}</>}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {verificaContropartiSelezione() && (
                                <p className="font-body text-xs text-amber-400 flex items-center gap-1">
                                    <AlertCircle size={11} /> {verificaContropartiSelezione()}
                                </p>
                            )}
                        </div>
                    )}

                    {/* ───── STEP 3: CAMPI INPUT ───── */}
                    {step === 'campi' && (
                        <div className="space-y-5">
                            <div>
                                <p className="font-body text-sm font-medium text-nebbia mb-1">Dati specifici dell'atto</p>
                                <p className="font-body text-xs text-nebbia/50">
                                    Compila i campi richiesti dal template. I campi con * sono obbligatori.
                                </p>
                            </div>
                            <div className="space-y-4">
                                {(template.campi_input ?? []).map(campo => (
                                    <CampoInput
                                        key={campo.id}
                                        campo={campo}
                                        value={campiValori[campo.id]}
                                        onChange={v => {
                                            setCampiValori(prev => ({ ...prev, [campo.id]: v }))
                                            // Rimuovi errore quando si modifica
                                            if (erroriCampi[campo.id]) {
                                                setErroriCampi(prev => {
                                                    const copia = { ...prev }
                                                    delete copia[campo.id]
                                                    return copia
                                                })
                                            }
                                        }}
                                        errore={erroriCampi[campo.id]}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ───── STEP 4: GENERA / ANTEPRIMA ───── */}
                    {step === 'genera' && (
                        <div className="space-y-5">

                            {/* Stato iniziale: bottone genera */}
                            {!generando && !risultato && documentoMd === '' && !erroreGen && (
                                <div className="text-center py-8">
                                    <Wand2 size={32} className="text-oro/40 mx-auto mb-3" />
                                    <p className="font-body text-base font-medium text-nebbia mb-2">Pronto a generare</p>
                                    <p className="font-body text-xs text-nebbia/50 mb-6 max-w-md mx-auto">
                                        Lex genererà il documento usando i dati della pratica, della controparte selezionata e i tuoi input.
                                        L'operazione consuma 1 credito AI.
                                    </p>
                                    <button
                                        onClick={generaDocumento}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors"
                                    >
                                        <Wand2 size={14} /> Genera documento
                                    </button>
                                </div>
                            )}

                            {/* Errore generazione */}
                            {erroreGen && (
                                <div className="p-4 bg-red-900/10 border border-red-500/30">
                                    <p className="font-body text-sm text-red-400 flex items-start gap-2">
                                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                        <span>{erroreGen}</span>
                                    </p>
                                    <button
                                        onClick={generaDocumento}
                                        className="mt-3 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10"
                                    >
                                        Riprova
                                    </button>
                                </div>
                            )}

                            {/* Generazione in corso */}
                            {generando && (
                                <div className="p-4 bg-salvia/5 border border-salvia/30">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Loader2 size={16} className="animate-spin text-salvia" />
                                        <p className="font-body text-sm text-salvia font-medium">
                                            Lex sta generando il documento...
                                        </p>
                                    </div>
                                    {slotCorrente && (
                                        <p className="font-body text-xs text-salvia/70 ml-7">
                                            Sezione corrente: <span className="font-mono">{slotCorrente}</span>
                                        </p>
                                    )}
                                    {sezioniCompletate.length > 0 && (
                                        <p className="font-body text-xs text-nebbia/50 ml-7 mt-1">
                                            Sezioni completate: {sezioniCompletate.length}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Anteprima documento */}
                            {documentoMd && (
                                <>
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setVistaAnteprima('preview')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 font-body text-xs border transition-colors ${vistaAnteprima === 'preview'
                                                    ? 'bg-oro/10 border-oro/30 text-oro'
                                                    : 'border-white/10 text-nebbia/40 hover:text-nebbia'}`}
                                            >
                                                <Eye size={11} /> Anteprima
                                            </button>
                                            <button
                                                onClick={() => setVistaAnteprima('edit')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 font-body text-xs border transition-colors ${vistaAnteprima === 'edit'
                                                    ? 'bg-oro/10 border-oro/30 text-oro'
                                                    : 'border-white/10 text-nebbia/40 hover:text-nebbia'}`}
                                            >
                                                <Edit2 size={11} /> Modifica
                                            </button>
                                        </div>
                                        {risultato && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={esportaMarkdown}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 font-body text-xs text-oro border border-oro/30 hover:bg-oro/10"
                                                    title="Scarica come Markdown (modificabile in editor di testo)"
                                                >
                                                    <Download size={11} /> .md
                                                </button>
                                                <button
                                                    onClick={esportaHtmlStampabile}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 font-body text-xs text-oro border border-oro/30 hover:bg-oro/10"
                                                    title="Scarica HTML stampabile (apri e Stampa->Salva come PDF)"
                                                >
                                                    <Download size={11} /> .html
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {risultato && (
                                        <div className="p-3 bg-salvia/5 border border-salvia/30 flex items-center gap-2">
                                            <CheckCircle size={14} className="text-salvia shrink-0" />
                                            <p className="font-body text-xs text-salvia">
                                                Documento generato e salvato nei <strong>Documenti pratica</strong>: <span className="font-mono">{risultato.nome_file}</span>
                                            </p>
                                        </div>
                                    )}

                                    <div className="bg-petrolio border border-white/8 max-h-[50vh] overflow-y-auto">
                                        {vistaAnteprima === 'preview' ? (
                                            <div className="p-6 font-body text-sm text-nebbia/85 leading-relaxed prose-doc">
                                                <ReactMarkdown
                                                    components={{
                                                        h1: ({ children }) => <h1 className="font-display text-xl font-semibold text-nebbia mb-4 mt-2">{children}</h1>,
                                                        h2: ({ children }) => <h2 className="font-display text-base font-semibold text-nebbia mt-5 mb-2 uppercase tracking-wide">{children}</h2>,
                                                        h3: ({ children }) => <h3 className="font-body text-sm font-semibold text-nebbia/90 mt-3 mb-1">{children}</h3>,
                                                        strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
                                                        em: ({ children }) => <em className="italic text-nebbia/75">{children}</em>,
                                                        p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
                                                        hr: () => <hr className="my-4 border-white/10" />,
                                                        ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
                                                        ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
                                                    }}
                                                >
                                                    {documentoMd}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <textarea
                                                value={documentoMd}
                                                onChange={e => { setDocumentoMd(e.target.value); setDocModificato(true) }}
                                                className="w-full bg-petrolio text-nebbia font-mono text-xs p-4 outline-none resize-none border-0"
                                                style={{ minHeight: '50vh' }}
                                            />
                                        )}
                                    </div>

                                    {docModificato && risultato && (
                                        <p className="font-body text-xs text-amber-400 italic">
                                            Le modifiche sono solo locali. Il file salvato nella pratica resta la versione originale.
                                            Scarica il .md o .html per conservare le modifiche.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER NAV */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/8 shrink-0">
                    <button
                        onClick={indietro}
                        disabled={step === 'prerequisiti' || generando}
                        className="flex items-center gap-1.5 px-4 py-2 font-body text-sm text-nebbia/50 border border-white/10 hover:text-nebbia hover:border-white/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={13} /> Indietro
                    </button>

                    {step !== 'genera' ? (
                        <button
                            onClick={avanti}
                            disabled={
                                (step === 'prerequisiti' && !prereqOk) ||
                                (step === 'controparti' && !!verificaContropartiSelezione())
                            }
                            className="flex items-center gap-1.5 px-4 py-2 font-body text-sm bg-oro/10 border border-oro/30 text-oro hover:bg-oro/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Avanti <ChevronRight size={13} />
                        </button>
                    ) : risultato ? (
                        <button
                            onClick={onClose}
                            className="flex items-center gap-1.5 px-4 py-2 font-body text-sm bg-salvia/10 border border-salvia/30 text-salvia hover:bg-salvia/20 transition-colors"
                        >
                            <CheckCircle size={13} /> Fine
                        </button>
                    ) : (
                        <span className="font-body text-xs text-nebbia/30 italic">
                            {generando ? 'Generazione in corso...' : 'Premi "Genera documento" per iniziare'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}