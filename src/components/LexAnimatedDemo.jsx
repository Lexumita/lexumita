// LexAnimatedDemo.jsx
// Animazione one-shot (no loop): scrittura domanda -> risposta che si scrive -> azione.
// Parametrizzata per professione (variant): 'avvocato' | 'commercialista'.
// Transizioni morbide via CSS transition + fade incrociato.

import { useState, useEffect, useRef } from 'react'
import { Sparkles, FolderOpen, Tag } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// ─── Contenuti per professione ───
// Le parole stanno in public/locales/it/lex_ai.json: 'anim' (avvocato, più le etichette
// comuni) e 'anim_commercialista'. Qui resta solo la forma della risposta, legata per
// posizione ai blocchi del JSON (h2/p hanno 'text', list/chips hanno 'items').
const DEMOS = {
    avvocato: {
        prefix: 'anim',
        tipi: ['h2', 'p', 'p', 'h2', 'p', 'list', 'h2', 'p', 'chips'],
    },
    commercialista: {
        prefix: 'anim_commercialista',
        tipi: ['h2', 'p', 'h2', 'p', 'list', 'h2', 'p', 'chips'],
    },
}

const CHAR_SPEED_DOMANDA = 50
const CHAR_SPEED_RISPOSTA = 8
const PAUSE_BETWEEN_BLOCKS = 200
const FADE_DURATION = 400  // durata delle transizioni di stato (ms)

// ─── Stati ───
const PHASE = {
    IDLE: 'idle',
    TYPING_DOMANDA: 'typing_domanda',
    PRESS_SEND: 'press_send',
    TRANSITION: 'transition',
    TYPING_RISPOSTA: 'typing_risposta',
    ACTIONS: 'actions',
    DONE: 'done',
}

const DUR = { IDLE: 1500, PRESS_SEND: 800, TRANSITION: FADE_DURATION, ACTIONS_APPEAR: 600 }

