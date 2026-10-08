// src/components/ChatPratica.jsx
// Lex per la pratica — VERSIONE 4 (08-10-2026)
//
// NOVITA' della v4: i documenti li scrive Lex in modalità atto, come in Banca Dati (lex-pratica →
// Lead → scrittore dedicato, con i dati della pratica), non più il generatore a 12 modelli. La bolla è
// DocumentoLex: foglio con i segnaposto, Scarica Word, Scarica PDF, Copia, carta intestata e «Compila con
// i dati di questa pratica». Tolti l'anteprima PDF e il salvataggio nella pratica del generatore vecchio.
// Il documento si riconosce da done.meta.documento; mentre si scrive (fase «Scrittura del documento»)
// il testo compare sul foglio A4.
//
// Storia della v3:
// NOVITA' rispetto alla v2:
// - ANTEPRIMA = PDF reale (stesso identico render di salva-documento-pdf,
//   chiamato con solo_anteprima:true). Pagine impaginate vere, fedeli al salvato.
// - Lo streaming scrive LIVE sul FOGLIO A4 (Cormorant), non piu' in chat.
//   A fine streaming la bolla genera AUTOMATICAMENTE il PDF (nessun credito).
// - Modifica markdown -> "Rigenera anteprima" -> nuovo PDF.
// - Dopo il salva: la modifica resta possibile (operazione edge, niente Claude).
//
// CONTRATTO SSE (lex-pratica, risposta del Lead):
//   event: fase   -> { fase, descrizione }
//   event: chunk  -> { text }
//   event: done   -> { crediti_rimasti, tipo_risposta, meta: { documento: { tipo } | null, ... } }
//   event: error  -> { error }

