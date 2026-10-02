// src/pages/Home.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import ArchivioAnimatedDemo from '@/components/ArchivioAnimatedDemo'
import ClientiLexAnimatedDemo from '@/components/ClientiLexAnimatedDemo'
import LexAnimatedDemo from '@/components/LexAnimatedDemo'
import {
  ArrowRight, Sparkles, ChevronDown, ChevronLeft, ChevronRight,
  Check, Search, Briefcase, FileText, MessageSquare, Brain,
  BookOpen, Users, Bookmark, Library, X
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useTranslation, Trans } from 'react-i18next'

// Valori tecnici legati per posizione agli elenchi di home.json
const ICONE_LEXAI = [Search, FileText, MessageSquare, Brain]
const NUMERI_PASSI = ['01', '02', '03', '04']
const COLORI_PRATICA = [undefined, undefined, 'text-salvia', 'text-oro']
const COLORI_ETICHETTE = ['oro', 'salvia', 'oro']
const RICERCHE_EVIDENZIATE = [true, false, false]

// Scroll animation hook
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

function FadeIn({ children, delay = 0, className = '', up = true }) {
  const [ref, inView] = useInView()
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'none' : up ? 'translateY(28px)' : 'translateY(0)',
      transition: `opacity 0.75s cubic-bezier(.4,0,.2,1) ${delay}s, transform 0.75s cubic-bezier(.4,0,.2,1) ${delay}s`
    }}>
      {children}
    </div>
  )
}

// Sezione label
function SectionLabel({ children, color = 'oro' }) {
  const c = color === 'salvia' ? 'text-salvia/70' : 'text-oro/60'
  return <p className={`font-body text-xs ${c} tracking-[0.3em] uppercase mb-3`}>{children}</p>
}

// Divisore oro
function Divider() {
  return (
    <div className="flex items-center gap-4 my-12">
      <div className="flex-1 h-px bg-white/5" />
      <div className="w-1 h-1 bg-oro/40 rotate-45" />
      <div className="flex-1 h-px bg-white/5" />
    </div>
  )
}

