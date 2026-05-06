// LexAnimatedDemo.jsx
// Animazione one-shot (no loop): scrittura domanda -> ricerca Lex -> risposta che si scrive -> azioni
// Transizioni morbide via CSS transition + fade incrociato

import { useState, useEffect, useRef } from 'react'
import { Sparkles, Bookmark, FolderOpen, Check } from 'lucide-react'

const DOMANDA = "un ladro entra in casa, il proprietario reagisce, quando può configurarsi la legittima difesa?"

const FRASI_LEX = [
    'Sto ricercando nell\'archivio Lex',
    'Identifico le fonti rilevanti',
    'Confronto sentenze e giurisprudenza',
    'Consulto codici e normative',
    'Compongo una risposta strutturata',
]

const RISPOSTA = [
    { type: 'h2', text: 'Normativa' },
    { type: 'p', text: 'La legittima difesa è disciplinata dall\'art. 52 c.p., che esclude la punibilità di chi ha commesso un fatto essendovi stato costretto dalla necessità di difendere un diritto proprio o altrui contro il pericolo attuale di un\'offesa ingiusta, purché la difesa sia proporzionata all\'offesa.' },
    { type: 'p', text: 'Nel caso del ladro che entra in casa, la L. 36/2019 ha introdotto una presunzione legale di proporzionalità quando il fatto avvenga nei luoghi di cui all\'art. 614 c.p. (abitazione, privata dimora, pertinenze), il soggetto sia legittimamente presente e utilizzi un\'arma legittimamente detenuta per difendere incolumità o beni propri o altrui.' },
    { type: 'h2', text: 'Presupposti che restano necessari' },
    { type: 'p', text: 'La presunzione non elimina la verifica degli altri requisiti. La Cassazione (rassegna 1/2021) ha chiarito che occorre sempre accertare:' },
    {
        type: 'list', items: [
            'Attualità del pericolo: deve esistere al momento della reazione. Se il ladro è in fuga, la difesa perde il suo presupposto.',
            'Necessità della reazione: deve essere l\'unica opzione praticabile.',
            'Gerarchia dei valori: vita e incolumità prevalgono sull\'interesse patrimoniale.',
        ]
    },
    { type: 'h2', text: 'Eccesso colposo e turbamento' },
    { type: 'p', text: 'L\'art. 55 comma 2 c.p. esclude la punibilità per eccesso quando chi reagisce si trovi in minorata difesa o grave turbamento derivante dalla situazione di pericolo in atto. Clausola pensata per chi, sorpreso da un\'intrusione notturna, reagisce in modo sproporzionato per il panico... CONTINUA...' },
    { type: 'chips', items: ['Art. 52 c.p.', 'L. 36/2019', 'Art. 614 c.p.', 'Cass. 1/2021', 'Art. 55 c.p.', 'Art. 59 c.p.'] },
]

const CHAR_SPEED_DOMANDA = 50
const CHAR_SPEED_RISPOSTA = 8
const PAUSE_BETWEEN_BLOCKS = 200

const FADE_DURATION = 400  // durata delle transizioni di stato (ms)

