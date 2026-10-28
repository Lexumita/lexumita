import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { profiloCompleto, campiMancanti } from '@/lib/profiloCompleto'
import { supabase } from '@/lib/supabase'
import { formatPrezzo } from '@/lib/prezzi'
import { apriCassa } from '@/lib/pagamentoOnline'
import { AvvisoDatiFatturazione, mancantiAcquisto, messaggioDatiMancanti } from '@/lib/datiFatturazione'
import ConsensoRecesso, { useConsensoRecesso, ERRORE_CONSENSO_RECESSO, PULSANTE_ATTIVA_SUBITO } from '@/components/ConsensoRecesso'
import CodiceSconto, { useCodiceSconto, PrezzoScontato } from '@/components/CodiceSconto'
import { useContoPrivato, RiquadroConto, SezionePiani, SezioneArchivioInPiu, FinestraGestisci, gestisciAbbonamento } from '@/components/ContoPrivato'
import { vociPiano, etichettaDurata, periodoPrezzo } from '@/lib/vociPiano'
import {
    Sparkles, CreditCard, ArrowRight, CheckCircle,
    AlertCircle, Loader2, Shield
} from 'lucide-react'

export default function Acquista() {
    const { profile } = useAuth()
    const location = useLocation()

    // Crediti, archivio e abbonamento (28-10-2026): il riquadro «Crediti e archivio» (src/components/ContoPrivato.jsx)
    const conto = useContoPrivato(profile)

    // Prodotti: i tre piani personali e l'archivio in più (abbonamenti che si rinnovano ogni mese), i pacchetti di
    // crediti (una volta, non scadono) e, per chi ha i dati di fatturazione, i piani per lo studio professionale.
    const [piani, setPiani] = useState([])
    const [archivioMensile, setArchivioMensile] = useState([])
    const [pacchettiCrediti, setPacchettiCrediti] = useState([])
    const [abbonamenti, setAbbonamenti] = useState([])
    const [seatAddon, setSeatAddon] = useState([])
    const [loadingProdotti, setLoadingProdotti] = useState(true)

    // Acquisto in corso
    const [acquistando, setAcquistando] = useState(null)
    const [errore, setErrore] = useState('')
    const [avviso, setAvviso] = useState('')
    const [gestisciAperta, setGestisciAperta] = useState(false)
    const consenso = useConsensoRecesso()
    // Codice sconto: vale per i prodotti di questa pagina che l'admin ha scelto (src/components/CodiceSconto.jsx)
    const sconto = useCodiceSconto([
        ...piani.map(p => p.id), ...archivioMensile.map(p => p.id), ...pacchettiCrediti.map(p => p.id),
        ...abbonamenti.map(p => p.id), ...seatAddon.map(p => p.id),
    ])

    // A sbloccare i piani dello studio sono i DATI DI FATTURAZIONE, non la verifica dei documenti: si validano
    // da soli (una P.IVA errata fa fallire la fattura) e non richiedono approvazione manuale. Chi era già stato
    // approvato in passato resta sbloccato, altrimenti gli toglieremmo un diritto acquisito.
    const haProfiloCompleto = profiloCompleto(profile)
    const isApproved = haProfiloCompleto || profile?.verification_status === 'approved'
    const mancanti = campiMancanti(profile)
    const haPianoStudio = profile?.posti_acquistati > 1

    // Ritorno dalla cassa
    const isSuccess = new URLSearchParams(location.search).get('success') === '1'

    useEffect(() => {
        if (isSuccess) {
            window.history.replaceState({}, '', '/area/acquista')
        }
        if (profile?.id) caricaProdotti()
    }, [profile?.id])

    // Al ritorno dalla cassa l'acquisto lo accredita il webhook, spesso qualche secondo DOPO il ritorno: senza
    // questo controllo il saldo restava quello vecchio (30/09/2026).
    useEffect(() => {
        if (!isSuccess || !profile?.id) return
        let volte = 0
        const timer = setInterval(() => {
            volte += 1
            conto.ricarica()
            if (volte >= 10) clearInterval(timer)
        }, 3000)
        return () => clearInterval(timer)
    }, [isSuccess, profile?.id])

    async function caricaProdotti() {
        setLoadingProdotti(true)
        setErrore('')
        try {
            const { data: tutti, error } = await supabase
                .from('prodotti')
                .select('id, nome, tipo, prezzo, durata_mesi, crediti_ai_mensili, spazio_gb, target_role, codice')
                .eq('attivo', true)
                .in('tipo', ['piano_privato', 'spazio_archiviazione', 'crediti_ai'])
                .order('prezzo')
            if (error) throw new Error(`Errore caricamento prodotti: ${error.message}`)
            setPiani((tutti ?? []).filter(p => p.tipo === 'piano_privato'))
            setArchivioMensile((tutti ?? []).filter(p => p.tipo === 'spazio_archiviazione' && p.target_role === 'user'))
            setPacchettiCrediti((tutti ?? []).filter(p => p.tipo === 'crediti_ai'))

            // Piani per lo studio (solo con i dati di fatturazione) — filtrati per professione richiesta
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

                // Posti aggiuntivi (solo se ha un piano studio)
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

    async function acquista(prodottoId) {
        setErrore('')
        setAvviso('')
        if (!consenso.ok) {
            setErrore(ERRORE_CONSENSO_RECESSO)
            document.getElementById('consenso-recesso')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return
        }
        // Dati di fatturazione prima della cassa: Tagadapay li vuole (src/lib/datiFatturazione.jsx)
        const mancantiFatt = mancantiAcquisto(profile)
        if (mancantiFatt.length) {
            setErrore(messaggioDatiMancanti(mancantiFatt))
            document.getElementById('dati-fatturazione')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return
        }
        // Cassa Tagadapay; il bonifico resta come riserva (src/lib/pagamentoOnline.js)
        setAcquistando(prodottoId)
        try {
            await apriCassa({ prodottoId, consenso: consenso.campo, codiceSconto: sconto.campo(prodottoId), ritorno: '/area/acquista?success=1' })
        } catch (err) {
            setErrore(err.message)
            setAcquistando(null)
        }
    }

    // Piano più piccolo: dal mese dopo, se i file ci stanno (abbonamento-gestisci)
    async function passaA(piano) {
        if (!conto.piano) return
        setErrore('')
        setAvviso('')
        const r = await gestisciAbbonamento('cambia', conto.piano.id, piano.id)
        if (r.checkout) return acquista(piano.id)
        if (!r.ok) { setErrore(r.error); return }
        setAvviso(r.messaggio)
        conto.ricarica()
    }

    async function gestisciArchivio(a) {
        setErrore('')
        setAvviso('')
        const r = await gestisciAbbonamento(a.stato === 'disdetto' ? 'riattiva' : 'disdici', a.id)
        if (!r.ok) { setErrore(r.error); return }
        setAvviso(r.messaggio)
        conto.ricarica()
    }

    const vai = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    return (
        <div className="space-y-6 max-w-5xl">

            {/* Header */}
            <div>
                <p className="section-label mb-2">Acquista</p>
                <h1 className="font-display text-4xl font-light text-nebbia">Crediti, archivio e abbonamento</h1>
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

            <RiquadroConto
                conto={conto}
                onAggiungiCrediti={() => vai('crediti')}
                onAggiungiArchivio={() => vai('archivio-in-piu')}
                onAbbonamento={() => vai('abbonamenti')}
                onGestisci={() => setGestisciAperta(true)}
            />

            {/* Prima dei prodotti: dati di fatturazione, attivazione immediata e recesso (la frase che
                accompagna i pulsanti «Paga e attiva subito»), codice sconto */}
            <AvvisoDatiFatturazione profile={profile} />

            <div id="consenso-recesso">
                <ConsensoRecesso consenso={consenso} className="bg-slate border border-white/5 p-4" />
            </div>

            <CodiceSconto sconto={sconto} className="bg-slate border border-white/5 p-4" />

            {/* Errore e avvisi */}
            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}
            {avviso && (
                <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/10 border border-salvia/25">
                    <CheckCircle size={14} /> {avviso}
                </div>
            )}

            {piani.length > 0 && (
                <SezionePiani
                    piani={piani}
                    conto={conto}
                    acquistando={acquistando}
                    onAcquista={acquista}
                    onCambia={passaA}
                    paga={consenso.pulsante}
                    sconto={sconto}
                    PrezzoScontato={PrezzoScontato}
                />
            )}

            <SezioneArchivioInPiu
                prodotti={archivioMensile}
                conto={conto}
                acquistando={acquistando}
                onAcquista={acquista}
                onGestisciUno={gestisciArchivio}
                paga={consenso.pulsante}
                sconto={sconto}
                PrezzoScontato={PrezzoScontato}
            />

            <div id="crediti" className="space-y-3 scroll-mt-24">
                <p className="section-label">Crediti in più · non scadono</p>
                <SezioneCrediti
                    pacchetti={pacchettiCrediti}
                    loading={loadingProdotti}
                    acquistando={acquistando}
                    onAcquista={acquista}
                    sconto={sconto}
                />
            </div>

            {/* Piani per lo studio professionale (solo con i dati di fatturazione) */}
            {isApproved && abbonamenti.length > 0 && (
                <div className="space-y-3">
                    <p className="section-label">Per lo studio professionale</p>
                    <SezioneAbbonamenti
                        piani={abbonamenti}
                        loading={loadingProdotti}
                        acquistando={acquistando}
                        onAcquista={acquista}
                        piano_attivo={false}
                        sconto={sconto}
                    />
                </div>
            )}
            {isApproved && haPianoStudio && seatAddon.length > 0 && (
                <div className="space-y-3">
                    <p className="section-label">Posti aggiuntivi</p>
                    <SezioneSeat
                        seats={seatAddon}
                        loading={loadingProdotti}
                        acquistando={acquistando}
                        onAcquista={acquista}
                        posti_acquistati={profile?.posti_acquistati}
                        posti_usati={profile?.posti_usati}
                        sconto={sconto}
                    />
                </div>
            )}

            {/* CTA: cosa manca per sbloccare i piani dello studio */}
            {!isApproved && (
                <div className="bg-slate border border-oro/20 p-6">
                    <div className="flex items-start gap-3">
                        <Shield size={18} className="text-oro shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-body text-sm font-medium text-nebbia mb-1">
                                Sei un professionista? Sblocca i piani per lo studio
                            </p>
                            <p className="font-body text-xs text-nebbia/50 leading-relaxed mb-1">
                                I piani dello studio includono crediti mensili, gestionale completo, portale clienti e
                                fatturazione. Per attivarli servono solo i dati di fatturazione: nessuna attesa, nessuna approvazione.
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
            )}

            {/* Footer trust */}
            <p className="font-body text-xs text-nebbia/20 text-center pt-4">
                Pagamento con carta in modo sicuro. I prodotti si attivano subito dopo il pagamento.
            </p>

            <FinestraGestisci
                conto={conto}
                aperta={gestisciAperta}
                onChiudi={() => setGestisciAperta(false)}
                onFatto={() => conto.ricarica()}
                onScegliPiano={() => { setGestisciAperta(false); vai('abbonamenti') }}
            />
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// SEZIONE PACCHETTI CREDITI
// ═══════════════════════════════════════════════════════════════
function SezioneCrediti({ pacchetti, loading, acquistando, onAcquista, sconto }) {
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
                        <p className="font-display text-3xl font-light text-salvia mt-2"><PrezzoScontato prezzo={p.prezzo} scontato={sconto.prezzo(p.id, p.prezzo)} /></p>
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
                                : <>{PULSANTE_ATTIVA_SUBITO} <ArrowRight size={12} /></>
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
function SezioneAbbonamenti({ piani, loading, acquistando, onAcquista, piano_attivo, sconto }) {
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
                                <PrezzoScontato prezzo={p.prezzo} scontato={sconto.prezzo(p.id, p.prezzo)} />
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
                                    : <>{PULSANTE_ATTIVA_SUBITO} <ArrowRight size={12} /></>
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
function SezioneSeat({ seats, loading, acquistando, onAcquista, posti_acquistati, posti_usati, sconto }) {
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
                                <p className="font-display text-3xl font-light text-oro mt-2 flex-1"><PrezzoScontato prezzo={s.prezzo} scontato={sconto.prezzo(s.id, s.prezzo)} /></p>
                                <button
                                    onClick={() => onAcquista(s.id)}
                                    disabled={isLoading}
                                    className="mt-4 flex items-center justify-center gap-2 py-3 lg:py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40"
                                >
                                    {isLoading
                                        ? <Loader2 size={14} className="animate-spin" />
                                        : <>{PULSANTE_ATTIVA_SUBITO} <ArrowRight size={12} /></>
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