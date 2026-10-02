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
import { useTranslation, Trans } from 'react-i18next'

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

// Icone e colori legati per posizione agli elenchi del JSON
const ICONE_LEX_AI = [Calendar, Calculator, TrendingUp, ScrollText, Sparkles, Receipt]
const COLORI_OCR = [undefined, undefined, undefined, undefined, 'text-salvia']
const COLORI_MANDATO = ['text-oro', undefined, 'text-oro', undefined]
const ICONE_SEZIONI = [Calendar, Wallet, Calculator, FolderSearch, Users, TrendingUp]
const COLORI_SCADENZE = ['oro', 'salvia', 'oro', 'salvia', 'oro']
const ICONE_REGIMI = [Building2, ClipboardList, Percent]
const COLORI_KPI = ['text-salvia', 'text-oro', 'text-salvia', 'text-nebbia/70']
const ICONE_OUTPUT = [Landmark, TrendingUp, Percent, ScrollText]
const COLORI_VOCI = ['text-nebbia/60', 'text-nebbia/50', 'text-nebbia/50', 'text-nebbia/50']
const ICONE_STUDIO = [Users, Shield, ShieldCheck, ClipboardList]

// ─────────────────────────────────────────────────────────────
export default function PerCommercialisti() {
    const { t } = useTranslation('per_commercialisti')

    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <Helmet>
                <title>{t('meta.title')}</title>
                <meta
                    name="description"
                    content={t('meta.description')}
                />
                <link rel="canonical" href="https://www.lexum.it/per-commercialisti" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.lexum.it/per-commercialisti" />
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
                            {t('hero.cta_primary')} <ArrowRight size={15} />
                        </Link>
                        <a href="#lex-ai" className="flex items-center gap-2 px-8 py-4 border border-salvia/30 bg-salvia/5 text-salvia font-body text-sm hover:bg-salvia/10 hover:border-salvia/50 transition-colors">
                            {t('hero.cta_secondary')}
                        </a>
                    </div>

                    <p className="font-body text-xs text-nebbia/25 max-w-lg mx-auto">
                        {t('hero.no_card')}
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
                                {t('lex_ai.features', { returnObjects: true }).map(({ title, text }, i) => {
                                    const I = ICONE_LEX_AI[i]
                                    return (
                                    <FadeIn key={i} delay={0.1 + i * 0.06}>
                                        <div className="flex gap-4 p-4 bg-slate border border-white/5 hover:border-salvia/20 transition-colors">
                                            <div className="w-8 h-8 flex items-center justify-center border border-salvia/20 bg-salvia/5 shrink-0">
                                                <I size={13} className="text-salvia" />
                                            </div>
                                            <div>
                                                <p className="font-body text-sm font-medium text-nebbia mb-0.5">{title}</p>
                                                <p className="font-body text-xs text-nebbia/35 leading-relaxed">{text}</p>
                                            </div>
                                        </div>
                                    </FadeIn>
                                    )
                                })}
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <div className="space-y-6">
                                <VisualBlock label={t('lex_ai.chat.visual_label')} accent="salvia">
                                    <div className="space-y-3">
                                        <div className="flex justify-end">
                                            <div className="max-w-[85%] bg-petrolio/60 border border-white/5 p-3">
                                                <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                    {t('lex_ai.chat.domanda')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <div className="max-w-[90%] bg-salvia/5 border border-salvia/15 p-3 space-y-2">
                                                <p className="font-body text-xs text-salvia/80 font-medium flex items-center gap-1">
                                                    <Sparkles size={10} /> {t('lex_ai.chat.ai_name')}
                                                </p>
                                                <p className="font-body text-xs text-nebbia/55 leading-relaxed">
                                                    {t('lex_ai.chat.risposta')}
                                                </p>
                                                <div className="flex gap-1 pt-1 flex-wrap">
                                                    <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">{t('lex_ai.chat.chip_iva')}</span>
                                                    <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">{t('lex_ai.chat.chip_lipe')}</span>
                                                    <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/10 border border-salvia/25 text-salvia/80">{t('lex_ai.chat.chip_file')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </VisualBlock>

                                <VisualBlock label={t('lex_ai.ocr.visual_label')} accent="salvia">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                            <Receipt size={12} className="text-salvia shrink-0" />
                                            <span className="font-body text-[11px] text-nebbia/55">{t('lex_ai.ocr.file_caricato')}</span>
                                        </div>
                                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('lex_ai.ocr.estratto_label')}</p>
                                        <div className="space-y-1.5">
                                            {t('lex_ai.ocr.righe', { returnObjects: true }).map(({ label: l, value: v }, i) => (
                                                <div key={l} className="flex justify-between py-1 border-b border-white/5">
                                                    <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{l}</span>
                                                    <span className={`font-body text-xs ${COLORI_OCR[i] || 'text-nebbia/70'}`}>{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2 p-2 bg-salvia/5 border border-salvia/15">
                                            <Check size={11} className="text-salvia shrink-0" />
                                            <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                                <Trans t={t} i18nKey="lex_ai.ocr.pronto"
                                                    components={{ hl: <span className="text-salvia" /> }} />
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
                        <SectionLabel>{t('mandati.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            <Trans t={t} i18nKey="mandati.title"
                                components={{ hl: <span className="text-oro" /> }} />
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('mandati.subtitle')}
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Briefcase}
                        title={t('mandati.feature_title')}
                        text={t('mandati.feature_text')}
                        points={t('mandati.points', { returnObjects: true })}
                    >
                        <VisualBlock label={t('mandati.visual_label')}>
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    {t('mandati.righe', { returnObjects: true }).map(({ label: l, value: v }, i) => (
                                        <div key={l} className="flex justify-between py-1.5 border-b border-white/5">
                                            <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{l}</span>
                                            <span className={`font-body text-xs ${COLORI_MANDATO[i] || 'text-nebbia/70'}`}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-2">
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-2">{t('mandati.sezioni_label')}</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {t('mandati.sezioni', { returnObjects: true }).map((nome, i) => {
                                            const I = ICONE_SEZIONI[i]
                                            return (
                                            <div key={nome} className="flex items-center gap-2 p-2 bg-petrolio/50 border border-white/5">
                                                <I size={11} className="text-oro shrink-0" />
                                                <span className="font-body text-[11px] text-nebbia/65 truncate">{nome}</span>
                                            </div>
                                            )
                                        })}
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
                        <SectionLabel>{t('scadenzario.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            <Trans t={t} i18nKey="scadenzario.title"
                                components={{ hl: <span className="text-oro" /> }} />
                        </h2>
                        <p className="font-base text-base text-nebbia/40 leading-relaxed font-body">
                            {t('scadenzario.subtitle')}
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Calendar}
                        title={t('scadenzario.feature_title')}
                        text={t('scadenzario.feature_text')}
                        points={t('scadenzario.points', { returnObjects: true })}
                        reverse
                    >
                        <VisualBlock label={t('scadenzario.visual_label')}>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                    <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('scadenzario.regime_label')}</span>
                                    <span className="font-body text-[11px] px-2 py-0.5 bg-oro/10 border border-oro/25 text-oro/80">{t('scadenzario.regime_value')}</span>
                                </div>
                                <div className="space-y-1.5">
                                    {t('scadenzario.scadenze', { returnObjects: true }).map(({ data: d, title, tipo }, i) => (
                                        <div key={d + title} className="flex items-center gap-3 p-2 bg-petrolio/50 border border-white/5">
                                            <div className="font-body text-[10px] text-nebbia/40 w-10 shrink-0">{d}</div>
                                            <span className="font-body text-[11px] text-nebbia/70 flex-1 truncate">{title}</span>
                                            <span className={`font-body text-[9px] px-1.5 py-0.5 border shrink-0 ${COLORI_SCADENZE[i] === 'oro' ? 'bg-oro/10 border-oro/25 text-oro/80' : 'bg-salvia/10 border-salvia/25 text-salvia/80'
                                                }`}>{tipo}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 p-2.5 bg-oro/5 border border-oro/15 mt-2">
                                    <Sparkles size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        <Trans t={t} i18nKey="scadenzario.generato"
                                            components={{ hl: <span className="text-oro/80" /> }} />
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                    {/* Tre regimi */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16">
                        {t('scadenzario.regimi', { returnObjects: true }).map(({ title, text }, i) => {
                            const Icon = ICONE_REGIMI[i]
                            return (
                            <FadeIn key={i} delay={i * 0.08}>
                                <div className="bg-slate border border-white/5 p-6 h-full hover:border-oro/20 transition-colors">
                                    <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro mb-4">
                                        <Icon size={16} />
                                    </div>
                                    <h3 className="font-display text-lg font-medium text-nebbia mb-2">{title}</h3>
                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{text}</p>
                                </div>
                            </FadeIn>
                            )
                        })}
                    </div>

                </div>
            </section>

            {/* ══════════════════════════════════════════
          5. CASSA E CONTO ECONOMICO
      ══════════════════════════════════════════ */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-5xl mx-auto">

                    <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
                        <SectionLabel color="salvia">{t('cassa.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            <Trans t={t} i18nKey="cassa.title"
                                components={{ hl: <span className="text-salvia" /> }} />
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('cassa.subtitle')}
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Wallet}
                        title={t('cassa.feature_title')}
                        text={t('cassa.feature_text')}
                        points={t('cassa.points', { returnObjects: true })}
                        accent="salvia"
                        reverse
                    >
                        <VisualBlock label={t('cassa.visual_label')} accent="salvia">
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    {t('cassa.kpi', { returnObjects: true }).map(({ label: l, value: v }, i) => (
                                        <div key={l} className="bg-petrolio/50 border border-white/5 p-3">
                                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">{l}</p>
                                            <p className={`font-display text-lg font-light ${COLORI_KPI[i]}`}>{v}</p>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-2">{t('cassa.proiezione_label')}</p>
                                    <div className="flex items-end gap-1 h-16">
                                        {[42, 38, 45, 51, 47, 53, 49, 58, 62, 57, 64, 70].map((h, i) => (
                                            <div key={i} className="flex-1 bg-salvia/20 border-t border-salvia/40" style={{ height: `${h}%` }} />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-salvia/5 border border-salvia/15">
                                    <PiggyBank size={11} className="text-salvia shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        <Trans t={t} i18nKey="cassa.budget"
                                            components={{ hl: <span className="text-salvia" /> }} />
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
                        <SectionLabel>{t('contabilita.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            <Trans t={t} i18nKey="contabilita.title"
                                components={{ hl: <span className="text-oro" /> }} />
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('contabilita.subtitle')}
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Calculator}
                        title={t('contabilita.feature_title')}
                        text={t('contabilita.feature_text')}
                        points={t('contabilita.points', { returnObjects: true })}
                    >
                        <VisualBlock label={t('contabilita.visual_label')}>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                    <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('contabilita.fattura')}</span>
                                    <span className="font-body text-[11px] text-nebbia/50">{t('contabilita.data')}</span>
                                </div>
                                <div className="space-y-1.5">
                                    {t('contabilita.righe', { returnObjects: true }).map(({ conto, dare, avere }) => (
                                        <div key={conto} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center p-2 bg-petrolio/50 border border-white/5">
                                            <span className="font-body text-[11px] text-nebbia/70 truncate">{conto}</span>
                                            <span className="font-body text-[11px] text-oro/80 w-16 text-right">{dare && `${dare}`}</span>
                                            <span className="font-body text-[11px] text-salvia/80 w-16 text-right">{avere && `${avere}`}</span>
                                        </div>
                                    ))}
                                    <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-2">
                                        <span className="font-body text-[9px] text-nebbia/25 uppercase tracking-widest">{t('contabilita.col_conto')}</span>
                                        <span className="font-body text-[9px] text-oro/50 uppercase tracking-widest w-16 text-right">{t('contabilita.col_dare')}</span>
                                        <span className="font-body text-[9px] text-salvia/50 uppercase tracking-widest w-16 text-right">{t('contabilita.col_avere')}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-oro/5 border border-oro/15">
                                    <Check size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        {t('contabilita.quadrata')}
                                    </p>
                                </div>
                            </div>
                        </VisualBlock>
                    </FeatureRow>

                    {/* Output contabili */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-16">
                        {t('contabilita.output', { returnObjects: true }).map(({ title, text }, i) => {
                            const Icon = ICONE_OUTPUT[i]
                            return (
                            <FadeIn key={i} delay={i * 0.06}>
                                <div className="bg-slate border border-white/5 p-5 h-full hover:border-oro/20 transition-colors">
                                    <div className="w-9 h-9 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro mb-3">
                                        <Icon size={15} />
                                    </div>
                                    <p className="font-body text-sm font-medium text-nebbia mb-1.5">{title}</p>
                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{text}</p>
                                </div>
                            </FadeIn>
                            )
                        })}
                    </div>

                    <FadeIn delay={0.2} className="mt-6">
                        <p className="font-body text-xs text-nebbia/25 text-center max-w-2xl mx-auto leading-relaxed">
                            {t('contabilita.nota')}
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
                        <SectionLabel color="salvia">{t('personale.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            <Trans t={t} i18nKey="personale.title"
                                components={{ hl: <span className="text-salvia" /> }} />
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('personale.subtitle')}
                        </p>
                    </FadeIn>

                    <FeatureRow
                        icon={Users}
                        title={t('personale.feature_title')}
                        text={t('personale.feature_text')}
                        points={t('personale.points', { returnObjects: true })}
                        accent="salvia"
                        reverse
                    >
                        <VisualBlock label={t('personale.visual_label')} accent="salvia">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                                    <div className="w-8 h-8 flex items-center justify-center border border-salvia/20 bg-salvia/5 text-salvia font-body text-[10px] font-medium shrink-0">
                                        {t('personale.avatar')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-body text-xs text-nebbia/70">{t('personale.nome')}</p>
                                        <p className="font-body text-[10px] text-nebbia/30">{t('personale.inquadramento')}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {t('personale.voci', { returnObjects: true }).map(({ label: l, value: v }, i) => (
                                        <div key={l} className="flex justify-between text-[11px]">
                                            <span className={`font-body ${COLORI_VOCI[i]}`}>{l}</span>
                                            <span className={`font-body ${COLORI_VOCI[i]}`}>{v}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between pt-2 mt-1 border-t border-white/5">
                                        <span className="font-body text-xs text-nebbia/70">{t('personale.totale_label')}</span>
                                        <span className="font-body text-sm text-salvia font-medium">{t('personale.totale_value')}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-salvia/5 border border-salvia/15">
                                    <Users size={11} className="text-salvia shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        <Trans t={t} i18nKey="personale.organico"
                                            components={{ hl: <span className="text-salvia" /> }} />
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
                        title={t('banca_dati.feature_title')}
                        text={t('banca_dati.feature_text')}
                        points={t('banca_dati.points', { returnObjects: true })}
                    >
                        <VisualBlock label={t('banca_dati.visual_label')}>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 p-2.5 bg-petrolio/50 border border-white/5">
                                    <Search size={12} className="text-oro shrink-0" />
                                    <span className="font-body text-[11px] text-nebbia/60">{t('banca_dati.query')}</span>
                                </div>
                                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('banca_dati.salvate_label')}</p>
                                <div className="space-y-1.5">
                                    {t('banca_dati.ricerche', { returnObjects: true }).map(({ title, tag }) => (
                                        <div key={title} className="flex items-center gap-2 p-2 bg-petrolio/50 border border-white/5">
                                            <BookOpen size={9} className="text-oro shrink-0" />
                                            <span className="font-body text-[11px] text-nebbia/65 flex-1 truncate">{title}</span>
                                            <span className="font-body text-[9px] px-1.5 py-0.5 bg-oro/10 border border-oro/25 text-oro/80 shrink-0">{tag}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-oro/5 border border-oro/15">
                                    <RefreshCw size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                        <Trans t={t} i18nKey="banca_dati.allineate"
                                            components={{ hl: <span className="text-oro/80" /> }} />
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
                                        <span className="font-body text-[10px] text-oro/80 tracking-widest uppercase">{t('banca_dati.aggiornamento.badge')}</span>
                                    </div>
                                    <h3 className="font-display text-2xl md:text-3xl font-light text-nebbia">
                                        <Trans t={t} i18nKey="banca_dati.aggiornamento.title"
                                            components={{ hl: <span className="text-oro" /> }} />
                                    </h3>
                                    <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                                        {t('banca_dati.aggiornamento.text')}
                                    </p>
                                    <ul className="space-y-2 pt-2">
                                        {t('banca_dati.aggiornamento.points', { returnObjects: true }).map((p, i) => (
                                            <li key={i} className="flex items-center gap-2 font-body text-xs text-nebbia/40">
                                                <div className="w-1 h-1 bg-oro rounded-full shrink-0" />
                                                {p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <VisualBlock label={t('banca_dati.aggiornamento.visual_label')}>
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                            <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{t('banca_dati.aggiornamento.ultimo_label')}</span>
                                            <span className="font-body text-[11px] px-2 py-0.5 bg-oro/10 border border-oro/25 text-oro/80">{t('banca_dati.aggiornamento.ultimo_value')}</span>
                                        </div>
                                        {t('banca_dati.aggiornamento.norme', { returnObjects: true }).map(({ title, stato: s }) => (
                                            <div key={title} className="flex items-center gap-2 p-2 bg-petrolio/50 border border-white/5">
                                                <ScrollText size={10} className="text-oro shrink-0" />
                                                <span className="font-body text-[11px] text-nebbia/65 flex-1 truncate">{title}</span>
                                                <span className="flex items-center gap-1 font-body text-[9px] text-salvia/80 shrink-0">
                                                    <Check size={9} /> {s}
                                                </span>
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-2 p-2.5 bg-oro/5 border border-oro/15 mt-2">
                                            <RefreshCw size={11} className="text-oro shrink-0" />
                                            <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                                                <Trans t={t} i18nKey="banca_dati.aggiornamento.prossimo"
                                                    components={{ hl: <span className="text-oro/80" /> }} />
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
                        <SectionLabel color="salvia">{t('studio.label')}</SectionLabel>
                        <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                            <Trans t={t} i18nKey="studio.title"
                                components={{ hl: <span className="text-salvia" /> }} />
                        </h2>
                        <p className="font-body text-base text-nebbia/40 leading-relaxed">
                            {t('studio.subtitle')}
                        </p>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {t('studio.cards', { returnObjects: true }).map(({ title, text }, i) => {
                            const Icon = ICONE_STUDIO[i]
                            return (
                            <FadeIn key={i} delay={i * 0.06}>
                                <div className="bg-slate border border-white/5 p-5 h-full hover:border-salvia/20 transition-colors">
                                    <div className="w-9 h-9 flex items-center justify-center border border-salvia/20 bg-salvia/5 text-salvia mb-3">
                                        <Icon size={15} />
                                    </div>
                                    <p className="font-body text-sm font-medium text-nebbia mb-1.5">{title}</p>
                                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">{text}</p>
                                </div>
                            </FadeIn>
                            )
                        })}
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
                                {t('cta.cta_primary')} <ArrowRight size={15} />
                            </Link>
                            <Link to="/abbonamenti" className="flex items-center gap-2 px-10 py-4 border border-salvia/30 bg-salvia/5 text-salvia font-body text-sm hover:bg-salvia/10 hover:border-salvia/50 transition-colors">
                                {t('cta.cta_secondary')}
                            </Link>
                        </div>
                        <p className="font-body text-xs text-nebbia/25">
                            {t('cta.nota')}
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
