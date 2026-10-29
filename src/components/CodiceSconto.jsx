// src/components/CodiceSconto.jsx
//
// Codice sconto alla cassa (28-10-2026). I codici li crea l'admin (admin → Codici sconto) con la
// percentuale e le condizioni; qui chi compra lo scrive, il database dice per quali dei prodotti in
// pagina vale (verifica_codice_sconto) e i prezzi si aggiornano. Il prezzo vero lo decide comunque il
// server alla cassa (tagada-checkout), che riverifica il codice.
// «Richiedi il tuo codice» apre un ticket di assistenza con oggetto e messaggio già scritti: l'admin
// decide a chi mandarlo.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { formatPrezzo } from '@/lib/prezzi'
import { Tag, Loader2 } from 'lucide-react'

// Perché un codice non vale (motivo di codice_sconto_esito)
const MOTIVI = {
    inesistente: 'Codice sconto non valido.',
    non_ancora: 'Questo codice sconto non è ancora valido.',
    scaduto: 'Questo codice sconto è scaduto.',
    esaurito: 'Questo codice sconto è esaurito.',
    gia_usato: 'Hai già usato questo codice sconto.',
    non_tuo: "Questo codice sconto è riservato a un'altra persona.",
    non_per_te: 'Questo codice sconto non vale per il tuo account.',
    non_vale: 'Questo codice sconto non vale per questi acquisti.',
}

/** Lo stato del codice per i prodotti di una pagina (id dei prodotti che si possono comprare lì). */
export function useCodiceSconto(prodottiIds) {
    const [testo, setTesto] = useState('')
    const [applicato, setApplicato] = useState(null) // { codice, percentuale, prodotti: Set }
    const [errore, setErrore] = useState('')
    const [verificando, setVerificando] = useState(false)

    async function applica() {
        const codice = testo.trim().toUpperCase()
        if (!codice) return
        setVerificando(true)
        setErrore('')
        const ids = (prodottiIds ?? []).filter(Boolean)
        const { data, error } = await supabase.rpc('verifica_codice_sconto', { p_codice: codice, p_prodotti: ids })
        setVerificando(false)
        if (error) { setErrore('Non riesco a controllare il codice: riprova.'); return }
        if (!data?.valido) { setApplicato(null); setErrore(MOTIVI[data?.motivo] ?? MOTIVI.inesistente); return }
        setApplicato({ codice: data.codice, percentuale: Number(data.percentuale), prodotti: new Set(data.prodotti ?? []) })
    }

    function togli() {
        setApplicato(null)
        setTesto('')
        setErrore('')
    }

    return {
        testo, setTesto, applicato, errore, verificando, applica, togli,
        /** Il prezzo con lo sconto, o null se il codice non vale per quel prodotto. */
        prezzo(prodottoId, importo) {
            if (!applicato?.prodotti.has(prodottoId)) return null
            return Math.round(Number(importo) * (100 - applicato.percentuale)) / 100
        },
        /** Il codice da mandare alla cassa per quel prodotto (undefined se non vale). */
        campo(prodottoId) {
            return applicato?.prodotti.has(prodottoId) ? applicato.codice : undefined
        },
    }
}

/** Un prezzo, barrato col nuovo accanto quando c'è lo sconto. */
export function PrezzoScontato({ prezzo, scontato }) {
    if (scontato == null) return <>{formatPrezzo(prezzo)}</>
    return (
        <>
            <span className="line-through opacity-40 text-[0.6em] mr-2 align-middle">{formatPrezzo(prezzo)}</span>
            {formatPrezzo(scontato)}
        </>
    )
}

// «su Piano Personale Plus e Piano Personale Pro»
function elenco(nomi) {
    return nomi.length < 2 ? nomi.join('') : `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}`
}

/**
 * Il campo del codice, con «Richiedi il tuo codice». `nomi` (id → nome dei prodotti della pagina) fa dire, una
 * volta applicato, su cosa vale (28-10-2026).
 */
export default function CodiceSconto({ sconto, perProdotto, nomi, className = '' }) {
    const { profile } = useAuth()
    const nuovoTicket = profile?.role === 'user' ? '/area/assistenza/nuovo' : '/assistenza/nuovo'
    const richiesta = new URLSearchParams({
        oggetto: 'Richiesta codice sconto',
        messaggio: `Buongiorno, vorrei ricevere un codice sconto${perProdotto ? ` per «${perProdotto}»` : ''}. Grazie.`,
    })

    if (sconto.applicato) {
        return (
            <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
                <p className="flex items-center gap-2 font-body text-xs text-salvia">
                    <Tag size={13} className="shrink-0" />
                    <span>
                        Codice <strong className="tracking-wider">{sconto.applicato.codice}</strong> applicato:
                        sconto del {sconto.applicato.percentuale.toLocaleString('it-IT')}%
                        {nomi && (() => {
                            const tutti = Object.keys(nomi)
                            const validi = tutti.filter(id => sconto.applicato.prodotti.has(id))
                            if (!validi.length) return null
                            return validi.length === tutti.length
                                ? ' su tutti gli acquisti di questa pagina'
                                : ` su ${elenco(validi.map(id => nomi[id]))}`
                        })()}
                    </span>
                </p>
                <button onClick={sconto.togli} className="font-body text-xs text-nebbia/40 hover:text-nebbia transition-colors">
                    Togli il codice
                </button>
            </div>
        )
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex gap-2">
                <input
                    value={sconto.testo}
                    onChange={e => sconto.setTesto(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') sconto.applica() }}
                    placeholder="Codice sconto"
                    aria-label="Codice sconto"
                    maxLength={30}
                    className="flex-1 min-w-0 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25 tracking-wider uppercase"
                />
                <button
                    onClick={sconto.applica}
                    disabled={!sconto.testo.trim() || sconto.verificando}
                    className="btn-secondary text-sm shrink-0 disabled:opacity-40"
                >
                    {sconto.verificando ? <Loader2 size={14} className="animate-spin" /> : 'Applica'}
                </button>
            </div>
            {sconto.errore && <p className="font-body text-xs text-red-400">{sconto.errore}</p>}
            <Link to={`${nuovoTicket}?${richiesta}`} className="inline-block font-body text-xs text-oro hover:text-oro/70 transition-colors">
                Richiedi il tuo codice
            </Link>
        </div>
    )
}
