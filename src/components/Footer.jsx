import { Link } from 'react-router-dom'
import { Mail, Shield, Lock } from 'lucide-react'
import logo from '@/assets/logo.png'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-petrolio">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* Brand */}
          <div>
            <img src={logo} alt="Lexum" className="h-12 w-auto mb-4" />
            <p className="font-body text-sm text-nebbia/35 leading-relaxed max-w-xs">
              La piattaforma per avvocati e studi legali che unisce gestione operativa,
              banca dati e intelligenza artificiale.
            </p>
            <div className="flex items-center gap-1.5 mt-5">
              <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse" />
              <span className="font-body text-xs text-nebbia/25">Piattaforma attiva</span>
            </div>
          </div>

          {/* Links */}
          <div>
            <p className="font-body text-xs text-nebbia/30 tracking-[0.25em] uppercase mb-5">Navigazione</p>
            <ul className="space-y-3">
              {[
                { to: '/', label: 'Home' },
                { to: '/per-avvocati', label: 'Per Studi Legali' },
                { to: '/#lexai', label: 'Lex AI' },
                { to: '/contatti', label: 'Contatti' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="font-body text-sm text-nebbia/40 hover:text-oro transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust */}
          <div>
            <p className="font-body text-xs text-nebbia/30 tracking-[0.25em] uppercase mb-5">Sicurezza & Privacy</p>
            <ul className="space-y-4">
              {[
                { icon: Shield, text: 'Dati protetti e crittografati' },
                { icon: Lock, text: 'Conformità GDPR e normativa italiana' },
                { icon: Mail, text: 'info@lexum.it' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 flex items-center justify-center border border-salvia/20 bg-salvia/5 shrink-0">
                    <Icon size={12} className="text-salvia" />
                  </div>
                  <span className="font-body text-sm text-nebbia/40">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
            <p className="font-body text-xs text-nebbia/20">
              © {new Date().getFullYear()} Lexum. Tutti i diritti riservati.
            </p>
            <span className="hidden sm:block text-nebbia/10">·</span>
            <p className="font-body text-xs text-nebbia/20">
              Alpi Consulenti Associati SA · CHE-243.562.655 · c/o SAFEINVEST SA, Via Campo Marzio 7, 6900 Lugano
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="font-body text-xs text-nebbia/20 hover:text-nebbia/40 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/termini" className="font-body text-xs text-nebbia/20 hover:text-nebbia/40 transition-colors">
              Termini di servizio
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}