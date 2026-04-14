// src/pages/avvocato/Normativa.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared'
import {
    Search, Sparkles, ChevronRight, ChevronLeft,
    BookOpen, AlertCircle, ArrowRight, X, Save,
    FileText, Plus, Eye
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

// ─── HOOK CREDITI AI ──────────────────────────────────────────
function useCreditiAI() {
    const [crediti, setCrediti] = useState(null)
    useEffect(() => {
        async function carica() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from('crediti_ai')
                .select('crediti_totali, crediti_usati')
                .eq('user_id', user.id)
                .gte('periodo_fine', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1).maybeSingle()
            if (data) setCrediti(data.crediti_totali - data.crediti_usati)
        }
        carica()
    }, [])
    return { crediti, setCrediti }
}

function RicercaAI({ codice, onRisultato, crediti, setCrediti, messaggi, onAggiornaMessaggi, praticaAttiva, onRicercaSalvata }) {
    const [domanda, setDomanda] = useState('')
    const [cercando, setCercando] = useState(false)
    const [errore, setErrore] = useState(null)
    const [conversazione, setConversazione] = useState([])
    const bottomRef = useRef(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [conversazione, cercando])

    async function cerca() {
        if (!domanda.trim()) return
        if (crediti !== null && crediti <= 0) { setErrore('Crediti Lex esauriti.'); return }

        const domandaCorrente = domanda
        setDomanda('')
        setCercando(true)
        setErrore(null)

        // Aggiungi messaggio utente subito
        const nuovaConv = [...conversazione, { role: 'user', content: domandaCorrente }]
        setConversazione(nuovaConv)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-norme`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        domanda: domandaCorrente,
                        codice,
                        messaggi: messaggi ?? [],
                    }),
                }
            )
            const json = await res.json()
            if (json.ok) {
                if (json.crediti_rimasti !== undefined) setCrediti(json.crediti_rimasti)

                // Aggiungi risposta Lex
                const convAggiornata = [...nuovaConv, { role: 'assistant', content: json.risposta, sentenzeLista: json.sentenze ?? [] }]
                setConversazione(convAggiornata)

                // Aggiorna storico per continuare conversazione
                const nuoviMessaggi = [
                    ...(messaggi ?? []),
                    { role: 'user', content: domandaCorrente },
                    { role: 'assistant', content: json.risposta },
                ]
                if (onAggiornaMessaggi) onAggiornaMessaggi(nuoviMessaggi)
                if (onRisultato) onRisultato({ tipo: 'ricerca_ai', domanda: domandaCorrente, risposta: json.risposta, sentenze: json.sentenze_trovate, sentenzeLista: json.sentenze ?? [], codice, ts: new Date() })

            } else if (json.crediti_esauriti) {
                setErrore('crediti_esauriti')
                setConversazione(conversazione) // ripristina senza il messaggio utente
            } else {
                setErrore(json.error ?? 'Errore nella ricerca')
                setConversazione(conversazione)
            }
        } catch (e) {
            setErrore(e.message)
            setConversazione(conversazione)
        } finally {
            setCercando(false)
        }
    }

    function nuovaSessione() {
        setConversazione([])
        if (onAggiornaMessaggi) onAggiornaMessaggi([])
    }

    return (
        <div className="bg-slate border border-white/5">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-salvia" />
                    <p className="font-body text-sm font-medium text-nebbia">Lex — AI Assistant</p>
                    {conversazione.length > 0 && (
                        <span className="font-body text-xs text-salvia/60 border border-salvia/20 px-2 py-0.5">
                            {Math.floor(conversazione.length / 2)} scambi
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {crediti !== null && <span className="font-body text-xs text-nebbia/30">{crediti} crediti</span>}
                    {conversazione.length > 0 && (
                        <button onClick={nuovaSessione} className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors">
                            Nuova sessione
                        </button>
                    )}
                </div>
            </div>

            {/* Conversazione */}
            {conversazione.length > 0 && (
                <div className="px-5 py-4 space-y-4">
                    {conversazione.map((m, i) => (
                        <div key={i} className={`space-y-2 ${m.role === 'user' ? '' : ''}`}>
                            <div className="flex items-center gap-2">
                                <span className={`font-body text-xs font-medium ${m.role === 'user' ? 'text-oro/70' : 'text-salvia/70'}`}>
                                    {m.role === 'user' ? 'Tu' : 'Lex'}
                                </span>
                            </div>
                            {m.role === 'user' ? (
                                <p className="font-body text-sm text-nebbia/60 leading-relaxed">{m.content}</p>
                            ) : (
                                <div className="font-body text-sm text-nebbia/80 leading-relaxed space-y-2">
                                    <ReactMarkdown
                                        components={{
                                            h2: ({ children }) => <h2 className="font-display text-base font-semibold text-nebbia mt-4 mb-2">{children}</h2>,
                                            h3: ({ children }) => <h3 className="font-body text-sm font-semibold text-nebbia/80 mt-3 mb-1">{children}</h3>,
                                            strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
                                            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-nebbia/70">{children}</ul>,
                                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-nebbia/70">{children}</ol>,
                                            li: ({ children }) => <li className="font-body text-sm">{children}</li>,
                                            p: ({ children }) => <p className="font-body text-sm text-nebbia/80 leading-relaxed">{children}</p>,
                                        }}
                                    >
                                        {m.content}
                                    </ReactMarkdown>
                                </div>
                            )}

                            {/* Sentenze correlate sotto la risposta Lex */}
                            {m.role === 'assistant' && m.sentenzeLista?.length > 0 && (
                                <div className="border-t border-white/5 pt-3 space-y-2">
                                    <p className="font-body text-xs font-medium text-oro flex items-center gap-2">
                                        <BookOpen size={12} /> Sentenze correlate in Lexum
                                    </p>
                                    {m.sentenzeLista.map(s => (
                                        <div key={s.id} className="bg-petrolio border border-oro/10 p-3 flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-body text-xs font-medium text-nebbia/80 truncate">{s.titolo}</p>
                                                <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                                    {s.tribunale} · {s.anno}
                                                    {s.categoria && <span> · {s.categoria}{s.sotto_categoria ? ` › ${s.sotto_categoria}` : ''}</span>}
                                                </p>
                                                {s.descrizione && (
                                                    <p className="font-body text-xs text-nebbia/40 mt-1 line-clamp-2">{s.descrizione}</p>
                                                )}
                                            </div>
                                            <a
                                                href={`/banca-dati/${s.id}`}
                                                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors"
                                            >
                                                <Eye size={11} /> Vedi
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Spinner mentre Lex risponde */}
                    {cercando && (
                        <div className="flex items-center gap-3">
                            <span className="font-body text-xs font-medium text-salvia/70">Lex</span>
                            <span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" />
                            <span className="font-body text-xs text-nebbia/40">sta analizzando...</span>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            )}

            {/* Salva conversazione */}
            {conversazione.length >= 2 && (
                <div className="px-5 pb-3">
                    <SalvaInPratica
                        ricerca={{
                            tipo: 'ricerca_ai',
                            domanda: conversazione[0]?.content ?? '',
                            risposta: conversazione
                                .filter(m => m.role === 'assistant')
                                .map(m => m.content)
                                .join('\n\n---\n\n'),
                            sentenze: conversazione.some(m => m.sentenzeLista?.length > 0),
                            codice
                        }}
                        praticaAttiva={praticaAttiva}
                        onRicercaSalvata={onRicercaSalvata}
                    />
                </div>
            )}

            {/* Input */}
            <div className="px-5 py-4 space-y-3 border-t border-white/5">
                {conversazione.length === 0 && (
                    <p className="font-body text-xs text-nebbia/30">
                        {codice ? `Descrivi il caso o la norma che cerchi in questo codice...` : `Descrivi il caso legale — Lex cercherà in tutti i codici...`}
                    </p>
                )}
                <textarea
                    rows={3}
                    placeholder={conversazione.length > 0 ? 'Approfondisci o fai una nuova domanda...' : 'Es. Il mio cliente è accusato di omicidio colposo...'}
                    value={domanda}
                    onChange={e => setDomanda(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) cerca() }}
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 resize-none placeholder:text-nebbia/25"
                />
                {errore && errore !== 'crediti_esauriti' && (
                    <p className="font-body text-xs text-red-400 flex items-center gap-1.5">
                        <AlertCircle size={11} />{errore}
                    </p>
                )}
                {errore === 'crediti_esauriti' && (
                    <div className="flex items-center justify-between gap-3 p-3 bg-oro/5 border border-oro/20">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={13} className="text-oro shrink-0" />
                            <p className="font-body text-xs text-nebbia/60">Crediti Lex esauriti.</p>
                        </div>
                        <a
                            href="/studio?tab=acquista"
                            className="font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors whitespace-nowrap"
                        >
                            Acquista crediti →
                        </a>
                    </div>
                )}
                <button
                    onClick={cerca}
                    disabled={cercando || !domanda.trim()}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40"
                >
                    {cercando
                        ? <><span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" /> Lex sta analizzando...</>
                        : <><Sparkles size={13} /> {conversazione.length > 0 ? 'Continua conversazione' : 'Cerca con Lex'}</>
                    }
                </button>
            </div>
        </div>
    )
}

function SalvaInPratica({ ricerca, praticaAttiva, onRicercaSalvata }) {
    const [salvando, setSalvando] = useState(false)
    const [salvato, setSalvato] = useState(false)
    const [errore, setErrore] = useState(null)

    async function salva() {
        if (!praticaAttiva) return
        setSalvando(true); setErrore(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('note_interne').insert({
                pratica_id: praticaAttiva.id,
                autore_id: user.id,
                tipo: ricerca.tipo,
                testo: ricerca.tipo === 'ricerca_ai' ? ricerca.risposta : ricerca.testo,
                metadati: {
                    domanda: ricerca.domanda,
                    sentenze: ricerca.sentenze ?? false,
                    codice: ricerca.codice ?? null,
                    ts: new Date().toISOString(),
                }
            })
            setSalvato(true)
            if (onRicercaSalvata) onRicercaSalvata()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(false)
        }
    }

    if (salvato) return (
        <p className="font-body text-xs text-salvia flex items-center gap-1.5 mt-2">
            <Sparkles size={10} /> Salvato in "{praticaAttiva?.titolo}"
        </p>
    )

    return (
        <div className="mt-2 space-y-1">
            <button
                onClick={salva}
                disabled={salvando || !praticaAttiva}
                className="flex items-center gap-2 px-4 py-2 border font-body text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed
          bg-oro/10 border-oro/30 text-oro hover:bg-oro/20"
            >
                {salvando
                    ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                    : <Save size={13} />
                }
                {praticaAttiva
                    ? `Salva in "${praticaAttiva.titolo}"`
                    : 'Seleziona una pratica per salvare'
                }
            </button>
            {errore && <p className="font-body text-xs text-red-400">{errore}</p>}
        </div>
    )
}

function RicercaEspandibile({ testo }) {
    const [espansa, setEspansa] = useState(false)
    return (
        <div className="ml-4 mt-1">
            <p className={`font-body text-xs text-nebbia/40 leading-relaxed whitespace-pre-line ${espansa ? '' : 'line-clamp-2'}`}>
                {testo}
            </p>
            <button
                onClick={() => setEspansa(!espansa)}
                className="font-body text-xs text-nebbia/25 hover:text-nebbia/50 transition-colors mt-1"
            >
                {espansa ? '▲ Riduci' : '▼ Espandi'}
            </button>
        </div>
    )
}

function PannelloPratica({ praticaAttiva, setPraticaAttiva, onRicercaSalvata, refresh }) {
    const [cerca, setCerca] = useState('')
    const [suggerite, setSuggerite] = useState([])
    const [loading, setLoading] = useState(false)
    const [dettaglio, setDettaglio] = useState(null)
    const [noteInterne, setNoteInterne] = useState([])
    const [ricerche, setRicerche] = useState([])
    const [loadingDettaglio, setLoadingDettaglio] = useState(false)

    // Form nuova ricerca manuale
    const [mostraFormRicerca, setMostraFormRicerca] = useState(false)
    const [nuovaRicerca, setNuovaRicerca] = useState({ domanda: '', testo: '' })
    const [salvandoNuova, setSalvandoNuova] = useState(false)

    // Modifica inline
    const [modificaId, setModificaId] = useState(null)
    const [modificaTesto, setModificaTesto] = useState('')
    const [salvandoModifica, setSalvandoModifica] = useState(false)

    useEffect(() => {
        if (praticaAttiva) caricaDettaglio(praticaAttiva.id)
        else { setDettaglio(null); setNoteInterne([]); setRicerche([]) }
    }, [praticaAttiva])

    useEffect(() => {
        if (praticaAttiva) caricaNote()
    }, [refresh])

    async function caricaDettaglio(praticaId) {
        setLoadingDettaglio(true)
        try {
            const { data: p } = await supabase
                .from('pratiche')
                .select('id, titolo, tipo, stato, created_at, prossima_udienza, cliente:cliente_id(nome, cognome)')
                .eq('id', praticaId).single()
            setDettaglio(p)
            await caricaNote(praticaId)
        } finally {
            setLoadingDettaglio(false)
        }
    }

    async function caricaNote(praticaId) {
        const { data } = await supabase
            .from('note_interne')
            .select('id, tipo, testo, metadati, created_at, autore:autore_id(nome, cognome)')
            .eq('pratica_id', praticaId ?? praticaAttiva?.id)
            .order('created_at', { ascending: false })
        const tutte = data ?? []
        setNoteInterne(tutte.filter(r => r.tipo === 'interna'))
        setRicerche(tutte.filter(r => r.tipo !== 'interna'))
    }

    async function cercaPratiche(q) {
        setCerca(q)
        if (!q.trim()) { setSuggerite([]); return }
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data } = await supabase
                .from('pratiche')
                .select('id, titolo, cliente:cliente_id(nome, cognome)')
                .eq('avvocato_id', user.id)
                .eq('stato', 'aperta')
                .ilike('titolo', `%${q}%`)
                .limit(8)
            setSuggerite(data ?? [])
        } finally { setLoading(false) }
    }

    async function salvaNuovaRicerca() {
        if (!nuovaRicerca.testo.trim()) return
        setSalvandoNuova(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('note_interne').insert({
                pratica_id: praticaAttiva.id,
                autore_id: user.id,
                tipo: 'ricerca_manuale',
                testo: nuovaRicerca.testo.trim(),
                metadati: { domanda: nuovaRicerca.domanda.trim() || 'Ricerca manuale', ts: new Date().toISOString() }
            })
            setNuovaRicerca({ domanda: '', testo: '' })
            setMostraFormRicerca(false)
            await caricaNote()
            if (onRicercaSalvata) onRicercaSalvata()
        } finally { setSalvandoNuova(false) }
    }

    async function salvaModifica(id) {
        if (!modificaTesto.trim()) return
        setSalvandoModifica(true)
        try {
            await supabase.from('note_interne').update({ testo: modificaTesto.trim() }).eq('id', id)
            setModificaId(null)
            await caricaNote()
        } finally { setSalvandoModifica(false) }
    }

    async function eliminaNota(id) {
        if (!confirm('Eliminare questo elemento?')) return
        await supabase.from('note_interne').delete().eq('id', id)
        await caricaNote()
    }

    function apriModifica(r) {
        setModificaId(r.id)
        setModificaTesto(r.testo ?? '')
    }

    // ── Vista selezione pratica ──
    if (!praticaAttiva) return (
        <div className="p-4 space-y-4">
            <p className="section-label mb-2">Seleziona pratica</p>
            <p className="font-body text-xs text-nebbia/40 mb-3">
                Cerca e seleziona una pratica per vedere il dettaglio e salvare le ricerche direttamente.
            </p>
            <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                <input
                    placeholder="Cerca per nome pratica..."
                    value={cerca}
                    onChange={e => cercaPratiche(e.target.value)}
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-8 pr-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                />
                {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />}
            </div>
            {suggerite.length > 0 && (
                <div className="bg-petrolio border border-white/10">
                    {suggerite.map(p => (
                        <button key={p.id}
                            onClick={() => { setPraticaAttiva(p); setCerca(''); setSuggerite([]) }}
                            className="w-full text-left px-3 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                        >
                            <p className="font-body text-sm text-nebbia">{p.titolo}</p>
                            {p.cliente && <p className="font-body text-xs text-nebbia/30 mt-0.5">{p.cliente.nome} {p.cliente.cognome}</p>}
                        </button>
                    ))}
                </div>
            )}
            {!loading && cerca && suggerite.length === 0 && (
                <p className="font-body text-xs text-nebbia/30 mt-2">Nessuna pratica trovata</p>
            )}
        </div>
    )

    if (loadingDettaglio) return (
        <div className="flex justify-center py-12">
            <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    // ── Vista dettaglio pratica ──
    return (
        <div className="flex flex-col overflow-y-auto">

            {/* Header */}
            <div className="px-4 py-4 border-b border-white/5 bg-petrolio/30 shrink-0">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="font-body text-xs text-oro uppercase tracking-widest mb-1">Pratica attiva</p>
                        <p className="font-display text-lg text-nebbia">{dettaglio?.titolo}</p>
                        {dettaglio?.cliente && (
                            <p className="font-body text-xs text-nebbia/40 mt-0.5">{dettaglio.cliente.nome} {dettaglio.cliente.cognome}</p>
                        )}
                    </div>
                    <button onClick={() => setPraticaAttiva(null)} className="text-nebbia/30 hover:text-red-400 transition-colors shrink-0 mt-1">
                        <X size={14} />
                    </button>
                </div>
                <div className="flex gap-4 mt-3 flex-wrap">
                    {dettaglio?.tipo && (
                        <div>
                            <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Tipo</p>
                            <p className="font-body text-xs text-nebbia/60">{dettaglio.tipo}</p>
                        </div>
                    )}
                    {dettaglio?.prossima_udienza && (
                        <div>
                            <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Pross. udienza</p>
                            <p className="font-body text-xs text-oro">{new Date(dettaglio.prossima_udienza).toLocaleDateString('it-IT')}</p>
                        </div>
                    )}
                    {dettaglio?.stato && (
                        <div>
                            <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Stato</p>
                            <p className="font-body text-xs text-nebbia/60">{dettaglio.stato}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Note interne */}
            <div className="px-4 py-4 border-b border-white/5">
                <p className="section-label mb-3">Note interne ({noteInterne.length})</p>
                {noteInterne.length === 0 ? (
                    <p className="font-body text-xs text-nebbia/30">Nessuna nota interna</p>
                ) : noteInterne.map(n => (
                    <div key={n.id} className="border-b border-white/5 last:border-0 py-3">
                        {modificaId === n.id ? (
                            <div className="space-y-2">
                                <textarea
                                    rows={4}
                                    value={modificaTesto}
                                    onChange={e => setModificaTesto(e.target.value)}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50 resize-none"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => salvaModifica(n.id)}
                                        disabled={salvandoModifica}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40"
                                    >
                                        {salvandoModifica ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" /> : <><Save size={10} /> Salva</>}
                                    </button>
                                    <button onClick={() => setModificaId(null)} className="px-3 py-1.5 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors">
                                        Annulla
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <RicercaEspandibile testo={n.testo} />
                                <div className="flex items-center gap-3 mt-2">
                                    {n.autore && <span className="font-body text-xs text-nebbia/25">{n.autore.nome} {n.autore.cognome}</span>}
                                    <span className="font-body text-xs text-nebbia/20">{new Date(n.created_at).toLocaleDateString('it-IT')}</span>
                                    <button onClick={() => apriModifica(n)} className="font-body text-xs text-nebbia/30 hover:text-oro transition-colors ml-auto">Modifica</button>
                                    <button onClick={() => eliminaNota(n.id)} className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors">Elimina</button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Ricerche */}
            <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="section-label">Ricerche ({ricerche.length})</p>
                    <button
                        onClick={() => setMostraFormRicerca(!mostraFormRicerca)}
                        className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors"
                    >
                        <Plus size={11} /> Aggiungi
                    </button>
                </div>

                {/* Form nuova ricerca */}
                {mostraFormRicerca && (
                    <div className="bg-petrolio border border-white/10 p-3 space-y-2 mb-4">
                        <input
                            placeholder="Titolo ricerca (opzionale)..."
                            value={nuovaRicerca.domanda}
                            onChange={e => setNuovaRicerca(p => ({ ...p, domanda: e.target.value }))}
                            className="w-full bg-slate border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                        <textarea
                            rows={3}
                            placeholder="Scrivi il tuo ragionamento legale..."
                            value={nuovaRicerca.testo}
                            onChange={e => setNuovaRicerca(p => ({ ...p, testo: e.target.value }))}
                            className="w-full bg-slate border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={salvaNuovaRicerca}
                                disabled={salvandoNuova || !nuovaRicerca.testo.trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40"
                            >
                                {salvandoNuova ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" /> : <><Save size={10} /> Salva</>}
                            </button>
                            <button
                                onClick={() => { setMostraFormRicerca(false); setNuovaRicerca({ domanda: '', testo: '' }) }}
                                className="px-3 py-1.5 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors"
                            >
                                Annulla
                            </button>
                        </div>
                    </div>
                )}

                {ricerche.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                        <Sparkles size={18} className="text-nebbia/20 mb-2" />
                        <p className="font-body text-xs text-nebbia/30">Nessuna ricerca salvata</p>
                    </div>
                ) : ricerche.map(r => (
                    <div key={r.id} className="border-b border-white/5 last:border-0 py-3">
                        <div className="flex items-center gap-2 mb-1">
                            {r.tipo === 'ricerca_ai'
                                ? <Sparkles size={10} className="text-salvia shrink-0" />
                                : <Search size={10} className="text-oro shrink-0" />
                            }
                            <p className="font-body text-xs font-medium text-nebbia/70 truncate">
                                {r.metadati?.domanda ?? '—'}
                            </p>
                        </div>

                        {modificaId === r.id ? (
                            <div className="space-y-2 ml-4 mt-2">
                                <textarea
                                    rows={4}
                                    value={modificaTesto}
                                    onChange={e => setModificaTesto(e.target.value)}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50 resize-none"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => salvaModifica(r.id)}
                                        disabled={salvandoModifica}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40"
                                    >
                                        {salvandoModifica ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" /> : <><Save size={10} /> Salva</>}
                                    </button>
                                    <button onClick={() => setModificaId(null)} className="px-3 py-1.5 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors">
                                        Annulla
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <RicercaEspandibile testo={r.testo} />
                                <div className="flex items-center gap-3 mt-2 ml-4">
                                    {r.autore && <span className="font-body text-xs text-nebbia/25">{r.autore.nome} {r.autore.cognome}</span>}
                                    <span className="font-body text-xs text-nebbia/20">{new Date(r.created_at).toLocaleDateString('it-IT')}</span>
                                    {r.tipo === 'ricerca_manuale' && (
                                        <button onClick={() => apriModifica(r)} className="font-body text-xs text-nebbia/30 hover:text-oro transition-colors ml-auto">Modifica</button>
                                    )}
                                    <button onClick={() => eliminaNota(r.id)} className={`font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors ${r.tipo !== 'ricerca_manuale' ? 'ml-auto' : ''}`}>Elimina</button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── COMPONENTE PRINCIPALE ────────────────────────────────────
export function AvvocatoNormativa() {
    const navigate = useNavigate()
    const { crediti, setCrediti } = useCreditiAI()

    const [vista, setVista] = useState('catalogo')
    const [codiceSelezionato, setCodice] = useState(null)
    const [labelSelezionato, setLabel] = useState('')

    const [codici, setCodici] = useState([])
    const [codiciLabel, setCodiciLabel] = useState({})
    const [loadingCodici, setLoadingCodici] = useState(true)

    const [pannelloAperto, setPannello] = useState(false)
    const [praticaAttiva, setPraticaAttiva] = useState(null)

    const [inputTradGlobale, setInputTradGlobale] = useState('')
    const [cercaTradGlobale, setCercaTradGlobale] = useState('')
    const [normeGlobali, setNormeGlobali] = useState([])
    const [totaleGlobale, setTotaleGlobale] = useState(0)
    const [loadingGlobale, setLoadingGlobale] = useState(false)
    const [articoloApertoGlobale, setArticoloApertoGlobale] = useState(null)

    const [norme, setNorme] = useState([])
    const [loadingNorme, setLoadingNorme] = useState(false)
    const [totaleNorme, setTotaleNorme] = useState(0)
    const [pagina, setPagina] = useState(0)
    const PER_PAGINA = 50
    const [inputTrad, setInputTrad] = useState('')
    const [cercaTrad, setCercaTrad] = useState('')
    const [tab, setTab] = useState('tradizionale')
    const [articoloAperto, setArticoloAperto] = useState(null)
    const [risultatoAI, setRisultatoAI] = useState(null)
    const [refreshPannello, setRefreshPannello] = useState(0)
    const [messaggiConversazione, setMessaggiConversazione] = useState([])

    useEffect(() => { caricaCodici() }, [])
    useEffect(() => {
        if (vista === 'codice' && codiceSelezionato) caricaNorme()
    }, [codiceSelezionato, cercaTrad, pagina])

    async function caricaCodici() {
        setLoadingCodici(true)
        try {
            const { data: labelData } = await supabase.from('codici_norme').select('codice, label')
            const mappa = {}
            for (const r of labelData ?? []) mappa[r.codice] = r.label
            setCodiciLabel(mappa)
            const { data } = await supabase.rpc('get_stats_per_codice')
            setCodici(data ?? [])
        } finally { setLoadingCodici(false) }
    }

    async function avviaRicercaGlobale() {
        if (!inputTradGlobale.trim()) return
        setCercaTradGlobale(inputTradGlobale)
        setLoadingGlobale(true)
        setArticoloApertoGlobale(null)
        try {
            const { data, count } = await supabase
                .from('norme')
                .select('id, codice, articolo, rubrica, testo', { count: 'exact' })
                .or(`articolo.ilike.%${inputTradGlobale}%,rubrica.ilike.%${inputTradGlobale}%,testo.ilike.%${inputTradGlobale}%`)
                .order('codice').order('articolo')
                .limit(50)
            setNormeGlobali(data ?? [])
            setTotaleGlobale(count ?? 0)
        } finally { setLoadingGlobale(false) }
    }

    async function caricaNorme() {
        setLoadingNorme(true)
        try {
            let q = supabase
                .from('norme')
                .select('id, articolo, rubrica, testo', { count: 'exact' })
                .eq('codice', codiceSelezionato)
                .order('articolo')
                .range(pagina * PER_PAGINA, (pagina + 1) * PER_PAGINA - 1)
            if (cercaTrad.trim()) {
                q = q.or(`articolo.ilike.%${cercaTrad}%,rubrica.ilike.%${cercaTrad}%,testo.ilike.%${cercaTrad}%`)
            }
            const { data, count } = await q
            setNorme(data ?? [])
            setTotaleNorme(count ?? 0)
        } finally { setLoadingNorme(false) }
    }

    function apriCodice(codice) {
        setCodice(codice)
        setLabel(codiciLabel[codice] ?? codice)
        setVista('codice')
        setInputTrad(''); setCercaTrad('')
        setPagina(0); setArticoloAperto(null)
        setRisultatoAI(null); setTab('tradizionale')
    }

    function tornaAlCatalogo() { setVista('catalogo'); setCodice(null) }
    function avviaRicercaTrad() { setPagina(0); setCercaTrad(inputTrad); setArticoloAperto(null) }

    function evidenziaTesto(testo, cerca) {
        if (!cerca.trim() || !testo) return ''
        const idx = testo.toLowerCase().indexOf(cerca.toLowerCase())
        if (idx === -1) return testo.slice(0, 150) + '...'
        const start = Math.max(0, idx - 80)
        const end = Math.min(testo.length, idx + cerca.length + 80)
        return (start > 0 ? '...' : '') + testo.slice(start, end) + (end < testo.length ? '...' : '')
    }

    function evidenziaParola(testo, cerca) {
        if (!cerca?.trim() || !testo) return testo
        const regex = new RegExp(`(${cerca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        return testo.replace(regex, '<mark class="bg-oro/30 text-nebbia rounded px-0.5">$1</mark>')
    }

    function onRisultato(r) {
        setRisultatoAI(r)
    }

    const pagine = Math.ceil(totaleNorme / PER_PAGINA)

    return (
        <div className="flex min-h-screen">

            {/* ── CONTENUTO PRINCIPALE ── */}
            <div className="flex-1 min-w-0 overflow-y-auto">
                <div className="space-y-5 p-6">

                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            {vista === 'codice' && (
                                <button onClick={tornaAlCatalogo} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors mb-3">
                                    <ChevronLeft size={13} /> Tutti i codici
                                </button>
                            )}
                            <PageHeader
                                label="Normativa"
                                title={vista === 'catalogo' ? 'Codici e Leggi' : labelSelezionato}
                                subtitle={vista === 'catalogo' ? 'Ricerca con Lex AI o sfoglia i codici italiani' : `${totaleNorme.toLocaleString()} articoli`}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            {crediti !== null && (
                                <div className="flex items-center gap-2 bg-slate border border-white/5 px-3 py-2">
                                    <Sparkles size={12} className="text-salvia" />
                                    <span className="font-body text-xs text-nebbia/60">{crediti} crediti Lex</span>
                                </div>
                            )}
                            <button
                                onClick={() => setPannello(!pannelloAperto)}
                                className="relative flex items-center gap-2 px-4 py-2.5 bg-slate border border-white/10 text-nebbia/60 font-body text-sm hover:text-nebbia hover:border-white/20 transition-colors"
                            >
                                <FileText size={13} />
                                <span className="hidden sm:inline">Seleziona una Pratica e allega Ricerca</span>
                                {praticaAttiva && (
                                    <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-oro rounded-full" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* ── VISTA CATALOGO ── */}
                    {vista === 'catalogo' && (
                        <div className="space-y-5">
                            <RicercaAI
                                codice={null}
                                onRisultato={onRisultato}
                                crediti={crediti}
                                setCrediti={setCrediti}
                                messaggi={messaggiConversazione}
                                onAggiornaMessaggi={setMessaggiConversazione}
                                praticaAttiva={praticaAttiva}
                                onRicercaSalvata={() => setRefreshPannello(p => p + 1)}
                            />

                            <div className="flex gap-2 !mt-12">
                                <div className="relative flex-1">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                                    <input
                                        placeholder="Cerca in tutti i codici per articolo, rubrica o testo..."
                                        value={inputTradGlobale}
                                        onChange={e => setInputTradGlobale(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') avviaRicercaGlobale() }}
                                        className="w-full bg-slate border border-oro/50 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/60 placeholder:text-nebbia/25"
                                    />
                                </div>
                                <button onClick={avviaRicercaGlobale} className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
                                    <Search size={13} /> Cerca
                                </button>
                            </div>

                            {loadingGlobale && (
                                <div className="flex items-center justify-center py-8">
                                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                                </div>
                            )}

                            {!loadingGlobale && cercaTradGlobale && normeGlobali.length === 0 && (
                                <p className="font-body text-sm text-nebbia/30 text-center py-8">Nessun risultato per "{cercaTradGlobale}"</p>
                            )}

                            {!loadingGlobale && normeGlobali.length > 0 && (
                                <div className="bg-slate border border-white/5">
                                    <div className="px-4 py-3 border-b border-white/5">
                                        <p className="font-body text-xs text-nebbia/30">{totaleGlobale} risultati per "{cercaTradGlobale}"</p>
                                    </div>
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/5">
                                                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Codice</th>
                                                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Articolo</th>
                                                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Rubrica</th>
                                                <th className="px-4 py-3 w-8" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {normeGlobali.map(n => (
                                                <>
                                                    <tr key={n.id}
                                                        className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer"
                                                        onClick={() => setArticoloApertoGlobale(articoloApertoGlobale?.id === n.id ? null : n)}
                                                    >
                                                        <td className="px-4 py-3"><span className="font-body text-xs text-nebbia/40">{codiciLabel[n.codice] ?? n.codice}</span></td>
                                                        <td className="px-4 py-3 font-body text-sm text-oro font-medium">{n.articolo}</td>
                                                        <td className="px-4 py-3 font-body text-sm text-nebbia/60 max-w-lg">
                                                            {n.rubrica && (
                                                                <p className="font-medium text-nebbia/80 mb-0.5"
                                                                    dangerouslySetInnerHTML={{ __html: evidenziaParola(n.rubrica, cercaTradGlobale) }}
                                                                />
                                                            )}
                                                            <p className="text-xs text-nebbia/40 line-clamp-2"
                                                                dangerouslySetInnerHTML={{ __html: evidenziaParola(evidenziaTesto(n.testo ?? '', cercaTradGlobale), cercaTradGlobale) }}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <ChevronRight size={13} className={`text-nebbia/20 transition-transform ${articoloApertoGlobale?.id === n.id ? 'rotate-90' : ''}`} />
                                                        </td>
                                                    </tr>
                                                    {articoloApertoGlobale?.id === n.id && (
                                                        <tr key={`${n.id}-testo`} className="border-b border-white/5 bg-petrolio/20">
                                                            <td colSpan={4} className="px-4 py-4">
                                                                <p className="font-body text-sm text-nebbia/70 whitespace-pre-line leading-relaxed"
                                                                    dangerouslySetInnerHTML={{ __html: evidenziaParola(n.testo ?? '', cercaTradGlobale) }}
                                                                />
                                                                <SalvaInPratica
                                                                    ricerca={{ tipo: 'ricerca_manuale', domanda: `${n.articolo}${n.rubrica ? ` — ${n.rubrica}` : ''}`, testo: n.testo, codice: n.codice }}
                                                                    praticaAttiva={praticaAttiva}
                                                                    onRicercaSalvata={() => setRefreshPannello(p => p + 1)}
                                                                />
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <p className="section-label">Sfoglia per codice</p>
                                </div>
                                {loadingCodici ? (
                                    <div className="flex items-center justify-center py-20">
                                        <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {codici.map(c => (
                                            <button key={c.codice} onClick={() => apriCodice(c.codice)}
                                                className="bg-slate border border-white/5 p-4 text-left hover:border-oro/30 hover:bg-petrolio/60 transition-all group">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="font-body text-sm font-medium text-nebbia group-hover:text-oro transition-colors truncate">{codiciLabel[c.codice] ?? c.codice}</p>
                                                        <p className="font-body text-xs text-nebbia/30 mt-0.5">{c.totale?.toLocaleString()} articoli</p>
                                                    </div>
                                                    <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro/60 transition-colors shrink-0" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── VISTA CODICE ── */}
                    {vista === 'codice' && (
                        <div className="space-y-4">
                            <div className="flex gap-1 bg-slate border border-white/5 p-1 w-fit">
                                <button onClick={() => setTab('tradizionale')}
                                    className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${tab === 'tradizionale' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'}`}>
                                    <Search size={13} /> Ricerca tradizionale
                                </button>
                                <button onClick={() => setTab('ai')}
                                    className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${tab === 'ai' ? 'bg-salvia/10 text-salvia border border-salvia/30' : 'text-nebbia/40 hover:text-nebbia'}`}>
                                    <Sparkles size={13} /> Cerca con Lex
                                </button>
                            </div>

                            {tab === 'tradizionale' && (
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                                            <input
                                                placeholder="Cerca per numero articolo, rubrica o testo..."
                                                value={inputTrad}
                                                onChange={e => setInputTrad(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') avviaRicercaTrad() }}
                                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                            />
                                        </div>
                                        <button onClick={avviaRicercaTrad}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
                                            <Search size={13} /> Cerca
                                        </button>
                                    </div>

                                    {cercaTrad && <p className="font-body text-xs text-nebbia/30">{totaleNorme} risultati per "{cercaTrad}"</p>}

                                    <div className="bg-slate border border-white/5">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-white/5">
                                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Articolo</th>
                                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Rubrica / Anteprima</th>
                                                    <th className="px-4 py-3 w-8" />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loadingNorme ? (
                                                    <tr><td colSpan={3} className="px-4 py-20 text-center">
                                                        <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full inline-block" />
                                                    </td></tr>
                                                ) : norme.length === 0 ? (
                                                    <tr><td colSpan={3} className="px-4 py-20 text-center">
                                                        <p className="font-body text-sm text-nebbia/30">Nessun articolo trovato</p>
                                                    </td></tr>
                                                ) : norme.map(n => (
                                                    <>
                                                        <tr key={n.id}
                                                            className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer"
                                                            onClick={() => setArticoloAperto(articoloAperto?.id === n.id ? null : n)}
                                                        >
                                                            <td className="px-4 py-3 font-body text-sm text-oro font-medium whitespace-nowrap">{n.articolo}</td>
                                                            <td className="px-4 py-3 font-body text-sm text-nebbia/60 max-w-lg">
                                                                {n.rubrica && (
                                                                    <p className="font-medium text-nebbia/80 mb-0.5"
                                                                        dangerouslySetInnerHTML={{ __html: evidenziaParola(n.rubrica, cercaTrad) }}
                                                                    />
                                                                )}
                                                                {cercaTrad && (
                                                                    <p className="text-xs text-nebbia/40 line-clamp-2"
                                                                        dangerouslySetInnerHTML={{ __html: evidenziaParola(evidenziaTesto(n.testo ?? '', cercaTrad), cercaTrad) }}
                                                                    />
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <ChevronRight size={13} className={`text-nebbia/20 transition-transform ${articoloAperto?.id === n.id ? 'rotate-90' : ''}`} />
                                                            </td>
                                                        </tr>
                                                        {articoloAperto?.id === n.id && (
                                                            <tr key={`${n.id}-testo`} className="border-b border-white/5 bg-petrolio/20">
                                                                <td colSpan={3} className="px-4 py-4">
                                                                    <p className="font-body text-sm text-nebbia/70 whitespace-pre-line leading-relaxed"
                                                                        dangerouslySetInnerHTML={{ __html: evidenziaParola(n.testo ?? '', cercaTrad) }}
                                                                    />
                                                                    <SalvaInPratica
                                                                        ricerca={{ tipo: 'ricerca_manuale', domanda: `${n.articolo} — ${n.rubrica ?? ''}`, testo: n.testo, codice: codiceSelezionato }}
                                                                        praticaAttiva={praticaAttiva} onRicercaSalvata={() => setRefreshPannello(p => p + 1)}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </>
                                                ))}
                                            </tbody>
                                        </table>
                                        {pagine > 1 && (
                                            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                                                <p className="font-body text-xs text-nebbia/30">
                                                    {pagina * PER_PAGINA + 1}–{Math.min((pagina + 1) * PER_PAGINA, totaleNorme)} di {totaleNorme.toLocaleString()}
                                                </p>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={pagina === 0}
                                                        className="px-3 py-1.5 bg-slate border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">← Prev</button>
                                                    <button onClick={() => setPagina(p => Math.min(pagine - 1, p + 1))} disabled={pagina >= pagine - 1}
                                                        className="px-3 py-1.5 bg-slate border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">Next →</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {tab === 'ai' && (
                                <div className="space-y-4">
                                    <RicercaAI
                                        codice={codiceSelezionato}
                                        onRisultato={onRisultato}
                                        crediti={crediti}
                                        setCrediti={setCrediti}
                                        messaggi={messaggiConversazione}
                                        onAggiornaMessaggi={setMessaggiConversazione}
                                        praticaAttiva={praticaAttiva}
                                        onRicercaSalvata={() => setRefreshPannello(p => p + 1)}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── PANNELLO PRATICA DESKTOP ── */}
            {
                pannelloAperto && (
                    <>
                        <div className="hidden lg:flex flex-col w-[35%] max-w-md border-l border-white/5 bg-slate overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                                <p className="font-body text-sm font-medium text-nebbia">Seleziona pratica</p>
                                <button onClick={() => setPannello(false)} className="text-nebbia/30 hover:text-nebbia transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <PannelloPratica praticaAttiva={praticaAttiva} setPraticaAttiva={setPraticaAttiva} onRicercaSalvata={() => setRefreshPannello(p => p + 1)} refresh={refreshPannello} />
                            </div>
                        </div>

                        {/* Mobile drawer */}
                        <div className="lg:hidden fixed inset-0 z-50">
                            <div className="absolute inset-0 bg-black/60" onClick={() => setPannello(false)} />
                            <div className="absolute bottom-0 left-0 right-0 bg-slate border-t border-white/10 max-h-[70vh] flex flex-col">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                                    <p className="font-body text-sm font-medium text-nebbia">Seleziona pratica</p>
                                    <button onClick={() => setPannello(false)} className="text-nebbia/30 hover:text-nebbia transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <PannelloPratica praticaAttiva={praticaAttiva} setPraticaAttiva={setPraticaAttiva} onRicercaSalvata={() => setRefreshPannello(p => p + 1)} refresh={refreshPannello} />
                                </div>
                            </div>
                        </div>
                    </>
                )
            }
        </div >
    )
}

export function AvvocatoNormativaDettaglio() { return null }