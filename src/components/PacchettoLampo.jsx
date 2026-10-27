// src/components/PacchettoLampo.jsx
// ─────────────────────────────────────────────────────────────
// Pacchetto Lampo (30/09/2026). Quando i crediti di Lex finiscono si propone di
// continuare la ricerca con un piccolo pacchetto. Dal 27-10-2026 si paga con Tagadapay
// (src/lib/pagamentoOnline.js): Stripe ha chiuso il conto.
// Il prodotto si ritrova nel listino con codice = 'lampo': prezzo e numero di
// crediti si cambiano solo nel database (tabella prodotti).
//
// Stripe apre la sua pagina di pagamento nella STESSA scheda: prima di uscire
// chi usa il popup salva la ricerca in corso (salvaRicercaInSospeso) e al
// ritorno la ritrova (leggiEsitoLampo + prendiRicercaInSospeso).
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { X, Zap, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { formatPrezzo } from '@/lib/prezzi'
import { apriCassa } from '@/lib/pagamentoOnline'
import ConsensoRecesso, { useConsensoRecesso, ERRORE_CONSENSO_RECESSO } from '@/components/ConsensoRecesso'

const CHIAVE_SOSPESA = 'lex_ricerca_in_sospeso'
const DURATA_SOSPESA_MS = 60 * 60 * 1000   // una ricerca lasciata per pagare si ritrova entro un'ora

export function formattaEuro(valore) {
    return formatPrezzo(valore)
}

// Ricerca da ritrovare dopo il pagamento. Il browser puo' negare l'archivio
// (navigazione privata): allora si paga lo stesso, senza ripristino.
export function salvaRicercaInSospeso(dati) {
    try {
        sessionStorage.setItem(CHIAVE_SOSPESA, JSON.stringify({ ...dati, salvata: Date.now() }))
    } catch { /* archivio non disponibile */ }
}

export function prendiRicercaInSospeso() {
    try {
        const grezzo = sessionStorage.getItem(CHIAVE_SOSPESA)
        if (!grezzo) return null
        sessionStorage.removeItem(CHIAVE_SOSPESA)
        const dati = JSON.parse(grezzo)
        if (!dati?.salvata || Date.now() - dati.salvata > DURATA_SOSPESA_MS) return null
        return dati
    } catch {
        return null
    }
}

// Esito del ritorno da Stripe: 'ok', 'annullato' oppure null.
// Toglie il parametro dall'indirizzo, cosi' un ricaricamento non lo rilegge.
export function leggiEsitoLampo() {
    const params = new URLSearchParams(window.location.search)
    const esito = params.get('lampo')
    if (!esito) return null
    params.delete('lampo')
    const resto = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (resto ? `?${resto}` : '') + window.location.hash)
    return esito === 'ok' ? 'ok' : 'annullato'
}

// Saldo dei crediti Lex disponibili (stessa regola del contatore di Banca Dati).
export async function leggiSaldoCrediti() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0
    const { data } = await supabase
        .from('crediti_ai')
        .select('crediti_totali, crediti_usati, periodo_fine')
        .eq('user_id', user.id)
    const now = new Date()
    return (data ?? []).reduce((acc, row) => {
        const residui = row.crediti_totali - row.crediti_usati
        const scaduto = row.periodo_fine && new Date(row.periodo_fine) < now
        return acc + (residui > 0 && !scaduto ? residui : 0)
    }, 0)
}

