// src/pages/PerAvvocati.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowRight, BookOpen, TrendingUp, Users, Sparkles,
    Shield, Check, ChevronDown, Brain, Star, Zap, Lock, FileText, FileSignature
} from 'lucide-react'

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
            <div className="w-1 h-1 bg-oro/40 rotate-45" />
            <div className="flex-1 h-px bg-white/5" />
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
export default function PerAvvocati() {
    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">

            {/* ══════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════ */}
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-oro/[0.04] rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-salvia/[0.04] rounded-full blur-3xl" />
                    <div className="absolute inset-0 opacity-[0.02]" style={{
                        backgroundImage: `linear-gradient(#C9A45C 1px, transparent 1px), linear-gradient(90deg, #C9A45C 1px, transparent 1px)`,
                        backgroundSize: '80px 80px'
                    }} />
                </div>

                <div className="relative max-w-5xl mx-auto px-6 text-center" style={{ animation: 'heroIn 1s cubic-bezier(.4,0,.2,1) both' }}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 border border-oro/20 bg-oro/5 mb-8">
                        <Star size={11} className="text-oro/60" />
                        <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">Per avvocati e studi legali</span>
                    </div>

                    <h1 className="font-display text-5xl md:text-7xl font-light text-nebbia leading-[1.1] mb-6">
                        Valorizza il lavoro<br />
                        del tuo studio{' '}
                        <span className="text-oro-shimmer">dentro Lexum.</span>
                    </h1>

                    <p className="font-body text-base md:text-lg text-nebbia/45 leading-relaxed max-w-2xl mx-auto mb-10">
                        Unisciti a una piattaforma pensata per gli avvocati che vogliono lavorare meglio,
                        dare valore al proprio archivio e contribuire a una banca dati più utile,
                        più concreta, più vicina alla pratica reale.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                        <Link to="/registrati" className="flex items-center gap-2.5 px-8 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-lg shadow-oro/20">
                            Prova Lexum per una settimana <ArrowRight size={15} />
                        </Link>
                        <a href="#come-funziona" className="flex items-center gap-2 px-8 py-4 border border-white/10 text-nebbia/50 font-body text-sm hover:border-white/25 hover:text-nebbia transition-colors">
                            Come funziona
                        </a>
                    </div>

                    <p className="font-body text-xs text-nebbia/25 max-w-lg mx-auto">
                        Pubblica sentenze anonimizzate, rendile accessibili ad altri professionisti
                        e trasforma il tuo archivio in una risorsa attiva.
                    </p>
                </div>

                <a href="#archivio" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-nebbia/20 animate-bounce">
                    <ChevronDown size={20} />
                </a>
            </section>

            {/* ══════════════════════════════════════════
          2. ARCHIVIO VALE PIÙ
      ══════════════════════════════════════════ */}
            <section id="archivio" className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <FadeIn>
                            <SectionLabel>Il punto centrale</SectionLabel>
                            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-6">
                                Il tuo archivio vale{' '}
                                <span className="text-oro">più di quanto pensi.</span>
                            </h2>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-4">
                                Ogni studio accumula negli anni documenti, decisioni, casi affrontati,
                                materiale utile e conoscenza pratica. Il problema è che troppo spesso
                                tutto questo resta chiuso in un archivio interno e produce valore solo una volta.
                            </p>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                                Lexum nasce anche per questo: trasformare il patrimonio già costruito
                                dal tuo studio in una risorsa utile, consultabile e valorizzabile.
                            </p>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            {/* Visual — archivio che diventa valore */}
                            <div className="space-y-3">
                                <div className="bg-slate border border-white/5 p-5 flex items-center gap-4 opacity-40">
                                    <div className="w-10 h-10 flex items-center justify-center border border-white/10">
                                        <FileText size={16} className="text-nebbia/30" />
                                    </div>
                                    <div>
                                        <p className="font-body text-sm text-nebbia/40">Sentenza_2019_Milano.pdf</p>
                                        <p className="font-body text-xs text-nebbia/20 mt-0.5">Fermo in archivio da 5 anni</p>
                                    </div>
                                    <span className="ml-auto font-body text-xs text-nebbia/20 border border-white/8 px-2 py-1">€ 0</span>
                                </div>

                                <div className="flex items-center justify-center py-2">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-px h-6 bg-oro/30" />
                                        <Sparkles size={14} className="text-oro/60" />
                                        <div className="w-px h-6 bg-oro/30" />
                                    </div>
                                    <span className="font-body text-xs text-nebbia/25 ml-3">Pubblica su Lexum</span>
                                </div>

                                <div className="bg-slate border border-oro/20 p-5 flex items-center gap-4">
                                    <div className="w-10 h-10 flex items-center justify-center border border-oro/30 bg-oro/10">
                                        <BookOpen size={16} className="text-oro" />
                                    </div>
                                    <div>
                                        <p className="font-body text-sm text-nebbia">Responsabilità medica — Trib. Milano 2019</p>
                                        <p className="font-body text-xs text-salvia mt-0.5">Disponibile in banca dati Lexum</p>
                                    </div>
                                    <span className="ml-auto font-body text-sm font-medium text-oro border border-oro/30 px-3 py-1.5">1.99€</span>
                                </div>

                                <div className="bg-salvia/5 border border-salvia/15 p-4 flex items-center gap-3">
                                    <Check size={14} className="text-salvia shrink-0" />
                                    <p className="font-body text-xs text-nebbia/60">
                                        Una sentenza che oggi resta ferma nel tuo archivio, domani può diventare
                                        utile a un altro professionista — e generare valore per il tuo studio.
                                    </p>
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
          3. PERCHÉ ENTRARE
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FadeIn className="text-center mb-14">
                        <SectionLabel>Vantaggi</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia">
                            Perché entrare in Lexum come avvocato
                        </h2>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            {
                                icon: BookOpen, accent: 'oro',
                                t: 'Valorizzi il tuo archivio',
                                d: 'Le sentenze che hai già raccolto o prodotto possono diventare una risorsa utile anche per altri professionisti.',
                            },
                            {
                                icon: TrendingUp, accent: 'oro',
                                t: 'Generi nuove entrate',
                                d: 'Quando altri avvocati acquistano contenuti da te pubblicati, una quota va al tuo studio.',
                            },
                            {
                                icon: Users, accent: 'salvia',
                                t: 'Contribuisci alla banca dati',
                                d: 'Non una raccolta astratta, ma materiale che nasce dalla pratica reale, più utile per chi lo cerca.',
                            },
                            {
                                icon: Star, accent: 'salvia',
                                t: 'Aumenti la visibilità professionale',
                                d: 'Partecipa a un ecosistema professionale orientato all\'efficienza e alla qualità del lavoro legale.',
                            },
                            {
                                icon: Brain, accent: 'salvia',
                                t: 'Lavori in un sistema più intelligente',
                                d: 'Le sentenze pubblicate diventano parte di un ambiente in cui Lex AI aiuta a trovare i contenuti più rilevanti.',
                            },
                            {
                                icon: FileSignature, accent: 'oro',
                                t: 'Generi atti in minuti',
                                d: 'Diffide, comparse, istanze, precetti e impugnazioni. Lex AI compila i template con i dati della pratica e produce un atto pronto da rivedere ed esportare.',
                            },
                            {
                                icon: Zap, accent: 'oro',
                                t: 'Tutto in un unico ambiente',
                                d: 'Gestionale, banca dati, Lex AI e area cliente — tutto connesso, senza cambiare strumento.',
                            },
                        ].map(({ icon: Icon, accent, t, d }, i) => (
                            <FadeIn key={i} delay={i * 0.07}>
                                <div className="h-full bg-slate border border-white/5 p-6 hover:border-oro/15 transition-colors group">
                                    <div className={`w-10 h-10 flex items-center justify-center border mb-4 transition-colors
                    ${accent === 'salvia'
                                            ? 'text-salvia border-salvia/20 bg-salvia/5 group-hover:bg-salvia/10'
                                            : 'text-oro border-oro/20 bg-oro/5 group-hover:bg-oro/10'}`}>
                                        <Icon size={17} />
                                    </div>
                                    <h3 className="font-display text-lg font-light text-nebbia mb-2 group-hover:text-oro transition-colors">{t}</h3>
                                    <p className="font-body text-sm text-nebbia/45 leading-relaxed">{d}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
          4. COME FUNZIONA
      ══════════════════════════════════════════ */}
            <section id="come-funziona" className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <FadeIn className="text-center mb-16">
                        <SectionLabel>Processo</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">Come funziona</h2>
                        <p className="font-body text-sm text-nebbia/35 max-w-lg mx-auto">
                            Semplice, chiaro, sostenibile. Non deve sembrare complicato — perché non lo è.
                        </p>
                    </FadeIn>

                    <div className="relative">
                        {/* Connettore verticale */}
                        <div className="hidden lg:block absolute left-[19px] top-8 bottom-8 w-px bg-gradient-to-b from-oro/20 via-oro/10 to-transparent" />

                        <div className="space-y-4">
                            {[
                                { n: '01', t: 'Selezioni i contenuti utili', d: 'Scegli le sentenze o i materiali che possono avere valore per altri professionisti. Nessun obbligo di quantità.' },
                                { n: '02', t: 'Anonimizzi i dati sensibili', d: 'I contenuti vengono preparati per la pubblicazione nel rispetto della riservatezza. Lexum supporta il processo.' },
                                { n: '03', t: 'Li rendi disponibili in piattaforma', d: 'Le sentenze entrano nella banca dati Lexum e diventano consultabili dagli altri avvocati registrati.' },
                                { n: '04', t: 'Altri professionisti le acquistano', d: 'Chi ha bisogno di quel contenuto può ottenerlo in modo semplice e mirato, quando gli serve davvero.' },
                                { n: '05', t: 'Tu valorizzi il lavoro già svolto', d: 'Una quota dell\'acquisto va a te, trasformando l\'archivio in una risorsa che continua a produrre valore.' },
                            ].map(({ n, t, d }, i) => (
                                <FadeIn key={i} delay={i * 0.1}>
                                    <div className="flex gap-6 group">
                                        <div className="w-10 h-10 flex items-center justify-center border border-oro/25 bg-petrolio text-oro font-body text-xs shrink-0 group-hover:bg-oro/10 transition-colors z-10">
                                            {n}
                                        </div>
                                        <div className="flex-1 bg-slate border border-white/5 p-5 hover:border-oro/15 transition-colors">
                                            <p className="font-body text-sm font-medium text-nebbia mb-1">{t}</p>
                                            <p className="font-body text-xs text-nebbia/40 leading-relaxed">{d}</p>
                                        </div>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
          5. SEMPLICITÀ
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <FadeIn>
                            <SectionLabel>Semplicità</SectionLabel>
                            <h2 className="font-display text-3xl font-light text-nebbia mb-6">
                                Entrare in Lexum deve essere{' '}
                                <span className="text-oro">semplice, non pesante.</span>
                            </h2>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-4">
                                Molti professionisti rimandano la digitalizzazione o la valorizzazione del proprio
                                archivio perché temono un processo lungo, complicato e dispersivo.
                            </p>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-6">
                                Lexum è pensato per rendere questo passaggio chiaro e sostenibile.
                                L'obiettivo non è aggiungere lavoro amministrativo. È semplificare quello
                                che oggi resta fermo, disordinato o inutilizzato.
                            </p>
                            <div className="border-l-2 border-oro/30 pl-4">
                                <p className="font-body text-sm text-nebbia/35 italic">
                                    "Se un passaggio è troppo complesso, nessuno lo farà.
                                    Per questo deve essere semplice davvero."
                                </p>
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <div className="space-y-3">
                                {[
                                    { ok: true, t: 'Processo guidato step by step', d: 'Ogni passaggio è chiaro, senza tecnicismi.' },
                                    { ok: true, t: 'Nessun obbligo di volume', d: 'Puoi iniziare con una sola sentenza.' },
                                    { ok: true, t: 'Supporto all\'anonimizzazione', d: 'Non devi farlo tutto da solo.' },
                                    { ok: true, t: 'Tutto dentro la stessa piattaforma', d: 'Non serve un altro strumento.' },
                                    { ok: false, t: 'Processi lunghi e dispersivi', d: null },
                                    { ok: false, t: 'Complessità tecnica elevata', d: null },
                                ].map(({ ok, t, d }, i) => (
                                    <FadeIn key={i} delay={0.05 * i}>
                                        <div className={`flex items-start gap-3 p-3 border transition-colors ${ok ? 'bg-slate border-white/5 hover:border-salvia/20' : 'bg-red-500/3 border-red-500/8 opacity-50'
                                            }`}>
                                            <div className={`w-5 h-5 flex items-center justify-center border shrink-0 mt-0.5 ${ok ? 'border-salvia/30 bg-salvia/10' : 'border-red-500/20 bg-red-500/5'
                                                }`}>
                                                {ok
                                                    ? <Check size={10} className="text-salvia" />
                                                    : <span className="text-red-400/60 text-xs leading-none">✕</span>
                                                }
                                            </div>
                                            <div>
                                                <p className={`font-body text-sm ${ok ? 'text-nebbia/70' : 'text-nebbia/30 line-through'}`}>{t}</p>
                                                {d && <p className="font-body text-xs text-nebbia/30 mt-0.5">{d}</p>}
                                            </div>
                                        </div>
                                    </FadeIn>
                                ))}
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
          6. BANCA DATI DIVERSA
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <FadeIn delay={0.1}>
                            {/* Visual comparativa */}
                            <div className="space-y-4">
                                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-4">Confronto</p>
                                <div className="bg-slate border border-white/5 p-5 opacity-50">
                                    <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-3">Banche dati tradizionali</p>
                                    <ul className="space-y-2">
                                        {['Archivi istituzionali e formali', 'Distanti dalla pratica quotidiana', 'Ricerche ampie ma dispersive', 'Aggiornamenti lenti'].map(t => (
                                            <li key={t} className="flex items-center gap-2 font-body text-xs text-nebbia/30">
                                                <div className="w-1 h-1 bg-white/20 rounded-full" />{t}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-slate border border-oro/20 p-5">
                                    <p className="font-body text-xs text-oro/60 uppercase tracking-widest mb-3">Banca dati Lexum</p>
                                    <ul className="space-y-2">
                                        {['Contenuti dalla pratica reale', 'Caricati da avvocati in esercizio', 'Ricerche più mirate e pertinenti', 'Aggiornata continuamente'].map(t => (
                                            <li key={t} className="flex items-center gap-2 font-body text-xs text-nebbia/60">
                                                <div className="w-1 h-1 bg-oro/60 rounded-full" />{t}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-oro/5 border border-oro/15 p-4 text-center">
                                    <p className="font-body text-sm text-oro/80 font-medium">Meno teoria scollegata. Più valore pratico.</p>
                                </div>
                            </div>
                        </FadeIn>

                        <FadeIn>
                            <SectionLabel>Differenza</SectionLabel>
                            <h2 className="font-display text-3xl font-light text-nebbia mb-6">
                                Una banca dati costruita dalla pratica reale.
                            </h2>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-4">
                                Lexum non nasce come archivio impersonale e distante dalla realtà quotidiana dello studio.
                                Nasce da contenuti che arrivano dall'esperienza concreta degli avvocati.
                            </p>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                                Questo rende la ricerca più vicina ai casi reali, più mirata e spesso più utile
                                rispetto a una consultazione ampia ma dispersiva.
                            </p>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
          7. LEX AI
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-salvia/[0.04] rounded-full blur-3xl -translate-y-1/2" />
                </div>

                <div className="max-w-5xl mx-auto relative">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <FadeIn>
                            <SectionLabel color="salvia">Lex AI</SectionLabel>
                            <h2 className="font-display text-3xl font-light text-nebbia mb-6">
                                Le tue sentenze entrano in un{' '}
                                <span className="text-salvia">ecosistema intelligente.</span>
                            </h2>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-4">
                                Le sentenze pubblicate in Lexum non restano semplicemente archiviate.
                                Diventano parte di un ambiente in cui Lex AI aiuta gli avvocati
                                a orientarsi meglio, suggerendo i contenuti più rilevanti da approfondire.
                            </p>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-6">
                                Questo significa che il materiale caricato ha più possibilità di essere trovato,
                                considerato e utilizzato nel contesto giusto.
                            </p>
                            <div className="flex items-center gap-3 p-4 bg-salvia/5 border border-salvia/15">
                                <Sparkles size={16} className="text-salvia shrink-0" />
                                <p className="font-body text-sm text-nebbia/60">
                                    Lex AI suggerisce le sentenze più pertinenti in base al caso dell'avvocato — non in base a parole chiave generiche.
                                </p>
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <div className="bg-slate border border-salvia/15 overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-petrolio/60">
                                    <Sparkles size={12} className="text-salvia" />
                                    <span className="font-body text-xs text-salvia">Lex — suggerisce sentenze rilevanti</span>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="bg-petrolio border border-white/8 px-4 py-3">
                                        <p className="font-body text-xs text-oro/50 mb-1">Avvocato</p>
                                        <p className="font-body text-sm text-nebbia/65">
                                            "Sto gestendo una controversia locativa. Quali sentenze potrebbero essermi più utili?"
                                        </p>
                                    </div>
                                    <div className="bg-salvia/5 border border-salvia/15 px-4 py-4">
                                        <p className="font-body text-xs text-salvia/60 mb-2">Lex</p>
                                        <p className="font-body text-xs text-nebbia/60 leading-relaxed mb-3">
                                            Ho trovato 3 sentenze pertinenti nella banca dati. Ti consiglio di partire da queste, perché trattano questioni simili per contesto, eccezioni sollevate e impostazione del caso.
                                        </p>
                                        <div className="space-y-2">
                                            {[
                                                { t: 'Morosità — sanatoria tardiva', s: 'Trib. Milano · 2023' },
                                                { t: 'Sfratto — opposizione conteggi', s: 'Cass. · 2022' },
                                            ].map(({ t, s }) => (
                                                <div key={t} className="flex items-center justify-between p-2 bg-petrolio/50 border border-white/5">
                                                    <div>
                                                        <p className="font-body text-xs text-nebbia/70">{t}</p>
                                                        <p className="font-body text-[10px] text-nebbia/30 mt-0.5">{s}</p>
                                                    </div>
                                                    <span className="font-body text-xs text-oro border border-oro/20 px-2 py-0.5">1.99€</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
          8. PER CHI + RISERVATEZZA
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FadeIn delay={0.1}>
                            <div className="h-full bg-slate border border-white/5 p-6">
                                <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/10 text-oro mb-4">
                                    <Users size={17} />
                                </div>
                                <h3 className="font-display text-xl font-light text-nebbia mb-4">Per chi è pensato</h3>
                                <p className="font-body text-sm text-nebbia/45 leading-relaxed mb-4">
                                    Per avvocati e studi legali che vogliono:
                                </p>
                                <ul className="space-y-2.5">
                                    {[
                                        'Valorizzare il proprio archivio',
                                        'Contribuire a una banca dati utile e concreta',
                                        'Rendere accessibile la conoscenza costruita nel tempo',
                                        'Partecipare a un ecosistema legale più efficiente',
                                    ].map(t => (
                                        <li key={t} className="flex items-center gap-2 font-body text-sm text-nebbia/55">
                                            <Check size={12} className="text-oro shrink-0" />{t}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <div className="h-full bg-slate border border-salvia/15 p-6">
                                <div className="w-10 h-10 flex items-center justify-center border border-salvia/20 bg-salvia/5 text-salvia mb-4">
                                    <Shield size={17} />
                                </div>
                                <h3 className="font-display text-xl font-light text-nebbia mb-4">
                                    Riservatezza, ordine e qualità
                                </h3>
                                <p className="font-body text-sm text-nebbia/45 leading-relaxed mb-4">
                                    Nel lavoro legale, il valore delle informazioni conta quanto il modo in cui vengono gestite.
                                    Per questo Lexum è pensato per supportare un flusso ordinato, professionale
                                    e rispettoso della natura sensibile dei contenuti trattati.
                                </p>
                                <div className="space-y-2">
                                    {[
                                        { icon: Shield, t: 'Anonimizzazione prima della pubblicazione' },
                                        { icon: Lock, t: 'Accesso controllato ai contenuti' },
                                        { icon: Check, t: 'Revisione qualitativa dei materiali' },
                                    ].map(({ icon: Icon, t }) => (
                                        <div key={t} className="flex items-center gap-2 font-body text-xs text-nebbia/40">
                                            <Icon size={11} className="text-salvia shrink-0" />{t}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
          9. CTA FINALE
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-oro/25 to-transparent" />
                    <div className="absolute inset-0 opacity-[0.015]" style={{
                        backgroundImage: 'radial-gradient(circle at 50% 50%, #C9A45C, transparent 65%)'
                    }} />
                </div>

                <div className="max-w-2xl mx-auto text-center relative">
                    <FadeIn>
                        <div className="w-12 h-12 flex items-center justify-center border border-oro/30 bg-oro/10 mx-auto mb-8">
                            <BookOpen size={20} className="text-oro" />
                        </div>
                        <h2 className="font-display text-4xl md:text-5xl font-light text-nebbia mb-4">
                            Unisciti a Lexum.
                        </h2>
                        <div className="w-12 h-px bg-gradient-to-r from-transparent via-oro/50 to-transparent mx-auto my-6" />
                        <p className="font-body text-sm text-nebbia/40 leading-relaxed mb-10 max-w-lg mx-auto">
                            Dai valore al lavoro già svolto dal tuo studio, contribuisci a una banca dati
                            costruita dalla pratica reale e partecipa a un ecosistema che rende il lavoro
                            legale più veloce e più intelligente.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/registrati" className="flex items-center gap-2.5 px-10 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-xl shadow-oro/20">
                                Prova Lexum per una settimana <ArrowRight size={15} />
                            </Link>
                            <Link to="/login" className="font-body text-sm text-nebbia/35 hover:text-nebbia/60 transition-colors">
                                Hai già un account? Accedi →
                            </Link>
                        </div>
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