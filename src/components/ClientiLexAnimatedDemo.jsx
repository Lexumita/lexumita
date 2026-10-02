import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'

/**
 * ClientiLexAnimatedDemo
 * ────────────────────────────────────────────────────────
 * Home — Sezione "Funzionalita" — blocco Agente clienti.
 *
 * Chat conversazionale: typing della domanda, spinner, poi typing
 * progressivo della risposta di Lex come fa la chat vera in streaming.
 *
 * IntersectionObserver con threshold + rootMargin centrale.
 * One-shot. ~9s totale.
 */

const DOMANDA = 'Fammi un resoconto sul cliente Mario Rossi.'

// Risposta segmentata: ogni elemento e una sezione che si scrive in sequenza.
// type='text' = testo normale, type='strong' = testo evidenziato, type='alert' = rosso, type='break' = nuovo paragrafo
const RISPOSTA = [
    { type: 'strong', text: 'Mario Rossi' },
    { type: 'text', text: ' e cliente dal ' },
    { type: 'strong', text: '14 marzo 2024' },
    { type: 'text', text: '. Ha 3 pratiche: 2 chiuse (locazione e successione) e una aperta dall agosto 2025 sulla causa civile in materia di locazione.' },
    { type: 'break', text: '' },
    { type: 'text', text: 'Hai fatturato ' },
    { type: 'strong', text: '8.450 €' },
    { type: 'text', text: ' e incassato ' },
    { type: 'strong', text: '7.350 €' },
    { type: 'text', text: '. Resta in attesa la fattura 2026/041 da ' },
    { type: 'alert', text: '1.100 €, scaduta da 42 giorni' },
    { type: 'text', text: '.' },
    { type: 'break', text: '' },
    { type: 'text', text: 'Prossimi impegni: udienza il ' },
    { type: 'strong', text: '28/05/2026' },
    { type: 'text', text: ' al Tribunale di Milano e appuntamento il 22/05/2026 alle 15:00.' },
    { type: 'break', text: '' },
    { type: 'italic', text: 'Ti suggerisco di sollecitare la fattura prima dell udienza.' },
]

// Lunghezza totale per calcolo durata
const RISPOSTA_TOTAL_CHARS = RISPOSTA.reduce((acc, s) => acc + s.text.length, 0)

// ── Velocita typing ─────────────────────────────────────
const TYPE_SPEED_BASE_DOMANDA = 50
const TYPE_SPEED_VAR_DOMANDA = 25
const TYPE_SPEED_RISPOSTA = 15  // piu veloce, come streaming AI

// ── Timeline (ms dall'avvio) ─────────────────────────────
const T_TYPING_START = 600
const T_PAUSA_PRE_SUBMIT = 500
const T_LOADER_DUR = 1200

// Durata stimata del typing della risposta
const T_RISPOSTA_DURATION = RISPOSTA_TOTAL_CHARS * TYPE_SPEED_RISPOSTA

const T_END = T_TYPING_START
    + DOMANDA.length * (TYPE_SPEED_BASE_DOMANDA + 10)
    + T_PAUSA_PRE_SUBMIT
    + T_LOADER_DUR
    + T_RISPOSTA_DURATION
    + 800

