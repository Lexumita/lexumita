import { useState, useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { Menu, X, ArrowRight, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import logo from '@/assets/logo.png'
import { useAuth } from '@/context/AuthContext'
import { NOVITA_ATTIVA } from '@/lib/novita'
import { PARCELLA, FATTURA, DANNO } from '@/lib/strumenti/testi'

// Avvocati e commercialisti in una tendina sola (09-11-2026): la voce non è una pagina, apre la tendina
const PROFESSIONISTI = [
  { percorso: '/per-avvocati', chiave: 'avvocati' },
  { percorso: '/per-commercialisti', chiave: 'commercialisti' },
]

const navLinks = [
  { path: '/', key: 'home' },
  { key: 'professionisti', sotto: PROFESSIONISTI },
  // La Costituzione articolo per articolo (08-11-2026)
  { path: '/costituzione', key: 'costituzione' },
  // Gli strumenti gratuiti (03-11-2026): nella tendina si arriva subito allo strumento
  { path: '/strumenti', key: 'strumenti', sotto: [PARCELLA, FATTURA, DANNO] },
  // Articoli prima di Contatti (09-11-2026)
  { path: '/novita', key: 'novita' },
  { path: '/contatti', key: 'contatti' },
].filter(l => NOVITA_ATTIVA || l.path !== '/novita')

// Le voci della tendina: gli strumenti hanno nome e descrizione loro, i professionisti li prendono dai testi
const nomeVoce = (x, t) => x.nome ?? t(`navbar.${x.chiave}`)
const breveVoce = (x, t) => x.brevissimo ?? t(`navbar.${x.chiave}_breve`)

// Mappa ruolo → URL della home interna
const HOME_PER_RUOLO = {
  admin: '/admin/dashboard',
  avvocato: '/dashboard',
  commercialista: '/dashboard',
  commerciale: '/commerciale/dashboard',
  cliente: '/portale',
  user: '/area/chat',   // la chat, come nell'app (29-10-2026)
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { profile } = useAuth()
  const { t } = useTranslation('common')

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location])

  const homeUtente = profile?.role ? HOME_PER_RUOLO[profile.role] ?? '/' : null
  const labelUtente = profile?.nome || t('navbar.la_mia_area')

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-petrolio/95 backdrop-blur-sm border-b border-white/5 py-3' : 'bg-transparent py-5'
      }`}>
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">

        {/* Logo */}
        <NavLink to="/" className="shrink-0">
          <img src={logo} alt="Lexum" className="h-16 w-auto" />
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-7">
          {navLinks.map(({ path, key, sotto }) => (
            <div key={key} className="relative group">
              {path ? (
                <NavLink to={path}
                  end={path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1 whitespace-nowrap font-body text-xs tracking-widest uppercase transition-colors ${isActive ? 'text-oro' : 'text-nebbia/40 hover:text-nebbia'
                    }`
                  }>
                  {t(`navbar.${key}`)}
                  {sotto && <ChevronDown size={12} />}
                </NavLink>
              ) : (
                <button type="button" aria-haspopup="true"
                  className={`flex items-center gap-1 whitespace-nowrap font-body text-xs tracking-widest uppercase transition-colors ${sotto.some(x => x.percorso === location.pathname) ? 'text-oro' : 'text-nebbia/40 hover:text-nebbia'
                    }`}>
                  {t(`navbar.${key}`)} <ChevronDown size={12} />
                </button>
              )}
              {sotto && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full pt-4 w-80 invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity">
                  <div className="bg-slate border border-white/10 shadow-2xl p-2">
                    {sotto.map(x => (
                      <Link key={x.percorso} to={x.percorso} className="block p-3 hover:bg-white/5 transition-colors">
                        <span className="block font-body text-sm text-nebbia">{nomeVoce(x, t)}</span>
                        <span className="block font-body text-xs text-nebbia/40 leading-relaxed mt-0.5">{breveVoce(x, t)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* CTA Desktop */}
        <div className="hidden lg:flex items-center gap-3">
          {profile ? (
            <Link
              to={homeUtente}
              className="flex items-center gap-2 px-5 py-2.5 bg-oro text-petrolio font-body text-xs font-medium hover:bg-oro/90 transition-all"
            >
              {labelUtente} <ArrowRight size={13} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="font-body text-xs text-nebbia/40 hover:text-nebbia transition-colors">
                {t('navbar.accedi')}
              </Link>
              <Link to="/registrati" className="px-5 py-2.5 bg-oro text-petrolio font-body text-xs font-medium hover:bg-oro/90 transition-all">
                {t('navbar.inizia_ora_freccia')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button aria-label="Menu" className="lg:hidden text-nebbia/50 hover:text-nebbia transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`lg:hidden transition-all duration-300 overflow-hidden ${menuOpen ? 'max-h-[38rem] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-petrolio/95 backdrop-blur-sm border-t border-white/5 px-6 py-4 flex flex-col gap-1">
          {navLinks.map(({ path, key, sotto }) => (
            <div key={key} className="flex flex-col border-b border-white/5">
              {path ? (
                <NavLink to={path}
                  end={path === '/'}
                  className={({ isActive }) =>
                    `py-3 px-2 font-body text-sm transition-colors ${isActive ? 'text-oro' : 'text-nebbia/60 hover:text-nebbia'
                    }`
                  }>
                  {t(`navbar.${key}`)}
                </NavLink>
              ) : (
                <span className="py-3 px-2 font-body text-sm text-nebbia/60">{t(`navbar.${key}`)}</span>
              )}
              {sotto?.map(x => (
                <Link key={x.percorso} to={x.percorso} className="pb-3 px-5 font-body text-sm text-nebbia/40 hover:text-nebbia transition-colors">
                  {nomeVoce(x, t)}
                </Link>
              ))}
            </div>
          ))}

          {/* CTA Mobile */}
          {profile ? (
            <Link
              to={homeUtente}
              className="mt-3 flex items-center justify-center gap-2 py-2.5 bg-oro text-petrolio font-body text-xs font-medium hover:bg-oro/90 transition-colors"
            >
              {labelUtente} <ArrowRight size={13} />
            </Link>
          ) : (
            <div className="flex gap-3 mt-3">
              <Link to="/login" className="flex-1 text-center py-2.5 border border-white/10 text-nebbia/50 font-body text-xs hover:border-white/25 transition-colors">{t('navbar.accedi')}</Link>
              <Link to="/registrati" className="flex-1 text-center py-2.5 bg-oro text-petrolio font-body text-xs font-medium hover:bg-oro/90 transition-colors">{t('navbar.inizia_ora')}</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}