export default function PacchettoLampo({ aperto, onChiudi, motivo = 'esauriti', primaDiPagare }) {
    const { profile } = useAuth()
    const consenso = useConsensoRecesso()
    const [prodotto, setProdotto] = useState(null)
    const [caricando, setCaricando] = useState(false)
    const [pagando, setPagando] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => {
        if (!aperto) return
        setErrore('')
        if (prodotto) return
        let chiuso = false
        setCaricando(true)
        supabase
            .from('prodotti')
            .select('id, nome, prezzo, crediti_ai_mensili')
            .eq('codice', 'lampo')
            .eq('attivo', true)
            .maybeSingle()
            .then(({ data }) => {
                if (chiuso) return
                setProdotto(data ?? null)
                setCaricando(false)
            })
        return () => { chiuso = true }
    }, [aperto])

    useEffect(() => {
        if (!aperto) return
        const onKey = e => { if (e.key === 'Escape' && !pagando) onChiudi() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [aperto, pagando, onChiudi])

    if (!aperto) return null

    // I privati comprano da /area/acquista; gli altri ruoli dalla scheda Acquista dello studio.
    const paginaPacchetti = profile?.role === 'user' ? '/area/acquista' : '/studio?tab=acquista'
    const prezzo = prodotto ? formattaEuro(prodotto.prezzo) : ''
    const ricerche = prodotto?.crediti_ai_mensili ?? 0

    async function paga() {
        if (!prodotto || pagando) return
        if (!consenso.ok) { setErrore(ERRORE_CONSENSO_RECESSO); return }
        // Cassa Tagadapay; il bonifico resta come riserva (src/lib/pagamentoOnline.js)
        setPagando(true)
        setErrore('')
        if (primaDiPagare) primaDiPagare()
        try {
            await apriCassa({ prodottoId: prodotto.id, consenso: consenso.campo, ritorno: `${window.location.pathname}?lampo=ok` })
        } catch (err) {
            setErrore(err.message)
            setPagando(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm"
            onClick={() => { if (!pagando) onChiudi() }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="lampo-titolo"
                className="bg-slate border border-oro/30 w-full max-w-md shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <Zap size={14} className="text-oro" />
                        <p id="lampo-titolo" className="font-body text-sm font-medium text-nebbia">
                            Continua la tua ricerca
                        </p>
                    </div>
                    <button
                        onClick={onChiudi}
                        disabled={pagando}
                        className="flex items-center justify-center min-w-[40px] min-h-[40px] -mr-2 text-nebbia/40 hover:text-nebbia transition-colors disabled:opacity-40"
                        title="Chiudi"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {caricando ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 size={18} className="animate-spin text-oro/60" />
                        </div>
                    ) : prodotto ? (
                        <>
                            <p className="font-body text-sm text-nebbia/70 leading-relaxed">
                                {motivo === 'ultimo'
                                    ? 'Hai usato l’ultima ricerca disponibile.'
                                    : 'Hai usato le ricerche disponibili.'}{' '}
                                Con il <span className="text-oro">Pacchetto Lampo</span> continui con Lex:
                                {' '}{ricerche} ricerche a {prezzo}. I crediti non scadono.
                            </p>

                            <div className="bg-petrolio/60 border border-oro/20 p-4 flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-body text-xs text-oro/80 uppercase tracking-widest">Pacchetto Lampo</p>
                                    <p className="font-body text-sm text-nebbia/70 mt-1">{ricerche} ricerche con Lex</p>
                                </div>
                                <p className="font-display text-3xl font-light text-oro whitespace-nowrap">{prezzo}</p>
                            </div>

                            <ConsensoRecesso consenso={consenso} />

                            {errore && (
                                <p className="font-body text-xs text-red-400 flex items-center gap-1.5">
                                    <AlertCircle size={11} className="shrink-0" /> {errore}
                                </p>
                            )}

                            <button
                                onClick={paga}
                                disabled={pagando || !consenso.ok}
                                className="flex items-center justify-center gap-2 w-full min-h-[44px] py-3 bg-oro/15 border border-oro/40 text-oro font-body text-sm hover:bg-oro/25 transition-colors disabled:opacity-50"
                            >
                                {pagando
                                    ? <><Loader2 size={14} className="animate-spin" /> Apro il pagamento...</>
                                    : <><Zap size={13} /> Continua con {prezzo}</>}
                            </button>

                            <p className="font-body text-xs text-nebbia/35 text-center leading-relaxed">
                                Pagamento con carta in modo sicuro. Poi torni qui e riprendi la ricerca da dove eri.
                            </p>
                        </>
                    ) : (
                        <p className="font-body text-sm text-nebbia/70 leading-relaxed">
                            Hai usato le ricerche disponibili. Per continuare con Lex scegli un pacchetto di crediti.
                        </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                        <a
                            href={paginaPacchetti}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-body text-xs text-nebbia/50 hover:text-oro transition-colors min-h-[40px] flex items-center"
                        >
                            Vedi tutti i pacchetti
                        </a>
                        <button
                            onClick={onChiudi}
                            disabled={pagando}
                            className="font-body text-xs text-nebbia/40 hover:text-nebbia transition-colors min-h-[40px] disabled:opacity-40"
                        >
                            Non ora
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
