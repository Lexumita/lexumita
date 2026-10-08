// src/components/commercialista/ChatMandato.jsx
//
// Lex del commercialista sul mandato.
// 08-10-2026: la chat passa dal Lead come la pratica dell'avvocato (lex-mandato → lex-lead con i dati
// del mandato): le risposte cercano nelle fonti quando serve (norme, prassi dell'Agenzia delle Entrate,
// giurisprudenza) e i documenti li scrive lo stesso Lex della Banca Dati, in qualsiasi forma, non più i
// 5 modelli fissi. Il documento si apre nel foglio (DocumentoLex): Scarica Word e PDF, Copia, carta
// intestata e «Compila con i dati di questo mandato». Le risposte e i documenti si possono salvare tra
// le Ricerche del mandato.
//
// Stream SSE di lex-mandato (risposta del Lead):
//   event: fase  -> { fase, descrizione }   («Scrittura del documento» quando scrive un documento)
//   event: chunk -> { text }
//   event: done  -> { crediti_rimasti, tipo_risposta, meta: { documento: { tipo } | null } }
//   event: error -> { error }
//
// Props:
//   mandatoId (string), titoloMandato (string)
//   onRicercaSalvata() - notifica al box ricerche (refresh)

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2, Save, AlertCircle, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { sanitizzaErrore } from '@/lib/sanitizzaErrore'
import ReactMarkdown from 'react-markdown'
import DocumentoLex from '@/components/DocumentoLex'

const SUGGERIMENTI = [
    'Quali scadenze fiscali ho aperte su questo mandato?',
    'Come sta andando il conto economico dell\'anno?',
    'Stima il costo annuo del personale di questo cliente',
    'Quali adempimenti IVA mi aspettano nel prossimo trimestre?',
]

// Esempi di documenti: riempiono la casella, poi si completa la richiesta. Lex scrive qualsiasi documento.
const ESEMPI_DOCUMENTI = [
    { nome: 'Lettera al cliente', testo: 'Scrivi una lettera al cliente con le scadenze fiscali del prossimo mese' },
    { nome: 'Parere fiscale', testo: 'Prepara un parere fiscale su ' },
    { nome: 'Relazione contabile', testo: 'Scrivi una relazione sulla situazione contabile del mandato per il cliente' },
    { nome: 'Risposta all\'Agenzia', testo: 'Scrivi la risposta alla comunicazione dell\'Agenzia delle Entrate che ' },
]

const MD = {
    h1: ({ children }) => <h1 className="font-body text-base font-semibold text-nebbia mt-3 mb-1.5">{children}</h1>,
    h2: ({ children }) => <h2 className="font-body text-sm font-semibold text-nebbia mt-3 mb-1">{children}</h2>,
    h3: ({ children }) => <h3 className="font-body text-xs font-semibold text-nebbia/80 mt-2 mb-0.5">{children}</h3>,
    strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
    ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
    li: ({ children }) => <li className="font-body text-sm text-nebbia/70">{children}</li>,
    p: ({ children }) => <p className="font-body text-sm text-nebbia/70 leading-relaxed mb-1.5">{children}</p>,
    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-oro/80 hover:text-oro underline">{children}</a>,
}