// ─── Componente principale ───
export default function LexAnimatedDemo({ variant = 'avvocato', startDelay = 0 }) {
    const { t } = useTranslation('lex_ai')
    const forma = DEMOS[variant] ?? DEMOS.avvocato
    const testiRisposta = t(`${forma.prefix}.risposta`, { returnObjects: true })
    const demo = {
        placeholder: t(`${forma.prefix}.input_placeholder`),
        azione: t(`${forma.prefix}.action`),
    }
    const DOMANDA = t(`${forma.prefix}.domanda`)
    const RISPOSTA = forma.tipi.map((type, i) => ({ type, ...(Array.isArray(testiRisposta) ? testiRisposta[i] : null) }))

    const [phase, setPhase] = useState(PHASE.IDLE)
    const [domandaText, setDomandaText] = useState('')
    const [rispostaBlocks, setRispostaBlocks] = useState([])
    const timeoutsRef = useRef([])

    // Scrive solo quando si vede: se la sezione esce dallo schermo l'animazione si ferma
    // e riprende quando torna visibile. Così, se stai leggendo più in basso, la risposta
    // che si allunga non fa scorrere la pagina sotto i tuoi occhi.
    const rootRef = useRef(null)
    const visibileRef = useRef(false)
    const inAttesaRef = useRef([])
    useEffect(() => {
        const el = rootRef.current
        if (!el || typeof IntersectionObserver === 'undefined') { visibileRef.current = true; return }
        const obs = new IntersectionObserver(([e]) => {
            visibileRef.current = e.isIntersecting
            if (e.isIntersecting) {
                inAttesaRef.current.forEach(riprendi => riprendi())
                inAttesaRef.current = []
            }
        })
        obs.observe(el)
        return () => obs.disconnect()
    }, [])
    const quandoVisibile = () => visibileRef.current
        ? Promise.resolve()
        : new Promise(riprendi => inAttesaRef.current.push(riprendi))

    const addTimeout = (fn, delay) => {
        const id = setTimeout(fn, delay)
        timeoutsRef.current.push(id)
        return id
    }
    // Ogni passo dell'animazione aspetta il suo tempo E che la sezione sia visibile
    const wait = async (ms) => {
        await new Promise(resolve => addTimeout(resolve, ms))
        await quandoVisibile()
    }

    useEffect(() => {
        let isMounted = true

        const run = async () => {
            // IDLE (+ scaglionamento opzionale)
            await wait(DUR.IDLE + startDelay)
            if (!isMounted) return

            // TYPING DOMANDA
            setPhase(PHASE.TYPING_DOMANDA)
            for (let i = 0; i <= DOMANDA.length; i++) {
                if (!isMounted) return
                setDomandaText(DOMANDA.slice(0, i))
                await wait(CHAR_SPEED_DOMANDA)
            }

            // PRESS SEND
            setPhase(PHASE.PRESS_SEND)
            await wait(DUR.PRESS_SEND)
            if (!isMounted) return

            // TRANSIZIONE (fade out input, fade in conversazione) → subito la risposta
            setPhase(PHASE.TRANSITION)
            await wait(DUR.TRANSITION)
            if (!isMounted) return

            // TYPING RISPOSTA
            setPhase(PHASE.TYPING_RISPOSTA)
            for (let blockIdx = 0; blockIdx < RISPOSTA.length; blockIdx++) {
                if (!isMounted) return
                const block = RISPOSTA[blockIdx]
                if (block.type === 'h2' || block.type === 'p') {
                    for (let c = 0; c <= block.text.length; c++) {
                        if (!isMounted) return
                        const partial = block.text.slice(0, c)
                        setRispostaBlocks(prev => {
                            const next = [...prev]
                            next[blockIdx] = { ...block, partialText: partial }
                            return next
                        })
                        await wait(CHAR_SPEED_RISPOSTA)
                    }
                } else {
                    setRispostaBlocks(prev => {
                        const next = [...prev]
                        next[blockIdx] = block
                        return next
                    })
                    await wait(PAUSE_BETWEEN_BLOCKS * 2)
                }
                await wait(PAUSE_BETWEEN_BLOCKS)
            }

            // ACTIONS
            setPhase(PHASE.ACTIONS)
            await wait(DUR.ACTIONS_APPEAR)
            if (!isMounted) return

            // DONE — l'animazione si ferma qui
            setPhase(PHASE.DONE)
        }

        run()
        return () => {
            isMounted = false
            timeoutsRef.current.forEach(clearTimeout)
            timeoutsRef.current = []
        }
    }, [variant])

    const isInputPhase = phase === PHASE.IDLE || phase === PHASE.TYPING_DOMANDA || phase === PHASE.PRESS_SEND || phase === PHASE.TRANSITION
    const isPressing = phase === PHASE.PRESS_SEND
    const showCursor = (phase === PHASE.IDLE || phase === PHASE.TYPING_DOMANDA) && (Math.floor(Date.now() / 500) % 2 === 0)

    // Visibilità con fade incrociato
    const inputOpacity = (phase === PHASE.IDLE || phase === PHASE.TYPING_DOMANDA || phase === PHASE.PRESS_SEND) ? 1 : 0
    const conversationOpacity = (phase === PHASE.TYPING_RISPOSTA || phase === PHASE.ACTIONS || phase === PHASE.DONE) ? 1 : 0
    const responseOpacity = conversationOpacity
    const actionsOpacity = (phase === PHASE.ACTIONS || phase === PHASE.DONE) ? 1 : 0

    return (
        <div ref={rootRef} className="relative">
            {/* INPUT — fade out quando si passa alla conversazione */}
            <div
                className="space-y-3 transition-opacity"
                style={{
                    opacity: inputOpacity,
                    transitionDuration: `${FADE_DURATION}ms`,
                    pointerEvents: inputOpacity === 0 ? 'none' : 'auto',
                    position: !isInputPhase ? 'absolute' : 'relative',
                    width: '100%', top: 0, left: 0,
                }}
            >
                <p className="font-body text-xs text-nebbia/25">
                    {t('anim.input_hint')}
                </p>
                <div className={`bg-petrolio border ${isPressing ? 'border-salvia/60' : 'border-white/10'} text-nebbia font-body text-sm px-4 py-3.5 transition-colors min-h-[78px]`}>
                    <span className="text-nebbia/85">{domandaText}</span>
                    {showCursor && <span className="inline-block w-[2px] h-4 bg-salvia/80 align-middle ml-0.5" />}
                    {!domandaText && !showCursor && <span className="text-nebbia/20">{demo.placeholder}</span>}
                </div>
                <button
                    className={`flex items-center justify-center gap-2 w-full py-3 border font-body text-sm transition-all ${isPressing
                        ? 'bg-salvia/30 border-salvia/60 text-salvia scale-[0.98]'
                        : 'bg-salvia/10 border-salvia/30 text-salvia'}`}
                >
                    <Sparkles size={13} /> {t('anim.cta')}
                </button>
            </div>

            {/* CONVERSAZIONE — fade in quando l'input si nasconde (absolute da invisibile: niente spazio vuoto) */}
            <div
                className="space-y-4 transition-opacity"
                style={{
                    opacity: conversationOpacity,
                    transitionDuration: `${FADE_DURATION}ms`,
                    pointerEvents: conversationOpacity === 0 ? 'none' : 'auto',
                    position: conversationOpacity === 0 ? 'absolute' : 'relative',
                    width: '100%', top: 0, left: 0,
                }}
            >
                {/* Bubble utente */}
                <div>
                    <p className="font-body text-xs text-nebbia/30 mb-1.5">{t('anim.user_label')}</p>
                    <div className="bg-petrolio border border-white/8 px-4 py-3">
                        <p className="font-body text-sm text-nebbia/65">{DOMANDA}</p>
                    </div>
                </div>

                {/* Risposta — si scrive subito dopo l'invio */}
                <div
                    className="transition-opacity"
                    style={{
                        opacity: responseOpacity,
                        transitionDuration: `${FADE_DURATION}ms`,
                        pointerEvents: responseOpacity === 0 ? 'none' : 'auto',
                    }}
                >
                    {responseOpacity > 0 && (
                        <>
                            <p className="font-body text-xs text-salvia/50 mb-1.5">{t('anim.lex_label')}</p>
                            <div className="bg-salvia/5 border border-salvia/15 p-5 space-y-3">
                                {rispostaBlocks.map((block, i) => {
                                    if (!block) return null
                                    if (block.type === 'h2') {
                                        return (
                                            <p key={i} className="font-body text-[11px] uppercase tracking-widest text-salvia/70 font-medium pt-1">
                                                {block.partialText ?? block.text}
                                            </p>
                                        )
                                    }
                                    if (block.type === 'p') {
                                        return (
                                            <p key={i} className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                {block.partialText ?? block.text}
                                            </p>
                                        )
                                    }
                                    if (block.type === 'list') {
                                        return (
                                            <ul key={i} className="space-y-1.5 pl-1 animate-[fadeInUp_0.4s_ease-out]">
                                                {block.items.map((it, j) => (
                                                    <li key={j} className="flex items-start gap-2 font-body text-xs text-nebbia/55 leading-relaxed">
                                                        <div className="w-1 h-1 rounded-full bg-salvia/60 shrink-0 mt-1.5" />
                                                        <span>{it}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )
                                    }
                                    if (block.type === 'chips') {
                                        return (
                                            <div key={i} className="flex gap-1 flex-wrap pt-2 animate-[fadeInUp_0.4s_ease-out]">
                                                {block.items.map(c => (
                                                    <span key={c} className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/8 text-nebbia/40">{c}</span>
                                                ))}
                                            </div>
                                        )
                                    }
                                    return null
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Azione — fade in alla fine */}
                <div
                    className="flex flex-col sm:flex-row gap-2 transition-opacity"
                    style={{
                        opacity: actionsOpacity,
                        transitionDuration: `${FADE_DURATION}ms`,
                        pointerEvents: actionsOpacity === 0 ? 'none' : 'auto',
                    }}
                >
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-petrolio border border-oro/25 text-oro/80 font-body text-xs hover:bg-oro/5 transition-colors">
                        <FolderOpen size={12} /> {demo.azione}
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-petrolio border border-salvia/25 text-salvia/80 font-body text-xs hover:bg-salvia/5 transition-colors">
                        <Tag size={12} /> {t('anim.action_etichetta')}
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    )
}
