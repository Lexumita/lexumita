import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import logo from '@/assets/logo.png'
import {
  LayoutDashboard, Users, Package, Mail,
  BookOpen, CreditCard, Headphones,
  LogOut, Menu, ChevronRight, Gavel, Activity
} from 'lucide-react'

export default function AdminLayout({ children }) {
  const [open, setOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const NAV = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/utenti', label: 'Utenti', icon: Users },
    { path: '/admin/prodotti', label: 'Prodotti', icon: Package },
    { path: '/admin/sentenze', label: 'Sentenze', icon: Gavel },
    { path: '/admin/normativa', label: 'Normativa', icon: BookOpen },
    { path: '/admin/pagamenti', label: 'Pagamenti', icon: CreditCard },
    { path: '/admin/mail-log', label: 'Mail Log', icon: Mail },
    { path: '/admin/lex-logs', label: 'Lex Logs', icon: Activity },
    { path: '/admin/assistenza', label: 'Assistenza', icon: Headphones },
  ]

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
        <div className="flex items-center justify-center px-5 py-6 border-b border-white/5">
          <img src={logo} alt="Lexum" className="h-16 w-auto" />
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
          {NAV.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
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
                {profile?.nome?.[0] ?? 'A'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-body text-xs font-medium text-nebbia truncate">
                {profile?.nome} {profile?.cognome}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors px-1 py-1"
          >
            <LogOut size={13} /> Esci
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-slate">
          <button onClick={() => setOpen(true)} className="text-nebbia/50 hover:text-nebbia">
            <Menu size={20} />
          </button>
          <img src={logo} alt="Lexum" className="h-10 w-auto" />
        </div>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}