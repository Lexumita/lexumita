// src/pages/avvocato/Profilo.jsx

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Badge } from '@/components/shared'
import { Edit2, Check, X, CheckCircle, AlertCircle, Eye, EyeOff, Scale, ArrowRight, Shield, ShieldCheck, Receipt } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { REGIMI, CASSE, cassaPredefinita, ibanValido } from '@/lib/fatturazione'
import ModalAttiva2FA from '@/components/sicurezza/ModalAttiva2FA'
import ModalBackupCodes from '@/components/sicurezza/ModalBackupCodes'
import BoxGoogleCalendar from '@/components/avvocato/BoxGoogleCalendar'

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

function CampoSelect({ label, value, opzioni, editing, onChange }) {
    const testo = opzioni.find(o => o.codice === value)?.etichetta
    if (!editing) {
        return (
            <div>
                <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-1">{label}</label>
                <p className={`font-body text-sm py-2 border-b border-white/8 ${testo ? 'text-nebbia' : 'text-nebbia/25 italic'}`}>{testo || '—'}</p>
            </div>
        )
    }
    return (
        <div>
            <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                {opzioni.map(o => <option key={o.codice} value={o.codice}>{o.etichetta}</option>)}
            </select>
        </div>
    )
}

// Dati di fatturazione (04-10-2026): prima si potevano scrivere solo dalla pagina
// /verifica, che dopo la promozione a professionista non si vede piu'.
const FATT_VUOTO = {
    partita_iva: '', cf: '', regime_fiscale: 'RF01', cassa_previdenza: 'cassa_forense',
    indirizzo: '', numero_civico: '', cap: '', comune: '', provincia: '', paese: 'IT',
    iban: '', codice_destinatario_sdi: '',
}

