// src/pages/NovitaArticolo.jsx
//
// Vetrina, il singolo articolo delle Novità. Il testo è markdown scritto
// dall'admin: react-markdown lo rende senza eseguire HTML.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { articoloDaSlug, firmaAutore, fmtDataLunga } from '@/lib/novita'

const SITO = 'https://www.lexum.it'

// Il markdown prende i caratteri del sito, non quelli di default del browser.
const TESTO = {
    h1: ({ children }) => <h2 className="font-display text-3xl font-light text-nebbia mt-10 mb-4">{children}</h2>,
    h2: ({ children }) => <h2 className="font-display text-2xl font-light text-nebbia mt-10 mb-4">{children}</h2>,
    h3: ({ children }) => <h3 className="font-display text-xl font-light text-nebbia mt-8 mb-3">{children}</h3>,
    p: ({ children }) => <p className="font-body text-base text-nebbia/70 leading-relaxed mb-5">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-5 space-y-2 mb-5 font-body text-base text-nebbia/70">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2 mb-5 font-body text-base text-nebbia/70">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }) => <strong className="text-nebbia font-medium">{children}</strong>,
    a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noreferrer noopener" className="text-oro hover:underline">{children}</a>
    ),
    blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-oro/40 pl-4 my-6 font-body text-base text-nebbia/50 italic">{children}</blockquote>
    ),
    code: ({ children }) => (
        <code className="px-1.5 py-0.5 bg-slate border border-white/10 font-mono text-sm text-salvia">{children}</code>
    ),
    pre: ({ children }) => (
        <pre className="bg-slate border border-white/5 p-4 overflow-x-auto mb-5 text-sm">{children}</pre>
    ),
    img: ({ src, alt }) => <img src={src} alt={alt ?? ''} loading="lazy" className="w-full border border-white/5 my-6" />,
    hr: () => <hr className="border-white/5 my-8" />,
}

export default function NovitaArticolo() {
    const { slug } = useParams()
    const [articolo, setArticolo] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        articoloDaSlug(slug).then(a => {
            setArticolo(a)
            setLoading(false)
        })
    }, [slug])

    if (loading) {
        return (
            <div className="min-h-screen bg-petrolio flex items-center justify-center pt-20">
                <span className="w-6 h-6 border-2 border-oro border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!articolo) {
        return (
            <div className="min-h-screen bg-petrolio text-nebbia pt-32 px-6">
                <div className="max-w-2xl mx-auto text-center">
                    <h1 className="font-display text-3xl font-light mb-3">Articolo non trovato</h1>
                    <p className="font-body text-sm text-nebbia/40 mb-8">Forse è stato spostato o non è più pubblicato.</p>
                    <Link to="/novita" className="inline-flex items-center gap-2 font-body text-sm text-oro hover:underline">
                        <ArrowLeft size={14} /> Torna alle novità
                    </Link>
                </div>
            </div>
        )
    }

    const url = `${SITO}/novita/${articolo.slug}`
    const immagine = articolo.copertina_url || `${SITO}/logo.png`
    const descrizione = articolo.sommario || `${articolo.titolo} — le novità di Lexum.`

    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <Helmet>
                <title>{`${articolo.titolo} — Lexum`}</title>
                <meta name="description" content={descrizione} />
                <link rel="canonical" href={url} />

                <meta property="og:type" content="article" />
                <meta property="og:url" content={url} />
                <meta property="og:title" content={articolo.titolo} />
                <meta property="og:description" content={descrizione} />
                <meta property="og:image" content={immagine} />
                <meta property="og:locale" content="it_IT" />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={articolo.titolo} />
                <meta name="twitter:description" content={descrizione} />
                <meta name="twitter:image" content={immagine} />
            </Helmet>

            <article className="max-w-3xl mx-auto px-6 pt-12 pb-24">
                <Link to="/novita" className="inline-flex items-center gap-2 font-body text-sm text-nebbia/40 hover:text-oro transition-colors mb-8">
                    <ArrowLeft size={14} /> Novità
                </Link>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {articolo.categoria && (
                        <span className="font-body text-xs px-2 py-0.5 border border-salvia/30 text-salvia bg-salvia/10">
                            {articolo.categoria}
                        </span>
                    )}
                    <span className="font-body text-xs text-nebbia/30">
                        {fmtDataLunga(articolo.pubblicato_il)} · {firmaAutore(articolo.autore)}
                    </span>
                </div>

                <h1 className="font-display text-4xl md:text-5xl font-light leading-[1.15] mb-6">{articolo.titolo}</h1>

                {articolo.sommario && (
                    <p className="font-body text-lg text-nebbia/50 leading-relaxed mb-8">{articolo.sommario}</p>
                )}

                {articolo.copertina_url && (
                    <img src={articolo.copertina_url} alt="" className="w-full border border-white/5 mb-10" />
                )}

                <ReactMarkdown components={TESTO}>{articolo.contenuto ?? ''}</ReactMarkdown>

                <div className="mt-14 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="font-body text-sm text-nebbia/40">Vuoi provare Lexum nel tuo studio?</p>
                    <Link
                        to="/registrati"
                        className="flex items-center gap-2 px-6 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors"
                    >
                        Inizia ora <ArrowRight size={14} />
                    </Link>
                </div>
            </article>
        </div>
    )
}
