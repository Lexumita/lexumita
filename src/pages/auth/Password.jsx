import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import logo from '@/assets/logo.png'
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'

export function RecuperaPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (err) throw err
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-petrolio flex flex-col items-center justify-center px-4">
      <Link to="/" className="flex items-center gap-3 mb-10">
        <img src={logo} alt="Lexum" className="h-20 w-auto" />
        <span className="font-display text-3xl font-semibold tracking-wider text-oro-static">LEXUM</span>
      </Link>
      <div className="w-full max-w-md bg-slate border border-white/5 p-8">
        {sent ? (
          <div className="text-center">
            <CheckCircle size={36} className="text-salvia mx-auto mb-4" />
            <h2 className="font-display text-3xl font-light text-nebbia mb-3">Email inviata</h2>
            <p className="font-body text-sm text-nebbia/50 mb-6">
              Controlla la tua email e clicca sul link per reimpostare la password.
            </p>
            <Link to="/login" className="btn-secondary text-sm">Torna al login</Link>
          </div>
        ) : (
          <>
            <p className="section-label mb-6">Recupero password</p>
            <h1 className="font-display text-4xl font-light text-nebbia mb-3">Password dimenticata?</h1>
            <p className="font-body text-sm text-nebbia/40 mb-8">
              Inserisci la tua email e ti mandiamo un link per reimpostarla.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="mario@studiorossi.it"
                  className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><ArrowRight size={16} /> Invia link</>}
              </button>
            </form>
            <p className="font-body text-xs text-nebbia/30 text-center mt-6">
              <Link to="/login" className="text-oro hover:text-oro/70">Torna al login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export function ResetPassword() {
  const [form, setForm] = useState({ password: '', conferma: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.conferma) { setError('Le password non coincidono'); return }
    if (form.password.length < 8) { setError('Minimo 8 caratteri'); return }
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password: form.password })
      if (err) throw err
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-petrolio flex flex-col items-center justify-center px-4">
      <Link to="/" className="flex items-center gap-3 mb-10">
        <img src={logo} alt="Lexum" className="h-12 w-auto" />
        <span className="font-display text-3xl font-semibold tracking-wider text-oro-static">LEXUM</span>
      </Link>
      <div className="w-full max-w-md bg-slate border border-white/5 p-8">
        {done ? (
          <div className="text-center">
            <CheckCircle size={36} className="text-salvia mx-auto mb-4" />
            <h2 className="font-display text-3xl font-light text-nebbia mb-3">Password aggiornata</h2>
            <Link to="/login" className="btn-primary justify-center w-full mt-4">Vai al login</Link>
          </div>
        ) : (
          <>
            <p className="section-label mb-6">Reset password</p>
            <h1 className="font-display text-4xl font-light text-nebbia mb-8">Nuova password</h1>
            <form onSubmit={handleSubmit} className="space-y-5">
              {[['password', 'Nuova password'], ['conferma', 'Conferma password']].map(([k, l]) => (
                <div key={k}>
                  <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{l}</label>
                  <input type="password" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder="••••••••"
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25" />
                </div>
              ))}
              {error && <p className="font-body text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><ArrowRight size={16} /> Salva password</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