export default function AvvocatoProfilo() {
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

    // Dati di fatturazione
    const [fatt, setFatt] = useState(FATT_VUOTO)
    const [fattOriginali, setFattOriginali] = useState(FATT_VUOTO)
    const [editingFatt, setEditingFatt] = useState(false)
    const [salvandoFatt, setSalvandoFatt] = useState(false)
    const [okFatt, setOkFatt] = useState(false)
    const [errFatt, setErrFatt] = useState('')

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
    const [codiciDaMostrare, setCodiciDaMostrare] = useState(null)
    const [rigenerando, setRigenerando] = useState(false)
    const [disattivando, setDisattivando] = useState(false)
    const [err2FA, setErr2FA] = useState('')

    useEffect(() => {
        async function carica() {
            try {
                const { data: { user } } = await supabase.auth.getUser()

                const { data: profilo } = await supabase
                    .from('profiles')
                    .select('nome, cognome, email, telefono, specializzazioni, studio, tipo_account, verification_status, piano_id, abbonamento_tipo, abbonamento_scadenza, posti_acquistati, include_banca_dati, include_monetizzazione, foro, numero_albo, pec, data_iscrizione_albo, mfa_attivo, mfa_attivato_at, role, partita_iva, cf, regime_fiscale, cassa_previdenza, indirizzo, numero_civico, cap, comune, provincia, paese, iban, codice_destinatario_sdi')
                    .eq('id', user.id)
                    .single()

                if (profilo) {
                    const d = {
                        nome: profilo.nome ?? '',
                        cognome: profilo.cognome ?? '',
                        telefono: profilo.telefono ?? '',
                        email: profilo.email ?? user.email ?? '',
                        specializzazioni: Array.isArray(profilo.specializzazioni)
                            ? profilo.specializzazioni.join(', ')
                            : (profilo.specializzazioni ?? ''),
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

                    const f = {
                        partita_iva: profilo.partita_iva ?? '',
                        cf: profilo.cf ?? '',
                        regime_fiscale: profilo.regime_fiscale ?? 'RF01',
                        cassa_previdenza: profilo.cassa_previdenza ?? cassaPredefinita(profilo.role),
                        indirizzo: profilo.indirizzo ?? '',
                        numero_civico: profilo.numero_civico ?? '',
                        cap: profilo.cap ?? '',
                        comune: profilo.comune ?? '',
                        provincia: profilo.provincia ?? '',
                        paese: profilo.paese ?? 'IT',
                        iban: profilo.iban ?? '',
                        codice_destinatario_sdi: profilo.codice_destinatario_sdi ?? '',
                    }
                    setFatt(f)
                    setFattOriginali(f)

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

                    // 2FA
                    setMfaAttivo(profilo.mfa_attivo ?? false)
                    setMfaAttivatoAt(profilo.mfa_attivato_at ?? null)

                    if (profilo.mfa_attivo) {
                        try {
                            const { data } = await supabase.functions.invoke('mfa-backup-codes', {
                                body: { action: 'status' }
                            })
                            if (data?.ok) setCodiciRestanti(data.restanti)
                        } catch (err) {
                            console.error('Status backup codes:', err)
                        }
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
                specializzazioni: dati.specializzazioni.trim()
                    ? dati.specializzazioni.split(',').map(s => s.trim()).filter(Boolean)
                    : null,
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

    async function handleSalvaFatt() {
        setErrFatt(''); setOkFatt(false)
        const v = Object.fromEntries(Object.entries(fatt).map(([k, x]) => [k, typeof x === 'string' ? x.trim() : x]))
        v.paese = (v.paese || 'IT').toUpperCase()
        v.provincia = v.provincia.toUpperCase()
        v.cf = v.cf.toUpperCase()
        v.codice_destinatario_sdi = v.codice_destinatario_sdi.toUpperCase()
        v.iban = v.iban.replace(/\s+/g, '').toUpperCase()
        if (!/^[A-Z]{2}$/.test(v.paese)) return setErrFatt('Paese: codice a due lettere (es. IT)')
        if (v.paese === 'IT') {
            if (v.partita_iva && !/^[0-9]{11}$/.test(v.partita_iva)) return setErrFatt('La partita IVA italiana ha 11 cifre')
            if (v.cap && !/^[0-9]{5}$/.test(v.cap)) return setErrFatt('Il CAP ha 5 cifre')
            if (v.provincia && !/^[A-Z]{2}$/.test(v.provincia)) return setErrFatt('Provincia: sigla di due lettere (es. MI)')
        }
        if (v.cf && !/^([A-Z0-9]{16}|[0-9]{11})$/.test(v.cf)) return setErrFatt('Codice fiscale non valido (16 caratteri, o 11 cifre)')
        if (v.iban && !ibanValido(v.iban)) return setErrFatt('IBAN non valido: controlla le cifre')
        if (v.codice_destinatario_sdi && !/^[A-Z0-9]{7}$/.test(v.codice_destinatario_sdi)) return setErrFatt('Il codice destinatario SDI ha 7 caratteri')
        setSalvandoFatt(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const payload = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x === '' ? null : x]))
            payload.regime_fiscale = v.regime_fiscale || 'RF01'
            const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
            if (error) throw new Error(error.message)
            setFatt(v); setFattOriginali(v); setEditingFatt(false); setOkFatt(true)
            setTimeout(() => setOkFatt(false), 3000)
        } catch (err) { setErrFatt(err.message) }
        finally { setSalvandoFatt(false) }
    }

    function handleAnnullaFatt() { setFatt(fattOriginali); setEditingFatt(false); setErrFatt('') }

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

    // ─── 2FA HANDLERS ──────────────────────────────────────────
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
                body: { action: 'regenerate' }
            })
            if (error) throw new Error(error.message)
            if (!data?.ok) throw new Error(data?.error ?? 'Errore')
            setCodiciDaMostrare(data.codici)
            setCodiciRestanti(data.codici.length)
        } catch (err) { setErr2FA(err.message) }
        finally { setRigenerando(false) }
    }

    async function handleDisattiva2FA() {
        if (!confirm('Disattivare il 2FA? Il tuo account sara meno sicuro.')) return
        setDisattivando(true); setErr2FA('')
        try {
            const { data: factors } = await supabase.auth.mfa.listFactors()
            for (const f of (factors?.totp ?? [])) {
                await supabase.auth.mfa.unenroll({ factorId: f.id })
            }
            // Pulisci backup codes
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('mfa_backup_codes').delete().eq('user_id', user.id)
            setMfaAttivo(false)
            setMfaAttivatoAt(null)
            setCodiciRestanti(null)
        } catch (err) { setErr2FA(err.message) }
        finally { setDisattivando(false) }
    }

    const isMembro = tipoAccount === 'membro' || tipoAccount === 'referente'
    const tipoLabel = { titolare: 'Titolare studio', referente: 'Referente studio', membro: 'Membro studio', singolo: 'Avvocato singolo' }[tipoAccount ?? ''] ?? '—'

    const scaduto = pianoDati?.scadenza && new Date(pianoDati.scadenza) < new Date()

    // Verifica completezza dati per generazione atti
    const campiAttiMancanti = []
    if (!atti.foro) campiAttiMancanti.push('Foro')
    if (!atti.numero_albo) campiAttiMancanti.push('Numero albo')
    if (!atti.pec) campiAttiMancanti.push('PEC')
    const profiloCompleto = campiAttiMancanti.length === 0

    // Completezza dei dati che servono in fattura
    const fattMancanti = []
    if (!fatt.partita_iva) fattMancanti.push('Partita IVA')
    if (!fatt.cf) fattMancanti.push('Codice fiscale')
    if (!fatt.indirizzo || !fatt.cap || !fatt.comune) fattMancanti.push('Indirizzo')
    if (!fatt.iban) fattMancanti.push('IBAN')
    const fattCompleto = fattMancanti.length === 0

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
                    <div key={l} className="flex flex-wrap justify-between gap-x-3 gap-y-1 border-b border-white/5 pb-2">
                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                        <span className={`font-body text-sm ${l === 'Verifica identità' && verificato ? 'text-salvia' : 'text-nebbia'}`}>{v}</span>
                    </div>
                ))}
                {isMembro && <p className="font-body text-xs text-nebbia/25 italic mt-1">Sei un membro dello studio. Per modificare il piano contatta il titolare.</p>}
                <Link to="/studio" className="font-body text-xs text-oro hover:text-oro/70 flex items-center gap-1 mt-1">Gestisci studio →</Link>
            </div>

            {/* DATI PERSONALI */}
            <div className="bg-slate border border-white/5 p-6 space-y-5">
                <div className="flex items-center justify-between gap-3">
                    <p className="section-label">Dati personali</p>
                    {!editingDati ? (
                        <button onClick={() => setEditingDati(true)} className="shrink-0 flex items-center justify-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors border border-white/10 hover:border-oro/30 px-3 py-1.5 min-h-[40px] lg:min-h-0">
                            <Edit2 size={12} /> Modifica
                        </button>
                    ) : (
                        <button onClick={handleAnnullaDati} className="shrink-0 flex items-center justify-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors border border-white/10 px-3 py-1.5 min-h-[40px] lg:min-h-0">
                            <X size={12} /> Annulla
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Campo label="Nome" value={dati.nome} editing={editingDati} onChange={v => setDati(d => ({ ...d, nome: v }))} />
                    <Campo label="Cognome" value={dati.cognome} editing={editingDati} onChange={v => setDati(d => ({ ...d, cognome: v }))} />
                </div>
                <Campo label="Studio / Nome studio" value={dati.studio} placeholder="Es. Studio Rossi & Associati"
                    editing={editingDati} onChange={v => setDati(d => ({ ...d, studio: v }))} />
                <Campo label="Telefono" value={dati.telefono} placeholder="+39 333 1234567"
                    editing={editingDati} onChange={v => setDati(d => ({ ...d, telefono: v }))} />
                <Campo label="Email" value={dati.email} disabled={true} editing={editingDati} onChange={() => { }} />
                <Campo label="Specializzazioni" value={dati.specializzazioni} placeholder="Diritto civile, Diritto commerciale (separate da virgola)"
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
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <Scale size={14} className="text-oro/60 shrink-0" />
                        <p className="section-label !m-0">Dati professionali per atti</p>
                        {profiloCompleto && (
                            <span className="font-body text-[10px] text-salvia border border-salvia/30 bg-salvia/5 px-2 py-0.5 uppercase tracking-wider">
                                Completo
                            </span>
                        )}
                    </div>
                    {!editingAtti ? (
                        <button onClick={() => setEditingAtti(true)} className="shrink-0 flex items-center justify-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors border border-white/10 hover:border-oro/30 px-3 py-1.5 min-h-[40px] lg:min-h-0">
                            <Edit2 size={12} /> {profiloCompleto ? 'Modifica' : 'Compila'}
                        </button>
                    ) : (
                        <button onClick={handleAnnullaAtti} className="shrink-0 flex items-center justify-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors border border-white/10 px-3 py-1.5 min-h-[40px] lg:min-h-0">
                            <X size={12} /> Annulla
                        </button>
                    )}
                </div>

                <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                    Questi dati vengono utilizzati per intestare correttamente gli atti legali generati dalle tue pratiche.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

            {/* DATI DI FATTURAZIONE (chi emette: il titolare; i membri usano quelli dello studio) */}
            {isMembro ? (
                <div className="bg-slate border border-white/5 p-5 flex items-start gap-3">
                    <Receipt size={14} className="text-oro/60 shrink-0 mt-0.5" />
                    <p className="font-body text-xs text-nebbia/45 leading-relaxed">
                        Le fatture dello studio le emette il titolare: in fattura compaiono i suoi dati di fatturazione.
                    </p>
                </div>
            ) : (
                <div className={`bg-slate border p-6 space-y-5 ${fattCompleto ? 'border-white/5' : 'border-amber-500/30'}`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <Receipt size={14} className="text-oro/60 shrink-0" />
                            <p className="section-label !m-0">Dati di fatturazione</p>
                            {fattCompleto && (
                                <span className="font-body text-[10px] text-salvia border border-salvia/30 bg-salvia/5 px-2 py-0.5 uppercase tracking-wider">
                                    Completo
                                </span>
                            )}
                        </div>
                        {!editingFatt ? (
                            <button onClick={() => setEditingFatt(true)} className="shrink-0 flex items-center justify-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors border border-white/10 hover:border-oro/30 px-3 py-1.5 min-h-[40px] lg:min-h-0">
                                <Edit2 size={12} /> {fattCompleto ? 'Modifica' : 'Compila'}
                            </button>
                        ) : (
                            <button onClick={handleAnnullaFatt} className="shrink-0 flex items-center justify-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors border border-white/10 px-3 py-1.5 min-h-[40px] lg:min-h-0">
                                <X size={12} /> Annulla
                            </button>
                        )}
                    </div>

                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                        Intestano le fatture ai tuoi clienti e decidono IVA, cassa e ritenuta.
                        {!fattCompleto && <> Mancano: <span className="text-amber-400/80">{fattMancanti.join(', ')}</span>.</>}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Campo label="Partita IVA" value={fatt.partita_iva} placeholder="12345678901"
                            editing={editingFatt} onChange={v => setFatt(f => ({ ...f, partita_iva: v }))} />
                        <Campo label="Codice fiscale" value={fatt.cf} placeholder="RSSMRA80A01F205X"
                            editing={editingFatt} onChange={v => setFatt(f => ({ ...f, cf: v }))} />
                        <CampoSelect label="Regime fiscale" value={fatt.regime_fiscale} opzioni={REGIMI}
                            editing={editingFatt} onChange={v => setFatt(f => ({ ...f, regime_fiscale: v }))} />
                        <CampoSelect label="Cassa di previdenza" value={fatt.cassa_previdenza} opzioni={CASSE}
                            editing={editingFatt} onChange={v => setFatt(f => ({ ...f, cassa_previdenza: v }))} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-5">
                        <Campo label="Indirizzo (via)" value={fatt.indirizzo} placeholder="Via Roma"
                            editing={editingFatt} onChange={v => setFatt(f => ({ ...f, indirizzo: v }))} />
                        <Campo label="Numero civico" value={fatt.numero_civico} placeholder="12"
                            editing={editingFatt} onChange={v => setFatt(f => ({ ...f, numero_civico: v }))} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_100px_100px] gap-5">
                        <Campo label="CAP" value={fatt.cap} placeholder="20121"
                            editing={editingFatt} onChange={v => setFatt(f => ({ ...f, cap: v }))} />
                        <Campo label="Comune" value={fatt.comune} placeholder="Milano"
                            editing={editingFatt} onChange={v => setFatt(f => ({ ...f, comune: v }))} />
                        <Campo label="Provincia" value={fatt.provincia} placeholder="MI"
                            editing={editingFatt} onChange={v => setFatt(f => ({ ...f, provincia: v }))} />
                        <Campo label="Paese" value={fatt.paese} placeholder="IT"
                            editing={editingFatt} onChange={v => setFatt(f => ({ ...f, paese: v }))} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-5">
                        <Campo label="IBAN per i pagamenti" value={fatt.iban} placeholder="IT60X0542811101000000123456"
                            editing={editingFatt} onChange={v => setFatt(f => ({ ...f, iban: v }))} />
                        <Campo label="Codice destinatario SDI" value={fatt.codice_destinatario_sdi} placeholder="Facoltativo"
                            editing={editingFatt} onChange={v => setFatt(f => ({ ...f, codice_destinatario_sdi: v }))} />
                    </div>

                    {errFatt && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errFatt}</div>}
                    {okFatt && <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20"><CheckCircle size={14} /> Dati di fatturazione aggiornati.</div>}
                    {editingFatt && (
                        <button onClick={handleSalvaFatt} disabled={salvandoFatt} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">
                            {salvandoFatt ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Check size={14} /> Salva dati di fatturazione</>}
                        </button>
                    )}
                </div>
            )}

            {/* ABBONAMENTO */}
            {pianoDati && (
                <div className="bg-slate border border-white/5 p-5">
                    <p className="section-label mb-3">{isMembro ? 'Piano studio' : 'Abbonamento'}</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0 p-4 bg-oro/8 border border-oro/20">
                        <div className="min-w-0">
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

            {/* GOOGLE CALENDAR */}
            <BoxGoogleCalendar />

            {/* PASSWORD */}
            <div className="bg-slate border border-white/5 p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <p className="section-label">Password</p>
                    {!editingPwd ? (
                        <button onClick={() => setEditingPwd(true)} className="shrink-0 flex items-center justify-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors border border-white/10 hover:border-oro/30 px-3 py-1.5 min-h-[40px] lg:min-h-0">
                            <Edit2 size={12} /> Cambia
                        </button>
                    ) : (
                        <button onClick={() => { setEditingPwd(false); setPwd({ nuova: '', conferma: '' }); setErrPwd('') }}
                            className="shrink-0 flex items-center justify-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors border border-white/10 px-3 py-1.5 min-h-[40px] lg:min-h-0">
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

            {/* SICUREZZA — 2FA */}
            <div className="bg-slate border border-white/5 p-6 space-y-5">
                <div className="flex items-center gap-2">
                    {mfaAttivo
                        ? <ShieldCheck size={14} className="text-salvia" />
                        : <Shield size={14} className="text-nebbia/40" />
                    }
                    <p className="section-label !m-0">Sicurezza</p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-start justify-between gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-nebbia mb-1">
                            Autenticazione a due fattori (2FA)
                        </p>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            {mfaAttivo
                                ? `Attiva dal ${new Date(mfaAttivatoAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}. Al login ti verra chiesto un codice dall'app autenticatore.`
                                : 'Proteggi il tuo account con un codice generato da app come Google Authenticator, Authy o 1Password.'
                            }
                        </p>
                    </div>
                    <span className={`font-body text-[10px] px-2 py-0.5 uppercase tracking-wider whitespace-nowrap ${mfaAttivo
                        ? 'text-salvia border border-salvia/30 bg-salvia/5'
                        : 'text-nebbia/40 border border-white/10 bg-white/5'
                        }`}>
                        {mfaAttivo ? 'Attivo' : 'Non attivo'}
                    </span>
                </div>

                {mfaAttivo && codiciRestanti !== null && (
                    <div className="bg-petrolio border border-white/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                        <div className="min-w-0">
                            <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-1">Codici di recupero</p>
                            <p className="font-body text-sm text-nebbia">{codiciRestanti} su 10 disponibili</p>
                            {codiciRestanti <= 3 && (
                                <p className="font-body text-xs text-amber-400 mt-1">
                                    Codici quasi esauriti — rigenerali per sicurezza.
                                </p>
                            )}
                        </div>
                        <button onClick={handleRigeneraCodici} disabled={rigenerando}
                            className="shrink-0 self-start sm:self-auto font-body text-xs text-oro hover:text-oro/70 border border-oro/30 hover:border-oro/60 px-3 py-1.5 min-h-[40px] lg:min-h-0 disabled:opacity-40">
                            {rigenerando ? 'Rigenero…' : 'Rigenera codici'}
                        </button>
                    </div>
                )}

                {err2FA && (
                    <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                        <AlertCircle size={14} /> {err2FA}
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
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
            </div>

            {/* MODALS 2FA */}
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