// Feature row
function FeatureRow({ icon: Icon, title, text, points, reverse = false, accent = 'oro', badge, children }) {
  const ic = accent === 'salvia' ? 'text-salvia bg-salvia/10 border-salvia/20' : 'text-oro bg-oro/10 border-oro/20'
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center`}>
      <FadeIn delay={0.1} className={reverse ? 'lg:order-2' : ''}>
        <div className="space-y-4">
          {badge && <span className="inline-block font-body text-xs px-3 py-1 bg-salvia/10 border border-salvia/20 text-salvia">{badge}</span>}
          <div className={`w-10 h-10 flex items-center justify-center border ${ic}`}>
            <Icon size={18} />
          </div>
          <h3 className="font-display text-2xl font-light text-nebbia">{title}</h3>
          <p className="font-body text-sm text-nebbia/50 leading-relaxed">{text}</p>
          {points && (
            <ul className="space-y-2">
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

// Visual placeholder elegante
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

// Mini card (per griglia 6 funzionalita sotto hero)
function MiniCard({ icon: Icon, title, text, anchor }) {
  return (
    <a
      href={anchor}
      className="block group bg-slate/60 border border-white/8 p-5 hover:border-oro/25 hover:bg-slate transition-all"
    >
      <div className="w-9 h-9 flex items-center justify-center border border-oro/20 bg-oro/5 text-oro mb-4 group-hover:bg-oro/15 transition-colors">
        <Icon size={15} />
      </div>
      <p className="font-body text-sm font-medium text-nebbia mb-1.5">{title}</p>
      <p className="font-body text-xs text-nebbia/40 leading-relaxed">{text}</p>
    </a>
  )
}

// Hero card grande (banca dati)
function HeroDatabaseCard() {
  const { t } = useTranslation('home')
  return (
    <a
      className="block group bg-slate/70 border border-oro/20 p-7 md:p-9 hover:border-oro/40 transition-all relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-oro/[0.06] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7 items-center relative">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Library size={16} className="text-oro" />
            <span className="font-body text-xs text-oro/60 tracking-[0.25em] uppercase">{t('database_card.label')}</span>
          </div>
          <p className="font-display text-5xl md:text-6xl font-light text-oro-shimmer leading-none mb-3">
            {t('database_card.count')}<span className="text-oro/60 text-3xl md:text-4xl ml-1">{t('database_card.count_plus')}</span>
          </p>
          <p className="font-display text-xl font-light text-nebbia mb-3">
            {t('database_card.headline')}
          </p>
          <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-3">
            {t('database_card.description')}
          </p>
          <p className="font-body text-sm text-oro/80 leading-relaxed">
            {t('database_card.open_access')}
          </p>
        </div>
        <div className="space-y-2">
          {t('database_card.items', { returnObjects: true }).map(({ t: titolo, s }) => (
            <div key={titolo} className="px-3 py-2.5 bg-petrolio/50 border border-white/5">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-1 h-1 rounded-full bg-oro/60 shrink-0" />
                <span className="font-body text-xs text-nebbia/75 font-medium">{titolo}</span>
              </div>
              <p className="font-body text-[11px] text-nebbia/40 leading-snug pl-3">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </a>
  )
}

// ─── Carosello demo Lex (hero) ───
const DEMO_VARIANTS = ['avvocato', 'commercialista']
function LexDemoBox({ variant }) {
  return (
    <div className="bg-slate border border-oro/20 overflow-hidden shadow-2xl shadow-oro/5 h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-petrolio/60">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-salvia" />
          <span className="font-body text-xs text-salvia">Lex AI</span>
          <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse ml-1" />
        </div>
      </div>
      <div className="p-5"><LexAnimatedDemo variant={variant} /></div>
    </div>
  )
}

// PAGINA
export default function Home() {
  const { t } = useTranslation('home')
  const ricerchePratica = t('gestionale.visual.research', { returnObjects: true })
  const [demoIdx, setDemoIdx] = useState(0)
  const [demoDir, setDemoDir] = useState('next')
  const cambiaDemo = (dir) => {
    // Niente giro: alla prima sessione non si torna indietro, all'ultima non si va avanti
    const nuovo = demoIdx + (dir === 'next' ? 1 : -1)
    if (nuovo < 0 || nuovo >= DEMO_VARIANTS.length) return
    setDemoDir(dir)
    setDemoIdx(nuovo)
  }
  // Scorrimento col dito: un trascinamento orizzontale netto cambia sessione,
  // quello verticale resta allo scorrimento della pagina
  const toccoRef = useRef(null)
  const onToccoInizio = (e) => {
    const punto = e.touches[0]
    toccoRef.current = { x: punto.clientX, y: punto.clientY }
  }
  const onToccoFine = (e) => {
    const inizio = toccoRef.current
    toccoRef.current = null
    if (!inizio) return
    const punto = e.changedTouches[0]
    const dx = punto.clientX - inizio.x
    const dy = punto.clientY - inizio.y
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    cambiaDemo(dx < 0 ? 'next' : 'prev')
  }

  return (
    <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden">
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta
          name="description"
          content={t('meta.description')}
        />
        <link rel="canonical" href="https://www.lexum.it/" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.lexum.it/" />
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

      {/* 1. HERO (AI-first) */}
      <section className="relative min-h-screen flex items-center justify-center pt-32 md:pt-28 pb-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-oro/[0.04] rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-salvia/[0.05] rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-[0.025]" style={{
            backgroundImage: `linear-gradient(#C9A45C 1px, transparent 1px), linear-gradient(90deg, #C9A45C 1px, transparent 1px)`,
            backgroundSize: '80px 80px'
          }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 w-full" style={{ animation: 'heroIn 1s cubic-bezier(.4,0,.2,1) both' }}>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 border border-oro/20 bg-oro/5 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse" />
              <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">{t('hero.badge')}</span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-light text-nebbia leading-[1.1] mb-6">
              <Trans t={t} i18nKey="hero.title"
                components={{ br: <br className="hidden md:block" />, hl: <span className="text-oro-shimmer" /> }} />
            </h1>

            <p className="font-body text-base md:text-lg text-nebbia/50 leading-relaxed max-w-2xl mx-auto mb-10">
              {t('hero.subtitle')}
            </p>
          </div>

          {/* CAROSELLO Lex — una sessione alla volta con frecce (larghezza piena come CH) */}
          <FadeIn delay={0.1}>
            <div className="mb-10 max-w-5xl mx-auto">
              <div className="relative" onTouchStart={onToccoInizio} onTouchEnd={onToccoFine}
                style={{ touchAction: 'pan-y pinch-zoom' }}>
                <div key={DEMO_VARIANTS[demoIdx]} style={{ animation: `${demoDir === 'next' ? 'demoSlideNext' : 'demoSlidePrev'} 450ms cubic-bezier(.4,0,.2,1) both` }}>
                  <LexDemoBox variant={DEMO_VARIANTS[demoIdx]} />
                </div>
                {demoIdx > 0 && (
                  <button onClick={() => cambiaDemo('prev')} aria-label={t('hero.carousel.prev')}
                    className="absolute top-1/2 -translate-y-1/2 left-1 md:-left-6 w-11 h-11 flex items-center justify-center rounded-full bg-slate border border-oro/40 text-oro shadow-lg shadow-black/30 hover:bg-oro hover:text-petrolio transition-colors"
                    style={{ animation: 'arrowNudgeLeft 2.2s ease-in-out infinite' }}><ChevronLeft size={20} /></button>
                )}
                {demoIdx < DEMO_VARIANTS.length - 1 && (
                  <button onClick={() => cambiaDemo('next')} aria-label={t('hero.carousel.next')}
                    className="absolute top-1/2 -translate-y-1/2 right-1 md:-right-6 w-11 h-11 flex items-center justify-center rounded-full bg-slate border border-oro/40 text-oro shadow-lg shadow-black/30 hover:bg-oro hover:text-petrolio transition-colors"
                    style={{ animation: 'arrowNudgeRight 2.2s ease-in-out infinite' }}><ChevronRight size={20} /></button>
                )}
              </div>
              <div className="flex items-center justify-center gap-2.5 mt-5">
                {DEMO_VARIANTS.map((v, i) => (
                  <button key={v} onClick={() => { setDemoDir(i > demoIdx ? 'next' : 'prev'); setDemoIdx(i) }} aria-label={t('hero.carousel.dots', { returnObjects: true })[i]}
                    className={`h-2 rounded-full transition-all ${i === demoIdx ? 'bg-oro w-6' : 'bg-white/15 w-2 hover:bg-white/30'}`} />
                ))}
              </div>
            </div>
          </FadeIn>

          {/* CTA */}
          <div className="text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link to="/registrati" className="flex items-center gap-2.5 px-8 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-lg shadow-oro/20">
                {t('hero.cta_primary')} <ArrowRight size={15} />
              </Link>
              <a href="#differenza" className="flex items-center gap-2 px-8 py-4 border border-white/10 text-nebbia/50 font-body text-sm hover:border-white/25 hover:text-nebbia transition-colors">
                {t('hero.cta_secondary')}
              </a>
            </div>
            <p className="font-body text-xs text-nebbia/25">
              {t('hero.no_card')}
            </p>
          </div>
        </div>

        <a href="#fonti" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-nebbia/20 animate-bounce hidden md:block">
          <ChevronDown size={20} />
        </a>
      </section>

      {/* 2. FONTI + AGGIORNAMENTO SETTIMANALE */}
      <section id="fonti" className="py-24 px-6 bg-slate/20 border-t border-white/5 scroll-mt-28">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-12 max-w-2xl mx-auto">
            <SectionLabel>{t('fonti.label')}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-5">
              <Trans t={t} i18nKey="fonti.title" components={{ hl: <span className="text-oro" /> }} />
            </h2>
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center gap-2 font-body text-xs px-3 py-1.5 bg-salvia/10 border border-salvia/25 text-salvia">
                <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse" />
                {t('fonti.weekly_badge')}
              </span>
            </div>
            <p className="font-body text-sm text-oro/80 leading-relaxed">
              {t('fonti.anti_noise')}
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <HeroDatabaseCard />
          </FadeIn>
        </div>
      </section>

      {/* 3. DIFFERENZA — AI generica vs AI con contesto */}
      <section id="differenza" className="py-24 px-6 border-t border-white/5 scroll-mt-28">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-12 max-w-2xl mx-auto">
            <SectionLabel color="salvia">{t('differenza.label')}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
              <Trans t={t} i18nKey="differenza.title" components={{ hl: <span className="text-salvia" /> }} />
            </h2>
            <p className="font-body text-base text-nebbia/40 leading-relaxed">
              {t('differenza.subtitle')}
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* a) Ricerca libera — senza contesto */}
            <FadeIn delay={0.1}>
              <div className="bg-slate border border-oro/20 p-7 h-full">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/10 text-oro">
                    <Search size={18} />
                  </div>
                  <span className="font-body text-[11px] uppercase tracking-widest text-oro/60 border border-oro/20 px-2 py-1">{t('differenza.free.badge')}</span>
                </div>
                <h3 className="font-display text-2xl font-light text-nebbia mb-3">{t('differenza.free.title')}</h3>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                  {t('differenza.free.text')}
                </p>
              </div>
            </FadeIn>

            {/* b) Con contesto */}
            <FadeIn delay={0.2}>
              <div className="bg-slate border border-salvia/20 p-7 h-full">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 flex items-center justify-center border border-salvia/20 bg-salvia/10 text-salvia">
                    <Briefcase size={18} />
                  </div>
                  <span className="font-body text-[11px] uppercase tracking-widest text-salvia/60 border border-salvia/20 px-2 py-1">{t('differenza.context.badge')}</span>
                </div>
                <h3 className="font-display text-2xl font-light text-nebbia mb-3">{t('differenza.context.title')}</h3>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                  {t('differenza.context.text')}
                </p>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.3}>
            <div className="mt-6 bg-salvia/5 border border-salvia/15 p-5 flex items-center justify-center gap-3 text-center">
              <Check size={14} className="text-salvia shrink-0" />
              <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                {t('differenza.note')}
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 4. COSA FA LEX */}
      <section id="lexai" className="py-24 px-6 border-t border-white/5 scroll-mt-28">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <SectionLabel color="salvia">{t('lexai.label')}</SectionLabel>
              <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-6">
                <Trans t={t} i18nKey="lexai.title" components={{ hl: <span className="text-salvia" /> }} />
              </h2>
              <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-8">
                {t('lexai.intro')}
              </p>
              <div className="space-y-4">
                {t('lexai.items', { returnObjects: true }).map(({ t: titolo, d }, i) => { const I = ICONE_LEXAI[i]; return (
                  <FadeIn key={i} delay={i * 0.08}>
                    <div className="flex gap-4">
                      <div className="w-9 h-9 flex items-center justify-center border border-salvia/25 bg-salvia/5 shrink-0">
                        <I size={15} className="text-salvia" />
                      </div>
                      <div>
                        <p className="font-body text-sm font-medium text-nebbia mb-1">{titolo}</p>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">{d}</p>
                      </div>
                    </div>
                  </FadeIn>
                ) })}
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="bg-slate border border-salvia/15 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-petrolio/60">
                  <Sparkles size={12} className="text-salvia" />
                  <span className="font-body text-xs text-salvia">Lex AI</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse" />
                    <span className="font-body text-xs text-nebbia/25">{t('lexai.chat.status')}</span>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="bg-petrolio border border-white/8 px-4 py-3">
                    <p className="font-body text-xs text-nebbia/40 mb-1">{t('lexai.chat.you')}</p>
                    <p className="font-body text-sm text-nebbia/65">
                      {t('lexai.chat.question')}
                    </p>
                  </div>
                  <div className="bg-salvia/5 border border-salvia/15 px-4 py-4 space-y-3">
                    <p className="font-body text-xs text-salvia/60">Lex AI</p>
                    <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                      {t('lexai.chat.answer_intro')}
                    </p>
                    <div className="space-y-1.5">
                      {t('lexai.chat.references', { returnObjects: true }).map(rif => (
                        <div key={rif} className="flex items-start gap-2 font-body text-xs text-nebbia/50">
                          <div className="w-1 h-1 bg-salvia rounded-full shrink-0 mt-1.5" />{rif}
                        </div>
                      ))}
                    </div>
                    <p className="font-body text-xs text-nebbia/40 leading-relaxed pt-1 border-t border-white/5">
                      {t('lexai.chat.answer_close')}
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* 5. RAGIONAMENTO + TRASPARENZA */}
      <section id="ragiona" className="py-24 px-6 bg-slate/20 border-t border-white/5 scroll-mt-28">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-14 max-w-2xl mx-auto">
            <SectionLabel color="salvia">{t('ragiona.label')}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
              <Trans t={t} i18nKey="ragiona.title" components={{ hl: <span className="text-salvia" /> }} />
            </h2>
            <p className="font-body text-sm text-nebbia/40 leading-relaxed">
              {t('ragiona.intro')}
            </p>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* Etichette laterali */}
              <div className="lg:col-span-3 space-y-3">
                {t('ragiona.steps', { returnObjects: true }).map(({ t: titolo, d }, i) => { const n = NUMERI_PASSI[i]; return (
                  <FadeIn key={n} delay={0.1 + i * 0.08}>
                    <div className="flex gap-3 p-3 bg-slate border border-white/5">
                      <div className="w-8 h-8 flex items-center justify-center border border-salvia/25 bg-salvia/5 text-salvia font-body text-[10px] shrink-0">
                        {n}
                      </div>
                      <div>
                        <p className="font-body text-xs font-medium text-nebbia/80 mb-0.5">{titolo}</p>
                        <p className="font-body text-[11px] text-nebbia/40 leading-relaxed">{d}</p>
                      </div>
                    </div>
                  </FadeIn>
                ) })}
              </div>

              {/* Mockup risposta annotata */}
              <div className="lg:col-span-9">
                <div className="bg-slate border border-salvia/15 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-petrolio/60">
                    <Sparkles size={12} className="text-salvia" />
                    <span className="font-body text-xs text-salvia">{t('ragiona.anatomy.header')}</span>
                  </div>
                  <div className="p-5 space-y-4">

                    {/* Domanda */}
                    <div className="bg-petrolio border border-white/8 px-4 py-3">
                      <p className="font-body text-xs text-nebbia/40 mb-1">{t('ragiona.anatomy.you')}</p>
                      <p className="font-body text-sm text-nebbia/65">
                        {t('ragiona.anatomy.question')}
                      </p>
                    </div>

                    {/* Risposta strutturata con annotazioni */}
                    <div className="bg-salvia/5 border border-salvia/15 p-5 space-y-4">

                      {/* Blocco 1 — Norme */}
                      <div className="relative">
                        <span className="absolute -left-2 top-0 w-1 h-full bg-salvia/30" />
                        <div className="pl-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-body text-[10px] uppercase tracking-widest text-salvia/70 font-medium">{t('ragiona.anatomy.norme_label')}</span>
                          </div>
                          <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                            {t('ragiona.anatomy.norme_text')}
                          </p>
                        </div>
                      </div>

                      {/* Blocco 2 — Presupposti */}
                      <div className="relative">
                        <span className="absolute -left-2 top-0 w-1 h-full bg-salvia/30" />
                        <div className="pl-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-body text-[10px] uppercase tracking-widest text-salvia/70 font-medium">{t('ragiona.anatomy.presupposti_label')}</span>
                          </div>
                          <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                            {t('ragiona.anatomy.presupposti_text')}
                          </p>
                        </div>
                      </div>

                      {/* Blocco 3 — Eccezioni */}
                      <div className="relative">
                        <span className="absolute -left-2 top-0 w-1 h-full bg-salvia/30" />
                        <div className="pl-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-body text-[10px] uppercase tracking-widest text-salvia/70 font-medium">{t('ragiona.anatomy.eccezioni_label')}</span>
                          </div>
                          <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                            {t('ragiona.anatomy.eccezioni_text')}
                          </p>
                        </div>
                      </div>

                      {/* Blocco 4 — Verifiche */}
                      <div className="relative">
                        <span className="absolute -left-2 top-0 w-1 h-full bg-salvia/30" />
                        <div className="pl-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-body text-[10px] uppercase tracking-widest text-salvia/70 font-medium">{t('ragiona.anatomy.verifiche_label')}</span>
                          </div>
                          <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                            {t('ragiona.anatomy.verifiche_text')}
                          </p>
                        </div>
                      </div>

                      {/* Chip fonti citate */}
                      <div className="flex gap-1 flex-wrap pt-3 border-t border-white/5">
                        {t('ragiona.anatomy.sources', { returnObjects: true }).map(c => (
                          <span key={c} className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/40">{c}</span>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Trasparenza compatta */}
          <div className="mt-20">
            <FadeIn className="text-center mb-10 max-w-2xl mx-auto">
              <SectionLabel>{t('trasparenza.label')}</SectionLabel>
              <h3 className="font-display text-2xl md:text-3xl font-light text-nebbia">
                {t('trasparenza.title')}
              </h3>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FadeIn delay={0.1}>
                <div className="bg-slate border border-salvia/15 p-6 h-full">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-7 h-7 flex items-center justify-center border border-salvia/25 bg-salvia/10">
                      <Check size={13} className="text-salvia" />
                    </div>
                    <p className="font-body text-sm font-medium text-nebbia">{t('trasparenza.does_title')}</p>
                  </div>
                  <ul className="space-y-3">
                    {t('trasparenza.does', { returnObjects: true }).map(voce => (
                      <li key={voce} className="flex items-center gap-2.5 font-body text-sm text-nebbia/60">
                        <div className="w-1.5 h-1.5 rounded-full bg-salvia shrink-0" />{voce}
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
                    <p className="font-body text-sm font-medium text-nebbia">{t('trasparenza.doesnt_title')}</p>
                  </div>
                  <ul className="space-y-3">
                    {t('trasparenza.doesnt', { returnObjects: true }).map(voce => (
                      <li key={voce} className="flex items-center gap-2.5 font-body text-sm text-nebbia/45">
                        <div className="w-1.5 h-1.5 rounded-full bg-nebbia/20 shrink-0" />{voce}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* 6. LA PIATTAFORMA */}
      <section id="features" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto space-y-24">

          {/* 6.1 Gestionale + Lex (fuso) */}
          <div id="gestionale" className="scroll-mt-28">
            <FadeIn className="text-center max-w-2xl mx-auto mb-10">
              <h3 className="font-display text-2xl md:text-3xl font-light text-nebbia mb-3">
                <Trans t={t} i18nKey="gestionale.title" components={{ hl: <span className="text-oro" /> }} />
              </h3>
              <p className="font-body text-sm text-nebbia/45 leading-relaxed">
                {t('gestionale.subtitle')}
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">

              {/* SINISTRA — Mockup statico pratica */}
              <FadeIn delay={0.1}>
                <VisualBlock label={t('gestionale.visual.label')}>
                  <div className="space-y-2">
                    {t('gestionale.visual.rows', { returnObjects: true }).map(({ l, v }, i) => (
                      <div key={l} className="flex justify-between py-1.5 border-b border-white/5">
                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                        <span className={`font-body text-xs ${COLORI_PRATICA[i] || 'text-nebbia/70'}`}>{v}</span>
                      </div>
                    ))}

                    {/* Fatturazione */}
                    <div className="pt-3">
                      <p className="font-body text-xs text-nebbia/25 mb-2">{t('gestionale.visual.billing_title')}</p>
                      <div className="flex items-center justify-between p-2 bg-petrolio/50 border border-red-400/20">
                        <span className="font-body text-xs text-nebbia/60">{t('gestionale.visual.invoice')}</span>
                        <span className="font-body text-xs text-red-400/80">{t('gestionale.visual.invoice_status')}</span>
                      </div>
                    </div>

                    {/* Ricerche */}
                    <div className="pt-3">
                      <p className="font-body text-xs text-nebbia/25 mb-2">{t('gestionale.visual.research_title')}</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 p-2 bg-petrolio/50">
                          <Sparkles size={9} className="text-salvia" />
                          <span className="font-body text-xs text-nebbia/50">{ricerchePratica[0]}</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-petrolio/50">
                          <Search size={9} className="text-oro" />
                          <span className="font-body text-xs text-nebbia/50">{ricerchePratica[1]}</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-petrolio/50">
                          <Bookmark size={9} className="text-oro" />
                          <span className="font-body text-xs text-nebbia/50">{ricerchePratica[2]}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </VisualBlock>
              </FadeIn>

              {/* DESTRA — Demo Lex animato */}
              <ClientiLexAnimatedDemo />

            </div>
          </div>

          <Divider />

          {/* 6.2 Ricerche organizzate */}
          <div id="ricerche" className="scroll-mt-28">
            <FeatureRow
              icon={Bookmark}
              title={t('ricerche.title')}
              text={t('ricerche.text')}
              points={t('ricerche.points', { returnObjects: true })}
            >
              <VisualBlock label={t('ricerche.visual.label')}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-petrolio border border-oro/15">
                    <Search size={11} className="text-oro/60 shrink-0" />
                    <span className="font-body text-xs text-nebbia/70 flex-1">{t('ricerche.visual.query')}</span>
                    <span className="font-body text-[10px] text-nebbia/30 shrink-0">{t('ricerche.visual.results')}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {t('ricerche.visual.tags', { returnObjects: true }).map((l, i) => (
                      <span key={l} className={`font-body text-[10px] px-2 py-0.5 border ${COLORI_ETICHETTE[i] === 'salvia' ? 'bg-salvia/10 border-salvia/25 text-salvia/80' : 'bg-oro/10 border-oro/25 text-oro/80'}`}>
                        # {l}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {t('ricerche.visual.saved', { returnObjects: true }).map(({ t: titolo, sub }, i) => { const highlight = RICERCHE_EVIDENZIATE[i]; return (
                      <div key={titolo} className={`flex items-start gap-2 p-2.5 ${highlight ? 'bg-salvia/5 border border-salvia/15' : 'bg-petrolio/50 border border-white/5'}`}>
                        <Bookmark size={10} className={`mt-0.5 shrink-0 ${highlight ? 'text-salvia' : 'text-nebbia/40'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-xs text-nebbia/70 truncate">{titolo}</p>
                          <p className="font-body text-[10px] text-nebbia/30">{sub}</p>
                        </div>
                      </div>
                    ) })}
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-salvia/5 border border-salvia/15 mt-2">
                    <Sparkles size={11} className="text-salvia shrink-0" />
                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                      <Trans t={t} i18nKey="ricerche.visual.suggestion" components={{ hl: <span className="text-salvia" /> }} />
                    </p>
                  </div>
                </div>
              </VisualBlock>
            </FeatureRow>
          </div>

          <Divider />

          {/* 6.3 Documentale + Archivio */}
          <div id="archivio" className="scroll-mt-28">
            <FadeIn className="text-center max-w-2xl mx-auto -mb-4">
              <h3 className="font-display text-2xl md:text-3xl font-light text-nebbia mb-3">
                <Trans t={t} i18nKey="archivio.title" components={{ hl: <span className="text-oro" /> }} />
              </h3>
              <p className="font-body text-sm text-nebbia/45 leading-relaxed">
                {t('archivio.subtitle')}
              </p>
            </FadeIn>
            <ArchivioAnimatedDemo />
          </div>

        </div>
      </section>

      {/* 6.4 BANCA DATI CONDIVISA */}
      <section id="bancadati" className="py-24 px-6 border-t border-white/5 scroll-mt-28">
        <div className="max-w-5xl mx-auto">

          <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
            <SectionLabel>{t('banca_condivisa.label')}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
              <Trans t={t} i18nKey="banca_condivisa.title" components={{ hl: <span className="text-oro" /> }} />
            </h2>
            <p className="font-body text-base text-nebbia/40 leading-relaxed">
              {t('banca_condivisa.subtitle')}
            </p>
          </FadeIn>

          <FeatureRow
            icon={BookOpen}
            title={t('banca_condivisa.feature_title')}
            text={t('banca_condivisa.feature_text')}
            points={t('banca_condivisa.points', { returnObjects: true })}
          >
            <VisualBlock label={t('banca_condivisa.visual.label')}>
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-body text-xs text-nebbia/30">{t('banca_condivisa.visual.results')}</span>
                </div>
                <div className="border border-white/8 p-4">
                  <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">{t('banca_condivisa.visual.category')}</p>
                  <p className="font-body text-sm font-medium text-nebbia mb-1">{t('banca_condivisa.visual.title')}</p>
                  <p className="font-body text-xs text-nebbia/40 mb-2">{t('banca_condivisa.visual.author')}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {t('banca_condivisa.visual.tags', { returnObjects: true }).map(tag => (
                        <span key={tag} className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">{tag}</span>
                      ))}
                    </div>
                    <span className="font-body text-xs text-oro font-medium">{t('banca_condivisa.visual.price')}</span>
                  </div>
                </div>
              </div>
            </VisualBlock>
          </FeatureRow>
          <div className="pt-12"></div>
          <Divider />

        </div>
        {/* 6.5 CLIENTE */}
        <section id="cliente" className="pt-12 pb-4 px-6 scroll-mt-12">
          <div className="max-w-5xl mx-auto">

            <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
              <SectionLabel color="salvia">{t('cliente.label')}</SectionLabel>
              <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                <Trans t={t} i18nKey="cliente.title" components={{ hl: <span className="text-salvia" /> }} />
              </h2>
              <p className="font-body text-base text-nebbia/40 leading-relaxed">
                {t('cliente.subtitle')}
              </p>
            </FadeIn>

            <FeatureRow
              icon={Users}
              title={t('cliente.feature_title')}
              text={t('cliente.feature_text')}
              points={t('cliente.points', { returnObjects: true })}
              reverse
            >
              <VisualBlock label={t('cliente.visual.label')} accent="salvia">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-salvia/5 border border-salvia/10">
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-salvia" />
                      <span className="font-body text-xs text-nebbia/60">{t('cliente.visual.file_shared')}</span>
                    </div>
                    <span className="font-body text-xs text-nebbia/25">{t('cliente.visual.file_shared_status')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-petrolio/50 border border-white/5">
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-nebbia/30" />
                      <span className="font-body text-xs text-nebbia/60">{t('cliente.visual.file_uploaded')}</span>
                    </div>
                    <span className="font-body text-xs text-salvia/60">{t('cliente.visual.file_uploaded_status')}</span>
                  </div>
                  <div className="p-3 bg-oro/5 border border-oro/15 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-oro animate-pulse" />
                    <span className="font-body text-xs text-nebbia/50">{t('cliente.visual.next_hearing')}</span>
                  </div>
                </div>
              </VisualBlock>
            </FeatureRow>

          </div>
        </section>
      </section>

      {/* 7. CTA finale */}
      <section className="py-24 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-oro/[0.05] rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative">
          <FadeIn>
            <SectionLabel>{t('cta.label')}</SectionLabel>
            <h2 className="font-display text-4xl md:text-5xl font-light text-nebbia mb-6">
              <Trans t={t} i18nKey="cta.title" components={{ hl: <span className="text-oro" /> }} />
            </h2>
            <p className="font-body text-base text-nebbia/45 leading-relaxed mb-10 max-w-xl mx-auto">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link to="/registrati" className="flex items-center gap-2.5 px-10 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-xl shadow-oro/20">
                {t('cta.button')} <ArrowRight size={15} />
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-2">
              <Link to="/per-avvocati" className="font-body text-sm text-nebbia/35 hover:text-nebbia/60 transition-colors">
                {t('cta.link_lawyers')}
              </Link>
              <span className="hidden sm:block w-px h-4 bg-white/10" />
              <Link to="/per-commercialisti" className="font-body text-sm text-nebbia/35 hover:text-nebbia/60 transition-colors">
                {t('cta.link_accountants')}
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
        @keyframes demoSlideNext { from { opacity:0; transform:translateX(32px);} to { opacity:1; transform:translateX(0);} }
        @keyframes demoSlidePrev { from { opacity:0; transform:translateX(-32px);} to { opacity:1; transform:translateX(0);} }
        @keyframes arrowNudgeRight { 0%,100%{transform:translateY(-50%) translateX(0);} 50%{transform:translateY(-50%) translateX(4px);} }
        @keyframes arrowNudgeLeft { 0%,100%{transform:translateY(-50%) translateX(0);} 50%{transform:translateY(-50%) translateX(-4px);} }
      `}</style>
    </div>
  )
}
