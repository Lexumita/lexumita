// src/pages/Novita.jsx
//
// Vetrina, pagina "Novità": l'elenco degli articoli pubblicati dall'admin.
// Serve a raccontare quello che cambia in Lexum, funzione per funzione.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowRight, Newspaper } from 'lucide-react'
import { elencoNovita, firmaAutore, fmtDataLunga } from '@/lib/novita'

export default function Novita() {
    const [articoli, setArticoli] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        elencoNovita().then(righe => {
            setArticoli(righe)
            setLoading(false)
        })
    }, [])

    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <Helmet>
                <title>Novità — Lexum</title>
                <meta
                    name="description"
                    content="Le novità di Lexum: funzioni nuove, migliorie e aggiornamenti della piattaforma per avvocati e commercialisti."
                />
                <link rel="canonical" href="https://www.lexum.it/novita" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.lexum.it/novita" />
                <meta property="og:title" content="Novità — Lexum" />
                <meta
                    property="og:description"
                    content="Funzioni nuove, migliorie e aggiornamenti della piattaforma Lexum."
                />
                <meta property="og:image" content="https://www.lexum.it/logo.png" />
                <meta property="og:locale" content="it_IT" />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Novità — Lexum" />
                <meta name="twitter:description" content="Funzioni nuove, migliorie e aggiornamenti di Lexum." />
                <meta name="twitter:image" content="https://www.lexum.it/logo.png" />
            </Helmet>

            {/* Testata */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-1/4 w-[420px] h-[420px] bg-oro/[0.05] rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-1/4 w-[360px] h-[360px] bg-salvia/[0.04] rounded-full blur-3xl" />
                </div>
                <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 border border-oro/20 bg-oro/5 mb-6">
                        <Newspaper size={11} className="text-oro/60" />
                        <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">Novità</span>
                    </div>
                    <h1 className="font-display text-4xl md:text-6xl font-light leading-[1.1] mb-5">
                        Cosa cambia in <span className="text-oro-shimmer">Lexum</span>.
                    </h1>
                    <p className="font-body text-base text-nebbia/45 leading-relaxed max-w-2xl mx-auto">
                        Funzioni nuove, migliorie e appunti dal lavoro di tutti i giorni con avvocati e commercialisti.
                    </p>
                </div>
            </section>

            {/* Elenco */}
            <section className="max-w-5xl mx-auto px-6 pb-24">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <span className="w-6 h-6 border-2 border-oro border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : articoli.length === 0 ? (
                    <div className="text-center py-16">
                        <Newspaper size={34} className="mx-auto text-nebbia/10 mb-4" />
                        <p className="font-display text-xl font-light text-nebbia/40">Ancora nessun articolo</p>
                        <p className="font-body text-sm text-nebbia/25 mt-2">Torna presto: qui raccontiamo ogni novità della piattaforma.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {articoli.map(a => (
                            <Link
                                key={a.slug}
                                to={`/novita/${a.slug}`}
                                className="group flex flex-col bg-slate border border-white/5 hover:border-oro/30 transition-colors overflow-hidden"
                            >
                                {a.copertina_url && (
                                    <img
                                        src={a.copertina_url}
                                        alt=""
                                        loading="lazy"
                                        className="w-full h-44 object-cover border-b border-white/5"
                                    />
                                )}
                                <div className="flex-1 flex flex-col p-5">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        {a.categoria && (
                                            <span className="font-body text-xs px-2 py-0.5 border border-salvia/30 text-salvia bg-salvia/10">
                                                {a.categoria}
                                            </span>
                                        )}
                                        <span className="font-body text-xs text-nebbia/30">{fmtDataLunga(a.pubblicato_il)}</span>
                                    </div>
                                    <h2 className="font-display text-xl font-light text-nebbia leading-snug group-hover:text-oro transition-colors">
                                        {a.titolo}
                                    </h2>
                                    {a.sommario && (
                                        <p className="font-body text-sm text-nebbia/45 leading-relaxed mt-2 flex-1">{a.sommario}</p>
                                    )}
                                    <span className="flex items-center gap-2 font-body text-xs text-nebbia/30 mt-4">
                                        {firmaAutore(a.autore)}
                                        <ArrowRight size={12} className="text-oro/50 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
