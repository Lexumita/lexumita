import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Upload, CheckCircle, Clock, XCircle, Shield, ArrowRight, Loader2, Scale, Calculator, Lock, Unlock, Sparkles } from 'lucide-react'
import { CAMPI_FATTURAZIONE, CAMPI_RECAPITO_SDI, campiMancanti, percentualeProfilo, profiloCompleto } from '@/lib/profiloCompleto'

// ── Config per direzione professionale (avvocato | commercialista) ──
// Stesse chiavi documento (identita/albo/laurea) per entrambe: cambiano solo
// etichette e testi. Così l'admin (UtentiDettaglio) mostra i doc senza modifiche.
const PROFILI = {
    avvocato: {
        titolo: 'Completa il tuo profilo — Avvocato',
        intro: "Compila i dati di fatturazione per sbloccare tutta la piattaforma: bastano quelli, senza attese e senza approvazioni.",
        badge: 'Avvocato verificato',
        documenti: [
            { key: 'identita', label: "Documento di identità", hint: "Carta d'identità o passaporto valido", req: false },
            { key: 'albo', label: "Iscrizione all'Albo", hint: "Certificato di iscrizione all'Albo degli Avvocati", req: false },
            { key: 'laurea', label: "Laurea in Giurisprudenza", hint: "Se vuoi, completa il tuo profilo pubblico", req: false },
        ],
    },
    commercialista: {
        titolo: 'Completa il tuo profilo — Commercialista',
        intro: "Compila i dati di fatturazione per sbloccare tutta la piattaforma: bastano quelli, senza attese e senza approvazioni.",
        badge: 'Commercialista verificato',
        documenti: [
            { key: 'identita', label: "Documento di identità", hint: "Carta d'identità o passaporto valido", req: false },
            { key: 'albo', label: "Iscrizione all'Albo (ODCEC)", hint: "Certificato di iscrizione all'Albo dei Dottori Commercialisti e degli Esperti Contabili", req: false },
            { key: 'laurea', label: "Laurea in Economia", hint: "Se vuoi, completa il tuo profilo pubblico", req: false },
        ],
    },
}

// ── SCELTA DIREZIONE (se tipo_richiesta non ancora impostato) ──
function SceltaDirezione({ onScelta, loading }) {
    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <p className="section-label mb-3">Completa il profilo</p>
                <h1 className="font-display text-4xl font-light text-nebbia mb-2">Che professionista sei?</h1>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                    Scegli il tuo profilo professionale: la piattaforma si adatta al tuo modo di lavorare.
                </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <button
                    disabled={loading}
                    onClick={() => onScelta('avvocato')}
                    className="bg-slate border border-white/5 hover:border-oro/40 p-6 text-left transition-colors group disabled:opacity-40"
                >
                    <Scale size={28} className="text-oro mb-4" />
                    <p className="font-display text-xl text-nebbia mb-2">Avvocato</p>
                    <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                        Pratiche, udienze, termini processuali, banca dati giuridica e generazione di atti con Lex AI.
                    </p>
                </button>

                <button
                    disabled={loading}
                    onClick={() => onScelta('commercialista')}
                    className="bg-slate border border-white/5 hover:border-oro/40 p-6 text-left transition-colors group disabled:opacity-40"
                >
                    <Calculator size={28} className="text-oro mb-4" />
                    <p className="font-display text-xl text-nebbia mb-2">Commercialista</p>
                    <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                        Mandati, scadenzario fiscale, contabilità clienti, banca dati tributaria e Lex AI per lo studio.
                    </p>
                </button>
            </div>
        </div>
    )
}