import { useState, useEffect, useRef, cloneElement, isValidElement, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { sanitizzaErrore } from '@/lib/sanitizzaErrore'
import ReactMarkdown from 'react-markdown'
import DocumentoLex from '@/components/DocumentoLex'
import {
    Sparkles, Send, Save, Plus, AlertCircle, X, CheckCircle,
    Loader2, HelpCircle
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────
const ENDPOINT_PRATICA = '/functions/v1/lex-pratica'

// Esempi di atti per il popover «Cosa posso chiederti?»: solo esempi, Lex scrive qualsiasi documento.
const TIPI_DOCUMENTO_UI = [
    {
        categoria: 'Atti stragiudiziali', tipi: [
            { nome: 'Diffida e messa in mora', esempio: 'scrivimi una diffida per il mancato pagamento della fattura...' },
            { nome: 'Parere legale', esempio: 'prepara un parere sulla risoluzione del contratto...' },
        ]
    },
    {
        categoria: 'Atti introduttivi', tipi: [
            { nome: 'Atto di citazione civile', esempio: 'redigi un atto di citazione per...' },
            { nome: 'Ricorso per decreto ingiuntivo', esempio: 'fammi un ricorso per decreto ingiuntivo sulle fatture...' },
        ]
    },
    {
        categoria: 'Atti difensivi', tipi: [
            { nome: 'Comparsa di costituzione e risposta', esempio: 'prepara la comparsa di costituzione...' },
            { nome: 'Memoria istruttoria 171-ter', esempio: 'scrivimi la memoria 171-ter primo termine...' },
        ]
    },
    {
        categoria: 'Atti istruttori', tipi: [
            { nome: 'Istanza di ammissione prove', esempio: 'redigi istanza di ammissione mezzi di prova...' },
            { nome: 'Istanza di nomina CTU', esempio: 'fammi un istanza di nomina CTU contabile...' },
        ]
    },
    {
        categoria: 'Atti esecutivi', tipi: [
            { nome: 'Atto di precetto', esempio: 'prepara un precetto sulla sentenza...' },
            { nome: 'Pignoramento presso terzi', esempio: 'redigi pignoramento presso terzi sul conto...' },
        ]
    },
    {
        categoria: 'Impugnazioni', tipi: [
            { nome: 'Atto di appello civile', esempio: 'scrivimi l atto di appello contro la sentenza...' },
            { nome: 'Reclamo cautelare', esempio: 'prepara un reclamo cautelare contro l ordinanza...' },
        ]
    },
]

// ─────────────────────────────────────────────────────────────
// LEX ANIMAZIONE — invariata da v1
// ─────────────────────────────────────────────────────────────
function LexAnimazione({ frasi }) {
    const frasiRotative = frasi ?? [
        'Sto analizzando la pratica',
        'Esamino la cronologia delle udienze',
        'Controllo i documenti del fascicolo',
        'Ricostruisco le posizioni delle parti',
        'Verifico la prossima udienza',
        'Compongo una risposta strutturata',
    ]

    const [indiceFrase, setIndiceFrase] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setIndiceFrase((i) => (i + 1) % frasiRotative.length)
        }, 4000)
        return () => clearInterval(interval)
    }, [frasiRotative.length])

    const testoVisibile = frasiRotative[indiceFrase]

    return (
        <div className="px-3 py-4 max-w-[600px] mx-auto">
            <style>{`
                .lex-stage { position: relative; width: 100%; aspect-ratio: 16 / 7; margin: 0 auto; }
                .lex-stage svg { width: 100%; height: 100%; display: block; }
                .lex-ray { animation: lexRayCycle 27s ease-in-out infinite; }
                @keyframes lexRayCycle {
                    0% { transform: translateX(-30px); opacity: 0; }
                    3% { opacity: 0.8; }
                    8% { transform: translateX(85px); opacity: 0.9; }
                    12% { transform: translateX(85px); opacity: 1; }
                    16% { transform: translateX(85px); opacity: 0; }
                    33% { transform: translateX(85px); opacity: 0; }
                    34% { transform: translateX(-30px); opacity: 0; }
                    37% { opacity: 0.8; }
                    42% { transform: translateX(180px); opacity: 0.9; }
                    46% { transform: translateX(180px); opacity: 1; }
                    50% { transform: translateX(180px); opacity: 0; }
                    66% { transform: translateX(180px); opacity: 0; }
                    67% { transform: translateX(-30px); opacity: 0; }
                    70% { opacity: 0.8; }
                    78% { transform: translateX(290px); opacity: 0.9; }
                    82% { transform: translateX(290px); opacity: 1; }
                    86% { transform: translateX(290px); opacity: 0; }
                    100% { transform: translateX(290px); opacity: 0; }
                }
                .lex-book-a { animation: lexBookGlowA 27s ease-in-out infinite; }
                @keyframes lexBookGlowA {
                    0%, 8% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                    12% { fill: rgba(201, 164, 92, 0.25); stroke: #C9A45C; stroke-width: 1.5; transform: translateY(0); }
                    16% { fill: rgba(201, 164, 92, 0.15); stroke: rgba(201, 164, 92, 0.4); stroke-width: 1; transform: translateY(8px); }
                    24% { fill: rgba(201, 164, 92, 0.05); stroke: rgba(201, 164, 92, 0.3); stroke-width: 1; transform: translateY(8px); }
                    32%, 100% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-book-b { animation: lexBookGlowB 27s ease-in-out infinite; }
                @keyframes lexBookGlowB {
                    0%, 41% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                    46% { fill: rgba(201, 164, 92, 0.25); stroke: #C9A45C; stroke-width: 1.5; transform: translateY(0); }
                    50% { fill: rgba(201, 164, 92, 0.15); stroke: rgba(201, 164, 92, 0.4); stroke-width: 1; transform: translateY(8px); }
                    58% { fill: rgba(201, 164, 92, 0.05); stroke: rgba(201, 164, 92, 0.3); stroke-width: 1; transform: translateY(8px); }
                    66%, 100% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-book-c { animation: lexBookGlowC 27s ease-in-out infinite; }
                @keyframes lexBookGlowC {
                    0%, 75% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                    82% { fill: rgba(201, 164, 92, 0.25); stroke: #C9A45C; stroke-width: 1.5; transform: translateY(0); }
                    86% { fill: rgba(201, 164, 92, 0.15); stroke: rgba(201, 164, 92, 0.4); stroke-width: 1; transform: translateY(8px); }
                    94% { fill: rgba(201, 164, 92, 0.05); stroke: rgba(201, 164, 92, 0.3); stroke-width: 1; transform: translateY(8px); }
                    100% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                }
                .lex-fade-text { animation: lexFadeIn 0.6s ease-out; }
                @keyframes lexFadeIn {
                    0% { opacity: 0; transform: translateY(4px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .lex-dots-container { display: inline-flex; gap: 3px; margin-left: 6px; align-items: center; }
                .lex-dot {
                    display: inline-block; width: 3px; height: 3px;
                    border-radius: 50%; background: #C9A45C; opacity: 0.4;
                    animation: lexDotPulse 1.4s ease-in-out infinite;
                }
                .lex-dot:nth-child(1) { animation-delay: 0s; }
                .lex-dot:nth-child(2) { animation-delay: 0.2s; }
                .lex-dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes lexDotPulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.3); }
                }
            `}</style>

            <div className="lex-stage">
                <svg viewBox="62 27 416 185" xmlns="http://www.w3.org/2000/svg" role="img">
                    <title>Lex sta lavorando sulla pratica</title>
                    <line x1="60" y1="172" x2="480" y2="172" stroke="rgba(201, 164, 92, 0.4)" strokeWidth="0.8" />

                    <rect x="80" y="100" width="22" height="72" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="105" y="92" width="20" height="80" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="128" y="105" width="24" height="67" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect className="lex-book-a" x="155" y="96" width="22" height="76" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="180" y="108" width="20" height="64" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="203" y="98" width="22" height="74" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="228" y="103" width="24" height="69" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect className="lex-book-b" x="255" y="90" width="26" height="82" rx="1.5" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="284" y="97" width="22" height="75" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="309" y="104" width="24" height="68" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="336" y="93" width="22" height="79" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect className="lex-book-c" x="361" y="106" width="20" height="66" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="384" y="100" width="22" height="72" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <rect x="409" y="95" width="24" height="77" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />

                    <g className="lex-ray">
                        <ellipse cx="80" cy="135" rx="22" ry="55" fill="#C9A45C" opacity="0.18" />
                        <ellipse cx="80" cy="135" rx="14" ry="45" fill="#C9A45C" opacity="0.25" />
                        <ellipse cx="80" cy="135" rx="6" ry="35" fill="#C9A45C" opacity="0.4" />
                        <line x1="80" y1="80" x2="80" y2="180" stroke="#C9A45C" strokeWidth="0.5" opacity="0.6" />
                    </g>
                </svg>
            </div>

            <div className="text-center mt-3 min-h-[24px]">
                {testoVisibile && (
                    <span
                        key={indiceFrase}
                        className="lex-fade-text font-body text-sm text-nebbia/70 tracking-wide inline-flex items-center"
                    >
                        {testoVisibile}
                        <span className="lex-dots-container">
                            <span className="lex-dot" />
                            <span className="lex-dot" />
                            <span className="lex-dot" />
                        </span>
                    </span>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// HELPER: trascrizione conversazione in Markdown (per salva chat)
// I messaggi "documento" vengono inclusi col loro markdown.
// ─────────────────────────────────────────────────────────────
function trascriviConversazione(messaggi) {
    return messaggi.map(m => {
        if (m.tipo === 'documento' || m.tipo === 'documento_lex') {
            const ts = m.ts ? new Date(m.ts).toLocaleString('it-IT', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }) : ''
            return `**Documento generato — ${m.tipo_nome ?? 'atto'}:**${ts ? ` _(${ts})_` : ''}\n\n${m.content}\n`
        }
        const ruolo = m.role === 'user' ? '**Avvocato:**' : '**Lex:**'
        const ts = m.ts ? new Date(m.ts).toLocaleString('it-IT', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }) : ''
        return `${ruolo}${ts ? ` _(${ts})_` : ''}\n\n${m.content}\n`
    }).join('\n---\n\n')
}

// ─────────────────────────────────────────────────────────────
// EVIDENZIA SEGNAPOSTO — [DATO MANCANTE: ...], [VERIFICARE: ...] e quelli in maiuscolo della
// modalità atto ([NOME E COGNOME DEL CONDUTTORE], 08-10-2026)
// Cammina i children resi da ReactMarkdown e avvolge i segnaposto in
// un <mark> giallo, anche dentro grassetti/corsivi. Usato nel foglio A4
// di SCRITTURA LIVE (durante lo streaming). Nel PDF i marcatori restano testo.
// ─────────────────────────────────────────────────────────────
const RE_SEGNAPOSTO = /\[(?:DATO MANCANTE|VERIFICARE)[^\]]*\]|\[[A-ZÀ-Ý0-9][^[\]\n]{1,150}\]/g
const eSegnaposto = (s) => /^\[(?:DATO MANCANTE|VERIFICARE)/.test(s) || (s === s.toLocaleUpperCase('it-IT') && /[A-ZÀ-Ý]/.test(s))

function evidenziaSegnaposto(children) {
    function processa(node, key) {
        if (typeof node === 'string') {
            if (!node.includes('[')) return node
            const out = []
            let last = 0
            let m
            let i = 0
            RE_SEGNAPOSTO.lastIndex = 0
            while ((m = RE_SEGNAPOSTO.exec(node)) !== null) {
                if (!eSegnaposto(m[0])) continue
                if (m.index > last) out.push(node.slice(last, m.index))
                out.push(
                    <mark key={`${key}-${i++}`} className="bg-yellow-200 text-yellow-900 px-1 rounded-[2px]">
                        {m[0]}
                    </mark>
                )
                last = m.index + m[0].length
            }
            if (out.length === 0) return node
            if (last < node.length) out.push(node.slice(last))
            return out
        }
        if (Array.isArray(node)) {
            return node.map((n, idx) => <Fragment key={`${key}-f${idx}`}>{processa(n, `${key}-${idx}`)}</Fragment>)
        }
        if (isValidElement(node) && node.props && node.props.children != null) {
            return cloneElement(node, undefined, processa(node.props.children, key))
        }
        return node
    }
    return processa(children, 's')
}

// ─────────────────────────────────────────────────────────────
// COMPONENTI MARKDOWN PER FOGLIO A4 (bianco, testo nero, serif Cormorant)
// Usati SOLO nella scrittura live durante lo streaming.
// ─────────────────────────────────────────────────────────────
const componentiDocumentoA4 = {
    h1: ({ children }) => (
        <h1 className="font-display text-center text-[1.45rem] leading-snug font-bold uppercase tracking-wide text-neutral-900 mb-6 mt-1">
            {evidenziaSegnaposto(children)}
        </h1>
    ),
    h2: ({ children }) => (
        <h2 className="font-display text-[1.05rem] font-bold uppercase tracking-wide text-neutral-900 mt-7 mb-2">
            {evidenziaSegnaposto(children)}
        </h2>
    ),
    h3: ({ children }) => (
        <h3 className="font-display text-[0.98rem] font-semibold text-neutral-900 mt-5 mb-1.5">
            {evidenziaSegnaposto(children)}
        </h3>
    ),
    p: ({ children }) => (
        <p className="font-display text-[0.98rem] text-justify text-neutral-900 leading-[1.7] mb-3.5">
            {evidenziaSegnaposto(children)}
        </p>
    ),
    strong: ({ children }) => <strong className="font-bold text-neutral-900">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => <ul className="list-disc pl-7 space-y-1.5 my-3 text-neutral-900">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-7 space-y-1.5 my-3 text-neutral-900">{children}</ol>,
    li: ({ children }) => <li className="font-display text-[0.98rem] leading-[1.6] text-justify">{evidenziaSegnaposto(children)}</li>,
    blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-neutral-300 pl-4 my-3 italic text-neutral-700">{children}</blockquote>
    ),
    hr: () => <hr className="my-5 border-neutral-300" />,
    a: ({ children }) => <span className="text-neutral-900 underline">{children}</span>,
}

