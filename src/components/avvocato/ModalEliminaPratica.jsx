// src/components/avvocato/ModalEliminaPratica.jsx
//
// Modal per eliminare una pratica con doppia conferma:
// 1. Avviso che operazione è irreversibile
// 2. Digitare il titolo esatto della pratica per confermare
//
// Gestisce errore 409 FATTURE_COLLEGATE mostrando elenco fatture
// e link a /fatturazione per scollegarle/eliminarle.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, X, AlertCircle, AlertTriangle, ExternalLink, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function fmtEUR(n) {
    const v = Number(n ?? 0)
    return v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STATO_LABEL = {
    bozza: 'Bozza',
    in_attesa: 'In attesa',
    scaduta: 'Scaduta',
    pagata: 'Pagata',
    annullata: 'Annullata',
}

export default function ModalEliminaPratica({ pratica, onClose, onEliminata }) {
    const [conferma, setConferma] = useState('')
    const [inviando, setInviando] = useState(false)
    const [errore, setErrore] = useState('')
    const [fattureBlock, setFattureBlock] = useState(null)

    const matchEsatto = conferma.trim() === pratica.titolo
    const titoloMostrato = pratica.titolo

    async function elimina() {
        if (!matchEsatto) return
        setErrore('')
        setFattureBlock(null)
        setInviando(true)

        try {
            const { data, error } = await supabase.functions.invoke('elimina-pratica', {
                body: { pratica_id: pratica.id }
            })

            if (error) {
                // FunctionsHttpError: la risposta 4xx/5xx finisce qui
                // Proviamo a leggere il body comunque
                let body = null
                try { body = await error.context?.json?.() } catch (_) { }

                if (body?.code === 'FATTURE_COLLEGATE') {
                    setFattureBlock(body.meta?.fatture ?? [])
                    return
                }
                throw new Error(body?.error ?? error.message)
            }

            if (!data?.ok) {
                if (data?.code === 'FATTURE_COLLEGATE') {
                    setFattureBlock(data.meta?.fatture ?? [])
                    return
                }
                throw new Error(data?.error ?? 'Errore eliminazione')
            }

            onEliminata()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setInviando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate border border-red-500/30 w-full max-w-lg max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/8 shrink-0">
                    <div className="flex items-center gap-2">
                        <Trash2 size={16} className="text-red-400" />
                        <h2 className="font-display text-lg text-nebbia">Elimina pratica</h2>
                    </div>
                    <button onClick={onClose} disabled={inviando} className="text-nebbia/40 hover:text-nebbia disabled:opacity-40">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto">

                    {/* Caso BLOCCO: fatture collegate */}
                    {fattureBlock ? (
                        <>
                            <div className="bg-amber-900/15 border border-amber-500/30 p-4">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-body text-sm text-amber-400 leading-relaxed mb-1">
                                            <span className="font-semibold">Impossibile eliminare la pratica</span>
                                        </p>
                                        <p className="font-body text-xs text-amber-400/80 leading-relaxed">
                                            Ci sono {fattureBlock.length} fatture collegate. Per eliminare la pratica
                                            devi prima scollegare o eliminare queste fatture da Fatturazione.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest">Fatture collegate</p>
                                {fattureBlock.map(f => (
                                    <Link
                                        key={f.id}
                                        to={`/fatturazione/${f.id}`}
                                        className="flex items-center justify-between gap-3 p-3 bg-petrolio/40 border border-white/5 hover:border-oro/30 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <FileText size={13} className="text-nebbia/30 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-body text-sm text-nebbia">{f.numero}</p>
                                                <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                                    {STATO_LABEL[f.stato] ?? f.stato} · EUR {fmtEUR(f.totale_lordo)}
                                                </p>
                                            </div>
                                        </div>
                                        <ExternalLink size={12} className="text-nebbia/30 group-hover:text-oro transition-colors shrink-0" />
                                    </Link>
                                ))}
                            </div>

                            <div className="bg-petrolio/40 border border-white/5 p-3">
                                <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                                    <span className="text-nebbia/70">Suggerimento:</span> apri ciascuna fattura,
                                    usa il pulsante <span className="text-oro">Scollega</span> nel box destinatario,
                                    poi torna qui e riprova.
                                </p>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={onClose}
                                    className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5"
                                >
                                    Chiudi
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Caso NORMALE: conferma eliminazione */
                        <>
                            <div className="bg-red-900/15 border border-red-500/30 p-4">
                                <p className="font-body text-sm text-red-400 leading-relaxed mb-2">
                                    <span className="font-semibold">Operazione irreversibile.</span>
                                </p>
                                <p className="font-body text-xs text-red-400/80 leading-relaxed">
                                    Saranno cancellati definitivamente: la pratica, le udienze e i termini processuali,
                                    le controparti, le ricerche salvate, i documenti caricati nella pratica
                                    e gli appuntamenti collegati.
                                </p>
                                <p className="font-body text-xs text-red-400/80 leading-relaxed mt-2">
                                    I documenti dell'<span className="font-semibold">Archivio dello studio</span> resteranno
                                    al loro posto: verrà rimosso solo il collegamento a questa pratica.
                                </p>
                            </div>

                            <p className="font-body text-sm text-nebbia/60">
                                Per confermare digita il titolo esatto della pratica:
                            </p>
                            <p className="font-body text-base font-semibold text-oro break-words">{titoloMostrato}</p>

                            <input
                                value={conferma}
                                onChange={e => setConferma(e.target.value)}
                                placeholder={titoloMostrato}
                                autoFocus
                                disabled={inviando}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25 disabled:opacity-40"
                            />

                            {errore && (
                                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                                    <AlertCircle size={14} /> {errore}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={onClose}
                                    disabled={inviando}
                                    className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={elimina}
                                    disabled={!matchEsatto || inviando}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/15 border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    {inviando
                                        ? <span className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" />
                                        : <><Trash2 size={14} /> Elimina definitivamente</>
                                    }
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}