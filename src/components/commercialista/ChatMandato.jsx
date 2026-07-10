// src/components/commercialista/ChatMandato.jsx
//
// Assistente AI sul mandato: chat contestuale (chiama l'edge lex-mandato, che
// conosce cliente, scadenze, conto economico e personale del mandato). Le
// risposte utili si possono salvare tra le Ricerche del mandato.
//
// Props:
//   mandatoId  (string)
//   onRicercaSalvata()  - notifica al box ricerche (refresh)

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2, Save, AlertCircle, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'

const SUGGERIMENTI = [
    'Quali scadenze fiscali ho aperte su questo mandato?',
    'Come sta andando il conto economico dell\'anno?',
    'Stima il costo annuo del personale di questo cliente',
    'Quali adempimenti IVA mi aspettano nel prossimo trimestre?',
]

const MD = {
    h2: ({ children }) => <h2 className="font-body text-sm font-semibold text-nebbia mt-3 mb-1">{children}</h2>,
    h3: ({ children }) => <h3 className="font-body text-xs font-semibold text-nebbia/80 mt-2 mb-0.5">{children}</h3>,
    strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
    ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
    li: ({ children }) => <li className="font-body text-sm text-nebbia/70">{children}</li>,
    p: ({ children }) => <p className="font-body text-sm text-nebbia/70 leading-relaxed mb-1.5">{children}</p>,
}

export default function ChatMandato({ mandatoId, onRicercaSalvata }) {
    const [messaggi, setMessaggi] = useState([])   // { role:'user'|'assistant', content, salvata? }
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [errore, setErrore] = useState('')
    const [salvandoIdx, setSalvandoIdx] = useState(null)
    const fondoRef = useRef(null)

    useEffect(() => { fondoRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messaggi, loading])

    async function invia(domanda) {
        const q = (domanda ?? input).trim()
        if (!q || loading) return
        setErrore('')
        const nuoviMsg = [...messaggi, { role: 'user', content: q }]
        setMessaggi(nuoviMsg)
        setInput('')
        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lex-mandato`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ mandato_id: mandatoId, domanda: q, messaggi: nuoviMsg.slice(0, -1) }),
            })
            const json = await res.json()
            if (!json.ok) {
                if (res.status === 402 || json.crediti_esauriti) {
                    throw new Error('Crediti Lex esauriti. Acquista un pacchetto crediti dalla sezione Acquista per continuare.')
                }
                throw new Error(json.error ?? 'Risposta non disponibile')
            }
            setMessaggi(m => [...m, { role: 'assistant', content: json.risposta }])
        } catch (e) {
            setErrore(e.message)
        } finally {
            setLoading(false)
        }
    }

    async function salvaInRicerche(idx) {
        const msg = messaggi[idx]
        if (!msg || msg.role !== 'assistant') return
        setSalvandoIdx(idx)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            // La domanda è il messaggio utente immediatamente precedente
            const domanda = messaggi[idx - 1]?.content ?? 'Chat Lex'
            await supabase.from('ricerche').insert({
                mandato_id: mandatoId,
                user_id: user.id,
                autore_id: user.id,
                tipo: 'chat_lex',
                titolo: domanda.slice(0, 80),
                contenuto: msg.content,
                metadati: { ts: new Date().toISOString() },
            })
            setMessaggi(m => m.map((x, i) => i === idx ? { ...x, salvata: true } : x))
            onRicercaSalvata?.()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvandoIdx(null)
        }
    }

    return (
        <div className="bg-slate border border-white/5 flex flex-col">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5">
                <Sparkles size={15} className="text-oro" />
                <h2 className="font-display text-lg text-nebbia">Assistente Lex del mandato</h2>
                <span className="font-body text-[10px] px-2 py-0.5 bg-petrolio border border-white/10 text-nebbia/40 uppercase tracking-wider">AI</span>
            </div>

            {/* Conversazione */}
            <div className="px-6 py-4 space-y-4 max-h-[420px] overflow-y-auto">
                {messaggi.length === 0 ? (
                    <div className="py-4">
                        <p className="font-body text-sm text-nebbia/40 mb-3">Chiedi all'assistente qualcosa su questo mandato. Conosce cliente, scadenze, conto economico e personale.</p>
                        <div className="flex flex-wrap gap-2">
                            {SUGGERIMENTI.map((s, i) => (
                                <button key={i} onClick={() => invia(s)}
                                    className="text-left font-body text-xs text-nebbia/60 border border-white/10 px-3 py-1.5 hover:border-oro/30 hover:text-oro transition-colors">
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : messaggi.map((m, i) => (
                    m.role === 'user' ? (
                        <div key={i} className="flex justify-end">
                            <div className="bg-oro/10 border border-oro/20 px-3 py-2 max-w-[80%]">
                                <p className="font-body text-sm text-nebbia">{m.content}</p>
                            </div>
                        </div>
                    ) : (
                        <div key={i} className="flex flex-col gap-1.5">
                            <div className="bg-petrolio/50 border border-white/5 px-4 py-3">
                                <ReactMarkdown components={MD}>{m.content}</ReactMarkdown>
                            </div>
                            <button onClick={() => salvaInRicerche(i)} disabled={m.salvata || salvandoIdx === i}
                                className="self-start flex items-center gap-1.5 font-body text-[11px] text-nebbia/40 hover:text-oro transition-colors disabled:opacity-60">
                                {salvandoIdx === i ? <Loader2 size={11} className="animate-spin" />
                                    : m.salvata ? <><Check size={11} className="text-salvia" /> Salvata nelle ricerche</>
                                        : <><Save size={11} /> Salva nelle ricerche</>}
                            </button>
                        </div>
                    )
                ))}
                {loading && (
                    <div className="flex items-center gap-2 text-nebbia/40 font-body text-sm"><Loader2 size={14} className="animate-spin text-oro" /> L'assistente sta elaborando…</div>
                )}
                {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-2 bg-red-900/10 border border-red-500/20"><AlertCircle size={13} /> {errore}</div>}
                <div ref={fondoRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-white/5 flex items-center gap-2">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); invia() } }}
                    placeholder="Scrivi una domanda sul mandato…"
                    disabled={loading}
                    className="flex-1 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25 disabled:opacity-50"
                />
                <button onClick={() => invia()} disabled={loading || !input.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
            </div>
        </div>
    )
}
