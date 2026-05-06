// src/pages/PerAvvocati.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowRight, BookOpen, TrendingUp, Users, Sparkles,
    Shield, Check, ChevronDown, Brain, Star, Zap, Lock,
    FileText, FileSignature, Calendar, FolderOpen, Search,
    Eye, EyeOff, UserCheck, Briefcase, CreditCard,
    Bookmark, FolderSearch, Scale, ShieldCheck, Activity,
    Library,
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
export default function PerAvvocati() {
    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <Helmet>
                <title>Lexum per Studi Legali — Tutto il lavoro dello studio in un unico ambiente</title>
                <meta
                    name="description"
                    content="Gestionale, calendario, archivio intelligente, Lex AI, banca dati condivisa e collaborazione di team. Tutto cio che serve a uno studio legale, in un ambiente coerente."
                />
                <link rel="canonical" href="https://www.lexum.it/per-avvocati" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.lexum.it/per-avvocati" />
                <meta property="og:title" content="Lexum per Studi Legali" />
                <meta
                    property="og:description"
                    content="Tutto cio che serve a uno studio legale, in un ambiente coerente. Gestionale, AI, archivio, collaborazione di team."
                />
                <meta property="og:image" content="https://www.lexum.it/logo.png" />
                <meta property="og:locale" content="it_IT" />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Lexum per Studi Legali" />
                <meta
                    name="twitter:description"
                    content="Tutto cio che serve a uno studio legale, in un ambiente coerente."
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
                        <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">Per studi legali e avvocati</span>
                    </div>

                    <h1 className="font-display text-5xl md:text-7xl font-light text-nebbia leading-[1.1] mb-6">
                        Tutto il lavoro dello studio,<br />
                        <span className="text-oro-shimmer">in un unico ambiente.</span>
                    </h1>

                    <p className="font-body text-base md:text-lg text-nebbia/45 leading-relaxed max-w-2xl mx-auto mb-10">
                        Gestionale, calendario, archivio intelligente, Lex AI, banca dati condivisa e
                        collaborazione di team. Tutto connesso, tutto al posto giusto, sempre.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                        <Link to="/registrati" className="flex items-center gap-2.5 px-8 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-lg shadow-oro/20">
                            Prova Lexum una settimana <ArrowRight size={15} />
                        </Link>
                        <Link to="/registrati" className="flex items-center gap-2 px-8 py-4 border border-salvia/30 bg-salvia/5 text-salvia font-body text-sm hover:bg-salvia/10 hover:border-salvia/50 transition-colors">
                            Richiedi una call dimostrativa
                        </Link>
                    </div>

                    <p className="font-body text-xs text-nebbia/25 max-w-lg mx-auto">
                        Nessuna carta richiesta. Cancellazione libera.
                    </p>
                </div>

                <a href="#multi-accesso" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-nebbia/20 animate-bounce">
                    <ChevronDown size={20} />
                </a>
            </section>

            {/* ══════════════════════════════════════════
          2. MULTI-ACCESSO E GESTIONE STUDIO
      ══════════════════════════════════════════ */}
            <section id="multi-accesso" className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel>Multi-accesso</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Gestisci lo studio,{' '}
                            <span className="text-oro">scegli chi vede cosa.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Compartimentazione delle informazioni, ruoli granulari, accesso controllato.
                            L'archivio dello studio resta visibile solo a chi decidi tu.
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Users}
                        title="Lo studio resta tuo. Tu decidi chi vede cosa."
                        text="Ogni membro dello studio ha il suo profilo. Tu scegli chi accede all'archivio completo e chi vede solo le pratiche assegnate. Le informazioni sensibili restano protette, anche all'interno del team."
                        points={[
                            'Ruoli e permessi configurabili',
                            'Visibilita pratiche per singolo membro',
                            'Compartimentazione archivio dello studio',
                            'Audit interno: chi ha visto cosa, chi ha modificato cosa',
                        ]}
                    >
                        <VisualBlock label="Studio - Membri e permessi">
                            <div className="space-y-2">
                                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-3">Team studio</p>
                                {[
                                    { nome: 'Marco Rossi', ruolo: 'Titolare', avatar: 'MR', accesso: 'Tutto', accessoColor: 'oro' },
                                    { nome: 'Laura Bianchi', ruolo: 'Socio senior', avatar: 'LB', accesso: 'Tutto', accessoColor: 'oro' },
                                    { nome: 'Andrea Verdi', ruolo: 'Avvocato', avatar: 'AV', accesso: 'Solo pratiche assegnate', accessoColor: 'salvia' },
                                    { nome: 'Giulia Neri', ruolo: 'Segreteria', avatar: 'GN', accesso: 'Anagrafiche e calendario', accessoColor: 'salvia' },
                                ].map(({ nome, ruolo, avatar, accesso, accessoColor }) => (
                                    <div key={nome} className="flex items-center gap-3 p-2.5 bg-petrolio/50 border border-white/5">
                                        <div className="w-8 h-8 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro font-body text-[10px] font-medium shrink-0">
                                            {avatar}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-body text-xs text-nebbia/70 truncate">{nome}</p>
                                            <p className="font-body text-[10px] text-nebbia/30">{ruolo}</p>
                                        </div>
                                        <span className={`font-body text-[10px] px-2 py-0.5 border shrink-0 ${accessoColor === 'oro'
                                            ? 'bg-oro/10 border-oro/25 text-oro/80'
                                            : 'bg-salvia/10 border-salvia/25 text-salvia/80'
                                            }`}>
                                            {accesso}
                                        </span>
                                    </div>
                                ))}
                                <div className="flex items-center gap-2 p-2.5 bg-oro/5 border border-oro/15 mt-2">
                                    <ShieldCheck size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        Compartimentazione attiva: 4 membri, 2 livelli di accesso, 12 pratiche segmentate.
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          3. COLLABORAZIONE SULLA PRATICA
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">Collaborazione</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Tutti possono contribuire{' '}
                            <span className="text-salvia">alla riuscita del caso.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Sulla stessa pratica lavorano piu avvocati. Ognuno ha le sue ricerche, ognuno
                            porta il suo contributo. La pratica cresce in modo collettivo, senza confondere chi ha fatto cosa.
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={UserCheck}
                        title="Una pratica, piu avvocati, ricerche separate ma collegate"
                        text="Ogni membro assegnato alla pratica vede il quadro complessivo, ma le sue ricerche restano sue. Quando ne salva una, puo collegarla alla pratica e renderla disponibile a tutto il team. Lex AI legge tutte le ricerche del caso e suggerisce direzioni che nessuno aveva ancora considerato."
                        points={[
                            'Avvocati assegnati alla pratica',
                            'Ricerche personali, contributi collettivi',
                            'Lex AI legge tutto il caso e suggerisce',
                            'Visibilita completa per il titolare',
                        ]}
                        reverse
                    >
                        <VisualBlock label="Pratica 2026/047 - Mario Rossi" accent="salvia">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                    <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Avvocati assegnati</span>
                                    <span className="font-body text-[10px] text-salvia">3 membri</span>
                                </div>
                                <div className="flex gap-2">
                                    {['MR', 'LB', 'AV'].map((a, i) => (
                                        <div key={a} className={`w-7 h-7 flex items-center justify-center border text-[10px] font-medium ${i === 0 ? 'bg-oro/10 border-oro/25 text-oro' : 'bg-salvia/10 border-salvia/25 text-salvia'
                                            }`}>{a}</div>
                                    ))}
                                    <span className="font-body text-[10px] text-nebbia/30 self-center ml-1">Marco (titolare), Laura, Andrea</span>
                                </div>

                                <div className="pt-3 border-t border-white/5">
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-2">Ricerche del caso (5)</p>
                                    <div className="space-y-1.5">
                                        {[
                                            { t: 'Art. 1578 c.c. - vizi cosa locata', autore: 'MR', accent: 'oro' },
                                            { t: 'Cass. 4439/2024 - inadempimento locatore', autore: 'LB', accent: 'salvia' },
                                            { t: 'Eccezione parziale inadempimento', autore: 'LB', accent: 'salvia' },
                                            { t: 'Art. 1453 c.c. - risoluzione', autore: 'AV', accent: 'salvia' },
                                        ].map(({ t, autore, accent }) => (
                                            <div key={t} className="flex items-center gap-2 p-2 bg-petrolio/50 border border-white/5">
                                                <Bookmark size={9} className={accent === 'oro' ? 'text-oro' : 'text-salvia'} />
                                                <span className="font-body text-[11px] text-nebbia/65 flex-1 truncate">{t}</span>
                                                <span className={`font-body text-[9px] px-1.5 py-0.5 border ${accent === 'oro' ? 'bg-oro/10 border-oro/25 text-oro/80' : 'bg-salvia/10 border-salvia/25 text-salvia/80'
                                                    }`}>{autore}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 p-2.5 bg-salvia/5 border border-salvia/15 mt-2">
                                    <Sparkles size={11} className="text-salvia shrink-0 mt-0.5" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        Lex ha analizzato tutte le ricerche. Suggerisce di approfondire <span className="text-salvia">art. 1587 c.c.</span> sull'obbligo di custodia del conduttore.
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          4. CALENDARIO E APPUNTAMENTI
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FeatureRow
                        icon={Calendar}
                        title="Calendario integrato per appuntamenti, udienze e scadenze"
                        text="Un unico calendario per lo studio. Vedi le tue udienze, gli appuntamenti con i clienti, le scadenze processuali, gli impegni del team. Ogni evento e collegato alla pratica di riferimento, con il contesto sempre a portata di mano."
                        points={[
                            'Vista personale, di team e di studio',
                            'Eventi collegati alle pratiche',
                            'Scadenze processuali e promemoria',
                            'Sincronizzazione con calendari esterni',
                        ]}
                    >
                        <VisualBlock label="Calendario - Settimana corrente">
                            <div className="space-y-2.5">
                                <div className="grid grid-cols-7 gap-1 mb-3">
                                    {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((g, i) => (
                                        <div key={i} className={`text-center font-body text-[10px] py-1 ${i === 2 ? 'bg-oro/15 text-oro' : 'text-nebbia/30'}`}>
                                            <div className="uppercase">{g}</div>
                                            <div className="text-nebbia/50 text-[11px] font-medium mt-0.5">{18 + i}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-1.5">
                                    {[
                                        { ora: '09:00', t: 'Udienza - Trib. Milano', sub: 'Mario Rossi - Pen.', col: 'oro' },
                                        { ora: '11:30', t: 'Appuntamento - L. Verdi', sub: 'Pratica 2026/051', col: 'salvia' },
                                        { ora: '14:30', t: 'Scadenza memoria difensiva', sub: 'Rossi vs ACME', col: 'oro' },
                                        { ora: '16:00', t: 'Call interna - Team civile', sub: 'Revisione casi', col: 'salvia' },
                                    ].map(({ ora, t, sub, col }) => (
                                        <div key={t} className="flex items-center gap-3 p-2 bg-petrolio/50 border border-white/5">
                                            <div className={`font-body text-[10px] font-medium px-1.5 py-0.5 border shrink-0 ${col === 'oro' ? 'bg-oro/10 border-oro/25 text-oro/80' : 'bg-salvia/10 border-salvia/25 text-salvia/80'
                                                }`}>{ora}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-body text-[11px] text-nebbia/70 truncate">{t}</p>
                                                <p className="font-body text-[10px] text-nebbia/30">{sub}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          5. GESTIONALE CLIENTI E PAGAMENTI
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FeatureRow
                        icon={Briefcase}
                        title="Anagrafica cliente e storico pagamenti, sempre aggiornati"
                        text="Per ogni cliente vedi le pratiche aperte e chiuse, le fatture emesse, i pagamenti ricevuti e quelli in sospeso. Niente piu fogli Excel paralleli o mail da rincorrere: tutto in un unico posto, collegato al lavoro che hai fatto."
                        points={[
                            'Anagrafica clienti completa',
                            'Pratiche associate al cliente',
                            'Storico pagamenti e fatture',
                            'Note e comunicazioni archiviate',
                        ]}
                        reverse
                    >
                        <VisualBlock label="Cliente - Mario Rossi">
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    {[
                                        { l: 'Tipo', v: 'Privato' },
                                        { l: 'Pratiche aperte', v: '2', c: 'text-oro' },
                                        { l: 'Fatturato 2026', v: 'EUR 4.200,00', c: 'text-salvia' },
                                        { l: 'Da incassare', v: 'EUR 1.100,00', c: 'text-oro' },
                                    ].map(({ l, v, c }) => (
                                        <div key={l} className="flex justify-between py-1.5 border-b border-white/5">
                                            <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{l}</span>
                                            <span className={`font-body text-xs ${c || 'text-nebbia/70'}`}>{v}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2">
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-2">Pagamenti recenti</p>
                                    <div className="space-y-1.5">
                                        {[
                                            { d: '12/03/2026', t: 'Acconto pratica 2026/047', i: '1.500,00', stato: 'pagato' },
                                            { d: '28/02/2026', t: 'Onorario consulenza', i: '600,00', stato: 'pagato' },
                                            { d: '15/02/2026', t: 'Saldo pratica 2025/118', i: '1.100,00', stato: 'in_sospeso' },
                                        ].map(({ d, t, i, stato }) => (
                                            <div key={d + t} className="flex items-center gap-2 p-2 bg-petrolio/50 border border-white/5">
                                                <CreditCard size={10} className={stato === 'pagato' ? 'text-salvia' : 'text-oro'} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-body text-[11px] text-nebbia/70 truncate">{t}</p>
                                                    <p className="font-body text-[10px] text-nebbia/30">{d}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-body text-[11px] text-nebbia/70">EUR {i}</p>
                                                    <p className={`font-body text-[9px] uppercase tracking-widest ${stato === 'pagato' ? 'text-salvia/70' : 'text-oro/70'}`}>
                                                        {stato === 'pagato' ? 'Pagato' : 'In sospeso'}
                                                    </p>
                                                </div>
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
          6. ARCHIVIO INTELLIGENTE
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FeatureRow
                        icon={FolderSearch}
                        title="L'archivio dello studio diventa intelligente"
                        text="Carichi i documenti, Lex AI li classifica e li ritrova quando servono. Cerchi con linguaggio naturale e trovi non solo il file giusto, ma anche il punto preciso del documento che ti interessa. La carta resta in cassettiera, il lavoro vero resta digitale."
                        points={[
                            'Documenti collegati alle pratiche',
                            'Ricerca semantica nel testo',
                            'Classificazione automatica',
                            'Versionamento e tracciamento modifiche',
                        ]}
                    >
                        <VisualBlock label="Ricerca nell'archivio">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-3 py-2 bg-petrolio border border-oro/15">
                                    <Search size={11} className="text-oro/60 shrink-0" />
                                    <span className="font-body text-xs text-nebbia/70 flex-1">contratto locazione 2024</span>
                                    <button className="font-body text-[10px] px-2 py-1 bg-oro/10 border border-oro/30 text-oro uppercase tracking-widest shrink-0">
                                        Cerca
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <div className="bg-petrolio border border-salvia/15 p-3">
                                        <div className="flex items-start gap-2.5">
                                            <FileText size={12} className="text-salvia mt-0.5 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-body text-xs text-nebbia/70 mb-0.5 truncate">Contratto_locazione_Rossi.pdf</p>
                                                <p className="font-body text-[10px] text-nebbia/35 leading-relaxed">"...il presente contratto avra durata di 4+4 anni a partire dal 01/09/2024, con canone mensile di EUR 1.200..."</p>
                                                <div className="flex gap-1 mt-2 flex-wrap">
                                                    <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">Pratica 2026/047</span>
                                                    <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">Locazione</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-petrolio border border-white/8 p-3">
                                        <div className="flex items-start gap-2.5">
                                            <FileText size={12} className="text-nebbia/40 mt-0.5 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-body text-xs text-nebbia/70 mb-0.5 truncate">Diffida_locatore_2024-11.pdf</p>
                                                <p className="font-body text-[10px] text-nebbia/35 leading-relaxed">"...si invita il locatore alla risoluzione delle problematiche evidenziate nel contratto del 01/09/2024..."</p>
                                                <div className="flex gap-1 mt-2 flex-wrap">
                                                    <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">Pratica 2026/047</span>
                                                    <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">Diffida</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

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

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">Intelligenza artificiale</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Un assistente che lavora{' '}
                            <span className="text-salvia">sui tuoi materiali.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Lex non e una chat generica. E un assistente che conosce le tue pratiche,
                            le tue ricerche e l'intero contesto del lavoro legale italiano.
                        </p>
                    </FadeIn>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                        <FadeIn delay={0.1}>
                            <div className="space-y-3">
                                {[
                                    { icon: Search, t: 'Ricerca legale intelligente', d: 'Cerca su norme, sentenze e prassi con linguaggio naturale. Lex capisce il contesto e suggerisce i risultati piu rilevanti.' },
                                    { icon: Scale, t: 'Strategie processuali', d: 'Analizza il caso e propone strategie concrete, eccezioni da sollevare e argomenti da sviluppare in udienza.' },
                                    { icon: Brain, t: 'Conversazione continua', d: 'Approfondisci, cambia angolazione, chiedi follow-up. Lex ricorda il contesto della conversazione.' },
                                    { icon: Sparkles, t: 'Strategia su misura per la pratica', d: 'Legge tutte le ricerche e i materiali della pratica e genera una strategia personalizzata.' },
                                    { icon: BookOpen, t: 'Sentenze correlate', d: 'Suggerisce quali sentenze della banca dati vale la pena consultare in base al tuo caso specifico.' },
                                    { icon: FileSignature, t: 'Atti gia compilati', d: 'Diffide, comparse, istanze, precetti. Lex compila i template con i dati della pratica e produce atti pronti per la revisione.' },
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
                            <VisualBlock label="Lex AI - Conversazione" accent="salvia">
                                <div className="space-y-3">
                                    <div className="flex justify-end">
                                        <div className="max-w-[85%] bg-petrolio/60 border border-white/5 p-3">
                                            <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                Stiamo lavorando alla pratica Rossi sulla locazione, qual'è la strategia migliore per la prossima udienza?
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <div className="max-w-[90%] bg-salvia/5 border border-salvia/15 p-3 space-y-2">
                                            <p className="font-body text-xs text-salvia/80 font-medium flex items-center gap-1">
                                                <Sparkles size={10} /> Lex AI
                                            </p>
                                            <p className="font-body text-xs text-nebbia/55 leading-relaxed">
                                                Ho letto tutte e 12 le ricerche del caso, ognuna si è rivelata molto utile e completa, approccia il caso da prospettive diverse... molto utile! Ho trovato alcuni articoli ed una sentenza del 2007 che ci sarà d'aiuto. Unisco tutto per un'analisi completa. La strada piu solida e l'eccezione di parziale inadempimento del locatore (art. 1578 c.c.), gia approfondita da Laura. Suggerisco di rafforzarla con l'art. 1587 c.c. sulla custodia del conduttore. Ho preparato una bozza di memoria difensiva pronta per la tua revisione.
                                            </p>
                                            <div className="flex gap-1 pt-1 flex-wrap">
                                                <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">Art. 1578 c.c.</span>
                                                <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">Art. 1587 c.c.</span>
                                                <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/10 border border-salvia/25 text-salvia/80">Memoria.docx</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </VisualBlock>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
          8. BANCA DATI CONDIVISA (cenno breve)
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FeatureRow
                        icon={BookOpen}
                        title="Una banca dati gratis, sempre disponibile"
                        text="Oltre 4 milioni di documenti giuridici tra giurisprudenza italiana, normativa nazionale e UE, prassi e corpus condiviso dagli avvocati. Aperta a chiunque, senza abbonamenti per area, senza limiti di consultazione. La consulti dal primo giorno, e Lex AI ti aiuta a trovare quello che cerchi."
                        points={[
                            'Oltre 4 milioni di documenti',
                            'Aggiornata in modo continuo',
                            'Ricerca con linguaggio naturale',
                        ]}
                        reverse
                    >
                        <VisualBlock label="Banca dati Lexum">
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { v: 'Giurisprudenza italiana' },
                                        { v: 'Normativa italiana' },
                                        { v: 'Diritto UE' },
                                        { v: 'Prassi e corpus' },
                                    ].map(({ v, l }) => (
                                        <div key={l} className="bg-petrolio/50 border border-white/5 p-3">
                                            <p className="font-display text-xl font-light text-oro-static mb-0.5">{v}</p>
                                            <p className="font-body text-[10px] text-nebbia/35 leading-snug">{l}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 p-2.5 bg-oro/5 border border-oro/15">
                                    <Library size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        Aperta a chiunque, gratis. Lavoriamo in modo continuo per ampliare e aggiornare le fonti.
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          9. MONETIZZAZIONE ARCHIVIO LEGALE
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel>Monetizzazione</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Il tuo archivio diventa{' '}
                            <span className="text-oro">una risorsa attiva.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Le sentenze che hai gia lavorato, anonimizzate e pubblicate, fanno crescere il sapere
                            collettivo della professione. E ti restituiscono valore economico ogni volta che
                            vengono consultate.
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={TrendingUp}
                        title="Anonimizzi, pubblichi, monetizzi"
                        text="Selezioni le sentenze che possono avere valore per altri professionisti. Lexum ti aiuta nell'anonimizzazione. Le pubblichi nella banca dati. Quando un altro avvocato le acquista, una quota va al tuo studio. Il lavoro gia fatto continua a produrre valore nel tempo."
                        points={[
                            'Selezione libera dei contenuti da pubblicare',
                            'Supporto all\'anonimizzazione',
                            'Quota sulle consultazioni',
                            'Visibilita professionale aumentata',
                        ]}
                    >
                        <VisualBlock label="Le tue sentenze pubblicate">
                            <div className="space-y-2">
                                {[
                                    { t: 'Responsabilita medica - errore diagnostico', n: '12 acquisti', q: 'EUR 80,00' },
                                    { t: 'Locazione - inadempimento locatore', n: '8 acquisti', q: 'EUR 110,00' },
                                    { t: 'Omicidio stradale - revoca patente', n: '5 acquisti', q: 'EUR 45,00' },
                                ].map(({ t, n, q }) => (
                                    <div key={t} className="flex items-center gap-3 p-3 bg-petrolio/50 border border-white/5">
                                        <FileText size={12} className="text-oro shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-body text-xs text-nebbia/70 truncate">{t}</p>
                                            <p className="font-body text-[10px] text-nebbia/30">{n}</p>
                                        </div>
                                        <span className="font-body text-xs text-oro font-medium shrink-0">{q}</span>
                                    </div>
                                ))}
                                <div className="flex items-center justify-between p-3 bg-oro/5 border border-oro/15 mt-2">
                                    <span className="font-body text-xs text-nebbia/55">Totale ricavi 2026</span>
                                    <span className="font-body text-sm text-oro font-medium">EUR 235,00</span>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          10. SICUREZZA E RISERVATEZZA
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">Sicurezza</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            Riservatezza{' '}
                            <span className="text-salvia">come standard, non come opzione.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            Il lavoro legale richiede protezioni reali, non promesse di marketing.
                            Lexum e progettato con la riservatezza al centro di ogni decisione tecnica.
                        </p>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            {
                                icon: ShieldCheck,
                                t: 'Compartimentazione dati',
                                d: 'Ogni studio e isolato. I tuoi dati non sono mai accessibili ad altri studi, ne agli altri membri del tuo team senza il tuo permesso esplicito.',
                            },
                            {
                                icon: EyeOff,
                                t: 'Anonimizzazione prima della pubblicazione',
                                d: 'Prima che una sentenza diventi pubblica nella banca dati, i dati sensibili vengono rimossi. Lexum supporta il processo, ma il controllo finale resta tuo.',
                            },
                            {
                                icon: Activity,
                                t: 'Audit log completo',
                                d: 'Ogni accesso, ogni modifica, ogni operazione viene registrata. Sai sempre chi ha fatto cosa, quando e dove. Trasparenza interna come strumento di governance.',
                            },
                            {
                                icon: FileText,
                                t: 'PDF in sola visualizzazione',
                                d: 'I documenti della banca dati condivisa sono accessibili in formato digitale tramite link firmati. Non scaricabili, non ridistribuibili senza autorizzazione.',
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
          11. CTA FINALE
      ══════════════════════════════════════════ */}
            <section className="py-28 px-6 border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-oro/[0.05] rounded-full blur-3xl" />
                </div>

                <div className="max-w-3xl mx-auto text-center relative">
                    <FadeIn>
                        <SectionLabel>Inizia ora</SectionLabel>
                        <h2 className="font-display text-4xl md:text-5xl font-light text-nebbia mb-6">
                            Vedi Lexum{' '}
                            <span className="text-oro">al lavoro nel tuo studio.</span>
                        </h2>
                        <p className="font-body text-base text-nebbia/45 leading-relaxed mb-10 max-w-xl mx-auto">
                            Prova Lexum, senza vincoli. Oppure prenota una call dimostrativa
                            e ti mostriamo come funziona partendo dal lavoro reale del tuo studio.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                            <Link to="/registrati" className="flex items-center gap-2.5 px-10 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-xl shadow-oro/20">
                                Prova Lexum una settimana <ArrowRight size={15} />
                            </Link>
                            <Link to="/registrati" className="flex items-center gap-2 px-10 py-4 border border-salvia/30 bg-salvia/5 text-salvia font-body text-sm hover:bg-salvia/10 hover:border-salvia/50 transition-colors">
                                Richiedi una call dimostrativa
                            </Link>
                        </div>
                        <p className="font-body text-xs text-nebbia/25">
                            Nessuna carta richiesta. Cancellazione libera in qualsiasi momento.
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