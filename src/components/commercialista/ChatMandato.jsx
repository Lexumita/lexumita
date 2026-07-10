// src/components/commercialista/ChatMandato.jsx
//
// Assistente AI sul mandato: chat contestuale + generazione documenti fiscali.
// - Chat: chiama lex-mandato (JSON), che conosce cliente, scadenze, conto
//   economico e personale del mandato.
// - Genera documento: selezionato un tipo (parere fiscale, rendiconto, ...),
//   lex-mandato delega a lex-genera-documento e lo stream SSE arriva qui
//   (eventi stato/chunk/done, stesso pattern di ChatPratica).
// Le risposte e i documenti si possono salvare tra le Ricerche del mandato.
//
// Props:
//   mandatoId  (string)
//   onRicercaSalvata()  - notifica al box ricerche (refresh)

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2, Save, AlertCircle, Check, FileText, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'

const SUGGERIMENTI = [
    'Quali scadenze fiscali ho aperte su questo mandato?',
    'Come sta andando il conto economico dell\'anno?',
    'Stima il costo annuo del personale di questo cliente',
    'Quali adempimenti IVA mi aspettano nel prossimo trimestre?',
]

// Tipi documento fiscali (allineati a lex-genera-documento, categoria 'fiscale')
const TIPI_DOCUMENTO = [
    { codice: 'parere_fiscale', nome: 'Parere fiscale' },
    { codice: 'rendiconto_contabile', nome: 'Rendiconto contabile' },
    { codice: 'lettera_cliente', nome: 'Lettera al cliente' },
    { codice: 'comunicazione_scadenze', nome: 'Comunicazione scadenze' },
    { codice: 'relazione_bilancio', nome: 'Relazione situazione contabile' },
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
}

