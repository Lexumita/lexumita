// src/pages/RegistrazioneLex.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, Check, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function RegistrazioneLex() {
    const navigate = useNavigate()
    const [form, setForm] = useState({ nome: '', cognome: '', email: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [errore, setErrore] = useState('')
    const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

    async function handleSubmit(e) {
        e.preventDefault()
        setErrore('')
        if (!form.nome.trim()) return setErrore('Il nome è obbligatorio')
        if (!form.cognome.trim()) return setErrore('Il cognome è obbligatorio')
        if (!form.email.trim()) return setErrore("L'email è obbligatoria")
        if (!/\S+@\S+\.\S+/.test(form.email)) return setErrore('Email non valida')
        if (form.password.length < 8) return setErrore('La password deve avere almeno 8 caratteri')

        setLoading(true)
        try {
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-lex-user`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)

            // Login automatico
            const { error: loginErr } = await supabase.auth.signInWithPassword({
                email: form.email.trim().toLowerCase(),
                password: form.password.trim(),
            })
            if (loginErr) throw new Error(loginErr.message)

            navigate('/area-personale')
        } catch (err) {
            setErrore(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-petrolio text-nebbia flex items-center justify-center px-6 py-20">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-salvia/[0.04] rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <Link to="/" className="flex justify-center mb-6">
                        <img src="/logo.png" alt="Lexum" className="h-20" />
                    </Link>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-salvia/25 bg-salvia/5 mb-4">
                        <Sparkles size={11} className="text-salvia" />
                        <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">Lex AI — Accesso gratuito alla BETA V. 1.5</span>
                    </div>
                    <h1 className="font-display text-3xl font-light text-nebbia mb-2">Inizia con Lex AI</h1>
                    <p className="font-body text-sm text-nebbia/40">Registrati e ricevi 3 ricerche gratuite subito.</p>
                </div>

                {/* Benefit bar */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    {[
                        '3 ricerche gratuite',
                        'Fonti verificate',
                        'Nessun obbligo',
                    ].map(t => (
                        <div key={t} className="flex items-center gap-1.5 bg-salvia/5 border border-salvia/15 px-3 py-2">
                            <Check size={10} className="text-salvia shrink-0" />
                            <span className="font-body text-xs text-nebbia/50">{t}</span>
                        </div>
                    ))}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-slate border border-white/5 p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Nome *</label>
                            <input {...f('nome')} placeholder="Mario"
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 placeholder:text-nebbia/20" />
                        </div>
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Cognome *</label>
                            <input {...f('cognome')} placeholder="Rossi"
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 placeholder:text-nebbia/20" />
                        </div>
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Email *</label>
                        <input type="email" {...f('email')} placeholder="mario@email.it"
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 placeholder:text-nebbia/20" />
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Password *</label>
                        <input type="password" {...f('password')} placeholder="Minimo 8 caratteri"
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 placeholder:text-nebbia/20" />
                    </div>

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={13} /> {errore}
                        </div>
                    )}

                    <button type="submit" disabled={loading}
                        className="flex items-center justify-center gap-2 w-full py-3.5 bg-salvia text-petrolio font-body text-sm font-medium hover:bg-salvia/90 transition-all disabled:opacity-50">
                        {loading
                            ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                            : <><Sparkles size={14} /> Attiva Lex AI gratis</>
                        }
                    </button>

                    <p className="font-body text-xs text-nebbia/25 text-center leading-relaxed">
                        Registrandoti accetti i{' '}
                        <Link to="/termini" className="text-nebbia/40 hover:text-nebbia transition-colors">Termini di servizio</Link>
                        {' '}e la{' '}
                        <Link to="/privacy" className="text-nebbia/40 hover:text-nebbia transition-colors">Privacy Policy</Link>.
                    </p>
                </form>

                {/* Footer links */}
                <div className="mt-5 text-center space-y-2">
                    <p className="font-body text-xs text-nebbia/30">
                        Hai già un account?{' '}
                        <Link to="/login" className="text-nebbia/50 hover:text-nebbia transition-colors">Accedi</Link>
                    </p>
                    <p className="font-body text-xs text-nebbia/25">
                        Sei un avvocato?{' '}
                        <Link to="/per-avvocati" className="text-oro/50 hover:text-oro transition-colors">Scopri Lexum completo →</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}