// ── UPLOAD DOCUMENTI ──────────────────────────────────────────
export function UserVerifica() {
    const { profile, refreshProfile } = useAuth()

    const [direzione, setDirezione] = useState(profile?.tipo_richiesta ?? null)
    const [docs, setDocs] = useState({})
    const [loading, setLoading] = useState(false)
    const [salvandoDirezione, setSalvandoDirezione] = useState(false)
    const [errore, setErrore] = useState('')
    const [inviato, setInviato] = useState(false)

    // ── Dati di fatturazione: sono LORO a sbloccare la piattaforma ──
    const campiTutti = [...CAMPI_FATTURAZIONE, ...CAMPI_RECAPITO_SDI]
    const [dati, setDati] = useState(() =>
        Object.fromEntries(campiTutti.map(c => [c.key, profile?.[c.key] ?? ''])))
    const [salvandoDati, setSalvandoDati] = useState(false)
    const [okDati, setOkDati] = useState(false)

    useEffect(() => {
        if (profile) setDati(Object.fromEntries(campiTutti.map(c => [c.key, profile[c.key] ?? ''])))
    }, [profile])

    // Anteprima dal vivo: l'utente vede la barra salire mentre digita, senza
    // dover salvare per scoprire se ha finito.
    const profileAnteprima = { ...(profile ?? {}), ...dati }
    const mancanti = campiMancanti(profileAnteprima)
    const completo = mancanti.length === 0
    const percentuale = percentualeProfilo(profileAnteprima)
    const giaSalvatoCompleto = profiloCompleto(profile)

    async function handleScelta(scelta) {
        setSalvandoDirezione(true)
        setErrore('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase
                .from('profiles')
                .update({ tipo_richiesta: scelta })
                .eq('id', user.id)
            if (error) throw new Error(error.message)
            setDirezione(scelta)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setSalvandoDirezione(false)
        }
    }

    async function handleCambiaScelta() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('profiles').update({ tipo_richiesta: null }).eq('id', user.id)
        } catch { /* non bloccante */ }
        setDirezione(null)
    }

    async function handleSalvaDati() {
        if (salvandoDati) return
        setSalvandoDati(true)
        setErrore('')
        setOkDati(false)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Utente non autenticato')
            const payload = Object.fromEntries(
                campiTutti.map(c => [c.key, (dati[c.key] ?? '').trim() || null]))
            const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
            if (error) throw new Error(error.message)
            // il profilo in memoria deve rispecchiare il salvataggio, altrimenti
            // la pagina Acquista continuerebbe a vedere il vecchio stato
            if (typeof refreshProfile === 'function') await refreshProfile()
            setOkDati(true)
            setTimeout(() => setOkDati(false), 4000)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setSalvandoDati(false)
        }
    }

    if (!direzione) return <SceltaDirezione onScelta={handleScelta} loading={salvandoDirezione} />

    const config = PROFILI[direzione] ?? PROFILI.avvocato

    async function handleInvia() {
        const daCaricare = config.documenti.filter(d => docs[d.key])
        if (!daCaricare.length || loading) return
        setLoading(true)
        setErrore('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Utente non autenticato')

            for (const d of daCaricare) {
                const file = docs[d.key]
                const ext = file.name.split('.').pop()
                const { error: upErr } = await supabase.storage
                    .from('verification-docs')
                    .upload(`${user.id}/${d.key}.${ext}`, file, { upsert: true })
                if (upErr) throw new Error(`Errore upload: ${upErr.message}`)
            }

            const { error: updateErr } = await supabase
                .from('profiles')
                .update({ verification_status: 'pending' })
                .eq('id', user.id)
            if (updateErr) throw new Error(updateErr.message)

            setInviato(true)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (inviato) return (
        <div className="text-center py-12">
            <CheckCircle size={48} className="text-salvia mx-auto mb-4" />
            <h2 className="font-display text-4xl font-light text-nebbia mb-3">Documenti inviati</h2>
            <p className="font-body text-sm text-nebbia/50 mb-6 leading-relaxed max-w-sm mx-auto">
                Li esamineremo entro 24-48 ore per assegnarti il distintivo di professionista verificato.
                Nel frattempo puoi continuare a usare Lexum senza limitazioni.
            </p>
            <Link to="/area/acquista" className="btn-primary justify-center inline-flex w-full sm:w-auto">
                Vedi i piani <ArrowRight size={14} />
            </Link>
        </div>
    )

    const campo = (c) => (
        <div key={c.key}>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{c.label}</label>
            <input
                type="text"
                value={dati[c.key] ?? ''}
                onChange={e => setDati(d => ({ ...d, [c.key]: e.target.value }))}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25"
            />
        </div>
    )

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <p className="section-label mb-3">Completa il profilo</p>
                <h1 className="font-display text-4xl font-light text-nebbia mb-2">{config.titolo}</h1>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">{config.intro}</p>
                <button
                    onClick={handleCambiaScelta}
                    className="font-body text-xs text-nebbia/30 hover:text-oro transition-colors mt-2"
                >
                    ‹ Non sei {direzione === 'avvocato' ? 'un avvocato' : 'un commercialista'}? Cambia scelta
                </button>
            </div>

            {/* Cosa hai ora, cosa si apre — il punto della pagina */}
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Unlock size={15} className="text-salvia" />
                        <p className="font-body text-sm font-medium text-nebbia">Quello che stai già usando</p>
                    </div>
                    <ul className="space-y-1.5 font-body text-xs text-nebbia/50 leading-relaxed">
                        <li>· Banca dati: 4 milioni di documenti giuridici</li>
                        <li>· Lex AI: ricerca ragionata sulle fonti</li>
                        <li>· Ricerche salvate ed etichette</li>
                    </ul>
                </div>
                <div className="bg-slate border border-oro/25 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={15} className="text-oro" />
                        <p className="font-body text-sm font-medium text-oro">Quello che si apre</p>
                    </div>
                    <ul className="space-y-1.5 font-body text-xs text-nebbia/60 leading-relaxed">
                        <li>· Pratiche, udienze, scadenze e controparti</li>
                        <li>· Clienti e portale dedicato</li>
                        <li>· Generazione di atti e chat sulla pratica</li>
                        <li>· Fatture con compenso forense (DM 55/2014)</li>
                        <li>· Archivio dello studio con ricerca semantica</li>
                    </ul>
                </div>
            </div>

            {/* Avanzamento */}
            <div className="bg-slate border border-white/5 p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="font-body text-sm font-medium text-nebbia">
                        {completo ? 'Profilo completo' : 'Profilo completo al'} {!completo && <span className="text-oro">{percentuale}%</span>}
                    </p>
                    {completo
                        ? <span className="font-body text-xs text-salvia flex items-center gap-1"><CheckCircle size={12} /> tutto pronto</span>
                        : <span className="font-body text-xs text-nebbia/40">mancano {mancanti.length}</span>}
                </div>
                <div className="h-1 w-full bg-petrolio overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${completo ? 'bg-salvia' : 'bg-oro'}`} style={{ width: `${percentuale}%` }} />
                </div>
                {!completo && (
                    <p className="font-body text-xs text-nebbia/40 mt-3 leading-relaxed">
                        Da compilare: {mancanti.join(' · ')}
                    </p>
                )}
            </div>

            {/* Dati di fatturazione — il requisito vero */}
            <div className="bg-slate border border-white/5 p-6 space-y-4">
                <div>
                    <p className="font-body text-sm font-medium text-nebbia mb-1">Dati per la fatturazione</p>
                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                        Sono gli stessi che servono per emettere la fattura elettronica. Compilandoli sblocchi
                        subito l'acquisto: nessuna attesa e nessuna approvazione da parte nostra.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    {CAMPI_FATTURAZIONE.map(campo)}
                </div>

                <div>
                    <p className="font-body text-xs text-nebbia/40 mb-3 leading-relaxed">
                        Per ricevere la fattura elettronica basta uno dei due:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {CAMPI_RECAPITO_SDI.map(campo)}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <button
                        onClick={handleSalvaDati}
                        disabled={salvandoDati}
                        className="btn-primary justify-center w-full sm:w-auto disabled:opacity-40"
                    >
                        {salvandoDati
                            ? <><Loader2 size={16} className="animate-spin" /> Salvataggio…</>
                            : <><CheckCircle size={16} /> Salva i dati</>}
                    </button>
                    {okDati && <span className="font-body text-xs text-salvia flex items-center gap-1"><CheckCircle size={12} /> Salvato</span>}
                </div>

                {giaSalvatoCompleto && (
                    <Link to="/area/acquista" className="flex items-center gap-3 bg-salvia/8 border border-salvia/25 px-4 py-3 group">
                        <Unlock size={15} className="text-salvia shrink-0" />
                        <p className="font-body text-xs text-salvia flex-1">
                            Il tuo profilo è completo: i piani sono sbloccati.
                        </p>
                        <ArrowRight size={13} className="text-salvia group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                )}
            </div>

            {/* Documenti — ora facoltativi */}
            <div className="bg-slate/40 border border-white/5 p-6 space-y-4">
                <div className="flex items-start gap-3">
                    <Shield size={16} className="text-nebbia/40 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-body text-sm font-medium text-nebbia mb-1">
                            Documenti professionali
                            <span className="ml-2 font-body text-[10px] text-nebbia/30 border border-white/10 px-1.5 py-0.5 uppercase tracking-wider">Facoltativo</span>
                        </p>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            Non servono per acquistare né per usare la piattaforma. Caricandoli ottieni il
                            distintivo <span className="text-nebbia/70">«{config.badge}»</span>, che i tuoi
                            clienti vedono nel portale.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {config.documenti.map(({ key, label, hint }) => (
                        <div key={key} className={`border p-4 ${docs[key] ? 'border-salvia/30' : 'border-white/5'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-body text-sm text-nebbia mb-0.5">{label}</p>
                                    <p className="font-body text-xs text-nebbia/40">{hint}</p>
                                    {docs[key] && (
                                        <p className="font-body text-xs text-salvia mt-1 break-words">
                                            ✓ {docs[key].name} ({(docs[key].size / 1024).toFixed(0)} KB)
                                        </p>
                                    )}
                                </div>
                                <label className={`cursor-pointer ${docs[key] ? 'btn-secondary' : 'btn-secondary'} text-xs px-3 py-3 sm:py-2 w-full sm:w-auto justify-center flex items-center gap-1.5`}>
                                    <Upload size={12} /> {docs[key] ? 'Cambia' : 'Carica'}
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                        onChange={e => {
                                            const f = e.target.files?.[0]
                                            if (!f) return
                                            if (f.size > 10 * 1024 * 1024) { setErrore('File troppo grande. Massimo 10 MB.'); return }
                                            setErrore('')
                                            setDocs(d => ({ ...d, [key]: f }))
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    disabled={!Object.keys(docs).length || loading}
                    onClick={handleInvia}
                    className="btn-secondary w-full justify-center disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                >
                    {loading
                        ? <><Loader2 size={16} className="animate-spin" /> Caricamento in corso…</>
                        : <><ArrowRight size={16} /> Invia per il distintivo</>}
                </button>
            </div>

            {errore && (
                <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
                    <p className="font-body text-sm text-red-400">{errore}</p>
                </div>
            )}
        </div>
    )
}

// ── STATO VERIFICA ────────────────────────────────────────────
export function UserVerificaStato() {
    const { profile } = useAuth()
    const stato = profile?.verification_status ?? 'pending'

    const CONFIG = {
        pending: { icon: Clock, color: 'text-amber-400', title: 'Verifica in corso', desc: 'Il team Lexum sta esaminando i tuoi documenti. Riceverai una notifica email entro 24-48 ore.' },
        approved: { icon: CheckCircle, color: 'text-salvia', title: 'Verifica approvata!', desc: 'Ottimo! Ora puoi scegliere il piano di abbonamento oppure accedere direttamente alla banca dati.' },
        rejected: { icon: XCircle, color: 'text-red-400', title: 'Verifica non approvata', desc: 'Non è stato possibile verificare la tua identità con i documenti forniti.' },
    }

    const { icon: Icon, color, title, desc } = CONFIG[stato] ?? CONFIG.pending

    return (
        <div className="text-center py-10 space-y-6 max-w-lg mx-auto">
            <Icon size={56} className={`mx-auto ${color}`} />
            <div>
                <h1 className="font-display text-4xl font-light text-nebbia mb-3">{title}</h1>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">{desc}</p>
            </div>

            {stato === 'approved' && (
                <div className="space-y-3">
                    <Link to="/abbonamenti" className="btn-primary justify-center inline-flex w-full">
                        Scegli un piano <ArrowRight size={16} />
                    </Link>
                    <Link to="/banca-dati" className="btn-secondary justify-center inline-flex w-full">
                        Accedi alla banca dati
                    </Link>
                </div>
            )}
            {stato === 'rejected' && (
                <div className="space-y-3">
                    <div className="bg-red-900/10 border border-red-500/20 p-4 text-left">
                        <p className="font-body text-xs text-red-400 mb-1">Motivazione</p>
                        <p className="font-body text-sm text-nebbia/60">
                            {profile?.note_iniziali || 'Documenti non leggibili o incompleti. Ricarica i file in alta qualità.'}
                        </p>
                    </div>
                    <Link to="/verifica" className="btn-primary justify-center inline-flex w-full sm:w-auto">Ricarica documenti</Link>
                </div>
            )}
        </div>
    )
}
