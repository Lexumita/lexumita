import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { PageHeader, InputField, Badge } from '@/components/shared'
import { Edit2, Check, X, CheckCircle, AlertCircle, Eye, EyeOff, Scale } from 'lucide-react'

export default function UserProfilo() {
    const { profile } = useAuth()

    // ── Dati personali ──
    const [form, setForm] = useState({
        nome: profile?.nome ?? '',
        cognome: profile?.cognome ?? '',
        telefono: profile?.telefono ?? '',
    })
    const [datiOriginali, setDatiOriginali] = useState({ ...form })

    // Sincronizza form quando profile arriva (caso async)
    useEffect(() => {
        if (profile) {
            const init = {
                nome: profile.nome ?? '',
                cognome: profile.cognome ?? '',
                telefono: profile.telefono ?? '',
            }
            setForm(init)
            setDatiOriginali(init)
        }
    }, [profile])
    const [salvandoDati, setSalvandoDati] = useState(false)
    const [okDati, setOkDati] = useState(false)
    const [errDati, setErrDati] = useState('')

    // ── Password ──
    const [pwd, setPwd] = useState({ nuova: '', conferma: '' })
    const [editingPwd, setEditingPwd] = useState(false)
    const [salvandoPwd, setSalvandoPwd] = useState(false)
    const [okPwd, setOkPwd] = useState(false)
    const [errPwd, setErrPwd] = useState('')

    const f = k => ({
        value: form[k],
        onChange: e => { setForm(p => ({ ...p, [k]: e.target.value })); setErrDati('') }
    })

    const isDirty = JSON.stringify(form) !== JSON.stringify(datiOriginali)

    const isApproved = profile?.verification_status === 'approved'
    const isRejected = profile?.verification_status === 'rejected'
    const isPending = profile?.verification_status === 'pending'

    async function handleSalvaDati() {
        setSalvandoDati(true)
        setErrDati('')
        setOkDati(false)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase
                .from('profiles')
                .update({
                    nome: form.nome.trim(),
                    cognome: form.cognome.trim(),
                    telefono: form.telefono.trim() || null,
                })
                .eq('id', user.id)
            if (error) throw new Error(error.message)
            setDatiOriginali({ ...form })
            setOkDati(true)
            setTimeout(() => setOkDati(false), 3000)
        } catch (err) {
            setErrDati(err.message)
        } finally {
            setSalvandoDati(false)
        }
    }

    function handleAnnullaDati() {
        setForm({ ...datiOriginali })
        setErrDati('')
    }

    async function handleCambiaPwd() {
        setErrPwd('')
        setOkPwd(false)
        if (pwd.nuova.length < 8) return setErrPwd('Minimo 8 caratteri')
        if (pwd.nuova !== pwd.conferma) return setErrPwd('Le password non corrispondono')
        setSalvandoPwd(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: pwd.nuova })
            if (error) throw new Error(error.message)
            setPwd({ nuova: '', conferma: '' })
            setEditingPwd(false)
            setOkPwd(true)
            setTimeout(() => setOkPwd(false), 3000)
        } catch (err) {
            setErrPwd(err.message)
        } finally {
            setSalvandoPwd(false)
        }
    }

    return (
        <div className="space-y-5 max-w-2xl">
            <PageHeader label="Account" title="Il mio profilo" />

            {/* Stato account */}
            <div className="bg-slate border border-white/5 p-5 space-y-3">
                <p className="section-label mb-1">Stato account</p>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Ruolo</span>
                    <Badge label="User" variant="gray" />
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Email</span>
                    <span className="font-body text-sm text-nebbia">{profile?.email ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Verifica identità</span>
                    <div className="flex items-center gap-1.5">
                        {isApproved && <><CheckCircle size={13} className="text-salvia" /><span className="font-body text-sm text-salvia">Approvata</span></>}
                        {isRejected && <><AlertCircle size={13} className="text-red-400" /><span className="font-body text-sm text-red-400">Non approvata</span></>}
                        {isPending && <><Clock size={13} className="text-amber-400" /><span className="font-body text-sm text-amber-400">In corso</span></>}
                        {!profile?.verification_status && <span className="font-body text-sm text-nebbia/30">Non inviata</span>}
                    </div>
                </div>

                {isRejected && profile?.verification_note && (
                    <div className="mt-2 bg-red-900/10 border border-red-500/20 p-3">
                        <p className="font-body text-xs text-red-400/80 uppercase tracking-widest mb-1">Motivo del rifiuto</p>
                        <p className="font-body text-sm text-red-400 leading-relaxed">{profile.verification_note}</p>
                    </div>
                )}
            </div>

            {/* Dati personali */}
            <div className="bg-slate border border-white/5 p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <p className="section-label">Dati personali</p>
                    {okDati && (
                        <span className="flex items-center gap-1 font-body text-xs text-salvia">
                            <Check size={12} /> Salvato
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <InputField label="Nome"    {...f('nome')} />
                    <InputField label="Cognome" {...f('cognome')} />
                </div>
                <InputField label="Telefono" placeholder="+39 02 1234567" {...f('telefono')} />

                {errDati && (
                    <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
                        <p className="font-body text-sm text-red-400">{errDati}</p>
                    </div>
                )}

                {isDirty && (
                    <div className="flex gap-3">
                        <button onClick={handleAnnullaDati} className="btn-secondary text-sm flex-1">Annulla</button>
                        <button
                            onClick={handleSalvaDati}
                            disabled={salvandoDati}
                            className="btn-primary text-sm flex-1 justify-center disabled:opacity-40"
                        >
                            {salvandoDati
                                ? <><Loader2 size={14} className="animate-spin" /> Salvataggio…</>
                                : 'Salva modifiche'
                            }
                        </button>
                    </div>
                )}
            </div>

            {/* Password */}
            <div className="bg-slate border border-white/5 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="section-label">Cambia password</p>
                    {okPwd && (
                        <span className="flex items-center gap-1 font-body text-xs text-salvia">
                            <Check size={12} /> Password aggiornata
                        </span>
                    )}
                </div>

                {!editingPwd ? (
                    <button onClick={() => setEditingPwd(true)} className="btn-secondary text-sm">
                        Modifica password
                    </button>
                ) : (
                    <>
                        <InputField label="Nuova password" type="password" placeholder="Minimo 8 caratteri"
                            value={pwd.nuova} onChange={e => setPwd(p => ({ ...p, nuova: e.target.value }))} />
                        <InputField label="Conferma password" type="password" placeholder="Ripeti la nuova password"
                            value={pwd.conferma} onChange={e => setPwd(p => ({ ...p, conferma: e.target.value }))} />

                        {errPwd && (
                            <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
                                <p className="font-body text-sm text-red-400">{errPwd}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setEditingPwd(false); setPwd({ nuova: '', conferma: '' }); setErrPwd('') }}
                                className="btn-secondary text-sm flex-1"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleCambiaPwd}
                                disabled={salvandoPwd || !pwd.nuova || !pwd.conferma}
                                className="btn-primary text-sm flex-1 justify-center disabled:opacity-40"
                            >
                                {salvandoPwd
                                    ? <><Loader2 size={14} className="animate-spin" /> Aggiornamento…</>
                                    : 'Aggiorna password'
                                }
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}