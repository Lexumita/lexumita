import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { PageHeader, InputField, Badge } from '@/components/shared'
import { Edit2, Check, X, CheckCircle, AlertCircle, Eye, EyeOff, Scale, Clock, Loader2 } from 'lucide-react'
import { elencoPaesi } from '@/lib/paesi'
import { messaggioPassword, messaggioErroreAuthPassword, messaggioErroreDatabase, TESTO_REGOLA_PASSWORD } from '@/lib/password'

export default function UserProfilo() {
    const { profile, refreshProfile } = useAuth()

    // ── Dati personali ──
    const [form, setForm] = useState({
        nome: profile?.nome ?? '',
        cognome: profile?.cognome ?? '',
        telefono: profile?.telefono ?? '',
        // indirizzo di fatturazione: serve per pagare (src/lib/datiFatturazione.jsx)
        indirizzo: profile?.indirizzo ?? '',
        cap: profile?.cap ?? '',
        comune: profile?.comune ?? '',
        provincia: profile?.provincia ?? '',
        paese: profile?.paese ?? 'IT',
    })
    const [datiOriginali, setDatiOriginali] = useState({ ...form })

    // Sincronizza form quando profile arriva (caso async)
    useEffect(() => {
        if (profile) {
            const init = {
                nome: profile.nome ?? '',
                cognome: profile.cognome ?? '',
                telefono: profile.telefono ?? '',
                indirizzo: profile.indirizzo ?? '',
                cap: profile.cap ?? '',
                comune: profile.comune ?? '',
                provincia: profile.provincia ?? '',
                paese: profile.paese ?? 'IT',
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
                    indirizzo: form.indirizzo.trim() || null,
                    cap: form.cap.trim() || null,
                    comune: form.comune.trim() || null,
                    // la provincia c'è solo in Italia
                    provincia: form.paese === 'IT' ? (form.provincia.trim().toUpperCase() || null) : null,
                    paese: form.paese || 'IT',
                })
                .eq('id', user.id)
            if (error) throw new Error(error.message)
            setDatiOriginali({ ...form })
            setOkDati(true)
            // il profilo in memoria si aggiorna: i pulsanti «Paga» vedono subito l'indirizzo
            refreshProfile?.()
            setTimeout(() => setOkDati(false), 3000)
        } catch (err) {
            setErrDati(messaggioErroreDatabase(err))
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
        const errRegola = messaggioPassword(pwd.nuova)
        if (errRegola) return setErrPwd(errRegola)
        if (pwd.nuova !== pwd.conferma) return setErrPwd('Le password non corrispondono')
        setSalvandoPwd(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: pwd.nuova })
            if (error) throw new Error(messaggioErroreAuthPassword(error, pwd.nuova) ?? error.message)
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-3 border-b border-white/5 pb-2">
                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Email</span>
                    <span className="font-body text-sm text-nebbia break-words sm:text-right">{profile?.email ?? '—'}</span>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Nome"    {...f('nome')} />
                    <InputField label="Cognome" {...f('cognome')} />
                </div>
                <InputField label="Telefono" placeholder="+39 02 1234567" {...f('telefono')} />

                <div className="pt-2 space-y-4">
                    <div>
                        <p className="font-body text-sm text-nebbia">Indirizzo di fatturazione</p>
                        <p className="font-body text-xs text-nebbia/40 mt-0.5">Serve per acquistare crediti e piani: compare nella ricevuta.</p>
                    </div>
                    <div>
                        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Paese</label>
                        <select
                            value={form.paese}
                            onChange={e => { setForm(p => ({ ...p, paese: e.target.value })); setErrDati('') }}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50"
                        >
                            {elencoPaesi('it', 'IT').map(p => <option key={p.codice} value={p.codice}>{p.nome}</option>)}
                        </select>
                    </div>
                    <InputField label="Indirizzo e numero civico" placeholder="Via Roma 1" {...f('indirizzo')} />
                    {form.paese === 'IT' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <InputField label="CAP" placeholder="20121" {...f('cap')} />
                            <InputField label="Comune" placeholder="Milano" {...f('comune')} />
                            <InputField label="Provincia" placeholder="MI" maxLength={2} {...f('provincia')} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label="Codice postale" {...f('cap')} />
                            <InputField label="Città" {...f('comune')} />
                        </div>
                    )}
                </div>

                {errDati && (
                    <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
                        <p className="font-body text-sm text-red-400">{errDati}</p>
                    </div>
                )}

                {isDirty && (
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={handleAnnullaDati} className="btn-secondary text-sm flex-1 justify-center">Annulla</button>
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
                    <button onClick={() => setEditingPwd(true)} className="btn-secondary text-sm w-full sm:w-auto justify-center">
                        Modifica password
                    </button>
                ) : (
                    <>
                        <div>
                            <InputField label="Nuova password" type="password" placeholder="Almeno 8 caratteri"
                                value={pwd.nuova} onChange={e => setPwd(p => ({ ...p, nuova: e.target.value }))} />
                            <p className="mt-1.5 font-body text-xs text-nebbia/40 leading-relaxed">{TESTO_REGOLA_PASSWORD}</p>
                        </div>
                        <InputField label="Conferma password" type="password" placeholder="Ripeti la nuova password"
                            value={pwd.conferma} onChange={e => setPwd(p => ({ ...p, conferma: e.target.value }))} />

                        {errPwd && (
                            <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
                                <p className="font-body text-sm text-red-400">{errPwd}</p>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => { setEditingPwd(false); setPwd({ nuova: '', conferma: '' }); setErrPwd('') }}
                                className="btn-secondary text-sm flex-1 justify-center"
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