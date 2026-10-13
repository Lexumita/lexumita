// src/components/sicurezza/ModalAttiva2FA.jsx
//
// Modal a 2 step per attivare 2FA:
//   STEP 1: mostra QR code da scansionare con app autenticatore
//   STEP 2: input codice 6 cifre per verificare l'enrollment
// Dopo verifica OK, genera 10 backup codes e li passa a onSuccess.

import { useState, useEffect, useRef } from 'react'
import { X, AlertCircle, ShieldCheck, Copy, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { messaggioErroreInvoke } from '@/lib/password'

export default function ModalAttiva2FA({ onClose, onSuccess }) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(true)
    const [qrCode, setQrCode] = useState(null)
    const [secret, setSecret] = useState(null)
    const [codice, setCodice] = useState('')
    const [verificando, setVerificando] = useState(false)
    const [err, setErr] = useState('')
    const [copiato, setCopiato] = useState(false)

    // Usiamo useRef per il factorId cosi il cleanup vede sempre il valore aggiornato
    const factorIdRef = useRef(null)
    const successRef = useRef(false)

    useEffect(() => {
        enroll()
        return () => {
            // Cleanup: se l'utente chiude senza verificare, rimuovi il fattore unverified
            if (factorIdRef.current && !successRef.current) {
                supabase.auth.mfa.unenroll({ factorId: factorIdRef.current })
                    .catch(e => console.warn('Cleanup unenroll fallito:', e))
            }
        }
        // eslint-disable-next-line
    }, [])

    async function enroll() {
        setLoading(true); setErr('')
        try {
            // 1. Pulisci TUTTI i fattori TOTP esistenti (verified o unverified)
            //    Questo e sicuro perche siamo nel flusso "attiva da zero":
            //    se l'utente arriva qui, sta accettando di reimpostare il 2FA.
            const { data: factors, error: errList } = await supabase.auth.mfa.listFactors()
            if (errList) {
                console.warn('listFactors errore:', errList)
            }

            const tuttiFattori = factors?.totp ?? []
            console.log('[2FA] Fattori esistenti:', tuttiFattori.length, tuttiFattori)

            for (const f of tuttiFattori) {
                try {
                    await supabase.auth.mfa.unenroll({ factorId: f.id })
                    console.log('[2FA] Pulito fattore:', f.id, f.status)
                } catch (e) {
                    console.warn('[2FA] Unenroll fallito per', f.id, e)
                }
            }

            // 2. Genera friendlyName univoco con timestamp ms + random
            //    Supabase richiede che sia univoco per evitare conflitti
            const uniqueName = `Lexum-${Date.now()}-${Math.floor(Math.random() * 10000)}`

            // 3. Enroll nuovo fattore
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: uniqueName,
            })

            if (error) {
                console.error('[2FA] Enroll error:', error)
                throw new Error(error.message || 'Errore durante l\'attivazione')
            }

            if (!data?.id || !data?.totp?.qr_code) {
                console.error('[2FA] Enroll response incompleta:', data)
                throw new Error('Risposta server incompleta')
            }

            console.log('[2FA] Enroll OK, factor id:', data.id)
            factorIdRef.current = data.id
            setQrCode(data.totp.qr_code)
            setSecret(data.totp.secret)
        } catch (e) {
            console.error('[2FA] Enroll exception:', e)
            setErr(e.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleVerifica() {
        if (codice.length !== 6) {
            setErr('Inserisci il codice a 6 cifre dalla tua app')
            return
        }
        if (!factorIdRef.current) {
            setErr('Sessione di attivazione scaduta. Chiudi e riprova.')
            return
        }
        setVerificando(true); setErr('')
        try {
            const { error } = await supabase.auth.mfa.challengeAndVerify({
                factorId: factorIdRef.current,
                code: codice,
            })
            if (error) {
                console.error('[2FA] Verify error:', error)
                throw new Error(error.message)
            }

            // Enrollment OK -> il trigger DB ha aggiornato profiles.mfa_attivo
            // Ora generiamo i backup codes
            const { data, error: errBkp } = await supabase.functions.invoke('mfa-backup-codes', {
                body: { action: 'generate' }
            })
            if (errBkp || !data?.ok) throw new Error(await messaggioErroreInvoke(errBkp, data, { senzaTesto: 'Errore generazione codici' }))

            // Marca successo per evitare cleanup unenroll
            successRef.current = true

            // Refresh sessione cosi AuthContext riceve mfa_attivo aggiornato
            await supabase.auth.refreshSession()

            onSuccess(data.codici)
        } catch (e) {
            setErr(e.message)
            setCodice('')
        } finally {
            setVerificando(false)
        }
    }

    function handleCopia() {
        if (!secret) return
        navigator.clipboard.writeText(secret)
        setCopiato(true)
        setTimeout(() => setCopiato(false), 2000)
    }

    async function handleRetry() {
        setErr('')
        setStep(1)
        setCodice('')
        setQrCode(null)
        setSecret(null)
        factorIdRef.current = null
        await enroll()
    }

    return (
        <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate border border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-oro" />
                        <h2 className="font-display text-lg text-nebbia">Attiva 2FA</h2>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {loading && (
                        <div className="flex items-center justify-center py-10">
                            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                        </div>
                    )}

                    {!loading && err && !qrCode && (
                        <div className="space-y-4">
                            <div className="flex items-start gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium mb-1">Errore durante l'attivazione</p>
                                    <p className="text-red-400/70">{err}</p>
                                </div>
                            </div>
                            <button onClick={handleRetry} className="btn-primary text-sm w-full justify-center">
                                Riprova
                            </button>
                        </div>
                    )}

                    {!loading && qrCode && step === 1 && (
                        <>
                            <div>
                                <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Step 1 di 2</p>
                                <p className="font-body text-sm text-nebbia mb-4">
                                    Scansiona il QR code con la tua app autenticatore
                                </p>
                                <div className="bg-nebbia p-4 flex items-center justify-center">
                                    <img src={qrCode} alt="QR code 2FA" className="w-48 h-48" />
                                </div>
                            </div>

                            <div>
                                <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">
                                    Oppure inserisci manualmente
                                </p>
                                <div className="flex items-center gap-2 bg-petrolio border border-white/10 p-3">
                                    <code className="flex-1 font-mono text-xs text-nebbia break-all">{secret}</code>
                                    <button onClick={handleCopia} className="text-oro hover:text-oro/70 shrink-0">
                                        {copiato ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-petrolio border border-white/5 p-3">
                                <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                                    App consigliate: Google Authenticator, Authy, 1Password, Microsoft Authenticator, Bitwarden.
                                </p>
                            </div>

                            <button onClick={() => setStep(2)} className="btn-primary text-sm w-full justify-center">
                                Ho scansionato, procedi
                            </button>
                        </>
                    )}

                    {!loading && qrCode && step === 2 && (
                        <>
                            <div>
                                <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Step 2 di 2</p>
                                <p className="font-body text-sm text-nebbia mb-4">
                                    Inserisci il codice a 6 cifre dall'app
                                </p>
                            </div>

                            <div>
                                <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                                    Codice di verifica
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={codice}
                                    onChange={e => setCodice(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    onKeyDown={e => e.key === 'Enter' && handleVerifica()}
                                    placeholder="123456"
                                    autoFocus
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-mono text-xl text-center tracking-[0.5em] px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/20"
                                />
                            </div>

                            {err && (
                                <div className="flex items-start gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {err}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStep(1)}
                                    className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5"
                                >
                                    Indietro
                                </button>
                                <button
                                    onClick={handleVerifica}
                                    disabled={verificando || codice.length !== 6}
                                    className="btn-primary text-sm flex-1 justify-center disabled:opacity-40"
                                >
                                    {verificando
                                        ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                                        : 'Verifica e attiva'
                                    }
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}