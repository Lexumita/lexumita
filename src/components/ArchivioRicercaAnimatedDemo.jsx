import { useEffect, useRef, useState } from 'react'
import { FileText, Search } from 'lucide-react'

/**
 * ArchivioRicercaAnimatedDemo
 * ────────────────────────────────────────────────────────
 * Pagina PerAvvocati — Sezione 6 "Archivio intelligente".
 *
 * Animazione one-shot della card "Ricerca nell'archivio":
 *  • typing organico "Rossi 2024" con micro-pause casuali
 *  • pausa pensosa
 *  • press del bottone CERCA con conferma visiva
 *  • appaiono in sequenza 2 risultati con fade-in dal basso
 *
 * IntersectionObserver al 25% di soglia. Una volta partita, NON si
 * riavvia. Si ferma sullo stato finale.
 *
 * Durata totale: ~5.5 secondi.
 */

const SEARCH_QUERY = 'Rossi 2024'
const TYPE_SPEED_BASE = 95
const TYPE_SPEED_VAR = 50

// ── Timeline (ms dall'avvio) ───────────────────────────────────
const T_TYPING_START = 800
const T_PAUSA_PRE_PRESS = 800
const T_BUTTON_PRESS_DUR = 280
const T_PAUSA_PRE_RISULTATI = 700
const T_GAP_RISULTATI = 500

const T_END = 5500

export default function ArchivioRicercaAnimatedDemo() {
    const sectionRef = useRef(null)
    const startTimeRef = useRef(null)
    const [started, setStarted] = useState(false)
    const [now, setNow] = useState(0)
    const [typedText, setTypedText] = useState('')
    const [typingDoneTimestamp, setTypingDoneTimestamp] = useState(null)

    // ── IntersectionObserver ──────────────────────────────────────
    useEffect(() => {
        if (!sectionRef.current || started) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !started) {
                    setStarted(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.25 }
        )

        observer.observe(sectionRef.current)
        return () => observer.disconnect()
    }, [started])

    // ── Riferimento allo start time ───────────────────────────────
    useEffect(() => {
        if (started && !startTimeRef.current) {
            startTimeRef.current = performance.now()
        }
    }, [started])

    // ── Tick globale ──────────────────────────────────────────────
    useEffect(() => {
        if (!started) return

        const startTime = performance.now()
        let raf

        const tick = () => {
            const elapsed = performance.now() - startTime
            setNow(elapsed)

            if (elapsed < T_END) {
                raf = requestAnimationFrame(tick)
            } else {
                setNow(T_END)
            }
        }

        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [started])

    // ── Typing organico ───────────────────────────────────────────
    useEffect(() => {
        if (!started) return

        let timeoutId
        let cancelled = false

        const startTyping = () => {
            let i = 0
            const typeChar = () => {
                if (cancelled) return
                if (i <= SEARCH_QUERY.length) {
                    setTypedText(SEARCH_QUERY.slice(0, i))
                    i++
                    if (i <= SEARCH_QUERY.length) {
                        const speed = TYPE_SPEED_BASE + (Math.random() - 0.5) * TYPE_SPEED_VAR * 2
                        const isSpace = SEARCH_QUERY[i - 1] === ' '
                        const delay = isSpace ? speed * 1.8 : speed
                        timeoutId = setTimeout(typeChar, delay)
                    } else {
                        const elapsed = performance.now() - startTimeRef.current
                        setTypingDoneTimestamp(elapsed)
                    }
                }
            }
            typeChar()
        }

        timeoutId = setTimeout(startTyping, T_TYPING_START)
        return () => {
            cancelled = true
            clearTimeout(timeoutId)
        }
    }, [started])

    // ── Stati derivati ────────────────────────────────────────────
    const sinceTypingDone = typingDoneTimestamp !== null ? now - typingDoneTimestamp : 0
    const typingDone = typingDoneTimestamp !== null

    const buttonPressed = typingDone &&
        sinceTypingDone >= T_PAUSA_PRE_PRESS &&
        sinceTypingDone < T_PAUSA_PRE_PRESS + T_BUTTON_PRESS_DUR

    const result1Visible = typingDone &&
        sinceTypingDone >= T_PAUSA_PRE_PRESS + T_BUTTON_PRESS_DUR + T_PAUSA_PRE_RISULTATI

    const result2Visible = typingDone &&
        sinceTypingDone >= T_PAUSA_PRE_PRESS + T_BUTTON_PRESS_DUR + T_PAUSA_PRE_RISULTATI + T_GAP_RISULTATI

    const isTyping = started && now >= T_TYPING_START && !typingDone
    const showCursor = isTyping || (started && now >= T_TYPING_START - 200 && now < T_TYPING_START + 200)

    return (
        <div ref={sectionRef}>
            {/* Input + bottone */}
            <div className="flex items-center gap-2 px-3 py-2 bg-petrolio border border-oro/15 mb-3">
                <Search size={11} className="text-oro/60 shrink-0" />
                <span className="font-body text-xs text-nebbia/70 flex-1 min-h-[16px]">
                    {typedText}
                    {showCursor && (
                        <span className="inline-block w-[1px] h-3 bg-nebbia/70 ml-[1px] animate-pulse align-middle" />
                    )}
                </span>
                <button
                    className={`font-body text-[10px] px-2 py-1 border uppercase tracking-widest shrink-0 transition-all duration-300 ease-out ${buttonPressed
                            ? 'bg-oro/30 border-oro text-oro scale-95'
                            : 'bg-oro/10 border-oro/30 text-oro scale-100'
                        }`}
                >
                    Cerca
                </button>
            </div>

            {/* Risultati */}
            <div className="space-y-2 min-h-[160px]">
                <div
                    className={`bg-petrolio border border-salvia/15 p-3 transition-all duration-700 ease-out ${result1Visible
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-3 pointer-events-none'
                        }`}
                >
                    <div className="flex items-start gap-2.5">
                        <FileText size={12} className="text-salvia mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="font-body text-xs text-nebbia/70 mb-0.5 truncate">
                                Contratto_locazione_Rossi.pdf
                            </p>
                            <p className="font-body text-[10px] text-nebbia/35 leading-relaxed">
                                "...il presente contratto avra durata di 4+4 anni a partire dal 01/09/2024, con canone mensile di 1.200 €..."
                            </p>
                            <div className="flex gap-1 mt-2 flex-wrap">
                                <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">
                                    Pratica 2026/047
                                </span>
                                <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">
                                    Locazione
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className={`bg-petrolio border border-white/8 p-3 transition-all duration-700 ease-out ${result2Visible
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-3 pointer-events-none'
                        }`}
                >
                    <div className="flex items-start gap-2.5">
                        <FileText size={12} className="text-nebbia/40 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="font-body text-xs text-nebbia/70 mb-0.5 truncate">
                                Diffida_locatore_2024-11.pdf
                            </p>
                            <p className="font-body text-[10px] text-nebbia/35 leading-relaxed">
                                "...si invita il locatore alla risoluzione delle problematiche evidenziate nel contratto del 01/09/2024..."
                            </p>
                            <div className="flex gap-1 mt-2 flex-wrap">
                                <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">
                                    Pratica 2026/047
                                </span>
                                <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">
                                    Diffida
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}