export default function ClientiLexAnimatedDemo() {
    const sectionRef = useRef(null)
    const startTimeRef = useRef(null)
    const [started, setStarted] = useState(false)
    const [now, setNow] = useState(0)
    const [typedDomanda, setTypedDomanda] = useState('')
    const [domandaDoneTimestamp, setDomandaDoneTimestamp] = useState(null)
    const [rispostaCharIndex, setRispostaCharIndex] = useState(0)

    // ── IntersectionObserver ────────────────────────────────
    useEffect(() => {
        if (!sectionRef.current || started) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !started) {
                    setStarted(true)
                    observer.disconnect()
                }
            },
            {
                threshold: 0.4,
                rootMargin: '-120px 0px -120px 0px'
            }
        )
        observer.observe(sectionRef.current)
        return () => observer.disconnect()
    }, [started])

    // ── startTime ───────────────────────────────────────────
    useEffect(() => {
        if (started && !startTimeRef.current) {
            startTimeRef.current = performance.now()
        }
    }, [started])

    // ── Tick globale ────────────────────────────────────────
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

    // ── Typing DOMANDA (utente) ─────────────────────────────
    useEffect(() => {
        if (!started) return
        let timeoutId
        let cancelled = false

        const startTyping = () => {
            let i = 0
            const typeChar = () => {
                if (cancelled) return
                if (i <= DOMANDA.length) {
                    setTypedDomanda(DOMANDA.slice(0, i))
                    i++
                    if (i <= DOMANDA.length) {
                        const speed = TYPE_SPEED_BASE_DOMANDA + (Math.random() - 0.5) * TYPE_SPEED_VAR_DOMANDA * 2
                        const isSpace = DOMANDA[i - 1] === ' '
                        const delay = isSpace ? speed * 1.6 : speed
                        timeoutId = setTimeout(typeChar, delay)
                    } else {
                        const elapsed = performance.now() - startTimeRef.current
                        setDomandaDoneTimestamp(elapsed)
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

    // ── Stati derivati ──────────────────────────────────────
    const sinceDomandaDone = domandaDoneTimestamp !== null ? now - domandaDoneTimestamp : 0
    const domandaDone = domandaDoneTimestamp !== null

    const loaderVisible = domandaDone &&
        sinceDomandaDone >= T_PAUSA_PRE_SUBMIT &&
        sinceDomandaDone < T_PAUSA_PRE_SUBMIT + T_LOADER_DUR

    const rispostaShouldStart = domandaDone && sinceDomandaDone >= T_PAUSA_PRE_SUBMIT + T_LOADER_DUR
    const rispostaVisible = rispostaShouldStart

    // ── Typing RISPOSTA (Lex) ───────────────────────────────
    useEffect(() => {
        if (!rispostaShouldStart) return
        if (rispostaCharIndex >= RISPOSTA_TOTAL_CHARS) return

        const timeoutId = setTimeout(() => {
            setRispostaCharIndex(prev => Math.min(prev + 1, RISPOSTA_TOTAL_CHARS))
        }, TYPE_SPEED_RISPOSTA)

        return () => clearTimeout(timeoutId)
    }, [rispostaShouldStart, rispostaCharIndex])

    // ── Helper: rendering risposta progressivo ──────────────
    const renderRisposta = () => {
        let charsRemaining = rispostaCharIndex
        const elements = []

        for (let i = 0; i < RISPOSTA.length; i++) {
            const segment = RISPOSTA[i]

            if (segment.type === 'break') {
                if (charsRemaining > 0 || elements.length > 0) {
                    elements.push(<div key={`br-${i}`} className="h-2" />)
                }
                continue
            }

            if (charsRemaining <= 0) break

            const visibleText = segment.text.slice(0, charsRemaining)
            charsRemaining -= visibleText.length

            let className = ''
            switch (segment.type) {
                case 'strong': className = 'text-nebbia/85'; break
                case 'alert': className = 'text-red-400/80'; break
                case 'italic': className = 'text-salvia/75 italic'; break
                default: className = 'text-nebbia/65'
            }

            elements.push(
                <span key={i} className={className}>{visibleText}</span>
            )
        }

        return elements
    }

    // ── Cursori ─────────────────────────────────────────────
    const isTypingDomanda = started && now >= T_TYPING_START && !domandaDone
    const showCursorDomanda = isTypingDomanda || (started && now >= T_TYPING_START - 200 && now < T_TYPING_START + 200)

    const rispostaTypingInProgress = rispostaVisible && rispostaCharIndex < RISPOSTA_TOTAL_CHARS
    const showCursorRisposta = rispostaTypingInProgress

    return (
        <div ref={sectionRef} className="bg-slate border border-salvia/15 overflow-hidden h-full flex flex-col">
            {/* Header finestra */}
            <div className="px-4 py-2.5 border-b border-white/5 bg-petrolio/40 flex items-center gap-2">
                <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>
                <span className="font-body text-xs text-nebbia/25 ml-2">Lex AI</span>
            </div>

            <div className="p-5 space-y-3 flex-1 min-h-[260px]">

                {/* Bubble utente */}
                <div className="flex justify-end">
                    <div className="max-w-[85%] bg-petrolio/60 border border-white/5 px-3.5 py-2.5">
                        <span className="font-body text-xs text-nebbia/70 leading-relaxed">
                            {typedDomanda}
                            {showCursorDomanda && (
                                <span className="inline-block w-[1px] h-3 bg-nebbia/70 ml-[1px] animate-pulse align-middle" />
                            )}
                        </span>
                    </div>
                </div>

                {/* Loader */}
                {loaderVisible && (
                    <div className="flex">
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-salvia/5 border border-salvia/15">
                            <span className="animate-spin w-3 h-3 border border-salvia/40 border-t-salvia rounded-full" />
                            <span className="font-body text-xs text-salvia/60 italic">Lex sta analizzando...</span>
                        </div>
                    </div>
                )}

                {/* Risposta Lex - typing progressivo */}
                {rispostaVisible && (
                    <div className="flex">
                        <div className="max-w-[95%] bg-salvia/5 border border-salvia/15 px-3.5 py-3 space-y-1">
                            <p className="font-body text-xs text-salvia/80 font-medium flex items-center gap-1 mb-2">
                                <Sparkles size={10} /> Lex AI
                            </p>
                            <div className="font-body text-xs leading-relaxed">
                                {renderRisposta()}
                                {showCursorRisposta && (
                                    <span className="inline-block w-[1px] h-3 bg-salvia/70 ml-[1px] animate-pulse align-middle" />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}