export default function ChatMandato({ mandatoId, onRicercaSalvata }) {
    const [messaggi, setMessaggi] = useState([])   // { role, content, salvata?, documento?, tipo_nome? }
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [errore, setErrore] = useState('')
    const [salvandoIdx, setSalvandoIdx] = useState(null)
    const [tipoDocSel, setTipoDocSel] = useState('')          // codice tipo documento | ''
    const [statoGenerazione, setStatoGenerazione] = useState('')
    const [chunkLive, setChunkLive] = useState('')
    const fondoRef = useRef(null)

    useEffect(() => { fondoRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messaggi, loading, chunkLive])

    async function invia(domanda) {
        if (tipoDocSel) { generaDocumento(); return }
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

    // ─── Generazione documento: SSE (stato/chunk/done/error) ───
    async function generaDocumento() {
        if (loading) return
        const tipo = TIPI_DOCUMENTO.find(t => t.codice === tipoDocSel)
        if (!tipo) return
        const istruzione = input.trim()
        setErrore('')
        setMessaggi(m => [...m, { role: 'user', content: `Genera: ${tipo.nome}${istruzione ? ` — ${istruzione}` : ''}` }])
        setInput('')
        setLoading(true)
        setStatoGenerazione('Avvio la generazione…')
        setChunkLive('')
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lex-mandato`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ mandato_id: mandatoId, domanda: istruzione, tipo_documento: tipoDocSel }),
            })

            if (!res.ok) {
                const json = await res.json().catch(() => ({}))
                if (res.status === 402 || json.crediti_esauriti) {
                    throw new Error('Crediti Lex esauriti. Acquista un pacchetto crediti dalla sezione Acquista per continuare.')
                }
                throw new Error(json.error ?? `Errore del generatore (${res.status})`)
            }

            // Reader SSE (stesso pattern di ChatPratica)
            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let eventName = ''
            let documentoFinale = null
            let tipoNomeFinale = tipo.nome
            let accumulo = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const righe = buffer.split('\n')
                buffer = righe.pop() ?? ''
                for (const riga of righe) {
                    if (riga.startsWith('event:')) { eventName = riga.slice(6).trim(); continue }
                    if (!riga.startsWith('data:')) continue
                    let data
                    try { data = JSON.parse(riga.slice(5).trim()) } catch { continue }
                    if (eventName === 'stato' && data.messaggio) setStatoGenerazione(data.messaggio)
                    else if (eventName === 'chunk' && data.text) { accumulo += data.text; setChunkLive(accumulo) }
                    else if (eventName === 'done') {
                        documentoFinale = data.documento_markdown ?? accumulo
                        tipoNomeFinale = data.tipo_nome ?? tipo.nome
                    }
                    else if (eventName === 'error') throw new Error(data.error ?? 'Errore nella generazione')
                }
            }

            if (!documentoFinale) throw new Error('Generazione interrotta: nessun documento ricevuto.')
            setMessaggi(m => [...m, { role: 'assistant', content: documentoFinale, documento: true, tipo_nome: tipoNomeFinale }])
            setTipoDocSel('')
        } catch (e) {
            setErrore(e.message)
        } finally {
            setLoading(false)
            setStatoGenerazione('')
            setChunkLive('')
        }
    }

    async function salvaInRicerche(idx) {
        const msg = messaggi[idx]
        if (!msg || msg.role !== 'assistant') return
        setSalvandoIdx(idx)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const titolo = msg.documento
                ? (msg.tipo_nome ?? 'Documento generato')
                : (messaggi[idx - 1]?.content ?? 'Chat Lex')
            await supabase.from('ricerche').insert({
                mandato_id: mandatoId,
                user_id: user.id,
                autore_id: user.id,
                tipo: 'chat_lex',
                titolo: titolo.slice(0, 80),
                contenuto: msg.content,
                metadati: { ts: new Date().toISOString(), documento: !!msg.documento },
            })
            setMessaggi(m => m.map((x, i) => i === idx ? { ...x, salvata: true } : x))
            onRicercaSalvata?.()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvandoIdx(null)
        }
    }

    const tipoSelezionato = TIPI_DOCUMENTO.find(t => t.codice === tipoDocSel)

    return (
        <div className="bg-slate border border-white/5 flex flex-col">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5">
                <Sparkles size={15} className="text-oro" />
                <h2 className="font-display text-lg text-nebbia">Assistente Lex del mandato</h2>
                <span className="font-body text-[10px] px-2 py-0.5 bg-petrolio border border-white/10 text-nebbia/40 uppercase tracking-wider">AI</span>
            </div>

            {/* Conversazione */}
            <div className="px-6 py-4 space-y-4 max-h-[460px] overflow-y-auto">
                {messaggi.length === 0 && !loading ? (
                    <div className="py-4">
                        <p className="font-body text-sm text-nebbia/40 mb-3">Chiedi qualcosa sul mandato, oppure genera un documento fiscale (parere, rendiconto, lettera al cliente…).</p>
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
                            {m.documento && (
                                <div className="flex items-center gap-1.5 font-body text-[11px] text-oro/70">
                                    <FileText size={12} /> {m.tipo_nome ?? 'Documento generato'}
                                </div>
                            )}
                            <div className={`px-4 py-3 border ${m.documento ? 'bg-petrolio/70 border-oro/20' : 'bg-petrolio/50 border-white/5'}`}>
                                <ReactMarkdown components={MD}>{m.content}</ReactMarkdown>
                            </div>
                            <button onClick={() => salvaInRicerche(i)} disabled={m.salvata || salvandoIdx === i}
                                className="self-start flex items-center gap-1.5 font-body text-[11px] text-nebbia/40 hover:text-oro transition-colors disabled:opacity-60">
                                {salvandoIdx === i ? <Loader2 size={11} className="animate-spin" />
                                    : m.salvata ? <><Check size={11} className="text-salvia" /> Salvato nelle ricerche</>
                                        : <><Save size={11} /> Salva nelle ricerche</>}
                            </button>
                        </div>
                    )
                ))}
                {loading && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-nebbia/40 font-body text-sm">
                            <Loader2 size={14} className="animate-spin text-oro" /> {statoGenerazione || "L'assistente sta elaborando…"}
                        </div>
                        {chunkLive && (
                            <div className="bg-petrolio/40 border border-white/5 px-4 py-3 max-h-48 overflow-y-auto">
                                <p className="font-body text-xs text-nebbia/50 whitespace-pre-wrap">{chunkLive.slice(-1500)}</p>
                            </div>
                        )}
                    </div>
                )}
                {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-2 bg-red-900/10 border border-red-500/20"><AlertCircle size={13} /> {errore}</div>}
                <div ref={fondoRef} />
            </div>

            {/* Barra genera documento + input */}
            <div className="px-6 py-4 border-t border-white/5 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Genera documento</span>
                    {TIPI_DOCUMENTO.map(t => (
                        <button key={t.codice}
                            onClick={() => setTipoDocSel(v => v === t.codice ? '' : t.codice)}
                            disabled={loading}
                            className={`font-body text-[11px] px-2.5 py-1 border transition-colors disabled:opacity-40 ${tipoDocSel === t.codice ? 'bg-oro/15 border-oro/40 text-oro' : 'border-white/10 text-nebbia/50 hover:border-oro/25 hover:text-nebbia/80'}`}>
                            {t.nome}
                        </button>
                    ))}
                    {tipoSelezionato && (
                        <button onClick={() => setTipoDocSel('')} disabled={loading} className="text-nebbia/30 hover:text-red-400 transition-colors" title="Annulla selezione">
                            <X size={13} />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); invia() } }}
                        placeholder={tipoSelezionato ? `Istruzioni per: ${tipoSelezionato.nome} (opzionale)…` : 'Scrivi una domanda sul mandato…'}
                        disabled={loading}
                        className="flex-1 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25 disabled:opacity-50"
                    />
                    <button onClick={() => invia()} disabled={loading || (!input.trim() && !tipoSelezionato)}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : tipoSelezionato ? <><FileText size={14} /> Genera</> : <Send size={14} />}
                    </button>
                </div>
            </div>
        </div>
    )
}
