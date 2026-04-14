import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import logo from '@/assets/logo.png'
import { ArrowRight, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'

export default function Registrati() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', studio: '', password: '', conferma: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showConferma, setShowConferma] = useState(false)

  function validate() {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Campo obbligatorio'
    if (!form.cognome.trim()) e.cognome = 'Campo obbligatorio'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email non valida'
    if (form.password.length < 8) e.password = 'Minimo 8 caratteri'
    if (form.password !== form.conferma) e.conferma = 'Le password non coincidono'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const { data, error: authErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            nome: form.nome.trim(),
            cognome: form.cognome.trim(),
            studio: form.studio.trim() || null,
          },
        },
      })
      if (authErr) throw authErr

      await supabase.from('profiles').upsert({
        id: data.user.id,
        nome: form.nome.trim(),
        cognome: form.cognome.trim(),
        email: form.email.trim(),
        studio: form.studio.trim() || null,
        tipo_account: form.studio.trim() ? 'titolare' : 'singolo',
        role: 'user',
        verification_status: 'none',
      })

      setSuccess(true)
    } catch (err) {
      setErrors({ global: err.message })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-petrolio flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-slate border border-white/5 p-8 text-center">
          <CheckCircle size={40} className="text-salvia mx-auto mb-4" />
          <h2 className="font-display text-3xl font-light text-nebbia mb-3">Controlla la tua email</h2>
          <p className="font-body text-sm text-nebbia/50 mb-6 leading-relaxed">
            Abbiamo inviato un link di conferma a <span className="text-oro">{form.email}</span>.<br />
            Clicca il link per attivare il tuo account.
          </p>
          <p className="font-body text-xs text-nebbia/30">
            Non hai ricevuto nulla? Controlla la cartella spam.
          </p>
        </div>
      </div>
    )
  }

  /* helper campi testo semplici */
  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{label}</label>
      <input
        type={type} placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className={`w-full bg-petrolio border ${errors[key] ? 'border-red-500/60' : 'border-white/10'} text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25`}
      />
      {errors[key] && <p className="mt-1 font-body text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />{errors[key]}</p>}
    </div>
  )

  /* helper campo password con occhio */
  const pwdField = (key, label, show, toggle) => (
    <div>
      <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className={`w-full bg-petrolio border ${errors[key] ? 'border-red-500/60' : 'border-white/10'} text-nebbia font-body text-sm px-4 py-3 pr-11 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25`}
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-oro transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {errors[key] && <p className="mt-1 font-body text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />{errors[key]}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-petrolio flex flex-col items-center justify-center px-4 py-10">
      {/* Logo only */}
      <Link to="/" className="mb-10 group">
        <img src={logo} alt="Lexum" className="h-20 w-auto transition-transform duration-300 group-hover:scale-105" />
      </Link>

      <div className="w-full max-w-md bg-slate border border-white/5 p-8">
        <p className="section-label mb-6">Registrazione</p>
        <h1 className="font-display text-4xl font-light text-nebbia mb-2">Crea il tuo account</h1>
        <p className="font-body text-sm text-nebbia/40 mb-8 leading-relaxed">
          Dopo la registrazione potrai caricare i documenti per la verifica e diventare avvocato sulla piattaforma.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field('nome', 'Nome *', 'text', 'Mario')}
            {field('cognome', 'Cognome *', 'text', 'Rossi')}
          </div>
          {field('email', 'Email *', 'email', 'mario@studiorossi.it')}

          {/* Studio — opzionale */}
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widets uppercase mb-2">
              Nome studio
              <span className="ml-2 text-nebbia/25 normal-case tracking-normal">— opzionale</span>
            </label>
            <input
              type="text"
              placeholder="Es. Studio Rossi & Associati"
              value={form.studio}
              onChange={e => setForm(f => ({ ...f, studio: e.target.value }))}
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25"
            />
            <p className="mt-1.5 font-body text-xs text-nebbia/25 leading-relaxed">
              Se lavori con altri colleghi inserisci il nome dello studio. Potrai aggiungerlo o modificarlo anche in seguito dal tuo profilo.
            </p>
          </div>
          {pwdField('password', 'Password *', showPwd, () => setShowPwd(v => !v))}
          {pwdField('conferma', 'Conferma password *', showConferma, () => setShowConferma(v => !v))}

          {errors.global && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
              <AlertCircle size={14} /> {errors.global}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
            {loading
              ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
              : <><ArrowRight size={16} /> Registrati</>
            }
          </button>
        </form>

        <p className="font-body text-xs text-nebbia/30 text-center mt-6 pt-6 border-t border-white/5">
          Hai già un account?{' '}
          <Link to="/login" className="text-oro hover:text-oro/70 transition-colors">Accedi</Link>
        </p>
      </div>
    </div>
  )
}