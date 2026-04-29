import { useState, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import logo from '@/assets/logo.png'
import {
  LogOut, Menu, X, Sparkles, Plus,
  Home, Search, ShieldCheck, CreditCard, Headphones, User, ChevronRight,
  Clock, CheckCircle, XCircle
} from 'lucide-react'

export default function UserLayout({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [crediti, setCrediti] = useState(0)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // Carica somma totale crediti validi
  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('crediti_ai')
      .select('crediti_totali, crediti_usati')
      .eq('user_id', profile.id)
      .or(`periodo_fine.is.null,periodo_fine.gte.${new Date().toISOString()}`)
      .then(({ data }) => {
        if (!data) return setCrediti(0)
        const totale = data.reduce((acc, c) => acc + (c.crediti_totali - c.crediti_usati), 0)
        setCrediti(totale)
      })
  }, [profile?.id])

  // Stato verifica
  const status = profile?.verification_status
  const isPending = status === 'pending'
  const isApproved = status === 'approved'
  const isRejected = status === 'rejected'
  const isUnverified = !status || status === 'none'

  // Voce sidebar verifica (nascosta se rejected)
  const verifyItem = isRejected ? null : isUnverified
    ? { path: '/verifica', label: 'Diventa avvocato', icon: ShieldCheck }
    : isPending
      ? { path: '/verifica/stato', label: 'Verifica identità', icon: ShieldCheck, badge: 'In corso', badgeColor: 'amber' }
      : { path: '/verifica/stato', label: 'Verifica identità', icon: ShieldCheck, badge: 'Approvata', badgeColor: 'salvia' }

  const NAV = [
    { path: '/area', label: 'Banca Dati', icon: Home, end: true },
    { path: '/area/ricerche', label: 'Ricerche', icon: Search },
    ...(verifyItem ? [verifyItem] : []),
    { path: '/area/acquista', label: 'Acquista', icon: CreditCard },
    { path: '/area/assistenza', label: 'Assistenza', icon: Headphones },
    { path: '/area/profilo', label: 'Profilo', icon: User },
  ]

  // Banner contestuale
  const banner = bannerDismissed ? null
    : isPending ? {
      icon: Clock, color: 'amber',
      text: 'I tuoi documenti sono in revisione. Riceverai una risposta entro 24-48 ore.',
    }
      : isApproved && !profile?.piano_id ? {
        icon: CheckCircle, color: 'salvia',
        text: 'Verifica completata! Acquista un piano per accedere a pratiche, clienti e tutte le funzionalità Lexum.',
        link: { to: '/area/acquista', label: 'Vedi piani →' },
      }
        : isRejected ? {
          icon: XCircle, color: 'red',
          text: 'La tua verifica non è stata approvata. Visita il profilo per vedere i dettagli.',
          link: { to: '/area/profilo', label: 'Profilo →' },
        }
          : null

  const bannerColors = {
    amber: { bg: 'bg-amber-500/8', border: 'border-amber-500/20', text: 'text-amber-400/90', icon: 'text-amber-400' },
    salvia: { bg: 'bg-salvia/8', border: 'border-salvia/25', text: 'text-salvia', icon: 'text-salvia' },
    red: { bg: 'bg-red-500/8', border: 'border-red-500/20', text: 'text-red-400/90', icon: 'text-red-400' },
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-petrolio">
      {/* Overlay mobile */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 flex flex-col
        w-52 bg-slate border-r border-white/5
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo cliccabile → /area */}
        <Link to="/area" onClick={() => setOpen(false)} className="flex items-center justify-center px-5 py-6 border-b border-white/5 group">
          <img src={logo} alt="Lexum" className="h-16 w-auto transition-transform group-hover:scale-105" />
        </Link>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
          {NAV.map(({ path, label, icon: Icon, badge, badgeColor, end }) => (
            <NavLink key={path} to={path}
              onClick={() => setOpen(false)}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 font-body text-sm transition-colors group ${isActive
                  ? 'bg-oro/10 text-oro border-r-2 border-oro'
                  : 'text-nebbia/50 hover:text-nebbia hover:bg-white/5'
                }`
              }>
              <Icon size={16} strokeWidth={1.5} />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className={`font-body text-[10px] px-1.5 py-0.5 border ${badgeColor === 'salvia' ? 'border-salvia/30 text-salvia' : 'border-amber-500/30 text-amber-400'
                  }`}>
                  {badge}
                </span>
              )}
              <ChevronRight size={13} className="opacity-0 group-hover:opacity-30 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* Footer sidebar: avatar + esci */}
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-salvia/20 border border-salvia/30 flex items-center justify-center">
              <span className="font-display text-sm font-semibold text-salvia">
                {profile?.nome?.[0] ?? profile?.email?.[0]?.toUpperCase() ?? 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-body text-xs font-medium text-nebbia truncate">
                {profile?.nome ? `${profile.nome} ${profile.cognome ?? ''}`.trim() : profile?.email}
              </p>
              <p className="font-body text-[10px] text-nebbia/30 mt-0.5">
                {isApproved ? 'Verificato' : isPending ? 'In verifica' : isRejected ? 'Non verificato' : 'Account base'}
              </p>
            </div>
          </div>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-2 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors px-1 py-1">
            <LogOut size={13} /> Esci
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header desktop */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-white/5 bg-slate">
          <div /> {/* spacer */}
          <div className="flex items-center gap-4">
            <Link to="/area/acquista"
              title="Acquista crediti AI"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-petrolio border border-salvia/20 hover:border-salvia/40 transition-colors group">
              <Sparkles size={13} className="text-salvia" />
              <span className="font-body text-sm text-nebbia/80 group-hover:text-nebbia transition-colors">{crediti}</span>
              <Plus size={10} className="text-nebbia/30 group-hover:text-salvia transition-colors" />
            </Link>
            <span className="font-body text-sm text-nebbia/60">
              {profile?.nome ? `${profile.nome} ${profile.cognome ?? ''}`.trim() : profile?.email}
            </span>
          </div>
        </header>

        {/* Header mobile */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-slate">
          <button onClick={() => setOpen(true)} className="text-nebbia/50 hover:text-nebbia">
            <Menu size={20} />
          </button>
          <img src={logo} alt="Lexum" className="h-10 w-auto" />
          <Link to="/area/acquista"
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-petrolio border border-salvia/20">
            <Sparkles size={12} className="text-salvia" />
            <span className="font-body text-xs text-nebbia/80">{crediti}</span>
            <Plus size={9} className="text-nebbia/40" />
          </Link>
        </div>

        {/* Banner contestuale */}
        {banner && (
          <div className={`px-6 py-3 border-b ${bannerColors[banner.color].border} ${bannerColors[banner.color].bg} flex items-center gap-3`}>
            <banner.icon size={15} className={`shrink-0 ${bannerColors[banner.color].icon}`} />
            <p className={`flex-1 font-body text-xs ${bannerColors[banner.color].text} leading-relaxed`}>
              {banner.text}
            </p>
            {banner.link && (
              <Link to={banner.link.to}
                className={`font-body text-xs font-medium ${bannerColors[banner.color].text} hover:underline shrink-0`}>
                {banner.link.label}
              </Link>
            )}
            <button onClick={() => setBannerDismissed(true)}
              className={`shrink-0 ${bannerColors[banner.color].text} opacity-50 hover:opacity-100 transition-opacity`}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Contenuto pagina */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}