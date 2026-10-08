// src/components/CompilaDocumentoLex.jsx
//
// 08-10-2026: «Compila con i dati di una pratica» (avvocati) e «di un mandato» (commercialisti) per i
// documenti scritti da Lex. Si sceglie la pratica o il mandato; il sito legge i dati con l'accesso
// dell'utente, la funzione lex-compila-documento dice quali segnaposto si completano con quali dati
// (senza vederne i valori) e qui si mettono i valori. Dentro una pratica la scelta non serve:
// `praticaCorrente` è già quella.

import { useEffect, useMemo, useState } from 'react'
import { FolderInput, Loader2, Search, X } from 'lucide-react'
import { sanitizzaErrore } from '@/lib/sanitizzaErrore'
import { elencoPratiche, elencoMandati, datiPratica, datiMandato, abbinaSegnaposti, nomeCliente } from '@/lib/documento/caricaDatiCompilazione'

const MSG_ERRORE = 'Non sono riuscito a compilare il documento. Riprova tra qualche istante.'

export default function CompilaDocumentoLex({ ruolo, profilo, numerati, segnaposti, praticaCorrente = null, onCompilato, classePulsante }) {
    const ambito = ruolo === 'commercialista' ? 'mandato' : 'pratica'
    const [aperto, setAperto] = useState(false)
    const [elenco, setElenco] = useState(null)
    const [cerca, setCerca] = useState('')
    const [lavoro, setLavoro] = useState(null)      // id della pratica o del mandato in compilazione
    const [errore, setErrore] = useState('')
    const [avviso, setAvviso] = useState('')

    useEffect(() => {
        if (!aperto || elenco) return
        let vivo = true
        ;(ambito === 'mandato' ? elencoMandati() : elencoPratiche())
            .then((righe) => { if (vivo) setElenco(righe) })
            .catch((e) => { if (vivo) { setErrore(sanitizzaErrore(e, MSG_ERRORE) ?? MSG_ERRORE); setElenco([]) } })
        return () => { vivo = false }
    }, [aperto, elenco, ambito])

    const visibili = useMemo(() => {
        const q = cerca.trim().toLowerCase()
        const righe = elenco ?? []
        return q ? righe.filter((r) => `${r.titolo ?? ''} ${nomeCliente(r.cliente)}`.toLowerCase().includes(q)) : righe
    }, [elenco, cerca])

    async function compila(voce) {
        setErrore('')
        setAvviso('')
        setLavoro(voce.id)
        try {
            const dati = ambito === 'mandato' ? await datiMandato(voce.id, profilo) : await datiPratica(voce.id, profilo)
            const { valori, gruppi } = await abbinaSegnaposti({ ambito, numerati, segnaposti, dati })
            if (!gruppi.length) {
                setAvviso(`Nessun dato ${ambito === 'mandato' ? 'del mandato' : 'della pratica'} «${voce.titolo}» corrisponde ai dati da completare di questo documento.`)
                return
            }
            onCompilato({ valori, gruppi, origine: { ambito, id: voce.id, titolo: voce.titolo } })
            setAperto(false)
        } catch (e) {
            setErrore(sanitizzaErrore(e, MSG_ERRORE) ?? MSG_ERRORE)
        } finally {
            setLavoro(null)
        }
    }

    const icona = (attivo) => (attivo ? <Loader2 size={12} className="animate-spin" /> : <FolderInput size={12} />)
    const messaggi = (
        <>
            {lavoro && <p className="font-body text-xs text-nebbia/50">Leggo i dati e li inserisco nel documento: di solito bastano pochi secondi.</p>}
            {avviso && <p className="font-body text-xs text-nebbia/60">{avviso}</p>}
            {errore && <p className="font-body text-xs text-red-400/80">{errore}</p>}
        </>
    )

    // Dentro la pratica: un solo pulsante, nessuna scelta
    if (praticaCorrente) {
        return (
            <div className="space-y-1.5">
                <button type="button" onClick={() => compila(praticaCorrente)} disabled={!!lavoro} className={classePulsante}>
                    {icona(!!lavoro)} Compila con i dati di questa pratica
                </button>
                {messaggi}
            </div>
        )
    }

    return (
        <div className="space-y-1.5">
            <button type="button" onClick={() => setAperto((v) => !v)} disabled={!!lavoro} className={classePulsante}>
                {icona(!!lavoro)} {ambito === 'mandato' ? 'Compila con i dati di un mandato' : 'Compila con i dati di una pratica'}
            </button>
            {aperto && (
                <div className="border border-white/10 bg-petrolio/40 p-3 space-y-2 max-w-xl">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 border border-white/10 px-2 py-1">
                            <Search size={12} className="text-nebbia/40" />
                            <input
                                value={cerca}
                                onChange={(e) => setCerca(e.target.value)}
                                placeholder={ambito === 'mandato' ? 'Cerca mandato o cliente...' : 'Cerca pratica o cliente...'}
                                className="flex-1 bg-transparent font-body text-xs text-nebbia placeholder:text-nebbia/30 outline-none"
                            />
                        </div>
                        <button type="button" onClick={() => setAperto(false)} aria-label="Chiudi" className="text-nebbia/40 hover:text-oro">
                            <X size={14} />
                        </button>
                    </div>
                    <p className="font-body text-[11px] text-nebbia/40">
                        Inserisco i tuoi dati, quelli del cliente{ambito === 'pratica' ? ', delle controparti e dell\'udienza' : ''}: li vedrai in verde, da controllare prima di firmare.
                    </p>
                    {elenco === null ? (
                        <p className="flex items-center gap-1.5 font-body text-xs text-nebbia/50"><Loader2 size={12} className="animate-spin" /> Carico...</p>
                    ) : visibili.length === 0 ? (
                        <p className="font-body text-xs text-nebbia/50">
                            {cerca ? 'Nessun risultato.' : ambito === 'mandato' ? 'Non hai ancora mandati.' : 'Non hai ancora pratiche.'}
                        </p>
                    ) : (
                        <ul className="max-h-64 overflow-y-auto divide-y divide-white/5">
                            {visibili.map((r) => (
                                <li key={r.id}>
                                    <button type="button" onClick={() => compila(r)} disabled={!!lavoro}
                                        className="w-full text-left px-2 py-1.5 hover:bg-white/5 disabled:opacity-50 flex items-center gap-2">
                                        <span className="flex-1 min-w-0">
                                            <span className="block font-body text-xs text-nebbia/80 truncate">{r.titolo || 'Senza titolo'}</span>
                                            <span className="block font-body text-[11px] text-nebbia/40 truncate">
                                                {[nomeCliente(r.cliente), r.anno_riferimento, r.stato].filter(Boolean).join(' · ')}
                                            </span>
                                        </span>
                                        {lavoro === r.id && <Loader2 size={12} className="animate-spin text-oro shrink-0" />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            {messaggi}
        </div>
    )
}
