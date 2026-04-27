// src/pages/avvocato/Profilo.jsx

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PageHeader, Badge } from '@/components/shared'
import { Edit2, Check, X, CheckCircle, AlertCircle, Eye, EyeOff, Scale, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

export default function AvvocatoProfilo() {
    const { profile } = useAuth()

    const [loading, setLoading] = useState(true)
    const [tipoAccount, setTipoAccount] = useState(null)
    const [verificato, setVerificato] = useState(false)

    // Dati piano da profiles
    const [pianoDati, setPianoDati] = useState(null)

    // Dati personali
    const [dati, setDati] = useState({ nome: '', cognome: '', telefono: '', email: '', specializzazioni: '', studio: '' })
    const [datiOriginali, setDatiOriginali] = useState({})
    const [editingDati, setEditingDati] = useState(false)
    const [salvandoDati, setSalvandoDati] = useState(false)
    const [okDati, setOkDati] = useState(false)
    const [errDati, setErrDati] = useState('')

    // Dati professionali per atti
    const [atti, setAtti] = useState({ foro: '', numero_albo: '', pec: '', data_iscrizione_albo: '' })
    const [attiOriginali, setAttiOriginali] = useState({})
    const [editingAtti, setEditingAtti] = useState(false)
    const [salvandoAtti, setSalvandoAtti] = useState(false)
    const [okAtti, setOkAtti] = useState(false)
    const [errAtti, setErrAtti] = useState('')

    // Password
    const [editingPwd, setEditingPwd] = useState(false)
    const [pwd, setPwd] = useState({ nuova: '', conferma: '' })
    const [showPwd, setShowPwd] = useState(false)
    const [salvandoPwd, setSalvandoPwd] = useState(false)
    const [okPwd, setOkPwd] = useState(false)
    const [errPwd, setErrPwd] = useState('')

    useEffect(() => {
        async function carica() {
            try {
                const { data: { user } } = await supabase.auth.getUser()

                const { data: profilo } = await supabase
                    .from('profiles')
                    .select('nome, cognome, email, telefono, specializzazioni, studio, tipo_account, verification_status, piano_id, abbonamento_tipo, abbonamento_scadenza, posti_acquistati, include_banca_dati, include_monetizzazione, foro, numero_albo, pec, data_iscrizione_albo')
                    .eq('id', user.id)
                    .single()

                if (profilo) {
                    const d = {
                        nome: profilo.nome ?? '',
                        cognome: profilo.cognome ?? '',
                        telefono: profilo.telefono ?? '',
                        email: profilo.email ?? user.email ?? '',
                        specializzazioni: profilo.specializzazioni ?? '',
                        studio: profilo.studio ?? '',
                    }
                    setDati(d)
                    setDatiOriginali(d)

                    const a = {
                        foro: profilo.foro ?? '',
                        numero_albo: profilo.numero_albo ?? '',
                        pec: profilo.pec ?? '',
                        data_iscrizione_albo: profilo.data_iscrizione_albo ?? '',
                    }
                    setAtti(a)
                    setAttiOriginali(a)

                    setTipoAccount(profilo.tipo_account ?? null)
                    setVerificato(profilo.verification_status === 'approved')

                    if (profilo.piano_id) {
                        setPianoDati({
                            nome: profilo.abbonamento_tipo ?? '—',
                            scadenza: profilo.abbonamento_scadenza ?? null,
                            posti: profilo.posti_acquistati ?? 1,
                            include_banca_dati: profilo.include_banca_dati ?? false,
                            include_monetizzazione: profilo.include_monetizzazione ?? false,
                        })
                    }
                }
            } catch (err) {
                console.error('Profilo carica:', err)
            } finally {
                setLoading(false)
            }
        }
        carica()
    }, [])

    async function handleSalvaDati() {
        setSalvandoDati(true); setErrDati(''); setOkDati(false)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase.from('profiles').update({
                nome: dati.nome.trim(),
                cognome: dati.cognome.trim(),
                telefono: dati.telefono.trim() || null,
                studio: dati.studio.trim() || null,
                specializzazioni: dati.specializzazioni.trim() || null,
            }).eq('id', user.id)
            if (error) throw new Error(error.message)
            setDatiOriginali(dati); setEditingDati(false); setOkDati(true)
            setTimeout(() => setOkDati(false), 3000)
        } catch (err) { setErrDati(err.message) }
        finally { setSalvandoDati(false) }
    }

    function handleAnnullaDati() { setDati(datiOriginali); setEditingDati(false); setErrDati('') }

    async function handleSalvaAtti() {
        setSalvandoAtti(true); setErrAtti(''); setOkAtti(false)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase.from('profiles').update({
                foro: atti.foro.trim() || null,
                numero_albo: atti.numero_albo.trim() || null,
                pec: atti.pec.trim() || null,
                data_iscrizione_albo: atti.data_iscrizione_albo || null,
            }).eq('id', user.id)
            if (error) throw new Error(error.message)
            setAttiOriginali(atti); setEditingAtti(false); setOkAtti(true)
            setTimeout(() => setOkAtti(false), 3000)
        } catch (err) { setErrAtti(err.message) }
        finally { setSalvandoAtti(false) }
    }

    function handleAnnullaAtti() { setAtti(attiOriginali); setEditingAtti(false); setErrAtti('') }

    async function handleCambiaPwd() {
        setErrPwd(''); setOkPwd(false)
        if (pwd.nuova.length < 8) return setErrPwd('Minimo 8 caratteri')
        if (pwd.nuova !== pwd.conferma) return setErrPwd('Le password non corrispondono')
        setSalvandoPwd(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: pwd.nuova })
            if (error) throw new Error(error.message)
            setPwd({ nuova: '', conferma: '' }); setEditingPwd(false); setOkPwd(true)
            setTimeout(() => setOkPwd(false), 3000)
        } catch (err) { setErrPwd(err.message) }
        finally { setSalvandoPwd(false) }
    }

    const isTitolare = tipoAccount === 'titolare'
    const isMembro = tipoAccount === 'membro' || tipoAccount === 'referente'
    const tipoLabel = { titolare: 'Titolare studio', referente: 'Referente studio', membro: 'Membro studio', singolo: 'Avvocato singolo' }[tipoAccount ?? ''] ?? '—'

    const scaduto = pianoDati?.scadenza && new Date(pianoDati.scadenza) < new Date()

    // Verifica completezza dati per generazione atti
    const campiAttiMancanti = []
    if (!atti.foro) campiAttiMancanti.push('Foro')
    if (!atti.numero_albo) campiAttiMancanti.push('Numero albo')
    if (!atti.pec) campiAttiMancanti.push('PEC')
    const profiloCompleto = campiAttiMancanti.length === 0

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    return (
        <div className="space-y-5">
            <PageHeader label="Account" title="Il mio profilo" />

            {/* BANNER COMPLETAMENTO PROFILO */}
            {!profiloCompleto && (
                <div className="bg-amber-900/10 border border-amber-500/30 p-4 flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium text-amber-400 mb-1">
                            Completa il profilo per generare atti legali
                        </p>
                        <p className="font-body text-xs text-amber-400/70 leading-relaxed">
                            Mancano: <span className="font-medium">{campiAttiMancanti.join(', ')}</span>. Compila la sezione <em>Dati professionali per atti</em> qui sotto per abilitare la generazione automatica di documenti dalle tue pratiche.
                        </p>
                    </div>
                </div>
            )}

            {/* INFORMAZIONI ACCOUNT */}
            <div className="bg-slate border border-white/5 p-5 space-y-3">
                <p className="section-label mb-1">Informazioni account</p>
                {[
                    ['Tipo account', tipoLabel],
                    dati.studio ? ['Studio', dati.studio] : null,
                    ['Verifica identità', verificato ? 'Identità verificata ✓' : 'In attesa di verifica'],
                ].filter(Boolean).map(([l, v]) => (
                    <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                        <span className={`font-body text-sm ${l === 'Verifica identità' && verificato ? 'text-salvia' : 'text-nebbia'}`}>{v}</span>
                    </div>
                ))}
                {isMembro && <p className="font-body text-xs text-nebbia/25 italic mt-1">Sei un membro dello studio. Per modificare il piano contatta il titolare.</p>}
                <Link to="/studio" className="font-body text-xs text-oro hover:text-oro/70 flex items-center gap-1 mt-1">Gestisci studio →</Link>
            </div>

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
                <Campo label="Studio / Nome studio" value={dati.studio} placeholder="Es. Studio Rossi & Associati"
                    editing={editingDati} onChange={v => setDati(d => ({ ...d, studio: v }))} />
                <Campo label="Telefono" value={dati.telefono} placeholder="+39 333 1234567"
                    editing={editingDati} onChange={v => setDati(d => ({ ...d, telefono: v }))} />
                <Campo label="Email" value={dati.email} disabled={true} editing={editingDati} onChange={() => { }} />
                <Campo label="Specializzazioni" value={dati.specializzazioni} placeholder="Diritto civile, Diritto commerciale..."
                    editing={editingDati} onChange={v => setDati(d => ({ ...d, specializzazioni: v }))} />

                {errDati && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errDati}</div>}
                {okDati && <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20"><CheckCircle size={14} /> Profilo aggiornato.</div>}
                {editingDati && (
                    <button onClick={handleSalvaDati} disabled={salvandoDati} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">
                        {salvandoDati ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Check size={14} /> Salva modifiche</>}
                    </button>
                )}
            </div>

            {/* DATI PROFESSIONALI PER ATTI */}
            <div className={`bg-slate border p-6 space-y-5 ${profiloCompleto ? 'border-white/5' : 'border-amber-500/30'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Scale size={14} className="text-oro/60" />
                        <p className="section-label !m-0">Dati professionali per atti</p>
                        {profiloCompleto && (
                            <span className="font-body text-[10px] text-salvia border border-salvia/30 bg-salvia/5 px-2 py-0.5 uppercase tracking-wider">
                                Completo
                            </span>
                        )}
                    </div>
                    {!editingAtti ? (
                        <button onClick={() => setEditingAtti(true)} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors border border-white/10 hover:border-oro/30 px-3 py-1.5">
                            <Edit2 size={12} /> {profiloCompleto ? 'Modifica' : 'Compila'}
                        </button>
                    ) : (
                        <button onClick={handleAnnullaAtti} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors border border-white/10 px-3 py-1.5">
                            <X size={12} /> Annulla
                        </button>
                    )}
                </div>

                <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                    Questi dati vengono utilizzati per intestare correttamente gli atti legali generati dalle tue pratiche.
                </p>

                <div className="grid grid-cols-2 gap-5">
                    <Campo label="Foro di iscrizione" value={atti.foro} placeholder="Es. Foro di Milano"
                        editing={editingAtti} onChange={v => setAtti(a => ({ ...a, foro: v }))} />
                    <Campo label="Numero albo" value={atti.numero_albo} placeholder="Es. A23456"
                        editing={editingAtti} onChange={v => setAtti(a => ({ ...a, numero_albo: v }))} />
                </div>
                <Campo label="PEC" value={atti.pec} placeholder="nome.cognome@pec.ordineavvocati.it" type="email"
                    editing={editingAtti} onChange={v => setAtti(a => ({ ...a, pec: v }))} />
                <Campo label="Data iscrizione albo" value={atti.data_iscrizione_albo} placeholder="—" type="date"
                    editing={editingAtti} onChange={v => setAtti(a => ({ ...a, data_iscrizione_albo: v }))} />

                {errAtti && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errAtti}</div>}
                {okAtti && <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20"><CheckCircle size={14} /> Dati professionali aggiornati.</div>}
                {editingAtti && (
                    <button onClick={handleSalvaAtti} disabled={salvandoAtti} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">
                        {salvandoAtti ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Check size={14} /> Salva dati professionali</>}
                    </button>
                )}
            </div>

            {/* ABBONAMENTO */}
            {pianoDati && (
                <div className="bg-slate border border-white/5 p-5">
                    <p className="section-label mb-3">{isMembro ? 'Piano studio' : 'Abbonamento'}</p>
                    <div className="flex items-center justify-between p-4 bg-oro/8 border border-oro/20">
                        <div>
                            <p className="font-body text-sm font-medium text-nebbia">{pianoDati.nome}</p>
                            <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                {pianoDati.posti} {pianoDati.posti === 1 ? 'accesso' : 'accessi'}
                                {pianoDati.include_banca_dati ? ' · Banca dati inclusa' : ''}
                            </p>
                            {pianoDati.scadenza && (
                                <p className={`font-body text-xs mt-0.5 ${scaduto ? 'text-red-400' : 'text-nebbia/40'}`}>
                                    {scaduto ? 'Scaduto' : `Scade il ${new Date(pianoDati.scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                                </p>
                            )}
                        </div>
                        <Badge label={scaduto ? 'Scaduto' : 'Attivo'} variant={scaduto ? 'red' : 'salvia'} />
                    </div>
                    {isMembro
                        ? <p className="font-body text-xs text-nebbia/30 mt-2">Gestito dal titolare dello studio.</p>
                        : <Link to="/studio" className="font-body text-xs text-oro hover:text-oro/70 flex items-center gap-1 mt-3">Gestisci piano →</Link>
                    }
                </div>
            )}

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
                    <p className="font-body text-sm text-nebbia/30 py-2 border-b border-white/8">••••••••••••</p>
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
                                        placeholder="••••••••"
                                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 pr-10 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                                    {k === 'conferma' && (
                                        <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-oro">
                                            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {errPwd && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errPwd}</div>}
                        <button onClick={handleCambiaPwd} disabled={salvandoPwd || !pwd.nuova} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">
                            {salvandoPwd ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Check size={14} /> Aggiorna password</>}
                        </button>
                    </>
                )}
                {okPwd && <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20"><CheckCircle size={14} /> Password aggiornata.</div>}
            </div>
        </div>
    )
}