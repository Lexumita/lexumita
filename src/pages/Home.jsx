// src/pages/ComeFunziona.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Sparkles, FolderOpen, Users, FileText,
  BookOpen, Shield, Zap, ChevronDown, Check, Scale,
  Search, Brain, Lock, FileSignature
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

// ─── Sezione label ───────────────────────────────────────────
function SectionLabel({ children, color = 'oro' }) {
  const c = color === 'salvia' ? 'text-salvia/70' : 'text-oro/60'
  return <p className={`font-body text-xs ${c} tracking-[0.3em] uppercase mb-3`}>{children}</p>
}

// ─── Divisore oro ────────────────────────────────────────────
function Divider() {
  return (
    <div className="flex items-center gap-4 my-12">
      <div className="flex-1 h-px bg-white/5" />
      <div className="w-1 h-1 bg-oro/40 rotate-45" />
      <div className="flex-1 h-px bg-white/5" />
    </div>
  )
}

// ─── Feature row ─────────────────────────────────────────────
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

// ─── Visual placeholder elegante ─────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// PAGINA
// ─────────────────────────────────────────────────────────────
export default function ComeFunziona() {
  const [scrolled, setScrolled] = useState(false)
  const [lexTyped, setLexTyped] = useState('')
  const lexText = 'Sto gestendo una controversia locativa. Il cliente contesta i conteggi della morosità.'

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  // Animazione testo Lex
  useEffect(() => {
    let i = 0
    const t = setInterval(() => {
      if (i <= lexText.length) { setLexTyped(lexText.slice(0, i)); i++ }
      else clearInterval(t)
    }, 35)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden">

      {/* ══════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center pt-32 md:pt-28 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-oro/[0.04] rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-salvia/[0.05] rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-[0.025]" style={{
            backgroundImage: `linear-gradient(#C9A45C 1px, transparent 1px), linear-gradient(90deg, #C9A45C 1px, transparent 1px)`,
            backgroundSize: '80px 80px'
          }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 text-center" style={{ animation: 'heroIn 1s cubic-bezier(.4,0,.2,1) both' }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-oro/20 bg-oro/5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse" />
            <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">Legal Technology per professionisti italiani</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-light text-nebbia leading-[1.1] mb-6">
            Il modo più veloce per{' '}
            <br className="hidden md:block" />
            <span className="text-oro-shimmer">gestire, cercare</span>{' '}
            e lavorare{' '}
            <br className="hidden md:block" />
            un caso legale.
          </h1>

          <p className="font-body text-base md:text-lg text-nebbia/45 leading-relaxed max-w-2xl mx-auto mb-10">
            Lexum unisce in un solo ambiente gestionale, documenti, area cliente, banca dati e assistenza AI.
            Meno strumenti separati, meno tempo perso, più continuità nel lavoro dello studio.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link to="/registrati" className="flex items-center gap-2.5 px-8 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-lg shadow-oro/20">
              Provalo gratis per una settimana <ArrowRight size={15} />
            </Link>
            <a href="#features" className="flex items-center gap-2 px-8 py-4 border border-white/10 text-nebbia/50 font-body text-sm hover:border-white/25 hover:text-nebbia transition-colors">
              Scopri le funzionalità
            </a>
          </div>
          <p className="font-body text-xs text-nebbia/25">
            Nessuna complessità inutile. Entri, organizzi e inizi a lavorare meglio da subito.
          </p>

          {/* Mini preview UI */}
          <div className="mt-16 relative max-w-3xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-t from-petrolio via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-slate/80 border border-white/8 overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-petrolio/60">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                </div>
                <span className="font-body text-xs text-nebbia/20 ml-2">lexum.it — Dashboard</span>
              </div>
              <div className="grid grid-cols-4 h-40">
                {[
                  { l: 'Pratiche', n: '12', c: 'text-oro' },
                  { l: 'Clienti', n: '34', c: 'text-nebbia' },
                  { l: 'Udienze', n: '3', c: 'text-salvia' },
                  { l: 'Crediti Lex', n: '847', c: 'text-nebbia' },
                ].map((item, i) => (
                  <div key={i} className="border-r border-white/5 last:border-0 flex flex-col items-center justify-center gap-1">
                    <p className={`font-display text-3xl font-light ${item.c}`}>{item.n}</p>
                    <p className="font-body text-xs text-nebbia/30">{item.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <a href="#problema" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-nebbia/20 animate-bounce">
          <ChevronDown size={20} />
        </a>
      </section>

      {/* ══════════════════════════════════════════
          2. PROBLEMA
      ══════════════════════════════════════════ */}
      <section id="problema" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="max-w-2xl">
            <SectionLabel>Il problema</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-6">
              Il problema non è solo il carico di lavoro.{' '}
              <span className="text-nebbia/35">È la frammentazione.</span>
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
            <FadeIn delay={0.1}>
              <div className="bg-slate border border-white/5 p-6 h-full">
                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-4">Oggi</p>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-5">
                  Molti avvocati lavorano tra gestionale, archivi, documenti, email, note, banche dati e strumenti AI separati.
                  Ogni attività richiede passaggi in più, ricerche ripetute e tempo perso nel cambiare contesto.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Gestionale', 'Archivio', 'Email', 'Note', 'Banche dati', 'AI esterno'].map(t => (
                    <span key={t} className="font-body text-xs px-2 py-1 bg-red-500/8 border border-red-500/15 text-red-400/60">{t}</span>
                  ))}
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="bg-slate border border-oro/20 p-6 h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-oro/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl pointer-events-none" />
                <p className="font-body text-xs text-oro/60 uppercase tracking-widest mb-4">Con Lexum</p>
                <p className="font-body text-sm text-nebbia/60 leading-relaxed mb-5">
                  Lexum riunisce tutto in un solo flusso di lavoro. Un ambiente, tutto connesso, nessun cambio di contesto.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['Gestionale', 'Documenti', 'Area cliente', 'Banca dati', 'Lex AI'].map(t => (
                    <span key={t} className="font-body text-xs px-2 py-1 bg-salvia/10 border border-salvia/20 text-salvia">{t}</span>
                  ))}
                </div>
                <p className="font-body text-sm text-oro flex items-center gap-2">
                  <Check size={14} /> Un solo ambiente. Tutto connesso.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          3. PROMESSA
      ══════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-slate/30">
        <div className="max-w-5xl mx-auto text-center">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-5xl font-light text-nebbia">
              Meno dispersione.{' '}
              <span className="text-oro">Più velocità.</span>{' '}
              Più controllo.
            </h2>
            <p className="font-body text-base text-nebbia/40 max-w-2xl mx-auto mt-5 leading-relaxed">
              Lexum nasce per abbreviare i tempi del lavoro legale. Non aggiunge un altro strumento da imparare:
              elimina passaggi, centralizza le informazioni e ti aiuta a trovare prima quello che serve.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          4. FUNZIONALITÀ
      ══════════════════════════════════════════ */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto space-y-24">

          {/* 4.1 Gestionale */}
          <FeatureRow
            icon={FolderOpen}
            title="Gestionale completo per studio, pratiche e clienti"
            text="Gestisci pratiche, clienti, appuntamenti, udienze, scadenze e attività operative in un unico sistema. Ogni informazione resta collegata al caso, così il lavoro quotidiano è più ordinato, più leggibile e più rapido."
            points={['Pratiche e anagrafiche clienti', 'Appuntamenti e udienze', 'Attività e scadenze', 'Panoramica operativa chiara']}
          >
            <VisualBlock label="Pratica — Omicidio stradale">
              <div className="space-y-2">
                {[
                  { l: 'Cliente', v: 'Mario Rossi' },
                  { l: 'Tipo', v: 'Penale' },
                  { l: 'Pross. udienza', v: '25/04/2026', c: 'text-oro' },
                  { l: 'Stato', v: 'Aperta', c: 'text-salvia' },
                ].map(({ l, v, c }) => (
                  <div key={l} className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                    <span className={`font-body text-xs ${c || 'text-nebbia/70'}`}>{v}</span>
                  </div>
                ))}
                <div className="pt-2">
                  <p className="font-body text-xs text-nebbia/25 mb-2">Ricerche (3)</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 p-2 bg-petrolio/50">
                      <Sparkles size={9} className="text-salvia" />
                      <span className="font-body text-xs text-nebbia/50">Analisi Lex — Art. 589-bis c.p.</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-petrolio/50">
                      <Search size={9} className="text-oro" />
                      <span className="font-body text-xs text-nebbia/50">Revoca patente — note manuali</span>
                    </div>
                  </div>
                </div>
              </div>
            </VisualBlock>
          </FeatureRow>

          <Divider />

          {/* 4.2 Area cliente */}
          <FeatureRow
            icon={Users}
            title="Un accesso dedicato anche per il cliente"
            text="Il cliente accede alla propria area riservata e trova documenti, appuntamenti, udienze e materiali condivisi dallo studio. Può caricare file direttamente in piattaforma. Meno email disperse, meno file persi."
            points={['Accesso riservato', 'Documenti condivisi', 'Caricamento diretto', 'Comunicazioni ordinate']}
            reverse
          >
            <VisualBlock label="Area cliente — Paolino Rossi" accent="salvia">
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

          <Divider />

          {/* 4.3 + 4.4 Documentale + Archivio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FadeIn delay={0.1}>
              <div className="bg-slate border border-white/5 p-6 h-full hover:border-oro/15 transition-colors">
                <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/10 text-oro mb-4">
                  <FileText size={17} />
                </div>
                <h3 className="font-display text-xl font-light text-nebbia mb-3">Gestione documentale</h3>
                <p className="font-body text-sm text-nebbia/45 leading-relaxed mb-4">
                  Organizza, consulta e recupera rapidamente tutto ciò che serve. Documenti e file restano ordinati e collegati alle pratiche.
                </p>
                <ul className="space-y-1.5">
                  {['Documenti per pratica', 'Caricamento semplice', 'Archivio ordinato', 'Accesso rapido'].map(p => (
                    <li key={p} className="flex items-center gap-2 font-body text-xs text-nebbia/35">
                      <div className="w-1 h-1 rounded-full bg-oro shrink-0" />{p}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="bg-slate border border-white/5 p-6 h-full hover:border-oro/15 transition-colors">
                <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/10 text-oro mb-4">
                  <Zap size={17} />
                </div>
                <h3 className="font-display text-xl font-light text-nebbia mb-3">Archivio digitale intelligente</h3>
                <p className="font-body text-sm text-nebbia/45 leading-relaxed mb-3">
                  Con la carta devi aprire foglio per foglio. Con il digitale cerchi e trovi subito.
                  Lexum rende la migrazione semplice, ordinata e sostenibile.
                </p>
                <p className="font-body text-xs text-nebbia/30 italic leading-relaxed">
                  "Digitalizzare non deve essere un ostacolo. Deve essere un miglioramento concreto e facile da adottare."
                </p>
              </div>
            </FadeIn>
          </div>

          <Divider />

          {/* 4.5 Banca dati */}
          <FeatureRow
            icon={BookOpen}
            title="Valorizza il tuo archivio interno"
            text="Anonimizza le tue sentenze e rendile disponibili in piattaforma. Gli altri avvocati che ne hanno bisogno possono acquistarle, e una quota va a te. Il lavoro già svolto diventa una risorsa economica."
            points={['Anonimizzazione sentenze', 'Pubblicazione in piattaforma', 'Monetizzazione archivio', 'Accesso a contenuti di altri avvocati']}
          >
            <VisualBlock label="Banca dati Lexum">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-body text-xs text-nebbia/30">1 risultato — Diritto Civile › Contratti</span>
                </div>
                <div className="border border-white/8 p-4">
                  <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Diritto Civile › Contratti › Inadempimento</p>
                  <p className="font-body text-sm font-medium text-nebbia mb-1">Revoca patente — Omicidio stradale — Cass. Ord. n. 8058/2026</p>
                  <p className="font-body text-xs text-nebbia/40 mb-2">Nino Avvocato · Corte di Cassazione · 2026</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {['revoca patente', 'omicidio stradale', 'art. 589-bis'].map(t => (
                        <span key={t} className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">{t}</span>
                      ))}
                    </div>
                    <span className="font-body text-xs text-oro font-medium">1.99€</span>
                  </div>
                </div>
              </div>
            </VisualBlock>
          </FeatureRow>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          5. LEX AI
      ══════════════════════════════════════════ */}
      <section id="lexai" className="py-24 px-6 bg-slate/20 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-salvia/[0.04] rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto relative">
          <FadeIn className="text-center mb-16">
            <SectionLabel color="salvia">Intelligenza artificiale</SectionLabel>
            <h2 className="font-display text-3xl md:text-5xl font-light text-nebbia mb-4">
              Un vero assistente personale<br />
              <span className="text-salvia">per il lavoro legale.</span>
            </h2>
            <p className="font-body text-base text-nebbia/40 max-w-xl mx-auto">
              Non è una chat generica aperta in una finestra a parte.
              È uno strumento pensato per il contesto del lavoro legale italiano.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <FadeIn delay={0.1}>
              <div className="space-y-3">
                {[
                  { icon: Search, t: 'Analisi normativa', d: 'Cerca nelle norme vigenti e spiega quali articoli si applicano al caso, con ragionamento completo.' },
                  { icon: Scale, t: 'Strategie processuali', d: 'Suggerisce strategie concrete, eccezioni da sollevare e argomenti da sviluppare in udienza.' },
                  { icon: Brain, t: 'Conversazione continua', d: 'Approfondisci, cambia angolazione, chiedi follow-up. La conversazione si sviluppa nel tempo.' },
                  { icon: Sparkles, t: 'Strategia su misura', d: 'Legge tutte le ricerche della pratica e genera una strategia processuale personalizzata.' },
                  { icon: BookOpen, t: 'Sentenze correlate', d: 'Suggerisce quali sentenze della banca dati vale la pena consultare, basandosi sul caso.' },
                  { icon: FileSignature, t: 'Atti già compilati', d: 'Legge i dati della pratica e produce diffide, comparse, istanze e altri atti pronti per l\'esportazione.' },
                ].map(({ icon: I, t, d }, i) => (
                  <FadeIn key={i} delay={0.1 + i * 0.08}>
                    <div className="flex gap-4 p-4 bg-slate border border-white/5 hover:border-salvia/20 transition-colors group">
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
                <FadeIn delay={0.6}>
                  <p className="font-body text-xs text-nebbia/25 italic px-2 mt-2">
                    "L'obiettivo non è sostituire l'avvocato. È fargli risparmiare tempo vero."
                  </p>
                </FadeIn>
              </div>
            </FadeIn>

            {/* Chat demo */}
            <FadeIn delay={0.3}>
              <div className="bg-slate border border-salvia/15 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-petrolio/60">
                  <Sparkles size={13} className="text-salvia" />
                  <span className="font-body text-xs text-salvia">Lex — AI Assistant</span>
                  <span className="ml-auto flex items-center gap-1.5 font-body text-xs text-nebbia/25">
                    <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse" />847 crediti
                  </span>
                </div>
                <div className="p-5 space-y-4">
                  {/* Messaggio utente */}
                  <div>
                    <p className="font-body text-xs text-oro/50 mb-1.5">Tu</p>
                    <div className="bg-petrolio border border-white/8 px-4 py-3">
                      <p className="font-body text-sm text-nebbia/65 leading-relaxed">{lexTyped}<span className="animate-pulse">|</span></p>
                    </div>
                  </div>
                  {/* Risposta Lex */}
                  <div>
                    <p className="font-body text-xs text-salvia/50 mb-1.5">Lex</p>
                    <div className="bg-salvia/5 border border-salvia/15 px-4 py-4 space-y-3">
                      <div>
                        <p className="font-body text-xs font-semibold text-nebbia mb-1">Norme applicabili</p>
                        <p className="font-body text-xs text-nebbia/55 leading-relaxed">Art. 55 L. 392/78 — sanatoria della morosità. Il conduttore può evitare lo sfratto pagando entro il termine fissato dal giudice.</p>
                      </div>
                      <div>
                        <p className="font-body text-xs font-semibold text-nebbia mb-1">Strategia raccomandata</p>
                        <p className="font-body text-xs text-nebbia/55 leading-relaxed">Richiedere la concessione del termine per il pagamento. Contestare il conteggio degli interessi applicando il tasso legale, non quello contrattuale se non espressamente pattuito...</p>
                      </div>
                      <div className="border-t border-white/5 pt-3">
                        <p className="font-body text-xs text-oro/60 flex items-center gap-1.5">
                          <BookOpen size={10} /> 1 sentenza correlata in banca dati
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Input */}
                  <div className="bg-petrolio border border-salvia/20 px-4 py-2.5 flex items-center justify-between">
                    <span className="font-body text-xs text-nebbia/20">Approfondisci o fai una nuova domanda...</span>
                    <Sparkles size={12} className="text-salvia/40" />
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          6. GENERAZIONE DOCUMENTI
      ══════════════════════════════════════════ */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <FadeIn delay={0.1}>
              <div className="space-y-4">
                <span className="inline-block font-body text-xs px-3 py-1 bg-salvia/10 border border-salvia/20 text-salvia">
                  Novità
                </span>
                <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/10 text-oro">
                  <FileSignature size={18} />
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-light text-nebbia">
                  Atti già compilati,{' '}
                  <span className="text-oro">pronti al deposito.</span>
                </h3>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                  Diffide, comparse, istanze, atti di precetto, appelli. Scegli il template
                  dalla pratica e Lex AI lo compila leggendo i dati di cliente, controparte
                  e fascicolo. L'atto arriva in pochi minuti, formattato e modificabile.
                </p>
                <ul className="space-y-2 pt-2">
                  {[
                    'Sei categorie: stragiudiziale, introduttivo, difensivo, istruttorio, esecutivo, impugnazione',
                    'Compilazione automatica con dati pratica e parti',
                    'Modifica testuale prima dell\'esportazione',
                    'Output in formato .docx pronto da firmare',
                  ].map((p, i) => (
                    <li key={i} className="flex items-center gap-2 font-body text-xs text-nebbia/40">
                      <div className="w-1 h-1 rounded-full bg-oro shrink-0" />{p}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="bg-slate border border-oro/15 overflow-hidden">
                {/* Header documento */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-petrolio/60">
                  <div className="flex items-center gap-2">
                    <FileSignature size={13} className="text-oro" />
                    <span className="font-body text-xs text-nebbia/60">Diffida_Rossi_vs_Acme.docx</span>
                  </div>
                  <span className="font-body text-[10px] px-2 py-0.5 bg-salvia/10 border border-salvia/20 text-salvia uppercase tracking-widest">
                    Generato
                  </span>
                </div>

                {/* Corpo simulato */}
                <div className="p-6 space-y-4 bg-nebbia/[0.02]">
                  <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">
                    Stragiudiziale · Diffida ad adempiere
                  </p>

                  <div className="text-center">
                    <p className="font-display text-sm text-nebbia/80 mb-1">Spett.le ACME S.r.l.</p>
                    <p className="font-body text-xs text-nebbia/40">
                      Via Roma 12 — 20121 Milano (MI)
                    </p>
                  </div>

                  <div className="space-y-2 text-justify">
                    <p className="font-body text-xs text-nebbia/55 leading-relaxed">
                      <span className="text-oro/80">Il sottoscritto Avv. Mario Bianchi</span>,
                      con studio in Milano, in nome e per conto del proprio assistito{' '}
                      <span className="text-oro/80">Sig. Mario Rossi</span>, premesso che…
                    </p>
                    <p className="font-body text-xs text-nebbia/45 leading-relaxed">
                      …con la presente <span className="font-medium text-nebbia/70">DIFFIDA</span>{' '}
                      la S.V. ad adempiere entro e non oltre 15 giorni…
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="font-body text-[10px] text-nebbia/25 uppercase tracking-widest">
                      4 sezioni · modificabili
                    </span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                </div>

                {/* Footer azioni */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-petrolio/40">
                  <span className="flex items-center gap-1.5 font-body text-[10px] text-salvia/60">
                    <Sparkles size={10} /> Compilato con Lex AI dai dati pratica
                  </span>
                  <span className="font-body text-[10px] text-oro/60">Esporta .docx →</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          7. COME FUNZIONA
      ══════════════════════════════════════════ */}
      <section id="howto" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <SectionLabel>Workflow</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia">Come lavora uno studio su Lexum</h2>
          </FadeIn>

          <div className="relative">
            {/* Linea connettore */}
            <div className="hidden lg:block absolute top-6 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-oro/20 to-transparent" />

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { n: '01', t: 'Gestisci', d: 'Pratica, cliente, attività, udienze e scadenze in un solo ambiente.' },
                { n: '02', t: 'Organizza', d: 'Documenti caricati, ordinati e collegati ognuno al proprio caso.' },
                { n: '03', t: 'Coinvolgi', d: 'Il cliente accede all\'area riservata e condivide materiali.' },
                { n: '04', t: 'Cerca', d: 'Banca dati e archivio digitale per trovare ciò che serve.' },
                { n: '05', t: 'Approfondisci', d: 'Utilizza Lex AI per analisi normativa e strategie su misura.' },
              ].map((s, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="bg-slate border border-white/5 p-5 hover:border-oro/20 transition-all group text-center relative">
                    <div className="w-12 h-12 flex items-center justify-center border border-oro/20 text-oro font-body text-xs mx-auto mb-4 group-hover:bg-oro/10 transition-colors">
                      {s.n}
                    </div>
                    <p className="font-body text-sm font-medium text-nebbia mb-2">{s.t}</p>
                    <p className="font-body text-xs text-nebbia/35 leading-relaxed">{s.d}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>

          {/* Esempio concreto */}
          <FadeIn delay={0.3} className="mt-12">
            <div className="bg-slate border border-oro/15 p-6 md:p-8">
              <p className="font-body text-xs text-oro/60 uppercase tracking-widest mb-4">Esempio concreto</p>
              <p className="font-body text-sm text-nebbia/60 leading-relaxed mb-6">
                Un avvocato apre una pratica, controlla i documenti caricati, verifica appuntamenti e udienze già fissate,
                consulta il materiale condiviso dal cliente e attiva Lex AI per capire quali riferimenti approfondire.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-petrolio border border-white/5 p-4">
                  <p className="font-body text-xs text-oro/50 mb-2">Avvocato</p>
                  <p className="font-body text-sm text-nebbia/60 italic">"Sto gestendo una controversia locativa. Quali sentenze presenti in piattaforma potrebbero essermi più utili?"</p>
                </div>
                <div className="bg-salvia/5 border border-salvia/15 p-4">
                  <p className="font-body text-xs text-salvia/60 mb-2">Lex AI</p>
                  <p className="font-body text-sm text-nebbia/60 italic">"Ti consiglio di partire da queste decisioni, perché trattano questioni simili per contesto, eccezioni sollevate e impostazione del caso."</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          8. PERCHÉ LEXUM + FIDUCIA
      ══════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-slate/20 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

            <FadeIn>
              <SectionLabel>Perché sceglierci</SectionLabel>
              <h2 className="font-display text-3xl font-light text-nebbia mb-6">
                Lexum non aggiunge un altro strumento al lavoro legale.{' '}
                <span className="text-oro">Riduce quelli che servono.</span>
              </h2>
              <p className="font-body text-sm text-nebbia/40 leading-relaxed mb-8">
                Per avvocati, studi legali e realtà professionali che vogliono centralizzare il lavoro,
                velocizzare la ricerca e gestire meglio il rapporto con il cliente.
              </p>
              <div className="space-y-2">
                {[
                  'Unifica strumenti che oggi sono separati',
                  'Riduce il tempo perso nella gestione operativa',
                  'Migliora il recupero delle informazioni',
                  'Semplifica il rapporto con il cliente',
                  'Valorizza l\'archivio dello studio',
                  'Aiuta a cercare meglio grazie all\'AI',
                  'Rende il lavoro più continuo, ordinato e veloce',
                ].map((item, i) => (
                  <FadeIn key={i} delay={i * 0.06}>
                    <div className="flex items-center gap-3 py-2 border-b border-white/5">
                      <Check size={13} className="text-salvia shrink-0" />
                      <p className="font-body text-sm text-nebbia/55">{item}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="space-y-5">
                {/* Card fiducia */}
                <div className="bg-slate border border-white/5 p-6">
                  <div className="w-10 h-10 flex items-center justify-center border border-white/10 text-nebbia/40 mb-4">
                    <Shield size={17} />
                  </div>
                  <h3 className="font-display text-xl font-light text-nebbia mb-3">Pensato per precisione e riservatezza</h3>
                  <p className="font-body text-sm text-nebbia/45 leading-relaxed">
                    Lexum è progettato per aiutare lo studio a lavorare in modo più strutturato, con accessi dedicati,
                    informazioni ordinate e una gestione più chiara dei materiali condivisi.
                  </p>
                </div>

                {/* Card target */}
                <div className="bg-slate border border-oro/15 p-6">
                  <div className="w-10 h-10 flex items-center justify-center border border-oro/20 bg-oro/10 text-oro mb-4">
                    <Users size={17} />
                  </div>
                  <h3 className="font-display text-xl font-light text-nebbia mb-3">Per chi è pensato Lexum</h3>
                  <div className="space-y-2">
                    {['Avvocati singoli', 'Studi legali strutturati', 'Realtà professionali in crescita'].map(t => (
                      <div key={t} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-oro shrink-0" />
                        <p className="font-body text-sm text-nebbia/55">{t}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quote */}
                <div className="border-l-2 border-oro/30 pl-4">
                  <p className="font-body text-sm text-nebbia/35 italic leading-relaxed">
                    "Il cuore della piattaforma è uno solo: fare risparmiare tempo, centralizzare il lavoro
                    e rendere semplice anche ciò che oggi sembra scomodo."
                  </p>
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
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-oro/10 to-transparent" />
          <div className="absolute inset-0 opacity-[0.015]" style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, #C9A45C, transparent 65%)'
          }} />
        </div>

        <div className="max-w-2xl mx-auto text-center relative">
          <FadeIn>
            <div className="w-12 h-12 flex items-center justify-center border border-oro/30 bg-oro/10 mx-auto mb-8">
              <Sparkles size={20} className="text-oro" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-light text-nebbia mb-4">
              Provalo{' '}<br />
              <span className="text-oro">Gratis una settimana.</span>
            </h2>
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-oro/50 to-transparent mx-auto my-6" />
            <p className="font-body text-sm text-nebbia/40 leading-relaxed mb-10 max-w-lg mx-auto">
              Porta in un unico ambiente gestione, documenti, clienti, archivio, banca dati e assistenza AI.
              Inizia a lavorare con più ordine, più velocità e meno attrito.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/registrati" className="flex items-center gap-2.5 px-10 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-xl shadow-oro/20">
                Attiva Lexum Gratis per una settimana <ArrowRight size={15} />
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