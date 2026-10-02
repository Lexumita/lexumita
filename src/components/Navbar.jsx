import { useState, useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { Menu, X, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import logo from '@/assets/logo.png'
import { useAuth } from '@/context/AuthContext'
import { NOVITA_ATTIVA } from '@/lib/novita'

const navLinks = [
  { path: '/', key: 'home' },
  { path: '/per-avvocati', key: 'avvocati' },
  { path: '/per-commercialisti', key: 'commercialisti' },
  { path: '/novita', key: 'novita' },
  { path: '/contatti', key: 'contatti' },
].filter(l => NOVITA_ATTIVA || l.path !== '/novita')

// Mappa ruolo → URL della home interna
const HOME_PER_RUOLO = {
  admin: '/admin/dashboard',
  avvocato: '/dashboard',
  commercialista: '/dashboard',
  commerciale: '/commerciale/dashboard',
  cliente: '/portale',
  user: '/area',
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
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(({ path, key }) => (
            <NavLink key={path} to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `font-body text-xs tracking-widest uppercase transition-colors ${isActive ? 'text-oro' : 'text-nebbia/40 hover:text-nebbia'
                }`
              }>
              {t(`navbar.${key}`)}
            </NavLink>
          ))}
        </nav>

        {/* CTA Desktop */}
        <div className="hidden md:flex items-center gap-3">
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
        <button className="md:hidden text-nebbia/50 hover:text-nebbia transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden transition-all duration-300 overflow-hidden ${menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-petrolio/95 backdrop-blur-sm border-t border-white/5 px-6 py-4 flex flex-col gap-1">
          {navLinks.map(({ path, key }) => (
            <NavLink key={path} to={path}
              className={({ isActive }) =>
                `py-3 px-2 font-body text-sm border-b border-white/5 transition-colors ${isActive ? 'text-oro' : 'text-nebbia/60 hover:text-nebbia'
                }`
              }>
              {t(`navbar.${key}`)}
            </NavLink>
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