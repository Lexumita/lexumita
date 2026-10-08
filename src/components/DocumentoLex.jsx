// src/components/DocumentoLex.jsx
//
// 08-10-2026: un documento scritto da Lex in Banca Dati (modalità atto): foglio con i segnaposto evidenziati,
// note per chi firma a parte, Scarica Word, Scarica PDF e Copia per tutti. Avvocati e commercialisti hanno in
// più la carta intestata presa dal profilo (decisione dell'utente dell'08-10); i privati scaricano senza.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { FileDown, FileText, Copy, Check, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { separaNote, blocchiDaMarkdown, segnaposti, nomeFileDocumento, testoDi } from '@/lib/documento/testoDocumento'
import { cartaIntestata, RUOLI_CARTA_INTESTATA } from '@/lib/documento/cartaIntestata'
import { creaDocx } from '@/lib/documento/docx'

const RE_SEGNAPOSTO = /(\[[^[\]\n]{2,150}\])/g

// Note per chi firma: le fonti hanno i loro link (interni alla banca dati o esterni)
const componentiNote = {
    p: ({ children }) => <p className="mb-1.5">{children}</p>,
    ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5">{children}</ol>,
    ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5">{children}</ul>,
    strong: ({ children }) => <strong className="font-medium text-nebbia/80">{children}</strong>,
    a: ({ href, children }) => (String(href ?? '').startsWith('/')
        ? <Link to={href} className="text-oro/80 hover:text-oro underline">{children}</Link>
        : <a href={href} target="_blank" rel="noopener noreferrer" className="text-oro/80 hover:text-oro underline">{children}</a>),
}

function Pezzi({ pezzi }) {
    return pezzi.map((p, i) => {
        const parti = String(p.testo).split(RE_SEGNAPOSTO)
        let nodo = parti.map((parte, j) => {
            const righe = parte.split('\n').flatMap((r, k) => (k ? [<br key={`b${k}`} />, r] : [r]))
            return /^\[[^[\]\n]{2,150}\]$/.test(parte) && parte === parte.toLocaleUpperCase('it-IT')
                ? <mark key={j} className="bg-amber-100 text-amber-900 px-0.5 rounded-sm">{righe}</mark>
                : <span key={j}>{righe}</span>
        })
        if (p.corsivo) nodo = <em>{nodo}</em>
        if (p.grassetto) nodo = <strong className="font-bold">{nodo}</strong>
        return <span key={i}>{nodo}</span>
    })
}

function Foglio({ blocchi, carta }) {
    return (
        <div className="bg-neutral-300/70 px-2 sm:px-5 py-5">
            <div className="bg-white shadow-xl mx-auto w-full max-w-[680px] text-neutral-900 px-5 sm:px-12 py-8 sm:py-12 font-display">
                {carta && (
                    <div className="text-center border-b border-neutral-400 pb-2 mb-6">
                        <p className="text-[1.05rem] font-bold">{carta.intestatario}</p>
                        {carta.righe.map((r, i) => <p key={i} className="text-[0.72rem] leading-snug text-neutral-600">{r}</p>)}
                    </div>
                )}
                {blocchi.map((b, i) => {
                    if (b.tipo === 'titolo') {
                        const classe = b.livello === 1
                            ? 'text-center text-[1.3rem] font-bold uppercase tracking-wide mb-5 mt-1'
                            : b.livello === 2 ? 'text-[1.05rem] font-bold uppercase tracking-wide mt-6 mb-2' : 'text-[1rem] font-semibold italic mt-4 mb-1.5'
                        return <p key={i} className={classe}><Pezzi pezzi={b.pezzi} /></p>
                    }
                    if (b.tipo === 'linea') return <hr key={i} className="my-5 border-neutral-300" />
                    if (b.tipo === 'citazione') {
                        return <blockquote key={i} className="border-l-2 border-neutral-300 pl-4 my-3 italic text-neutral-700"><Pezzi pezzi={b.pezzi} /></blockquote>
                    }
                    if (b.tipo === 'elenco') {
                        return (
                            <div key={i} className="my-3 space-y-1.5">
                                {b.voci.map((v, j) => (
                                    <div key={j} className="flex gap-2 text-[0.98rem] leading-[1.6] text-justify" style={{ paddingLeft: `${v.livello * 1.25}rem` }}>
                                        <span className="w-6 shrink-0 text-right">{v.segno}</span>
                                        <span className="flex-1"><Pezzi pezzi={v.pezzi} /></span>
                                    </div>
                                ))}
                            </div>
                        )
                    }
                    return <p key={i} className="text-[0.98rem] text-justify leading-[1.7] mb-3.5"><Pezzi pezzi={b.pezzi} /></p>
                })}
            </div>
        </div>
    )
}

function salva(blob, nome) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
}

const html = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const htmlPezzi = (pezzi) => pezzi.map((p) => {
    let t = html(p.testo).replace(/\n/g, '<br>')
    if (p.corsivo) t = `<em>${t}</em>`
    if (p.grassetto) t = `<strong>${t}</strong>`
    return t
}).join('')

// Il documento per gli appunti: HTML (Word tiene titoli e grassetti) e testo semplice
function perAppunti(blocchi) {
    const h = []
    const t = []
    for (const b of blocchi) {
        if (b.tipo === 'titolo') { h.push(`<h${b.livello}>${htmlPezzi(b.pezzi)}</h${b.livello}>`); t.push(testoDi(b.pezzi)) }
        else if (b.tipo === 'linea') { h.push('<hr>'); t.push('') }
        else if (b.tipo === 'elenco') {
            for (const v of b.voci) {
                h.push(`<p style="margin-left:${1 + v.livello * 1.25}em">${v.segno ? `${html(v.segno)} ` : ''}${htmlPezzi(v.pezzi)}</p>`)
                t.push(`${'  '.repeat(v.livello)}${v.segno ? `${v.segno} ` : ''}${testoDi(v.pezzi)}`)
            }
        } else { h.push(`<p>${htmlPezzi(b.pezzi)}</p>`); t.push(testoDi(b.pezzi)) }
    }
    return { html: h.join('\n'), testo: t.join('\n\n') }
}

