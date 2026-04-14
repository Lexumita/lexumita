import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import logo from '@/assets/logo.png'
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react'

const ROLE_HOME = {
  admin: '/admin/dashboard',
  avvocato: '/dashboard',
  cliente: '/portale',
  user: '/verifica',
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

      // User: redirect in base allo stato verifica
      if (role === 'user') {
        if (!profile?.verification_status || profile.verification_status === 'none') {
          return navigate('/verifica')
        }
        if (profile.verification_status === 'pending') {
          return navigate('/verifica/stato')
        }
        if (profile.verification_status === 'approved') {
          return navigate('/studio')
        }
      }

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
    <div className="min-h-screen bg-petrolio flex flex-col items-center justify-center px-4">
      {/* Logo only */}
      <Link to="/" className="mb-10 group">
        <img src={logo} alt="Lexum" className="h-20 w-auto transition-transform duration-300 group-hover:scale-105" />
      </Link>

      {/* Card */}
      <div className="w-full max-w-md bg-slate border border-white/5 p-8">
        <p className="section-label mb-6">Accesso</p>
        <h1 className="font-display text-4xl font-light text-nebbia mb-8">
          Bentornato
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-oro cursor-pointer"
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
  )
}