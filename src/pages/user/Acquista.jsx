import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
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
    const [pacchettiCrediti, setPacchettiCrediti] = useState([])
    const [abbonamenti, setAbbonamenti] = useState([])
    const [seatAddon, setSeatAddon] = useState([])
    const [loadingProdotti, setLoadingProdotti] = useState(true)

    // Acquisto in corso
    const [acquistando, setAcquistando] = useState(null)
    const [errore, setErrore] = useState('')

    // Tab attivo: "crediti" (sempre visibile), "abbonamenti" (solo verificato)
    const isApproved = profile?.verification_status === 'approved'
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
        }
    }, [profile?.id])

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

    async function caricaProdotti() {
        setLoadingProdotti(true)

        // Pacchetti crediti AI
        const { data: cred } = await supabase
            .from('prodotti')
            .select('id, nome, prezzo, crediti_ai_mensili, descrizione')
            .eq('tipo', 'crediti_ai')
            .eq('attivo', true)
            .order('prezzo')
        setPacchettiCrediti(cred ?? [])

        // Abbonamenti (solo se verificato)
        if (isApproved) {
            const { data: abb } = await supabase
                .from('prodotti')
                .select('*')
                .eq('tipo', 'abbonamento')
                .eq('attivo', true)
                .order('prezzo')
            setAbbonamenti(abb ?? [])

            // Seat addon (solo se ha piano studio)
            if (haPianoStudio) {
                const { data: seats } = await supabase
                    .from('prodotti')
                    .select('id, nome, prezzo, descrizione')
                    .eq('tipo', 'seat_addon')
                    .eq('attivo', true)
                    .order('prezzo')
                setSeatAddon(seats ?? [])
            }
        }

        setLoadingProdotti(false)
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

                    <div className="sm:col-span-3 grid grid-cols-3 gap-3">
                        <div className="bg-petrolio/40 border border-white/5 p-3">
                            <p className="font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">Piano</p>
                            <p className="font-display text-2xl font-light text-oro">{crediti.piano}</p>
                            {crediti.piano_scadenza && (
                                <p className="font-body text-[10px] text-nebbia/30 mt-0.5">
                                    Scad. {new Date(crediti.piano_scadenza).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                </p>
                            )}
                        </div>
                        <div className="bg-petrolio/40 border border-white/5 p-3">
                            <p className="font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">Acquistati</p>
                            <p className="font-display text-2xl font-light text-nebbia/80">{crediti.topup}</p>
                            <p className="font-body text-[10px] text-nebbia/30 mt-0.5">non scadono</p>
                        </div>
                        <div className="bg-petrolio/40 border border-white/5 p-3">
                            <p className="font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">Benvenuto</p>
                            <p className="font-display text-2xl font-light text-nebbia/80">{crediti.benvenuto}</p>
                            <p className="font-body text-[10px] text-nebbia/30 mt-0.5">non scadono</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Box trasparenza */}
            <div className="bg-slate/40 border border-white/5 p-4 flex items-start gap-3">
                <Info size={14} className="text-salvia/60 shrink-0 mt-0.5" />
                <div className="space-y-1.5 font-body text-xs text-nebbia/55 leading-relaxed">
                    <p><strong className="text-nebbia/80">Come funzionano i crediti:</strong></p>
                    <p>I crediti del <span className="text-oro">piano abbonamento</span> si rinnovano automaticamente ogni mese (in base alla data di acquisto) e non si accumulano: quelli non usati vengono persi al rinnovo.</p>
                    <p>I crediti <span className="text-nebbia/80">acquistati separatamente</span> e quelli di <span className="text-nebbia/80">benvenuto</span> non scadono mai e restano sempre tuoi.</p>
                    <p>Quando usi Lex AI, vengono consumati prima i crediti del piano (per non sprecarli), poi quelli di benvenuto, infine quelli acquistati.</p>
                </div>
            </div>

            {/* Tab navigation (solo se verificato per mostrare entrambi) */}
            {isApproved && (
                <div className="flex gap-1 bg-slate border border-white/5 p-1 w-fit">
                    <button
                        onClick={() => setTabAttivo('crediti')}
                        className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${tabAttivo === 'crediti' ? 'bg-salvia/10 text-salvia border border-salvia/30' : 'text-nebbia/40 hover:text-nebbia'
                            }`}
                    >
                        <Sparkles size={13} /> Pacchetti crediti
                    </button>
                    <button
                        onClick={() => setTabAttivo('abbonamenti')}
                        className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${tabAttivo === 'abbonamenti' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'
                            }`}
                    >
                        <Tag size={13} /> Abbonamenti
                    </button>
                    {haPianoStudio && seatAddon.length > 0 && (
                        <button
                            onClick={() => setTabAttivo('seat')}
                            className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${tabAttivo === 'seat' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'
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
                    piano_attivo={profile?.piano_attivo}
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

            {/* CTA "diventa avvocato" per non verificati */}
            {!isApproved && (
                <div className="bg-slate border border-oro/20 p-6">
                    <div className="flex items-start gap-3">
                        <Shield size={18} className="text-oro shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-body text-sm font-medium text-nebbia mb-1">Sei un avvocato?</p>
                            <p className="font-body text-xs text-nebbia/50 leading-relaxed mb-3">
                                Verifica la tua identità e accedi a piani con crediti mensili inclusi, gestionale completo, banca dati sentenze e molto altro.
                            </p>
                            <Link to="/verifica" className="btn-primary text-xs">
                                Inizia la verifica <ArrowRight size={12} />
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer trust */}
            <p className="font-body text-xs text-nebbia/20 text-center pt-4">
                Pagamento sicuro tramite Stripe. I prodotti vengono attivati immediatamente dopo il pagamento.
            </p>
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
                const prezzoPerCredito = (p.prezzo / p.crediti_ai_mensili).toFixed(2)
                return (
                    <div key={p.id} className="bg-slate border border-white/5 hover:border-salvia/30 p-5 flex flex-col transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={13} className="text-salvia" />
                            <p className="font-body text-sm font-medium text-nebbia">{p.nome}</p>
                        </div>
                        <p className="font-display text-3xl font-light text-salvia mt-2">EUR {p.prezzo}</p>
                        <p className="font-body text-xs text-nebbia/40 mt-1">
                            {p.crediti_ai_mensili} crediti · EUR {prezzoPerCredito}/credito
                        </p>
                        {p.descrizione && (
                            <p className="font-body text-xs text-nebbia/40 mt-3 leading-relaxed flex-1">
                                {p.descrizione}
                            </p>
                        )}
                        <p className="font-body text-[10px] text-nebbia/30 mt-3 italic">Non scadono mai</p>
                        <button
                            onClick={() => onAcquista(p.id)}
                            disabled={isLoading}
                            className="mt-4 flex items-center justify-center gap-2 py-2.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40"
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
            <p className="font-body text-sm text-nebbia/30">Nessun piano disponibile al momento.</p>
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
                    const isHighlight = p.include_banca_dati && p.include_monetizzazione
                    return (
                        <div key={p.id} className={`bg-slate border p-6 flex flex-col ${isHighlight ? 'border-oro/40' : 'border-white/5'}`}>
                            {isHighlight && (
                                <p className="font-body text-xs text-oro tracking-widest uppercase mb-3">Consigliato</p>
                            )}
                            <h3 className="font-display text-xl font-semibold text-nebbia mb-1">{p.nome}</h3>
                            <p className="font-body text-xs text-nebbia/40 mb-3">
                                {p.durata_mesi ? `${p.durata_mesi} mesi` : 'Una tantum'}
                            </p>

                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {p.include_banca_dati && (
                                    <span className="font-body text-[10px] px-2 py-0.5 border border-oro/30 text-oro">Pro</span>
                                )}
                                {p.include_monetizzazione && (
                                    <span className="font-body text-[10px] px-2 py-0.5 border border-salvia/30 text-salvia">Monetizzazione</span>
                                )}
                                {p.posti > 1 && (
                                    <span className="font-body text-[10px] px-2 py-0.5 border border-white/10 text-nebbia/40">
                                        {p.posti} posti
                                    </span>
                                )}
                            </div>

                            <p className="font-display text-4xl font-light text-oro mb-4">EUR {p.prezzo}</p>

                            <ul className="space-y-2 mb-5 flex-1">
                                {[
                                    'Gestione clienti illimitati',
                                    'Pratiche e documenti',
                                    'Calendario appuntamenti',
                                    ...(p.crediti_ai_mensili ? [`${p.crediti_ai_mensili} crediti AI/mese`] : []),
                                    ...(p.include_banca_dati ? ['Accesso banca dati sentenze'] : []),
                                    ...(p.include_monetizzazione ? ['Carica sentenze e monetizza'] : []),
                                    ...(p.posti > 1 ? [`Fino a ${p.posti} avvocati nello studio`] : []),
                                ].map(feat => (
                                    <li key={feat} className="flex items-start gap-2 font-body text-xs text-nebbia/60">
                                        <CheckCircle size={11} className="text-salvia shrink-0 mt-0.5" />
                                        <span>{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => onAcquista(p.id)}
                                disabled={isLoading}
                                className={`w-full justify-center text-sm flex items-center gap-2 py-2.5 font-body disabled:opacity-40 ${isHighlight
                                        ? 'bg-oro text-petrolio hover:bg-oro/90 transition-colors'
                                        : 'border border-oro/30 text-oro hover:bg-oro/10 transition-colors'
                                    }`}
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
                                <p className="font-display text-3xl font-light text-oro mt-2">EUR {s.prezzo}</p>
                                {s.descrizione && (
                                    <p className="font-body text-xs text-nebbia/40 mt-3 leading-relaxed flex-1">
                                        {s.descrizione}
                                    </p>
                                )}
                                <button
                                    onClick={() => onAcquista(s.id)}
                                    disabled={isLoading}
                                    className="mt-4 flex items-center justify-center gap-2 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40"
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