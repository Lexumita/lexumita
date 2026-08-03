// src/components/sicurezza/BoxSicurezza2FA.jsx
// Blocco "Sicurezza accesso" (2FA + codici di recupero) riutilizzabile da
// qualsiasi profilo: avvocato, commercialista, commerciale.
//
// È autosufficiente: carica da solo lo stato MFA dal profilo e il conteggio dei
// codici residui. Estratto da pages/avvocato/Profilo.jsx per non duplicare la
// logica a ogni nuovo ruolo — era già destinata a ripetersi identica.

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import ModalAttiva2FA from '@/components/sicurezza/ModalAttiva2FA'
import ModalBackupCodes from '@/components/sicurezza/ModalBackupCodes'
import { Shield, AlertCircle } from 'lucide-react'

export default function BoxSicurezza2FA() {
    const { user } = useAuth()

    const [mfaAttivo, setMfaAttivo] = useState(false)
    const [mfaAttivatoAt, setMfaAttivatoAt] = useState(null)
    const [codiciRestanti, setCodiciRestanti] = useState(null)
    const [codiciDaMostrare, setCodiciDaMostrare] = useState(null)
    const [modal2FA, setModal2FA] = useState(false)
    const [rigenerando, setRigenerando] = useState(false)
    const [disattivando, setDisattivando] = useState(false)
    const [err2FA, setErr2FA] = useState('')

    useEffect(() => {
        let annullato = false
        async function carica() {
            if (!user?.id) return
            const { data: profilo } = await supabase
                .from('profiles')
                .select('mfa_attivo, mfa_attivato_at')
                .eq('id', user.id)
                .maybeSingle()
            if (annullato || !profilo) return

            setMfaAttivo(profilo.mfa_attivo ?? false)
            setMfaAttivatoAt(profilo.mfa_attivato_at ?? null)

            if (profilo.mfa_attivo) {
                try {
                    const { data } = await supabase.functions.invoke('mfa-backup-codes', {
                        body: { action: 'status' },
                    })
                    if (!annullato && data?.ok) setCodiciRestanti(data.restanti)
                } catch (err) {
                    console.error('Status backup codes:', err)
                }
            }
        }
        carica()
        return () => { annullato = true }
    }, [user?.id])

    async function handleAttiva2FASuccess(codici) {
        setModal2FA(false)
        setMfaAttivo(true)
        setMfaAttivatoAt(new Date().toISOString())
        setCodiciDaMostrare(codici)
        setCodiciRestanti(codici.length)
    }

    async function handleRigeneraCodici() {
        if (!confirm('Rigenerare i codici di recupero? I codici precedenti diventeranno invalidi.')) return
        setRigenerando(true); setErr2FA('')
        try {
            const { data, error } = await supabase.functions.invoke('mfa-backup-codes', {
                body: { action: 'regenerate' },
            })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? 'Errore')
            setCodiciDaMostrare(data.codici)
            setCodiciRestanti(data.codici.length)
        } catch (err) { setErr2FA(err.message) }
        finally { setRigenerando(false) }
    }

    async function handleDisattiva2FA() {
        if (!confirm('Disattivare il 2FA? Il tuo account sarà meno sicuro.')) return
        setDisattivando(true); setErr2FA('')
        try {
            const { data: factors } = await supabase.auth.mfa.listFactors()
            for (const f of (factors?.totp ?? [])) {
                await supabase.auth.mfa.unenroll({ factorId: f.id })
            }
            const { data: { user: u } } = await supabase.auth.getUser()
            await supabase.from('mfa_backup_codes').delete().eq('user_id', u.id)
            setMfaAttivo(false)
            setMfaAttivatoAt(null)
            setCodiciRestanti(null)
        } catch (err) { setErr2FA(err.message) }
        finally { setDisattivando(false) }
    }

    return (
        <div className="bg-slate border border-white/5 p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="font-display text-xl font-light text-nebbia">Sicurezza accesso</h2>
                    <p className="font-body text-xs text-nebbia/40 mt-1">
                        {mfaAttivo
                            ? `Verifica in due passaggi attiva${mfaAttivatoAt ? ` dal ${new Date(mfaAttivatoAt).toLocaleDateString('it-IT')}` : ''}.`
                            : 'Aggiungi un secondo fattore: senza, la sola password protegge i dati dei tuoi clienti.'}
                    </p>
                </div>
                <span className={`font-body text-[10px] px-2 py-0.5 uppercase tracking-wider whitespace-nowrap ${mfaAttivo
                    ? 'bg-salvia/10 border border-salvia/30 text-salvia'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'}`}>
                    {mfaAttivo ? 'Attivo' : 'Non attivo'}
                </span>
            </div>

            {mfaAttivo && codiciRestanti !== null && (
                <div className="flex items-center justify-between gap-3 bg-petrolio/50 border border-white/5 px-4 py-3">
                    <div>
                        <p className="font-body text-xs text-nebbia/60">Codici di recupero disponibili</p>
                        <p className="font-display text-lg text-nebbia/80">{codiciRestanti}</p>
                        {codiciRestanti <= 2 && (
                            <p className="font-body text-[11px] text-amber-400/80 mt-0.5">
                                Ne restano pochi: rigenerali per non restare fuori dall'account.
                            </p>
                        )}
                    </div>
                    <button onClick={handleRigeneraCodici} disabled={rigenerando}
                        className="font-body text-xs text-oro hover:text-oro/70 border border-oro/30 hover:border-oro/60 px-3 py-1.5 disabled:opacity-40">
                        {rigenerando ? 'Rigenero…' : 'Rigenera codici'}
                    </button>
                </div>
            )}

            {err2FA && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {err2FA}
                </div>
            )}

            <div className="flex gap-2">
                {!mfaAttivo ? (
                    <button onClick={() => setModal2FA(true)} className="btn-primary text-sm flex items-center gap-2">
                        <Shield size={14} /> Attiva 2FA
                    </button>
                ) : (
                    <button onClick={handleDisattiva2FA} disabled={disattivando}
                        className="font-body text-sm text-red-400/80 hover:text-red-400 border border-red-500/30 hover:border-red-500/60 px-4 py-2.5 disabled:opacity-40">
                        {disattivando ? 'Disattivo…' : 'Disattiva 2FA'}
                    </button>
                )}
            </div>

            {modal2FA && (
                <ModalAttiva2FA
                    onClose={() => setModal2FA(false)}
                    onSuccess={handleAttiva2FASuccess}
                />
            )}
            {codiciDaMostrare && (
                <ModalBackupCodes
                    codici={codiciDaMostrare}
                    onClose={() => setCodiciDaMostrare(null)}
                />
            )}
        </div>
    )
}
