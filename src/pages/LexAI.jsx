// src/pages/LexAI.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
    ArrowRight, Sparkles, Search, FileText, Brain,
    Shield, Check, ChevronDown, Lock, X, BookOpen,
    Zap, AlertCircle, Scale, MessageSquare,
    Library, Gavel, Globe, FolderOpen
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import LexAnimatedDemo from '@/components/LexAnimatedDemo'

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

// ────────────────────────────────────────────────────────────────────
// LexBoxPublic — invariato, mantenuto per eventuale riuso
// ────────────────────────────────────────────────────────────────────
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
                    .select('crediti_totali, crediti_usati, tipo')
                    .eq('user_id', user.id)
                    .or(`periodo_fine.is.null,periodo_fine.gte.${new Date().toISOString()}`)
                    .then(({ data }) => {
                        const totale = (data ?? []).reduce((acc, c) => acc + c.crediti_totali, 0);
                        const usati = (data ?? []).reduce((acc, c) => acc + c.crediti_usati, 0);
                        setCrediti({ crediti_totali: totale, crediti_usati: usati });
                    })
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
                <Link to="/registrati"
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
            <Helmet>
                <title>Lex AI — La ricerca legale su fonti verificate</title>
                <meta
                    name="description"
                    content="Lex AI: ricerca legale, analisi documenti e ragionamento giuridico strutturato su giurisprudenza italiana, normativa, diritto UE e prassi. Fonti verificate, perimetro controllato."
                />
                <link rel="canonical" href="https://www.lexum.it/lex-ai" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.lexum.it/lex-ai" />
                <meta property="og:title" content="Lex AI — Ricerca legale su fonti verificate" />
                <meta
                    property="og:description"
                    content="Ricerca legale, analisi documenti e ragionamento strutturato su fonti verificate."
                />
                <meta property="og:image" content="https://www.lexum.it/logo.png" />
                <meta property="og:locale" content="it_IT" />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Lex AI — Ricerca legale su fonti verificate" />
                <meta
                    name="twitter:description"
                    content="Ricerca legale, analisi documenti e ragionamento strutturato su fonti verificate."
                />
                <meta name="twitter:image" content="https://www.lexum.it/logo.png" />
            </Helmet>

            {/* ══════════════════════════════════════════
                1. HERO + BOX ANIMATO
            ══════════════════════════════════════════ */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-10">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-salvia/[0.05] rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-oro/[0.03] rounded-full blur-3xl" />
                    <div className="absolute inset-0 opacity-[0.02]" style={{
                        backgroundImage: `linear-gradient(#7FA39A 1px, transparent 1px), linear-gradient(90deg, #7FA39A 1px, transparent 1px)`,
                        backgroundSize: '80px 80px'
                    }} />
                </div>

                <div className="relative max-w-5xl mx-auto px-6 w-full" style={{ animation: 'heroIn 1s cubic-bezier(.4,0,.2,1) both' }}>
                    {/* Badge */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 border border-salvia/25 bg-salvia/5">
                            <Sparkles size={11} className="text-salvia" />
                            <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">Intelligenza artificiale legale V. 1.3</span>
                        </div>
                    </div>

                    {/* Titolo (resta stretto al centro) */}
                    <div className="max-w-3xl mx-auto text-center mb-10">
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

                    {/* Box animato (largo) */}
                    <div className="bg-slate border border-oro/20 overflow-hidden shadow-2xl shadow-oro/5">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-petrolio/60">
                            <div className="flex items-center gap-2">
                                <Sparkles size={13} className="text-salvia" />
                                <span className="font-body text-xs text-salvia">Lex AI</span>
                                <div className="flex items-center gap-1.5 ml-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse" />
                                    <span className="font-body text-xs text-nebbia/25">Attivo</span>
                                </div>
                            </div>
                            <span className="font-body text-xs text-nebbia/25">Esempio di sessione</span>
                        </div>
                        <div className="p-6">
                            <LexAnimatedDemo />
                        </div>
                    </div>

                    <p className="text-center font-body text-xs text-nebbia/20 mt-16">
                    </p>
                </div>

                <a href="#cosa-fa" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-nebbia/20 animate-bounce">
                    <ChevronDown size={20} />
                </a>
            </section>

            {/* ══════════════════════════════════════════
                2. COSA FA
            ══════════════════════════════════════════ */}
            <section id="cosa-fa" className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <FadeIn>
                            <SectionLabel color="salvia">Funzionalità</SectionLabel>
                            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-6">
                                Cosa puoi fare con{' '}
                                <span className="text-salvia">Lex AI.</span>
                            </h2>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-8">
                                Una versione accessibile pensata per la ricerca legale. Quattro modi concreti
                                in cui Lex ti aiuta a lavorare meglio sui contenuti giuridici.
                            </p>
                            <div className="space-y-4">
                                {[
                                    { icon: Search, t: 'Cerca riferimenti legali', d: 'Trova norme, sentenze e prassi rilevanti su un tema, con il ragionamento giuridico già strutturato.' },
                                    { icon: FileText, t: 'Analizza documenti', d: 'Carica un atto, una sentenza, un contratto. Lex evidenzia i punti rilevanti e i nodi da approfondire.' },
                                    { icon: MessageSquare, t: 'Conversazione continua', d: 'Approfondisci, cambia angolazione, chiedi follow-up. La conversazione si sviluppa nel tempo, non si resetta a ogni domanda.' },
                                    { icon: Brain, t: 'Chiarisce dubbi interpretativi', d: 'Quando una norma o una pronuncia non è chiara, Lex spiega in modo strutturato e cita le fonti.' },
                                ].map(({ icon: I, t, d }, i) => (
                                    <FadeIn key={i} delay={i * 0.08}>
                                        <div className="flex gap-4">
                                            <div className="w-9 h-9 flex items-center justify-center border border-salvia/25 bg-salvia/5 shrink-0">
                                                <I size={15} className="text-salvia" />
                                            </div>
                                            <div>
                                                <p className="font-body text-sm font-medium text-nebbia mb-1">{t}</p>
                                                <p className="font-body text-xs text-nebbia/40 leading-relaxed">{d}</p>
                                            </div>
                                        </div>
                                    </FadeIn>
                                ))}
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.2}>
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
                                        <p className="font-body text-xs text-nebbia/40 mb-1">Tu</p>
                                        <p className="font-body text-sm text-nebbia/65">
                                            "Cerco riferimenti sulla responsabilità del datore di lavoro in caso di infortunio."
                                        </p>
                                    </div>
                                    <div className="bg-salvia/5 border border-salvia/15 px-4 py-4 space-y-3">
                                        <p className="font-body text-xs text-salvia/60">Lex AI</p>
                                        <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                            I riferimenti principali in tema di responsabilità datoriale per infortuni sono:
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
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
                3. SU QUALI FONTI LAVORA
            ══════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FadeIn className="text-center mb-14 max-w-2xl mx-auto">
                        <SectionLabel>Fonti</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Lavora su un patrimonio giuridico{' '}
                            <span className="text-oro">in continua espansione.</span>
                        </h2>
                        <p className="font-body text-sm text-nebbia/40 leading-relaxed">
                            Lex AI consulta milioni di documenti giuridici verificati, suddivisi tra giurisprudenza,
                            normativa, prassi e contributi professionali. Niente ricerca web casuale, niente fonti generaliste.
                        </p>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                icon: Gavel,
                                t: 'Giurisprudenza italiana',
                                d: 'Cassazione, Corti d\'appello, Tribunali. Sentenze di merito e di legittimità in continua acquisizione.',
                            },
                            {
                                icon: Scale,
                                t: 'Normativa italiana',
                                d: 'Codici, leggi, decreti legislativi e regolamenti, sempre aggiornati con le ultime modifiche.',
                            },
                            {
                                icon: Globe,
                                t: 'Diritto UE',
                                d: 'Trattati, regolamenti, direttive e giurisprudenza della Corte di Giustizia dell\'Unione Europea.',
                            },
                            {
                                icon: Library,
                                t: 'Prassi e corpus condiviso',
                                d: 'Circolari ministeriali, prassi amministrativa e materiali caricati dagli avvocati verificati.',
                            },
                        ].map(({ icon: Icon, t, d }, i) => (
                            <FadeIn key={i} delay={i * 0.08}>
                                <div className="h-full bg-slate border border-white/5 p-6 hover:border-oro/15 transition-colors group">
                                    <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro mb-4 group-hover:bg-oro/10 transition-colors">
                                        <Icon size={17} />
                                    </div>
                                    <p className="font-body text-sm font-medium text-nebbia mb-2">{t}</p>
                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{d}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>

                    <FadeIn delay={0.4}>
                        <div className="mt-8 bg-oro/5 border border-oro/15 p-5 flex items-center gap-3 max-w-3xl mx-auto">
                            <Library size={14} className="text-oro shrink-0" />
                            <p className="font-body text-sm text-nebbia/55 leading-relaxed">
                                <span className="text-oro/80 font-medium">Oltre 4 milioni di documenti legali</span>, Lavoriamo in modo continuo per ampliare la banca dati e tenerla aggiornata.
                            </p>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ══════════════════════════════════════════
                4. COME RAGIONA
            ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FadeIn className="text-center mb-14 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">Ragionamento</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Non ti dà solo norme.{' '}
                            <span className="text-salvia">Struttura il ragionamento giuridico.</span>
                        </h2>
                        <p className="font-body text-sm text-nebbia/40 leading-relaxed">
                            Una buona risposta legale non è una lista di articoli. È un ragionamento che identifica le fonti,
                            chiarisce i presupposti, segnala le eccezioni e suggerisce cosa verificare.
                            Lex AI è costruita per fare proprio questo.
                        </p>
                    </FadeIn>

                    <FadeIn delay={0.2}>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                            {/* Etichette laterali (mobile: nasconde su sotto) */}
                            <div className="lg:col-span-3 space-y-3">
                                {[
                                    { n: '01', t: 'Identifica le norme', d: 'Cita gli articoli applicabili al caso concreto.' },
                                    { n: '02', t: 'Chiarisce i presupposti', d: 'Spiega cosa serve perché la norma operi.' },
                                    { n: '03', t: 'Segnala le eccezioni', d: 'Indica i limiti e le ipotesi di esclusione.' },
                                    { n: '04', t: 'Suggerisce verifiche', d: 'Pone le domande giuste per andare più a fondo.' },
                                ].map(({ n, t, d }, i) => (
                                    <FadeIn key={n} delay={0.1 + i * 0.08}>
                                        <div className="flex gap-3 p-3 bg-slate border border-white/5">
                                            <div className="w-8 h-8 flex items-center justify-center border border-salvia/25 bg-salvia/5 text-salvia font-body text-[10px] shrink-0">
                                                {n}
                                            </div>
                                            <div>
                                                <p className="font-body text-xs font-medium text-nebbia/80 mb-0.5">{t}</p>
                                                <p className="font-body text-[11px] text-nebbia/40 leading-relaxed">{d}</p>
                                            </div>
                                        </div>
                                    </FadeIn>
                                ))}
                            </div>

                            {/* Mockup risposta annotata */}
                            <div className="lg:col-span-9">
                                <div className="bg-slate border border-salvia/15 overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-petrolio/60">
                                        <Sparkles size={12} className="text-salvia" />
                                        <span className="font-body text-xs text-salvia">Lex AI — anatomia di una risposta</span>
                                    </div>
                                    <div className="p-5 space-y-4">

                                        {/* Domanda */}
                                        <div className="bg-petrolio border border-white/8 px-4 py-3">
                                            <p className="font-body text-xs text-nebbia/40 mb-1">Tu</p>
                                            <p className="font-body text-sm text-nebbia/65">
                                                "Quando opera la legittima difesa nel caso di intrusione in abitazione?"
                                            </p>
                                        </div>

                                        {/* Risposta strutturata con annotazioni */}
                                        <div className="bg-salvia/5 border border-salvia/15 p-5 space-y-4">

                                            {/* Blocco 1 — Norme */}
                                            <div className="relative">
                                                <span className="absolute -left-2 top-0 w-1 h-full bg-salvia/30" />
                                                <div className="pl-4">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="font-body text-[10px] uppercase tracking-widest text-salvia/70 font-medium">01 · Identifica le norme</span>
                                                    </div>
                                                    <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                        La materia è disciplinata dall'art. 52 c.p. La L. 36/2019 ha introdotto una presunzione di proporzionalità nei luoghi indicati dall'art. 614 c.p.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Blocco 2 — Presupposti */}
                                            <div className="relative">
                                                <span className="absolute -left-2 top-0 w-1 h-full bg-salvia/30" />
                                                <div className="pl-4">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="font-body text-[10px] uppercase tracking-widest text-salvia/70 font-medium">02 · Chiarisce i presupposti</span>
                                                    </div>
                                                    <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                        La presunzione opera solo se: il fatto avviene nei luoghi indicati, il soggetto è legittimamente presente, l'arma è legittimamente detenuta, la difesa riguarda incolumità o beni propri o altrui.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Blocco 3 — Eccezioni */}
                                            <div className="relative">
                                                <span className="absolute -left-2 top-0 w-1 h-full bg-salvia/30" />
                                                <div className="pl-4">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="font-body text-[10px] uppercase tracking-widest text-salvia/70 font-medium">03 · Segnala le eccezioni</span>
                                                    </div>
                                                    <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                        La presunzione non elimina la verifica di attualità del pericolo e necessità della reazione. Cassazione 1/2021: vita e incolumità prevalgono sull'interesse patrimoniale.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Blocco 4 — Verifiche */}
                                            <div className="relative">
                                                <span className="absolute -left-2 top-0 w-1 h-full bg-salvia/30" />
                                                <div className="pl-4">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="font-body text-[10px] uppercase tracking-widest text-salvia/70 font-medium">04 · Suggerisce verifiche</span>
                                                    </div>
                                                    <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                        Vuoi che approfondisca l'eccesso colposo (art. 55 comma 2 c.p.), il caso del ladro in fuga, o la legittima difesa putativa (art. 59 c.p.)?
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Chip fonti citate */}
                                            <div className="flex gap-1 flex-wrap pt-3 border-t border-white/5">
                                                {['Art. 52 c.p.', 'L. 36/2019', 'Art. 614 c.p.', 'Cass. 1/2021', 'Art. 55 c.p.', 'Art. 59 c.p.'].map(c => (
                                                    <span key={c} className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/40">{c}</span>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ══════════════════════════════════════════
                5. DIVERSA DA UNA AI GENERICA
            ══════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <FadeIn delay={0.1}>
                            <div className="space-y-4">
                                <div className="bg-slate border border-white/5 p-5 opacity-50">
                                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-3">AI generica</p>
                                    <ul className="space-y-2">
                                        {[
                                            'Cerca ovunque senza controllo',
                                            'Fonti non verificate',
                                            'Rumore e imprecisioni',
                                            'Nessun contesto legale specifico',
                                        ].map(t => (
                                            <li key={t} className="flex items-center gap-2 font-body text-xs text-nebbia/30">
                                                <X size={10} className="text-red-400/50 shrink-0" />{t}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-slate border border-salvia/20 p-5">
                                    <p className="font-body text-xs text-salvia/60 uppercase tracking-widest mb-3">Lex AI</p>
                                    <ul className="space-y-2">
                                        {[
                                            'Perimetro controllato e verificato',
                                            'Focus su contenuti affidabili',
                                            'Lavora su documenti caricati',
                                            'Ragionamento giuridico strutturato',
                                            'Contesto legale specifico italiano',
                                        ].map(t => (
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
                                fonti verificate, contesto legale italiano e materiali concreti.
                            </p>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                                Maggiore controllo sul contesto significa risposte più affidabili,
                                meno rumore e più utilità reale nel lavoro quotidiano.
                            </p>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
                6. COSA PUÒ E COSA NON PUÒ
            ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FadeIn className="text-center mb-14 max-w-2xl mx-auto">
                        <SectionLabel>Trasparenza</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Cosa può e cosa non può.
                        </h2>
                        <p className="font-body text-sm text-nebbia/40 leading-relaxed">
                            Onestà su entrambi i fronti. Quello che Lex fa bene, e quello che non fa di proposito.
                            Senza promesse esagerate.
                        </p>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FadeIn delay={0.1}>
                            <div className="bg-slate border border-salvia/15 p-6 h-full">
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="w-7 h-7 flex items-center justify-center border border-salvia/25 bg-salvia/10">
                                        <Check size={13} className="text-salvia" />
                                    </div>
                                    <p className="font-body text-sm font-medium text-nebbia">Quello che Lex AI fa</p>
                                </div>
                                <ul className="space-y-3">
                                    {[
                                        'Ricerca su fonti legali verificate',
                                        'Analizza documenti caricati',
                                        'Struttura il ragionamento giuridico',
                                        'Cita le fonti e segnala le eccezioni',
                                    ].map(t => (
                                        <li key={t} className="flex items-center gap-2.5 font-body text-sm text-nebbia/60">
                                            <div className="w-1.5 h-1.5 rounded-full bg-salvia shrink-0" />{t}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <div className="bg-slate border border-white/5 p-6 h-full">
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="w-7 h-7 flex items-center justify-center border border-nebbia/15 bg-nebbia/[0.02]">
                                        <X size={13} className="text-nebbia/40" />
                                    </div>
                                    <p className="font-body text-sm font-medium text-nebbia">Quello che Lex AI non fa</p>
                                </div>
                                <ul className="space-y-3">
                                    {[
                                        'Non sostituisce il parere dell\'avvocato',
                                        'Non genera atti pronti per il deposito (questo è dentro Lexum)',
                                        'Non accede alle sentenze riservate degli avvocati',
                                        'Non cerca su fonti web generaliste o non verificate',
                                    ].map(t => (
                                        <li key={t} className="flex items-center gap-2.5 font-body text-sm text-nebbia/45">
                                            <div className="w-1.5 h-1.5 rounded-full bg-nebbia/20 shrink-0" />{t}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </FadeIn>
                    </div>

                    <FadeIn delay={0.3}>
                        <p className="text-center font-body text-sm text-salvia/70 italic mt-8">
                            La ricerca legale è accessibile. Il livello professionale completo resta dentro Lexum.
                        </p>
                    </FadeIn>
                </div>
            </section>

            {/* ══════════════════════════════════════════
                7. UPSELL LEXUM
            ══════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
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
                                        'Strategie processuali su misura',
                                        'Banca dati sentenze acquistabili',
                                        'Integrazione con pratiche e clienti',
                                        'Generazione strategia da ricerche',
                                        'Atti pronti compilati con i dati della pratica',
                                        'Gestionale completo per lo studio',
                                    ].map((t, i) => (
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

            {/* ══════════════════════════════════════════
                8. CTA FINALE
            ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5 relative overflow-hidden">
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
                            Attiva Lex AI (V. 1.3)
                        </h2>
                        <div className="w-12 h-px bg-gradient-to-r from-transparent via-salvia/50 to-transparent mx-auto my-6" />
                        <p className="font-body text-sm text-nebbia/40 leading-relaxed mb-10 max-w-lg mx-auto">
                            Usa Lex AI per fare ricerca legale su fonti verificate, analizzare documenti
                            e lavorare con una base più affidabile.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                            <Link to="/registrati" className="flex items-center gap-2.5 px-10 py-4 bg-salvia text-petrolio font-body text-sm font-medium hover:bg-salvia/90 transition-all hover:scale-[1.02] shadow-xl shadow-salvia/20">
                                Prova gratis — 3 ricerche <ArrowRight size={15} />
                            </Link>
                            <Link to="/per-avvocati" className="font-body text-sm text-nebbia/35 hover:text-nebbia/60 transition-colors">
                                Avvocato? Prova Lexum gratis per una settimana →
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