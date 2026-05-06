// src/pages/Contatti.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  ArrowRight, Mail, MessageSquare, Calendar,
  Plus, Minus, Shield, Lock, Globe, EyeOff,
  Clock, Send,
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
  return (
    <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
      <Helmet>
        <title>Lexum — Contatti, demo e supporto</title>
        <meta
          name="description"
          content="Hai una domanda su Lexum? Vuoi una demo personalizzata? Scrivici, registrati per parlare direttamente col team, o consulta le risposte alle domande più frequenti."
        />
        <link rel="canonical" href="https://www.lexum.it/contatti" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.lexum.it/contatti" />
        <meta property="og:title" content="Lexum — Contatti" />
        <meta
          property="og:description"
          content="Parla col team, richiedi una demo o leggi le risposte più frequenti."
        />
        <meta property="og:image" content="https://www.lexum.it/logo.png" />
        <meta property="og:locale" content="it_IT" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Lexum — Contatti" />
        <meta
          name="twitter:description"
          content="Parla col team, richiedi una demo o leggi le risposte più frequenti."
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
          <SectionLabel>Contatti</SectionLabel>
          <h1 className="font-display text-5xl md:text-6xl font-light text-nebbia mb-6 leading-[1.1]">
            Parliamo del<br />
            <span className="text-oro">tuo studio.</span>
          </h1>
          <p className="font-body text-base text-nebbia/45 leading-relaxed max-w-xl mx-auto">
            Tre modi per metterci in comunicazione, a seconda di cosa ti serve.
            Il team è composto da persone vere, non da risponditori automatici.
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
                <p className="font-body text-[10px] text-salvia/60 tracking-[0.3em] uppercase mb-2">Chat col team</p>
                <h3 className="font-display text-xl font-light text-nebbia mb-3">
                  Domande veloci, risposte da una persona.
                </h3>
                <p className="font-body text-sm text-nebbia/45 leading-relaxed mb-5 flex-1">
                  Registrati gratuitamente: dentro la tua area trovi una sezione assistenza
                  in cui puoi scriverci direttamente. Risponde un operatore del team,
                  non un bot. Solitamente entro poche ore nei giorni feriali.
                </p>
                <Link
                  to="/registrati"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors"
                >
                  Registrati e scrivici <ArrowRight size={13} />
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
                  <p className="font-body text-[10px] text-oro/60 tracking-[0.3em] uppercase mb-2">Demo dedicata</p>
                  <h3 className="font-display text-xl font-light text-nebbia mb-3">
                    30 minuti col team, partendo dal tuo studio.
                  </h3>
                  <p className="font-body text-sm text-nebbia/45 leading-relaxed mb-5 flex-1">
                    Registrati e ti contattiamo entro 48 ore lavorative per fissare
                    una call dimostrativa. Ti mostriamo Lexum partendo dalle esigenze
                    concrete del tuo studio, non da una demo generica.
                  </p>
                  <Link
                    to="/registrati"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors"
                  >
                    Richiedi una demo <ArrowRight size={13} />
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
                <p className="font-body text-[10px] text-nebbia/40 tracking-[0.3em] uppercase mb-2">Email diretta</p>
                <h3 className="font-display text-xl font-light text-nebbia mb-3">
                  Per chi preferisce scrivere senza registrarsi.
                </h3>
                <p className="font-body text-sm text-nebbia/45 leading-relaxed mb-5 flex-1">
                  Scrivici a info@lexum.it. Rispondiamo nei giorni feriali, dal lunedì al venerdì,
                  9:00–18:00. Per chi ha solo una domanda rapida, è la via più diretta.
                </p>
                <a
                  href="mailto:info@lexum.it"
                  className="flex items-center justify-center gap-2 w-full py-3 border border-white/15 text-nebbia/65 font-body text-sm hover:border-white/30 hover:text-nebbia transition-colors"
                >
                  <Send size={13} /> info@lexum.it
                </a>
              </div>
            </FadeIn>

          </div>

          {/* Microcopy orari */}
          <FadeIn delay={0.4}>
            <div className="flex items-center justify-center gap-2 mt-8 font-body text-xs text-nebbia/30">
              <Clock size={11} />
              <span>Lun–Ven, 9:00–18:00 (CET). Risposte entro poche ore nei giorni feriali.</span>
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
            <SectionLabel>Domande frequenti</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-4">
              Le domande più richieste.
            </h2>
            <p className="font-body text-sm text-nebbia/40 leading-relaxed">
              Spesso la domanda è già stata fatta da qualcun altro. Ecco le risposte alle cose che ci chiedono più spesso.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="space-y-3">

              <FaqItem
                q="Posso provare Lexum gratis?"
                a="Sì. Hai una settimana di prova gratuita, senza carta di credito richiesta, con accesso a tutte le funzioni principali del piano. Al termine, se vuoi continuare, scegli il piano che si adatta al tuo studio. Se non continui, non ti viene addebitato nulla."
                defaultOpen
              />

              <FaqItem
                q="Lexum sostituisce le banche dati che uso oggi?"
                a="Per molti studi sì. Lex AI consulta oltre 4 milioni di documenti tra giurisprudenza italiana, normativa, prassi e diritto UE, ed è pensata per coprire la stragrande maggioranza delle ricerche legali quotidiane. Per chi ha bisogno di funzioni molto specialistiche di banche dati storiche o di settore, Lexum si integra senza problemi. Puoi copiare il contenuto che hai trovato in altre fonti, aggiungerlo alle tue ricerche e ragionarci con Lex nel flusso di lavoro esistente."
              />

              <FaqItem
                q="Ci sono limiti di accesso alla Banca Dati?"
                a="No, su Lexum non ci sono limiti alla banca dati. puoi effettuare ricerche in tutti i campi. es. civile, penale, europeo. L'unico limite attuale è se la legge che stai cercando è contenuta nei 4.000.000 di articoli legali presenti nella Banca Dati Lexum. "
              />

              <FaqItem
                q="Quanto costa Lexum?"
                a="I dettagli sui piani li trovi dopo la registrazione, dove puoi scegliere quello che si adatta meglio al tuo studio (singolo professionista, studio piccolo, studio medio-grande). La banca dati condivisa con oltre 4 milioni di documenti è invece accessibile gratuitamente a tutti."
              />

              <FaqItem
                q="I miei dati restano miei?"
                a="Sì. Lexum è progettato con la riservatezza al centro: i dati di ogni studio sono compartimentati e isolati, ospitati su server europei conformi al GDPR, e non vengono mai venduti o condivisi con terzi. Le sentenze del tuo archivio restano private. Solo se decidi di pubblicarle nella banca dati condivisa vengono prima anonimizzate, e tu mantieni sempre il controllo finale."
              />

              <FaqItem
                q="Come funziona la verifica come avvocato?"
                a="Ti registri come professionista, carichi i tuoi documenti dell'Ordine (tessera, attestato di iscrizione o documento equivalente) e il team verifica entro 48 ore lavorative. Ricevi un'email di conferma e accedi alle funzioni riservate ai professionisti verificati: pubblicazione di sentenze, monetizzazione dell'archivio, accesso esteso alla banca dati."
              />

              <FaqItem
                q="Posso usare Lexum se sono un avvocato singolo?"
                a="Assolutamente sì. Lexum è pensato sia per studi medio-grandi sia per il professionista singolo. Le stesse funzionalità sono disponibili in entrambi i casi, dimensionate sulle esigenze di chi le usa: gestionale, calendario, archivio intelligente, Lex AI e banca dati condivisa."
              />

              <FaqItem
                q="Cosa succede ai miei dati se smetto di usare Lexum?"
                a="I tuoi dati restano i tuoi. In qualsiasi momento puoi esportare l'intero archivio dello studio (clienti, pratiche, documenti, comunicazioni) in formato standard. Se cancelli l'account, i dati vengono eliminati definitivamente nei tempi previsti dal GDPR."
              />

            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-center font-body text-sm text-nebbia/35 mt-10">
              Non hai trovato la risposta? <Link to="/registrati" className="text-oro hover:text-oro/70 transition-colors">Registrati e scrivici</Link>, ti rispondiamo direttamente.
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
              {[
                { icon: Globe, t: 'Dati ospitati in Europa' },
                { icon: Shield, t: 'Conforme al GDPR' },
                { icon: Lock, t: 'Compartimentazione studio' },
                { icon: EyeOff, t: 'Anonimizzazione contenuti' },
              ].map(({ icon: Icon, t }) => (
                <div key={t} className="flex items-center gap-2">
                  <Icon size={13} className="text-salvia/70 shrink-0" />
                  <span className="font-body text-xs text-nebbia/40">{t}</span>
                </div>
              ))}
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