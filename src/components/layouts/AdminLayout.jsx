import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import logo from '@/assets/logo.png'
import {
  LayoutDashboard, Users, Package,
  BookOpen, CreditCard, Headphones,
  LogOut, Menu, ChevronRight, Gavel
} from 'lucide-react'

export default function AdminLayout({ children }) {
  const [open, setOpen] = useState(false)
  const [badgeUtenti, setBadgeUtenti] = useState(0)
  const [badgePagamenti, setBadgePagamenti] = useState(0)
  const [badgeAssistenza, setBadgeAssistenza] = useState(0)
  const [badgeSentenze, setBadgeSentenze] = useState(0)
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    async function caricaBadge() {
      // 1. Utenti: user con verification_status = 'pending'
      const { count: daVerificare } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'user')
        .eq('verification_status', 'pending')

      // 2. Pagamenti: transazioni in_attesa
      const { count: richiesteInAttesa } = await supabase
        .from('transazioni')
        .select('id', { count: 'exact', head: true })
        .eq('stato', 'in_attesa')

      // 3. Assistenza: ticket "Supporto Lexum" aperti dove l'ultimo
      //    messaggio NON è dell'admin — stessa logica dell'altra piattaforma
      const { data: tickets } = await supabase
        .from('ticket_assistenza')
        .select('id')
        .eq('stato', 'aperto')
        .in('mittente_ruolo', ['user', 'avvocato'])

      let ticketDaRispondere = 0
      if (tickets && tickets.length > 0) {
        const ids = tickets.map(t => t.id)

        // Per ogni ticket prendi l'ultimo messaggio
        const { data: ultimiMsg } = await supabase
          .from('messaggi_ticket')
          .select('ticket_id, autore_tipo, created_at')
          .in('ticket_id', ids)
          .order('created_at', { ascending: false })

        // Raggruppa: tieni solo l'ultimo messaggio per ticket
        const ultimoPerTicket = {}
        for (const m of ultimiMsg ?? []) {
          if (!ultimoPerTicket[m.ticket_id]) {
            ultimoPerTicket[m.ticket_id] = m
          }
        }

        // Conta i ticket dove l'ultimo messaggio NON è dell'admin
        ticketDaRispondere = Object.values(ultimoPerTicket).filter(m => m.autore_tipo !== 'admin').length
      }

      // 4. Sentenze: in_revisione
      const { count: sentenzeInRevisione } = await supabase
        .from('sentenze')
        .select('id', { count: 'exact', head: true })
        .eq('stato', 'in_revisione')

      setBadgeUtenti(daVerificare ?? 0)
      setBadgePagamenti(richiesteInAttesa ?? 0)
      setBadgeAssistenza(ticketDaRispondere)
      setBadgeSentenze(sentenzeInRevisione ?? 0)
    }

    caricaBadge()
  }, [location.pathname]) // si aggiorna ad ogni cambio pagina

  const NAV = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/utenti', label: 'Utenti', icon: Users, badge: badgeUtenti },
    { path: '/admin/prodotti', label: 'Prodotti', icon: Package },
    { path: '/admin/sentenze', label: 'Sentenze', icon: Gavel, badge: badgeSentenze },
    { path: '/admin/normativa', label: 'Normativa', icon: BookOpen },
    { path: '/admin/pagamenti', label: 'Pagamenti', icon: CreditCard, badge: badgePagamenti },
    { path: '/admin/assistenza', label: 'Assistenza', icon: Headphones, badge: badgeAssistenza },
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
          <img src={logo} alt="Lexum" className="h-14 w-auto" />
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
          {NAV.map(({ path, label, icon: Icon, badge }) => (
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
              {badge > 0 && (
                <span className="font-body text-[10px] px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  {badge}
                </span>
              )}
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
          <img src={logo} alt="Lexum" className="h-7 w-auto" />
        </div>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}