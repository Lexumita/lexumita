// src/pages/LexAI.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowRight, Sparkles, Search, FileText, Brain,
    Shield, Check, ChevronDown, Lock, X, BookOpen,
    Zap, AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'

// ─── Scroll animation hook ───────────────────────────────────
function useInView(threshold = 0.12) {
    const ref = useRef(null)
    const [inView, setInView] = useState(false)
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) { setInView(true); obs.disconnect() }
        }, { threshold })
        if (ref.current) obs.observe(ref.current)
        return () => obs.disconnect()
    }, [])
    return [ref, inView]
}

function FadeIn({ children, delay = 0, className = '' }) {
    const [ref, inView] = useInView()
    return (
        <div ref={ref} className={className} style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'none' : 'translateY(24px)',
            transition: `opacity 0.75s cubic-bezier(.4,0,.2,1) ${delay}s, transform 0.75s cubic-bezier(.4,0,.2,1) ${delay}s`
        }}>
            {children}
        </div>
    )
}

function SectionLabel({ children, color = 'oro' }) {
    const c = color === 'salvia' ? 'text-salvia/70' : 'text-oro/60'
    return <p className={`font-body text-xs ${c} tracking-[0.3em] uppercase mb-3`}>{children}</p>
}

function Divider() {
    return (
        <div className="flex items-center gap-4 my-16">
            <div className="flex-1 h-px bg-white/5" />
            <div className="w-1 h-1 bg-salvia/40 rotate-45" />
            <div className="flex-1 h-px bg-white/5" />
        </div>
    )
}

