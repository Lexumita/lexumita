// src/pages/avvocato/clienti/Nuovo.jsx

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { PageHeader, BackButton, InputField, TextareaField } from '@/components/shared'
import { AlertCircle, CheckCircle, User, Building2, Eye, EyeOff, Lock, Users, ShoppingBag } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// SWITCHER PF / PG
// ─────────────────────────────────────────────────────────────
function SwitcherTipoSoggetto({ value, onChange, disabled = false }) {
    return (
        <div className="flex gap-1 bg-petrolio border border-white/10 p-1 w-fit">
            <button
                type="button"
                onClick={() => !disabled && onChange('persona_fisica')}
                disabled={disabled}
                className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${value === 'persona_fisica'
                    ? 'bg-oro/10 text-oro border border-oro/30'
                    : 'text-nebbia/40 hover:text-nebbia'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <User size={13} /> Persona fisica
            </button>
            <button
                type="button"
                onClick={() => !disabled && onChange('persona_giuridica')}
                disabled={disabled}
                className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${value === 'persona_giuridica'
                    ? 'bg-oro/10 text-oro border border-oro/30'
                    : 'text-nebbia/40 hover:text-nebbia'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Building2 size={13} /> Persona giuridica
            </button>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// BANNER CONTATORE CLIENTI
// Soglie: < 70% nessun banner · 70-89% ambra · 90-99% rosso chiaro · 100% rosso bloccante
// ─────────────────────────────────────────────────────────────
function BannerContatoreClienti({ clienti, limiteRaggiunto }) {
    // Se il piano non ha limite definito (es. avvocato senza piano valido o piano legacy), niente banner
    if (clienti.limite_totale <= 0 && !limiteRaggiunto) return null

    const pct = clienti.limite_totale > 0 ? clienti.conteggio / clienti.limite_totale : 1
    const slotRimanenti = Math.max(0, clienti.limite_totale - clienti.conteggio)

    // Se limite raggiunto via race-condition (errore 403), il backend ha confermato che siamo al 100%
    const bloccante = limiteRaggiunto || pct >= 1
    const critico = !bloccante && pct >= 0.9
    const soft = !bloccante && !critico && pct >= 0.7

    if (!bloccante && !critico && !soft) return null

    // ── BLOCCANTE (100%) ──
    if (bloccante) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 p-5 space-y-3">
                <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium text-red-400">
                            Limite clienti raggiunto ({clienti.conteggio}/{clienti.limite_totale})
                        </p>
                        <p className="font-body text-xs text-red-400/70 mt-1 leading-relaxed">
                            Hai raggiunto il numero massimo di clienti registrabili con il tuo piano. Acquista un add-on clienti per continuare a registrarne di nuovi.
                        </p>
                    </div>
                </div>
                <Link
                    to="/studio?tab=acquista"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/30 transition-colors"
                >
                    <ShoppingBag size={13} /> Acquista add-on clienti
                </Link>
            </div>
        )
    }

    // ── CRITICO (90-99%) ──
    if (critico) {
        return (
            <div className="bg-red-500/5 border border-red-500/20 p-4 flex items-start gap-3">
                <Users size={16} className="text-red-400/80 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-red-400/90">
                        Stai per esaurire gli slot clienti ({slotRimanenti} {slotRimanenti === 1 ? 'rimasto' : 'rimasti'})
                    </p>
                    <p className="font-body text-xs text-red-400/60 mt-1 leading-relaxed">
                        Hai usato {clienti.conteggio} dei {clienti.limite_totale} slot disponibili. Acquista un add-on per evitare blocchi.{' '}
                        <Link to="/studio?tab=acquista" className="underline hover:text-red-400">
                            Vai all'acquisto
                        </Link>
                    </p>
                </div>
            </div>
        )
    }

    // ── SOFT (70-89%) ──
    return (
        <div className="bg-amber-500/5 border border-amber-500/20 p-4 flex items-start gap-3">
            <Users size={16} className="text-amber-400/80 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="font-body text-sm text-amber-400/90">
                    Ti restano {slotRimanenti} {slotRimanenti === 1 ? 'slot cliente' : 'slot clienti'}
                </p>
                <p className="font-body text-xs text-amber-400/60 mt-1 leading-relaxed">
                    Hai usato {clienti.conteggio} dei {clienti.limite_totale} slot del tuo piano. Considera un add-on per non rischiare di bloccarti.{' '}
                    <Link to="/studio?tab=acquista" className="underline hover:text-amber-400">
                        Vedi opzioni
                    </Link>
                </p>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// NUOVO CLIENTE
// ─────────────────────────────────────────────────────────────
export default function AvvocatoClientiNuovo() {
    const navigate = useNavigate()
    const [tipo, setTipo] = useState('persona_fisica')
    const [form, setForm] = useState({
        // PF
        nome: '', cognome: '', cf: '',
        data_nascita: '', luogo_nascita: '',
        // PG
        ragione_sociale: '', partita_iva: '', sede_legale: '',
        rappr_nome: '', rappr_cognome: '', rappr_cf: '', rappr_carica: '',
        // Comuni
        email: '', telefono: '', pec: '',
        indirizzo: '', comune: '', provincia: '', cap: '',
        note: '',
        avvocato_id: '',
        // Portale
        attiva_portale: false,
        password_iniziale: '',
    })
    const [mostraPassword, setMostraPassword] = useState(false)
    const [collaboratori, setCollaboratori] = useState([])
    const [isStudio, setIsStudio] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errore, setErrore] = useState('')
    const [success, setSuccess] = useState(false)
    const [clienti, setClienti] = useState({ conteggio: 0, limite_piano: 0, limite_extra: 0, limite_totale: 0 })
    const [limiteRaggiunto, setLimiteRaggiunto] = useState(false)

    const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

    useEffect(() => {
        async function caricaContesto() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setForm(p => ({ ...p, avvocato_id: user.id }))
            const { data: profilo } = await supabase
                .from('profiles')
                .select('posti_acquistati, titolare_id')
                .eq('id', user.id).single()

            // Carica conteggio clienti (per banner soft/bloccante)
            const proprietarioId = profilo?.titolare_id ?? user.id
            const { data: contData } = await supabase
                .rpc('conteggio_clienti_studio', { p_proprietario_id: proprietarioId })
            const contRow = Array.isArray(contData) ? contData[0] : contData
            if (contRow) {
                setClienti({
                    conteggio: contRow.conteggio ?? 0,
                    limite_piano: contRow.limite_piano ?? 0,
                    limite_extra: contRow.limite_extra ?? 0,
                    limite_totale: contRow.limite_totale ?? 0,
                })
            }

            if ((profilo?.posti_acquistati ?? 1) <= 1) return
            setIsStudio(true)
            const { data: collabs } = await supabase
                .from('profiles')
                .select('id, nome, cognome')
                .eq('titolare_id', user.id)
            setCollaboratori(collabs ?? [])
        }
        caricaContesto()
    }, [])

    async function handleSubmit(e) {
        e.preventDefault(); setErrore('')

        if (tipo === 'persona_fisica') {
            if (!form.nome.trim()) return setErrore('Il nome e obbligatorio')
            if (!form.cognome.trim()) return setErrore('Il cognome e obbligatorio')
        } else {
            if (!form.ragione_sociale.trim()) return setErrore('La ragione sociale e obbligatoria')
        }
        if (!form.email.trim()) return setErrore("L'email e obbligatoria")
        if (!/\S+@\S+\.\S+/.test(form.email)) return setErrore('Email non valida')

        if (form.attiva_portale) {
            if (!form.password_iniziale) return setErrore('Inserisci la password iniziale per attivare il portale')
            if (form.password_iniziale.length < 8) return setErrore('La password deve essere di almeno 8 caratteri')
        }

        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()

            const payload = {
                tipo_soggetto: tipo,
                email: form.email,
                telefono: form.telefono,
                pec: form.pec,
                cf: form.cf,
                indirizzo: form.indirizzo,
                comune: form.comune,
                provincia: form.provincia,
                cap: form.cap,
                note: form.note,
                avvocato_id: form.avvocato_id || null,
                attiva_portale: form.attiva_portale,
                password_iniziale: form.attiva_portale ? form.password_iniziale : undefined,
            }

            if (tipo === 'persona_fisica') {
                payload.nome = form.nome
                payload.cognome = form.cognome
                payload.data_nascita = form.data_nascita || null
                payload.luogo_nascita = form.luogo_nascita
            } else {
                payload.ragione_sociale = form.ragione_sociale
                payload.partita_iva = form.partita_iva
                payload.sede_legale = form.sede_legale
                payload.rappr_nome = form.rappr_nome
                payload.rappr_cognome = form.rappr_cognome
                payload.rappr_cf = form.rappr_cf
                payload.rappr_carica = form.rappr_carica
            }

            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-cliente`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify(payload),
                }
            )
            const json = await res.json()

            if (!json.ok) {
                // Race condition: tra apertura form e submit qualcuno ha sforato il limite
                if (json.code === 'LIMITE_CLIENTI_RAGGIUNTO') {
                    if (json.meta) {
                        setClienti({
                            conteggio: json.meta.conteggio ?? 0,
                            limite_piano: json.meta.limite_piano ?? 0,
                            limite_extra: json.meta.limite_extra ?? 0,
                            limite_totale: json.meta.limite_totale ?? 0,
                        })
                    }
                    setLimiteRaggiunto(true)
                    setErrore('')  // niente errore inline: il banner sopra è già esplicito
                    return
                }
                throw new Error(json.error)
            }

            setSuccess(true)
            setTimeout(() => navigate('/clienti'), 1500)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) return (
        <div className="space-y-5 max-w-2xl">
            <BackButton to="/clienti" label="Tutti i clienti" />
            <div className="bg-slate border border-white/5 p-10 flex flex-col items-center text-center gap-4">
                <CheckCircle size={40} className="text-salvia" />
                <h2 className="font-display text-2xl text-nebbia">Cliente creato</h2>
                {form.attiva_portale ? (
                    <p className="font-body text-sm text-nebbia/50">
                        Portale attivato. Ricorda di comunicare al cliente le credenziali di accesso.
                    </p>
                ) : (
                    <p className="font-body text-sm text-nebbia/50">
                        Anagrafica salvata. L accesso al portale e disattivato.
                    </p>
                )}
            </div>
        </div>
    )

    return (
        <div className="space-y-5 max-w-2xl">
            <BackButton to="/clienti" label="Tutti i clienti" />
            <PageHeader label="Clienti" title="Nuovo cliente" />

            {/* ── Banner contatore clienti (soft / critico / bloccante) ── */}
            <BannerContatoreClienti clienti={clienti} limiteRaggiunto={limiteRaggiunto} />

            <form onSubmit={handleSubmit}>
                <div className="bg-slate border border-white/5 p-6 space-y-5">

                    {/* Tipo soggetto */}
                    <div>
                        <p className="section-label mb-3">Tipo di soggetto</p>
                        <SwitcherTipoSoggetto value={tipo} onChange={setTipo} />
                    </div>

                    {/* Dati anagrafici */}
                    {tipo === 'persona_fisica' ? (
                        <>
                            <p className="section-label">Dati anagrafici</p>
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Nome *" placeholder="Anna" {...f('nome')} />
                                <InputField label="Cognome *" placeholder="Rossi" {...f('cognome')} />
                            </div>
                            <InputField label="Codice fiscale" placeholder="RSSMRA80A01H501Z" {...f('cf')} />
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Data di nascita" type="date" {...f('data_nascita')} />
                                <InputField label="Luogo di nascita" placeholder="Milano" {...f('luogo_nascita')} />
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="section-label">Dati societa</p>
                            <InputField label="Ragione sociale *" placeholder="Alfa Srl" {...f('ragione_sociale')} />
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Partita IVA" placeholder="12345678901" {...f('partita_iva')} />
                                <InputField label="Codice fiscale" placeholder="se diverso da P.IVA" {...f('cf')} />
                            </div>
                            <InputField label="Sede legale" placeholder="Via Roma 1, Milano" {...f('sede_legale')} />

                            <div className="border-t border-white/8 pt-5 space-y-4">
                                <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase">
                                    Rappresentante legale{' '}
                                    <span className="text-nebbia/25 normal-case tracking-normal">— opzionale</span>
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Nome" placeholder="Mario" {...f('rappr_nome')} />
                                    <InputField label="Cognome" placeholder="Bianchi" {...f('rappr_cognome')} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Codice fiscale" placeholder="CF rappresentante" {...f('rappr_cf')} />
                                    <InputField label="Carica" placeholder="Es. Amministratore Unico" {...f('rappr_carica')} />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Contatti */}
                    <div className="border-t border-white/8 pt-5 space-y-4">
                        <p className="section-label">Contatti</p>
                        <InputField label="Email *" type="email" placeholder="email@esempio.it" {...f('email')} />
                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Telefono" placeholder="+39 333 000 1111" {...f('telefono')} />
                            <InputField label="PEC" placeholder="cliente@pec.it" {...f('pec')} />
                        </div>
                    </div>

                    {/* Indirizzo */}
                    <div className="border-t border-white/8 pt-5 space-y-4">
                        <p className="section-label">Indirizzo</p>
                        <InputField
                            label={tipo === 'persona_fisica' ? 'Indirizzo di residenza' : 'Sede operativa (se diversa dalla sede legale)'}
                            placeholder="Via, numero civico"
                            {...f('indirizzo')}
                        />
                        <div className="grid grid-cols-3 gap-4">
                            <InputField label="Comune" placeholder="Milano" {...f('comune')} />
                            <InputField label="Provincia" placeholder="MI" {...f('provincia')} />
                            <InputField label="CAP" placeholder="20100" {...f('cap')} />
                        </div>
                    </div>

                    {/* Avvocato assegnato */}
                    {isStudio && collaboratori.length > 0 && (
                        <div className="border-t border-white/8 pt-5">
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                Avvocato assegnato *
                            </label>
                            <select
                                value={form.avvocato_id}
                                onChange={e => setForm(p => ({ ...p, avvocato_id: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50"
                            >
                                <option value="">Tu</option>
                                {collaboratori.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Note */}
                    <div className="border-t border-white/8 pt-5">
                        <TextareaField
                            label="Note iniziali"
                            placeholder="Primo contatto, situazione generale..."
                            rows={3}
                            {...f('note')}
                        />
                    </div>

                    {/* Accesso portale */}
                    <div className="border-t border-white/8 pt-5 space-y-4">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={form.attiva_portale}
                                onChange={e => setForm(p => ({ ...p, attiva_portale: e.target.checked }))}
                                className="mt-1 w-4 h-4 accent-oro shrink-0"
                            />
                            <div className="flex-1">
                                <p className="font-body text-sm text-nebbia/85 group-hover:text-nebbia transition-colors">
                                    Attiva accesso al portale clienti
                                </p>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed mt-0.5">
                                    Il cliente potra accedere al suo portale con email e password. Potrai resettare la password in qualsiasi momento dalla scheda cliente.
                                </p>
                            </div>
                        </label>

                        {form.attiva_portale && (
                            <div className="pl-7 space-y-3">
                                <label className="block">
                                    <span className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                        Password iniziale *
                                    </span>
                                    <div className="relative">
                                        <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30 pointer-events-none" />
                                        <input
                                            type={mostraPassword ? 'text' : 'password'}
                                            value={form.password_iniziale}
                                            onChange={e => setForm(p => ({ ...p, password_iniziale: e.target.value }))}
                                            placeholder="Almeno 8 caratteri"
                                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-10 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setMostraPassword(v => !v)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-nebbia p-1"
                                        >
                                            {mostraPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </label>
                                <div className="flex items-start gap-2 px-3 py-2 bg-oro/5 border border-oro/15">
                                    <AlertCircle size={11} className="text-oro/70 mt-0.5 shrink-0" />
                                    <p className="font-body text-[11px] text-nebbia/55 leading-relaxed">
                                        La password non viene mai inviata via email da Lexum. Comunicala al cliente con il canale che preferisci (telefono, whatsapp, di persona).
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Errore + bottoni */}
                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => navigate('/clienti')}
                            className="btn-secondary text-sm flex-1"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={loading || limiteRaggiunto}
                            className="btn-primary text-sm flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                            title={limiteRaggiunto ? 'Limite clienti raggiunto - acquista un add-on per continuare' : undefined}
                        >
                            {loading
                                ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                                : limiteRaggiunto ? 'Limite raggiunto' : 'Crea cliente'
                            }
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}