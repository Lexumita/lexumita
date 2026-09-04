import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import logo from '@/assets/logo.png'
import { ArrowRight, AlertCircle, CheckCircle, Eye, EyeOff, Sparkles } from 'lucide-react'
import LexAnimatedDemo from '@/components/LexAnimatedDemo'

// Professioni dichiarabili in registrazione. I valori corrispondono al vincolo
// profiles_professione_check sul database.
const PROFESSIONI = [
  { v: 'avvocato', l: 'Avvocato' },
  { v: 'commercialista', l: 'Commercialista' },
  { v: 'dirigente_azienda', l: "Dirigente d'azienda" },
  { v: 'studente_giurisprudenza', l: 'Studente di giurisprudenza' },
  { v: 'imprenditore', l: 'Imprenditore' },
  { v: 'architetto', l: 'Architetto' },
  { v: 'ingegnere', l: 'Ingegnere' },
  { v: 'geometra', l: 'Geometra' },
  { v: 'privato', l: 'Privato' },
]

export default function Registrati() {
  const navigate = useNavigate()

  // Codice commerciale dal link di invito (?ref=DA-NI-01): precompilato ma
  // sempre modificabile, così chi arriva da un link non deve digitarlo.
  const [searchParams] = useSearchParams()
  const refIniziale = (searchParams.get('ref') ?? '').trim().toUpperCase()

  const [form, setForm] = useState({ nome: '', cognome: '', email: '', telefono: '', professione: '', studio: '', codice_commerciale: refIniziale, password: '', conferma: '' })
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
    // Il telefono è facoltativo: si valida SOLO se compilato, altrimenti un
    // campo opzionale bloccherebbe la registrazione di chi lo lascia vuoto.
    if (form.telefono.trim() && !/^[+\d][\d\s./-]{6,19}$/.test(form.telefono.trim())) {
      e.telefono = 'Numero non valido'
    }
    if (!form.professione) e.professione = 'Campo obbligatorio'
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
      const { error: authErr } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            nome: form.nome.trim(),
            cognome: form.cognome.trim(),
            telefono: form.telefono.trim() || null,
            professione: form.professione,
            studio: form.studio.trim() || null,
            // Codice del commerciale che ha portato il cliente (opzionale).
            // Il trigger lo risolve in commerciale_id; se errato viene ignorato
            // e la registrazione va comunque a buon fine.
            codice_commerciale: form.codice_commerciale.trim() || null,
          },
        },
      })
      if (authErr) throw authErr

      // Il trigger DB handle_new_user crea automaticamente il profilo
      // leggendo nome/cognome/studio/codice_commerciale dai metadata.

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
        <div className="w-full max-w-md bg-slate border border-white/5 p-6 sm:p-8 text-center">
          <CheckCircle size={40} className="text-salvia mx-auto mb-4" />
          <h2 className="font-display text-2xl sm:text-3xl font-light text-nebbia mb-3">Controlla la tua email</h2>
          <p className="font-body text-sm text-nebbia/50 mb-6 leading-relaxed">
            Abbiamo inviato un link di conferma a <span className="text-oro">{form.email}</span>.<br />
            Clicca il link per attivare il tuo account e iniziare a usare Lex AI con 3 ricerche gratuite.
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
          aria-label={show ? 'Nascondi password' : 'Mostra password'}
          className="absolute right-1 lg:right-3 top-1/2 -translate-y-1/2 p-3 lg:p-0 flex items-center justify-center text-nebbia/30 hover:text-oro transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {errors[key] && <p className="mt-1 font-body text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />{errors[key]}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-petrolio">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">

        {/* SINISTRA — Lex AI al lavoro. Nascosta su telefono: in registrazione
            da mobile il form deve essere subito raggiungibile. */}
        <div className="hidden lg:flex flex-col justify-center relative overflow-hidden px-10 xl:px-16 py-12 border-r border-white/5">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 left-1/4 w-[420px] h-[420px] bg-oro/[0.05] rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-[340px] h-[340px] bg-salvia/[0.05] rounded-full blur-3xl" />
          </div>
          <div className="relative w-full max-w-xl mx-auto">
            <p className="section-label mb-3">Lex AI al lavoro</p>
            <h2 className="font-display text-3xl xl:text-4xl font-light text-nebbia leading-tight mb-8">
              Una ricerca giuridica<br />
              <span className="text-oro-static italic">con le fonti verificate.</span>
            </h2>
            <div className="bg-slate border border-oro/20 overflow-hidden shadow-2xl shadow-oro/5">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-petrolio/60">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-salvia" />
                  <span className="font-body text-xs text-salvia">Lex AI</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse ml-1" />
                </div>
                <span className="font-body text-xs uppercase tracking-widest text-oro/70">Avvocato</span>
              </div>
              <div className="p-5"><LexAnimatedDemo variant="avvocato" /></div>
            </div>
          </div>
        </div>

        {/* DESTRA — form di registrazione */}
        <div className="flex flex-col items-center justify-center px-4 py-10">
          <Link to="/" className="mb-8 sm:mb-10 group">
            <img src={logo} alt="Lexum" className="h-20 w-auto transition-transform duration-300 group-hover:scale-105" />
          </Link>

          <div className="w-full max-w-md bg-slate border border-white/5 p-6 sm:p-8">
        <p className="section-label mb-6">Registrazione</p>
        <h1 className="font-display text-3xl sm:text-4xl font-light text-nebbia mb-2">Crea il tuo account</h1>
        <p className="font-body text-sm text-nebbia/40 mb-8 leading-relaxed">
          Inizia subito con 3 ricerche Lex AI gratuite. Verifica la tua identità per accedere a tutte le funzionalità di Lexum.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('nome', 'Nome *', 'text', 'Mario')}
            {field('cognome', 'Cognome *', 'text', 'Rossi')}
          </div>
          {field('email', 'Email *', 'email', 'mario@studiorossi.it')}

          {/* Telefono — opzionale */}
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
              Telefono
              <span className="ml-2 text-nebbia/25 normal-case tracking-normal">— opzionale</span>
            </label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Es. +39 333 1234567"
              value={form.telefono}
              onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
              className={`w-full bg-petrolio border ${errors.telefono ? 'border-red-500/60' : 'border-white/10'} text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25`}
            />
            {errors.telefono
              ? <p className="mt-1 font-body text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />{errors.telefono}</p>
              : <p className="mt-1.5 font-body text-xs text-nebbia/25 leading-relaxed">
                  Inserisci il numero per ricevere sconti esclusivi.
                </p>}
          </div>

          {/* Professione — obbligatoria */}
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Professione *</label>
            <select
              value={form.professione}
              onChange={e => setForm(f => ({ ...f, professione: e.target.value }))}
              className={`w-full bg-petrolio border ${errors.professione ? 'border-red-500/60' : 'border-white/10'} text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 transition-colors ${form.professione ? '' : 'text-nebbia/40'}`}
            >
              <option value="">Seleziona la tua professione...</option>
              {PROFESSIONI.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
            </select>
            {errors.professione && <p className="mt-1 font-body text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />{errors.professione}</p>}
          </div>

          {/* Studio — opzionale */}
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
              Nome studio
              <span className="ml-2 text-nebbia/25 normal-case tracking-normal">— opzionale</span>
            </label>
            <input
              type="text"
              placeholder="Es. Studio Rossi e Associati"
              value={form.studio}
              onChange={e => setForm(f => ({ ...f, studio: e.target.value }))}
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25"
            />
            <p className="mt-1.5 font-body text-xs text-nebbia/25 leading-relaxed">
              Se sei un professionista e lavori in uno studio, inserisci qui il nome.
            </p>
          </div>

          {/* Codice commerciale — opzionale */}
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
              Codice commerciale
              <span className="ml-2 text-nebbia/25 normal-case tracking-normal">— opzionale</span>
            </label>
            <input
              type="text"
              placeholder="Es. LEX-ROSSI"
              value={form.codice_commerciale}
              onChange={e => setForm(f => ({ ...f, codice_commerciale: e.target.value.toUpperCase() }))}
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25 tracking-wider"
            />
            <p className="mt-1.5 font-body text-xs text-nebbia/25 leading-relaxed">
              Se un nostro consulente ti ha seguito, inserisci qui il codice che ti ha fornito.
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

      </div>
    </div>
  )
}