export default function ChatMandato({ mandatoId, titoloMandato, onRicercaSalvata }) {
    const [messaggi, setMessaggi] = useState([])   // { role, content, tipo?: 'documento_lex', tipo_nome?, salvata? }
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [errore, setErrore] = useState('')
    const [salvandoIdx, setSalvandoIdx] = useState(null)
    const [fase, setFase] = useState('')
    const [testoLive, setTestoLive] = useState('')
    const fondoRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => { fondoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messaggi, loading])

    async function invia(domanda) {
        const q = (domanda ?? input).trim()
        if (!q || loading) return
        setErrore('')
        const precedenti = messaggi
        setMessaggi([...precedenti, { role: 'user', content: q }])
        setInput('')
        setLoading(true)
        setFase('')
        setTestoLive('')
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Sessione scaduta. Ricarica la pagina.')
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lex-mandato`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                // Anche i documenti già scritti vanno nella storia: così si possono chiedere modifiche
                body: JSON.stringify({ mandato_id: mandatoId, domanda: q, messaggi: precedenti.map(m => ({ role: m.role, content: m.content })) }),
            })
            if (!res.ok) {
                const json = await res.json().catch(() => ({}))
                if (res.status === 402 || json.crediti_esauriti) {
                    throw new Error('Crediti Lex esauriti. Acquista un pacchetto crediti dalla sezione Acquista per continuare.')
                }
                throw new Error(sanitizzaErrore(json.error) ?? 'Risposta non disponibile')
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let evento = null
            let testo = ''
            let documento = null
            let erroreStream = null
            while (true) {
                const { value, done } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const righe = buffer.split('\n')
                buffer = righe.pop() ?? ''
                for (const riga of righe) {
                    if (riga.startsWith('event:')) { evento = riga.slice(6).trim(); continue }
                    if (!riga.startsWith('data:')) continue
                    let dati
                    try { dati = JSON.parse(riga.slice(5).trim()) } catch { continue }
                    if (evento === 'fase' && dati.descrizione) setFase(dati.descrizione)
                    else if (evento === 'chunk') { testo += dati.text ?? ''; setTestoLive(testo) }
                    else if (evento === 'done' && dati.meta?.documento) documento = dati.meta.documento
                    else if (evento === 'error') erroreStream = sanitizzaErrore(dati.error) ?? 'La risposta si è interrotta. Riprova tra qualche istante.'
                }
            }
            if (!testo.trim()) {
                setMessaggi(precedenti)
                throw new Error(erroreStream ?? 'La risposta non è stata generata. Riprova tra qualche istante.')
            }
            setMessaggi([...precedenti, { role: 'user', content: q }, documento
                ? { role: 'assistant', tipo: 'documento_lex', content: testo, tipo_nome: documento.tipo ?? 'documento' }
                : { role: 'assistant', content: testo }])
            if (erroreStream) setErrore(erroreStream)
        } catch (e) {
            setErrore(sanitizzaErrore(e) ?? 'Si è verificato un errore temporaneo. Riprova tra qualche istante.')
        } finally {
            setLoading(false)
            setFase('')
            setTestoLive('')
        }
    }

    async function salvaInRicerche(idx) {
        const msg = messaggi[idx]
        if (!msg || msg.role !== 'assistant') return
        setSalvandoIdx(idx)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const documento = msg.tipo === 'documento_lex'
            const titolo = documento
                ? (msg.tipo_nome ? msg.tipo_nome.charAt(0).toUpperCase() + msg.tipo_nome.slice(1) : 'Documento')
                : (messaggi[idx - 1]?.content ?? 'Chat Lex')
            const { error } = await supabase.from('ricerche').insert({
                mandato_id: mandatoId,
                user_id: user.id,
                autore_id: user.id,
                tipo: 'chat_lex',
                titolo: titolo.slice(0, 80),
                contenuto: msg.content,
                metadati: { ts: new Date().toISOString(), documento },
            })
            if (error) throw new Error(error.message)
            setMessaggi(m => m.map((x, i) => i === idx ? { ...x, salvata: true } : x))
            onRicercaSalvata?.()
        } catch (e) {
            setErrore(sanitizzaErrore(e) ?? 'Si è verificato un errore temporaneo. Riprova tra qualche istante.')
        } finally {
            setSalvandoIdx(null)
        }
    }

    function usaEsempio(testo) {
        setInput(testo)
        inputRef.current?.focus()
    }

    const scriveDocumento = fase === 'Scrittura del documento'

    return (
        <div className="bg-slate border border-white/5 flex flex-col">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5">
                <Sparkles size={15} className="text-oro" />
                <h2 className="font-display text-lg text-nebbia">Assistente Lex del mandato</h2>
                <span className="font-body text-[10px] px-2 py-0.5 bg-petrolio border border-white/10 text-nebbia/40 uppercase tracking-wider">AI</span>
            </div>

            {/* Conversazione */}
            <div className="px-6 py-4 space-y-4 max-h-[720px] overflow-y-auto">
                {messaggi.length === 0 && !loading ? (
                    <div className="py-4 space-y-4">
                        <p className="font-body text-sm text-nebbia/40">
                            Chiedi qualcosa sul mandato: Lex conosce cliente, regime, scadenze, conti, personale e documenti
                            dell&apos;archivio, e quando serve cerca nelle norme e nella prassi. Può anche scrivere lettere,
                            pareri, relazioni e qualsiasi altro documento con i dati del mandato.
                        </p>
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
                                <p className="font-body text-sm text-nebbia whitespace-pre-wrap">{m.content}</p>
                            </div>
                        </div>
                    ) : (
                        <div key={i} className="flex flex-col gap-1.5">
                            {m.tipo === 'documento_lex' ? (
                                <div>
                                    <DocumentoLex markdown={m.content} tipo={m.tipo_nome} corrente={{ id: mandatoId, titolo: titoloMandato }} />
                                    {/* Trasparenza AI — art. 50 AI Act / art. 13 L. 132/2025 */}
                                    <p className="mt-3 font-body text-[11px] text-nebbia/35 leading-relaxed">
                                        Documento scritto con intelligenza artificiale. Lex può commettere errori:
                                        rileggilo e verifica dati e fonti prima di firmarlo.
                                    </p>
                                </div>
                            ) : (
                                <div className="px-4 py-3 border bg-petrolio/50 border-white/5">
                                    <ReactMarkdown components={MD}>{m.content}</ReactMarkdown>
                                    {/* Trasparenza AI — art. 50 AI Act / art. 13 L. 132/2025 */}
                                    <p className="mt-4 pt-3 border-t border-white/5 font-body text-[11px] text-nebbia/35 leading-relaxed">
                                        Contenuto generato con intelligenza artificiale. Lex può commettere errori:
                                        verifica sempre le fonti citate prima dell&apos;uso professionale.
                                    </p>
                                </div>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                                <button onClick={() => salvaInRicerche(i)} disabled={m.salvata || salvandoIdx === i}
                                    className="flex items-center gap-1.5 font-body text-[11px] text-nebbia/40 hover:text-oro transition-colors disabled:opacity-60">
                                    {salvandoIdx === i ? <Loader2 size={11} className="animate-spin" />
                                        : m.salvata ? <><Check size={11} className="text-salvia" /> Salvato nelle ricerche</>
                                            : <><Save size={11} /> Salva nelle ricerche</>}
                                </button>
                            </div>
                        </div>
                    )
                ))}
                {loading && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-nebbia/40 font-body text-sm">
                            <Loader2 size={14} className="animate-spin text-oro" />
                            {scriveDocumento ? 'Lex sta scrivendo il documento…' : fase || "L'assistente sta elaborando…"}
                        </div>
                        {testoLive && (
                            <div className={`px-4 py-3 border max-h-[420px] overflow-y-auto ${scriveDocumento ? 'bg-white text-neutral-900 border-neutral-300' : 'bg-petrolio/40 border-white/5'}`}>
                                {scriveDocumento
                                    ? <div className="font-display text-sm leading-relaxed whitespace-pre-wrap">{testoLive}</div>
                                    : <ReactMarkdown components={MD}>{testoLive}</ReactMarkdown>}
                            </div>
                        )}
                    </div>
                )}
                {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-2 bg-red-900/10 border border-red-500/20"><AlertCircle size={13} /> {errore}</div>}
                <div ref={fondoRef} />
            </div>

            {/* Esempi di documenti + input */}
            <div className="px-6 py-4 border-t border-white/5 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Scrivi un documento</span>
                    {ESEMPI_DOCUMENTI.map(e => (
                        <button key={e.nome} onClick={() => usaEsempio(e.testo)} disabled={loading}
                            className="font-body text-[11px] px-2.5 py-1 border border-white/10 text-nebbia/50 hover:border-oro/25 hover:text-nebbia/80 transition-colors disabled:opacity-40">
                            {e.nome}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); invia() } }}
                        placeholder="Scrivi una domanda sul mandato o chiedi un documento…"
                        disabled={loading}
                        className="flex-1 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25 disabled:opacity-50"
                    />
                    <button onClick={() => invia()} disabled={loading || !input.trim()}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                </div>
                <p className="font-body text-[11px] text-nebbia/35">Ogni risposta e ogni documento consumano 1 credito.</p>
            </div>
        </div>
    )
}
