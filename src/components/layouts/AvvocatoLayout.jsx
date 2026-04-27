import { useState, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import logo from '@/assets/logo.png'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, Users, FolderOpen, BookOpen,
  CreditCard, Headphones, User, Calendar, Archive,
  Building2, LogOut, Menu, ChevronRight, Library, Search, Sparkles
} from 'lucide-react'

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/clienti', label: 'Clienti', icon: Users },
  { path: '/pratiche', label: 'Pratiche', icon: FolderOpen },
  { path: '/calendario', label: 'Calendario', icon: Calendar },
  { path: '/sentenze', label: 'Mie sentenze', icon: BookOpen },
  { path: '/banca-dati', label: 'Banca dati', icon: Library },
  { path: '/ricerche', label: 'Ricerche', icon: Search },
  { path: '/studio', label: 'Studio', icon: Building2 },
  { path: '/archivio', label: 'Archivio', icon: Archive },
  { path: '/pagamenti', label: 'Pagamenti', icon: CreditCard },
  { path: '/assistenza', label: 'Assistenza', icon: Headphones },
  { path: '/profilo', label: 'Profilo', icon: User },
]

export default function AvvocatoLayout({ children }) {
  const [open, setOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [crediti, setCrediti] = useState(0)

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
        <Link to="/dashboard" onClick={() => setOpen(false)} className="flex items-center justify-center px-5 py-6 border-b border-white/5 group">
          <img src={logo} alt="Lexum" className="h-14 w-auto transition-transform group-hover:scale-105" />
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
            <div className="w-8 h-8 bg-salvia/20 border border-salvia/30 flex items-center justify-center">
              <span className="font-display text-sm font-semibold text-salvia">
                {profile?.nome?.[0] ?? 'A'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-body text-xs font-medium text-nebbia truncate">
                {profile?.nome} {profile?.cognome}
              </p>
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
          <div /> {/* spacer */}
          <div className="flex items-center gap-4">
            <Link to="/studio?tab=acquista"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-petrolio border border-salvia/20 hover:border-salvia/40 transition-colors group">
              <Sparkles size={13} className="text-salvia" />
              <span className="font-body text-sm text-nebbia/80 group-hover:text-nebbia transition-colors">{crediti}</span>
            </Link>
            <span className="font-body text-sm text-nebbia/60">
              {profile?.nome} {profile?.cognome}
            </span>
          </div>
        </header>

        {/* Header mobile */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-slate">
          <button onClick={() => setOpen(true)} className="text-nebbia/50 hover:text-nebbia"><Menu size={20} /></button>
          <img src={logo} alt="Lexum" className="h-7 w-auto" />
          <Link to="/studio?tab=acquista"
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-petrolio border border-salvia/20">
            <Sparkles size={12} className="text-salvia" />
            <span className="font-body text-xs text-nebbia/80">{crediti}</span>
          </Link>
        </div>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}