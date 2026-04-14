// src/pages/Contatti.jsx
import { Shield, Lock, Eye, Mail, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function Contatti() {
  return (
    <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">

      {/* Hero */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-oro/[0.04] rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto relative text-center">
          <p className="font-body text-xs text-oro/60 tracking-[0.3em] uppercase mb-4">Contatti</p>
          <h1 className="font-display text-5xl md:text-6xl font-light text-nebbia mb-6">
            Parliamo del<br />
            <span className="text-oro">tuo studio.</span>
          </h1>
          <p className="font-body text-base text-nebbia/45 leading-relaxed max-w-xl mx-auto mb-10">
            Hai domande su Lexum, vuoi una demo o hai bisogno di supporto?
            Usa la chat in basso a destra — risponde una persona del team, non un bot.
          </p>

          {/* Chat CTA */}
          <div className="bg-slate border border-salvia/20 p-8 max-w-md mx-auto">
            <div className="w-12 h-12 flex items-center justify-center border border-salvia/25 bg-salvia/5 mx-auto mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-salvia">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="font-display text-xl font-light text-nebbia mb-2">Chat diretta con il team</p>
            <p className="font-body text-sm text-nebbia/45 leading-relaxed mb-5">
              Registrati e apri una conversazione diretta con noi.
              Rispondiamo solitamente entro poche ore nei giorni feriali.
            </p>
            <div className="space-y-2">
              <Link to="/registrati-lex"
                className="flex items-center justify-center gap-2 w-full py-3 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors">
                Prova Lex AI e chatta con noi
              </Link>
              <Link to="/registrati"
                className="flex items-center justify-center gap-2 w-full py-3 border border-white/10 text-nebbia/50 font-body text-sm hover:border-white/25 transition-colors">
                Avvocato! Prova Lexum Gratuitamente <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Info dirette */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-slate border border-white/5 p-6">
              <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-4">Contatti diretti</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center border border-white/10">
                    <Mail size={13} className="text-nebbia/40" />
                  </div>
                  <div>
                    <p className="font-body text-xs text-nebbia/30 mb-0.5">Email</p>
                    <p className="font-body text-sm text-nebbia/70">info@lexum.it</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center border border-white/10">
                    <Clock size={13} className="text-nebbia/40" />
                  </div>
                  <div>
                    <p className="font-body text-xs text-nebbia/30 mb-0.5">Orari supporto</p>
                    <p className="font-body text-sm text-nebbia/70">Lun–Ven, 9:00–18:00</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate border border-oro/15 p-6">
              <p className="font-body text-xs text-oro/60 uppercase tracking-widest mb-4">Demo personalizzata</p>
              <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-4">
                Vuoi vedere Lexum in azione per il tuo studio?
                Prenota una demo di 30 minuti con il team.
              </p>
              <Link to="/registrati"
                className="flex items-center gap-2 font-body text-sm text-oro hover:text-oro/70 transition-colors">
                Richiedi demo <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Shield, t: 'Dati protetti', d: 'Crittografia end-to-end e infrastrutture certificate.' },
              { icon: Lock, t: 'Conformità GDPR', d: 'Pienamente conforme al GDPR e alla normativa italiana.' },
              { icon: Eye, t: 'Riservatezza', d: 'Contenuti accessibili solo agli avvocati verificati.' },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex items-start gap-3 p-4 bg-slate border border-white/5">
                <Icon size={15} className="text-salvia shrink-0 mt-0.5" />
                <div>
                  <p className="font-body text-sm font-medium text-nebbia mb-1">{t}</p>
                  <p className="font-body text-xs text-nebbia/40 leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}