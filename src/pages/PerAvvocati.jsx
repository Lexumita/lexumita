// src/pages/PerAvvocati.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import ArchivioRicercaAnimatedDemo from '@/components/ArchivioRicercaAnimatedDemo'
import {
    ArrowRight, BookOpen, TrendingUp, Users, Sparkles,
    Shield, Check, ChevronDown, Brain, Star, Zap, Lock,
    FileText, FileSignature, Calendar, FolderOpen, Search,
    Eye, EyeOff, UserCheck, Briefcase, CreditCard,
    Bookmark, FolderSearch, Scale, ShieldCheck, Activity,
    Library, Receipt,
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useTranslation, Trans } from 'react-i18next'

// Valori tecnici legati per POSIZIONE agli elenchi di per_avvocati.json
const COLORI_MEMBRI = ['oro', 'oro', 'salvia', 'salvia']
const ACCENTI_RICERCHE = ['oro', 'salvia', 'salvia', 'salvia']
const COLORI_EVENTI = ['oro', 'salvia', 'oro', 'salvia']
const COLORI_RIGHE_CLIENTE = [undefined, 'text-oro', 'text-salvia', 'text-oro']
const STATI_PAGAMENTI = ['pagato', 'pagato', 'in_sospeso']
const ICONE_LEX = [Search, Scale, Brain, Sparkles, BookOpen, FileSignature]
const COLORI_TOTALI = ['text-nebbia/55', 'text-nebbia/50', 'text-nebbia/50', 'text-nebbia/50']
const APERTI_PARZIALI = [false, false, true]
const ICONE_SICUREZZA = [ShieldCheck, EyeOff, Activity, FileText]

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
    const { t } = useTranslation('per_avvocati')
    const lista = (k) => t(k, { returnObjects: true })

    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <Helmet>
                <title>{t('meta.title')}</title>
                <meta
                    name="description"
                    content={t('meta.description')}
                />
                <link rel="canonical" href="https://www.lexum.it/per-avvocati" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.lexum.it/per-avvocati" />
                <meta property="og:title" content={t('meta.og_title')} />
                <meta
                    property="og:description"
                    content={t('meta.og_description')}
                />
                <meta property="og:image" content="https://www.lexum.it/logo.png" />
                <meta property="og:locale" content="it_IT" />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={t('meta.twitter_title')} />
                <meta
                    name="twitter:description"
                    content={t('meta.twitter_description')}
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
                        <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">{t('hero.badge')}</span>
                    </div>

                    <h1 className="font-display text-5xl md:text-7xl font-light text-nebbia leading-[1.1] mb-6">
                        <Trans t={t} i18nKey="hero.title"
                            components={{ br: <br />, hl: <span className="text-oro-shimmer" /> }} />
                    </h1>

                    <p className="font-body text-base md:text-lg text-nebbia/45 leading-relaxed max-w-2xl mx-auto mb-10">
                        {t('hero.subtitle')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                        <Link to="/registrati" className="flex items-center gap-2.5 px-8 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-lg shadow-oro/20">
                            {t('hero.cta_primary')}{' '}<ArrowRight size={15} />
                        </Link>
                        <Link to="/registrati" className="flex items-center gap-2 px-8 py-4 border border-salvia/30 bg-salvia/5 text-salvia font-body text-sm hover:bg-salvia/10 hover:border-salvia/50 transition-colors">
                            {t('hero.cta_secondary')}
                        </Link>
                    </div>

                    <p className="font-body text-xs text-nebbia/25 max-w-lg mx-auto">
                        {t('hero.no_card')}
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
                        <SectionLabel>{t('multi_accesso.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            <Trans t={t} i18nKey="multi_accesso.title"
                                components={{ hl: <span className="text-oro" /> }} />
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('multi_accesso.subtitle')}
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Users}
                        title={t('multi_accesso.feature_title')}
                        text={t('multi_accesso.feature_text')}
                        points={lista('multi_accesso.points')}
                    >
                        <VisualBlock label={t('multi_accesso.visual_label')}>
                            <div className="space-y-2">
                                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-3">{t('multi_accesso.team_label')}</p>
                                {lista('multi_accesso.members').map(({ nome, ruolo, avatar, accesso }, i) => (
                                    <div key={nome} className="flex items-center gap-3 p-2.5 bg-petrolio/50 border border-white/5">
                                        <div className="w-8 h-8 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro font-body text-[10px] font-medium shrink-0">
                                            {avatar}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-body text-xs text-nebbia/70 truncate">{nome}</p>
                                            <p className="font-body text-[10px] text-nebbia/30">{ruolo}</p>
                                        </div>
                                        <span className={`font-body text-[10px] px-2 py-0.5 border shrink-0 ${COLORI_MEMBRI[i] === 'oro'
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
                                        {t('multi_accesso.note')}
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
                        <SectionLabel color="salvia">{t('collaborazione.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            <Trans t={t} i18nKey="collaborazione.title"
                                components={{ hl: <span className="text-salvia" /> }} />
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('collaborazione.subtitle')}
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={UserCheck}
                        title={t('collaborazione.feature_title')}
                        text={t('collaborazione.feature_text')}
                        points={lista('collaborazione.points')}
                        reverse
                    >
                        <VisualBlock label={t('collaborazione.visual_label')} accent="salvia">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                    <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('collaborazione.assigned_label')}</span>
                                    <span className="font-body text-[10px] text-salvia">{t('collaborazione.assigned_count')}</span>
                                </div>
                                <div className="flex gap-2">
                                    {lista('collaborazione.avatars').map((a, i) => (
                                        <div key={a} className={`w-7 h-7 flex items-center justify-center border text-[10px] font-medium ${i === 0 ? 'bg-oro/10 border-oro/25 text-oro' : 'bg-salvia/10 border-salvia/25 text-salvia'
                                            }`}>{a}</div>
                                    ))}
                                    <span className="font-body text-[10px] text-nebbia/30 self-center ml-1">{t('collaborazione.assigned_names')}</span>
                                </div>

                                <div className="pt-3 border-t border-white/5">
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-2">{t('collaborazione.research_label')}</p>
                                    <div className="space-y-1.5">
                                        {lista('collaborazione.research').map(({ titolo, autore }, i) => (
                                            <div key={titolo} className="flex items-center gap-2 p-2 bg-petrolio/50 border border-white/5">
                                                <Bookmark size={9} className={ACCENTI_RICERCHE[i] === 'oro' ? 'text-oro' : 'text-salvia'} />
                                                <span className="font-body text-[11px] text-nebbia/65 flex-1 truncate">{titolo}</span>
                                                <span className={`font-body text-[9px] px-1.5 py-0.5 border ${ACCENTI_RICERCHE[i] === 'oro' ? 'bg-oro/10 border-oro/25 text-oro/80' : 'bg-salvia/10 border-salvia/25 text-salvia/80'
                                                    }`}>{autore}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 p-2.5 bg-salvia/5 border border-salvia/15 mt-2">
                                    <Sparkles size={11} className="text-salvia shrink-0 mt-0.5" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        <Trans t={t} i18nKey="collaborazione.lex_suggestion"
                                            components={{ hl: <span className="text-salvia" /> }} />
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
                        title={t('calendario.feature_title')}
                        text={t('calendario.feature_text')}
                        points={lista('calendario.points')}
                    >
                        <VisualBlock label={t('calendario.visual_label')}>
                            <div className="space-y-2.5">
                                <div className="grid grid-cols-7 gap-1 mb-3">
                                    {lista('calendario.days').map((g, i) => (
                                        <div key={i} className={`text-center font-body text-[10px] py-1 ${i === 2 ? 'bg-oro/15 text-oro' : 'text-nebbia/30'}`}>
                                            <div className="uppercase">{g}</div>
                                            <div className="text-nebbia/50 text-[11px] font-medium mt-0.5">{18 + i}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-1.5">
                                    {lista('calendario.events').map(({ ora, titolo, sottotitolo }, i) => (
                                        <div key={titolo} className="flex items-center gap-3 p-2 bg-petrolio/50 border border-white/5">
                                            <div className={`font-body text-[10px] font-medium px-1.5 py-0.5 border shrink-0 ${COLORI_EVENTI[i] === 'oro' ? 'bg-oro/10 border-oro/25 text-oro/80' : 'bg-salvia/10 border-salvia/25 text-salvia/80'
                                                }`}>{ora}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-body text-[11px] text-nebbia/70 truncate">{titolo}</p>
                                                <p className="font-body text-[10px] text-nebbia/30">{sottotitolo}</p>
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
                        title={t('clienti.feature_title')}
                        text={t('clienti.feature_text')}
                        points={lista('clienti.points')}
                        reverse
                    >
                        <VisualBlock label={t('clienti.visual_label')}>
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    {lista('clienti.rows').map(({ etichetta, valore }, i) => (
                                        <div key={etichetta} className="flex justify-between py-1.5 border-b border-white/5">
                                            <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{etichetta}</span>
                                            <span className={`font-body text-xs ${COLORI_RIGHE_CLIENTE[i] || 'text-nebbia/70'}`}>{valore}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2">
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-2">{t('clienti.payments_label')}</p>
                                    <div className="space-y-1.5">
                                        {lista('clienti.payments').map(({ data, descrizione, importo }, n) => (
                                            <div key={data + descrizione} className="flex items-center gap-2 p-2 bg-petrolio/50 border border-white/5">
                                                <CreditCard size={10} className={STATI_PAGAMENTI[n] === 'pagato' ? 'text-salvia' : 'text-oro'} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-body text-[11px] text-nebbia/70 truncate">{descrizione}</p>
                                                    <p className="font-body text-[10px] text-nebbia/30">{data}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-body text-[11px] text-nebbia/70">{importo}</p>
                                                    <p className={`font-body text-[9px] uppercase tracking-widest ${STATI_PAGAMENTI[n] === 'pagato' ? 'text-salvia/70' : 'text-oro/70'}`}>
                                                        {STATI_PAGAMENTI[n] === 'pagato' ? t('clienti.status_paid') : t('clienti.status_pending')}
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
                        title={t('archivio.feature_title')}
                        text={t('archivio.feature_text')}
                        points={lista('archivio.points')}
                    >
                        <VisualBlock label={t('archivio.visual_label')}>
                            <ArchivioRicercaAnimatedDemo />
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
                        <SectionLabel color="salvia">{t('lex_ai.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            <Trans t={t} i18nKey="lex_ai.title"
                                components={{ hl: <span className="text-salvia" /> }} />
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('lex_ai.subtitle')}
                        </p>
                    </FadeIn>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                        <FadeIn delay={0.1}>
                            <div className="space-y-3">
                                {lista('lex_ai.items').map(({ titolo, testo }, i) => ({ I: ICONE_LEX[i], titolo, testo })).map(({ I, titolo, testo }, i) => (
                                    <FadeIn key={i} delay={0.1 + i * 0.06}>
                                        <div className="flex gap-4 p-4 bg-slate border border-white/5 hover:border-salvia/20 transition-colors">
                                            <div className="w-8 h-8 flex items-center justify-center border border-salvia/20 bg-salvia/5 shrink-0">
                                                <I size={13} className="text-salvia" />
                                            </div>
                                            <div>
                                                <p className="font-body text-sm font-medium text-nebbia mb-0.5">{titolo}</p>
                                                <p className="font-body text-xs text-nebbia/35 leading-relaxed">{testo}</p>
                                            </div>
                                        </div>
                                    </FadeIn>
                                ))}
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <VisualBlock label={t('lex_ai.visual_label')} accent="salvia">
                                <div className="space-y-3">
                                    <div className="flex justify-end">
                                        <div className="max-w-[85%] bg-petrolio/60 border border-white/5 p-3">
                                            <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                {t('lex_ai.question')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <div className="max-w-[90%] bg-salvia/5 border border-salvia/15 p-3 space-y-2">
                                            <p className="font-body text-xs text-salvia/80 font-medium flex items-center gap-1">
                                                <Sparkles size={10} />{' '}{t('lex_ai.assistant_name')}
                                            </p>
                                            <p className="font-body text-xs text-nebbia/55 leading-relaxed">
                                                {t('lex_ai.answer')}
                                            </p>
                                            <div className="flex gap-1 pt-1 flex-wrap">
                                                <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">{lista('lex_ai.tags')[0]}</span>
                                                <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">{lista('lex_ai.tags')[1]}</span>
                                                <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/10 border border-salvia/25 text-salvia/80">{lista('lex_ai.tags')[2]}</span>
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
          8. CONTABILITÀ INTEGRATA
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel>{t('contabilita.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            <Trans t={t} i18nKey="contabilita.title"
                                components={{ hl: <span className="text-oro" /> }} />
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('contabilita.subtitle')}
                        </p>
                    </FadeIn>

                    {/* FeatureRow principale */}
                    <FeatureRow
                        icon={Receipt}
                        title={t('contabilita.feature_title')}
                        text={t('contabilita.feature_text')}
                        points={lista('contabilita.points')}
                    >
                        <VisualBlock label={t('contabilita.visual_label')}>
                            <div className="space-y-3">
                                {/* Intestazione */}
                                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                    <div>
                                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('contabilita.number_label')}</p>
                                        <p className="font-body text-sm text-nebbia">{t('contabilita.number')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('contabilita.date_label')}</p>
                                        <p className="font-body text-sm text-nebbia">{t('contabilita.date')}</p>
                                    </div>
                                </div>

                                {/* Righe */}
                                <div className="space-y-1.5">
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">{t('contabilita.services_label')}</p>
                                    {lista('contabilita.services').map(({ descrizione, importo }) => (
                                        <div key={descrizione} className="flex justify-between p-2 bg-petrolio/50 border border-white/5">
                                            <span className="font-body text-[11px] text-nebbia/65 truncate">{descrizione}</span>
                                            <span className="font-body text-[11px] text-nebbia/65 shrink-0 ml-2">{importo}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Totali calcolati */}
                                <div className="space-y-1 pt-2 border-t border-white/5">
                                    {lista('contabilita.totals').map(({ etichetta, importo }, i) => (
                                        <div key={etichetta} className="flex justify-between text-[11px]">
                                            <span className={`font-body ${COLORI_TOTALI[i]}`}>{etichetta}</span>
                                            <span className={`font-body ${COLORI_TOTALI[i]}`}>{importo}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between pt-2 mt-1 border-t border-white/5">
                                        <span className="font-body text-xs text-nebbia/70">{t('contabilita.total_label')}</span>
                                        <span className="font-body text-sm text-oro font-medium">{t('contabilita.total')}</span>
                                    </div>
                                </div>

                                {/* Badge SDI */}
                                <div className="flex items-center gap-2 p-2 bg-oro/5 border border-oro/15">
                                    <FileText size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55">
                                        <Trans t={t} i18nKey="contabilita.sdi_note"
                                            components={{ hl: <span className="text-oro/80" /> }} />
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                    {/* Grid 3 colonne con sotto-feature */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16">

                        {/* Card 1: Scadenzario */}
                        <FadeIn delay={0.1}>
                            <div className="bg-slate border border-white/5 p-6 h-full hover:border-oro/20 transition-colors">
                                <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro mb-4">
                                    <Activity size={16} />
                                </div>
                                <h3 className="font-display text-lg font-medium text-nebbia mb-2">{t('contabilita.scadenzario.title')}</h3>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed mb-4">
                                    {t('contabilita.scadenzario.text')}
                                </p>
                                <div className="space-y-1.5 pt-3 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-salvia rounded-full" />
                                        <span className="font-body text-[11px] text-nebbia/50">{t('contabilita.scadenzario.paid_label')}</span>
                                        <span className="font-body text-[11px] text-nebbia/30 ml-auto">{t('contabilita.scadenzario.paid_amount')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-oro rounded-full" />
                                        <span className="font-body text-[11px] text-nebbia/50">{t('contabilita.scadenzario.pending_label')}</span>
                                        <span className="font-body text-[11px] text-nebbia/30 ml-auto">{t('contabilita.scadenzario.pending_amount')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                                        <span className="font-body text-[11px] text-nebbia/50">{t('contabilita.scadenzario.overdue_label')}</span>
                                        <span className="font-body text-[11px] text-red-400/70 ml-auto">{t('contabilita.scadenzario.overdue_amount')}</span>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>

                        {/* Card 2: Pagamenti parziali */}
                        <FadeIn delay={0.15}>
                            <div className="bg-slate border border-white/5 p-6 h-full hover:border-oro/20 transition-colors">
                                <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro mb-4">
                                    <CreditCard size={16} />
                                </div>
                                <h3 className="font-display text-lg font-medium text-nebbia mb-2">{t('contabilita.parziali.title')}</h3>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed mb-4">
                                    {t('contabilita.parziali.text')}
                                </p>
                                <div className="space-y-1.5 pt-3 border-t border-white/5">
                                    {lista('contabilita.parziali.rows').map(({ metodo, data, importo }, i) => (
                                        <div key={metodo} className="flex items-center justify-between gap-2">
                                            <span className={`font-body text-[11px] ${APERTI_PARZIALI[i] ? 'text-oro' : 'text-nebbia/50'}`}>{metodo}</span>
                                            <span className={`font-body text-[10px] ${APERTI_PARZIALI[i] ? 'text-oro/60' : 'text-nebbia/30'}`}>{data}</span>
                                            <span className={`font-body text-[11px] ${APERTI_PARZIALI[i] ? 'text-oro' : 'text-nebbia/50'}`}>{importo}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </FadeIn>

                        {/* Card 3: Promemoria automatici */}
                        <FadeIn delay={0.2}>
                            <div className="bg-slate border border-white/5 p-6 h-full hover:border-oro/20 transition-colors">
                                <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro mb-4">
                                    <Zap size={16} />
                                </div>
                                <h3 className="font-display text-lg font-medium text-nebbia mb-2">{t('contabilita.promemoria.title')}</h3>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed mb-4">
                                    {t('contabilita.promemoria.text')}
                                </p>
                                <div className="space-y-2 pt-3 border-t border-white/5">
                                    <div className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 bg-oro rounded-full mt-1.5 shrink-0" />
                                        <div>
                                            <p className="font-body text-[11px] text-nebbia/55">{t('contabilita.promemoria.upcoming_when')}</p>
                                            <p className="font-body text-[10px] text-nebbia/30">{t('contabilita.promemoria.upcoming_invoice')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 shrink-0" />
                                        <div>
                                            <p className="font-body text-[11px] text-red-400/80">{t('contabilita.promemoria.overdue_when')}</p>
                                            <p className="font-body text-[10px] text-nebbia/30">{t('contabilita.promemoria.overdue_invoice')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>

                    </div>

                    {/* Lex sui pagamenti - destacato */}
                    <FadeIn delay={0.25} className="mt-16">
                        <div className="bg-slate border border-salvia/15 p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-salvia/[0.04] rounded-full blur-3xl pointer-events-none" />

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative">
                                <div className="space-y-4">
                                    <div className="w-10 h-10 flex items-center justify-center border border-salvia/20 bg-salvia/10 text-salvia">
                                        <Sparkles size={18} />
                                    </div>
                                    <h3 className="font-display text-2xl md:text-3xl font-light text-nebbia">
                                        <Trans t={t} i18nKey="contabilita.lex_pagamenti.title"
                                            components={{ hl: <span className="text-salvia" /> }} />
                                    </h3>
                                    <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                                        {t('contabilita.lex_pagamenti.text')}
                                    </p>
                                    <ul className="space-y-2 pt-2">
                                        {lista('contabilita.lex_pagamenti.points').map((p, i) => (
                                            <li key={i} className="flex items-center gap-2 font-body text-xs text-nebbia/40">
                                                <div className="w-1 h-1 bg-salvia rounded-full shrink-0" />
                                                {p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <VisualBlock label={t('contabilita.lex_pagamenti.visual_label')} accent="salvia">
                                    <div className="space-y-3">
                                        <div className="flex justify-end">
                                            <div className="max-w-[85%] bg-petrolio/60 border border-white/5 p-3">
                                                <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                    {t('contabilita.lex_pagamenti.question')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="max-w-[90%] bg-salvia/5 border border-salvia/15 p-3 space-y-2">
                                                <p className="font-body text-xs text-salvia/80 font-medium flex items-center gap-1">
                                                    <Sparkles size={10} />{' '}{t('contabilita.lex_pagamenti.assistant_name')}
                                                </p>
                                                <p className="font-body text-xs text-nebbia/55 leading-relaxed">
                                                    {t('contabilita.lex_pagamenti.answer')}
                                                </p>
                                                <div className="space-y-1 pt-1">
                                                    <div className="flex justify-between items-center p-2 bg-petrolio/60 border border-white/5">
                                                        <div>
                                                            <p className="font-body text-[11px] text-nebbia/70">{lista('contabilita.lex_pagamenti.results')[0].cliente}</p>
                                                            <p className="font-body text-[10px] text-red-400/70">{lista('contabilita.lex_pagamenti.results')[0].scadenza}</p>
                                                        </div>
                                                        <span className="font-body text-[11px] text-nebbia/70">{lista('contabilita.lex_pagamenti.results')[0].importo}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-2 bg-petrolio/60 border border-white/5">
                                                        <div>
                                                            <p className="font-body text-[11px] text-nebbia/70">{lista('contabilita.lex_pagamenti.results')[1].cliente}</p>
                                                            <p className="font-body text-[10px] text-red-400/70">{lista('contabilita.lex_pagamenti.results')[1].scadenza}</p>
                                                        </div>
                                                        <span className="font-body text-[11px] text-nebbia/70">{lista('contabilita.lex_pagamenti.results')[1].importo}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-2 bg-petrolio/60 border border-white/5">
                                                        <div>
                                                            <p className="font-body text-[11px] text-nebbia/70">{lista('contabilita.lex_pagamenti.results')[2].cliente}</p>
                                                            <p className="font-body text-[10px] text-red-400/70">{lista('contabilita.lex_pagamenti.results')[2].scadenza}</p>
                                                        </div>
                                                        <span className="font-body text-[11px] text-nebbia/70">{lista('contabilita.lex_pagamenti.results')[2].importo}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </VisualBlock>
                            </div>
                        </div>
                    </FadeIn>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          8. BANCA DATI CONDIVISA (cenno breve)
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FeatureRow
                        icon={BookOpen}
                        title={t('banca_dati.feature_title')}
                        text={t('banca_dati.feature_text')}
                        points={lista('banca_dati.points')}
                        reverse
                    >
                        <VisualBlock label={t('banca_dati.visual_label')}>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    {lista('banca_dati.tiles').map(({ titolo: v, sottotitolo: l }) => (
                                        <div key={l} className="bg-petrolio/50 border border-white/5 p-3">
                                            <p className="font-display text-xl font-light text-oro-static mb-0.5">{v}</p>
                                            <p className="font-body text-[10px] text-nebbia/35 leading-snug">{l}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 p-2.5 bg-oro/5 border border-oro/15">
                                    <Library size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        {t('banca_dati.note')}
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
                        <SectionLabel>{t('monetizzazione.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            <Trans t={t} i18nKey="monetizzazione.title"
                                components={{ hl: <span className="text-oro" /> }} />
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('monetizzazione.subtitle')}
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={TrendingUp}
                        title={t('monetizzazione.feature_title')}
                        text={t('monetizzazione.feature_text')}
                        points={lista('monetizzazione.points')}
                    >
                        <VisualBlock label={t('monetizzazione.visual_label')}>
                            <div className="space-y-2">
                                {lista('monetizzazione.items').map(({ titolo, acquisti, quota }) => (
                                    <div key={titolo} className="flex items-center gap-3 p-3 bg-petrolio/50 border border-white/5">
                                        <FileText size={12} className="text-oro shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-body text-xs text-nebbia/70 truncate">{titolo}</p>
                                            <p className="font-body text-[10px] text-nebbia/30">{acquisti}</p>
                                        </div>
                                        <span className="font-body text-xs text-oro font-medium shrink-0">{quota}</span>
                                    </div>
                                ))}
                                <div className="flex items-center justify-between p-3 bg-oro/5 border border-oro/15 mt-2">
                                    <span className="font-body text-xs text-nebbia/55">{t('monetizzazione.total_label')}</span>
                                    <span className="font-body text-sm text-oro font-medium">{t('monetizzazione.total')}</span>
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
                        <SectionLabel color="salvia">{t('sicurezza.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            <Trans t={t} i18nKey="sicurezza.title"
                                components={{ hl: <span className="text-salvia" /> }} />
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('sicurezza.subtitle')}
                        </p>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {lista('sicurezza.items').map(({ titolo, testo }, i) => ({ Icon: ICONE_SICUREZZA[i], titolo, testo })).map(({ Icon, titolo, testo }, i) => (
                            <FadeIn key={i} delay={i * 0.06}>
                                <div className="bg-slate border border-white/5 p-5 h-full hover:border-salvia/20 transition-colors">
                                    <div className="w-9 h-9 flex items-center justify-center border border-salvia/20 bg-salvia/5 text-salvia mb-3">
                                        <Icon size={15} />
                                    </div>
                                    <p className="font-body text-sm font-medium text-nebbia mb-1.5">{titolo}</p>
                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{testo}</p>
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
                        <SectionLabel>{t('cta.label')}</SectionLabel>
                        <h2 className="font-display text-4xl md:text-5xl font-light text-nebbia mb-6">
                            <Trans t={t} i18nKey="cta.title"
                                components={{ hl: <span className="text-oro" /> }} />
                        </h2>
                        <p className="font-body text-base text-nebbia/45 leading-relaxed mb-10 max-w-xl mx-auto">
                            {t('cta.subtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                            <Link to="/registrati" className="flex items-center gap-2.5 px-10 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-xl shadow-oro/20">
                                {t('cta.cta_primary')}{' '}<ArrowRight size={15} />
                            </Link>
                            <Link to="/registrati" className="flex items-center gap-2 px-10 py-4 border border-salvia/30 bg-salvia/5 text-salvia font-body text-sm hover:bg-salvia/10 hover:border-salvia/50 transition-colors">
                                {t('cta.cta_secondary')}
                            </Link>
                        </div>
                        <p className="font-body text-xs text-nebbia/25">
                            {t('cta.no_card')}
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