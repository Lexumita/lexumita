import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PageHeader, InputField } from '@/components/shared'
import { Check, AlertCircle, Loader2, Unlock, ArrowRight, Receipt, FileText } from 'lucide-react'
import { elencoPaesi } from '@/lib/paesi'
import { profiloCompleto } from '@/lib/profiloCompleto'
import { formatImporto } from '@/lib/prezzi'
import { messaggioPassword, messaggioErroreAuthPassword, messaggioErroreDatabase, TESTO_REGOLA_PASSWORD } from '@/lib/password'

export default function UserProfilo() {
    const { profile, refreshProfile } = useAuth()
    const { hash } = useLocation()

    // da «Completa i dati» (Acquista, Completa il profilo) si arriva dritti alla sezione della fatturazione
    useEffect(() => {
        if (hash === '#fatturazione') document.getElementById('fatturazione')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [hash])

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
        // dati per la fattura (28-10-2026: tutti qui, in un posto solo; prima stavano solo in «Completa il profilo»)
        cf: profile?.cf ?? '',
        ragione_sociale: profile?.ragione_sociale ?? '',
        partita_iva: profile?.partita_iva ?? '',
        pec: profile?.pec ?? '',
        codice_destinatario_sdi: profile?.codice_destinatario_sdi ?? '',
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
                cf: profile.cf ?? '',
                ragione_sociale: profile.ragione_sociale ?? '',
                partita_iva: profile.partita_iva ?? '',
                pec: profile.pec ?? '',
                codice_destinatario_sdi: profile.codice_destinatario_sdi ?? '',
            }
            setForm(init)
            setDatiOriginali(init)
        }
    }, [profile])
    const [salvandoDati, setSalvandoDati] = useState(false)
    // la sezione in cui si è salvato o c'è l'errore: «personali» o «fatturazione»
    const [okDati, setOkDati] = useState('')
    const [errDati, setErrDati] = useState('')
    const [sezioneErrore, setSezioneErrore] = useState('')

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

    const CAMPI_PERSONALI = ['nome', 'cognome', 'telefono']
    const cambiati = Object.keys(form).filter(k => form[k] !== datiOriginali[k])
    const personaliCambiati = cambiati.some(k => CAMPI_PERSONALI.includes(k))
    const fatturazioneCambiata = cambiati.some(k => !CAMPI_PERSONALI.includes(k))
    const italia = form.paese === 'IT'


    async function handleSalvaDati(sezione) {
        setSalvandoDati(true)
        setErrDati('')
        setSezioneErrore(sezione)
        setOkDati('')
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
                    cf: form.cf.trim().toUpperCase() || null,
                    ragione_sociale: form.ragione_sociale.trim() || null,
                    partita_iva: form.partita_iva.trim().toUpperCase() || null,
                    pec: form.pec.trim() || null,
                    codice_destinatario_sdi: form.codice_destinatario_sdi.trim().toUpperCase() || null,
                })
                .eq('id', user.id)
            if (error) throw new Error(error.message)
            setDatiOriginali({ ...form })
            setOkDati(sezione)
            // il profilo in memoria si aggiorna: i pulsanti «Paga» vedono subito l'indirizzo
            refreshProfile?.()
            setTimeout(() => setOkDati(''), 3000)
        } catch (err) {
            setErrDati(messaggioErroreDatabase(err))
        } finally {
            setSalvandoDati(false)
        }
    }

    // «Annulla» riporta indietro solo la sezione in cui si preme
    function handleAnnullaDati(sezione) {
        const personali = sezione === 'personali'
        setForm(p => Object.fromEntries(Object.keys(p).map(k =>
            [k, CAMPI_PERSONALI.includes(k) === personali ? datiOriginali[k] : p[k]])))
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
        <div className="space-y-5">
            <PageHeader label="Account" title="Il mio profilo" />

            {/* Due colonne della stessa altezza (28-10-2026): a sinistra dati personali e pagamenti (lo storico
                prende lo spazio che avanza), a destra la fatturazione */}
            <div className="grid lg:grid-cols-2 gap-5">
                <div className="flex flex-col gap-5">
                    {/* Dati personali, con l'email dell'account (28-10-2026: un blocco solo; ruolo e verifica
                        d'identità non si mostrano più a un privato) */}
                    <div className="bg-slate border border-white/5 p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <p className="section-label">Dati personali</p>
                            {okDati === 'personali' && (
                                <span className="flex items-center gap-1 font-body text-xs text-salvia">
                                    <Check size={12} /> Salvato
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-3 border-b border-white/5 pb-4">
                            <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Email</span>
                            <span className="font-body text-sm text-nebbia break-words sm:text-right">{profile?.email ?? '—'}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label="Nome"    {...f('nome')} />
                            <InputField label="Cognome" {...f('cognome')} />
                        </div>
                        <InputField label="Telefono" placeholder="+39 02 1234567" {...f('telefono')} />

                        {errDati && sezioneErrore === 'personali' && (
                            <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
                                <p className="font-body text-sm text-red-400">{errDati}</p>
                            </div>
                        )}

                        {personaliCambiati && (
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button onClick={() => handleAnnullaDati('personali')} className="btn-secondary text-sm flex-1 justify-center">Annulla</button>
                                <button
                                    onClick={() => handleSalvaDati('personali')}
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

                    <StoricoPagamenti userId={profile?.id} />
                </div>

                {/* Dati per la fatturazione (28-10-2026): tutti qui, in un posto solo. Acquista e «Completa il profilo»
                    rimandano a questa sezione invece di ripetere i campi. */}
                <div id="fatturazione" className="bg-slate border border-white/5 p-6 space-y-5 scroll-mt-24">
                    <div className="flex items-center justify-between">
                        <p className="section-label">Dati per la fatturazione</p>
                        {okDati === 'fatturazione' && (
                            <span className="flex items-center gap-1 font-body text-xs text-salvia">
                                <Check size={12} /> Salvato
                            </span>
                        )}
                    </div>
                    <p className="font-body text-xs text-nebbia/40 -mt-2">Servono per acquistare crediti e piani e compaiono nella ricevuta.</p>

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
                    {italia ? (
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
                    {italia && <InputField label="Codice fiscale" placeholder="RSSMRA80A01H501U" {...f('cf')} />}

                    <div className="pt-2 space-y-4">
                        <div>
                            <p className="font-body text-sm text-nebbia">Per la fattura alla tua attività</p>
                            <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                Con questi dati, a ogni pagamento ti arriva via email anche la fattura intestata allo studio o alla società. Servono anche per i piani da professionista.
                            </p>
                        </div>
                        <InputField label="Ragione sociale" {...f('ragione_sociale')} />
                        <InputField label="Partita IVA" {...f('partita_iva')} />
                        {italia && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InputField label="PEC" placeholder="studio@pec.it" {...f('pec')} />
                                <InputField label="Codice destinatario SDI" maxLength={7} {...f('codice_destinatario_sdi')} />
                            </div>
                        )}
                    </div>

                    {errDati && sezioneErrore === 'fatturazione' && (
                        <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
                            <p className="font-body text-sm text-red-400">{errDati}</p>
                        </div>
                    )}

                    {fatturazioneCambiata && (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button onClick={() => handleAnnullaDati('fatturazione')} className="btn-secondary text-sm flex-1 justify-center">Annulla</button>
                            <button
                                onClick={() => handleSalvaDati('fatturazione')}
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

                    {!fatturazioneCambiata && profiloCompleto(profile) && (
                        <Link to="/area/acquista" className="flex items-center gap-3 bg-salvia/8 border border-salvia/25 px-4 py-3 group">
                            <Unlock size={15} className="text-salvia shrink-0" />
                            <p className="font-body text-xs text-salvia flex-1">Dati completi: i piani per lo studio sono sbloccati.</p>
                            <ArrowRight size={13} className="text-salvia group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    )}
                </div>
            </div>

            {/* In fondo, affiancate: password ed eliminazione dell'account */}
            <div className="grid lg:grid-cols-2 gap-5">
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

                <EliminaAccount />
            </div>
        </div>
    )
}

// Lo storico dei pagamenti (28-10-2026): crediti, piani e archivio, sul sito e su iPhone (App Store).
// Per ogni pagamento arriva anche la ricevuta via email; con i dati aziendali anche la fattura (30-10-2026),
// che si riscarica da qui: il numero sta nei metadati della transazione, il PDF nel bucket fatture-lexum.
function StoricoPagamenti({ userId }) {
    const [righe, setRighe] = useState(null)
    const [tutti, setTutti] = useState(false)
    const [scaricando, setScaricando] = useState(null)

    async function scaricaFattura(numero) {
        setScaricando(numero)
        try {
            const { data: f } = await supabase.from('fatture_lexum').select('pdf_path').eq('numero', numero).maybeSingle()
            const { data } = f?.pdf_path
                ? await supabase.storage.from('fatture-lexum').createSignedUrl(f.pdf_path, 60)
                : { data: null }
            if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
        } finally {
            setScaricando(null)
        }
    }

    useEffect(() => {
        if (!userId) return
        supabase
            .from('transazioni')
            .select('id, prodotto_nome, importo, stato, created_at, metadati')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50)
            .then(({ data }) => setRighe(data ?? []))
    }, [userId])

    return (
        <div className="flex-1 flex flex-col gap-4 bg-slate border border-white/5 p-6">
            <div className="flex items-center justify-between">
                <p className="section-label">Storico pagamenti</p>
            </div>
            {righe === null ? (
                <Loader2 size={16} className="animate-spin text-nebbia/30" />
            ) : righe.length === 0 ? (
                <p className="font-body text-sm text-nebbia/40">Nessun pagamento finora.</p>
            ) : (
                <ul className="divide-y divide-white/5">
                    {(tutti ? righe : righe.slice(0, 5)).map(r => {
                        // gli acquisti su iPhone possono essere in un'altra valuta (quella dell'App Store)
                        const valuta = r.metadati?.valuta
                        const importo = valuta && valuta !== 'EUR'
                            ? `${Number(r.importo).toFixed(2)} ${valuta}`
                            : formatImporto(r.importo)
                        return (
                            <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                                <div className="min-w-0">
                                    <p className="font-body text-sm text-nebbia truncate">{r.prodotto_nome}</p>
                                    <p className="font-body text-xs text-nebbia/40">
                                        {new Date(r.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-body text-sm text-nebbia">{importo}</p>
                                    {r.stato === 'rimborsato' && <p className="font-body text-xs text-amber-400">Rimborsato</p>}
                                    {r.metadati?.fattura && (
                                        <button
                                            onClick={() => scaricaFattura(r.metadati.fattura)}
                                            disabled={scaricando === r.metadati.fattura}
                                            className="inline-flex items-center gap-1 font-body text-xs text-oro hover:text-oro/70 transition-colors disabled:opacity-40"
                                        >
                                            <FileText size={11} /> Fattura
                                        </button>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
            {righe?.length > 5 && (
                <button onClick={() => setTutti(t => !t)} className="self-start font-body text-xs text-oro hover:text-oro/70 transition-colors">
                    {tutti ? 'Mostra solo gli ultimi' : `Mostra tutti (${righe.length})`}
                </button>
            )}
            <p className="mt-auto flex items-start gap-2 font-body text-xs text-nebbia/40 leading-relaxed">
                <Receipt size={13} className="shrink-0 mt-0.5" />
                Per ogni pagamento ti arriva la ricevuta via email. Con ragione sociale e partita IVA nei dati per la fatturazione ti arriva anche la fattura.
            </p>
        </div>
    )
}

// Elimina account (28-10-2026, come nell'app): la funzione elimina-account cancella crediti, abbonamento,
// ricerche, etichette e archivio di questo paese e poi l'utente; i pagamenti restano, per la contabilità.
// Un abbonamento che si rinnova sul sito va disdetto prima: altrimenti Tagadapay continuerebbe ad addebitarlo.
// Quello preso su iPhone lo ferma solo Apple, dalle impostazioni dell'iPhone.
function EliminaAccount() {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const [aperta, setAperta] = useState(false)
    const [rinnovi, setRinnovi] = useState({ sito: false, iphone: false })
    const [eliminando, setEliminando] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => {
        if (!aperta || !profile?.id) return
        supabase
            .from('abbonamenti')
            .select('fornitore')
            .eq('user_id', profile.id)
            .in('stato', ['attivo', 'in_ritardo'])
            .then(({ data }) => setRinnovi({
                sito: (data ?? []).some(a => a.fornitore === 'tagada'),
                iphone: (data ?? []).some(a => a.fornitore === 'apple'),
            }))
    }, [aperta, profile?.id])

    async function elimina() {
        setEliminando(true)
        setErrore('')
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elimina-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: '{}',
            })
            const esito = await res.json().catch(() => ({}))
            if (res.ok && esito.ok) {
                await signOut()
                navigate('/', { replace: true })
                return
            }
            if (esito.codice === 'serve_aal2') setErrore('Hai la verifica in due passaggi: esci, rientra con il codice e riprova.')
            else if (res.status === 409) setErrore('Questo account non si elimina da qui: scrivici dall’assistenza e lo chiudiamo noi.')
            else setErrore('Eliminazione non riuscita: riprova.')
        } catch {
            setErrore('Eliminazione non riuscita: riprova.')
        } finally {
            setEliminando(false)
        }
    }

    return (
        <div className="bg-slate border border-white/5 p-6 space-y-4">
            <div className="flex items-center justify-between">
                <p className="section-label">Elimina account</p>
            </div>
            {!aperta ? (
                <>
                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                        Elimini crediti, abbonamento, ricerche, etichette e archivio di Lexum. È definitivo.
                    </p>
                    <button onClick={() => setAperta(true)} className="font-body text-sm text-red-400 hover:text-red-300 transition-colors">
                        Elimina account…
                    </button>
                </>
            ) : (
                <>
                    <p className="font-body text-sm text-nebbia/80 leading-relaxed">
                        Eliminare il tuo account? Elimini crediti, abbonamento, ricerche, etichette e archivio di Lexum. È definitivo.
                    </p>
                    <p className="font-body text-xs text-nebbia/40">Prima, se vuoi, scarica i documenti dal tuo archivio.</p>
                    {rinnovi.sito && (
                        <div className="flex items-start gap-2 bg-amber-900/10 border border-amber-500/30 px-4 py-3">
                            <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                            <p className="font-body text-xs text-nebbia/80 leading-relaxed">
                                Hai un abbonamento che si rinnova: prima disdicilo da{' '}
                                <Link to="/area/acquista" className="text-oro hover:text-oro/70">Acquista → Gestisci</Link>, poi elimina l’account.
                            </p>
                        </div>
                    )}
                    {rinnovi.iphone && (
                        <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                            L’abbonamento preso su iPhone si disdice dalle impostazioni dell’iPhone, alla voce Abbonamenti:
                            eliminare l’account non lo ferma.
                        </p>
                    )}
                    {errore && (
                        <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
                            <p className="font-body text-sm text-red-400">{errore}</p>
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => { setAperta(false); setErrore('') }} className="btn-secondary text-sm flex-1 justify-center">
                            Annulla
                        </button>
                        <button
                            onClick={elimina}
                            disabled={eliminando || rinnovi.sito}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-900/30 border border-red-500/40 text-red-300 font-body text-sm hover:bg-red-900/50 transition-colors disabled:opacity-40"
                        >
                            {eliminando ? <Loader2 size={14} className="animate-spin" /> : 'Elimina l’account'}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