export default function DocumentoLex({ markdown, tipo }) {
    const { profile } = useAuth()
    const { corpo, note } = useMemo(() => separaNote(markdown), [markdown])
    const blocchi = useMemo(() => blocchiDaMarkdown(corpo), [corpo])
    const daCompletare = useMemo(() => segnaposti(corpo), [corpo])
    const carta = useMemo(() => cartaIntestata(profile), [profile])
    const professionista = RUOLI_CARTA_INTESTATA.includes(profile?.role)
    const [conCarta, setConCarta] = useState(true)
    const [lavoro, setLavoro] = useState(null)        // 'word' | 'pdf' | null
    const [avviso, setAvviso] = useState('')
    const [copiato, setCopiato] = useState(false)
    const [noteAperte, setNoteAperte] = useState(false)

    const cartaUsata = professionista && conCarta ? carta : null
    const titolo = tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : 'Documento'

    async function scaricaWord() {
        setAvviso('')
        setLavoro('word')
        try {
            salva(creaDocx({ blocchi, carta: cartaUsata, titolo }), nomeFileDocumento(tipo, 'docx'))
        } catch {
            setAvviso('Non sono riuscito a creare il file Word. Riprova tra qualche istante.')
        } finally {
            setLavoro(null)
        }
    }

    async function scaricaPdf() {
        setAvviso('')
        setLavoro('pdf')
        try {
            const { creaPdfDocumento } = await import('@/lib/documento/pdfDocumento')
            salva(await creaPdfDocumento({ blocchi, carta: cartaUsata, titolo }), nomeFileDocumento(tipo, 'pdf'))
        } catch (e) {
            setAvviso(e?.message || 'Non sono riuscito a creare il PDF. Riprova tra qualche istante.')
        } finally {
            setLavoro(null)
        }
    }

    async function copia() {
        setAvviso('')
        const { html: h, testo } = perAppunti(blocchi)
        try {
            if (window.ClipboardItem && navigator.clipboard?.write) {
                await navigator.clipboard.write([new window.ClipboardItem({
                    'text/html': new Blob([h], { type: 'text/html' }),
                    'text/plain': new Blob([testo], { type: 'text/plain' }),
                })])
            } else {
                await navigator.clipboard.writeText(testo)
            }
            setCopiato(true)
            setTimeout(() => setCopiato(false), 2500)
        } catch {
            setAvviso('Il browser non ha permesso di copiare. Usa Scarica Word.')
        }
    }

    const pulsante = 'flex items-center gap-1.5 font-body text-xs text-nebbia/60 hover:text-oro border border-white/10 hover:border-oro/40 px-3 py-1.5 transition-colors disabled:opacity-40'

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 font-body text-[10px] uppercase tracking-wider text-salvia border border-salvia/30 bg-salvia/5 px-2 py-0.5">
                    <FileText size={11} /> Documento
                </span>
                <span className="font-body text-xs text-nebbia/50">{titolo}</span>
                {daCompletare.length > 0 && (
                    <span className="font-body text-xs text-amber-400/80">
                        {daCompletare.length === 1 ? '1 dato da completare' : `${daCompletare.length} dati da completare`}, evidenziati nel foglio
                    </span>
                )}
            </div>

            <Foglio blocchi={blocchi} carta={cartaUsata} />

            <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={scaricaWord} disabled={!!lavoro} className={pulsante}>
                    {lavoro === 'word' ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />} Scarica Word
                </button>
                <button type="button" onClick={scaricaPdf} disabled={!!lavoro} className={pulsante}>
                    {lavoro === 'pdf' ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />} Scarica PDF
                </button>
                <button type="button" onClick={copia} className={pulsante}>
                    {copiato ? <Check size={12} /> : <Copy size={12} />} {copiato ? 'Copiato' : 'Copia il testo'}
                </button>
                {professionista && carta && (
                    <label className="flex items-center gap-1.5 font-body text-xs text-nebbia/60 ml-1 cursor-pointer select-none">
                        <input type="checkbox" checked={conCarta} onChange={(e) => setConCarta(e.target.checked)} className="accent-oro" />
                        Con la mia carta intestata
                    </label>
                )}
            </div>
            {professionista && !carta && (
                <p className="font-body text-xs text-nebbia/40">
                    Per la carta intestata completa nel profilo nome, indirizzo dello studio e dati dell&apos;albo.
                </p>
            )}
            {avviso && <p className="font-body text-xs text-red-400/80">{avviso}</p>}

            {note && (
                <div className="border border-white/10 bg-petrolio/40">
                    <button type="button" onClick={() => setNoteAperte((v) => !v)}
                        className="w-full flex items-center gap-2 px-3 py-2 font-body text-xs text-nebbia/70 hover:text-oro transition-colors">
                        {noteAperte ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        Note per la revisione: dati da completare e punti da verificare prima di firmare
                    </button>
                    {noteAperte && (
                        <div className="px-4 pb-3 font-body text-xs text-nebbia/60 leading-relaxed">
                            <ReactMarkdown components={componentiNote}>{note}</ReactMarkdown>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
