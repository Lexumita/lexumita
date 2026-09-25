// src/components/avvocato/RispostaLexClienti.jsx
//
// Renderizza la risposta di lex-assistente-studio con typing
// progressivo carattere per carattere. I segmenti {{cliente:UUID}}
// vengono renderizzati come link quando il typing li raggiunge.

import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Building2, User } from 'lucide-react'

function nomeCliente(c) {
    if (!c) return '—'
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

const REGEX_CLIENTE = /\{\{cliente:([a-f0-9-]+)\}\}/gi
const TYPE_SPEED_MS = 12 // velocita streaming: 12ms per "unita"

export default function RispostaLexClienti({ risposta, clientiMenzionati, clientiMap }) {
    // Spezza la stringa in segmenti (testo / cliente). Ogni segmento ha un
    // "weight": il testo pesa quanto i suoi caratteri, il cliente pesa
    // come il numero di caratteri del nome che andra a visualizzare.
    const segmenti = useMemo(() => {
        if (!risposta) return []
        const out = []
        let lastIndex = 0
        let match
        const regex = new RegExp(REGEX_CLIENTE)

        while ((match = regex.exec(risposta)) !== null) {
            if (match.index > lastIndex) {
                const t = risposta.slice(lastIndex, match.index)
                out.push({ tipo: 'testo', contenuto: t, weight: t.length })
            }
            const cli = clientiMap?.[match[1]]
            const nome = nomeCliente(cli)
            out.push({ tipo: 'cliente', id: match[1], weight: Math.max(nome.length, 6) })
            lastIndex = match.index + match[0].length
        }
        if (lastIndex < risposta.length) {
            const t = risposta.slice(lastIndex)
            out.push({ tipo: 'testo', contenuto: t, weight: t.length })
        }
        return out
    }, [risposta, clientiMap])

    const totalWeight = useMemo(
        () => segmenti.reduce((acc, s) => acc + s.weight, 0),
        [segmenti]
    )

    // Posizione del typing in "weight units"
    const [pos, setPos] = useState(0)

    // Reset quando arriva una nuova risposta
    useEffect(() => {
        setPos(0)
    }, [risposta])

    // Tick di typing
    useEffect(() => {
        if (pos >= totalWeight) return
        const timeoutId = setTimeout(() => {
            setPos(p => Math.min(p + 1, totalWeight))
        }, TYPE_SPEED_MS)
        return () => clearTimeout(timeoutId)
    }, [pos, totalWeight])

    // Rendering progressivo: consuma il "budget" di pos sui segmenti
    const renderedSegmenti = useMemo(() => {
        let budget = pos
        const out = []

        for (let i = 0; i < segmenti.length; i++) {
            const seg = segmenti[i]
            if (budget <= 0) break

            if (seg.tipo === 'testo') {
                const visibleLen = Math.min(seg.contenuto.length, budget)
                out.push({ ...seg, visibleText: seg.contenuto.slice(0, visibleLen) })
                budget -= visibleLen
            } else {
                // cliente: appare solo quando ha "consumato" tutto il suo weight
                if (budget >= seg.weight) {
                    out.push({ ...seg, visible: true })
                    budget -= seg.weight
                } else {
                    // ancora in fase di "scrittura" del nome cliente: niente da mostrare
                    budget = 0
                    break
                }
            }
        }
        return out
    }, [pos, segmenti])

    const typingDone = pos >= totalWeight
    const showCursor = !typingDone && pos > 0

    if (!risposta) return null

    return (
        <div className="bg-petrolio/40 border border-salvia/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-salvia" />
                <p className="font-body text-[10px] font-medium text-salvia uppercase tracking-widest">Risposta di Lex</p>
            </div>

            <p className="font-body text-sm text-nebbia/80 leading-relaxed">
                {renderedSegmenti.map((seg, i) => {
                    if (seg.tipo === 'testo') {
                        return <span key={i}>{seg.visibleText}</span>
                    }
                    // seg.tipo === 'cliente'
                    const cli = clientiMap?.[seg.id]
                    if (!cli) {
                        return <span key={i} className="text-nebbia/40 italic">cliente non disponibile</span>
                    }
                    return (
                        <Link
                            key={i}
                            to={`/clienti/${seg.id}`}
                            className="inline-flex items-center gap-1 text-oro hover:text-oro/80 underline decoration-oro/30 hover:decoration-oro/60 transition-colors mx-0.5"
                        >
                            {cli.tipo_soggetto === 'persona_giuridica'
                                ? <Building2 size={10} />
                                : <User size={10} />
                            }
                            {nomeCliente(cli)}
                        </Link>
                    )
                })}
                {showCursor && (
                    <span className="inline-block w-[1px] h-3.5 bg-salvia/70 ml-[1px] animate-pulse align-middle" />
                )}
            </p>

            {/* Lista clienti menzionati (appare solo a typing completato) */}
            {typingDone && clientiMenzionati && clientiMenzionati.length > 3 && (
                <div className="pt-3 border-t border-salvia/10 animate-[fadeIn_0.4s_ease-out]">
                    <p className="font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-2">
                        Clienti citati ({clientiMenzionati.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {clientiMenzionati.map(id => {
                            const cli = clientiMap?.[id]
                            if (!cli) return null
                            return (
                                <Link
                                    key={id}
                                    to={`/clienti/${id}`}
                                    className="inline-flex items-center gap-1 font-body text-xs text-nebbia/70 bg-petrolio border border-white/10 px-2 py-1 hover:border-oro/40 hover:text-oro transition-colors"
                                >
                                    {cli.tipo_soggetto === 'persona_giuridica'
                                        ? <Building2 size={9} />
                                        : <User size={9} />
                                    }
                                    {nomeCliente(cli)}
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Trasparenza AI: art. 50 AI Act, art. 13 L. 132/2025 */}
            {typingDone && (
                <p className="pt-2 border-t border-white/5 font-body text-xs lg:text-[11px] text-nebbia/35 leading-relaxed">
                    Contenuto generato con intelligenza artificiale. Lex può commettere errori:
                    verifica sempre i dati prima dell'uso professionale.
                </p>
            )}
        </div>
    )
}