// Foglio A4 bianco riusabile (scrittura live). Posa su "scrivania" neutra.
function FoglioA4({ markdown }) {
    return (
        <div className="bg-neutral-300/70 px-3 sm:px-6 py-6">
            <div
                className="bg-white shadow-xl mx-auto w-full max-w-[640px] text-neutral-900 px-6 sm:px-14 py-9 sm:py-14"
                style={{ aspectRatio: '210 / 297' }}
            >
                <ReactMarkdown components={componentiDocumentoA4}>{markdown}</ReactMarkdown>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// POPOVER "Cosa posso chiederti?" — UI-C
// ─────────────────────────────────────────────────────────────
function PopoverCapacita({ onClose, onEsempio }) {
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-slate border border-salvia/20 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-salvia" />
                        <p className="font-body text-sm font-medium text-nebbia">Cosa puoi chiedere a Lex</p>
                    </div>
                    <button onClick={onClose} className="flex items-center justify-center min-w-[40px] min-h-[40px] lg:min-w-0 lg:min-h-0 -mr-2 lg:mr-0 text-nebbia/40 hover:text-nebbia transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <div>
                        <p className="font-body text-xs text-salvia uppercase tracking-widest mb-2">Analisi e ragionamento</p>
                        <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                            Chiedi a Lex di analizzare la pratica, individuare punti di forza e debolezza,
                            proporre una strategia, prepararti per la prossima udienza, o ricostruire la cronologia.
                            Esempi: "analizza i punti deboli", "che strategia mi consigli", "cosa preparo per l'udienza".
                        </p>
                    </div>

                    <div>
                        <p className="font-body text-xs text-oro uppercase tracking-widest mb-2">Atti e documenti</p>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed mb-3">
                            Lex scrive qualsiasi atto o documento con i dati della pratica: questi sono solo esempi.
                            Scrivi cosa ti serve; poi lo scarichi in Word o PDF con la tua carta intestata e lo
                            completi con i dati della pratica. Ogni documento consuma 1 credito.
                        </p>
                        <div className="space-y-3">
                            {TIPI_DOCUMENTO_UI.map(gruppo => (
                                <div key={gruppo.categoria}>
                                    <p className="font-body text-[11px] text-nebbia/40 uppercase tracking-wider mb-1.5">{gruppo.categoria}</p>
                                    <div className="space-y-1">
                                        {gruppo.tipi.map(t => (
                                            <button
                                                key={t.nome}
                                                onClick={() => { onEsempio(t.esempio); onClose() }}
                                                className="w-full text-left p-2.5 bg-petrolio/40 border border-white/8 hover:border-oro/30 hover:bg-oro/5 transition-colors group"
                                            >
                                                <p className="font-body text-sm text-nebbia group-hover:text-oro transition-colors">{t.nome}</p>
                                                <p className="font-body text-xs text-nebbia/35 mt-0.5 italic">"{t.esempio}"</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="px-5 py-3 border-t border-white/5 shrink-0">
                    <p className="font-body text-xs text-nebbia/30">
                        Tocca un atto per inserire un esempio nella casella di testo, poi personalizzalo.
                    </p>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function ChatPratica({ praticaId, titoloPratica }) {
    const [conversazione, setConversazione] = useState([])
    const [domandaLibera, setDomandaLibera] = useState('')
    const [inviando, setInviando] = useState(false)
    const [streamingTesto, setStreamingTesto] = useState('')
    const [statoGenerazione, setStatoGenerazione] = useState('') // fase in corso mentre Lex scrive un documento
    const [isDocumentoStreaming, setIsDocumentoStreaming] = useState(false) // true dalla fase «Scrittura del documento»
    const [errore, setErrore] = useState('')

    const [crediti, setCrediti] = useState(null)

    const [mostraSalva, setMostraSalva] = useState(false)
    const [titoloSalva, setTitoloSalva] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [salvataConferma, setSalvataConferma] = useState(false)

    const [confermaNuova, setConfermaNuova] = useState(false)
    const [mostraPopover, setMostraPopover] = useState(false)

    const bottomRef = useRef(null)
    const abortRef = useRef(null)

    useEffect(() => {
        if (conversazione.length === 0) return
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, [conversazione, streamingTesto, statoGenerazione])

    useEffect(() => {
        async function caricaCrediti() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from('crediti_ai')
                .select('crediti_totali, crediti_usati, periodo_fine, tipo')
                .eq('user_id', user.id)
            if (!data || data.length === 0) { setCrediti(0); return }
            const now = new Date()
            const totale = data.reduce((acc, row) => {
                const residui = row.crediti_totali - row.crediti_usati
                const scaduto = row.periodo_fine && new Date(row.periodo_fine) < now
                return acc + (residui > 0 && !scaduto ? residui : 0)
            }, 0)
            setCrediti(totale)
        }
        caricaCrediti()
        function onFocus() { caricaCrediti() }
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [])

    // ─────────────────────────────────────────────────────────
    // INVIA: chiamata streaming a lex-pratica (sempre azione 'libera')
    // ─────────────────────────────────────────────────────────
    async function invia(domandaCustom) {
        if (inviando) return
        if (crediti !== null && crediti <= 0) {
            setErrore('crediti_esauriti')
            return
        }

        const domandaPerEdge = (domandaCustom ?? domandaLibera).trim()
        if (!domandaPerEdge) {
            setErrore('Scrivi una domanda per Lex')
            return
        }

        setErrore('')

        const tsUser = new Date().toISOString()
        const nuovaConv = [
            ...conversazione,
            { role: 'user', content: domandaPerEdge, ts: tsUser },
        ]
        setConversazione(nuovaConv)
        setDomandaLibera('')
        setInviando(true)
        setStreamingTesto('')
        setStatoGenerazione('')
        setIsDocumentoStreaming(false)

        abortRef.current = new AbortController()

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Sessione scaduta. Ricarica la pagina.')

            const url = `${import.meta.env.VITE_SUPABASE_URL}${ENDPOINT_PRATICA}`

            // Storia: anche i documenti scritti da Lex, così si possono chiedere modifiche
            const storia = conversazione.map(m => ({ role: m.role, content: m.content }))

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    pratica_id: praticaId,
                    azione: 'libera',
                    domanda: domandaPerEdge,
                    messaggi: storia,
                }),
                signal: abortRef.current.signal,
            })

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({ error: 'Errore sconosciuto' }))
                if (errBody.crediti_esauriti) setErrore('crediti_esauriti')
                else setErrore(sanitizzaErrore(errBody.error) ?? `Il servizio non ha risposto (codice ${response.status}). Riprova tra qualche istante.`)
                setConversazione(conversazione)
                setInviando(false)
                return
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let testoAccumulato = ''
            let creditiRimasti = null
            let eventoCorrente = null   // FUORI dal while: deve persistere tra le reader.read()
            let erroreStream = null     // messaggio dell'evento 'error', se arriva

            // La risposta è un documento (modalità atto): done.meta.documento = { tipo }
            let documento = null

            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                    if (!line.trim()) continue

                    if (line.startsWith('event: ')) {
                        eventoCorrente = line.slice(7).trim()
                        continue
                    }

                    if (line.startsWith('data: ')) {
                        const payload = line.slice(6).trim()
                        try {
                            const data = JSON.parse(payload)

                            // event: fase — «Scrittura del documento»: il testo va sul foglio
                            if (eventoCorrente === 'fase' && data.descrizione === 'Scrittura del documento') {
                                setStatoGenerazione('Lex sta scrivendo il documento')
                                setIsDocumentoStreaming(true)
                            }

                            // event: chunk — testo (chat O documento in streaming)
                            if (eventoCorrente === 'chunk') {
                                testoAccumulato += data.text ?? ''
                                setStreamingTesto(testoAccumulato)
                            }

                            // event: done
                            if (eventoCorrente === 'done') {
                                if (data.crediti_rimasti !== undefined) creditiRimasti = data.crediti_rimasti
                                if (data.meta?.documento) documento = data.meta.documento
                            }

                            if (eventoCorrente === 'error') {
                                erroreStream = sanitizzaErrore(data.error) ?? 'La risposta si è interrotta. Riprova tra qualche istante.'
                                setErrore(erroreStream)
                            }
                        } catch { /* ignore */ }
                    }
                }
            }

            // Niente testo e niente documento: nessuna bolla vuota. Se il server
            // ha mandato un errore e' gia' a schermo, altrimenti lo diciamo qui.
            if (!testoAccumulato.trim()) {
                if (!erroreStream) setErrore('La risposta non è stata generata. Riprova tra qualche istante.')
                setConversazione(conversazione)
                setStreamingTesto('')
                setStatoGenerazione('')
                setIsDocumentoStreaming(false)
                return
            }

            // Messaggio finale: documento scritto da Lex o risposta normale
            const messaggioFinale = documento
                ? { role: 'assistant', tipo: 'documento_lex', content: testoAccumulato, tipo_nome: documento.tipo ?? 'documento', ts: new Date().toISOString() }
                : { role: 'assistant', content: testoAccumulato, ts: new Date().toISOString() }

            setConversazione([...nuovaConv, messaggioFinale])
            setStreamingTesto('')
            setStatoGenerazione('')
            setIsDocumentoStreaming(false)

            if (creditiRimasti !== null) setCrediti(creditiRimasti)

        } catch (err) {
            if (err.name === 'AbortError') {
                setConversazione(conversazione)
            } else {
                setErrore(sanitizzaErrore(err) ?? 'Si è verificato un errore temporaneo. Riprova tra qualche istante.')
                setConversazione(conversazione)
            }
            setStreamingTesto('')
            setStatoGenerazione('')
            setIsDocumentoStreaming(false)
        } finally {
            setInviando(false)
            abortRef.current = null
        }
    }

    async function salvaConversazione() {
        if (!titoloSalva.trim()) { setErrore('Inserisci un titolo per la conversazione'); return }
        setSalvando(true)
        setErrore('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const trascrizione = trascriviConversazione(conversazione)
            const { error } = await supabase.from('ricerche').insert({
                pratica_id: praticaId,
                user_id: user.id,
                autore_id: user.id,
                tipo: 'chat_lex',
                titolo: titoloSalva.trim(),
                contenuto: trascrizione,
                metadati: {
                    fonte: 'lex_pratica',
                    n_messaggi: conversazione.length,
                    ts: new Date().toISOString(),
                },
            })
            if (error) throw new Error(error.message)
            setSalvataConferma(true)
            setMostraSalva(false)
            setTitoloSalva('')
            setTimeout(() => setSalvataConferma(false), 4000)
        } catch (err) {
            setErrore(sanitizzaErrore(err) ?? 'Salvataggio non riuscito. Riprova tra qualche istante.')
        } finally {
            setSalvando(false)
        }
    }

    function nuovaChat() {
        if (abortRef.current) abortRef.current.abort()
        setConversazione([])
        setDomandaLibera('')
        setStreamingTesto('')
        setStatoGenerazione('')
        setIsDocumentoStreaming(false)
        setErrore('')
        setConfermaNuova(false)
        setMostraSalva(false)
    }

    function richiediNuovaChat() {
        if (conversazione.length === 0) return
        setConfermaNuova(true)
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            invia()
        }
    }

    const haMessaggi = conversazione.length > 0
    const creditiZero = crediti !== null && crediti <= 0

    const markdownComponents = {
        h1: ({ children }) => <h1 className="font-display text-xl font-semibold text-nebbia mb-3 mt-2">{children}</h1>,
        h2: ({ children }) => <h2 className="font-display text-base font-semibold text-nebbia mt-4 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="font-body text-sm font-semibold text-nebbia/80 mt-3 mb-1">{children}</h3>,
        strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
        em: ({ children }) => <em className="italic text-nebbia/80">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-nebbia/80 my-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-nebbia/80 my-2">{children}</ol>,
        li: ({ children }) => <li className="font-body text-sm">{children}</li>,
        p: ({ children }) => <p className="font-body text-sm text-nebbia/80 leading-relaxed mb-2">{children}</p>,
        hr: () => <hr className="my-3 border-white/10" />,
    }

    return (
        <div className="bg-slate border border-salvia/20 flex flex-col" style={{ minHeight: haMessaggi || inviando ? 560 : 'auto' }}>

            {/* Header */}
            <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 lg:gap-0 px-5 py-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <Sparkles size={16} className="text-salvia shrink-0" />
                    <p className="font-body text-base font-medium text-salvia">Lex per questa pratica</p>
                    {crediti !== null && (
                        <span className="font-body text-xs text-nebbia/30 ml-2">{crediti} crediti</span>
                    )}
                </div>
                {haMessaggi && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setMostraSalva(v => !v)}
                            disabled={inviando}
                            className="flex items-center justify-center gap-1.5 min-h-[40px] lg:min-h-0 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors disabled:opacity-40"
                        >
                            <Save size={11} /> Salva conversazione
                        </button>
                        <button
                            onClick={richiediNuovaChat}
                            disabled={inviando}
                            className="flex items-center justify-center gap-1.5 min-h-[40px] lg:min-h-0 font-body text-xs text-nebbia/40 border border-white/10 px-3 py-1.5 hover:text-nebbia hover:border-white/25 transition-colors disabled:opacity-40"
                        >
                            <Plus size={11} /> Nuova chat
                        </button>
                    </div>
                )}
            </div>

            {/* Conferma nuova chat */}
            {confermaNuova && (
                <div className="px-5 py-3 border-b border-amber-500/30 bg-amber-500/5 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="font-body text-xs text-amber-400">
                            <AlertCircle size={12} className="inline mr-1" />
                            La conversazione corrente andrà persa. Continuare?
                        </p>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={nuovaChat} className="flex-1 sm:flex-initial min-h-[40px] sm:min-h-0 font-body text-xs text-amber-400 border border-amber-500/40 px-3 py-1 hover:bg-amber-500/10">
                                Sì, nuova chat
                            </button>
                            <button onClick={() => setConfermaNuova(false)} className="flex-1 sm:flex-initial min-h-[40px] sm:min-h-0 font-body text-xs text-nebbia/40 px-3 py-1 hover:text-nebbia">
                                Annulla
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Conferma salvataggio */}
            {salvataConferma && (
                <div className="px-5 py-3 border-b border-salvia/30 bg-salvia/5 shrink-0">
                    <p className="font-body text-xs text-salvia flex items-center gap-2">
                        <CheckCircle size={12} />
                        Conversazione salvata nelle ricerche della pratica.
                    </p>
                </div>
            )}

            {/* Form salva conversazione */}
            {mostraSalva && (
                <div className="px-5 py-4 border-b border-white/5 bg-petrolio/30 shrink-0 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="font-body text-xs text-oro tracking-widest uppercase">Salva nelle ricerche</p>
                        <button onClick={() => { setMostraSalva(false); setTitoloSalva('') }} className="flex items-center justify-center min-w-[40px] min-h-[40px] lg:min-w-0 lg:min-h-0 -mr-2 lg:mr-0 text-nebbia/30 hover:text-nebbia">
                            <X size={13} />
                        </button>
                    </div>
                    <input
                        type="text"
                        value={titoloSalva}
                        onChange={e => setTitoloSalva(e.target.value)}
                        placeholder="Es. Strategia per udienza del 15 marzo"
                        autoFocus
                        className="w-full min-h-[44px] lg:min-h-0 bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                    />
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={salvaConversazione}
                            disabled={salvando || !titoloSalva.trim()}
                            className="flex items-center justify-center gap-1.5 min-h-[40px] lg:min-h-0 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40"
                        >
                            {salvando
                                ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                                : <><Save size={11} /> Conferma salvataggio</>
                            }
                        </button>
                        <button onClick={() => { setMostraSalva(false); setTitoloSalva('') }} className="min-h-[40px] lg:min-h-0 px-3 py-1.5 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors">
                            Annulla
                        </button>
                    </div>
                </div>
            )}

            {/* Conversazione */}
            <div className={`overflow-y-auto p-5 space-y-4 ${haMessaggi || inviando ? 'flex-1' : ''}`}>

                {/* Stato vuoto: messaggio introduttivo */}
                {!haMessaggi && !inviando && (
                    <div className="flex flex-col items-center justify-center text-center py-8">
                        <Sparkles size={36} className="text-salvia/40 mb-4" />
                        <p className="font-display text-2xl font-light text-nebbia/80">
                            Lex conosce questa pratica
                        </p>
                        <p className="font-body text-sm text-nebbia/50 mt-3 max-w-lg leading-relaxed">
                            Cliente, controparti, udienze, documenti dell'archivio e ricerche già fatte.
                            Chiedi un'analisi, una strategia, o di generare un atto (diffida, citazione, ricorso...).
                        </p>
                        <button
                            onClick={() => setMostraPopover(true)}
                            className="mt-5 flex items-center gap-2 font-body text-sm text-salvia border border-salvia/40 px-5 py-2.5 hover:bg-salvia/10 transition-colors"
                        >
                            <HelpCircle size={15} /> Cosa posso chiederti?
                        </button>
                    </div>
                )}

                {/* Messaggi conversazione */}
                {conversazione.map((m, i) => (
                    <div key={i} className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className={`font-body text-xs font-medium ${m.role === 'user' ? 'text-oro/70' : 'text-salvia/70'}`}>
                                {m.role === 'user' ? 'Tu' : 'Lex'}
                            </span>
                        </div>

                        {m.role === 'user' ? (
                            <p className="font-body text-sm text-nebbia/60 leading-relaxed">{m.content}</p>
                        ) : m.tipo === 'documento_lex' ? (
                            <div>
                                <DocumentoLex markdown={m.content} tipo={m.tipo_nome} corrente={{ id: praticaId, titolo: titoloPratica }}
                                    onModifica={(nuovo) => setConversazione((c) => c.map((x, k) => (k === i ? { ...x, content: nuovo } : x)))} />
                                {/* Trasparenza AI — art. 50 AI Act / art. 13 L. 132/2025 */}
                                <p className="mt-3 font-body text-xs lg:text-[11px] text-nebbia/35 leading-relaxed">
                                    Documento scritto con intelligenza artificiale. Lex può commettere errori:
                                    rileggilo e verifica dati e fonti prima di firmarlo.
                                </p>
                            </div>
                        ) : (
                            <div className="font-body text-sm text-nebbia/80 leading-relaxed">
                                <ReactMarkdown components={markdownComponents}>
                                    {m.content}
                                </ReactMarkdown>
                                {/* Trasparenza AI — art. 50 AI Act / art. 13 L. 132/2025 */}
                                <p className="mt-4 pt-3 border-t border-white/5 font-body text-xs lg:text-[11px] text-nebbia/35 leading-relaxed">
                                    Contenuto generato con intelligenza artificiale. Lex può commettere errori:
                                    verifica sempre le fonti citate prima dell'uso professionale.
                                </p>
                            </div>
                        )}
                    </div>
                ))}

                {/* In streaming */}
                {inviando && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="font-body text-xs font-medium text-salvia/70">Lex</span>
                            {isDocumentoStreaming && (
                                <span className="font-body text-[10px] text-oro/60 border border-oro/20 px-1.5 py-0.5 uppercase tracking-wider">
                                    Documento
                                </span>
                            )}
                        </div>

                        {isDocumentoStreaming ? (
                            // GENERAZIONE DOCUMENTO: scrive LIVE sul foglio A4.
                            // Finche' non arriva testo, mostra l'animazione + stato reale.
                            streamingTesto.length === 0 ? (
                                <LexAnimazione frasi={statoGenerazione ? [statoGenerazione] : undefined} />
                            ) : (
                                <div>
                                    {statoGenerazione && (
                                        <p className="font-body text-xs text-nebbia/40 mb-2 flex items-center gap-1.5">
                                            <Loader2 size={11} className="animate-spin text-oro/60" />
                                            {statoGenerazione}
                                        </p>
                                    )}
                                    <FoglioA4 markdown={streamingTesto} />
                                </div>
                            )
                        ) : (
                            // CHAT NORMALE: testo markdown in bolla, come prima
                            streamingTesto.length === 0 ? (
                                <LexAnimazione />
                            ) : (
                                <div className="font-body text-sm text-nebbia/80 leading-relaxed">
                                    <ReactMarkdown components={markdownComponents}>
                                        {streamingTesto}
                                    </ReactMarkdown>
                                    <span className="inline-block w-1 h-4 bg-oro/60 align-middle animate-pulse ml-0.5" />
                                </div>
                            )
                        )}
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Errore */}
            {errore && errore !== 'crediti_esauriti' && (
                <div className="mx-5 mb-3 p-3 bg-red-900/10 border border-red-500/30">
                    <p className="font-body text-xs text-red-400 flex items-start gap-2">
                        <AlertCircle size={13} className="shrink-0 mt-0.5" />
                        <span>{errore}</span>
                    </p>
                </div>
            )}

            {errore === 'crediti_esauriti' && (
                <div className="mx-5 mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-oro/5 border border-oro/20">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={13} className="text-oro shrink-0" />
                        <p className="font-body text-xs text-nebbia/60">Crediti Lex esauriti.</p>
                    </div>
                    <a
                        href="/studio?tab=acquista"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex sm:inline items-center justify-center min-h-[44px] sm:min-h-0 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors whitespace-nowrap"
                    >
                        Acquista crediti →
                    </a>
                </div>
            )}

            {/* Input area */}
            <div className="border-t border-white/5 p-4 space-y-2 shrink-0">
                <div className="flex gap-3 items-end">
                    <textarea
                        rows={2}
                        value={domandaLibera}
                        onChange={e => setDomandaLibera(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={inviando || creditiZero}
                        placeholder={creditiZero
                            ? "Crediti esauriti — acquista crediti per continuare"
                            : "Chiedi a Lex un'analisi o di scrivere un atto... (Ctrl+Enter per inviare)"
                        }
                        className="flex-1 min-w-0 min-h-[44px] bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 resize-none placeholder:text-nebbia/25 disabled:opacity-50"
                        style={{ minHeight: '60px', maxHeight: '200px' }}
                    />
                    <button
                        onClick={() => invia()}
                        disabled={inviando || !domandaLibera.trim() || creditiZero}
                        className="px-4 py-3 min-w-[48px] min-h-[48px] lg:min-w-0 lg:min-h-0 bg-salvia/10 border border-salvia/30 text-salvia hover:bg-salvia/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed self-end"
                        title={creditiZero ? 'Crediti esauriti' : 'Invia (Ctrl+Enter)'}
                    >
                        {inviando
                            ? <Loader2 size={15} className="animate-spin" />
                            : <Send size={15} />
                        }
                    </button>
                </div>

                {/* Hint UI-C */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                    <p className="font-body text-xs text-nebbia/55">
                        Posso analizzare la pratica o scrivere atti e documenti con i suoi dati. Ogni risposta consuma 1 credito.
                    </p>
                    <button
                        onClick={() => setMostraPopover(true)}
                        className="flex items-center gap-1.5 font-body text-xs text-salvia hover:text-salvia/80 transition-colors shrink-0 underline underline-offset-2 decoration-salvia/40"
                    >
                        <HelpCircle size={13} /> Cosa posso chiederti?
                    </button>
                </div>
            </div>

            {/* Popover capacita' */}
            {mostraPopover && (
                <PopoverCapacita
                    onClose={() => setMostraPopover(false)}
                    onEsempio={(esempio) => setDomandaLibera(esempio)}
                />
            )}
        </div>
    )
}