// ─── Animazione libreria Lex ───
function LexLibraryAnimation() {
    const [indiceFrase, setIndiceFrase] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setIndiceFrase((i) => (i + 1) % FRASI_LEX.length)
        }, 1600)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="px-3 py-6">
            <style>{`
        .lex-mini-stage {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 6;
          margin: 0 auto;
        }
        .lex-mini-stage svg { width: 100%; height: 100%; display: block; }

        .lex-mini-ray {
          animation: lexMiniRayCycle 8s ease-in-out infinite;
        }
        @keyframes lexMiniRayCycle {
          0%   { transform: translateX(-30px); opacity: 0; }
          5%   { opacity: 0.8; }
          25%  { transform: translateX(120px); opacity: 0.9; }
          30%  { opacity: 0; }
          40%  { transform: translateX(-30px); opacity: 0; }
          45%  { opacity: 0.8; }
          65%  { transform: translateX(240px); opacity: 0.9; }
          70%  { opacity: 0; }
          80%  { transform: translateX(-30px); opacity: 0; }
          85%  { opacity: 0.8; }
          100% { transform: translateX(360px); opacity: 0; }
        }

        .lex-mini-fade {
          animation: lexMiniFade 0.5s ease-out;
        }
        @keyframes lexMiniFade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .lex-mini-dot {
          display: inline-block;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #7FA39A;
          opacity: 0.4;
          animation: lexMiniDotPulse 1.4s ease-in-out infinite;
        }
        .lex-mini-dot:nth-child(1) { animation-delay: 0s; }
        .lex-mini-dot:nth-child(2) { animation-delay: 0.2s; }
        .lex-mini-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes lexMiniDotPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>

            <div className="lex-mini-stage">
                <svg viewBox="60 80 380 130" xmlns="http://www.w3.org/2000/svg">
                    <line x1="60" y1="172" x2="440" y2="172" stroke="rgba(127, 163, 154, 0.4)" strokeWidth="0.8" />

                    {[
                        { x: 80, w: 22, h: 72, y: 100, fill: '#243447' },
                        { x: 105, w: 20, h: 80, y: 92, fill: '#1d2c3a' },
                        { x: 128, w: 24, h: 67, y: 105, fill: '#2a3b4f' },
                        { x: 155, w: 22, h: 76, y: 96, fill: '#243447' },
                        { x: 180, w: 20, h: 64, y: 108, fill: '#1d2c3a' },
                        { x: 203, w: 22, h: 74, y: 98, fill: '#2a3b4f' },
                        { x: 228, w: 24, h: 69, y: 103, fill: '#243447' },
                        { x: 255, w: 26, h: 82, y: 90, fill: '#243447' },
                        { x: 284, w: 22, h: 75, y: 97, fill: '#1d2c3a' },
                        { x: 309, w: 24, h: 68, y: 104, fill: '#2a3b4f' },
                        { x: 336, w: 22, h: 79, y: 93, fill: '#243447' },
                        { x: 361, w: 20, h: 66, y: 106, fill: '#1d2c3a' },
                        { x: 384, w: 22, h: 72, y: 100, fill: '#2a3b4f' },
                        { x: 409, w: 24, h: 77, y: 95, fill: '#243447' },
                    ].map((b, i) => (
                        <rect
                            key={i}
                            x={b.x} y={b.y} width={b.w} height={b.h} rx="1"
                            fill={b.fill}
                            stroke="rgba(127, 163, 154, 0.2)"
                            strokeWidth="1"
                        />
                    ))}

                    <g className="lex-mini-ray">
                        <ellipse cx="80" cy="135" rx="22" ry="55" fill="#7FA39A" opacity="0.18" />
                        <ellipse cx="80" cy="135" rx="14" ry="45" fill="#7FA39A" opacity="0.25" />
                        <ellipse cx="80" cy="135" rx="6" ry="35" fill="#7FA39A" opacity="0.4" />
                        <line x1="80" y1="80" x2="80" y2="180" stroke="#7FA39A" strokeWidth="0.5" opacity="0.6" />
                    </g>
                </svg>
            </div>

            <div className="text-center mt-3 min-h-[24px]">
                <span
                    key={indiceFrase}
                    className="lex-mini-fade font-body text-sm text-nebbia/70 tracking-wide inline-flex items-center"
                >
                    {FRASI_LEX[indiceFrase]}
                    <span className="inline-flex gap-[3px] ml-1.5 items-center">
                        <span className="lex-mini-dot" />
                        <span className="lex-mini-dot" />
                        <span className="lex-mini-dot" />
                    </span>
                </span>
            </div>
        </div>
    )
}

// ─── Stati ───
const PHASE = {
    IDLE: 'idle',
    TYPING_DOMANDA: 'typing_domanda',
    PRESS_SEND: 'press_send',
    TRANSITION_TO_SEARCH: 'transition_to_search',
    LEX_SEARCHING: 'lex_searching',
    TRANSITION_TO_RESPONSE: 'transition_to_response',
    TYPING_RISPOSTA: 'typing_risposta',
    ACTIONS: 'actions',
    DONE: 'done',
}

const DUR = {
    IDLE: 1500,
    PRESS_SEND: 800,
    TRANSITION: FADE_DURATION,
    LEX_SEARCHING: 7000,
    ACTIONS_APPEAR: 600,
}

// ─── Componente principale ───
export default function LexAnimatedDemo() {
    const [phase, setPhase] = useState(PHASE.IDLE)
    const [domandaText, setDomandaText] = useState('')
    const [rispostaBlocks, setRispostaBlocks] = useState([])
    const timeoutsRef = useRef([])

    const addTimeout = (fn, delay) => {
        const id = setTimeout(fn, delay)
        timeoutsRef.current.push(id)
        return id
    }

    const wait = (ms) => new Promise(resolve => addTimeout(resolve, ms))

    useEffect(() => {
        let isMounted = true

        const run = async () => {
            // IDLE
            await wait(DUR.IDLE)
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

            // TRANSITION TO SEARCH (fade out input, fade in conversation)
            setPhase(PHASE.TRANSITION_TO_SEARCH)
            await wait(DUR.TRANSITION)
            if (!isMounted) return

            // LEX SEARCHING
            setPhase(PHASE.LEX_SEARCHING)
            await wait(DUR.LEX_SEARCHING)
            if (!isMounted) return

            // TRANSITION TO RESPONSE (fade out lex animation, fade in response)
            setPhase(PHASE.TRANSITION_TO_RESPONSE)
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
    }, [])

    const isInputPhase = phase === PHASE.IDLE || phase === PHASE.TYPING_DOMANDA || phase === PHASE.PRESS_SEND || phase === PHASE.TRANSITION_TO_SEARCH
    const isPressing = phase === PHASE.PRESS_SEND
    const showCursor = (phase === PHASE.IDLE || phase === PHASE.TYPING_DOMANDA) && (Math.floor(Date.now() / 500) % 2 === 0)

    // Visibilità con fade incrociato
    const inputOpacity = (phase === PHASE.IDLE || phase === PHASE.TYPING_DOMANDA || phase === PHASE.PRESS_SEND) ? 1 : 0
    const conversationOpacity = (phase === PHASE.LEX_SEARCHING || phase === PHASE.TRANSITION_TO_RESPONSE || phase === PHASE.TYPING_RISPOSTA || phase === PHASE.ACTIONS || phase === PHASE.DONE) ? 1 : 0
    const lexSearchOpacity = phase === PHASE.LEX_SEARCHING ? 1 : 0
    const responseOpacity = (phase === PHASE.TYPING_RISPOSTA || phase === PHASE.ACTIONS || phase === PHASE.DONE) ? 1 : 0
    const actionsOpacity = (phase === PHASE.ACTIONS || phase === PHASE.DONE) ? 1 : 0

    return (
        <div className="relative">

            {/* INPUT — fade out quando si passa alla conversazione */}
            <div
                className="space-y-3 transition-opacity"
                style={{
                    opacity: inputOpacity,
                    transitionDuration: `${FADE_DURATION}ms`,
                    pointerEvents: inputOpacity === 0 ? 'none' : 'auto',
                    position: !isInputPhase ? 'absolute' : 'relative',
                    width: '100%',
                    top: 0,
                    left: 0,
                }}
            >
                <p className="font-body text-xs text-nebbia/25">
                    Fai una domanda su una questione legale o carica un documento da analizzare.
                </p>
                <div className={`bg-petrolio border ${isPressing ? 'border-salvia/60' : 'border-white/10'} text-nebbia font-body text-sm px-4 py-3.5 transition-colors min-h-[78px]`}>
                    <span className="text-nebbia/85">{domandaText}</span>
                    {showCursor && <span className="inline-block w-[2px] h-4 bg-salvia/80 align-middle ml-0.5" />}
                    {!domandaText && !showCursor && <span className="text-nebbia/20">Es. Responsabilità del datore di lavoro in caso di infortunio...</span>}
                </div>
                <button
                    className={`flex items-center justify-center gap-2 w-full py-3 border font-body text-sm transition-all ${isPressing
                        ? 'bg-salvia/30 border-salvia/60 text-salvia scale-[0.98]'
                        : 'bg-salvia/10 border-salvia/30 text-salvia'
                        }`}
                >
                    <Sparkles size={13} /> Cerca con Lex AI
                </button>
            </div>

            {/* CONVERSAZIONE — fade in quando l'input si nasconde */}
            <div
                className="space-y-4 transition-opacity"
                style={{
                    opacity: conversationOpacity,
                    transitionDuration: `${FADE_DURATION}ms`,
                    pointerEvents: conversationOpacity === 0 ? 'none' : 'auto',
                }}
            >
                {/* Bubble utente */}
                <div>
                    <p className="font-body text-xs text-nebbia/30 mb-1.5">Tu</p>
                    <div className="bg-petrolio border border-white/8 px-4 py-3">
                        <p className="font-body text-sm text-nebbia/65">{DOMANDA}</p>
                    </div>
                </div>

                {/* Container con altezza che cresce in modo fluido */}
                <div
                    className="relative transition-all"
                    style={{
                        transitionDuration: `${FADE_DURATION}ms`,
                        transitionProperty: 'min-height',
                        minHeight: phase === PHASE.LEX_SEARCHING || phase === PHASE.TRANSITION_TO_RESPONSE
                            ? '220px'
                            : (responseOpacity ? 'auto' : '0px'),
                    }}
                >
                    {/* Lex sta cercando — sovrapposto in absolute, fade out quando arriva la risposta */}
                    <div
                        className="bg-salvia/5 border border-salvia/15 px-4 py-2 transition-opacity"
                        style={{
                            opacity: lexSearchOpacity,
                            transitionDuration: `${FADE_DURATION}ms`,
                            position: lexSearchOpacity === 0 ? 'absolute' : 'relative',
                            width: '100%',
                            top: 0,
                            left: 0,
                            pointerEvents: lexSearchOpacity === 0 ? 'none' : 'auto',
                        }}
                    >
                        <LexLibraryAnimation />
                    </div>

                    {/* Risposta — fade in quando termina la ricerca */}
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
                                <p className="font-body text-xs text-salvia/50 mb-1.5">Lex AI</p>
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
                </div>

                {/* Azioni — fade in alla fine */}
                <div
                    className="flex flex-col sm:flex-row gap-2 transition-opacity"
                    style={{
                        opacity: actionsOpacity,
                        transitionDuration: `${FADE_DURATION}ms`,
                        pointerEvents: actionsOpacity === 0 ? 'none' : 'auto',
                    }}
                >
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-petrolio border border-oro/25 text-oro/80 font-body text-xs hover:bg-oro/5 transition-colors">
                        <FolderOpen size={12} /> Aggiungi a pratica
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-petrolio border border-salvia/25 text-salvia/80 font-body text-xs hover:bg-salvia/5 transition-colors">
                        <Bookmark size={12} /> Aggiungi a etichetta
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