import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import logo from '@/assets/logo.png'
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react'

const ROLE_HOME = {
  admin: '/admin/dashboard',
  avvocato: '/dashboard',
  commercialista: '/dashboard',
  commerciale: '/commerciale/dashboard',
  cliente: '/portale',
  user: '/area',
}

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      })
      if (authErr) throw authErr

      // Carica profilo per redirect
      // Carica profilo per redirect
      // Carica profilo per redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, verification_status')
        .eq('id', data.user.id)
        .single()

      const role = profile?.role ?? 'user'
      navigate(ROLE_HOME[role] ?? '/')
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email o password non corretti'
        : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-petrolio">
      {/* Logo centrato, sopra entrambe le sezioni */}
      <div className="flex justify-center px-4 pt-8 lg:pt-10 pb-6 lg:pb-8">
        <Link to="/" className="group">
          <img src={logo} alt="Lexum" className="h-16 lg:h-20 w-auto transition-transform duration-300 group-hover:scale-105" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">

        {/* SINISTRA — bentornato. Nascosta su telefono: al login il form
            deve essere subito raggiungibile. */}
        <div className="hidden lg:flex flex-col relative overflow-hidden px-10 xl:px-16 pb-12 border-r border-white/5">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 left-1/4 w-[420px] h-[420px] bg-oro/[0.05] rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-[340px] h-[340px] bg-salvia/[0.05] rounded-full blur-3xl" />
          </div>
          <div className="relative w-full max-w-xl mx-auto">
            <p className="section-label mb-3">Bentornato</p>
            <h2 className="font-display text-4xl xl:text-5xl font-light text-nebbia leading-tight mb-5">
              Riprendi da dove<br />
              <span className="text-oro-static italic">eri rimasto.</span>
            </h2>
            <p className="font-body text-base text-nebbia/45 leading-relaxed mb-9 max-w-md">
              Pratiche, scadenze e ricerche sono dove le hai lasciate.
            </p>
            <div className="space-y-2 max-w-md">
              {[
                { t: 'Lex AI e banca dati', s: 'Oltre 4 milioni di documenti giuridici e fiscali, con le fonti verificate' },
                { t: 'Agenda e scadenze', s: 'Udienze, appuntamenti e termini, sincronizzati con Google Calendar' },
                { t: 'Pratiche e clienti', s: 'Fascicoli, documenti e portale cliente in un posto solo' },
                { t: 'Fatturazione', s: 'Parcelle sui parametri forensi e fatture in pochi passaggi' },
              ].map(({ t, s }) => (
                <div key={t} className="px-3 py-2.5 bg-petrolio/50 border border-white/5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-1 h-1 rounded-full bg-oro/60 shrink-0" />
                    <span className="font-body text-xs text-nebbia/75 font-medium">{t}</span>
                  </div>
                  <p className="font-body text-xs text-nebbia/40 leading-snug pl-3">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DESTRA — form di accesso */}
        <div className="flex flex-col items-center px-4 pb-10">
          <div className="w-full max-w-md bg-slate border border-white/5 p-6 sm:p-8">
        <p className="section-label mb-6">Accesso</p>
        <h1 className="font-display text-3xl sm:text-4xl font-light text-nebbia mb-8">
          Accedi al tuo account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Email</label>
            <input
              type="email" required autoComplete="email"
              placeholder="avvocato@studio.it"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25"
            />
          </div>

          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                required autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 pr-11 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? 'Nascondi password' : 'Mostra password'}
                className="absolute right-1 lg:right-3 top-1/2 -translate-y-1/2 p-3 lg:p-0 flex items-center justify-center text-oro cursor-pointer"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
            ) : (
              <><ArrowRight size={16} /> Accedi</>
            )}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3 pt-6 border-t border-white/5">
          <Link to="/recupera-password" className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors text-center">
            Password dimenticata?
          </Link>
          <p className="font-body text-xs text-nebbia/30 text-center">
            Non hai un account?{' '}
            <Link to="/registrati" className="text-oro hover:text-oro/70 transition-colors">
              Registrati
            </Link>
          </p>
        </div>
          </div>
        </div>

      </div>
    </div>
  )
}