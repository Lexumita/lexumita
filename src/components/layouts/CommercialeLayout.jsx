// src/components/layouts/CommercialeLayout.jsx
//
// Layout per il ruolo 'commerciale' (venditore che porta clienti a Lexum).
// Più snello degli altri layout: niente crediti AI, storage o limiti clienti —
// il commerciale non usa il prodotto, lo vende. In header mostra il suo
// codice personale (serve a dettarlo al cliente in fase di registrazione).

import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import logo from '@/assets/logo.png'
import {
  LayoutDashboard, Wallet, Users, Calendar, User,
  LogOut, Menu, ChevronRight, Copy, Check,
} from 'lucide-react'
import CampanellaNotifiche from '@/components/shared/CampanellaNotifiche'

const NAV = [
  { path: '/commerciale/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/commerciale/provvigioni', label: 'Provvigioni', icon: Wallet },
  { path: '/commerciale/clienti', label: 'Clienti', icon: Users },
  { path: '/commerciale/calendario', label: 'Calendario', icon: Calendar },
  { path: '/commerciale/profilo', label: 'Profilo', icon: User },
]

/* Badge col codice personale + copia rapida */
function CodiceBadge({ codice, compact = false }) {
  const [copiato, setCopiato] = useState(false)
  if (!codice) return null

  async function copia() {
    try {
      await navigator.clipboard.writeText(codice)
      setCopiato(true)
      setTimeout(() => setCopiato(false), 1500)
    } catch { /* clipboard non disponibile: nessun problema */ }
  }

  return (
    <button
      onClick={copia}
      title="Copia il tuo codice commerciale"
      className={`flex items-center gap-1.5 bg-petrolio border border-oro/25 hover:border-oro/50 transition-colors group ${compact ? 'px-2 py-1' : 'px-3 py-1.5'}`}
    >
      <span className={`font-body text-oro tracking-wider ${compact ? 'text-xs' : 'text-sm'}`}>{codice}</span>
      {copiato
        ? <Check size={compact ? 10 : 12} className="text-salvia" />
        : <Copy size={compact ? 10 : 12} className="text-nebbia/30 group-hover:text-oro transition-colors" />}
    </button>
  )
}

export default function CommercialeLayout({ children }) {
  const [open, setOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-petrolio">
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-50 flex flex-col
        w-52 bg-slate border-r border-white/5
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        <Link to="/commerciale/dashboard" onClick={() => setOpen(false)} className="flex items-center justify-center px-5 py-6 border-b border-white/5 group">
          <img src={logo} alt="Lexum" className="h-16 w-auto transition-transform group-hover:scale-105" />
        </Link>

        <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
          {NAV.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 font-body text-sm transition-colors group ${isActive
                  ? 'bg-oro/10 text-oro border-r-2 border-oro'
                  : 'text-nebbia/50 hover:text-nebbia hover:bg-white/5'
                }`
              }
            >
              <Icon size={16} strokeWidth={1.5} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={13} className="opacity-0 group-hover:opacity-30 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-oro/20 border border-oro/30 flex items-center justify-center">
              <span className="font-display text-sm font-semibold text-oro">
                {profile?.nome?.[0] ?? 'C'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-body text-xs font-medium text-nebbia truncate">
                {profile?.nome} {profile?.cognome}
              </p>
              <p className="font-body text-[10px] text-nebbia/30">Commerciale</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="w-full flex items-center gap-2 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors px-1 py-1">
            <LogOut size={13} /> Esci
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header desktop */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-white/5 bg-slate">
          <div />
          <div className="flex items-center gap-3">
            <CampanellaNotifiche />
            <CodiceBadge codice={profile?.codice_commerciale} />
            <span className="font-body text-sm text-nebbia/60 ml-1">
              {profile?.nome} {profile?.cognome}
            </span>
          </div>
        </header>

        {/* Header mobile */}
        <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-slate">
          <button onClick={() => setOpen(true)} className="text-nebbia/50 hover:text-nebbia"><Menu size={20} /></button>
          <img src={logo} alt="Lexum" className="h-10 w-auto" />
          <div className="ml-auto flex items-center gap-1.5">
            <CampanellaNotifiche />
            <CodiceBadge codice={profile?.codice_commerciale} compact />
          </div>
        </div>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
