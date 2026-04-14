import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Upload, CheckCircle, Clock, XCircle, Shield, ArrowRight, Loader2 } from 'lucide-react'

// ── UPLOAD DOCUMENTI ──────────────────────────────────────────
export function UserVerifica() {
    const [docs, setDocs] = useState({ identita: null, albo: null, laurea: null })
    const [loading, setLoading] = useState(false)
    const [errore, setErrore] = useState('')
    const [inviato, setInviato] = useState(false)

    const allReq = docs.identita && docs.albo

    async function handleInvia() {
        if (!allReq || loading) return
        setLoading(true)
        setErrore('')

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Utente non autenticato')

            const uploads = [
                { file: docs.identita, path: `${user.id}/identita` },
                { file: docs.albo, path: `${user.id}/albo` },
                ...(docs.laurea ? [{ file: docs.laurea, path: `${user.id}/laurea` }] : []),
            ]

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
                <h1 className="font-display text-4xl font-light text-nebbia mb-2">Diventa avvocato su Lexum</h1>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                    Per accedere alla piattaforma come avvocato devi verificare la tua identità professionale.
                    Carica i documenti richiesti e il nostro team li esaminerà entro 24-48 ore.
                </p>
            </div>

            <div className="space-y-4">
                {[
                    { key: 'identita', label: "Documento di identità", hint: "Carta d'identità o passaporto valido", req: true },
                    { key: 'albo', label: "Iscrizione all'Albo", hint: "Certificato di iscrizione all'Albo degli Avvocati", req: true },
                    { key: 'laurea', label: "Laurea in Giurisprudenza", hint: "Opzionale — accelera la verifica", req: false },
                ].map(({ key, label, hint, req }) => (
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