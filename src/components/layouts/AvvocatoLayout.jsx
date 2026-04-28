import { useState, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import logo from '@/assets/logo.png'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, Users, FolderOpen, BookOpen,
  CreditCard, Headphones, User, Calendar, Archive,
  Building2, LogOut, Menu, ChevronRight, Library, Search, Sparkles,
  Plus, HardDrive, AlertTriangle
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

function bytesToGB(b) {
  return (b ?? 0) / (1024 * 1024 * 1024)
}

function giorniAllaScadenza(dataStr) {
  if (!dataStr) return null
  return Math.ceil((new Date(dataStr) - new Date()) / (1000 * 60 * 60 * 24))
}

export default function AvvocatoLayout({ children }) {
  const [open, setOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [crediti, setCrediti] = useState(0)
  const [storage, setStorage] = useState({ occupato_gb: 0, gb_totali: 0 })

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

  // Carica storage occupato vs disponibile
  useEffect(() => {
    if (!profile?.id) return
    async function caricaStorage() {
      const proprietarioId = profile.titolare_id ?? profile.id
      const { data: quotaData } = await supabase.rpc('quota_studio', { p_proprietario_id: proprietarioId })
      const quota = Array.isArray(quotaData) ? quotaData[0] : quotaData

      const { data: docs } = await supabase
        .from('archivio_documenti')
        .select('dimensione')
        .eq('titolare_id', proprietarioId)

      const occupatoBytes = (docs ?? []).reduce((sum, d) => sum + (d.dimensione ?? 0), 0)

      setStorage({
        occupato_gb: bytesToGB(occupatoBytes),
        gb_totali: quota?.gb_totali ?? 0,
      })
    }
    caricaStorage()
  }, [profile?.id, profile?.titolare_id])

  // Calcoli scadenza
  const giorni = giorniAllaScadenza(profile?.abbonamento_scadenza)
  const mostraScadenza = giorni !== null && giorni <= 7
  const scadenzaCritica = giorni !== null && giorni <= 3
  const scaduto = giorni !== null && giorni <= 0

  // Calcoli storage (sempre mostrato se ha quota)
  const haStorage = storage.gb_totali > 0
  const storagePct = haStorage ? (storage.occupato_gb / storage.gb_totali) : 0
  const storageQuasiPieno = storagePct >= 0.9
  const storagePieno = storagePct >= 1

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
          <div className="flex items-center gap-3">

            {/* Scadenza piano (solo se ≤ 7 giorni) */}
            {mostraScadenza && (
              <Link to="/studio?tab=acquista"
                title={scaduto ? 'Piano scaduto - rinnova subito' : `Piano in scadenza tra ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors group ${scadenzaCritica || scaduto
                    ? 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/15 hover:border-red-500/50'
                    : 'bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15 hover:border-amber-500/50'
                  }`}>
                <AlertTriangle size={13} className={scadenzaCritica || scaduto ? 'text-red-400' : 'text-amber-400'} />
                <span className={`font-body text-sm ${scadenzaCritica || scaduto ? 'text-red-400' : 'text-amber-400'}`}>
                  {scaduto ? 'Scaduto' : `${giorni}g`}
                </span>
              </Link>
            )}

            {/* Storage (sempre visibile se ha piano con quota) */}
            {haStorage && (
              <Link to="/studio?tab=acquista"
                title={`${storage.occupato_gb.toFixed(1)} GB occupati su ${storage.gb_totali} GB`}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors group ${storagePieno
                    ? 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/15 hover:border-red-500/50'
                    : storageQuasiPieno
                      ? 'bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15 hover:border-amber-500/50'
                      : 'bg-petrolio border border-white/10 hover:border-salvia/30'
                  }`}>
                <HardDrive size={13} className={
                  storagePieno ? 'text-red-400' : storageQuasiPieno ? 'text-amber-400' : 'text-nebbia/50 group-hover:text-salvia'
                } />
                <span className={`font-body text-sm ${storagePieno ? 'text-red-400' : storageQuasiPieno ? 'text-amber-400' : 'text-nebbia/80'
                  }`}>
                  {storage.occupato_gb.toFixed(1)}/{storage.gb_totali} GB
                </span>
                <span className={`font-body text-[10px] ${storagePieno ? 'text-red-400/70' : storageQuasiPieno ? 'text-amber-400/70' : 'text-nebbia/40'
                  }`}>
                  {Math.round(storagePct * 100)}%
                </span>
                <Plus size={10} className="text-nebbia/30 group-hover:text-salvia transition-colors" />
              </Link>
            )}

            {/* Crediti (sempre visibile) */}
            <Link to="/studio?tab=acquista"
              title="Acquista crediti AI"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-petrolio border border-salvia/20 hover:border-salvia/40 transition-colors group">
              <Sparkles size={13} className="text-salvia" />
              <span className="font-body text-sm text-nebbia/80 group-hover:text-nebbia transition-colors">{crediti}</span>
              <Plus size={10} className="text-nebbia/30 group-hover:text-salvia transition-colors" />
            </Link>

            <span className="font-body text-sm text-nebbia/60 ml-1">
              {profile?.nome} {profile?.cognome}
            </span>
          </div>
        </header>

        {/* Header mobile */}
        <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-slate">
          <button onClick={() => setOpen(true)} className="text-nebbia/50 hover:text-nebbia"><Menu size={20} /></button>
          <img src={logo} alt="Lexum" className="h-7 w-auto" />

          <div className="ml-auto flex items-center gap-1.5">
            {/* Scadenza mobile */}
            {mostraScadenza && (
              <Link to="/studio?tab=acquista"
                title={scaduto ? 'Piano scaduto' : `${giorni}g alla scadenza`}
                className={`flex items-center gap-1 px-2 py-1 ${scadenzaCritica || scaduto
                    ? 'bg-red-500/10 border border-red-500/30'
                    : 'bg-amber-500/10 border border-amber-500/30'
                  }`}>
                <AlertTriangle size={11} className={scadenzaCritica || scaduto ? 'text-red-400' : 'text-amber-400'} />
                <span className={`font-body text-xs ${scadenzaCritica || scaduto ? 'text-red-400' : 'text-amber-400'}`}>
                  {scaduto ? '!' : `${giorni}g`}
                </span>
              </Link>
            )}

            {/* Storage mobile (compatto) */}
            {haStorage && (
              <Link to="/studio?tab=acquista"
                title={`${storage.occupato_gb.toFixed(1)}/${storage.gb_totali} GB`}
                className={`flex items-center gap-1 px-2 py-1 ${storagePieno
                    ? 'bg-red-500/10 border border-red-500/30'
                    : storageQuasiPieno
                      ? 'bg-amber-500/10 border border-amber-500/30'
                      : 'bg-petrolio border border-white/10'
                  }`}>
                <HardDrive size={11} className={
                  storagePieno ? 'text-red-400' : storageQuasiPieno ? 'text-amber-400' : 'text-nebbia/50'
                } />
                <span className={`font-body text-xs ${storagePieno ? 'text-red-400' : storageQuasiPieno ? 'text-amber-400' : 'text-nebbia/80'
                  }`}>
                  {Math.round(storagePct * 100)}%
                </span>
              </Link>
            )}

            {/* Crediti mobile */}
            <Link to="/studio?tab=acquista"
              className="flex items-center gap-1 px-2 py-1 bg-petrolio border border-salvia/20">
              <Sparkles size={11} className="text-salvia" />
              <span className="font-body text-xs text-nebbia/80">{crediti}</span>
              <Plus size={9} className="text-nebbia/40" />
            </Link>
          </div>
        </div>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}