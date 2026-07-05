// src/pages/auth/Verifica2FA.jsx
//
// Schermata post-login per utenti con MFA attivo (sessione AAL1).
// Due modalita:
//   - Codice TOTP (6 cifre dall'app autenticatore) -> promuove a AAL2
//   - Codice di recupero (backup code) -> resetta MFA, l'utente potra accedere
//     senza 2FA e dovra riattivarlo dal profilo

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, AlertCircle, KeyRound, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export default function Verifica2FA() {
    const navigate = useNavigate()
    const { profile, signOut } = useAuth()

    const [modalita, setModalita] = useState('totp') // 'totp' | 'backup'
    const [codice, setCodice] = useState('')
    const [backupCode, setBackupCode] = useState('')
    const [verificando, setVerificando] = useState(false)
    const [err, setErr] = useState('')
    const [factorId, setFactorId] = useState(null)
    const [loadingFactor, setLoadingFactor] = useState(true)
    const [resetSuccess, setResetSuccess] = useState(false)

    useEffect(() => {
        async function checkSessione() {
            // Verifica che ci sia effettivamente bisogno di MFA
            const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

            if (aal?.currentLevel === 'aal2') {
                // Gia verificato, redirect alla home del ruolo
                redirectToHome()
                return
            }

            // Carica il fattore TOTP verificato dell'utente
            const { data: factors } = await supabase.auth.mfa.listFactors()
            const totpVerified = (factors?.totp ?? []).find(f => f.status === 'verified')

            if (!totpVerified) {
                // Nessun fattore -> non dovrebbe essere qui, redirect home
                redirectToHome()
                return
            }

            setFactorId(totpVerified.id)
            setLoadingFactor(false)
        }
        checkSessione()
        // eslint-disable-next-line
    }, [])

    function redirectToHome() {
        const role = profile?.role
        if (role === 'admin') navigate('/admin/dashboard', { replace: true })
        else if (role === 'avvocato' || role === 'commercialista') navigate('/dashboard', { replace: true })
        else if (role === 'cliente') navigate('/portale', { replace: true })
        else if (role === 'user') navigate('/area', { replace: true })
        else navigate('/', { replace: true })
    }

    async function handleVerificaTotp() {
        if (codice.length !== 6) {
            setErr('Inserisci il codice a 6 cifre dalla tua app')
            return
        }
        setVerificando(true); setErr('')
        try {
            const { error } = await supabase.auth.mfa.challengeAndVerify({
                factorId,
                code: codice,
            })
            if (error) throw new Error(error.message)
            // Sessione promossa a AAL2 -> redirect home
            redirectToHome()
        } catch (e) {
            setErr(e.message)
            setCodice('')
        } finally {
            setVerificando(false)
        }
    }

    async function handleVerificaBackup() {
        if (!backupCode.trim()) {
            setErr('Inserisci un codice di recupero')
            return
        }
        setVerificando(true); setErr('')
        try {
            const { data, error } = await supabase.functions.invoke('mfa-backup-codes', {
                body: { action: 'verify', code: backupCode.trim() }
            })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? 'Codice non valido')

            // MFA resettato. Per pulizia di sessione: signOut e redirect a login
            // L'utente dovra fare login e ri-attivare 2FA dal profilo.
            setResetSuccess(true)
        } catch (e) {
            setErr(e.message)
        } finally {
            setVerificando(false)
        }
    }

    async function handleLogoutDopoReset() {
        await signOut()
        navigate('/login', { replace: true })
    }

    async function handleLogout() {
        await signOut()
        navigate('/login', { replace: true })
    }

    // ─── Schermata di successo dopo backup code ─────────────
    if (resetSuccess) {
        return (
            <div className="min-h-screen bg-petrolio flex items-center justify-center p-4">
                <div className="bg-slate border border-salvia/30 w-full max-w-md p-8 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-salvia/10 border border-salvia/30 flex items-center justify-center">
                            <Shield size={18} className="text-salvia" />
                        </div>
                        <h1 className="font-display text-xl text-nebbia">2FA disattivato</h1>
                    </div>

                    <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                        Il codice di recupero e stato accettato. Per sicurezza, il 2FA e stato disattivato sul tuo account.
                    </p>

                    <div className="bg-amber-900/10 border border-amber-500/30 p-4">
                        <p className="font-body text-xs text-amber-400 leading-relaxed">
                            <span className="font-medium">Importante:</span> ti consigliamo di riattivare il 2FA dal tuo profilo
                            appena rientrato. Il tuo account e attualmente protetto solo dalla password.
                        </p>
                    </div>

                    <button onClick={handleLogoutDopoReset} className="btn-primary w-full justify-center text-sm">
                        Continua al login
                    </button>
                </div>
            </div>
        )
    }

    // ─── Loading mentre carica il fattore ──────────────────
    if (loadingFactor) {
        return (
            <div className="min-h-screen bg-petrolio flex items-center justify-center">
                <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-petrolio flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-5">

                <div className="bg-slate border border-white/10 p-8 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-oro/10 border border-oro/30 flex items-center justify-center">
                            {modalita === 'totp' ? <Shield size={18} className="text-oro" /> : <KeyRound size={18} className="text-oro" />}
                        </div>
                        <div>
                            <h1 className="font-display text-xl text-nebbia">
                                {modalita === 'totp' ? 'Verifica 2FA' : 'Codice di recupero'}
                            </h1>
                            <p className="font-body text-xs text-nebbia/40">
                                {modalita === 'totp' ? 'Inserisci il codice dall\'app autenticatore' : 'Usa uno dei codici salvati'}
                            </p>
                        </div>
                    </div>

                    {/* ─── MODALITA TOTP ─── */}
                    {modalita === 'totp' && (
                        <>
                            <div>
                                <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                                    Codice a 6 cifre
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={codice}
                                    onChange={e => setCodice(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    onKeyDown={e => e.key === 'Enter' && handleVerificaTotp()}
                                    placeholder="123456"
                                    autoFocus
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-mono text-2xl text-center tracking-[0.5em] px-4 py-4 outline-none focus:border-oro/50 placeholder:text-nebbia/20"
                                />
                            </div>

                            {err && (
                                <div className="flex items-start gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {err}
                                </div>
                            )}

                            <button
                                onClick={handleVerificaTotp}
                                disabled={verificando || codice.length !== 6}
                                className="btn-primary text-sm w-full justify-center disabled:opacity-40"
                            >
                                {verificando
                                    ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                                    : 'Verifica e accedi'
                                }
                            </button>

                            <button
                                onClick={() => { setModalita('backup'); setErr(''); setCodice('') }}
                                className="w-full font-body text-xs text-nebbia/50 hover:text-oro underline-offset-2 hover:underline"
                            >
                                Ho perso il telefono — usa un codice di recupero
                            </button>
                        </>
                    )}

                    {/* ─── MODALITA BACKUP CODE ─── */}
                    {modalita === 'backup' && (
                        <>
                            <div className="bg-amber-900/10 border border-amber-500/30 p-3">
                                <p className="font-body text-xs text-amber-400/80 leading-relaxed">
                                    Usando un codice di recupero il 2FA verra disattivato. Dovrai riconfigurarlo dopo l'accesso.
                                </p>
                            </div>

                            <div>
                                <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                                    Codice di recupero
                                </label>
                                <input
                                    type="text"
                                    value={backupCode}
                                    onChange={e => setBackupCode(e.target.value.toUpperCase())}
                                    onKeyDown={e => e.key === 'Enter' && handleVerificaBackup()}
                                    placeholder="XXXX-XXXX"
                                    autoFocus
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-mono text-base tracking-wider px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/20"
                                />
                            </div>

                            {err && (
                                <div className="flex items-start gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {err}
                                </div>
                            )}

                            <button
                                onClick={handleVerificaBackup}
                                disabled={verificando || !backupCode.trim()}
                                className="btn-primary text-sm w-full justify-center disabled:opacity-40"
                            >
                                {verificando
                                    ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                                    : 'Usa codice e accedi'
                                }
                            </button>

                            <button
                                onClick={() => { setModalita('totp'); setErr(''); setBackupCode('') }}
                                className="w-full font-body text-xs text-nebbia/50 hover:text-oro underline-offset-2 hover:underline"
                            >
                                Indietro — usa app autenticatore
                            </button>
                        </>
                    )}
                </div>

                {/* Logout di emergenza */}
                <button
                    onClick={handleLogout}
                    className="w-full font-body text-xs text-nebbia/30 hover:text-nebbia/60 flex items-center justify-center gap-1.5"
                >
                    <LogOut size={12} /> Esci e torna al login
                </button>
            </div>
        </div>
    )
}