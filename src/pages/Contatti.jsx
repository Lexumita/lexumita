// src/pages/Contatti.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation, Trans } from 'react-i18next'
import {
  ArrowRight, Mail, MessageSquare, Calendar,
  Plus, Minus, Shield, Lock, Globe, EyeOff,
  Clock, Send,
} from 'lucide-react'

const ICONE_TRUST = [Globe, Shield, Lock, EyeOff]

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

// ─── FAQ Item con accordion ──────────────────────────────────
function FaqItem({ q, a, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-slate border border-white/5 hover:border-white/10 transition-colors">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left group"
      >
        <span className="font-body text-sm font-medium text-nebbia/80 group-hover:text-nebbia transition-colors">{q}</span>
        <div className="w-7 h-7 flex items-center justify-center border border-white/10 shrink-0 group-hover:border-oro/30 transition-colors">
          {open
            ? <Minus size={12} className="text-oro" />
            : <Plus size={12} className="text-nebbia/40 group-hover:text-oro transition-colors" />
          }
        </div>
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '400px' : '0px' }}
      >
        <div className="px-5 pb-5 pt-0">
          <div className="border-t border-white/5 pt-4">
            <p className="font-body text-sm text-nebbia/55 leading-relaxed">{a}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
export default function Contatti() {
  const { t } = useTranslation('contatti')
  const faq = t('faq.items', { returnObjects: true })
  const trust = t('trust', { returnObjects: true })

  return (
    <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta
          name="description"
          content={t('meta.description')}
        />
        <link rel="canonical" href="https://www.lexum.it/contatti" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.lexum.it/contatti" />
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
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-oro/[0.04] rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-salvia/[0.03] rounded-full blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto relative text-center" style={{ animation: 'heroIn 1s cubic-bezier(.4,0,.2,1) both' }}>
          <SectionLabel>{t('hero.label')}</SectionLabel>
          <h1 className="font-display text-5xl md:text-6xl font-light text-nebbia mb-6 leading-[1.1]">
            <Trans t={t} i18nKey="hero.title" components={{ br: <br />, hl: <span className="text-oro" /> }} />
          </h1>
          <p className="font-body text-base text-nebbia/45 leading-relaxed max-w-xl mx-auto">
            {t('hero.subtitle')}
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          2. TRE STRADE
      ══════════════════════════════════════════ */}
      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Strada 1 — Chat con operatore */}
            <FadeIn delay={0.1}>
              <div className="h-full bg-slate border border-salvia/20 p-7 flex flex-col">
                <div className="w-11 h-11 flex items-center justify-center border border-salvia/25 bg-salvia/10 mb-5">
                  <MessageSquare size={17} className="text-salvia" />
                </div>
                <p className="font-body text-[10px] text-salvia/60 tracking-[0.3em] uppercase mb-2">{t('ways.chat.label')}</p>
                <h3 className="font-display text-xl font-light text-nebbia mb-3">
                  {t('ways.chat.title')}
                </h3>
                <p className="font-body text-sm text-nebbia/45 leading-relaxed mb-5 flex-1">
                  {t('ways.chat.text')}
                </p>
                <Link
                  to="/registrati"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors"
                >
                  {t('ways.chat.cta')} <ArrowRight size={13} />
                </Link>
              </div>
            </FadeIn>

            {/* Strada 2 — Richiesta demo */}
            <FadeIn delay={0.2}>
              <div className="h-full bg-slate border border-oro/25 p-7 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-oro/[0.06] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
                <div className="relative">
                  <div className="w-11 h-11 flex items-center justify-center border border-oro/30 bg-oro/10 mb-5">
                    <Calendar size={17} className="text-oro" />
                  </div>
                  <p className="font-body text-[10px] text-oro/60 tracking-[0.3em] uppercase mb-2">{t('ways.demo.label')}</p>
                  <h3 className="font-display text-xl font-light text-nebbia mb-3">
                    {t('ways.demo.title')}
                  </h3>
                  <p className="font-body text-sm text-nebbia/45 leading-relaxed mb-5 flex-1">
                    {t('ways.demo.text')}
                  </p>
                  <Link
                    to="/registrati"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors"
                  >
                    {t('ways.demo.cta')} <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </FadeIn>

            {/* Strada 3 — Email */}
            <FadeIn delay={0.3}>
              <div className="h-full bg-slate border border-white/8 p-7 flex flex-col">
                <div className="w-11 h-11 flex items-center justify-center border border-white/15 bg-white/[0.02] mb-5">
                  <Mail size={17} className="text-nebbia/50" />
                </div>
                <p className="font-body text-[10px] text-nebbia/40 tracking-[0.3em] uppercase mb-2">{t('ways.email.label')}</p>
                <h3 className="font-display text-xl font-light text-nebbia mb-3">
                  {t('ways.email.title')}
                </h3>
                <p className="font-body text-sm text-nebbia/45 leading-relaxed mb-5 flex-1">
                  {t('ways.email.text')}
                </p>
                <a
                  href="mailto:info@lexum.it"
                  className="flex items-center justify-center gap-2 w-full py-3 border border-white/15 text-nebbia/65 font-body text-sm hover:border-white/30 hover:text-nebbia transition-colors"
                >
                  <Send size={13} /> {t('ways.email.cta')}
                </a>
              </div>
            </FadeIn>

          </div>

          {/* Microcopy orari */}
          <FadeIn delay={0.4}>
            <div className="flex items-center justify-center gap-2 mt-8 font-body text-xs text-nebbia/30">
              <Clock size={11} />
              <span>{t('ways.hours')}</span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          3. FAQ
      ══════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
        <div className="max-w-3xl mx-auto">

          <FadeIn className="text-center mb-12 max-w-2xl mx-auto">
            <SectionLabel>{t('faq.label')}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
              {t('faq.title')}
            </h2>
            <p className="font-body text-sm text-nebbia/40 leading-relaxed">
              {t('faq.subtitle')}
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="space-y-3">
              {faq.map((it, i) => (
                <FaqItem
                  key={i}
                  q={it.q}
                  a={it.a}
                  defaultOpen={i === 0}
                />
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-center font-body text-sm text-nebbia/35 mt-10">
              <Trans t={t} i18nKey="faq.outro" components={{ lnk: <Link to="/registrati" className="text-oro hover:text-oro/70 transition-colors" /> }} />
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          4. TRUST SINTETICO
      ══════════════════════════════════════════ */}
      <section className="py-12 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              {trust.map((testo, i) => {
                const Icon = ICONE_TRUST[i]
                return (
                  <div key={testo} className="flex items-center gap-2">
                    <Icon size={13} className="text-salvia/70 shrink-0" />
                    <span className="font-body text-xs text-nebbia/40">{testo}</span>
                  </div>
                )
              })}
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