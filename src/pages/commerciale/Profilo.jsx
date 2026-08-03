// src/pages/commerciale/Profilo.jsx
// Dati personali del commerciale + cambio password.
// Il codice commerciale è in sola lettura: lo assegna l'admin (è la chiave con
// cui vengono attribuite le vendite, non può essere modificata dall'utente).

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { PageHeader, InputField, LoadingSpinner } from '@/components/shared'
import { Save, AlertCircle, CheckCircle2, Copy, Check, Lock } from 'lucide-react'

export default function CommercialeProfilo() {
  const { profile, user } = useAuth()
  const [form, setForm] = useState({ nome: '', cognome: '', telefono: '' })
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')
  const [copiato, setCopiato] = useState(false)

  const [pwd, setPwd] = useState({ nuova: '', conferma: '' })
  const [pwdSalvando, setPwdSalvando] = useState(false)
  const [pwdErrore, setPwdErrore] = useState('')
  const [pwdOk, setPwdOk] = useState('')

  useEffect(() => {
    if (!profile) return
    setForm({
      nome: profile.nome ?? '',
      cognome: profile.cognome ?? '',
      telefono: profile.telefono ?? '',
    })
  }, [profile])

  if (!profile) return <LoadingSpinner fullPage />

  async function salva() {
    if (!form.nome.trim() || !form.cognome.trim()) {
      setErrore('Nome e cognome sono obbligatori')
      return
    }
    setSalvando(true)
    setErrore('')
    setOk('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome: form.nome.trim(),
          cognome: form.cognome.trim(),
          telefono: form.telefono.trim() || null,
        })
        .eq('id', profile.id)
      if (error) throw error
      setOk('Dati aggiornati')
      setTimeout(() => setOk(''), 3000)
    } catch (err) {
      setErrore(err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function cambiaPassword() {
    if (pwd.nuova.length < 8) { setPwdErrore('Minimo 8 caratteri'); return }
    if (pwd.nuova !== pwd.conferma) { setPwdErrore('Le password non coincidono'); return }
    setPwdSalvando(true)
    setPwdErrore('')
    setPwdOk('')
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd.nuova })
      if (error) throw error
      setPwd({ nuova: '', conferma: '' })
      setPwdOk('Password aggiornata')
      setTimeout(() => setPwdOk(''), 3000)
    } catch (err) {
      setPwdErrore(err.message)
    } finally {
      setPwdSalvando(false)
    }
  }

  async function copiaCodice() {
    if (!profile.codice_commerciale) return
    try {
      await navigator.clipboard.writeText(profile.codice_commerciale)
      setCopiato(true)
      setTimeout(() => setCopiato(false), 1500)
    } catch { /* clipboard non disponibile */ }
  }

  return (
    <>
      <PageHeader label="Area commerciale" title="Profilo" subtitle="I tuoi dati e le credenziali di accesso" />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Codice commerciale */}
        <div className="bg-slate border border-white/5 p-5 lg:col-span-2">
          <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Codice commerciale</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-display text-3xl font-light text-oro tracking-widest">
              {profile.codice_commerciale ?? '— non assegnato —'}
            </p>
            {profile.codice_commerciale && (
              <button onClick={copiaCodice} className="btn-secondary flex items-center gap-2">
                {copiato ? <><Check size={14} /> Copiato</> : <><Copy size={14} /> Copia</>}
              </button>
            )}
          </div>
          <p className="font-body text-xs text-nebbia/25 mt-3 leading-relaxed">
            È la chiave con cui le vendite ti vengono attribuite: il cliente deve inserirlo in fase di
            registrazione. Per modificarlo contatta l'amministrazione.
          </p>
        </div>

        {/* Dati personali */}
        <div className="bg-slate border border-white/5 p-5">
          <h2 className="font-display text-xl font-light text-nebbia mb-5">Dati personali</h2>

          {errore && (
            <div className="mb-4 p-3 bg-red-900/10 border border-red-500/20 font-body text-xs text-red-400 flex items-center gap-2">
              <AlertCircle size={14} /> {errore}
            </div>
          )}
          {ok && (
            <div className="mb-4 p-3 bg-salvia/10 border border-salvia/20 font-body text-xs text-salvia flex items-center gap-2">
              <CheckCircle2 size={14} /> {ok}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Nome *" value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              <InputField label="Cognome *" value={form.cognome}
                onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} />
            </div>
            <InputField label="Telefono" value={form.telefono}
              onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+39 …" />
            <div>
              <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Email</label>
              <p className="font-body text-sm text-nebbia/40 px-4 py-3 bg-petrolio border border-white/5">
                {user?.email ?? profile.email}
              </p>
            </div>
          </div>

          <button onClick={salva} disabled={salvando} className="btn-primary w-full justify-center mt-5">
            {salvando
              ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
              : <><Save size={15} /> Salva</>}
          </button>
        </div>

        {/* Password */}
        <div className="bg-slate border border-white/5 p-5">
          <h2 className="font-display text-xl font-light text-nebbia mb-5 flex items-center gap-2">
            <Lock size={17} className="text-nebbia/30" /> Password
          </h2>

          {pwdErrore && (
            <div className="mb-4 p-3 bg-red-900/10 border border-red-500/20 font-body text-xs text-red-400 flex items-center gap-2">
              <AlertCircle size={14} /> {pwdErrore}
            </div>
          )}
          {pwdOk && (
            <div className="mb-4 p-3 bg-salvia/10 border border-salvia/20 font-body text-xs text-salvia flex items-center gap-2">
              <CheckCircle2 size={14} /> {pwdOk}
            </div>
          )}

          <div className="space-y-4">
            <InputField label="Nuova password" type="password" value={pwd.nuova}
              onChange={e => setPwd(p => ({ ...p, nuova: e.target.value }))} placeholder="••••••••" />
            <InputField label="Conferma password" type="password" value={pwd.conferma}
              onChange={e => setPwd(p => ({ ...p, conferma: e.target.value }))} placeholder="••••••••" />
          </div>

          <button onClick={cambiaPassword} disabled={pwdSalvando} className="btn-secondary w-full justify-center mt-5">
            {pwdSalvando
              ? <span className="animate-spin w-4 h-4 border-2 border-nebbia border-t-transparent rounded-full" />
              : 'Aggiorna password'}
          </button>
        </div>
      </div>
    </>
  )
}
