// src/pages/Home.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Sparkles, FolderOpen, Users, FileText,
  BookOpen, Shield, Zap, ChevronDown, Check, Scale,
  Search, Brain, Lock, FileSignature, Library, Bookmark,
  FolderSearch, Briefcase
} from 'lucide-react'

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
            { t: 'Giurisprudenza italiana' },
            { t: 'Normativa italiana' },
            { t: 'Diritto dell\'Unione Europea' },
            { t: 'Prassi e corpus condiviso' },
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

// PAGINA
export default function Home() {

  return (
    <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden">

      {/* 1. HERO */}
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
              <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">Per studi legali e avvocati italiani</span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-light text-nebbia leading-[1.1] mb-6">
              Cerca, ragiona, lavora.{' '}
              <br className="hidden md:block" />
              Su <span className="text-oro-shimmer">Quattro milioni</span> di norme.
            </h1>

            <p className="font-body text-base md:text-lg text-nebbia/50 leading-relaxed max-w-2xl mx-auto mb-10">
              Su Lexum trovi quello che ti serve, salvi una ricerca, la confronti, la colleghi a una pratica, ci ragioni sopra con Lex AI. Più ordine, Più Velocità, Più valore.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link to="/registrati" className="flex items-center gap-2.5 px-8 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-lg shadow-oro/20">
                Fai la tua prima ricerca legale è Gratis <ArrowRight size={15} />
              </Link>
              <a href="#features" className="flex items-center gap-2 px-8 py-4 border border-white/10 text-nebbia/50 font-body text-sm hover:border-white/25 hover:text-nebbia transition-colors">
                Scopri le funzionalità
              </a>
            </div>
            <p className="font-body text-xs text-nebbia/25 mb-16">
              Nessuna carta richiesta. La banca dati e sempre gratuita.
            </p>
          </div>

          {/* Hero card grande + griglia 6 card */}
          <FadeIn delay={0.15}>
            <div className="space-y-4">
              <HeroDatabaseCard />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <MiniCard
                  icon={Search}
                  title="Ricerca legale"
                  text="Trova articoli, sentenze e prassi. Usa Lex AI per cercare con linguaggio naturale."
                  anchor="#lexai"
                />
                <MiniCard
                  icon={Bookmark}
                  title="Salva le tue ricerche"
                  text="Categorizzale per etichetta, confrontale tra loro. Lex AI le analizza e trova i correlati."
                  anchor="#ricerche"
                />
                <MiniCard
                  icon={FolderSearch}
                  title="Archivio intelligente"
                  text="Carica i tuoi documenti. Lex AI ti aiuta atrovare quello che ti serve quando ti serve."
                  anchor="#archivio"
                />
                <MiniCard
                  icon={Briefcase}
                  title="Analisi del caso"
                  text="Salva le tue ricerche dentro la pratica che stai seguendo. Lex verifica cosa manca, suggerisce strategie."
                  anchor="#lexai"
                />
                <MiniCard
                  icon={FileSignature}
                  title="Generazione atti"
                  text="Lex genera gli atti partendo dai tuoi dati anagrafici e i dati della pratica, risparmio di tempo garantito."
                  anchor="#lexai"
                />
                <MiniCard
                  icon={Users}
                  title="Portale clienti"
                  text="Il cliente accede a documenti, udienze, comunicazioni. Tu lavori, lui non chiama."
                  anchor="#cliente"
                />
              </div>
            </div>
          </FadeIn>
        </div>

        <a href="#problema" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-nebbia/20 animate-bounce hidden md:block">
          <ChevronDown size={20} />
        </a>
      </section>

      {/* 2. PROBLEMA */}
      <section id="problema" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="max-w-2xl">
            <SectionLabel>Il problema</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-6">
              Il problema non e solo il carico di lavoro.{' '}
              <span className="text-nebbia/35">E la frammentazione.</span>
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
            <FadeIn delay={0.1}>
              <div className="bg-slate border border-white/5 p-6 h-full">
                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-4">Oggi</p>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-5">
                  Molti avvocati lavorano tra gestionale, archivi, documenti, email, note, banche dati e strumenti AI separati. Ogni attivita richiede passaggi in piu, ricerche ripetute e tempo perso nel cambiare contesto.
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
                  Tutto resta connesso e collegato al caso. Le ricerche entrano nelle pratiche, i documenti si trovano dove servono, l'AI lavora su materiali tuoi e su fonti verificate.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['Gestionale', 'Archivio', 'Area cliente', 'Banca dati', 'Lex AI'].map(t => (
                    <span key={t} className="font-body text-xs px-2 py-1 bg-salvia/10 border border-salvia/20 text-salvia">{t}</span>
                  ))}
                </div>
                <p className="font-body text-sm text-oro flex items-center gap-2">
                  <Check size={14} /> Un ambiente coerente, non una somma di strumenti.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* 3. FUNZIONALITA */}
      <section id="features" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto space-y-24">

          <FadeIn className="text-center mb-4 max-w-2xl mx-auto">
            <SectionLabel>Funzionalita</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia">
              Quello che lo studio fa ogni giorno,{' '}
              <span className="text-oro">in un unico flusso.</span>
            </h2>
          </FadeIn>

          {/* 3.1 Gestionale */}
          <div id="gestionale" className="scroll-mt-28">
            <FeatureRow
              icon={FolderOpen}
              title="Gestionale per studio, pratiche e clienti"
              text="Pratiche, clienti, appuntamenti, udienze, scadenze e attivita operative collegate al caso. Ogni informazione resta dove serve, vicino al lavoro che la richiede."
              points={['Pratiche e anagrafiche clienti', 'Appuntamenti e udienze', 'Attivita e scadenze', 'Panoramica operativa per pratica']}
              reverse
            >
              <VisualBlock label="Pratica - Omicidio stradale">
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
                        <span className="font-body text-xs text-nebbia/50">Analisi Lex - Art. 589-bis c.p.</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-petrolio/50">
                        <Search size={9} className="text-oro" />
                        <span className="font-body text-xs text-nebbia/50">Revoca patente - note manuali</span>
                      </div>
                    </div>
                  </div>
                </div>
              </VisualBlock>
            </FeatureRow>
          </div>

          <Divider />

          {/* 3.3 Ricerche organizzate */}
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

          {/* 3.4 Documentale + Archivio */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
              <FadeIn delay={0.1}>
                <div className="bg-slate border border-white/5 p-4">
                  <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-3">Caricamento in corso</p>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center border border-salvia/20 bg-salvia/10 shrink-0">
                        <Check size={12} className="text-salvia" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-nebbia/70 truncate">Curriculum_Bianchi_Mario.pdf</p>
                        <p className="font-body text-[10px] text-nebbia/30">Caricato in: Pratica 2026/047 - Mario Rossi</p>
                      </div>
                      <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/10 border border-salvia/20 text-salvia/80 uppercase tracking-widest shrink-0">Completato</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center border border-oro/20 bg-oro/5 shrink-0">
                        <FileText size={12} className="text-oro" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-nebbia/70 truncate">Contratto_locazione.pdf</p>
                        <div className="h-1 bg-petrolio mt-1 overflow-hidden">
                          <div className="h-full bg-oro/60" style={{ width: '64%' }} />
                        </div>
                      </div>
                      <span className="font-body text-[10px] text-nebbia/40 shrink-0">64%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center border border-oro/20 bg-oro/5 shrink-0">
                        <FileText size={12} className="text-oro" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-nebbia/70 truncate">Contratto.pdf</p>
                        <div className="h-1 bg-petrolio mt-1 overflow-hidden">
                          <div className="h-full bg-oro/60" style={{ width: '90%' }} />
                        </div>
                      </div>
                      <span className="font-body text-[10px] text-nebbia/40 shrink-0">90%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center border border-salvia/20 bg-salvia/10 shrink-0">
                        <Check size={12} className="text-salvia" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-nebbia/70 truncate">Perizia_tecnica_Rossi.pdf</p>
                        <p className="font-body text-[10px] text-nebbia/30">Caricato in: Pratica 2026/047 - Mario Rossi</p>
                      </div>
                      <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/10 border border-salvia/20 text-salvia/80 uppercase tracking-widest shrink-0">Completato</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center border border-oro/20 bg-oro/5 shrink-0">
                        <FileText size={12} className="text-oro" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-nebbia/70 truncate">Diffida_ACME_srl.docx</p>
                        <div className="h-1 bg-petrolio mt-1 overflow-hidden">
                          <div className="h-full bg-oro/60" style={{ width: '28%' }} />
                        </div>
                      </div>
                      <span className="font-body text-[10px] text-nebbia/40 shrink-0">28%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center border border-salvia/20 bg-salvia/10 shrink-0">
                        <Check size={12} className="text-salvia" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-nebbia/70 truncate">Statuto_societa_srl.pdf</p>
                        <p className="font-body text-[10px] text-nebbia/30">Caricato in: Pratica 2026/047 - Mario Rossi</p>
                      </div>
                      <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/10 border border-salvia/20 text-salvia/80 uppercase tracking-widest shrink-0">Completato</span>
                    </div>
                  </div>
                </div>
              </FadeIn>
              <FadeIn delay={0.2}>
                <div className="bg-slate border border-white/5 p-4">
                  <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-3">Ricerca nell'archivio</p>
                  <div className="flex items-center gap-2 px-3 py-2 bg-petrolio border border-oro/15 mb-3">
                    <Search size={11} className="text-oro/60 shrink-0" />
                    <span className="font-body text-xs text-nebbia/70 flex-1">Rossi 2024</span>
                    <button className="font-body text-[10px] px-2 py-1 bg-oro/10 border border-oro/30 text-oro uppercase tracking-widest shrink-0">
                      Cerca
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-petrolio border border-salvia/15 p-3">
                      <div className="flex items-start gap-2.5">
                        <FileText size={12} className="text-salvia mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-xs text-nebbia/70 mb-0.5 truncate">Perizia_tecnica_Rossi.pdf</p>
                          <p className="font-body text-[10px] text-nebbia/35 leading-relaxed">"...la perizia evidenzia vizi strutturali al locale, con responsabilita imputabile al locatore ai sensi dell'art. 1578 c.c..."</p>
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
                          <p className="font-body text-xs text-nebbia/70 mb-0.5 truncate">Email_Rossi_2024-11-08.pdf</p>
                          <p className="font-body text-[10px] text-nebbia/35 leading-relaxed">"...allego come da accordi la perizia tecnica relativa all'immobile di via Roma 12..."</p>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">Pratica 2026/047</span>
                            <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">Corrispondenza</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>

        </div>
      </section>

      {/* 4. LEX AI */}
      <section id="lexai" className="py-24 px-6 bg-slate/20 border-t border-white/5 relative overflow-hidden scroll-mt-28">
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
              Non e una chat generica aperta in una finestra a parte. E uno strumento pensato per il contesto del lavoro legale italiano.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <FadeIn delay={0.1}>
              <div className="space-y-3">
                {[
                  { icon: Search, t: 'Analisi normativa', d: 'Cerca nelle norme vigenti e spiega quali articoli si applicano al caso, con ragionamento completo.' },
                  { icon: Scale, t: 'Strategie processuali', d: 'Suggerisce strategie concrete, eccezioni da sollevare e argomenti da sviluppare in udienza.' },
                  { icon: Brain, t: 'Conversazione continua', d: 'Approfondisci, cambia angolazione, chiedi follow-up. La conversazione si sviluppa nel tempo.' },
                  { icon: Sparkles, t: 'Strategia su misura', d: 'Legge tutte le ricerche della pratica e genera una strategia processuale personalizzata.' },
                  { icon: BookOpen, t: 'Sentenze correlate', d: 'Suggerisce quali sentenze della banca dati vale la pena consultare, basandosi sul caso.' },
                  { icon: FileSignature, t: 'Atti gia compilati', d: 'Legge i dati della pratica e produce diffide, comparse, istanze e altri atti pronti per l\'esportazione.' },
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
                    "L'obiettivo non e sostituire l'avvocato. E fargli risparmiare tempo vero."
                  </p>
                </FadeIn>
              </div>
            </FadeIn>

            <FadeIn delay={0.2} className="h-full">
              <div className="flex flex-col gap-[2.125rem] h-full">
                {/* Chat 1 — Locazione */}
                <VisualBlock label="Lex AI - Locazione" accent="salvia">
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-petrolio/60 border border-white/5 p-3">
                        <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                          Sto gestendo una controversia locativa. Il cliente contesta i conteggi della morosita. Cosa posso eccepire?
                        </p>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="max-w-[90%] bg-salvia/5 border border-salvia/15 p-3 space-y-2">
                        <p className="font-body text-xs text-salvia/80 font-medium flex items-center gap-1">
                          <Sparkles size={10} /> Lex AI
                        </p>
                        <p className="font-body text-xs text-nebbia/55 leading-relaxed">
                          Sulla base dell'art. 5 L. 392/1978 e della giurisprudenza recente, puoi sollevare eccezione di parziale inadempimento del locatore se sussistono vizi della cosa locata. Ti consiglio di verificare anche...
                        </p>
                        <div className="flex gap-1 pt-1">
                          <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">Cass. 12345/2024</span>
                          <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">Art. 5 L. 392/78</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </VisualBlock>

                {/* Chat 2 — Lavoro */}
                <VisualBlock label="Lex AI - Lavoro" accent="salvia">
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-petrolio/60 border border-white/5 p-3">
                        <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                          In base alle ricerhe già fatte ed all'esito dell'utlima udienza, quali altri articoli normativi ci servirebbero?
                        </p>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="max-w-[90%] bg-salvia/5 border border-salvia/15 p-3 space-y-2">
                        <p className="font-body text-xs text-salvia/80 font-medium flex items-center gap-1">
                          <Sparkles size={10} /> Lex AI
                        </p>
                        <p className="font-body text-xs text-nebbia/55 leading-relaxed">
                          L'esito ha indebolito la tesi sulla morosita. Ti suggerisco di spostare il focus sulla risoluzione per inadempimento del locatore: art. 1453 c.c. per la risoluzione e art. 1578 c.c. sui vizi della cosa locata...
                        </p>
                        <div className="flex gap-1 pt-1">
                          <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">Art. 1453 c.c.</span>
                          <span className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/30">Art. 1578 c.c</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </VisualBlock>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* 5. BANCA DATI CONDIVISA */}
      <section id="bancadati" className="py-24 px-6 scroll-mt-28">
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
        {/* 6. CLIENTE */}
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

      {/* 6. CTA finale */}
      <section className="py-24 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-oro/[0.05] rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative">
          <FadeIn>
            <SectionLabel>Inizia ora</SectionLabel>
            <h2 className="font-display text-4xl md:text-5xl font-light text-nebbia mb-6">
              La banca dati è gratuitamente consultabile.{' '}
              <span className="text-oro">Fai la tua prima ricerca.</span>
            </h2>
            <p className="font-body text-base text-nebbia/45 leading-relaxed mb-10 max-w-xl mx-auto">
              Registrati e inizia subito. Quattro milioni di norme consultabili. Lex AI con crediti di benvenuto. Gestionale e portale clienti pronti.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/registrati" className="flex items-center gap-2.5 px-10 py-4 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-all hover:scale-[1.02] shadow-xl shadow-oro/20">
                Consulta la tua prima legge <ArrowRight size={15} />
              </Link>
              <Link to="/login" className="font-body text-sm text-nebbia/35 hover:text-nebbia/60 transition-colors">
                Hai gia un account? Accedi
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