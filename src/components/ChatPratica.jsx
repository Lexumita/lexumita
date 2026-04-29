// src/components/ChatPratica.jsx
// Chat con Lex dentro la pratica.
// - Storico effimero (vive solo nella sessione corrente)
// - Streaming SSE da edge function chat-pratica (da implementare in altra chat)
// - "Salva conversazione" inline: crea note_interne tipo chat_lex
// - "Nuova chat" pulisce i messaggi
// - Mostra crediti residui, blocca invio se 0

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import {
    Sparkles, Send, Save, Plus, AlertCircle, X, CheckCircle,
    Loader2, MessageSquare
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────
const CHAT_ENDPOINT = '/functions/v1/chat-pratica'

// ─────────────────────────────────────────────────────────────
// HELPER: parser SSE
// Legge eventi "data: {json}\n\n" da uno stream e li passa a onEvent
// ─────────────────────────────────────────────────────────────
async function leggiStreamSSE(response, onEvent) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Splitta per delimitatore SSE
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
            } catch {
                // Ignora payload non-JSON
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// HELPER: trascrizione conversazione in Markdown
// Usata per il salvataggio in note_interne
// ─────────────────────────────────────────────────────────────
function trascriviConversazione(messaggi) {
    return messaggi.map(m => {
        const ruolo = m.ruolo === 'user' ? '**Avvocato:**' : '**Lex:**'
        const ts = new Date(m.ts).toLocaleString('it-IT', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
        return `${ruolo} _(${ts})_\n\n${m.testo}\n`
    }).join('\n---\n\n')
}

// ─────────────────────────────────────────────────────────────
// MESSAGGIO singolo (bubble)
// ─────────────────────────────────────────────────────────────
function Bubble({ m }) {
    const isUser = m.ruolo === 'user'
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 ${isUser
                ? 'bg-oro/10 border border-oro/25'
                : 'bg-petrolio border border-salvia/20'
                }`}>
                {isUser ? (
                    <p className="font-body text-sm text-nebbia leading-relaxed whitespace-pre-line">{m.testo}</p>
                ) : (
                    <div className="font-body text-sm text-nebbia/90 leading-relaxed">
                        {m.testo === '' && m.streaming ? (
                            <div className="flex items-center gap-2 text-salvia/60">
                                <Loader2 size={13} className="animate-spin" />
                                <span className="font-body text-xs">Lex sta pensando...</span>
                            </div>
                        ) : (
                            <ReactMarkdown
                                components={{
                                    h2: ({ children }) => <h2 className="font-body text-sm font-semibold text-nebbia mt-3 mb-1">{children}</h2>,
                                    h3: ({ children }) => <h3 className="font-body text-sm font-semibold text-nebbia/80 mt-2 mb-1">{children}</h3>,
                                    strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
                                    em: ({ children }) => <em className="italic text-nebbia/70">{children}</em>,
                                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-1.5">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-1.5">{children}</ol>,
                                    li: ({ children }) => <li className="font-body text-sm">{children}</li>,
                                    p: ({ children }) => <p className="font-body text-sm leading-relaxed mb-1.5 last:mb-0">{children}</p>,
                                    code: ({ children }) => <code className="font-mono text-xs bg-slate px-1.5 py-0.5 text-oro/80">{children}</code>,
                                }}
                            >
                                {m.testo}
                            </ReactMarkdown>
                        )}
                        {m.streaming && m.testo !== '' && (
                            <span className="inline-block w-2 h-4 bg-salvia/60 animate-pulse ml-1 align-middle" />
                        )}
                    </div>
                )}
                <p className={`font-body text-[10px] mt-1.5 ${isUser ? 'text-oro/40 text-right' : 'text-salvia/40'}`}>
                    {new Date(m.ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function ChatPratica({ praticaId }) {
    const [messaggi, setMessaggi] = useState([])
    const [testo, setTesto] = useState('')
    const [inviando, setInviando] = useState(false)
    const [errore, setErrore] = useState('')

    // Crediti AI
    const [crediti, setCrediti] = useState(null)

    // Salva conversazione (inline)
    const [mostraSalva, setMostraSalva] = useState(false)
    const [titoloSalva, setTitoloSalva] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [salvataConferma, setSalvataConferma] = useState(false)

    // Conferma "nuova chat" (inline)
    const [confermaNuova, setConfermaNuova] = useState(false)

    const bottomRef = useRef(null)
    const textareaRef = useRef(null)

    // Scroll automatico in fondo a ogni nuovo messaggio o chunk
    useEffect(() => {
        // Skip al primo mount per non scrollare la pagina principale
        // quando ChatPratica viene montato con messaggi precaricati
        if (messaggi.length === 0) return

        bottomRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'  // ← chiave: scrolla solo il container interno
        })
    }, [messaggi])

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
    // INVIA messaggio: chiamata streaming SSE
    // ─────────────────────────────────────────────────────────
    async function invia() {
        if (!testo.trim() || inviando) return
        if (crediti !== null && crediti <= 0) {
            setErrore('Crediti AI esauriti. Acquista crediti per continuare.')
            return
        }

        setErrore('')
        const testoUtente = testo.trim()
        const tsUser = new Date().toISOString()

        // Aggiungi messaggio utente + placeholder Lex (vuoto, in streaming)
        const nuoviMessaggi = [
            ...messaggi,
            { ruolo: 'user', testo: testoUtente, ts: tsUser },
            { ruolo: 'lex', testo: '', ts: new Date().toISOString(), streaming: true },
        ]
        setMessaggi(nuoviMessaggi)
        setTesto('')
        setInviando(true)

        // Reset altezza textarea
        if (textareaRef.current) textareaRef.current.style.height = 'auto'

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Sessione scaduta. Ricarica la pagina.')

            const url = `${import.meta.env.VITE_SUPABASE_URL}${CHAT_ENDPOINT}`

            // Storia conversazione inviata all'edge function
            // Esclude il placeholder Lex appena aggiunto (l'ultimo)
            const storia = messaggi.map(m => ({
                ruolo: m.ruolo,
                testo: m.testo,
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
                    messaggi: storia,
                    ultimo_messaggio: testoUtente,
                }),
            })

            if (!response.ok) {
                const err = await response.text()
                throw new Error(`Errore ${response.status}: ${err.slice(0, 200)}`)
            }

            // Parsing stream SSE
            let testoAccumulato = ''
            let erroreStream = null

            await leggiStreamSSE(response, (event) => {
                if (event.error) {
                    erroreStream = event.error
                    return
                }
                if (event.chunk) {
                    testoAccumulato += event.chunk
                    setMessaggi(prev => {
                        const copia = [...prev]
                        const ultimo = copia[copia.length - 1]
                        if (ultimo && ultimo.ruolo === 'lex') {
                            copia[copia.length - 1] = {
                                ...ultimo,
                                testo: testoAccumulato,
                            }
                        }
                        return copia
                    })
                }
                if (event.done) {
                    setMessaggi(prev => {
                        const copia = [...prev]
                        const ultimo = copia[copia.length - 1]
                        if (ultimo && ultimo.ruolo === 'lex') {
                            copia[copia.length - 1] = {
                                ...ultimo,
                                streaming: false,
                            }
                        }
                        return copia
                    })
                    // Aggiorna crediti residui (-1)
                    setCrediti(c => (c !== null ? Math.max(0, c - 1) : c))
                }
            })

            if (erroreStream) throw new Error(erroreStream)

            // Se lo stream finisce senza un evento "done", chiudi comunque
            setMessaggi(prev => {
                const copia = [...prev]
                const ultimo = copia[copia.length - 1]
                if (ultimo && ultimo.ruolo === 'lex' && ultimo.streaming) {
                    copia[copia.length - 1] = { ...ultimo, streaming: false }
                }
                return copia
            })

        } catch (err) {
            setErrore(err.message)
            // Rimuovi il placeholder Lex vuoto se la chiamata è fallita
            setMessaggi(prev => {
                const ultimo = prev[prev.length - 1]
                if (ultimo && ultimo.ruolo === 'lex' && ultimo.testo === '') {
                    return prev.slice(0, -1)
                }
                return prev
            })
        } finally {
            setInviando(false)
        }
    }

    // ─────────────────────────────────────────────────────────
    // SALVA conversazione in note_interne come tipo "chat_lex"
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
            const trascrizione = trascriviConversazione(messaggi)

            const { error } = await supabase.from('note_interne').insert({
                pratica_id: praticaId,
                user_id: user.id,
                autore_id: user.id,
                tipo: 'chat_lex',
                testo: trascrizione,
                metadati: {
                    domanda: titoloSalva.trim(),
                    ts: new Date().toISOString(),
                    n_messaggi: messaggi.length,
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
    // NUOVA chat: pulisci messaggi
    // ─────────────────────────────────────────────────────────
    function nuovaChat() {
        setMessaggi([])
        setTesto('')
        setErrore('')
        setConfermaNuova(false)
        setMostraSalva(false)
    }

    function richiediNuovaChat() {
        if (messaggi.length === 0) return
        setConfermaNuova(true)
    }

    // Auto-resize textarea
    function handleChangeTesto(e) {
        setTesto(e.target.value)
        const ta = e.target
        ta.style.height = 'auto'
        ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            invia()
        }
    }

    const haMessaggi = messaggi.length > 0
    const creditiZero = crediti !== null && crediti <= 0

    return (
        <div className="bg-slate border border-salvia/20 flex flex-col" style={{ minHeight: 480 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-salvia" />
                    <p className="font-body text-base font-medium text-salvia">Chat con Lex</p>
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

            {/* Conferma nuova chat (inline) */}
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

            {/* Conferma salvataggio (toast inline) */}
            {salvataConferma && (
                <div className="px-5 py-3 border-b border-salvia/30 bg-salvia/5 shrink-0">
                    <p className="font-body text-xs text-salvia flex items-center gap-2">
                        <CheckCircle size={12} />
                        Conversazione salvata nelle ricerche della pratica.
                    </p>
                </div>
            )}

            {/* Salva conversazione (form inline) */}
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
                        placeholder="Es. Strategia difensiva su responsabilità contrattuale"
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

            {/* Lista messaggi */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messaggi.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8">
                        <Sparkles size={28} className="text-salvia/30 mb-3" />
                        <p className="font-body text-sm font-medium text-nebbia/60 mb-2">
                            Chiedi a Lex tutto sulla pratica
                        </p>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed max-w-md">
                            Lex conosce dettagli, controparti, ricerche, udienze e documenti
                            di questa pratica. Può cercare nella banca dati e ragionare con te
                            su strategie e prossimi passi.
                        </p>
                        <p className="font-body text-[10px] text-nebbia/25 mt-4 italic">
                            La conversazione si perde alla chiusura — usa "Salva conversazione" per conservarla.
                        </p>
                    </div>
                ) : messaggi.map((m, i) => <Bubble key={i} m={m} />)}
                <div ref={bottomRef} />
            </div>

            {/* Errore */}
            {errore && (
                <div className="mx-5 mb-3 p-3 bg-red-900/10 border border-red-500/30">
                    <p className="font-body text-xs text-red-400 flex items-start gap-2">
                        <AlertCircle size={13} className="shrink-0 mt-0.5" />
                        <span>{errore}</span>
                    </p>
                </div>
            )}

            {/* Input */}
            <div className="border-t border-white/5 p-4 flex gap-3 items-end shrink-0">
                <textarea
                    ref={textareaRef}
                    rows={2}
                    value={testo}
                    onChange={handleChangeTesto}
                    onKeyDown={handleKeyDown}
                    disabled={inviando || creditiZero}
                    placeholder={creditiZero
                        ? "Crediti esauriti — acquista crediti per continuare"
                        : "Scrivi un messaggio a Lex... (Enter per inviare, Shift+Enter per nuova riga)"
                    }
                    className="flex-1 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 resize-none placeholder:text-nebbia/25 disabled:opacity-50"
                    style={{ minHeight: '60px', maxHeight: '200px' }}
                />
                <button
                    onClick={invia}
                    disabled={inviando || !testo.trim() || creditiZero}
                    className="px-4 py-3 bg-salvia/10 border border-salvia/30 text-salvia hover:bg-salvia/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed self-end"
                    title={creditiZero ? 'Crediti esauriti' : 'Invia (Enter)'}
                >
                    {inviando
                        ? <Loader2 size={15} className="animate-spin" />
                        : <Send size={15} />
                    }
                </button>
            </div>
        </div>
    )
}