function LexBoxPublic() {
    const [utente, setUtente] = useState(null)
    const [crediti, setCrediti] = useState(null)
    const [loadingAuth, setLoadingAuth] = useState(true)
    const [conversazione, setConversazione] = useState([])
    const [domanda, setDomanda] = useState('')
    const [cercando, setCercando] = useState(false)
    const [errore, setErrore] = useState(null)
    const [messaggi, setMessaggi] = useState([])
    const bottomRef = useRef(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUtente(user)
            if (user) {
                supabase.from('crediti_ai')
                    .select('crediti_totali, crediti_usati')
                    .eq('user_id', user.id)
                    .gte('periodo_fine', new Date().toISOString())
                    .order('created_at', { ascending: false })
                    .limit(1).maybeSingle()
                    .then(({ data }) => setCrediti(data))
            }
            setLoadingAuth(false)
        })
    }, [])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [conversazione, cercando])

    async function cerca() {
        if (!domanda.trim()) return
        const domandaCorrente = domanda
        setDomanda('')
        setCercando(true)
        setErrore(null)
        const nuovaConv = [...conversazione, { role: 'user', content: domandaCorrente }]
        setConversazione(nuovaConv)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lex-public`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ domanda: domandaCorrente, messaggi }),
                }
            )
            const json = await res.json()
            if (json.ok) {
                const convAggiornata = [...nuovaConv, { role: 'assistant', content: json.risposta }]
                setConversazione(convAggiornata)
                setMessaggi([...messaggi, { role: 'user', content: domandaCorrente }, { role: 'assistant', content: json.risposta }])
                if (json.crediti_rimasti !== undefined) {
                    setCrediti(prev => prev ? { ...prev, crediti_usati: (prev.crediti_totali - json.crediti_rimasti) } : prev)
                }
            } else if (json.crediti_esauriti) {
                setErrore('crediti_esauriti')
                setConversazione(conversazione)
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

    const creditiRimasti = crediti ? crediti.crediti_totali - crediti.crediti_usati : 0

    if (loadingAuth) return (
        <div className="flex items-center justify-center py-12">
            <span className="animate-spin w-5 h-5 border-2 border-salvia border-t-transparent rounded-full" />
        </div>
    )

    if (!utente) return (
        <div className="space-y-5">
            <div className="text-center space-y-2">
                <div className="w-12 h-12 flex items-center justify-center border border-oro/30 bg-oro/10 mx-auto">
                    <Sparkles size={18} className="text-oro" />
                </div>
                <p className="font-display text-xl font-light text-nebbia">3 ricerche gratuite ti aspettano</p>
                <p className="font-body text-sm text-nebbia/40 max-w-sm mx-auto leading-relaxed">
                    Registrati in 30 secondi e inizia subito. Nessuna carta di credito richiesta.
                </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/registrati-lex"
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.01]">
                    <Sparkles size={13} /> Prova gratis — 3 ricerche
                </Link>
                <Link to="/login"
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors">
                    Ho già un account
                </Link>
            </div>
            <div className="flex items-center justify-center gap-6 pt-1">
                {['Senza carta di credito', 'Fonti verificate', 'Risultati immediati'].map(t => (
                    <div key={t} className="flex items-center gap-1.5 font-body text-xs text-nebbia/25">
                        <Check size={10} className="text-salvia" />{t}
                    </div>
                ))}
            </div>
        </div>
    )

    // Crediti esauriti
    if (errore === 'crediti_esauriti' || creditiRimasti <= 0) return (
        <div className="bg-slate border border-oro/20 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-petrolio/60">
                <Sparkles size={13} className="text-salvia" />
                <span className="font-body text-xs text-salvia">Lex AI</span>
            </div>
            <div className="p-8 text-center space-y-4">
                <p className="font-display text-xl font-light text-nebbia">Hai usato le 3 ricerche gratuite</p>
                <p className="font-body text-sm text-nebbia/45 max-w-sm mx-auto">
                    Per continuare puoi acquistare altri crediti o passare a Lexum completo.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link to="/area-personale"
                        className="flex items-center gap-2 px-6 py-3 bg-salvia text-petrolio font-body text-sm font-medium hover:bg-salvia/90 transition-colors">
                        Acquista crediti
                    </Link>
                    <Link to="/per-avvocati"
                        className="flex items-center gap-2 px-6 py-3 border border-oro/30 text-oro font-body text-sm hover:bg-oro/10 transition-colors">
                        Scopri Lexum completo <ArrowRight size={13} />
                    </Link>
                </div>
            </div>
        </div>
    )

    // Loggato — chat funzionante
    return (
        <div className="bg-slate border border-salvia/15 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-petrolio/60">
                <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-salvia" />
                    <span className="font-body text-xs text-salvia">Lex AI</span>
                    {conversazione.length > 0 && (
                        <span className="font-body text-xs text-salvia/40 border border-salvia/20 px-2 py-0.5">
                            {Math.floor(conversazione.length / 2)} scambi
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <span className="font-body text-xs text-nebbia/30">
                        {creditiRimasti} {creditiRimasti === 1 ? 'credito' : 'crediti'} rimasti
                    </span>
                    <Link to="/area-personale" className="font-body text-xs text-nebbia/25 hover:text-nebbia/50 transition-colors">
                        La mia area
                    </Link>
                </div>
            </div>

            {/* Conversazione */}
            {conversazione.length > 0 && (
                <div className="px-5 py-4 space-y-4 max-h-[500px] overflow-y-auto">
                    {conversazione.map((m, i) => (
                        <div key={i}>
                            <p className={`font-body text-xs mb-1.5 ${m.role === 'user' ? 'text-nebbia/30' : 'text-salvia/50'}`}>
                                {m.role === 'user' ? 'Tu' : 'Lex AI'}
                            </p>
                            {m.role === 'user' ? (
                                <div className="bg-petrolio border border-white/8 px-4 py-3">
                                    <p className="font-body text-sm text-nebbia/65">{m.content}</p>
                                </div>
                            ) : (
                                <div className="bg-salvia/5 border border-salvia/15 px-4 py-4">
                                    <div className="font-body text-sm text-nebbia/70 leading-relaxed">
                                        <ReactMarkdown
                                            components={{
                                                h2: ({ children }) => <h2 className="font-body text-sm font-semibold text-nebbia mt-3 mb-1">{children}</h2>,
                                                h3: ({ children }) => <h3 className="font-body text-xs font-semibold text-nebbia/80 mt-2 mb-0.5">{children}</h3>,
                                                strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
                                                p: ({ children }) => <p className="mb-2 leading-relaxed text-sm">{children}</p>,
                                                ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2">{children}</ul>,
                                                li: ({ children }) => <li className="text-sm text-nebbia/60">{children}</li>,
                                            }}
                                        >
                                            {m.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {cercando && (
                        <div className="flex items-center gap-2 text-nebbia/30">
                            <span className="animate-spin w-3 h-3 border-2 border-salvia border-t-transparent rounded-full" />
                            <span className="font-body text-xs">Lex sta cercando...</span>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            )}

            {/* Input */}
            <div className="px-5 py-4 border-t border-white/5 space-y-3">
                {conversazione.length === 0 && (
                    <p className="font-body text-xs text-nebbia/25">
                        Fai una domanda su una questione legale o carica un documento da analizzare.
                    </p>
                )}
                {errore && errore !== 'crediti_esauriti' && (
                    <p className="font-body text-xs text-red-400 flex items-center gap-1.5">
                        <AlertCircle size={11} />{errore}
                    </p>
                )}
                <textarea
                    rows={3}
                    placeholder={conversazione.length > 0 ? 'Approfondisci o fai una nuova domanda...' : 'Es. Responsabilità del datore di lavoro in caso di infortunio...'}
                    value={domanda}
                    onChange={e => setDomanda(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) cerca() }}
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 resize-none placeholder:text-nebbia/20"
                />
                <button
                    onClick={cerca}
                    disabled={cercando || !domanda.trim()}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40"
                >
                    {cercando
                        ? <><span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" /> Ricerca in corso...</>
                        : <><Sparkles size={13} /> Cerca con Lex AI</>
                    }
                </button>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
export default function LexAI() {
    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">

            {/* ══════════════════════════════════════════
    1 e 2 HERO + BOX LEX UNIFICATI
══════════════════════════════════════════ */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-salvia/[0.05] rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-oro/[0.03] rounded-full blur-3xl" />
                    <div className="absolute inset-0 opacity-[0.02]" style={{
                        backgroundImage: `linear-gradient(#7FA39A 1px, transparent 1px), linear-gradient(90deg, #7FA39A 1px, transparent 1px)`,
                        backgroundSize: '80px 80px'
                    }} />
                </div>

                <div className="relative max-w-3xl mx-auto px-6 w-full" style={{ animation: 'heroIn 1s cubic-bezier(.4,0,.2,1) both' }}>
                    {/* Badge */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 border border-salvia/25 bg-salvia/5">
                            <Sparkles size={11} className="text-salvia" />
                            <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">Intelligenza artificiale legale BETA V. 1.5</span>
                        </div>
                    </div>

                    {/* Titolo */}
                    <div className="text-center mb-10">
                        <h1 className="font-display text-5xl md:text-6xl font-light text-nebbia leading-[1.1] mb-5">
                            Lex AI, la ricerca legale
                            <br />
                            <span className="text-salvia">su fonti verificate.</span>
                        </h1>
                        <p className="font-body text-base text-nebbia/45 leading-relaxed max-w-xl mx-auto">
                            Accedi a uno strumento pensato per chi ha bisogno di ricerca legale seria, rapida e affidabile.
                            Lavora su fonti verificate, senza rumore inutile.
                        </p>
                    </div>

                    {/* Box unificato */}
                    <div className="bg-slate border border-oro/20 overflow-hidden shadow-2xl shadow-oro/5">
                        {/* Header box */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-petrolio/60">
                            <div className="flex items-center gap-2">
                                <Sparkles size={13} className="text-salvia" />
                                <span className="font-body text-xs text-salvia">Lex AI</span>
                                <div className="flex items-center gap-1.5 ml-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse" />
                                    <span className="font-body text-xs text-nebbia/25">Attivo</span>
                                </div>
                            </div>
                            <span className="font-body text-xs text-nebbia/25">3 ricerche gratuite</span>
                        </div>
                        <div className="p-6">
                            <LexBoxPublic />
                        </div>
                    </div>

                    <p className="text-center font-body text-xs text-nebbia/20 mt-4">
                        Ricerca legale immediata, accesso semplice, utilizzo diretto.
                    </p>
                </div>

                <a href="#cosa-fa" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-nebbia/20 animate-bounce">
                    <ChevronDown size={20} />
                </a>
            </section>

            {/* ═════════════════ 3. COSA FA ═══════════════ */}
            <section id="cosa-fa" className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <FadeIn>
                            <SectionLabel color="salvia">Perimetro chiaro</SectionLabel>
                            <h2 className="font-display text-3xl font-light text-nebbia mb-6">
                                Una versione accessibile, focalizzata sulla{' '}
                                <span className="text-salvia">ricerca legale.</span>
                            </h2>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-6">
                                Questa versione di Lex AI è pensata per offrire un accesso semplice e immediato
                                alla ricerca legale su fonti verificate.
                            </p>
                            <ul className="space-y-3 mb-6">
                                {[
                                    'Cercare riferimenti legali',
                                    'Orientarti su contenuti giuridici',
                                    'Analizzare testi e documenti caricati',
                                    'Chiarire punti rilevanti',
                                    'Lavorare in modo più rapido su basi affidabili',
                                ].map((t, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <div className="w-5 h-5 flex items-center justify-center border border-salvia/30 bg-salvia/10 shrink-0">
                                            <Check size={10} className="text-salvia" />
                                        </div>
                                        <span className="font-body text-sm text-nebbia/60">{t}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="font-body text-xs text-nebbia/30 italic">
                                È uno strumento costruito per cercare meglio, non per fare promesse che non dovrebbe fare.
                            </p>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            {/* Chat demo */}
                            <div className="bg-slate border border-salvia/15 overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-petrolio/60">
                                    <Sparkles size={12} className="text-salvia" />
                                    <span className="font-body text-xs text-salvia">Lex AI</span>
                                    <div className="ml-auto flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse" />
                                        <span className="font-body text-xs text-nebbia/25">Attivo</span>
                                    </div>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="bg-petrolio border border-white/8 px-4 py-3">
                                        <p className="font-body text-xs text-nebbia/40 mb-1">Utente</p>
                                        <p className="font-body text-sm text-nebbia/65">
                                            "Cerco riferimenti sulla responsabilità del datore di lavoro in caso di infortunio."
                                        </p>
                                    </div>
                                    <div className="bg-salvia/5 border border-salvia/15 px-4 py-4 space-y-3">
                                        <p className="font-body text-xs text-salvia/60">Lex AI</p>
                                        <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                            Sul tema della responsabilità datoriale per infortuni, i riferimenti principali sono:
                                        </p>
                                        <div className="space-y-1.5">
                                            {[
                                                'Art. 2087 c.c. — obbligo generale di sicurezza',
                                                'D.Lgs. 81/2008 — testo unico sicurezza',
                                                'Art. 2049 c.c. — responsabilità per fatto dei dipendenti',
                                            ].map(t => (
                                                <div key={t} className="flex items-start gap-2 font-body text-xs text-nebbia/50">
                                                    <div className="w-1 h-1 bg-salvia rounded-full shrink-0 mt-1.5" />{t}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="font-body text-xs text-nebbia/40 leading-relaxed pt-1 border-t border-white/5">
                                            Vuoi che approfondisca uno di questi punti o carichi un documento da analizzare?
                                        </p>
                                    </div>
                                    <div className="bg-petrolio border border-salvia/20 px-4 py-2.5 flex items-center justify-between">
                                        <span className="font-body text-xs text-nebbia/20">Fai una domanda o carica un documento...</span>
                                        <Sparkles size={11} className="text-salvia/40" />
                                    </div>
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ═════════════════════  4. COSA RESTA RISERVATO ══════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FadeIn className="text-center mb-14">
                        <SectionLabel>Trasparenza</SectionLabel>
                        <h2 className="font-display text-3xl font-light text-nebbia mb-4">
                            Le funzionalità avanzate restano{' '}
                            <span className="text-oro">riservate agli avvocati.</span>
                        </h2>
                        <p className="font-body text-sm text-nebbia/40 max-w-xl mx-auto">
                            La versione accessibile di Lex AI è dedicata alla ricerca legale.
                            Le funzionalità più avanzate sono disponibili solo dentro Lexum per gli avvocati verificati.
                        </p>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FadeIn delay={0.1}>
                            <div className="bg-slate border border-salvia/15 p-6 h-full">
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="w-7 h-7 flex items-center justify-center border border-salvia/25 bg-salvia/10">
                                        <Check size={13} className="text-salvia" />
                                    </div>
                                    <p className="font-body text-sm font-medium text-nebbia">Questa versione include</p>
                                </div>
                                <ul className="space-y-3">
                                    {[
                                        'Ricerca su fonti legali verificate',
                                        'Analisi di documenti caricati',
                                        'Chiarimenti interpretativi',
                                        'Identificazione riferimenti normativi',
                                        'Conversazione continua sul tema',
                                    ].map(t => (
                                        <li key={t} className="flex items-center gap-2.5 font-body text-sm text-nebbia/60">
                                            <div className="w-1.5 h-1.5 rounded-full bg-salvia shrink-0" />{t}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <div className="bg-slate border border-white/5 p-6 h-full opacity-70">
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="w-7 h-7 flex items-center justify-center border border-oro/25 bg-oro/10">
                                        <Lock size={13} className="text-oro" />
                                    </div>
                                    <p className="font-body text-sm font-medium text-nebbia">Solo per avvocati verificati</p>
                                </div>
                                <ul className="space-y-3">
                                    {[
                                        'Strategie processuali',
                                        'Suggerimenti operativi avanzati sul caso',
                                        'Accesso alle sentenze acquistabili',
                                        'Integrazione con pratiche e clienti',
                                        'Generazione strategia su misura',
                                    ].map(t => (
                                        <li key={t} className="flex items-center gap-2.5 font-body text-sm text-nebbia/40">
                                            <div className="w-1.5 h-1.5 rounded-full bg-oro/40 shrink-0" />{t}
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-5 pt-4 border-t border-white/5">
                                    <Link to="/per-avvocati" className="font-body text-xs text-oro/60 hover:text-oro transition-colors flex items-center gap-1.5">
                                        Scopri Lexum per avvocati <ArrowRight size={11} />
                                    </Link>
                                </div>
                            </div>
                        </FadeIn>
                    </div>

                    <FadeIn delay={0.3}>
                        <p className="text-center font-body text-xs text-nebbia/25 mt-6 italic">
                            La ricerca è accessibile. Il livello professionale avanzato resta dentro Lexum.
                        </p>
                    </FadeIn>
                </div>
            </section>

            {/* ═════════════════════  5. FONTI VERIFICATE ══════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <FadeIn>
                            <SectionLabel color="salvia">Qualità delle fonti</SectionLabel>
                            <h2 className="font-display text-3xl font-light text-nebbia mb-6">
                                Ricerca su fonti verificate.
                            </h2>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-6">
                                Lex AI non si basa su ricerca esterna casuale.
                                Lavora su un ecosistema di contenuti verificati, costruito per offrire
                                una base più affidabile nel contesto legale.
                            </p>
                            <ul className="space-y-3 mb-6">
                                {[
                                    'Contenuti provenienti da enti governativi',
                                    'Sentenze e materiali da fonti ufficiali',
                                    'Contenuti presenti nell\'ecosistema Lexum',
                                    'Contributi caricati da avvocati verificati',
                                ].map((t, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <div className="w-5 h-5 flex items-center justify-center border border-salvia/30 bg-salvia/10 shrink-0">
                                            <Check size={10} className="text-salvia" />
                                        </div>
                                        <span className="font-body text-sm text-nebbia/60">{t}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="font-body text-xs text-nebbia/30 italic">Meno rumore, più qualità del contesto.</p>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <div className="space-y-3">
                                <div className="bg-slate border border-white/5 p-5">
                                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-3">Fonti incluse</p>
                                    {[
                                        { label: 'Normativa italiana', sub: 'Codici, leggi, decreti aggiornati', color: 'salvia' },
                                        { label: 'Giurisprudenza ufficiale', sub: 'Cassazione, Corti d\'appello, Tribunali', color: 'salvia' },
                                        { label: 'Banca dati Lexum', sub: 'Sentenze caricate da avvocati verificati', color: 'oro' },
                                    ].map(({ label, sub, color }) => (
                                        <div key={label} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${color === 'salvia' ? 'bg-salvia' : 'bg-oro'}`} />
                                            <div>
                                                <p className="font-body text-sm text-nebbia/70">{label}</p>
                                                <p className="font-body text-xs text-nebbia/30 mt-0.5">{sub}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-red-500/5 border border-red-500/10 p-4 flex items-start gap-3">
                                    <X size={13} className="text-red-400/50 shrink-0 mt-0.5" />
                                    <p className="font-body text-xs text-nebbia/35">
                                        Nessuna ricerca web generica o fonti non verificate. Il perimetro è controllato per garantire affidabilità.
                                    </p>
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ═════════════════  6. COSA PUOI FARE ═════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FadeIn className="text-center mb-14">
                        <SectionLabel color="salvia">Utilizzo</SectionLabel>
                        <h2 className="font-display text-3xl font-light text-nebbia">Cosa puoi fare</h2>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { icon: Search, t: 'Fare ricerca legale', d: 'Trova più rapidamente riferimenti e contenuti giuridici rilevanti su fonti verificate.' },
                            { icon: FileText, t: 'Analizzare documenti', d: 'Carica testi e materiali per evidenziare i punti più importanti e i nodi critici.' },
                            { icon: Brain, t: 'Chiarire dubbi interpretativi', d: 'Orientati meglio su questioni e contenuti da approfondire senza rumore inutile.' },
                            { icon: Zap, t: 'Lavorare con più continuità', d: 'Porta avanti il tuo ragionamento senza saltare tra strumenti diversi.' },
                        ].map(({ icon: Icon, t, d }, i) => (
                            <FadeIn key={i} delay={i * 0.08}>
                                <div className="h-full bg-slate border border-white/5 p-5 hover:border-salvia/20 transition-colors group text-center">
                                    <div className="w-10 h-10 flex items-center justify-center border border-salvia/20 bg-salvia/5 text-salvia mx-auto mb-4 group-hover:bg-salvia/15 transition-colors">
                                        <Icon size={17} />
                                    </div>
                                    <p className="font-body text-sm font-medium text-nebbia mb-2">{t}</p>
                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{d}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═════════════════ 7. DIVERSA DA AI GENERICA ════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <FadeIn delay={0.1}>
                            <div className="space-y-4">
                                <div className="bg-slate border border-white/5 p-5 opacity-50">
                                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-3">AI generica</p>
                                    <ul className="space-y-2">
                                        {['Cerca ovunque senza controllo', 'Fonti non verificate', 'Rumore e imprecisioni', 'Nessun contesto legale specifico'].map(t => (
                                            <li key={t} className="flex items-center gap-2 font-body text-xs text-nebbia/30">
                                                <X size={10} className="text-red-400/50 shrink-0" />{t}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-slate border border-salvia/20 p-5">
                                    <p className="font-body text-xs text-salvia/60 uppercase tracking-widest mb-3">Lex AI</p>
                                    <ul className="space-y-2">
                                        {['Perimetro controllato e verificato', 'Focus su contenuti affidabili', 'Lavora su documenti caricati', 'Ricerca più mirata', 'Contesto legale specifico'].map(t => (
                                            <li key={t} className="flex items-center gap-2 font-body text-xs text-nebbia/60">
                                                <Check size={10} className="text-salvia shrink-0" />{t}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-salvia/5 border border-salvia/15 p-4 text-center">
                                    <p className="font-body text-sm text-salvia/80">Lex AI punta a essere utile davvero.</p>
                                </div>
                            </div>
                        </FadeIn>

                        <FadeIn>
                            <SectionLabel color="salvia">Differenza</SectionLabel>
                            <h2 className="font-display text-3xl font-light text-nebbia mb-6">
                                Perché è diversa da una{' '}
                                <span className="text-salvia">AI generica.</span>
                            </h2>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-4">
                                Lex AI non cerca ovunque e non prova a fare tutto.
                                È stata progettata per lavorare meglio in un perimetro più controllato:
                                fonti verificate, contesto legale e materiali concreti.
                            </p>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                                Maggiore controllo sul contesto significa risposte più affidabili,
                                meno rumore e più utilità reale nel lavoro quotidiano.
                            </p>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ═════════════════  8. ESEMPIO CONCRETO ═════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-4xl mx-auto">
                    <FadeIn className="text-center mb-14">
                        <SectionLabel color="salvia">Esempio</SectionLabel>
                        <h2 className="font-display text-3xl font-light text-nebbia mb-4">Un esempio concreto</h2>
                        <p className="font-body text-sm text-nebbia/40 max-w-lg mx-auto">
                            Carichi un documento, fai una domanda su un tema legale o chiedi di evidenziare
                            i punti più rilevanti di un testo.
                        </p>
                    </FadeIn>

                    <FadeIn delay={0.1}>
                        <div className="bg-slate border border-salvia/15 overflow-hidden">
                            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-petrolio/60">
                                <Sparkles size={12} className="text-salvia" />
                                <span className="font-body text-xs text-salvia">Lex AI — sessione di lavoro</span>
                            </div>
                            <div className="p-6 space-y-5">

                                {/* Upload documento */}
                                <div className="flex items-center gap-3 p-3 bg-petrolio/50 border border-white/8">
                                    <FileText size={14} className="text-nebbia/30 shrink-0" />
                                    <span className="font-body text-sm text-nebbia/50">contratto_locazione.pdf caricato</span>
                                    <Check size={12} className="text-salvia ml-auto" />
                                </div>

                                {/* Messaggio utente */}
                                <div>
                                    <p className="font-body text-xs text-nebbia/30 mb-1.5">Utente</p>
                                    <div className="bg-petrolio border border-white/8 px-4 py-3">
                                        <p className="font-body text-sm text-nebbia/65">
                                            "Evidenziami i punti giuridicamente più rilevanti e aiutami a capire quali aspetti meritano approfondimento."
                                        </p>
                                    </div>
                                </div>

                                {/* Risposta Lex */}
                                <div>
                                    <p className="font-body text-xs text-salvia/50 mb-1.5">Lex AI</p>
                                    <div className="bg-salvia/5 border border-salvia/15 px-5 py-5 space-y-4">
                                        <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                                            Dai materiali caricati emergono questi profili principali:
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {[
                                                { label: 'Punti chiave', items: ['Durata contratto — art. 1574 c.c.', 'Obbligo di manutenzione', 'Clausola di recesso anticipato'] },
                                                { label: 'Nodi da verificare', items: ['Tasso di interesse pattuito', 'Deposito cauzionale — conformità', 'Clausole di indicizzazione'] },
                                                { label: 'Temi da approfondire', items: ['Sanatoria morosità', 'Procedura di rilascio', 'Aggiornamento ISTAT'] },
                                            ].map(({ label, items }) => (
                                                <div key={label} className="bg-petrolio/50 border border-white/5 p-3">
                                                    <p className="font-body text-xs font-medium text-nebbia/50 mb-2 uppercase tracking-widest">{label}</p>
                                                    {items.map(item => (
                                                        <p key={item} className="font-body text-xs text-nebbia/40 leading-relaxed py-1 border-b border-white/5 last:border-0">{item}</p>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="font-body text-xs text-nebbia/35 italic pt-1 border-t border-white/5">
                                            Così riduci il tempo perso in letture dispersive e parti da una base più ordinata.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ═══════════════ 9. UPSELL LEXUM ══════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FadeIn>
                        <div className="bg-slate border border-oro/20 p-8 md:p-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-oro/[0.04] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
                            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                                <div>
                                    <p className="font-body text-xs text-oro/60 tracking-[0.3em] uppercase mb-3">Per avvocati</p>
                                    <h2 className="font-display text-3xl font-light text-nebbia mb-4">
                                        Vuoi un livello più avanzato?{' '}
                                        <span className="text-oro">Dentro Lexum c'è di più.</span>
                                    </h2>
                                    <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-4">
                                        La versione accessibile di Lex AI è focalizzata sulla ricerca legale.
                                        Dentro Lexum, per gli avvocati verificati, Lex AI lavora in un ambiente più ampio:
                                        collegato a pratiche, documenti, clienti, archivio e strumenti professionali.
                                    </p>
                                    <p className="font-body text-xs text-nebbia/30 italic mb-6">
                                        Puoi iniziare da qui. Il livello successivo è dentro Lexum.
                                    </p>
                                    <Link to="/per-avvocati" className="flex items-center gap-2 w-fit px-6 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors">
                                        Scopri Lexum per avvocati <ArrowRight size={14} />
                                    </Link>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { t: 'Strategie processuali su misura', locked: false },
                                        { t: 'Banca dati sentenze acquistabili', locked: false },
                                        { t: 'Integrazione con pratiche e clienti', locked: false },
                                        { t: 'Generazione strategia da ricerche', locked: false },
                                        { t: 'Gestionale completo per lo studio', locked: false },
                                    ].map(({ t }, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-petrolio/40 border border-oro/10">
                                            <div className="w-5 h-5 flex items-center justify-center border border-oro/25 bg-oro/10 shrink-0">
                                                <Check size={10} className="text-oro" />
                                            </div>
                                            <span className="font-body text-sm text-nebbia/60">{t}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ══════════════ 10. COSA NON PROMETTE ══════════════════ */}
            <section className="py-20 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-3xl mx-auto text-center">
                    <FadeIn>
                        <SectionLabel>Trasparenza</SectionLabel>
                        <h2 className="font-display text-2xl font-light text-nebbia mb-8">Cosa non promette Lex AI</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-6">
                            {[
                                'Non sostituisce l\'avvocato',
                                'Non fornisce strategie processuali in questa versione',
                                'Non dà accesso alle sentenze riservate',
                                'Non trasforma il diritto in una risposta automatica',
                            ].map((t, i) => (
                                <FadeIn key={i} delay={i * 0.06}>
                                    <div className="flex items-start gap-3 p-4 bg-slate border border-white/5">
                                        <AlertCircle size={13} className="text-nebbia/25 shrink-0 mt-0.5" />
                                        <span className="font-body text-sm text-nebbia/45">{t}</span>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                        <p className="font-body text-sm text-salvia/70 italic">
                            Fa una cosa più utile: ti aiuta a cercare meglio su basi affidabili.
                        </p>
                    </FadeIn>
                </div>
            </section>

            {/* ════════════════════ 11. CTA FINALE ════════════════ */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-salvia/25 to-transparent" />
                    <div className="absolute inset-0 opacity-[0.02]" style={{
                        backgroundImage: 'radial-gradient(circle at 50% 50%, #7FA39A, transparent 65%)'
                    }} />
                </div>

                <div className="max-w-2xl mx-auto text-center relative">
                    <FadeIn>
                        <div className="w-12 h-12 flex items-center justify-center border border-salvia/30 bg-salvia/10 mx-auto mb-8">
                            <Sparkles size={20} className="text-salvia" />
                        </div>
                        <h2 className="font-display text-4xl md:text-5xl font-light text-nebbia mb-4">
                            Attiva Lex AI (BETA V. 1.5)
                        </h2>
                        <div className="w-12 h-px bg-gradient-to-r from-transparent via-salvia/50 to-transparent mx-auto my-6" />
                        <p className="font-body text-sm text-nebbia/40 leading-relaxed mb-10 max-w-lg mx-auto">
                            Usa Lex AI per fare ricerca legale su fonti verificate, analizzare documenti
                            e lavorare con una base più affidabile.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                            <Link to="/registrati-lex" className="flex items-center gap-2.5 px-10 py-4 bg-salvia text-petrolio font-body text-sm font-medium hover:bg-salvia/90 transition-all hover:scale-[1.02] shadow-xl shadow-salvia/20">
                                Prova gratis — 3 ricerche <ArrowRight size={15} />
                            </Link>
                            <Link to="/per-avvocati" className="font-body text-sm text-nebbia/35 hover:text-nebbia/60 transition-colors">
                                Avvocato! Prova Lexum per una settimana è Gratis →
                            </Link>
                        </div>
                        <p className="font-body text-xs text-nebbia/20 max-w-sm mx-auto">
                            Per funzionalità avanzate, strategie e accesso professionale completo,
                            entra in Lexum come avvocato verificato.
                        </p>
                    </FadeIn>
                </div>
            </section>

            <style>{`
        @keyframes heroIn {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    )
}
