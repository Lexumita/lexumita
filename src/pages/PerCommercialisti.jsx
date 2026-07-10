// src/pages/PerCommercialisti.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowRight, BookOpen, TrendingUp, Users, Sparkles,
    Shield, Check, ChevronDown, Star,
    Calendar, Receipt, Calculator,
    Wallet, Percent, Building2, ScrollText, Landmark,
    PiggyBank, ClipboardList, Briefcase, ShieldCheck,
    Search, FolderSearch, RefreshCw,
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'

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

// VisualBlock con cornice tipo finestra
function VisualBlock({ label, children, accent = 'oro' }) {
    const border = accent === 'salvia' ? 'border-salvia/15' : 'border-oro/15'
    return (
        <div className={`bg-slate border ${border} overflow-hidden`}>
            <div className="px-4 py-2.5 border-b border-white/5 bg-petrolio/40 flex items-center gap-2">
                <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>
                <span className="font-body text-xs text-nebbia/25 ml-2">{label}</span>
            </div>
            <div className="p-5">
                {children}
            </div>
        </div>
    )
}

// FeatureRow generica per le sezioni che alternano testo/visual
function FeatureRow({ icon: Icon, title, text, points, reverse = false, accent = 'oro', children }) {
    const ic = accent === 'salvia' ? 'text-salvia bg-salvia/10 border-salvia/20' : 'text-oro bg-oro/10 border-oro/20'
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <FadeIn delay={0.1} className={reverse ? 'lg:order-2' : ''}>
                <div className="space-y-4">
                    <div className={`w-10 h-10 flex items-center justify-center border ${ic}`}>
                        <Icon size={18} />
                    </div>
                    <h3 className="font-display text-2xl md:text-3xl font-light text-nebbia">{title}</h3>
                    <p className="font-body text-sm text-nebbia/50 leading-relaxed">{text}</p>
                    {points && (
                        <ul className="space-y-2 pt-2">
                            {points.map((p, i) => (
                                <li key={i} className="flex items-center gap-2 font-body text-xs text-nebbia/40">
                                    <div className={`w-1 h-1 rounded-full shrink-0 ${accent === 'salvia' ? 'bg-salvia' : 'bg-oro'}`} />
                                    {p}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </FadeIn>
            <FadeIn delay={0.2} className={reverse ? 'lg:order-1' : ''}>
                {children}
            </FadeIn>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
export default function PerCommercialisti() {
    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <Helmet>
                <title>Lexum per Commercialisti — Studio, scadenzario fiscale, contabilita e Lex AI</title>
                <meta
                    name="description"
                    content="Mandati, scadenzario fiscale automatico, cassa e conto economico, contabilita in partita doppia, costo del personale e Lex AI. Tutto il lavoro dello studio del commercialista in un unico ambiente."
                />
                <link rel="canonical" href="https://www.lexum.it/per-commercialisti" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.lexum.it/per-commercialisti" />
                <meta property="og:title" content="Lexum per Commercialisti — Studio, fisco, contabilita e AI" />
                <meta
                    property="og:description"
                    content="Scadenzario fiscale automatico, contabilita in partita doppia, cassa e conto economico, costo del personale e Lex AI. Tutto in un ambiente coerente."
                />
                <meta property="og:image" content="https://www.lexum.it/logo.png" />
                <meta property="og:locale" content="it_IT" />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Lexum per Commercialisti" />
                <meta
                    name="twitter:description"
                    content="Gestionale, fisco, contabilita e AI per lo studio del commercialista italiano."
                />
                <meta name="twitter:image" content="https://www.lexum.it/logo.png" />
            </Helmet>

            {/* ══════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════ */}
            <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden pb-12">
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
                        <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">Per commercialisti e studi contabili</span>
                    </div>

                    <h1 className="font-display text-5xl md:text-7xl font-light text-nebbia leading-[1.1] mb-6">
                        Lo studio del commercialista,<br />
                        <span className="text-oro-shimmer">finalmente in un unico posto.</span>
                    </h1>

                    <p className="font-body text-base md:text-lg text-nebbia/45 leading-relaxed max-w-2xl mx-auto mb-10">
                        Mandati, scadenzario fiscale, cassa e conto economico, contabilita in partita doppia,
                        costo del personale e un assistente AI che conosce ogni cliente. Tutto connesso, sempre.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                        <Link to="/registrati" className="flex items-center gap-2.5 px-8 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-lg shadow-oro/20">
                            Inizia ora <ArrowRight size={15} />
                        </Link>
                        <a href="#lex-ai" className="flex items-center gap-2 px-8 py-4 border border-salvia/30 bg-salvia/5 text-salvia font-body text-sm hover:bg-salvia/10 hover:border-salvia/50 transition-colors">
                            Scopri Lex AI
                        </a>
                    </div>

                    <p className="font-body text-xs text-nebbia/25 max-w-lg mx-auto">
                        Nessuna carta richiesta. Cancellazione libera.
                    </p>
                </div>

                <a href="#lex-ai" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-nebbia/20 animate-bounce">
                    <ChevronDown size={20} />
                </a>
            </section>

            {/* ══════════════════════════════════════════
          2. LEX AI
      ══════════════════════════════════════════ */}
            <section id="lex-ai" className="py-24 px-6 border-t border-white/5 bg-slate/20 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-salvia/[0.04] rounded-full blur-3xl -translate-y-1/2" />
                </div>

                <div className="max-w-5xl mx-auto relative">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">Intelligenza artificiale</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Un assistente che conosce{' '}
                            <span className="text-salvia">il singolo mandato.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Lex non e una chat generica. Conosce scadenze, conto economico e personale
                            del cliente su cui stai lavorando, e risponde a domande, calcoli e adempimenti.
                        </p>
                    </FadeIn>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                        <FadeIn delay={0.1}>
                            <div className="space-y-3">
                                {[
                                    { icon: Calendar, t: 'Sa cosa scade e quando', d: 'Chiedi «cosa scade questo mese per il cliente Rossi?» e Lex risponde con F24, liquidazioni IVA e dichiarativi del mandato.' },
                                    { icon: Calculator, t: 'Calcoli fiscali e contabili', d: 'Acconti, saldi, aliquote, arrotondamenti. Lex fa i conti sul regime del cliente e mostra come ci e arrivato.' },
                                    { icon: TrendingUp, t: 'Legge il conto economico', d: 'Domande in italiano sui numeri del cliente: margini, scostamenti, liquidita attesa. Risposte immediate, senza report da generare.' },
                                    { icon: ScrollText, t: 'Adempimenti spiegati', d: 'Cosa serve per una LIPE, come si imputa un costo, quale quadro compilare. Lex spiega e cita la fonte normativa.' },
                                    { icon: Sparkles, t: 'Conversazione continua', d: 'Approfondisci, cambia cliente, chiedi follow-up. Lex ricorda il contesto del mandato e della conversazione.' },
                                    { icon: Receipt, t: 'OCR sulle fatture', d: 'Carichi una fattura o una ricevuta: Lex estrae importo, data e descrizione e ti propone il movimento gia pronto da registrare.' },
                                ].map(({ icon: I, t, d }, i) => (
                                    <FadeIn key={i} delay={0.1 + i * 0.06}>
                                        <div className="flex gap-4 p-4 bg-slate border border-white/5 hover:border-salvia/20 transition-colors">
                                            <div className="w-8 h-8 flex items-center justify-center border border-salvia/20 bg-salvia/5 shrink-0">
                                                <I size={13} className="text-salvia" />
                                            </div>
                                            <div>
                                                <p className="font-body text-sm font-medium text-nebbia mb-0.5">{t}</p>
                                                <p className="font-body text-xs text-nebbia/35 leading-relaxed">{d}</p>
                                            </div>
                                        </div>
                                    </FadeIn>
                                ))}
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <div className="space-y-6">
                                <VisualBlock label="Lex AI - Conversazione" accent="salvia">
                                    <div className="space-y-3">
                                        <div className="flex justify-end">
                                            <div className="max-w-[85%] bg-petrolio/60 border border-white/5 p-3">
                                                <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                    Per il cliente Rossi srl, cosa scade a luglio e a quanto ammonta il secondo acconto?
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="max-w-[90%] bg-salvia/5 border border-salvia/15 p-3 space-y-2">
                                                <p className="font-body text-xs text-salvia/80 font-medium flex items-center gap-1">
                                                    <Sparkles size={10} /> Lex AI
                                                </p>
                                                <p className="font-body text-xs text-nebbia/55 leading-relaxed">
                                                    Rossi srl e in contabilita ordinaria. A luglio hai: liquidazione IVA del secondo trimestre (16/07), F24 dei contributi dipendenti (16/07) e la LIPE del Q2 (entro fine mese). Il secondo acconto IRES e IRAP e a novembre, non a luglio. Il primo acconto versato a giugno era di EUR 3.240,00; il saldo stimato per novembre e di EUR 4.860,00. Ho gia predisposto il modello F24 in bozza per la tua revisione.
                                                </p>
                                                <div className="flex gap-1 pt-1 flex-wrap">
                                                    <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">IVA Q2</span>
                                                    <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">LIPE Q2</span>
                                                    <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/10 border border-salvia/25 text-salvia/80">F24_bozza.pdf</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </VisualBlock>

                                <VisualBlock label="OCR - Nuova fattura acquisto" accent="salvia">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                            <Receipt size={12} className="text-salvia shrink-0" />
                                            <span className="font-body text-[11px] text-nebbia/55">fattura_enel_giugno.pdf caricata</span>
                                        </div>
                                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Movimento estratto</p>
                                        <div className="space-y-1.5">
                                            {[
                                                { l: 'Data', v: '28/06/2026' },
                                                { l: 'Descrizione', v: 'Enel Energia - utenza sede' },
                                                { l: 'Imponibile', v: 'EUR 184,50' },
                                                { l: 'IVA 22%', v: 'EUR 40,59' },
                                                { l: 'Totale', v: 'EUR 225,09', c: 'text-salvia' },
                                            ].map(({ l, v, c }) => (
                                                <div key={l} className="flex justify-between py-1 border-b border-white/5">
                                                    <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{l}</span>
                                                    <span className={`font-body text-xs ${c || 'text-nebbia/70'}`}>{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2 p-2 bg-salvia/5 border border-salvia/15">
                                            <Check size={11} className="text-salvia shrink-0" />
                                            <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                                Movimento pronto: conto <span className="text-salvia">Energia elettrica</span>, uscita in cassa. Conferma per registrare.
                                            </p>
                                        </div>
                                    </div>
                                </VisualBlock>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
          3. MANDATI E BANCO DI LAVORO
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel>Organizzazione</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Un mandato per cliente,{' '}
                            <span className="text-oro">tutto il resto attorno.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Organizzi il lavoro per cliente in mandati. Ogni mandato raccoglie scadenze,
                            documenti e contabilita: apri il cliente e hai davanti tutto quello che ti serve.
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Briefcase}
                        title="Il banco di lavoro del mandato"
                        text="Basta rincorrere cartelle sul desktop, mail sparse e fogli Excel paralleli. Ogni cliente ha il suo mandato: dentro trovi le scadenze fiscali, i documenti caricati, la contabilita, il conto economico e le comunicazioni. Il lavoro dello studio smette di essere frammentato."
                        points={[
                            'Un mandato per ogni cliente',
                            'Scadenze, documenti e contabilita collegati',
                            'Stato del mandato sempre visibile',
                            'Passaggio di consegne tra collaboratori senza attrito',
                        ]}
                    >
                        <VisualBlock label="Mandato - Rossi srl">
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    {[
                                        { l: 'Regime contabile', v: 'Ordinario', c: 'text-oro' },
                                        { l: 'Forma giuridica', v: 'S.r.l.' },
                                        { l: 'Scadenze aperte', v: '4', c: 'text-oro' },
                                        { l: 'Dipendenti', v: '6' },
                                    ].map(({ l, v, c }) => (
                                        <div key={l} className="flex justify-between py-1.5 border-b border-white/5">
                                            <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{l}</span>
                                            <span className={`font-body text-xs ${c || 'text-nebbia/70'}`}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-2">
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-2">Sezioni del mandato</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {[
                                            { i: Calendar, t: 'Scadenzario' },
                                            { i: Wallet, t: 'Cassa' },
                                            { i: Calculator, t: 'Contabilita' },
                                            { i: FolderSearch, t: 'Documenti' },
                                            { i: Users, t: 'Dipendenti' },
                                            { i: TrendingUp, t: 'Conto economico' },
                                        ].map(({ i: I, t }) => (
                                            <div key={t} className="flex items-center gap-2 p-2 bg-petrolio/50 border border-white/5">
                                                <I size={11} className="text-oro shrink-0" />
                                                <span className="font-body text-[11px] text-nebbia/65 truncate">{t}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          4. SCADENZARIO FISCALE AUTOMATICO
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel>Il differenziatore</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Lo scadenzario fiscale{' '}
                            <span className="text-oro">che si genera da solo.</span>
                        </h2>
                        <p className="font-base text-base text-nebbia/40 leading-relaxed font-body">
                            Con un click generi tutte le scadenze fiscali dell'anno in base al regime del cliente.
                            F24, liquidazioni IVA, LIPE, acconti e dichiarativi, gia posizionati nel calendario.
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Calendar}
                        title="Un click e l'anno fiscale del cliente e pianificato"
                        text="Scegli il regime contabile del cliente (ordinario, semplificato o forfettario) e Lexum costruisce lo scadenzario completo dell'anno: versamenti F24, liquidazioni IVA mensili o trimestrali, LIPE, acconti IRES, IRAP e IRPEF, dichiarativi. Ogni scadenza e collegata al mandato e sincronizzabile con il calendario, con promemoria automatici."
                        points={[
                            'Adempimenti per regime: ordinario, semplificato, forfettario',
                            'F24, IVA, LIPE, acconti e dichiarativi',
                            'Sincronizzazione con il calendario',
                            'Promemoria automatici prima di ogni scadenza',
                        ]}
                        reverse
                    >
                        <VisualBlock label="Scadenzario 2026 - Rossi srl">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                    <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Regime</span>
                                    <span className="font-body text-[11px] px-2 py-0.5 bg-oro/10 border border-oro/25 text-oro/80">Ordinario</span>
                                </div>
                                <div className="space-y-1.5">
                                    {[
                                        { d: '16/07', t: 'Liquidazione IVA Q2', tipo: 'IVA', col: 'oro' },
                                        { d: '16/07', t: 'F24 ritenute dipendenti', tipo: 'F24', col: 'salvia' },
                                        { d: '31/07', t: 'LIPE secondo trimestre', tipo: 'LIPE', col: 'oro' },
                                        { d: '20/08', t: 'F24 IVA e contributi', tipo: 'F24', col: 'salvia' },
                                        { d: '30/11', t: 'Secondo acconto IRES/IRAP', tipo: 'Acconto', col: 'oro' },
                                    ].map(({ d, t, tipo, col }) => (
                                        <div key={d + t} className="flex items-center gap-3 p-2 bg-petrolio/50 border border-white/5">
                                            <div className="font-body text-[10px] text-nebbia/40 w-10 shrink-0">{d}</div>
                                            <span className="font-body text-[11px] text-nebbia/70 flex-1 truncate">{t}</span>
                                            <span className={`font-body text-[9px] px-1.5 py-0.5 border shrink-0 ${col === 'oro' ? 'bg-oro/10 border-oro/25 text-oro/80' : 'bg-salvia/10 border-salvia/25 text-salvia/80'
                                                }`}>{tipo}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 p-2.5 bg-oro/5 border border-oro/15 mt-2">
                                    <Sparkles size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        Generato in automatico dal regime: <span className="text-oro/80">37 scadenze</span> per l'anno, tutte sul calendario.
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                    {/* Tre regimi */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16">
                        {[
                            {
                                icon: Building2,
                                t: 'Ordinario',
                                d: 'IVA mensile, LIPE trimestrali, dichiarativi completi, acconti IRES e IRAP. Lo scadenzario piu articolato, costruito senza dimenticare nulla.',
                            },
                            {
                                icon: ClipboardList,
                                t: 'Semplificato',
                                d: 'IVA trimestrale, registri semplificati, acconti IRPEF e IRAP. Gli adempimenti giusti per il regime, senza appesantire il cliente.',
                            },
                            {
                                icon: Percent,
                                t: 'Forfettario',
                                d: 'Imposta sostitutiva, acconto e saldo, adempimenti ridotti. Lo scadenzario tiene conto delle regole specifiche del forfettario.',
                            },
                        ].map(({ icon: Icon, t, d }, i) => (
                            <FadeIn key={i} delay={i * 0.08}>
                                <div className="bg-slate border border-white/5 p-6 h-full hover:border-oro/20 transition-colors">
                                    <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro mb-4">
                                        <Icon size={16} />
                                    </div>
                                    <h3 className="font-display text-lg font-medium text-nebbia mb-2">{t}</h3>
                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{d}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          5. CASSA E CONTO ECONOMICO
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">Cassa e liquidita</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Entrate, uscite e liquidita{' '}
                            <span className="text-salvia">del cliente, a colpo d'occhio.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Registri entrate e uscite, ottieni il conto economico, pianifichi la liquidita a
                            dodici mesi e confronti budget e scostamenti. Tutto in euro, tutto dentro il mandato.
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Wallet}
                        title="Il conto economico di cassa, sempre aggiornato"
                        text="Ogni movimento registrato aggiorna il conto economico del cliente. Vedi entrate e uscite per categoria, il risultato del periodo, la liquidita disponibile e la proiezione a dodici mesi. Imposti un budget e Lexum ti mostra gli scostamenti man mano che l'anno avanza."
                        points={[
                            'Entrate e uscite per categoria',
                            'Conto economico e risultato di periodo',
                            'Pianificazione della liquidita a 12 mesi',
                            'Budget e scostamenti',
                        ]}
                        accent="salvia"
                        reverse
                    >
                        <VisualBlock label="Conto economico - Rossi srl" accent="salvia">
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { l: 'Entrate 2026', v: 'EUR 128.400', c: 'text-salvia' },
                                        { l: 'Uscite 2026', v: 'EUR 96.150', c: 'text-oro' },
                                        { l: 'Risultato', v: 'EUR 32.250', c: 'text-salvia' },
                                        { l: 'Liquidita', v: 'EUR 41.900', c: 'text-nebbia/70' },
                                    ].map(({ l, v, c }) => (
                                        <div key={l} className="bg-petrolio/50 border border-white/5 p-3">
                                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">{l}</p>
                                            <p className={`font-display text-lg font-light ${c}`}>{v}</p>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-2">Proiezione liquidita (12 mesi)</p>
                                    <div className="flex items-end gap-1 h-16">
                                        {[42, 38, 45, 51, 47, 53, 49, 58, 62, 57, 64, 70].map((h, i) => (
                                            <div key={i} className="flex-1 bg-salvia/20 border-t border-salvia/40" style={{ height: `${h}%` }} />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-salvia/5 border border-salvia/15">
                                    <PiggyBank size={11} className="text-salvia shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        Budget uscite rispettato: scostamento <span className="text-salvia">-3,2%</span> sul previsto.
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          6. CONTABILITA IN PARTITA DOPPIA
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel>Partita doppia</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Dalla registrazione{' '}
                            <span className="text-oro">al bilancio d'esercizio.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Piano dei conti italiano precaricato, libro giornale, imputazione automatica dei
                            movimenti, bilancio e conto economico, liquidazione IVA, bilancio di verifica e chiusura.
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Calculator}
                        title="Contabilita ordinaria completa, dentro il mandato"
                        text="Il piano dei conti in schema CEE e gia pronto. I movimenti di cassa vengono imputati automaticamente ai conti giusti e finiscono nel libro giornale. Da li Lexum costruisce lo stato patrimoniale e il conto economico, calcola la liquidazione IVA su base LIPE, produce il bilancio di verifica e ti accompagna nella chiusura d'esercizio."
                        points={[
                            'Piano dei conti italiano (schema CEE) precaricato',
                            'Libro giornale e imputazione automatica',
                            'Stato patrimoniale e conto economico',
                            'Liquidazione IVA, bilancio di verifica, chiusura',
                        ]}
                    >
                        <VisualBlock label="Libro giornale - registrazione">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                    <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Fattura acquisto n. 214</span>
                                    <span className="font-body text-[11px] text-nebbia/50">28/06/2026</span>
                                </div>
                                <div className="space-y-1.5">
                                    {[
                                        { conto: 'Energia elettrica', dare: '184,50', avere: '' },
                                        { conto: 'IVA a credito', dare: '40,59', avere: '' },
                                        { conto: 'Debiti v/fornitori', dare: '', avere: '225,09' },
                                    ].map(({ conto, dare, avere }) => (
                                        <div key={conto} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center p-2 bg-petrolio/50 border border-white/5">
                                            <span className="font-body text-[11px] text-nebbia/70 truncate">{conto}</span>
                                            <span className="font-body text-[11px] text-oro/80 w-16 text-right">{dare && `${dare}`}</span>
                                            <span className="font-body text-[11px] text-salvia/80 w-16 text-right">{avere && `${avere}`}</span>
                                        </div>
                                    ))}
                                    <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-2">
                                        <span className="font-body text-[9px] text-nebbia/25 uppercase tracking-widest">Conto</span>
                                        <span className="font-body text-[9px] text-oro/50 uppercase tracking-widest w-16 text-right">Dare</span>
                                        <span className="font-body text-[9px] text-salvia/50 uppercase tracking-widest w-16 text-right">Avere</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-oro/5 border border-oro/15">
                                    <Check size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        Partita quadrata. Imputazione automatica dal movimento di cassa.
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                    {/* Output contabili */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-16">
                        {[
                            { icon: Landmark, t: 'Stato patrimoniale', d: 'Attivo e passivo aggiornati dal giornale, pronti da consultare.' },
                            { icon: TrendingUp, t: 'Conto economico', d: 'Costi e ricavi per natura, risultato d\'esercizio in tempo reale.' },
                            { icon: Percent, t: 'Liquidazione IVA', d: 'IVA a debito e a credito su base LIPE, per periodo.' },
                            { icon: ScrollText, t: 'Verifica e chiusura', d: 'Bilancio di verifica e chiusura d\'esercizio guidata.' },
                        ].map(({ icon: Icon, t, d }, i) => (
                            <FadeIn key={i} delay={i * 0.06}>
                                <div className="bg-slate border border-white/5 p-5 h-full hover:border-oro/20 transition-colors">
                                    <div className="w-9 h-9 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro mb-3">
                                        <Icon size={15} />
                                    </div>
                                    <p className="font-body text-sm font-medium text-nebbia mb-1.5">{t}</p>
                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{d}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>

                    <FadeIn delay={0.2} className="mt-6">
                        <p className="font-body text-xs text-nebbia/25 text-center max-w-2xl mx-auto leading-relaxed">
                            Ammortamenti e ratei restano una scelta professionale: si registrano manualmente,
                            senza automatismi che ti tolgano il controllo.
                        </p>
                    </FadeIn>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          7. DIPENDENTI E COSTO DEL PERSONALE
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">Personale</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Il costo del personale{' '}
                            <span className="text-salvia">calcolato per intero.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Anagrafica dei dipendenti dei clienti con inquadramento completo e calcolo del
                            costo aziendale pieno, con aliquote per singolo dipendente.
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Users}
                        title="Dal lordo al costo aziendale, dipendente per dipendente"
                        text="Registri qualifica, tipo di contratto e CCNL applicato. Lexum calcola il costo aziendale pieno: retribuzione lorda, contributi INPS, premio INAIL e accantonamento TFR. Le aliquote sono impostabili per singolo dipendente, cosi il costo del lavoro del cliente e quello reale, non una stima."
                        points={[
                            'Anagrafica con qualifica, contratto e CCNL',
                            'Costo pieno: lordo, INPS, INAIL, TFR',
                            'Aliquote configurabili per dipendente',
                            'Totale costo del personale del cliente',
                        ]}
                        accent="salvia"
                        reverse
                    >
                        <VisualBlock label="Costo del personale - dipendente" accent="salvia">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                                    <div className="w-8 h-8 flex items-center justify-center border border-salvia/20 bg-salvia/5 text-salvia font-body text-[10px] font-medium shrink-0">
                                        MB
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-body text-xs text-nebbia/70">Marta Bianchi</p>
                                        <p className="font-body text-[10px] text-nebbia/30">Impiegata - CCNL Commercio - Tempo indeterminato</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {[
                                        { l: 'Retribuzione lorda', v: '28.000,00', c: 'text-nebbia/60' },
                                        { l: 'INPS c/azienda (30%)', v: '8.400,00', c: 'text-nebbia/50' },
                                        { l: 'INAIL', v: '336,00', c: 'text-nebbia/50' },
                                        { l: 'TFR', v: '2.074,00', c: 'text-nebbia/50' },
                                    ].map(({ l, v, c }) => (
                                        <div key={l} className="flex justify-between text-[11px]">
                                            <span className={`font-body ${c}`}>{l}</span>
                                            <span className={`font-body ${c}`}>EUR {v}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between pt-2 mt-1 border-t border-white/5">
                                        <span className="font-body text-xs text-nebbia/70">Costo aziendale pieno</span>
                                        <span className="font-body text-sm text-salvia font-medium">EUR 38.810,00</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-salvia/5 border border-salvia/15">
                                    <Users size={11} className="text-salvia shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        6 dipendenti in organico - costo del personale del cliente <span className="text-salvia">EUR 214.600</span>.
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          8. BANCA DATI E RICERCHE
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FeatureRow
                        icon={BookOpen}
                        title="Banca dati normativa e ricerche salvate nel mandato"
                        text="Accedi alla banca dati normativa e tributaria condivisa con la piattaforma legale. Cerchi con linguaggio naturale, salvi le ricerche che contano e le colleghi al mandato del cliente. Quando torni su quel cliente, hai gia sotto mano le fonti che avevi trovato."
                        points={[
                            'Banca dati normativa e tributaria',
                            'Aggiornamento settimanale al testo vigente',
                            'Ricerca con linguaggio naturale',
                            'Ricerche salvabili e collegate al mandato',
                        ]}
                    >
                        <VisualBlock label="Ricerca - Rossi srl">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 p-2.5 bg-petrolio/50 border border-white/5">
                                    <Search size={12} className="text-oro shrink-0" />
                                    <span className="font-body text-[11px] text-nebbia/60">detrazione IVA su spese di rappresentanza</span>
                                </div>
                                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Ricerche salvate nel mandato (3)</p>
                                <div className="space-y-1.5">
                                    {[
                                        { t: 'Art. 19-bis1 DPR 633/72 - indetraibilita', tag: 'IVA' },
                                        { t: 'Regime forfettario - limiti di ricavo 2026', tag: 'Redditi' },
                                        { t: 'Deducibilita spese di rappresentanza', tag: 'IRES' },
                                    ].map(({ t, tag }) => (
                                        <div key={t} className="flex items-center gap-2 p-2 bg-petrolio/50 border border-white/5">
                                            <BookOpen size={9} className="text-oro shrink-0" />
                                            <span className="font-body text-[11px] text-nebbia/65 flex-1 truncate">{t}</span>
                                            <span className="font-body text-[9px] px-1.5 py-0.5 bg-oro/10 border border-oro/25 text-oro/80 shrink-0">{tag}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-oro/5 border border-oro/15">
                                    <RefreshCw size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        Norme allineate <span className="text-oro/80">ogni settimana</span> al testo vigente. Ultimo aggiornamento: 3 giorni fa.
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                    {/* Aggiornamento settimanale - punto di forza dedicato */}
                    <FadeIn delay={0.25} className="mt-16">
                        <div className="bg-slate border border-oro/15 p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-oro/[0.04] rounded-full blur-3xl pointer-events-none" />

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-oro/20 bg-oro/5">
                                        <RefreshCw size={11} className="text-oro/70" />
                                        <span className="font-body text-[10px] text-oro/80 tracking-widest uppercase">Aggiornamento settimanale al testo vigente</span>
                                    </div>
                                    <h3 className="font-display text-2xl md:text-3xl font-light text-nebbia">
                                        Lavori sempre{' '}
                                        <span className="text-oro">sulla norma aggiornata.</span>
                                    </h3>
                                    <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                                        Il fisco cambia di continuo: manovre, decreti, circolari, proroghe. Ogni settimana
                                        allineiamo la banca dati al testo vigente, cosi quando consulti una norma o Lex AI
                                        ti risponde, la versione e quella in vigore, non quella dell'anno scorso.
                                    </p>
                                    <ul className="space-y-2 pt-2">
                                        {[
                                            'Leggi e norme fiscali allineate al vigente',
                                            'Ciclo di aggiornamento settimanale',
                                            'Versioni superate segnalate, non confuse con le attuali',
                                            'Lex AI risponde sulla base del testo aggiornato',
                                        ].map((p, i) => (
                                            <li key={i} className="flex items-center gap-2 font-body text-xs text-nebbia/40">
                                                <div className="w-1 h-1 bg-oro rounded-full shrink-0" />
                                                {p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <VisualBlock label="Stato aggiornamento banca dati">
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                            <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Ultimo allineamento</span>
                                            <span className="font-body text-[11px] px-2 py-0.5 bg-oro/10 border border-oro/25 text-oro/80">3 giorni fa</span>
                                        </div>
                                        {[
                                            { t: 'DPR 633/72 - Testo IVA', s: 'Vigente' },
                                            { t: 'TUIR - DPR 917/86', s: 'Vigente' },
                                            { t: 'Legge di Bilancio 2026', s: 'Vigente' },
                                            { t: 'D.Lgs. 471/97 - Sanzioni', s: 'Aggiornato' },
                                        ].map(({ t, s }) => (
                                            <div key={t} className="flex items-center gap-2 p-2 bg-petrolio/50 border border-white/5">
                                                <ScrollText size={10} className="text-oro shrink-0" />
                                                <span className="font-body text-[11px] text-nebbia/65 flex-1 truncate">{t}</span>
                                                <span className="flex items-center gap-1 font-body text-[9px] text-salvia/80 shrink-0">
                                                    <Check size={9} /> {s}
                                                </span>
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-2 p-2.5 bg-oro/5 border border-oro/15 mt-2">
                                            <RefreshCw size={11} className="text-oro shrink-0" />
                                            <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                                Prossimo ciclo di aggiornamento tra <span className="text-oro/80">4 giorni</span>.
                                            </p>
                                        </div>
                                    </div>
                                </VisualBlock>
                            </div>
                        </div>
                    </FadeIn>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          9. STUDIO COLLABORATIVO E SICUREZZA
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">Studio e sicurezza</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Uno studio collaborativo,{' '}
                            <span className="text-salvia">dati al sicuro.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Gestisci lo studio con i tuoi collaboratori, ognuno con il suo ruolo. I dati sono
                            isolati per studio e la riservatezza e al centro di ogni decisione tecnica.
                        </p>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            {
                                icon: Users,
                                t: 'Collaboratori e ruoli',
                                d: 'Titolare, collaboratori e praticanti lavorano sugli stessi mandati con permessi differenziati. Tu decidi chi vede quali clienti e cosa puo modificare.',
                            },
                            {
                                icon: Shield,
                                t: 'Dati isolati per studio',
                                d: 'Ogni studio e un ambiente a se. I dati dei tuoi clienti non sono mai accessibili ad altri studi, ne ai collaboratori senza il tuo permesso esplicito.',
                            },
                            {
                                icon: ShieldCheck,
                                t: 'Riservatezza come standard',
                                d: 'La protezione dei dati fiscali e contabili dei clienti non e un optional di marketing: e progettata al centro della piattaforma.',
                            },
                            {
                                icon: ClipboardList,
                                t: 'Tracciabilita delle operazioni',
                                d: 'Ogni accesso e ogni modifica vengono registrati. Sai sempre chi ha fatto cosa e quando, come strumento di governance interna dello studio.',
                            },
                        ].map(({ icon: Icon, t, d }, i) => (
                            <FadeIn key={i} delay={i * 0.06}>
                                <div className="bg-slate border border-white/5 p-5 h-full hover:border-salvia/20 transition-colors">
                                    <div className="w-9 h-9 flex items-center justify-center border border-salvia/20 bg-salvia/5 text-salvia mb-3">
                                        <Icon size={15} />
                                    </div>
                                    <p className="font-body text-sm font-medium text-nebbia mb-1.5">{t}</p>
                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{d}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          10. CTA FINALE
      ══════════════════════════════════════════ */}
            <section className="py-28 px-6 border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-oro/[0.05] rounded-full blur-3xl" />
                </div>

                <div className="max-w-3xl mx-auto text-center relative">
                    <FadeIn>
                        <SectionLabel>Inizia ora</SectionLabel>
                        <h2 className="font-display text-4xl md:text-5xl font-light text-nebbia mb-6">
                            Porta lo studio{' '}
                            <span className="text-oro">dentro Lexum.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/45 leading-relaxed mb-10 max-w-xl mx-auto">
                            Registrati e inizia dal primo cliente. La verifica della professione conferma
                            che sei un commercialista e abilita l'ambiente completo dello studio.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                            <Link to="/registrati" className="flex items-center gap-2.5 px-10 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-xl shadow-oro/20">
                                Inizia ora <ArrowRight size={15} />
                            </Link>
                            <Link to="/abbonamenti" className="flex items-center gap-2 px-10 py-4 border border-salvia/30 bg-salvia/5 text-salvia font-body text-sm hover:bg-salvia/10 hover:border-salvia/50 transition-colors">
                                Vedi i piani
                            </Link>
                        </div>
                        <p className="font-body text-xs text-nebbia/25">
                            Registrazione con verifica della professione. Nessuna carta richiesta.
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
