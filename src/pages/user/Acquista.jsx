import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { profiloCompleto, campiMancanti } from '@/lib/profiloCompleto'
import { supabase } from '@/lib/supabase'
import { formatPrezzo } from '@/lib/prezzi'
import { vociPiano, etichettaDurata, periodoPrezzo } from '@/lib/vociPiano'
import {
    Sparkles, ShoppingBag, CreditCard, ArrowRight, CheckCircle,
    AlertCircle, Loader2, Info, Shield, Zap, X, Tag
} from 'lucide-react'

export default function Acquista() {
    const { profile } = useAuth()
    const location = useLocation()

    // Saldo crediti per tipo
    const [crediti, setCrediti] = useState({
        benvenuto: 0, piano: 0, topup: 0, totale: 0,
        piano_scadenza: null,
    })
    const [loadingCrediti, setLoadingCrediti] = useState(true)

    // Prodotti
    // Piano Personale dei privati (02-10-2026): crediti del mese + GB di archivio
    const isPrivato = profile?.role === 'user'
    const [pianoPersonale, setPianoPersonale] = useState(null)
    const [pianoScadenza, setPianoScadenza] = useState(null)
    const [pacchettiCrediti, setPacchettiCrediti] = useState([])
    const [abbonamenti, setAbbonamenti] = useState([])
    const [seatAddon, setSeatAddon] = useState([])
    const [loadingProdotti, setLoadingProdotti] = useState(true)

    // Acquisto in corso
    const [acquistando, setAcquistando] = useState(null)
    const [errore, setErrore] = useState('')

    // Tab attivo: "crediti" (sempre visibile), "abbonamenti" (profilo completo).
    // A sbloccare i piani sono i DATI DI FATTURAZIONE, non la verifica dei
    // documenti: si validano da soli (una P.IVA errata fa fallire la fattura)
    // e non richiedono approvazione manuale. Chi era già stato approvato in
    // passato resta sbloccato, altrimenti gli toglieremmo un diritto acquisito.
    const haProfiloCompleto = profiloCompleto(profile)
    const isApproved = haProfiloCompleto || profile?.verification_status === 'approved'
    const mancanti = campiMancanti(profile)
    const haPianoStudio = profile?.posti_acquistati > 1
    const [tabAttivo, setTabAttivo] = useState('crediti')

    // Banner success da Stripe
    const isSuccess = new URLSearchParams(location.search).get('success') === '1'

    useEffect(() => {
        if (isSuccess) {
            window.history.replaceState({}, '', '/area/acquista')
        }
        if (profile?.id) {
            caricaCrediti()
            caricaProdotti()
            caricaPiano()
        }
    }, [profile?.id])

    // Al ritorno da Stripe i crediti li accredita il webhook, spesso qualche secondo DOPO il
    // ritorno: senza questo controllo il saldo restava quello vecchio (30/09/2026).
    useEffect(() => {
        if (!isSuccess || !profile?.id) return
        let volte = 0
        const timer = setInterval(() => {
            volte += 1
            caricaCrediti()
            caricaPiano()
            if (volte >= 10) clearInterval(timer)
        }, 3000)
        return () => clearInterval(timer)
    }, [isSuccess, profile?.id])

    async function caricaCrediti() {
        setLoadingCrediti(true)
        const now = new Date().toISOString()
        const { data } = await supabase
            .from('crediti_ai')
            .select('crediti_totali, crediti_usati, tipo, periodo_fine')
            .eq('user_id', profile.id)
            .or(`periodo_fine.is.null,periodo_fine.gte.${now}`)

        const map = { benvenuto: 0, piano: 0, topup: 0 }
        let pianoScad = null
        for (const c of data ?? []) {
            const rimasti = c.crediti_totali - c.crediti_usati
            if (rimasti > 0 && map[c.tipo] !== undefined) {
                map[c.tipo] += rimasti
                if (c.tipo === 'piano' && c.periodo_fine) pianoScad = c.periodo_fine
            }
        }
        setCrediti({
            ...map,
            totale: map.benvenuto + map.piano + map.topup,
            piano_scadenza: pianoScad,
        })
        setLoadingCrediti(false)
    }

    // Scadenza del Piano Personale letta dal DB (il profilo in memoria non si aggiorna da solo dopo il pagamento)
    async function caricaPiano() {
        if (profile?.role !== 'user') return
        const { data } = await supabase
            .from('profiles')
            .select('piano_id, abbonamento_scadenza')
            .eq('id', profile.id)
            .single()
        setPianoScadenza(data?.piano_id && data?.abbonamento_scadenza ? data.abbonamento_scadenza : null)
    }

    async function caricaProdotti() {
        setLoadingProdotti(true)
        setErrore('')
        try {
            if (profile?.role === 'user') {
                const { data: piano } = await supabase
                    .from('prodotti')
                    .select('id, nome, prezzo, durata_mesi, crediti_ai_mensili, spazio_gb')
                    .eq('tipo', 'piano_privato')
                    .eq('attivo', true)
                    .order('prezzo')
                    .limit(1)
                setPianoPersonale(piano?.[0] ?? null)
            }

            // Pacchetti crediti AI
            const { data: cred, error: errCred } = await supabase
                .from('prodotti')
                .select('id, nome, prezzo, crediti_ai_mensili')
                .eq('tipo', 'crediti_ai')
                .eq('attivo', true)
                .order('prezzo')
            if (errCred) throw new Error(`Errore caricamento crediti: ${errCred.message}`)
            setPacchettiCrediti(cred ?? [])

            // Abbonamenti (solo se verificato) — filtrati per professione richiesta
            if (isApproved) {
                const direzione = profile?.tipo_richiesta ?? 'avvocato'
                const { data: abb, error: errAbb } = await supabase
                    .from('prodotti')
                    .select('*')
                    .eq('tipo', 'abbonamento')
                    .eq('attivo', true)
                    .eq('target_role', direzione)
                    .order('prezzo')
                if (errAbb) throw new Error(`Errore caricamento abbonamenti: ${errAbb.message}`)
                setAbbonamenti(abb ?? [])

                // Seat addon (solo se ha piano studio)
                if (haPianoStudio) {
                    const { data: seats, error: errSeats } = await supabase
                        .from('prodotti')
                        .select('id, nome, prezzo')
                        .eq('tipo', 'seat_addon')
                        .eq('attivo', true)
                        .order('prezzo')
                    if (errSeats) throw new Error(`Errore caricamento posti: ${errSeats.message}`)
                    setSeatAddon(seats ?? [])
                }
            }
        } catch (err) {
            setErrore(err.message)
            console.error('caricaProdotti:', err)
        } finally {
            setLoadingProdotti(false)
        }
    }

    async function acquista(prodottoId, contesto = '') {
        setAcquistando(prodottoId)
        setErrore('')
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        prodotto_id: prodottoId,
                        success_url: `${window.location.origin}/area/acquista?success=1`,
                        cancel_url: `${window.location.origin}/area/acquista`,
                    }),
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)
            window.location.href = json.url
        } catch (err) {
            setErrore(err.message)
            setAcquistando(null)
        }
    }

    return (
        <div className="space-y-6 max-w-5xl">

            {/* Header */}
            <div>
                <p className="section-label mb-2">Acquista</p>
                <h1 className="font-display text-4xl font-light text-nebbia">
                    {isApproved ? 'Crediti AI e Abbonamenti' : 'Crediti AI'}
                </h1>
                <p className="font-body text-sm text-nebbia/40 mt-1">
                    {isApproved
                        ? 'Acquista crediti per Lex AI o un abbonamento per accedere a tutte le funzionalità Lexum.'
                        : 'Acquista crediti per usare Lex AI senza limiti.'
                    }
                </p>
            </div>

            {/* Banner successo */}
            {isSuccess && (
                <div className="flex items-center gap-3 p-4 bg-salvia/10 border border-salvia/25">
                    <CheckCircle size={18} className="text-salvia shrink-0" />
                    <p className="font-body text-sm font-medium text-salvia">
                        Pagamento completato! Il tuo acquisto è ora attivo.
                    </p>
                </div>
            )}

            {/* Saldo crediti — sempre visibile */}
            <div className="bg-slate border border-salvia/20 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-salvia" />
                        <p className="font-body text-sm font-medium text-nebbia">Il tuo saldo</p>
                    </div>
                    {loadingCrediti && <Loader2 size={13} className="animate-spin text-salvia/50" />}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-1 bg-petrolio/60 border border-salvia/30 p-4">
                        <p className="font-body text-xs text-salvia/70 uppercase tracking-widest mb-1">Totale</p>
                        <p className="font-display text-4xl font-light text-salvia">{crediti.totale}</p>
                        <p className="font-body text-xs text-nebbia/40 mt-0.5">crediti disponibili</p>
                    </div>

                    <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-petrolio/40 border border-white/5 p-3">
                            <p className="font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">Piano</p>
                            <p className="font-display text-2xl font-light text-oro">{crediti.piano}</p>
                            {crediti.piano_scadenza && (
                                <p className="font-body text-xs text-nebbia/30 mt-0.5">
                                    Scad. {new Date(crediti.piano_scadenza).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                </p>
                            )}
                        </div>
                        <div className="bg-petrolio/40 border border-white/5 p-3">
                            <p className="font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">Acquistati</p>
                            <p className="font-display text-2xl font-light text-nebbia/80">{crediti.topup}</p>
                            <p className="font-body text-xs text-nebbia/30 mt-0.5">non scadono</p>
                        </div>
                        <div className="bg-petrolio/40 border border-white/5 p-3">
                            <p className="font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">Benvenuto</p>
                            <p className="font-display text-2xl font-light text-nebbia/80">{crediti.benvenuto}</p>
                            <p className="font-body text-xs text-nebbia/30 mt-0.5">non scadono</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Box trasparenza */}
            <div className="bg-slate/40 border border-white/5 p-4 flex items-start gap-3">
                <Info size={14} className="text-salvia/60 shrink-0 mt-0.5" />
                <div className="space-y-1.5 font-body text-xs text-nebbia/55 leading-relaxed">
                    <p><strong className="text-nebbia/80">Come funzionano i crediti:</strong></p>
                    {isPrivato
                        ? <p>I crediti del <span className="text-oro">Piano Personale</span> valgono fino alla scadenza del piano e non si accumulano: quelli non usati si perdono alla scadenza.</p>
                        : <p>I crediti del <span className="text-oro">piano abbonamento</span> si rinnovano automaticamente ogni mese (in base alla data di acquisto) e non si accumulano: quelli non usati vengono persi al rinnovo.</p>}
                    <p>I crediti <span className="text-nebbia/80">acquistati separatamente</span> e quelli di <span className="text-nebbia/80">benvenuto</span> non scadono mai e restano sempre tuoi.</p>
                    <p>Quando usi Lex AI, vengono consumati prima i crediti del piano (per non sprecarli), poi quelli di benvenuto, infine quelli acquistati.</p>
                </div>
            </div>

            {/* Piano Personale: solo per i privati */}
            {isPrivato && pianoPersonale && (
                <SezionePianoPersonale
                    prodotto={pianoPersonale}
                    attivoFino={pianoScadenza}
                    acquistando={acquistando}
                    onAcquista={acquista}
                    conAbbonamenti={isApproved}
                />
            )}

            {/* Tab navigation (solo se verificato per mostrare entrambi) */}
            {isApproved && (
                <div className="flex gap-1 bg-slate border border-white/5 p-1 w-full overflow-x-auto lg:w-fit lg:overflow-visible">
                    <button
                        onClick={() => setTabAttivo('crediti')}
                        className={`flex items-center gap-2 shrink-0 whitespace-nowrap px-4 py-3 lg:py-2 font-body text-sm transition-colors ${tabAttivo === 'crediti' ? 'bg-salvia/10 text-salvia border border-salvia/30' : 'text-nebbia/40 hover:text-nebbia'
                            }`}
                    >
                        <Sparkles size={13} /> Pacchetti crediti
                    </button>
                    <button
                        onClick={() => setTabAttivo('abbonamenti')}
                        className={`flex items-center gap-2 shrink-0 whitespace-nowrap px-4 py-3 lg:py-2 font-body text-sm transition-colors ${tabAttivo === 'abbonamenti' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'
                            }`}
                    >
                        <Tag size={13} /> Abbonamenti
                    </button>
                    {haPianoStudio && seatAddon.length > 0 && (
                        <button
                            onClick={() => setTabAttivo('seat')}
                            className={`flex items-center gap-2 shrink-0 whitespace-nowrap px-4 py-3 lg:py-2 font-body text-sm transition-colors ${tabAttivo === 'seat' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'
                                }`}
                        >
                            <CreditCard size={13} /> Posti aggiuntivi
                        </button>
                    )}
                </div>
            )}

            {/* Errore acquisto */}
            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}

            {/* ── TAB CREDITI ── */}
            {tabAttivo === 'crediti' && (
                <SezioneCrediti
                    pacchetti={pacchettiCrediti}
                    loading={loadingProdotti}
                    acquistando={acquistando}
                    onAcquista={acquista}
                />
            )}

            {/* ── TAB ABBONAMENTI (solo verificato) ── */}
            {tabAttivo === 'abbonamenti' && isApproved && (
                <SezioneAbbonamenti
                    piani={abbonamenti}
                    loading={loadingProdotti}
                    acquistando={acquistando}
                    onAcquista={acquista}
                    // Il Piano Personale non è un piano professionale e non viene
                    // sostituito: resta valido fino alla sua scadenza
                    piano_attivo={!isPrivato && !!profile?.piano_id}
                />
            )}

            {/* ── TAB SEAT ADDON ── */}
            {tabAttivo === 'seat' && haPianoStudio && (
                <SezioneSeat
                    seats={seatAddon}
                    loading={loadingProdotti}
                    acquistando={acquistando}
                    onAcquista={acquista}
                    posti_acquistati={profile?.posti_acquistati}
                    posti_usati={profile?.posti_usati}
                />
            )}

            {/* CTA: cosa manca per sbloccare i piani */}
            {!isApproved && (() => {
                return (
                    <div className="bg-slate border border-oro/20 p-6">
                        <div className="flex items-start gap-3">
                            <Shield size={18} className="text-oro shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-body text-sm font-medium text-nebbia mb-1">
                                    Ti manca poco per sbloccare i piani
                                </p>
                                <p className="font-body text-xs text-nebbia/50 leading-relaxed mb-1">
                                    I piani includono crediti mensili, gestionale completo, portale clienti e
                                    fatturazione. Per attivarli servono solo i dati di fatturazione: nessuna
                                    attesa, nessuna approvazione.
                                </p>
                                {mancanti.length > 0 && (
                                    <p className="font-body text-xs text-nebbia/35 leading-relaxed mb-3">
                                        Da compilare: {mancanti.join(' · ')}
                                    </p>
                                )}
                                <Link to="/verifica" className="btn-primary text-xs w-full sm:w-auto justify-center">
                                    Completa il profilo <ArrowRight size={12} />
                                </Link>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* Footer trust */}
            <p className="font-body text-xs text-nebbia/20 text-center pt-4">
                Pagamento sicuro tramite Stripe. I prodotti vengono attivati immediatamente dopo il pagamento.
            </p>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// PIANO PERSONALE (privati) — crediti del mese + GB di archivio
// Pagamento mese per mese, senza rinnovo automatico: chi rinnova prima della
// scadenza aggiunge un mese da quella data (lo decide il webhook).
// ═══════════════════════════════════════════════════════════════
function SezionePianoPersonale({ prodotto, attivoFino, acquistando, onAcquista, conAbbonamenti }) {
    const isLoading = acquistando === prodotto.id
    const attivo = !!attivoFino && new Date(attivoFino) > new Date()
    const mesi = Number(prodotto.durata_mesi ?? 1) || 1
    const voci = [
        `${prodotto.crediti_ai_mensili} crediti Lex AI ${mesi === 1 ? 'al mese' : `per ${mesi} mesi`}`,
        `${prodotto.spazio_gb} GB di archivio per i tuoi documenti (invece di 50 MB)`,
        'Nessun rinnovo automatico: paghi solo quando vuoi continuare',
    ]
    return (
        <div className="bg-slate border border-oro/30 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                <div className="min-w-0">
                    <p className="font-body text-xs text-oro tracking-widest uppercase mb-2">{prodotto.nome}</p>
                    <p className="font-display text-4xl font-light text-oro">
                        {formatPrezzo(prodotto.prezzo)}
                        <span className="font-body text-sm text-nebbia/40 ml-2">{mesi === 1 ? 'al mese' : `per ${mesi} mesi`}</span>
                    </p>
                    <ul className="mt-4 space-y-2">
                        {voci.map(v => (
                            <li key={v} className="flex items-start gap-2 font-body text-xs text-nebbia/60">
                                <CheckCircle size={11} className="text-salvia shrink-0 mt-0.5" />
                                <span>{v}</span>
                            </li>
                        ))}
                    </ul>
                    {conAbbonamenti && (
                        <p className="font-body text-xs text-nebbia/35 mt-3">
                            Pensato per chi usa Lexum per sé. Per lo studio professionale ci sono gli abbonamenti qui sotto.
                        </p>
                    )}
                </div>
                <div className="sm:text-right shrink-0">
                    {attivo && (
                        <p className="font-body text-xs text-salvia mb-2 flex items-center gap-1.5 sm:justify-end">
                            <CheckCircle size={12} /> Attivo fino al {new Date(attivoFino).toLocaleDateString('it-IT')}
                        </p>
                    )}
                    <button
                        onClick={() => onAcquista(prodotto.id)}
                        disabled={isLoading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 lg:py-2.5 bg-oro text-petrolio font-body text-sm hover:bg-oro/90 transition-colors disabled:opacity-40"
                    >
                        {isLoading
                            ? <Loader2 size={14} className="animate-spin" />
                            : <>{attivo ? 'Aggiungi un mese' : 'Attiva il piano'} <ArrowRight size={12} /></>}
                    </button>
                    {attivo && (
                        <p className="font-body text-xs text-nebbia/35 mt-2">Il mese in più parte dalla scadenza attuale.</p>
                    )}
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// SEZIONE PACCHETTI CREDITI
// ═══════════════════════════════════════════════════════════════
function SezioneCrediti({ pacchetti, loading, acquistando, onAcquista }) {
    if (loading) return (
        <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-salvia" />
        </div>
    )

    if (pacchetti.length === 0) return (
        <div className="bg-slate border border-white/5 p-10 text-center">
            <p className="font-body text-sm text-nebbia/30">Nessun pacchetto disponibile al momento.</p>
        </div>
    )

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {pacchetti.map(p => {
                const isLoading = acquistando === p.id
                const prezzoPerCredito = Math.round((p.prezzo / p.crediti_ai_mensili) * 100) / 100
                return (
                    <div key={p.id} className="bg-slate border border-white/5 hover:border-salvia/30 p-5 flex flex-col transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={13} className="text-salvia" />
                            <p className="font-body text-sm font-medium text-nebbia">{p.nome}</p>
                        </div>
                        <p className="font-display text-3xl font-light text-salvia mt-2">{formatPrezzo(p.prezzo)}</p>
                        <p className="font-body text-xs text-nebbia/40 mt-1">
                            {p.crediti_ai_mensili} crediti · {formatPrezzo(prezzoPerCredito)} a credito
                        </p>
                        <p className="font-body text-xs text-nebbia/30 mt-3 italic flex-1">Non scadono mai</p>
                        <button
                            onClick={() => onAcquista(p.id)}
                            disabled={isLoading}
                            className="mt-4 flex items-center justify-center gap-2 py-3 lg:py-2.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40"
                        >
                            {isLoading
                                ? <Loader2 size={14} className="animate-spin" />
                                : <>Acquista <ArrowRight size={12} /></>
                            }
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// SEZIONE ABBONAMENTI
// ═══════════════════════════════════════════════════════════════
function SezioneAbbonamenti({ piani, loading, acquistando, onAcquista, piano_attivo }) {
    if (loading) return (
        <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-oro" />
        </div>
    )

    if (piani.length === 0) return (
        <div className="bg-slate border border-white/5 p-10 text-center">
            <p className="font-body text-sm text-nebbia/50">Nessun piano disponibile al momento.</p>
            <p className="font-body text-xs text-nebbia/40 mt-2">
                Scrivici dall'assistenza: ti aiutiamo a trovare il piano giusto per la tua attività.
            </p>
            <Link to="/area/assistenza" className="inline-flex items-center gap-1.5 mt-4 font-body text-xs text-oro hover:text-oro/80 transition-colors">
                Contatta l'assistenza <ArrowRight size={12} />
            </Link>
        </div>
    )

    return (
        <>
            {piano_attivo && (
                <div className="flex items-center gap-2 p-3 bg-salvia/5 border border-salvia/15 mb-4">
                    <CheckCircle size={13} className="text-salvia" />
                    <p className="font-body text-xs text-salvia/80">
                        Hai già un piano attivo. L'acquisto di un nuovo piano lo sostituirà.
                    </p>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {piani.map(p => {
                    const isLoading = acquistando === p.id
                    // Le voci vengono dai dati del prodotto (lib/vociPiano): restano vere
                    // anche quando il listino cambia.
                    const voci = vociPiano(p)
                    const periodo = periodoPrezzo(p)
                    return (
                        <div key={p.id} className="bg-slate border border-white/5 hover:border-oro/30 transition-colors p-6 flex flex-col">
                            <h3 className="font-display text-xl font-semibold text-nebbia mb-2">{p.nome}</h3>
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                <span className="font-body text-[10px] px-2 py-0.5 border border-oro/30 text-oro">{etichettaDurata(p)}</span>
                            </div>

                            <p className="font-display text-4xl font-light text-oro mb-4">
                                {formatPrezzo(p.prezzo)}
                                {periodo && <span className="font-body text-sm text-nebbia/40 ml-2">{periodo}</span>}
                            </p>

                            <ul className="space-y-2 mb-5 flex-1">
                                {voci.map(feat => (
                                    <li key={feat} className="flex items-start gap-2 font-body text-xs text-nebbia/60">
                                        <CheckCircle size={11} className="text-salvia shrink-0 mt-0.5" />
                                        <span>{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => onAcquista(p.id)}
                                disabled={isLoading}
                                className="w-full justify-center text-sm flex items-center gap-2 py-3 lg:py-2.5 font-body disabled:opacity-40 bg-oro text-petrolio hover:bg-oro/90 transition-colors"
                            >
                                {isLoading
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <>Acquista <ArrowRight size={12} /></>
                                }
                            </button>
                        </div>
                    )
                })}
            </div>
        </>
    )
}

// ═══════════════════════════════════════════════════════════════
// SEZIONE SEAT ADDON (avvocati con piano studio)
// ═══════════════════════════════════════════════════════════════
function SezioneSeat({ seats, loading, acquistando, onAcquista, posti_acquistati, posti_usati }) {
    if (loading) return (
        <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-oro" />
        </div>
    )

    return (
        <>
            <div className="bg-slate border border-white/5 p-4 mb-4">
                <p className="font-body text-xs text-nebbia/50 mb-1">Posti del tuo studio</p>
                <p className="font-body text-base text-nebbia">
                    <span className="text-oro font-semibold">{posti_usati ?? 1}</span>
                    <span className="text-nebbia/40"> di </span>
                    <span className="text-oro font-semibold">{posti_acquistati ?? 1}</span>
                    <span className="text-nebbia/40"> posti utilizzati</span>
                </p>
            </div>

            {seats.length === 0 ? (
                <div className="bg-slate border border-white/5 p-10 text-center">
                    <p className="font-body text-sm text-nebbia/30">Nessun pacchetto posti disponibile al momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {seats.map(s => {
                        const isLoading = acquistando === s.id
                        return (
                            <div key={s.id} className="bg-slate border border-white/5 hover:border-oro/30 p-5 flex flex-col transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <CreditCard size={13} className="text-oro" />
                                    <p className="font-body text-sm font-medium text-nebbia">{s.nome}</p>
                                </div>
                                <p className="font-display text-3xl font-light text-oro mt-2 flex-1">{formatPrezzo(s.prezzo)}</p>
                                <button
                                    onClick={() => onAcquista(s.id)}
                                    disabled={isLoading}
                                    className="mt-4 flex items-center justify-center gap-2 py-3 lg:py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40"
                                >
                                    {isLoading
                                        ? <Loader2 size={14} className="animate-spin" />
                                        : <>Acquista <ArrowRight size={12} /></>
                                    }
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </>
    )
}