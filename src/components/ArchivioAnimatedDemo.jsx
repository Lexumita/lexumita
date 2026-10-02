import { useEffect, useRef, useState } from 'react'
import { Check, FileText, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * ArchivioAnimatedDemo — versione fluida (~10 sec totali)
 * ────────────────────────────────────────────────────────
 * Sezione 3.4 della Home — Documentale + Archivio.
 * 
 *  • SINISTRA: 3 file pre-completati statici + 3 con barra di progresso
 *    che si riempiono con easing naturale (easeInOutCubic) in tempi 
 *    sfalsati, ognuna diventa "Completato" a 100% con transizione
 *    morbida.
 *  • DESTRA: input vuoto → typing organico "Rossi 2024" con micro-pause
 *    casuali → press del bottone CERCA con conferma visiva → appaiono 
 *    in sequenza 2 risultati con fade-in lento dal basso.
 * 
 * IntersectionObserver al 25% di soglia. One-shot.
 */

// Le parole (nomi dei file, query, risultati) stanno in public/locales/it/archivio_demo.json.
const TYPE_SPEED_BASE = 95   // ms medi per carattere
const TYPE_SPEED_VAR = 50    // variazione casuale ±

// ── Timeline globale (ms dall'avvio) — totale ~10 secondi ──────
const T_BAR_CONTRATTO_START = 800
const T_BAR_CONTRATTO_END = 4200    // ~3.4s di riempimento

const T_BAR_CONTRATTO_2_START = 2200
const T_BAR_CONTRATTO_2_END = 4800

const T_BAR_DIFFIDA_START = 3600
const T_BAR_DIFFIDA_END = 8800    // ~5.2s

// Destra
const T_TYPING_START = 1000
const T_PAUSA_PRE_PRESS = 800
const T_BUTTON_PRESS_DUR = 280
const T_PAUSA_PRE_RISULTATI = 700
const T_GAP_RISULTATI = 500

const T_END = 9800

// ── Easing naturale: easeInOutCubic ─────────────────────────────
const easeInOutCubic = (t) => {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// ── Componenti ─────────────────────────────────────────────────

const StaticCompleted = ({ filename }) => {
    const { t } = useTranslation('archivio_demo')
    return (
    <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center border border-salvia/20 bg-salvia/10 shrink-0">
            <Check size={12} className="text-salvia" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-body text-xs text-nebbia/70 truncate">{filename}</p>
            <p className="font-body text-[10px] text-nebbia/30">{t('caricamento.caricato_in')}</p>
        </div>
        <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/10 border border-salvia/20 text-salvia/80 uppercase tracking-widest shrink-0">
            {t('caricamento.completato')}
        </span>
    </div>
    )
}

const AnimatedBar = ({ filename, fromPct, started, completed, currentPct }) => {
    const { t } = useTranslation('archivio_demo')
    if (completed) {
        return (
            <div className="flex items-center gap-3 transition-all duration-700 ease-out">
                <div className="w-8 h-8 flex items-center justify-center border border-salvia/20 bg-salvia/10 shrink-0 transition-colors duration-700">
                    <Check size={12} className="text-salvia" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-body text-xs text-nebbia/70 truncate">{filename}</p>
                    <p className="font-body text-[10px] text-nebbia/30">{t('caricamento.caricato_in')}</p>
                </div>
                <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/10 border border-salvia/20 text-salvia/80 uppercase tracking-widest shrink-0">
                    {t('caricamento.completato')}
                </span>
            </div>
        )
    }

    const pct = started ? currentPct : fromPct

    return (
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center border border-oro/20 bg-oro/5 shrink-0">
                <FileText size={12} className="text-oro" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-body text-xs text-nebbia/70 truncate">{filename}</p>
                <div className="h-1 bg-petrolio mt-1 overflow-hidden">
                    <div
                        className="h-full bg-oro/60"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
            <span className="font-body text-[10px] text-nebbia/40 shrink-0 tabular-nums">
                {Math.round(pct)}%
            </span>
        </div>
    )
}

export default function ArchivioAnimatedDemo() {
    const { t } = useTranslation('archivio_demo')
    const SEARCH_QUERY = t('ricerca.query')
    const sectionRef = useRef(null)
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

    // ── Typing organico con velocità variabile ────────────────────
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
                        // Typing finito — registra il `now` corrente come timestamp di riferimento
                        // per gli eventi successivi (press, risultati)
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

    // Riferimento allo start time per il typing (deve coincidere col tick)
    const startTimeRef = useRef(null)
    useEffect(() => {
        if (started && !startTimeRef.current) {
            startTimeRef.current = performance.now()
        }
    }, [started])

    // ── Stati derivati ────────────────────────────────────────────
    const computeBarPct = (fromPct, tStart, tEnd) => {
        if (now < tStart) return fromPct
        if (now >= tEnd) return 100
        const progress = (now - tStart) / (tEnd - tStart)
        const eased = easeInOutCubic(progress)
        return fromPct + (100 - fromPct) * eased
    }

    const contrattoLocPct = computeBarPct(64, T_BAR_CONTRATTO_START, T_BAR_CONTRATTO_END)
    const contrattoPct = computeBarPct(90, T_BAR_CONTRATTO_2_START, T_BAR_CONTRATTO_2_END)
    const diffidaPct = computeBarPct(28, T_BAR_DIFFIDA_START, T_BAR_DIFFIDA_END)

    const contrattoLocCompleted = now >= T_BAR_CONTRATTO_END
    const contrattoCompleted = now >= T_BAR_CONTRATTO_2_END
    const diffidaCompleted = now >= T_BAR_DIFFIDA_END

    // Eventi destra: tutti relativi al momento in cui finisce il typing
    const sinceTypingDone = typingDoneTimestamp !== null ? now - typingDoneTimestamp : 0
    const typingDone = typingDoneTimestamp !== null

    const buttonPressed = typingDone &&
        sinceTypingDone >= T_PAUSA_PRE_PRESS &&
        sinceTypingDone < T_PAUSA_PRE_PRESS + T_BUTTON_PRESS_DUR

    const result1Visible = typingDone &&
        sinceTypingDone >= T_PAUSA_PRE_PRESS + T_BUTTON_PRESS_DUR + T_PAUSA_PRE_RISULTATI

    const result2Visible = typingDone &&
        sinceTypingDone >= T_PAUSA_PRE_PRESS + T_BUTTON_PRESS_DUR + T_PAUSA_PRE_RISULTATI + T_GAP_RISULTATI

    // Cursore lampeggiante durante il typing (e brevemente prima di iniziare)
    const isTyping = started && now >= T_TYPING_START && !typingDone
    const showCursor = isTyping || (started && now >= T_TYPING_START - 200 && now < T_TYPING_START + 200)

    return (
        <div ref={sectionRef} className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">

            {/* ═══════════════════════════════════════════════════════
          SINISTRA — Caricamento file
          ═══════════════════════════════════════════════════════ */}
            <div className="bg-slate border border-white/5 p-4">
                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-3">
                    {t('caricamento.titolo')}
                </p>
                <div className="space-y-2.5">
                    <StaticCompleted filename={t('caricamento.file.curriculum')} />

                    <AnimatedBar
                        filename={t('caricamento.file.contratto_locazione')}
                        fromPct={64}
                        started={started && now >= T_BAR_CONTRATTO_START}
                        completed={contrattoLocCompleted}
                        currentPct={contrattoLocPct}
                    />

                    <AnimatedBar
                        filename={t('caricamento.file.contratto')}
                        fromPct={90}
                        started={started && now >= T_BAR_CONTRATTO_2_START}
                        completed={contrattoCompleted}
                        currentPct={contrattoPct}
                    />

                    <StaticCompleted filename={t('caricamento.file.perizia')} />

                    <AnimatedBar
                        filename={t('caricamento.file.diffida')}
                        fromPct={28}
                        started={started && now >= T_BAR_DIFFIDA_START}
                        completed={diffidaCompleted}
                        currentPct={diffidaPct}
                    />

                    <StaticCompleted filename={t('caricamento.file.statuto')} />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
          DESTRA — Ricerca nell'archivio
          ═══════════════════════════════════════════════════════ */}
            <div className="bg-slate border border-white/5 p-4">
                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-3">
                    {t('ricerca.titolo')}
                </p>

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
                        {t('ricerca.pulsante')}
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
                                    {t('ricerca.risultato_1.file')}
                                </p>
                                <p className="font-body text-[10px] text-nebbia/35 leading-relaxed">
                                    {t('ricerca.risultato_1.estratto')}
                                </p>
                                <div className="flex gap-1 mt-2 flex-wrap">
                                    <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">
                                        {t('ricerca.risultato_1.tag_pratica')}
                                    </span>
                                    <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">
                                        {t('ricerca.risultato_1.tag_categoria')}
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
                                    {t('ricerca.risultato_2.file')}
                                </p>
                                <p className="font-body text-[10px] text-nebbia/35 leading-relaxed">
                                    {t('ricerca.risultato_2.estratto')}
                                </p>
                                <div className="flex gap-1 mt-2 flex-wrap">
                                    <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">
                                        {t('ricerca.risultato_2.tag_pratica')}
                                    </span>
                                    <span className="font-body text-[9px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/35">
                                        {t('ricerca.risultato_2.tag_categoria')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}