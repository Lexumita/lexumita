// src/pages/avvocato/Studio.jsx
// Usata sia da avvocato (/studio) che da user (/studio)
// La logica cambia in base a profile.role

import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Badge, StatCard } from '@/components/shared'
import {
    UserPlus, Trash2, AlertTriangle, CheckCircle,
    Send, CreditCard, Edit2, Check, X, AlertCircle, ChevronRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function giorniAllaScadenza(dataStr) {
    if (!dataStr) return null
    return Math.ceil((new Date(dataStr) - new Date()) / (1000 * 60 * 60 * 24))
}

async function chiamaStripe(prodottoId, isUpgrade = false) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({
                prodotto_id: prodottoId,
                is_upgrade: isUpgrade,
                success_url: `${window.location.origin}/studio?success=1`,
                cancel_url: `${window.location.origin}/studio`,
            }),
        }
    )
    const json = await res.json()
    if (!json.ok) throw new Error(json.error)
    window.location.href = json.url
}

// ─────────────────────────────────────────────────────────────
// SEZIONE ACQUISTO — esportata, riusabile
// ─────────────────────────────────────────────────────────────
export function SezioneAcquisto({ pianoAttualeId = null, prezzoAttuale = 0, scadenzaAttuale = null, postiAttuali = 0 }) {
    const [piani, setPiani] = useState([])
    const [addons, setAddons] = useState([])
    const [loading, setLoading] = useState(true)
    const [acquistando, setAcquistando] = useState(false)
    const [errore, setErrore] = useState('')
    const [pianoProposto, setPianoProposto] = useState(null)
    const [trialProdotto, setTrialProdotto] = useState(null)
    const [attivandoTrial, setAttivandoTrial] = useState(false)
    const [trialAttivato, setTrialAttivato] = useState(false)

    useEffect(() => {
        async function carica() {
            const { data: { user } } = await supabase.auth.getUser()

            const { data: prof } = await supabase
                .from('profiles')
                .select('prova_gratuita_usata')
                .eq('id', user.id)
                .single()

            const { data } = await supabase
                .from('prodotti')
                .select('id, nome, tipo, prezzo, posti, durata_mesi, include_banca_dati, include_monetizzazione, crediti_ai_mensili')
                .eq('attivo', true)
                .in('tipo', ['abbonamento', 'seat_addon', 'gratuito'])
                .order('prezzo')

            const tutti = data ?? []
            setPiani(tutti.filter(p => p.tipo === 'abbonamento' && p.id !== pianoAttualeId))
            setAddons(pianoAttualeId ? tutti.filter(p => p.tipo === 'seat_addon') : [])

            // Mostra trial solo se non già usata e nessun piano attivo
            if (!prof?.prova_gratuita_usata && !pianoAttualeId) {
                setTrialProdotto(tutti.find(p => p.tipo === 'gratuito') ?? null)
            }

            setLoading(false)
        }
        carica()
    }, [pianoAttualeId])

    async function attivaTrial() {
        setAttivandoTrial(true)
        setErrore('')
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-trial`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({ prodotto_id: trialProdotto.id }),
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)
            setTrialAttivato(true)
            setTrialProdotto(null)
            setTimeout(() => window.location.reload(), 1500)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setAttivandoTrial(false)
        }
    }

    async function acquista(prodottoId, isUpgrade) {
        setAcquistando(true)
        setErrore('')
        try {
            await chiamaStripe(prodottoId, isUpgrade)
        } catch (err) {
            setErrore(err.message)
            setAcquistando(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-10">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    return (
        <div className="space-y-6">
            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}

            {/* Trial gratuito */}
            {trialProdotto && !trialAttivato && (
                <div className="space-y-3">
                    <p className="section-label">Prova gratuita</p>
                    <div className="bg-slate border border-salvia/25 p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-salvia/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl pointer-events-none" />
                        <div className="relative flex items-start justify-between gap-4 flex-wrap">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <p className="font-body text-sm font-medium text-nebbia">{trialProdotto.nome}</p>
                                    <span className="font-body text-xs px-2 py-0.5 bg-salvia/15 border border-salvia/30 text-salvia">Gratuito</span>
                                </div>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                                    Prova Lexum completo per {trialProdotto.durata_mesi ? `${trialProdotto.durata_mesi * 30} giorni` : '7 giorni'} senza inserire dati di pagamento.
                                    Attivabile una sola volta.
                                </p>
                                <div className="flex flex-wrap gap-3 pt-1">
                                    {trialProdotto.posti > 1 && (
                                        <span className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                                            ✓ {trialProdotto.posti} accessi
                                        </span>
                                    )}
                                    {trialProdotto.include_banca_dati && (
                                        <span className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                                            ✓ Banca dati inclusa
                                        </span>
                                    )}
                                    {trialProdotto.crediti_ai_mensili > 0 && (
                                        <span className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                                            ✓ {trialProdotto.crediti_ai_mensili} crediti Lex AI
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={attivaTrial}
                                disabled={attivandoTrial}
                                className="flex items-center gap-2 px-5 py-2.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40 shrink-0"
                            >
                                {attivandoTrial
                                    ? <span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" />
                                    : 'Attiva prova gratuita'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {trialAttivato && (
                <div className="flex items-center gap-3 p-4 bg-salvia/5 border border-salvia/20">
                    <span className="text-salvia">✓</span>
                    <p className="font-body text-sm text-salvia">Prova gratuita attivata! La pagina si aggiornerà a breve.</p>
                </div>
            )}

            {piani.length > 0 && (
                <div className="space-y-3">
                    <p className="section-label">{pianoAttualeId ? 'Cambia piano' : 'Scegli il tuo piano'}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {piani.map(p => {
                            const isSelezionato = pianoProposto?.id === p.id
                            const differenza = pianoAttualeId ? p.prezzo - prezzoAttuale : null
                            return (
                                <button key={p.id}
                                    onClick={() => setPianoProposto(isSelezionato ? null : p)}
                                    className={`text-left p-4 border transition-all ${isSelezionato ? 'border-oro/50 bg-oro/10' : 'border-white/8 hover:border-oro/20'}`}
                                >
                                    <p className="font-body text-sm font-medium text-nebbia mb-1">{p.nome}</p>
                                    <p className="font-display text-2xl font-light text-oro mb-1">€ {p.prezzo}</p>
                                    {differenza !== null && (
                                        <p className="font-body text-xs text-nebbia/40 mb-2">
                                            Differenza: <span className={differenza > 0 ? 'text-amber-400' : 'text-salvia'}>€ {Math.abs(differenza)}</span>
                                        </p>
                                    )}
                                    <p className="font-body text-xs text-nebbia/40 mb-2">
                                        {p.posti ? `${p.posti} ${p.posti === 1 ? 'accesso' : 'accessi'}` : '—'}
                                        {p.durata_mesi && ` · ${p.durata_mesi} mesi`}
                                    </p>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {p.include_banca_dati && (
                                            <span className="font-body text-[10px] px-1.5 py-0.5 border border-oro/30 text-oro">Banca dati</span>
                                        )}
                                        {p.include_monetizzazione && (
                                            <span className="font-body text-[10px] px-1.5 py-0.5 border border-salvia/30 text-salvia">Monetizzazione</span>
                                        )}
                                        {p.posti > 1 && (
                                            <span className="font-body text-[10px] px-1.5 py-0.5 border border-white/10 text-nebbia/40">Studio</span>
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {pianoProposto && (
                        <div className="flex items-center justify-between p-4 bg-oro/5 border border-oro/20">
                            <div>
                                <p className="font-body text-sm text-nebbia">
                                    {pianoAttualeId ? 'Upgrade a ' : 'Acquisto: '}
                                    <span className="font-medium text-oro">{pianoProposto.nome}</span>
                                </p>
                                <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                    Importo da pagare:{' '}
                                    <span className="text-nebbia/70">
                                        € {pianoAttualeId ? Math.max(pianoProposto.prezzo - prezzoAttuale, 0) : pianoProposto.prezzo}
                                    </span>
                                    {pianoAttualeId && <span className="text-nebbia/30"> · scadenza invariata</span>}
                                </p>
                            </div>
                            <button
                                onClick={() => acquista(pianoProposto.id, !!pianoAttualeId)}
                                disabled={acquistando}
                                className="btn-primary text-sm disabled:opacity-40"
                            >
                                {acquistando
                                    ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                                    : 'Procedi al pagamento'
                                }
                            </button>
                        </div>
                    )}
                </div>
            )}

            {addons.length > 0 && (
                <div className="space-y-3">
                    <p className="section-label">Aggiungi accessi</p>
                    <p className="font-body text-xs text-nebbia/40">
                        La scadenza segue il piano attuale{scadenzaAttuale ? ` (${new Date(scadenzaAttuale).toLocaleDateString('it-IT')})` : ''}.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {addons.map(a => (
                            <div key={a.id} className="bg-slate border border-white/5 p-4 space-y-3">
                                <p className="font-body text-sm font-medium text-nebbia">{a.nome}</p>
                                <p className="font-body text-xs text-nebbia/40">+{a.posti} {a.posti === 1 ? 'accesso' : 'accessi'}</p>
                                <p className="font-display text-2xl font-light text-oro">€ {a.prezzo}</p>
                                <p className="font-body text-xs text-nebbia/30">Accessi: {postiAttuali} → {postiAttuali + (a.posti ?? 1)}</p>
                                <button onClick={() => acquista(a.id, false)} disabled={acquistando}
                                    className="btn-secondary text-sm w-full justify-center disabled:opacity-40">
                                    {acquistando ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : 'Acquista'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// RIGA COLLABORATORE (solo avvocato)
// ─────────────────────────────────────────────────────────────
function CollaboRow({ collabo, isTitolare, meId, onRefresh }) {
    const isMe = collabo.id === meId

    async function rimuovi() {
        if (!confirm(`Rimuovere ${collabo.nome} ${collabo.cognome} dallo studio?`)) return
        await supabase.from('profiles').update({ titolare_id: null, tipo_account: 'singolo' }).eq('id', collabo.id)
        onRefresh()
    }

    return (
        <div className="border border-white/5 p-4 hover:bg-petrolio/20 transition-colors">
            <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-salvia/20 border border-salvia/30 flex items-center justify-center shrink-0">
                    <span className="font-display text-sm font-semibold text-salvia">{(collabo.nome ?? '?')[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-nebbia">
                        {collabo.nome} {collabo.cognome}
                        {isMe && <span className="text-nebbia/30 ml-1">(tu)</span>}
                    </p>
                    <p className="font-body text-xs text-nebbia/40">{collabo.email}</p>
                </div>
                {isTitolare && !isMe && (
                    <button onClick={rimuovi} className="flex items-center gap-1.5 font-body text-xs text-nebbia/25 hover:text-red-400 transition-colors">
                        <Trash2 size={11} /> Rimuovi
                    </button>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// STORICO TRANSAZIONI
// ─────────────────────────────────────────────────────────────
function StoricoTransazioni({ meId, includiSentenze = false }) {
    const [storico, setStorico] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!meId) return
        const tipi = includiSentenze
            ? ['abbonamento', 'seat_addon', 'accesso_singolo']
            : ['abbonamento', 'seat_addon']

        supabase
            .from('transazioni')
            .select('id, prodotto_nome, importo, created_at, stato, tipo')
            .eq('user_id', meId)
            .in('tipo', tipi)
            .order('created_at', { ascending: false })
            .then(({ data }) => { setStorico(data ?? []); setLoading(false) })
    }, [meId, includiSentenze])

    if (loading) return null

    return (
        <div className="bg-slate border border-white/5 p-5">
            <p className="section-label mb-4">Storico pagamenti</p>
            {storico.length === 0 ? (
                <p className="font-body text-sm text-nebbia/30 italic">Nessun pagamento registrato</p>
            ) : (
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            {['Descrizione', 'Importo', 'Data', 'Stato'].map(h => (
                                <th key={h} className="px-4 py-2 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {storico.map(s => (
                            <tr key={s.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                <td className="px-4 py-3 font-body text-sm text-nebbia">{s.prodotto_nome ?? '—'}</td>
                                <td className="px-4 py-3 font-body text-sm font-medium text-oro">€ {parseFloat(s.importo).toFixed(2)}</td>
                                <td className="px-4 py-3 font-body text-xs text-nebbia/50 whitespace-nowrap">
                                    {new Date(s.created_at).toLocaleDateString('it-IT')}
                                </td>
                                <td className="px-4 py-3">
                                    <Badge
                                        label={s.stato === 'completato' ? 'Pagato' : s.stato === 'rimborsato' ? 'Rimborsato' : 'Fallito'}
                                        variant={s.stato === 'completato' ? 'salvia' : s.stato === 'rimborsato' ? 'warning' : 'red'}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// PAGINA PRINCIPALE — dual role: user + avvocato
// ─────────────────────────────────────────────────────────────
export default function AvvocatoStudio() {
    const { profile: authProfile } = useAuth()
    const isUser = authProfile?.role === 'user'

    // ── TUTTI GLI HOOKS IN CIMA ───────────────────────────────
    const [tab, setTab] = useState('piano')
    const [meId, setMeId] = useState(null)
    const [profilo, setProfilo] = useState(null)
    const [collaboratori, setCollaboratori] = useState([])
    const [loading, setLoading] = useState(true)
    const [inviatoOk, setInviatoOk] = useState(false)
    const [prezzoAttuale, setPrezzoAttuale] = useState(0)
    const [showInvita, setShowInvita] = useState(false)
    const [emailInvito, setEmailInvito] = useState('')
    const [inviando, setInviando] = useState(false)
    const [erroreInvito, setErroreInvito] = useState('')
    const [editNome, setEditNome] = useState(false)
    const [nomeStudio, setNomeStudio] = useState('')

    const carica = useCallback(async () => {
        if (!meId) return
        setLoading(true)

        const { data: p } = await supabase
            .from('profiles')
            .select('id, nome, cognome, email, studio, tipo_account, piano_id, abbonamento_tipo, abbonamento_scadenza, posti_acquistati, posti_usati, include_banca_dati, include_monetizzazione')
            .eq('id', meId)
            .single()

        setProfilo(p)
        setNomeStudio(p?.studio ?? '')

        if (!isUser) {
            const { data: cl } = await supabase
                .from('profiles')
                .select('id, nome, cognome, email')
                .eq('titolare_id', meId)
            setCollaboratori(cl ?? [])
        }

        setLoading(false)
    }, [meId, isUser])

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setMeId(user.id))
    }, [])

    useEffect(() => { carica() }, [carica])

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('tab') === 'acquista') {
            setTab('acquista')
            window.history.replaceState({}, '', '/studio')
        }
    }, [])

    useEffect(() => {
        if (!profilo?.piano_id) return
        supabase.from('prodotti').select('prezzo').eq('id', profilo.piano_id).single()
            .then(({ data }) => setPrezzoAttuale(data?.prezzo ?? 0))
    }, [profilo?.piano_id])

    // ── LOGICA ────────────────────────────────────────────────

    async function salvaNomeStudio() {
        if (!nomeStudio.trim()) return
        await supabase.from('profiles').update({ studio: nomeStudio.trim() }).eq('id', meId)
        setProfilo(p => ({ ...p, studio: nomeStudio.trim() }))
        setEditNome(false)
    }

    async function invitaMembro() {
        setErroreInvito('')
        if (!emailInvito.trim()) return setErroreInvito('Email obbligatoria')
        setInviando(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-membro`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({ email: emailInvito.trim() }),
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error ?? 'Errore invio invito')
            setInviatoOk(true)
            setEmailInvito('')
            setShowInvita(false)
            carica()
        } catch (err) {
            setErroreInvito(err.message)
        } finally {
            setInviando(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    const giorni = giorniAllaScadenza(profilo?.abbonamento_scadenza)
    const inScadenza = giorni !== null && giorni <= 30 && giorni > 3
    const inGrazia = giorni !== null && giorni <= 3 && giorni > 0
    const scaduto = giorni !== null && giorni <= 0
    const postiAcquistati = profilo?.posti_acquistati ?? 0
    const postiUsati = profilo?.posti_usati ?? 0
    const postiLiberi = postiAcquistati - postiUsati
    const haStudio = !isUser && postiAcquistati > 1
    const isTitolare = profilo?.tipo_account === 'titolare' || profilo?.tipo_account === 'singolo'
    const hasPiano = !!profilo?.piano_id

    // Tab in base al ruolo
    const tabs = isUser
        ? [
            { id: 'piano', label: 'Il mio studio' },
            { id: 'acquista', label: 'Acquista' },
        ]
        : [
            { id: 'piano', label: 'Il mio piano' },
            ...(haStudio ? [{ id: 'collaboratori', label: 'Collaboratori', count: collaboratori.length }] : []),
            { id: 'acquista', label: 'Acquista' },
        ]

    return (
        <div className="space-y-5">
            <PageHeader label={isUser ? 'Account' : 'Avvocato'} title="Il tuo studio" />

            {inviatoOk && (
                <div className="flex items-center gap-2 p-3 bg-salvia/5 border border-salvia/20">
                    <CheckCircle size={14} className="text-salvia shrink-0" />
                    <p className="font-body text-sm text-salvia">Operazione completata con successo.</p>
                    <button onClick={() => setInviatoOk(false)} className="ml-auto text-nebbia/30 hover:text-nebbia"><X size={14} /></button>
                </div>
            )}

            {/* Alert scadenza — solo avvocato */}
            {!isUser && (inScadenza || inGrazia || scaduto) && (
                <div className={`border p-4 flex items-start gap-3 ${scaduto || inGrazia ? 'bg-red-900/10 border-red-500/30' : 'bg-amber-900/10 border-amber-500/20'}`}>
                    <AlertTriangle size={16} className={`${scaduto || inGrazia ? 'text-red-400' : 'text-amber-400'} shrink-0 mt-0.5`} />
                    <div>
                        {scaduto && <p className="font-body text-sm font-medium text-red-400">Abbonamento scaduto</p>}
                        {inGrazia && <p className="font-body text-sm font-medium text-red-400">Periodo di grazia — {giorni} {giorni === 1 ? 'giorno' : 'giorni'} rimanenti</p>}
                        {inScadenza && <p className="font-body text-sm font-medium text-amber-400">Abbonamento in scadenza — {giorni} giorni rimanenti</p>}
                        <button onClick={() => setTab('acquista')} className="mt-2 font-body text-xs text-oro border border-oro/30 px-3 py-1 hover:bg-oro/10 transition-colors">
                            Rinnova / Acquista →
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-slate border border-white/5 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-oro/10 border border-oro/20 flex items-center justify-center shrink-0">
                            <span className="font-display text-lg font-bold text-oro">
                                {(profilo?.studio ?? profilo?.nome ?? 'S')[0].toUpperCase()}
                            </span>
                        </div>
                        <div>
                            {!isUser && editNome ? (
                                <div className="flex items-center gap-2">
                                    <input value={nomeStudio} onChange={e => setNomeStudio(e.target.value)} autoFocus
                                        onKeyDown={e => { if (e.key === 'Enter') salvaNomeStudio(); if (e.key === 'Escape') setEditNome(false) }}
                                        className="bg-petrolio border border-oro/40 text-nebbia font-display text-lg px-3 py-1 outline-none" />
                                    <button onClick={salvaNomeStudio} className="text-salvia p-1"><Check size={14} /></button>
                                    <button onClick={() => setEditNome(false)} className="text-nebbia/30 hover:text-red-400 p-1"><X size={14} /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h2 className="font-display text-xl font-semibold text-nebbia">
                                        {profilo?.studio || `${profilo?.nome} ${profilo?.cognome}`}
                                    </h2>
                                    {!isUser && (
                                        <button onClick={() => setEditNome(true)} className="text-nebbia/25 hover:text-oro transition-colors p-1">
                                            <Edit2 size={12} />
                                        </button>
                                    )}
                                </div>
                            )}
                            <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                {hasPiano ? profilo?.abbonamento_tipo : 'Nessun piano attivo'}
                            </p>
                        </div>
                    </div>
                    <Badge
                        label={!hasPiano ? 'Nessun piano' : scaduto ? 'Scaduto' : inGrazia ? 'Grazia' : inScadenza ? 'In scadenza' : 'Attivo'}
                        variant={!hasPiano ? 'gray' : scaduto || inGrazia ? 'red' : inScadenza ? 'warning' : 'salvia'}
                    />
                </div>

                {/* Stats — solo avvocato con piano */}
                {!isUser && hasPiano && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                        <StatCard label="Accessi totali" value={postiAcquistati} colorClass="text-nebbia/60" />
                        <StatCard label="Accessi usati" value={postiUsati} colorClass="text-nebbia/60" />
                        <StatCard label="Accessi liberi" value={postiLiberi} colorClass={postiLiberi === 0 ? 'text-red-400' : 'text-salvia'} />
                        <StatCard
                            label="Scadenza"
                            value={profilo?.abbonamento_scadenza ? new Date(profilo.abbonamento_scadenza).toLocaleDateString('it-IT') : '—'}
                            colorClass={inScadenza || inGrazia || scaduto ? 'text-amber-400' : 'text-nebbia/60'}
                        />
                    </div>
                )}
            </div>

            {/* Tab bar */}
            <div className="flex gap-0 border-b border-white/8">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-5 py-3 font-body text-sm border-b-2 transition-colors ${tab === t.id ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'}`}>
                        {t.label}
                        {t.count != null && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-oro/20 text-oro' : 'bg-white/5 text-nebbia/30'}`}>
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── TAB: IL MIO STUDIO (user) ── */}
            {tab === 'piano' && isUser && (
                <div className="space-y-4">
                    {/* Vantaggi */}
                    <div className="bg-slate border border-white/5 p-5 space-y-3">
                        <p className="section-label">Perché avere un piano?</p>
                        {[
                            ['Gestione clienti', 'Crea e gestisci i tuoi clienti, pratiche e documenti in un unico posto'],
                            ['Banca dati sentenze', 'Accedi a migliaia di sentenze caricate da altri avvocati (piani Pro)'],
                            ['Monetizzazione', 'Carica le tue sentenze e guadagna ogni volta che vengono acquistate (piani Pro)'],
                            ['Studio multi-accesso', 'Invita collaboratori e gestite insieme clienti e pratiche'],
                        ].map(([titolo, desc]) => (
                            <div key={titolo} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                                <CheckCircle size={14} className="text-salvia mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-body text-sm font-medium text-nebbia">{titolo}</p>
                                    <p className="font-body text-xs text-nebbia/40 mt-0.5">{desc}</p>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => setTab('acquista')} className="btn-primary text-sm mt-2 inline-flex items-center gap-2">
                            Scegli un piano <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* Storico — include sentenze acquistate */}
                    <StoricoTransazioni meId={meId} includiSentenze={true} />
                </div>
            )}

            {/* ── TAB: IL MIO PIANO (avvocato) ── */}
            {tab === 'piano' && !isUser && (
                <div className="space-y-4">
                    {!hasPiano ? (
                        <div className="bg-slate border border-white/5 p-8 text-center space-y-3">
                            <p className="font-body text-sm text-nebbia/40">Non hai ancora un piano attivo.</p>
                            <button onClick={() => setTab('acquista')} className="btn-primary text-sm inline-flex items-center gap-2">
                                Acquista un piano <ChevronRight size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="bg-slate border border-white/5 p-5 space-y-4">
                            <p className="section-label">Piano attivo</p>
                            <div className="space-y-0">
                                {[
                                    ['Piano', profilo?.abbonamento_tipo ?? '—'],
                                    ['Scadenza', profilo?.abbonamento_scadenza ? new Date(profilo.abbonamento_scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
                                    ['Accessi', `${postiUsati} / ${postiAcquistati}`],
                                    ['Banca dati', profilo?.include_banca_dati ? 'Inclusa' : 'Non inclusa'],
                                    ['Monetizzazione', profilo?.include_monetizzazione ? 'Inclusa' : 'Non inclusa'],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex justify-between items-center py-2 border-b border-white/5">
                                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{label}</span>
                                        <span className="font-body text-sm text-nebbia">{value}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setTab('acquista')} className="btn-secondary text-sm">
                                Cambia piano o aggiungi accessi
                            </button>
                        </div>
                    )}
                    <StoricoTransazioni meId={meId} />
                </div>
            )}

            {/* ── TAB: COLLABORATORI (solo avvocato con posti > 1) ── */}
            {tab === 'collaboratori' && !isUser && haStudio && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="font-body text-sm text-nebbia/40">
                            {collaboratori.length} {collaboratori.length === 1 ? 'collaboratore' : 'collaboratori'} · {postiLiberi} posti liberi
                        </p>
                        {isTitolare && postiLiberi > 0 && (
                            <button onClick={() => setShowInvita(v => !v)} className="btn-primary text-sm flex items-center gap-2">
                                <UserPlus size={14} /> Invita collaboratore
                            </button>
                        )}
                    </div>

                    {postiLiberi === 0 && (
                        <div className="flex items-center gap-3 p-3 bg-oro/5 border border-oro/15">
                            <CreditCard size={14} className="text-oro/60 shrink-0" />
                            <p className="font-body text-xs text-nebbia/50 flex-1">Hai esaurito gli accessi.</p>
                            <button onClick={() => setTab('acquista')} className="font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors whitespace-nowrap">
                                Aggiungi accessi
                            </button>
                        </div>
                    )}

                    {showInvita && (
                        <div className="bg-slate border border-oro/20 p-5 space-y-4">
                            <p className="section-label">Invita un collaboratore</p>
                            <div>
                                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Email *</label>
                                <input type="email" value={emailInvito} onChange={e => setEmailInvito(e.target.value)}
                                    placeholder="collega@studio.it"
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                            </div>
                            {erroreInvito && (
                                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                                    <AlertCircle size={14} /> {erroreInvito}
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button onClick={invitaMembro} disabled={inviando} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">
                                    {inviando ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Send size={13} /> Invia invito</>}
                                </button>
                                <button onClick={() => { setShowInvita(false); setErroreInvito('') }} className="btn-secondary text-sm">Annulla</button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <CollaboRow collabo={profilo} isTitolare={false} meId={meId} onRefresh={carica} />
                        {collaboratori.map(c => (
                            <CollaboRow key={c.id} collabo={c} isTitolare={isTitolare} meId={meId} onRefresh={carica} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── TAB: ACQUISTA ── */}
            {tab === 'acquista' && (
                <SezioneAcquisto
                    pianoAttualeId={isUser ? null : (profilo?.piano_id ?? null)}
                    prezzoAttuale={isUser ? 0 : prezzoAttuale}
                    scadenzaAttuale={profilo?.abbonamento_scadenza}
                    postiAttuali={postiAcquistati}
                />
            )}
        </div>
    )
}