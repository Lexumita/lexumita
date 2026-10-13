// src/pages/admin/Profilo.jsx

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared'
import { Edit2, Check, X, CheckCircle, AlertCircle, Eye, EyeOff, Shield, ShieldCheck, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ModalAttiva2FA from '@/components/sicurezza/ModalAttiva2FA'
import ModalBackupCodes from '@/components/sicurezza/ModalBackupCodes'
import { messaggioPassword, messaggioErroreAuthPassword, messaggioErroreInvoke, TESTO_REGOLA_PASSWORD } from '@/lib/password'

function Campo({ label, value, placeholder = '—', type = 'text', disabled = false, editing, onChange }) {
    if (!editing || disabled) {
        return (
            <div>
                <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-1">{label}</label>
                <p className={`font-body text-sm py-2 border-b border-white/8 ${value ? 'text-nebbia' : 'text-nebbia/25 italic'}`}>
                    {value || placeholder}
                </p>
                {disabled && editing && <p className="font-body text-xs text-nebbia/20 mt-1">Non modificabile da qui.</p>}
            </div>
        )
    }
    return (
        <div>
            <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
        </div>
    )
}

export default function AdminProfilo() {
    const [loading, setLoading] = useState(true)

    // Dati personali
    const [dati, setDati] = useState({ nome: '', cognome: '', telefono: '', email: '' })
    const [datiOriginali, setDatiOriginali] = useState({})
    const [editingDati, setEditingDati] = useState(false)
    const [salvandoDati, setSalvandoDati] = useState(false)
    const [okDati, setOkDati] = useState(false)
    const [errDati, setErrDati] = useState('')

    // Password
    const [editingPwd, setEditingPwd] = useState(false)
    const [pwd, setPwd] = useState({ nuova: '', conferma: '' })
    const [showPwd, setShowPwd] = useState(false)
    const [salvandoPwd, setSalvandoPwd] = useState(false)
    const [okPwd, setOkPwd] = useState(false)
    const [errPwd, setErrPwd] = useState('')

    // 2FA
    const [mfaAttivo, setMfaAttivo] = useState(false)
    const [mfaAttivatoAt, setMfaAttivatoAt] = useState(null)
    const [codiciRestanti, setCodiciRestanti] = useState(null)
    const [modal2FA, setModal2FA] = useState(false)
    const [modalBackup, setModalBackup] = useState(false)
    const [codiciDaMostrare, setCodiciDaMostrare] = useState(null)
    const [rigenerando, setRigenerando] = useState(false)
    const [err2FA, setErr2FA] = useState('')

    async function carica() {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            const { data: profilo } = await supabase
                .from('profiles')
                .select('nome, cognome, email, telefono, mfa_attivo, mfa_attivato_at')
                .eq('id', user.id)
                .single()

            if (profilo) {
                const d = {
                    nome: profilo.nome ?? '',
                    cognome: profilo.cognome ?? '',
                    telefono: profilo.telefono ?? '',
                    email: profilo.email ?? user.email ?? '',
                }
                setDati(d)
                setDatiOriginali(d)
                setMfaAttivo(profilo.mfa_attivo ?? false)
                setMfaAttivatoAt(profilo.mfa_attivato_at ?? null)

                if (profilo.mfa_attivo) {
                    await caricaStatusBackupCodes()
                }
            }
        } catch (err) {
            console.error('Profilo admin carica:', err)
        } finally {
            setLoading(false)
        }
    }

    async function caricaStatusBackupCodes() {
        try {
            const { data } = await supabase.functions.invoke('mfa-backup-codes', {
                body: { action: 'status' }
            })
            if (data?.ok) setCodiciRestanti(data.restanti)
        } catch (err) {
            console.error('Status backup codes:', err)
        }
    }

    useEffect(() => { carica() }, [])

    async function handleSalvaDati() {
        setSalvandoDati(true); setErrDati(''); setOkDati(false)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase.from('profiles').update({
                nome: dati.nome.trim(),
                cognome: dati.cognome.trim(),
                telefono: dati.telefono.trim() || null,
            }).eq('id', user.id)
            if (error) throw new Error(error.message)
            setDatiOriginali(dati); setEditingDati(false); setOkDati(true)
            setTimeout(() => setOkDati(false), 3000)
        } catch (err) { setErrDati(err.message) }
        finally { setSalvandoDati(false) }
    }

    function handleAnnullaDati() { setDati(datiOriginali); setEditingDati(false); setErrDati('') }

    async function handleCambiaPwd() {
        setErrPwd(''); setOkPwd(false)
        const errRegola = messaggioPassword(pwd.nuova)
        if (errRegola) return setErrPwd(errRegola)
        if (pwd.nuova !== pwd.conferma) return setErrPwd('Le password non corrispondono')
        setSalvandoPwd(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: pwd.nuova })
            if (error) throw new Error(messaggioErroreAuthPassword(error, pwd.nuova) ?? error.message)
            setPwd({ nuova: '', conferma: '' }); setEditingPwd(false); setOkPwd(true)
            setTimeout(() => setOkPwd(false), 3000)
        } catch (err) { setErrPwd(err.message) }
        finally { setSalvandoPwd(false) }
    }

    async function handleAttiva2FASuccess(codici) {
        // Chiamato dopo enroll TOTP riuscito
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
                body: { action: 'regenerate' }
            })
            if (error || !data?.ok) throw new Error(await messaggioErroreInvoke(error, data))
            setCodiciDaMostrare(data.codici)
            setCodiciRestanti(data.codici.length)
        } catch (err) {
            setErr2FA(err.message)
        } finally {
            setRigenerando(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    return (
        <div className="space-y-5">
            <PageHeader label="Account" title="Profilo amministratore" />

            {/* BANNER 2FA NON ATTIVO (solo admin senza 2FA) */}
            {!mfaAttivo && (
                <div className="bg-red-900/10 border border-red-500/40 p-4 flex items-start gap-3">
                    <ShieldAlert size={18} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium text-red-400 mb-1">
                            Autenticazione a due fattori non attiva
                        </p>
                        <p className="font-body text-xs text-red-400/70 leading-relaxed">
                            Gli account amministratore devono attivare il 2FA. L'accesso alle pagine admin verrà limitato finché non lo configuri.
                        </p>
                    </div>
                </div>
            )}

            {/* DATI PERSONALI */}
            <div className="bg-slate border border-white/5 p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <p className="section-label">Dati personali</p>
                    {!editingDati ? (
                        <button onClick={() => setEditingDati(true)} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors border border-white/10 hover:border-oro/30 px-3 py-1.5">
                            <Edit2 size={12} /> Modifica
                        </button>
                    ) : (
                        <button onClick={handleAnnullaDati} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors border border-white/10 px-3 py-1.5">
                            <X size={12} /> Annulla
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <Campo label="Nome" value={dati.nome} editing={editingDati} onChange={v => setDati(d => ({ ...d, nome: v }))} />
                    <Campo label="Cognome" value={dati.cognome} editing={editingDati} onChange={v => setDati(d => ({ ...d, cognome: v }))} />
                </div>
                <Campo label="Email" value={dati.email} disabled={true} editing={editingDati} onChange={() => { }} />
                <Campo label="Telefono" value={dati.telefono} placeholder="+39 333 1234567"
                    editing={editingDati} onChange={v => setDati(d => ({ ...d, telefono: v }))} />

                {errDati && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errDati}</div>}
                {okDati && <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20"><CheckCircle size={14} /> Profilo aggiornato.</div>}
                {editingDati && (
                    <button onClick={handleSalvaDati} disabled={salvandoDati} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">
                        {salvandoDati ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Check size={14} /> Salva modifiche</>}
                    </button>
                )}
            </div>

            {/* SICUREZZA — 2FA */}
            <div className={`bg-slate border p-6 space-y-5 ${mfaAttivo ? 'border-white/5' : 'border-red-500/30'}`}>
                <div className="flex items-center gap-2">
                    {mfaAttivo
                        ? <ShieldCheck size={14} className="text-salvia" />
                        : <Shield size={14} className="text-nebbia/40" />
                    }
                    <p className="section-label !m-0">Sicurezza</p>
                </div>

                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-nebbia mb-1">
                            Autenticazione a due fattori (2FA)
                        </p>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            {mfaAttivo
                                ? `Attiva dal ${new Date(mfaAttivatoAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}. Per accedere al pannello admin ti verrà chiesto il codice da app autenticatore.`
                                : 'Proteggi il tuo account con un codice generato da app come Google Authenticator, Authy o 1Password. Obbligatorio per gli amministratori.'
                            }
                        </p>
                    </div>
                    <span className={`font-body text-[10px] px-2 py-0.5 uppercase tracking-wider whitespace-nowrap ${mfaAttivo
                        ? 'text-salvia border border-salvia/30 bg-salvia/5'
                        : 'text-red-400 border border-red-500/30 bg-red-500/5'
                        }`}>
                        {mfaAttivo ? 'Attivo' : 'Non attivo'}
                    </span>
                </div>

                {/* Backup codes status */}
                {mfaAttivo && codiciRestanti !== null && (
                    <div className="bg-petrolio border border-white/5 p-4 flex items-center justify-between">
                        <div>
                            <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-1">Codici di recupero</p>
                            <p className="font-body text-sm text-nebbia">
                                {codiciRestanti} su 10 disponibili
                            </p>
                            {codiciRestanti <= 3 && (
                                <p className="font-body text-xs text-amber-400 mt-1">
                                    Codici quasi esauriti — rigenerali per sicurezza.
                                </p>
                            )}
                        </div>
                        <button onClick={handleRigeneraCodici} disabled={rigenerando}
                            className="font-body text-xs text-oro hover:text-oro/70 border border-oro/30 hover:border-oro/60 px-3 py-1.5 disabled:opacity-40">
                            {rigenerando ? 'Rigenero…' : 'Rigenera codici'}
                        </button>
                    </div>
                )}

                {err2FA && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {err2FA}</div>}

                {!mfaAttivo && (
                    <button onClick={() => setModal2FA(true)} className="btn-primary text-sm flex items-center gap-2">
                        <Shield size={14} /> Attiva 2FA
                    </button>
                )}

                {/* Admin non può disattivare 2FA */}
                {mfaAttivo && (
                    <p className="font-body text-xs text-nebbia/30 italic">
                        Il 2FA è obbligatorio per gli account amministratore e non può essere disattivato.
                    </p>
                )}
            </div>

            {/* PASSWORD */}
            <div className="bg-slate border border-white/5 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="section-label">Password</p>
                    {!editingPwd ? (
                        <button onClick={() => setEditingPwd(true)} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors border border-white/10 hover:border-oro/30 px-3 py-1.5">
                            <Edit2 size={12} /> Cambia
                        </button>
                    ) : (
                        <button onClick={() => { setEditingPwd(false); setPwd({ nuova: '', conferma: '' }); setErrPwd('') }}
                            className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors border border-white/10 px-3 py-1.5">
                            <X size={12} /> Annulla
                        </button>
                    )}
                </div>

                {!editingPwd ? (
                    <p className="font-body text-sm text-nebbia/30 py-2 border-b border-white/8">............</p>
                ) : (
                    <>
                        {['nuova', 'conferma'].map(k => (
                            <div key={k}>
                                <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                                    {k === 'nuova' ? 'Nuova password' : 'Conferma password'}
                                </label>
                                <div className="relative">
                                    <input type={showPwd ? 'text' : 'password'} value={pwd[k]}
                                        onChange={e => setPwd(p => ({ ...p, [k]: e.target.value }))}
                                        placeholder="........"
                                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 pr-10 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                                    {k === 'conferma' && (
                                        <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-oro">
                                            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    )}
                                </div>
                                {k === 'nuova' && <p className="mt-1.5 font-body text-xs text-nebbia/40 leading-relaxed">{TESTO_REGOLA_PASSWORD}</p>}
                            </div>
                        ))}
                        {errPwd && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errPwd}</div>}
                        <button onClick={handleCambiaPwd} disabled={salvandoPwd || !pwd.nuova || !pwd.conferma} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">
                            {salvandoPwd ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Check size={14} /> Aggiorna password</>}
                        </button>
                    </>
                )}
                {okPwd && <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20"><CheckCircle size={14} /> Password aggiornata.</div>}
            </div>

            {/* MODALS */}
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