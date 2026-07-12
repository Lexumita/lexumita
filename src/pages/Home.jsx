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
  return (
    <a
      className="block group bg-slate/70 border border-oro/20 p-7 md:p-9 hover:border-oro/40 transition-all relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-oro/[0.06] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7 items-center relative">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Library size={16} className="text-oro" />
            <span className="font-body text-xs text-oro/60 tracking-[0.25em] uppercase">Banca dati</span>
          </div>
          <p className="font-display text-5xl md:text-6xl font-light text-oro-shimmer leading-none mb-3">
            4.000.000<span className="text-oro/60 text-3xl md:text-4xl ml-1">+</span>
          </p>
          <p className="font-display text-xl font-light text-nebbia mb-3">
            tra documenti giuridici, italiani ed europei.
          </p>
          <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-3">
            Lavoriamo in modo continuo per ampliare ed aggiornare la Banca Dati.
          </p>
          <p className="font-body text-sm text-oro/80 leading-relaxed">
            Aperti a chiunque, gratis. Senza abbonamenti per area, senza limiti per materia.
          </p>
        </div>
        <div className="space-y-2">
          {[
            { t: 'Normativa italiana', s: 'Costituzione, codici, leggi e decreti (vigenti e storici)' },
            { t: 'Giurisprudenza amministrativa e contabile', s: 'TAR, Consiglio di Stato, Corte dei Conti' },
            { t: 'Giurisprudenza tributaria', s: 'Corti di giustizia tributaria (BDGT-MEF)' },
            { t: 'Prassi delle autorità', s: 'Agenzia delle Entrate, MEF, INPS, Dogane, Garante Privacy, Corte dei Conti' },
            { t: 'Diritto dell\'Unione Europea', s: 'Regolamenti, direttive e giurisprudenza CGUE' },
          ].map(({ t, s }) => (
            <div key={t} className="px-3 py-2.5 bg-petrolio/50 border border-white/5">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-1 h-1 rounded-full bg-oro/60 shrink-0" />
                <span className="font-body text-xs text-nebbia/75 font-medium">{t}</span>
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
const ROLE_LABELS = { avvocato: 'Avvocato', commercialista: 'Commercialista' }
function LexDemoBox({ variant }) {
  return (
    <div className="bg-slate border border-oro/20 overflow-hidden shadow-2xl shadow-oro/5 h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-petrolio/60">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-salvia" />
          <span className="font-body text-xs text-salvia">Lex AI</span>
          <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse ml-1" />
        </div>
        <span className="font-body text-[11px] uppercase tracking-widest text-oro/70">{ROLE_LABELS[variant]}</span>
      </div>
      <div className="p-5"><LexAnimatedDemo variant={variant} /></div>
    </div>
  )
}

// PAGINA
export default function Home() {
  const [demoIdx, setDemoIdx] = useState(0)
  const [demoDir, setDemoDir] = useState('next')
  const cambiaDemo = (dir) => {
    setDemoDir(dir)
    setDemoIdx(i => (i + (dir === 'next' ? 1 : DEMO_VARIANTS.length - 1)) % DEMO_VARIANTS.length)
  }

  return (
    <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden">
      <Helmet>
        <title>Lex AI — L'AI italiana per il diritto e il fisco | Lexum</title>
        <meta
          name="description"
          content="Lex AI: l'AI italiana su banca dati verificata, oltre 4 milioni di documenti giuridici e fiscali, per avvocati e commercialisti. Ragionamento strutturato, fonti verificate, dentro una piattaforma completa."
        />
        <link rel="canonical" href="https://www.lexum.it/" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.lexum.it/" />
        <meta property="og:title" content="Lex AI — L'AI italiana per il diritto e il fisco | Lexum" />
        <meta
          property="og:description"
          content="Banca dati verificata, oltre 4 milioni di documenti, ragionamento strutturato. Per avvocati e commercialisti italiani."
        />
        <meta property="og:image" content="https://www.lexum.it/logo.png" />
        <meta property="og:locale" content="it_IT" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Lex AI — L'AI italiana per il diritto e il fisco | Lexum" />
        <meta
          name="twitter:description"
          content="Banca dati verificata, oltre 4 milioni di documenti, per avvocati e commercialisti italiani."
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
              <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">Lex AI · V2</span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-light text-nebbia leading-[1.1] mb-6">
              L'AI italiana che ragiona su{' '}
              <br className="hidden md:block" />
              <span className="text-oro-shimmer">diritto e fisco.</span>
            </h1>

            <p className="font-body text-base md:text-lg text-nebbia/50 leading-relaxed max-w-2xl mx-auto mb-10">
              Fonti verificate, oltre 4 milioni di documenti giuridici e fiscali, ragionamento strutturato. Dentro una piattaforma completa per avvocati e commercialisti.
            </p>
          </div>

          {/* CAROSELLO Lex — una sessione alla volta con frecce */}
          <FadeIn delay={0.1}>
            <div className="mb-10 max-w-2xl mx-auto">
              <div className="relative">
                <div key={DEMO_VARIANTS[demoIdx]} style={{ animation: `${demoDir === 'next' ? 'demoSlideNext' : 'demoSlidePrev'} 450ms cubic-bezier(.4,0,.2,1) both` }}>
                  <LexDemoBox variant={DEMO_VARIANTS[demoIdx]} />
                </div>
                <button onClick={() => cambiaDemo('prev')} aria-label="Sessione precedente"
                  className="absolute top-1/2 -translate-y-1/2 left-1 md:-left-5 w-11 h-11 flex items-center justify-center rounded-full bg-slate border border-oro/40 text-oro shadow-lg shadow-black/30 hover:bg-oro hover:text-petrolio transition-colors"
                  style={{ animation: 'arrowNudgeLeft 2.2s ease-in-out infinite' }}><ChevronLeft size={20} /></button>
                <button onClick={() => cambiaDemo('next')} aria-label="Sessione successiva"
                  className="absolute top-1/2 -translate-y-1/2 right-1 md:-right-5 w-11 h-11 flex items-center justify-center rounded-full bg-slate border border-oro/40 text-oro shadow-lg shadow-black/30 hover:bg-oro hover:text-petrolio transition-colors"
                  style={{ animation: 'arrowNudgeRight 2.2s ease-in-out infinite' }}><ChevronRight size={20} /></button>
              </div>
              <div className="flex items-center justify-center gap-2.5 mt-5">
                {DEMO_VARIANTS.map((v, i) => (
                  <button key={v} onClick={() => { setDemoDir(i > demoIdx ? 'next' : 'prev'); setDemoIdx(i) }} aria-label={v}
                    className={`h-2 rounded-full transition-all ${i === demoIdx ? 'bg-oro w-6' : 'bg-white/15 w-2 hover:bg-white/30'}`} />
                ))}
              </div>
            </div>
          </FadeIn>

          {/* CTA */}
          <div className="text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link to="/registrati" className="flex items-center gap-2.5 px-8 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-lg shadow-oro/20">
                Inizia gratis con la banca dati <ArrowRight size={15} />
              </Link>
              <a href="#differenza" className="flex items-center gap-2 px-8 py-4 border border-white/10 text-nebbia/50 font-body text-sm hover:border-white/25 hover:text-nebbia transition-colors">
                Scopri la differenza
              </a>
            </div>
            <p className="font-body text-xs text-nebbia/25">
              Nessuna carta richiesta. La banca dati è sempre gratuita.
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
            <SectionLabel>Banca dati</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-5">
              Una banca dati verificata,{' '}
              <span className="text-oro">aggiornata ogni settimana.</span>
            </h2>
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center gap-2 font-body text-xs px-3 py-1.5 bg-salvia/10 border border-salvia/25 text-salvia">
                <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse" />
                Aggiornamento settimanale al testo vigente
              </span>
            </div>
            <p className="font-body text-sm text-oro/80 leading-relaxed">
              Fonti verificate. Niente ricerca web casuale, niente fonti generaliste.
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
            <SectionLabel color="salvia">La differenza</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
              Il problema delle AI generiche è il contesto.{' '}
              <span className="text-salvia">Lex ce l'ha.</span>
            </h2>
            <p className="font-body text-base text-nebbia/40 leading-relaxed">
              Le AI generiche rispondono nel vuoto: non conoscono il caso, i documenti, le scadenze. Lex vive dentro il gestionale dello studio.
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
                  <span className="font-body text-[11px] uppercase tracking-widest text-oro/60 border border-oro/20 px-2 py-1">Senza contesto</span>
                </div>
                <h3 className="font-display text-2xl font-light text-nebbia mb-3">Ricerca libera</h3>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                  Fai domande su tutto il diritto e il fisco italiano: Lex risponde con ragionamento strutturato su fonti verificate. Per esplorare, verificare, approfondire.
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
                  <span className="font-body text-[11px] uppercase tracking-widest text-salvia/60 border border-salvia/20 px-2 py-1">Con contesto</span>
                </div>
                <h3 className="font-display text-2xl font-light text-nebbia mb-3">Lex nella pratica e nel mandato</h3>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                  Dentro la pratica dell'avvocato o il mandato del commercialista, Lex legge atti, documenti, scadenze e dati del caso: analisi e strategie sul tuo caso, e atti e documenti generati già compilati con i dati reali.
                </p>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.3}>
            <div className="mt-6 bg-salvia/5 border border-salvia/15 p-5 flex items-center justify-center gap-3 text-center">
              <Check size={14} className="text-salvia shrink-0" />
              <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                Stesso motore, due modalità: libera quando esplori, con contesto quando lavori.
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
              <SectionLabel color="salvia">Funzionalità</SectionLabel>
              <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-6">
                Cosa puoi fare con{' '}
                <span className="text-salvia">Lex AI.</span>
              </h2>
              <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-8">
                Una versione accessibile pensata per la ricerca legale e fiscale. Quattro modi concreti
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

      {/* 5. RAGIONAMENTO + TRASPARENZA */}
      <section id="ragiona" className="py-24 px-6 bg-slate/20 border-t border-white/5 scroll-mt-28">
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

              {/* Etichette laterali */}
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

          {/* Trasparenza compatta */}
          <div className="mt-20">
            <FadeIn className="text-center mb-10 max-w-2xl mx-auto">
              <SectionLabel>Trasparenza</SectionLabel>
              <h3 className="font-display text-2xl md:text-3xl font-light text-nebbia">
                Cosa può e cosa non può.
              </h3>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FadeIn delay={0.1}>
                <div className="bg-slate border border-salvia/15 p-6 h-full">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-7 h-7 flex items-center justify-center border border-salvia/25 bg-salvia/10">
                      <Check size={13} className="text-salvia" />
                    </div>
                    <p className="font-body text-sm font-medium text-nebbia">Quello che Lex fa</p>
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
                    <p className="font-body text-sm font-medium text-nebbia">Quello che non fa</p>
                  </div>
                  <ul className="space-y-3">
                    {[
                      'Non sostituisce il parere dell\'avvocato o del commercialista',
                      'Non genera atti pronti per il deposito nella ricerca libera (quelli nascono nella pratica)',
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
                Il gestionale di studio,{' '}
                <span className="text-oro">con Lex sempre accanto.</span>
              </h3>
              <p className="font-body text-sm text-nebbia/45 leading-relaxed">
                Pratiche, clienti, appuntamenti, udienze, fatture e scadenze nello stesso posto. E quando ti serve un resoconto, Lex legge tutto e ti risponde in italiano.
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">

              {/* SINISTRA — Mockup statico pratica */}
              <FadeIn delay={0.1}>
                <VisualBlock label="Pratica civile - Mario Rossi">
                  <div className="space-y-2">
                    {[
                      { l: 'Cliente', v: 'Mario Rossi' },
                      { l: 'Tipo', v: 'Civile - Locazione' },
                      { l: 'Stato', v: 'Aperta dal 08/2025', c: 'text-salvia' },
                      { l: 'Pross. udienza', v: '28/05/2026', c: 'text-oro' },
                    ].map(({ l, v, c }) => (
                      <div key={l} className="flex justify-between py-1.5 border-b border-white/5">
                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                        <span className={`font-body text-xs ${c || 'text-nebbia/70'}`}>{v}</span>
                      </div>
                    ))}

                    {/* Fatturazione */}
                    <div className="pt-3">
                      <p className="font-body text-xs text-nebbia/25 mb-2">Fatturazione</p>
                      <div className="flex items-center justify-between p-2 bg-petrolio/50 border border-red-400/20">
                        <span className="font-body text-xs text-nebbia/60">Fattura 2026/041</span>
                        <span className="font-body text-xs text-red-400/80">EUR 1.100 - scaduta</span>
                      </div>
                    </div>

                    {/* Ricerche */}
                    <div className="pt-3">
                      <p className="font-body text-xs text-nebbia/25 mb-2">Ricerche (3)</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 p-2 bg-petrolio/50">
                          <Sparkles size={9} className="text-salvia" />
                          <span className="font-body text-xs text-nebbia/50">Analisi Lex - art. 1578 c.c.</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-petrolio/50">
                          <Search size={9} className="text-oro" />
                          <span className="font-body text-xs text-nebbia/50">Eccezione inadempimento locatore</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-petrolio/50">
                          <Bookmark size={9} className="text-oro" />
                          <span className="font-body text-xs text-nebbia/50">Cass. Civ. III 4439/2024</span>
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
              title="Le tue ricerche, etichettate e collegate"
              text="Salvi ogni ricerca legale che fai, la categorizzi con le tue etichette, la colleghi a una pratica o la confronti con altre. Lex AI trova le correlate, suggerisce articoli che non avevi considerato, ragiona insieme a te."
              points={['Etichette personali', 'Confronto tra ricerche', 'Collegamento a pratica', 'Correlate suggerite da Lex AI']}
            >
              <VisualBlock label="Ricerche - Locazione e morosita">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-petrolio border border-oro/15">
                    <Search size={11} className="text-oro/60 shrink-0" />
                    <span className="font-body text-xs text-nebbia/70 flex-1">eccezione inadempimento locatore</span>
                    <span className="font-body text-[10px] text-nebbia/30 shrink-0">14 risultati</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { l: 'Locazione', c: 'oro' },
                      { l: 'Morosita Rossi', c: 'salvia' },
                      { l: 'Da approfondire', c: 'oro' },
                    ].map(({ l, c }) => (
                      <span key={l} className={`font-body text-[10px] px-2 py-0.5 border ${c === 'salvia' ? 'bg-salvia/10 border-salvia/25 text-salvia/80' : 'bg-oro/10 border-oro/25 text-oro/80'}`}>
                        # {l}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {[
                      { t: 'Art. 1578 c.c. - vizi della cosa locata', sub: 'Salvata 2 giorni fa', highlight: true },
                      { t: 'Cass. Civ. III 4439/2024 - inadempimento locatore', sub: 'Salvata 5 giorni fa' },
                      { t: 'Art. 1453 c.c. - risoluzione per inadempimento', sub: 'Salvata 1 settimana fa' },
                    ].map(({ t, sub, highlight }) => (
                      <div key={t} className={`flex items-start gap-2 p-2.5 ${highlight ? 'bg-salvia/5 border border-salvia/15' : 'bg-petrolio/50 border border-white/5'}`}>
                        <Bookmark size={10} className={`mt-0.5 shrink-0 ${highlight ? 'text-salvia' : 'text-nebbia/40'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-xs text-nebbia/70 truncate">{t}</p>
                          <p className="font-body text-[10px] text-nebbia/30">{sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-salvia/5 border border-salvia/15 mt-2">
                    <Sparkles size={11} className="text-salvia shrink-0" />
                    <p className="font-body text-[11px] text-nebbia/55 leading-snug">
                      Lex suggerisce: <span className="text-salvia">art. 1587 c.c.</span> sull'obbligo di custodia del conduttore - correlato.
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
                I documenti dello studio,{' '}
                <span className="text-oro">sempre a portata.</span>
              </h3>
              <p className="font-body text-sm text-nebbia/45 leading-relaxed">
                Carichi, ritrovi, condividi. La gestione e la ricerca dell'archivio in un flusso unico, senza mai uscire dal contesto della pratica.
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
            <SectionLabel>Banca dati condivisa</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
              Il tuo archivio diventa{' '}
              <span className="text-oro">una risorsa.</span>
            </h2>
            <p className="font-body text-base text-nebbia/40 leading-relaxed">
              Le sentenze che hai gia lavorato, anonimizzate e condivise, fanno crescere il sapere collettivo della professione. E ti restituiscono valore economico.
            </p>
          </FadeIn>

          <FeatureRow
            icon={BookOpen}
            title="Valorizza il tuo archivio interno"
            text="Anonimizza le tue sentenze e rendile disponibili in piattaforma. Gli altri avvocati che ne hanno bisogno possono acquistarle, e una quota torna a te. Il lavoro gia svolto diventa una risorsa economica."
            points={['Anonimizzazione sentenze', 'Pubblicazione in piattaforma', 'Monetizzazione archivio', 'Accesso a contenuti di altri avvocati']}
          >
            <VisualBlock label="Banca dati Lexum">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-body text-xs text-nebbia/30">1 risultato - Diritto Civile / Contratti</span>
                </div>
                <div className="border border-white/8 p-4">
                  <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Diritto Civile / Contratti / Inadempimento</p>
                  <p className="font-body text-sm font-medium text-nebbia mb-1">Revoca patente - Omicidio stradale - Cass. Ord. n. 8058/2026</p>
                  <p className="font-body text-xs text-nebbia/40 mb-2">Nino Avvocato - Corte di Cassazione - 2026</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {['revoca patente', 'omicidio stradale', 'art. 589-bis'].map(t => (
                        <span key={t} className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">{t}</span>
                      ))}
                    </div>
                    <span className="font-body text-xs text-oro font-medium">EUR 5</span>
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
              <SectionLabel color="salvia">Area cliente</SectionLabel>
              <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
                Anche il cliente{' '}
                <span className="text-salvia">ha il suo spazio.</span>
              </h2>
              <p className="font-body text-base text-nebbia/40 leading-relaxed">
                Documenti, appuntamenti, udienze e comunicazioni in un'area riservata. Lo studio lavora, il cliente resta informato.
              </p>
            </FadeIn>

            <FeatureRow
              icon={Users}
              title="Un accesso dedicato anche per il cliente"
              text="Il cliente accede alla propria area riservata e trova documenti, appuntamenti, udienze e materiali condivisi dallo studio. Puo caricare file direttamente in piattaforma. Meno email disperse, meno file persi."
              points={['Accesso riservato', 'Documenti condivisi', 'Comunicazioni ordinate']}
              reverse
            >
              <VisualBlock label="Area cliente - Paolino Rossi" accent="salvia">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-salvia/5 border border-salvia/10">
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-salvia" />
                      <span className="font-body text-xs text-nebbia/60">Perizia tecnica.pdf</span>
                    </div>
                    <span className="font-body text-xs text-nebbia/25">Condiviso</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-petrolio/50 border border-white/5">
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-nebbia/30" />
                      <span className="font-body text-xs text-nebbia/60">Contratto_firmato.pdf</span>
                    </div>
                    <span className="font-body text-xs text-salvia/60">Caricato da te</span>
                  </div>
                  <div className="p-3 bg-oro/5 border border-oro/15 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-oro animate-pulse" />
                    <span className="font-body text-xs text-nebbia/50">Prossima udienza: 25/04/2026</span>
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
            <SectionLabel>Inizia ora</SectionLabel>
            <h2 className="font-display text-4xl md:text-5xl font-light text-nebbia mb-6">
              Inizia da Lex AI.{' '}
              <span className="text-oro">Il resto è dentro Lexum.</span>
            </h2>
            <p className="font-body text-base text-nebbia/45 leading-relaxed mb-10 max-w-xl mx-auto">
              Ricerca libera gratuita sulla banca dati. E quando lavori su una pratica o un mandato, Lex è già lì con te, con il contesto del caso.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link to="/registrati" className="flex items-center gap-2.5 px-10 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-xl shadow-oro/20">
                Inizia gratis <ArrowRight size={15} />
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-2">
              <Link to="/per-avvocati" className="font-body text-sm text-nebbia/35 hover:text-nebbia/60 transition-colors">
                Scopri Lexum per avvocati
              </Link>
              <span className="hidden sm:block w-px h-4 bg-white/10" />
              <Link to="/per-commercialisti" className="font-body text-sm text-nebbia/35 hover:text-nebbia/60 transition-colors">
                Scopri Lexum per commercialisti
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
