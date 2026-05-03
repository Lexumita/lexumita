// src/components/ChatPratica.jsx
// Lex per la pratica.
// - 5 azioni predefinite (analisi/forza-debolezza/strategia/prossima-udienza/cronologia)
// - Textarea libera con auto-detection del Lead (routing su_pratica)
// - Streaming SSE da edge function lex-pratica
// - "Salva conversazione" inline: crea ricerche tipo='chat_lex'
// - "Nuova chat" pulisce i messaggi
// - Animazione Lex riusata da BancaDati durante l'attesa

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import {
    Sparkles, Send, Save, Plus, AlertCircle, X, CheckCircle,
    Loader2, FileSearch, Scale, Compass, Calendar, BookOpen
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────
const ENDPOINT_PRATICA = '/functions/v1/lex-pratica'

// 5 azioni predefinite + libera
const AZIONI_PREDEFINITE = [
    { key: 'analisi', label: 'Analisi della questione', icon: FileSearch },
    { key: 'forza_debolezza', label: 'Punti di forza e debolezza', icon: Scale },
    { key: 'strategia', label: 'Strategia processuale', icon: Compass },
    { key: 'prossima_udienza', label: 'Cosa preparare per la prossima udienza', icon: Calendar },
    { key: 'cronologia', label: 'Cronologia ragionata', icon: BookOpen },
]

const AZIONI_LABEL = AZIONI_PREDEFINITE.reduce((acc, a) => {
    acc[a.key] = a.label
    return acc
}, {})

// ─────────────────────────────────────────────────────────────
// LEX ANIMAZIONE — riusata identica da BancaDati
// ─────────────────────────────────────────────────────────────
function LexAnimazione() {
    const frasiRotative = [
        'Sto analizzando la pratica',
        'Esamino la cronologia delle udienze',
        'Controllo i documenti del fascicolo',
        'Ricostruisco le posizioni delle parti',
        'Verifico la prossima udienza',
        'Compongo una risposta strutturata',
    ]

    const [indiceFrase, setIndiceFrase] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setIndiceFrase((i) => (i + 1) % frasiRotative.length)
        }, 4000)
        return () => clearInterval(interval)
    }, [])

    const testoVisibile = frasiRotative[indiceFrase]

    return (
        <div className="px-3 py-4 max-w-[600px] mx-auto">
            <style>{`
                .lex-stage { position: relative; width: 100%; aspect-ratio: 16 / 7; margin: 0 auto; }
                .lex-stage svg { width: 100%; height: 100%; display: block; }
                .lex-ray { animation: lexRayCycle 27s ease-in-out infinite; }
                @keyframes lexRayCycle {
                    0% { transform: translateX(-30px); opacity: 0; }
                    3% { opacity: 0.8; }
                    8% { transform: translateX(85px); opacity: 0.9; }
                    12% { transform: translateX(85px); opacity: 1; }
                    16% { transform: translateX(85px); opacity: 0; }
                    33% { transform: translateX(85px); opacity: 0; }
                    34% { transform: translateX(-30px); opacity: 0; }
                    37% { opacity: 0.8; }
                    42% { transform: translateX(180px); opacity: 0.9; }
                    46% { transform: translateX(180px); opacity: 1; }
                    50% { transform: translateX(180px); opacity: 0; }
                    66% { transform: translateX(180px); opacity: 0; }
                    67% { transform: translateX(-30px); opacity: 0; }
                    70% { opacity: 0.8; }
                    78% { transform: translateX(290px); opacity: 0.9; }
                    82% { transform: translateX(290px); opacity: 1; }
                    86% { transform: translateX(290px); opacity: 0; }
                    100% { transform: translateX(290px); opacity: 0; }
                }
                .lex-book-a { animation: lexBookGlowA 27s ease-in-out infinite; }
                @keyframes lexBookGlowA {
                    0%, 8% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                    12% { fill: rgba(201, 164, 92, 0.25); stroke: #C9A45C; stroke-width: 1.5; transform: translateY(0); }
                    16% { fill: rgba(201, 164, 92, 0.15); stroke: rgba(201, 164, 92, 0.4); stroke-width: 1; transform: translateY(8px); }
                    24% { fill: rgba(201, 164, 92, 0.05); stroke: rgba(201, 164, 92, 0.3); stroke-width: 1; transform: translateY(8px); }
                    32%, 100% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-book-b { animation: lexBookGlowB 27s ease-in-out infinite; }
                @keyframes lexBookGlowB {
                    0%, 41% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                    46% { fill: rgba(201, 164, 92, 0.25); stroke: #C9A45C; stroke-width: 1.5; transform: translateY(0); }
                    50% { fill: rgba(201, 164, 92, 0.15); stroke: rgba(201, 164, 92, 0.4); stroke-width: 1; transform: translateY(8px); }
                    58% { fill: rgba(201, 164, 92, 0.05); stroke: rgba(201, 164, 92, 0.3); stroke-width: 1; transform: translateY(8px); }
                    66%, 100% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-book-c { animation: lexBookGlowC 27s ease-in-out infinite; }
                @keyframes lexBookGlowC {
                    0%, 75% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                    82% { fill: rgba(201, 164, 92, 0.25); stroke: #C9A45C; stroke-width: 1.5; transform: translateY(0); }
                    86% { fill: rgba(201, 164, 92, 0.15); stroke: rgba(201, 164, 92, 0.4); stroke-width: 1; transform: translateY(8px); }
                    94% { fill: rgba(201, 164, 92, 0.05); stroke: rgba(201, 164, 92, 0.3); stroke-width: 1; transform: translateY(8px); }
                    100% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-fade-text { animation: lexFadeIn 0.6s ease-out; }
                @keyframes lexFadeIn {
                    0% { opacity: 0; transform: translateY(4px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .lex-dots-container { display: inline-flex; gap: 3px; margin-left: 6px; align-items: center; }
                .lex-dot {
                    display: inline-block; width: 3px; height: 3px;
                    border-radius: 50%; background: #C9A45C; opacity: 0.4;
                    animation: lexDotPulse 1.4s ease-in-out infinite;
                }
                .lex-dot:nth-child(1) { animation-delay: 0s; }
                .lex-dot:nth-child(2) { animation-delay: 0.2s; }
                .lex-dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes lexDotPulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.3); }
                }
            `}</style>

            <div className="lex-stage">
                <svg viewBox="62 27 416 185" xmlns="http://www.w3.org/2000/svg" role="img">
                    <title>Lex sta lavorando sulla pratica</title>
                    <line x1="60" y1="172" x2="480" y2="172" stroke="rgba(201, 164, 92, 0.4)" strokeWidth="0.8" />

                    <rect x="80" y="100" width="22" height="72" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="105" y="92" width="20" height="80" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="128" y="105" width="24" height="67" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect className="lex-book-a" x="155" y="96" width="22" height="76" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="180" y="108" width="20" height="64" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="203" y="98" width="22" height="74" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="228" y="103" width="24" height="69" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect className="lex-book-b" x="255" y="90" width="26" height="82" rx="1.5" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="284" y="97" width="22" height="75" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="309" y="104" width="24" height="68" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="336" y="93" width="22" height="79" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect className="lex-book-c" x="361" y="106" width="20" height="66" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="384" y="100" width="22" height="72" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="409" y="95" width="24" height="77" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />

                    <g className="lex-ray">
                        <ellipse cx="80" cy="135" rx="22" ry="55" fill="#C9A45C" opacity="0.18" />
                        <ellipse cx="80" cy="135" rx="14" ry="45" fill="#C9A45C" opacity="0.25" />
                        <ellipse cx="80" cy="135" rx="6" ry="35" fill="#C9A45C" opacity="0.4" />
                        <line x1="80" y1="80" x2="80" y2="180" stroke="#C9A45C" strokeWidth="0.5" opacity="0.6" />
                    </g>
                </svg>
            </div>

            <div className="text-center mt-3 min-h-[24px]">
                {testoVisibile && (
                    <span
                        key={indiceFrase}
                        className="lex-fade-text font-body text-sm text-nebbia/70 tracking-wide inline-flex items-center"
                    >
                        {testoVisibile}
                        <span className="lex-dots-container">
                            <span className="lex-dot" />
                            <span className="lex-dot" />
                            <span className="lex-dot" />
                        </span>
                    </span>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// HELPER: trascrizione conversazione in Markdown
// ─────────────────────────────────────────────────────────────
function trascriviConversazione(messaggi) {
    return messaggi.map(m => {
        const ruolo = m.role === 'user' ? '**Avvocato:**' : '**Lex:**'
        const ts = m.ts ? new Date(m.ts).toLocaleString('it-IT', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }) : ''
        return `${ruolo}${ts ? ` _(${ts})_` : ''}\n\n${m.content}\n`
    }).join('\n---\n\n')
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function ChatPratica({ praticaId }) {
    const [conversazione, setConversazione] = useState([])
    const [domandaLibera, setDomandaLibera] = useState('')
    const [inviando, setInviando] = useState(false)
    const [streamingTesto, setStreamingTesto] = useState('')
    const [errore, setErrore] = useState('')

    const [crediti, setCrediti] = useState(null)

    const [mostraSalva, setMostraSalva] = useState(false)
    const [titoloSalva, setTitoloSalva] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [salvataConferma, setSalvataConferma] = useState(false)

    const [confermaNuova, setConfermaNuova] = useState(false)

    const bottomRef = useRef(null)
    const abortRef = useRef(null)

    // Scroll automatico
    useEffect(() => {
        if (conversazione.length === 0) return
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, [conversazione, streamingTesto])

    // Carica crediti residui al mount + on focus
    useEffect(() => {
        async function caricaCrediti() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from('crediti_ai')
                .select('crediti_totali, crediti_usati, periodo_fine, tipo')
                .eq('user_id', user.id)
            if (!data || data.length === 0) {
                setCrediti(0)
                return
            }
            const now = new Date()
            const totale = data.reduce((acc, row) => {
                const residui = row.crediti_totali - row.crediti_usati
                const scaduto = row.periodo_fine && new Date(row.periodo_fine) < now
                return acc + (residui > 0 && !scaduto ? residui : 0)
            }, 0)
            setCrediti(totale)
        }
        caricaCrediti()
        function onFocus() { caricaCrediti() }
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [])

    // ─────────────────────────────────────────────────────────
    // INVIA: chiamata streaming a lex-pratica
    // ─────────────────────────────────────────────────────────
    async function invia(azione, domandaCustom) {
        if (inviando) return
        if (crediti !== null && crediti <= 0) {
            setErrore('Crediti AI esauriti. Acquista crediti per continuare.')
            return
        }

        const isLibera = azione === 'libera'
        const domandaPerEdge = isLibera ? (domandaCustom ?? domandaLibera).trim() : ''

        if (isLibera && !domandaPerEdge) {
            setErrore('Scrivi una domanda per Lex')
            return
        }

        setErrore('')

        // Etichetta utente: per azione predefinita = label dell'azione, per libera = testo digitato
        const labelUtente = isLibera ? domandaPerEdge : AZIONI_LABEL[azione] ?? azione

        const tsUser = new Date().toISOString()
        const nuovaConv = [
            ...conversazione,
            { role: 'user', content: labelUtente, ts: tsUser, azione: isLibera ? null : azione },
        ]
        setConversazione(nuovaConv)
        if (isLibera) setDomandaLibera('')
        setInviando(true)
        setStreamingTesto('')

        abortRef.current = new AbortController()

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Sessione scaduta. Ricarica la pagina.')

            const url = `${import.meta.env.VITE_SUPABASE_URL}${ENDPOINT_PRATICA}`

            // Storia conversazione: solo coppie precedenti complete
            const storia = conversazione.map(m => ({
                role: m.role,
                content: m.content,
            }))

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    pratica_id: praticaId,
                    azione,
                    domanda: domandaPerEdge,
                    messaggi: storia,
                }),
                signal: abortRef.current.signal,
            })

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({ error: 'Errore sconosciuto' }))
                if (errBody.crediti_esauriti) {
                    setErrore('crediti_esauriti')
                } else {
                    setErrore(errBody.error ?? `Errore ${response.status}`)
                }
                // Rimuovi messaggio utente appena aggiunto
                setConversazione(conversazione)
                setInviando(false)
                return
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let testoAccumulato = ''
            let creditiRimasti = null

            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                let eventoCorrente = null
                for (const line of lines) {
                    if (!line.trim()) continue

                    if (line.startsWith('event: ')) {
                        eventoCorrente = line.slice(7).trim()
                        continue
                    }

                    if (line.startsWith('data: ')) {
                        const payload = line.slice(6).trim()
                        try {
                            const data = JSON.parse(payload)

                            if (eventoCorrente === 'chunk') {
                                testoAccumulato += data.text ?? ''
                                setStreamingTesto(testoAccumulato)
                            }

                            if (eventoCorrente === 'done') {
                                if (data.crediti_rimasti !== undefined) creditiRimasti = data.crediti_rimasti
                            }

                            if (eventoCorrente === 'error') {
                                setErrore(data.error ?? 'Errore nello streaming')
                            }
                        } catch {
                            // ignore
                        }
                    }
                }
            }

            // Aggiungi messaggio Lex completo
            const messaggioCompleto = {
                role: 'assistant',
                content: testoAccumulato,
                ts: new Date().toISOString(),
            }
            setConversazione([...nuovaConv, messaggioCompleto])
            setStreamingTesto('')

            if (creditiRimasti !== null) setCrediti(creditiRimasti)

        } catch (err) {
            if (err.name === 'AbortError') {
                setConversazione(conversazione)
            } else {
                setErrore(err.message)
                setConversazione(conversazione)
            }
            setStreamingTesto('')
        } finally {
            setInviando(false)
            abortRef.current = null
        }
    }

    // ─────────────────────────────────────────────────────────
    // SALVA conversazione in `ricerche` come tipo 'chat_lex'
    // (stesso pattern di BancaDati AggiungiAPratica)
    // ─────────────────────────────────────────────────────────
    async function salvaConversazione() {
        if (!titoloSalva.trim()) {
            setErrore('Inserisci un titolo per la conversazione')
            return
        }
        setSalvando(true)
        setErrore('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const trascrizione = trascriviConversazione(conversazione)

            const { error } = await supabase.from('ricerche').insert({
                pratica_id: praticaId,
                user_id: user.id,
                autore_id: user.id,
                tipo: 'chat_lex',
                titolo: titoloSalva.trim(),
                contenuto: trascrizione,
                metadati: {
                    fonte: 'lex_pratica',
                    n_messaggi: conversazione.length,
                    ts: new Date().toISOString(),
                },
            })

            if (error) throw new Error(error.message)

            setSalvataConferma(true)
            setMostraSalva(false)
            setTitoloSalva('')
            setTimeout(() => setSalvataConferma(false), 4000)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setSalvando(false)
        }
    }

    // ─────────────────────────────────────────────────────────
    // NUOVA chat
    // ─────────────────────────────────────────────────────────
    function nuovaChat() {
        if (abortRef.current) abortRef.current.abort()
        setConversazione([])
        setDomandaLibera('')
        setStreamingTesto('')
        setErrore('')
        setConfermaNuova(false)
        setMostraSalva(false)
    }

    function richiediNuovaChat() {
        if (conversazione.length === 0) return
        setConfermaNuova(true)
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            invia('libera')
        }
    }

    const haMessaggi = conversazione.length > 0
    const creditiZero = crediti !== null && crediti <= 0

    // Markdown components per le risposte di Lex
    const markdownComponents = {
        h2: ({ children }) => <h2 className="font-display text-base font-semibold text-nebbia mt-4 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="font-body text-sm font-semibold text-nebbia/80 mt-3 mb-1">{children}</h3>,
        strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
        em: ({ children }) => <em className="italic text-nebbia/80">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-nebbia/80 my-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-nebbia/80 my-2">{children}</ol>,
        li: ({ children }) => <li className="font-body text-sm">{children}</li>,
        p: ({ children }) => <p className="font-body text-sm text-nebbia/80 leading-relaxed mb-2">{children}</p>,
        hr: () => <hr className="my-3 border-white/10" />,
    }

    return (
        <div className="bg-slate border border-salvia/20 flex flex-col" style={{ minHeight: 480 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-salvia" />
                    <p className="font-body text-base font-medium text-salvia">Lex per questa pratica</p>
                    {crediti !== null && (
                        <span className="font-body text-xs text-nebbia/30 ml-2">{crediti} crediti</span>
                    )}
                </div>
                {haMessaggi && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMostraSalva(v => !v)}
                            disabled={inviando}
                            className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors disabled:opacity-40"
                        >
                            <Save size={11} /> Salva conversazione
                        </button>
                        <button
                            onClick={richiediNuovaChat}
                            disabled={inviando}
                            className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 border border-white/10 px-3 py-1.5 hover:text-nebbia hover:border-white/25 transition-colors disabled:opacity-40"
                        >
                            <Plus size={11} /> Nuova chat
                        </button>
                    </div>
                )}
            </div>

            {/* Conferma nuova chat */}
            {confermaNuova && (
                <div className="px-5 py-3 border-b border-amber-500/30 bg-amber-500/5 shrink-0">
                    <div className="flex items-center justify-between gap-3">
                        <p className="font-body text-xs text-amber-400">
                            <AlertCircle size={12} className="inline mr-1" />
                            La conversazione corrente andrà persa. Continuare?
                        </p>
                        <div className="flex gap-2">
                            <button onClick={nuovaChat} className="font-body text-xs text-amber-400 border border-amber-500/40 px-3 py-1 hover:bg-amber-500/10">
                                Sì, nuova chat
                            </button>
                            <button onClick={() => setConfermaNuova(false)} className="font-body text-xs text-nebbia/40 px-3 py-1 hover:text-nebbia">
                                Annulla
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Conferma salvataggio */}
            {salvataConferma && (
                <div className="px-5 py-3 border-b border-salvia/30 bg-salvia/5 shrink-0">
                    <p className="font-body text-xs text-salvia flex items-center gap-2">
                        <CheckCircle size={12} />
                        Conversazione salvata nelle ricerche della pratica.
                    </p>
                </div>
            )}

            {/* Form salva conversazione */}
            {mostraSalva && (
                <div className="px-5 py-4 border-b border-white/5 bg-petrolio/30 shrink-0 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="font-body text-xs text-oro tracking-widest uppercase">Salva nelle ricerche</p>
                        <button onClick={() => { setMostraSalva(false); setTitoloSalva('') }} className="text-nebbia/30 hover:text-nebbia">
                            <X size={13} />
                        </button>
                    </div>
                    <input
                        type="text"
                        value={titoloSalva}
                        onChange={e => setTitoloSalva(e.target.value)}
                        placeholder="Es. Strategia per udienza del 15 marzo"
                        autoFocus
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={salvaConversazione}
                            disabled={salvando || !titoloSalva.trim()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40"
                        >
                            {salvando
                                ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                                : <><Save size={11} /> Conferma salvataggio</>
                            }
                        </button>
                        <button onClick={() => { setMostraSalva(false); setTitoloSalva('') }} className="px-3 py-1.5 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors">
                            Annulla
                        </button>
                    </div>
                </div>
            )}

            {/* Conversazione */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Stato vuoto: messaggio + 5 azioni predefinite a colonna piena */}
                {!haMessaggi && !inviando && (
                    <div className="space-y-4">
                        <div className="text-center py-2">
                            <Sparkles size={24} className="text-salvia/30 mx-auto mb-2" />
                            <p className="font-body text-sm font-medium text-nebbia/60">
                                Lex conosce questa pratica
                            </p>
                            <p className="font-body text-xs text-nebbia/40 mt-1 max-w-md mx-auto leading-relaxed">
                                Cliente, controparti, udienze, documenti dell'archivio e ricerche già fatte.
                                Puoi chiedere un'analisi rapida o usare un'azione preimpostata.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                            {AZIONI_PREDEFINITE.map(a => {
                                const Icon = a.icon
                                return (
                                    <button
                                        key={a.key}
                                        onClick={() => invia(a.key)}
                                        disabled={inviando || creditiZero}
                                        className="flex items-center gap-2 px-3 py-2.5 bg-petrolio/40 border border-white/10 hover:border-salvia/40 hover:bg-salvia/5 text-left transition-colors disabled:opacity-40"
                                    >
                                        <Icon size={13} className="text-salvia shrink-0" />
                                        <span className="font-body text-xs text-nebbia/80 leading-snug">{a.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Messaggi conversazione */}
                {conversazione.map((m, i) => (
                    <div key={i} className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className={`font-body text-xs font-medium ${m.role === 'user' ? 'text-oro/70' : 'text-salvia/70'}`}>
                                {m.role === 'user' ? 'Tu' : 'Lex'}
                            </span>
                            {m.azione && (
                                <span className="font-body text-[10px] text-salvia/50 border border-salvia/20 px-1.5 py-0.5 uppercase tracking-wider">
                                    {AZIONI_LABEL[m.azione] ?? m.azione}
                                </span>
                            )}
                        </div>

                        {m.role === 'user' ? (
                            <p className="font-body text-sm text-nebbia/60 leading-relaxed">{m.content}</p>
                        ) : (
                            <div className="font-body text-sm text-nebbia/80 leading-relaxed">
                                <ReactMarkdown components={markdownComponents}>
                                    {m.content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                ))}

                {/* In streaming */}
                {inviando && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="font-body text-xs font-medium text-salvia/70">Lex</span>
                        </div>

                        {streamingTesto.length === 0 ? (
                            <LexAnimazione />
                        ) : (
                            <div className="font-body text-sm text-nebbia/80 leading-relaxed">
                                <ReactMarkdown components={markdownComponents}>
                                    {streamingTesto}
                                </ReactMarkdown>
                                <span className="inline-block w-1 h-4 bg-oro/60 align-middle animate-pulse ml-0.5" />
                            </div>
                        )}
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Errore */}
            {errore && errore !== 'crediti_esauriti' && (
                <div className="mx-5 mb-3 p-3 bg-red-900/10 border border-red-500/30">
                    <p className="font-body text-xs text-red-400 flex items-start gap-2">
                        <AlertCircle size={13} className="shrink-0 mt-0.5" />
                        <span>{errore}</span>
                    </p>
                </div>
            )}

            {errore === 'crediti_esauriti' && (
                <div className="mx-5 mb-3 flex items-center justify-between gap-3 p-3 bg-oro/5 border border-oro/20">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={13} className="text-oro shrink-0" />
                        <p className="font-body text-xs text-nebbia/60">Crediti Lex esauriti.</p>
                    </div>
                    <a
                        href="/studio?tab=acquista"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors whitespace-nowrap"
                    >
                        Acquista crediti →
                    </a>
                </div>
            )}

            {/* Input area: textarea libera + (se haMessaggi) shortcut azioni */}
            <div className="border-t border-white/5 p-4 space-y-3 shrink-0">

                {/* Shortcut azioni: visibile dopo che la conversazione è iniziata */}
                {haMessaggi && (
                    <div className="flex flex-wrap gap-1.5">
                        {AZIONI_PREDEFINITE.map(a => {
                            const Icon = a.icon
                            return (
                                <button
                                    key={a.key}
                                    onClick={() => invia(a.key)}
                                    disabled={inviando || creditiZero}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 border border-white/10 text-nebbia/50 hover:border-salvia/40 hover:text-salvia hover:bg-salvia/5 transition-colors font-body text-xs disabled:opacity-40"
                                    title={a.label}
                                >
                                    <Icon size={11} />
                                    <span className="hidden sm:inline">{a.label}</span>
                                </button>
                            )
                        })}
                    </div>
                )}

                <div className="flex gap-3 items-end">
                    <textarea
                        rows={2}
                        value={domandaLibera}
                        onChange={e => setDomandaLibera(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={inviando || creditiZero}
                        placeholder={creditiZero
                            ? "Crediti esauriti — acquista crediti per continuare"
                            : (haMessaggi ? "Continua con una domanda libera... (Ctrl+Enter per inviare)" : "Domanda libera sulla pratica... (Ctrl+Enter per inviare)")
                        }
                        className="flex-1 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 resize-none placeholder:text-nebbia/25 disabled:opacity-50"
                        style={{ minHeight: '60px', maxHeight: '200px' }}
                    />
                    <button
                        onClick={() => invia('libera')}
                        disabled={inviando || !domandaLibera.trim() || creditiZero}
                        className="px-4 py-3 bg-salvia/10 border border-salvia/30 text-salvia hover:bg-salvia/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed self-end"
                        title={creditiZero ? 'Crediti esauriti' : 'Invia (Ctrl+Enter)'}
                    >
                        {inviando
                            ? <Loader2 size={15} className="animate-spin" />
                            : <Send size={15} />
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}