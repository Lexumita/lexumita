import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Upload, CheckCircle, Clock, XCircle, Shield, ArrowRight, Loader2, Scale, Calculator } from 'lucide-react'

// ── Config per direzione professionale (avvocato | commercialista) ──
// Stesse chiavi documento (identita/albo/laurea) per entrambe: cambiano solo
// etichette e testi. Così l'admin (UtentiDettaglio) mostra i doc senza modifiche.
const PROFILI = {
    avvocato: {
        titolo: 'Diventa avvocato su Lexum',
        intro: "Per accedere alla piattaforma come avvocato devi verificare la tua identità professionale. Carica i documenti richiesti e il nostro team li esaminerà entro 24-48 ore.",
        documenti: [
            { key: 'identita', label: "Documento di identità", hint: "Carta d'identità o passaporto valido", req: true },
            { key: 'albo', label: "Iscrizione all'Albo", hint: "Certificato di iscrizione all'Albo degli Avvocati", req: true },
            { key: 'laurea', label: "Laurea in Giurisprudenza", hint: "Opzionale — accelera la verifica", req: false },
        ],
    },
    commercialista: {
        titolo: 'Diventa commercialista su Lexum',
        intro: "Per accedere alla piattaforma come commercialista devi verificare la tua identità professionale. Carica i documenti richiesti e il nostro team li esaminerà entro 24-48 ore.",
        documenti: [
            { key: 'identita', label: "Documento di identità", hint: "Carta d'identità o passaporto valido", req: true },
            { key: 'albo', label: "Iscrizione all'Albo (ODCEC)", hint: "Certificato di iscrizione all'Albo dei Dottori Commercialisti e degli Esperti Contabili", req: true },
            { key: 'laurea', label: "Laurea in Economia", hint: "Opzionale — accelera la verifica", req: false },
        ],
    },
}

// ── SCELTA DIREZIONE (se tipo_richiesta non ancora impostato) ──
function SceltaDirezione({ onScelta, loading }) {
    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <p className="section-label mb-3">Verifica identità</p>
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
    const { profile } = useAuth()

    // Direzione locale: parte da profiles.tipo_richiesta, si aggiorna al volo
    // dopo la scelta senza dover ricaricare il context.
    const [direzione, setDirezione] = useState(profile?.tipo_richiesta ?? null)
    const [docs, setDocs] = useState({})
    const [loading, setLoading] = useState(false)
    const [salvandoDirezione, setSalvandoDirezione] = useState(false)
    const [errore, setErrore] = useState('')
    const [inviato, setInviato] = useState(false)

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
        } finally {
            setDocs({})
            setDirezione(null)
        }
    }

    if (!direzione) {
        return (
            <div className="space-y-4">
                <SceltaDirezione onScelta={handleScelta} loading={salvandoDirezione} />
                {errore && (
                    <div className="bg-red-900/15 border border-red-500/20 px-4 py-3 max-w-2xl">
                        <p className="font-body text-sm text-red-400">{errore}</p>
                    </div>
                )}
            </div>
        )
    }

    const config = PROFILI[direzione] ?? PROFILI.avvocato
    const documentiObbligatori = config.documenti.filter(d => d.req).map(d => d.key)
    const allReq = documentiObbligatori.every(k => docs[k])

    async function handleInvia() {
        if (!allReq || loading) return
        setLoading(true)
        setErrore('')

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Utente non autenticato')

            const uploads = config.documenti
                .filter(d => docs[d.key])
                .map(d => ({ file: docs[d.key], path: `${user.id}/${d.key}` }))

            for (const { file, path } of uploads) {
                const ext = file.name.split('.').pop()
                const { error: upErr } = await supabase.storage
                    .from('verification-docs')
                    .upload(`${path}.${ext}`, file, { upsert: true })
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
                Il team Lexum esaminerà i tuoi documenti e riceverai una risposta entro 24-48 ore.
            </p>
            <Link to="/verifica/stato" className="btn-primary justify-center inline-flex">
                Controlla lo stato <ArrowRight size={14} />
            </Link>
        </div>
    )

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <p className="section-label mb-3">Verifica identità</p>
                <h1 className="font-display text-4xl font-light text-nebbia mb-2">{config.titolo}</h1>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">{config.intro}</p>
                <button
                    onClick={handleCambiaScelta}
                    className="font-body text-xs text-nebbia/30 hover:text-oro transition-colors mt-2"
                >
                    ‹ Non sei {direzione === 'avvocato' ? 'un avvocato' : 'un commercialista'}? Cambia scelta
                </button>
            </div>

            <div className="space-y-4">
                {config.documenti.map(({ key, label, hint, req }) => (
                    <div key={key} className={`bg-slate border p-5 ${docs[key] ? 'border-salvia/30' : 'border-white/5'}`}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="font-body text-sm font-medium text-nebbia">{label}</p>
                                    {req
                                        ? <span className="font-body text-[10px] text-red-400 border border-red-500/30 px-1.5 py-0.5">Obbligatorio</span>
                                        : <span className="font-body text-[10px] text-nebbia/30 border border-white/10 px-1.5 py-0.5">Opzionale</span>
                                    }
                                </div>
                                <p className="font-body text-xs text-nebbia/40">{hint}</p>
                                {docs[key] && (
                                    <p className="font-body text-xs text-salvia mt-1">
                                        ✓ {docs[key].name} ({(docs[key].size / 1024).toFixed(0)} KB)
                                    </p>
                                )}
                            </div>
                            <label className={`cursor-pointer ${docs[key] ? 'btn-secondary' : 'btn-primary'} text-xs px-3 py-2 flex items-center gap-1.5`}>
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

            {errore && (
                <div className="bg-red-900/15 border border-red-500/20 px-4 py-3">
                    <p className="font-body text-sm text-red-400">{errore}</p>
                </div>
            )}

            <div className="bg-slate/40 border border-salvia/15 p-4 flex items-start gap-3">
                <Shield size={16} className="text-salvia mt-0.5 shrink-0" />
                <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                    I documenti sono trattati con la massima riservatezza e utilizzati esclusivamente
                    per la verifica dell'identità professionale.
                </p>
            </div>

            <button
                disabled={!allReq || loading}
                onClick={handleInvia}
                className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Caricamento in corso…</>
                    : <><ArrowRight size={16} /> Invia per verifica</>
                }
            </button>
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
                    <Link to="/verifica" className="btn-primary justify-center inline-flex">Ricarica documenti</Link>
                </div>
            )}
        </div>
    )
}
