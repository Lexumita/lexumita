// src/pages/Novita.jsx
//
// Vetrina, pagina "Articoli" (indirizzo /novita, che resta per non perdere i collegamenti):
// l'elenco degli articoli pubblicati dall'admin, con la ricerca e gli argomenti.

import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowRight, Newspaper, Search, X } from 'lucide-react'
import { elencoNovita, filtraArticoli, firmaAutore, fmtDataLunga } from '@/lib/novita'
import { ARGOMENTI, argomentoDaSlug } from '@/lib/argomenti'
import StaticoPronto from '@/components/StaticoPronto'

const SITO = 'https://www.lexum.it'
const TITOLO = 'Articoli di legge spiegati in modo semplice — Lexum'
const DESCRIZIONE = 'Leggi, sentenze e casi di attualità spiegati in modo semplice, con le fonti: casa, lavoro, famiglia, penale, fisco e altro ancora.'
const PER_PAGINA = 30

// preArticoli: già letti da chi prepara il testo dentro l'HTML (src/seo/entry-seo.jsx)
export default function Novita({ preArticoli = null }) {
    const { argomento: slugArgomento } = useParams()
    const argomento = argomentoDaSlug(slugArgomento)
    const [parametri, setParametri] = useSearchParams()
    const cerca = parametri.get('q') ?? ''
    const [tutti, setTutti] = useState(preArticoli ?? [])
    const [loading, setLoading] = useState(!preArticoli)
    const [quanti, setQuanti] = useState(PER_PAGINA)

    useEffect(() => {
        elencoNovita().then(righe => {
            setTutti(righe)
            setLoading(false)
        })
    }, [])

    useEffect(() => { setQuanti(PER_PAGINA) }, [cerca, slugArgomento])

    if (slugArgomento && !argomento) return <Navigate to="/novita" replace />

    const dellArgomento = argomento ? tutti.filter(a => a.argomenti?.includes(argomento.slug)) : tutti
    const articoli = filtraArticoli(dellArgomento, cerca)
    // Nel testo dentro l'HTML ci sono tutti: chi legge senza JavaScript non ha il pulsante
    const visibili = preArticoli ? articoli : articoli.slice(0, quanti)
    const argomentiConArticoli = ARGOMENTI.filter(x => tutti.some(a => a.argomenti?.includes(x.slug)))
    const url = argomento ? `${SITO}/novita/argomento/${argomento.slug}` : `${SITO}/novita`
    const titolo = argomento ? `${argomento.titolo} — Lexum` : TITOLO
    const descrizione = argomento ? argomento.descrizione : DESCRIZIONE
    const conRicerca = cerca.trim() ? `?q=${encodeURIComponent(cerca)}` : ''

    const scrivi = (testo) => setParametri(testo ? { q: testo } : {}, { replace: true })

    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <StaticoPronto quando={!loading} />
            <Helmet>
                <title>{titolo}</title>
                <meta name="description" content={descrizione} />
                <link rel="canonical" href={url} />

                <meta property="og:type" content="website" />
                <meta property="og:url" content={url} />
                <meta property="og:title" content={titolo} />
                <meta property="og:description" content={descrizione} />
                <meta property="og:image" content={`${SITO}/logo.png`} />
                <meta property="og:locale" content="it_IT" />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={titolo} />
                <meta name="twitter:description" content={descrizione} />
                <meta name="twitter:image" content={`${SITO}/logo.png`} />
            </Helmet>

            {/* Testata: il titolo a sinistra, la ricerca e gli argomenti a destra */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-1/4 w-[420px] h-[420px] bg-oro/[0.05] rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-1/4 w-[360px] h-[360px] bg-salvia/[0.04] rounded-full blur-3xl" />
                </div>
                <div className="relative max-w-7xl mx-auto px-6 pt-10 lg:pt-14 pb-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 lg:items-end">
                    <div className="lg:col-span-5">
                        <div className="inline-flex items-center gap-2 px-4 py-2 border border-oro/20 bg-oro/5 mb-5">
                            <Newspaper size={11} className="text-oro/60" />
                            <span className="font-body text-xs text-nebbia/50 tracking-widest uppercase">Articoli</span>
                        </div>
                        {argomento ? (
                            <>
                                <h1 className="font-display text-4xl md:text-5xl font-light leading-[1.1] mb-4">{argomento.nome}</h1>
                                <p className="font-body text-base text-nebbia/45 leading-relaxed">{argomento.descrizione}</p>
                            </>
                        ) : (
                            <>
                                <h1 className="font-display text-4xl md:text-6xl font-light leading-[1.1] mb-4">
                                    Il diritto, <span className="text-oro-shimmer">spiegato</span>.
                                </h1>
                                <p className="font-body text-base text-nebbia/45 leading-relaxed">
                                    Leggi, sentenze e casi di attualità spiegati in modo semplice, con le fonti.
                                </p>
                            </>
                        )}
                    </div>

                    <div className="lg:col-span-7">
                        <div role="search" className="relative mb-3">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-nebbia/30 pointer-events-none" />
                            <input
                                type="search"
                                value={cerca}
                                onChange={e => scrivi(e.target.value)}
                                placeholder="Cerca: affitto, licenziamento, multa…"
                                aria-label="Cerca tra gli articoli"
                                className="w-full bg-slate border border-white/10 focus:border-oro/40 outline-none font-body text-sm text-nebbia placeholder:text-nebbia/30 pl-11 pr-11 py-3 transition-colors [&::-webkit-search-cancel-button]:appearance-none"
                            />
                            {cerca && (
                                <button
                                    type="button"
                                    onClick={() => scrivi('')}
                                    aria-label="Cancella la ricerca"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-nebbia/40 hover:text-oro transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Gli argomenti: compaiono solo quelli che hanno già articoli */}
                        {argomentiConArticoli.length > 0 && (
                            <nav aria-label="Argomenti" className="flex flex-wrap gap-2">
                                <Link to={`/novita${conRicerca}`}
                                    className={`font-body text-xs px-3 py-1.5 border transition-colors ${!argomento ? 'border-oro/50 bg-oro/10 text-oro' : 'border-white/10 text-nebbia/50 hover:border-oro/30 hover:text-oro'}`}>
                                    Tutti
                                </Link>
                                {argomentiConArticoli.map(x => (
                                    <Link key={x.slug} to={`/novita/argomento/${x.slug}${conRicerca}`}
                                        className={`font-body text-xs px-3 py-1.5 border transition-colors ${argomento?.slug === x.slug ? 'border-oro/50 bg-oro/10 text-oro' : 'border-white/10 text-nebbia/50 hover:border-oro/30 hover:text-oro'}`}>
                                        {x.nome}
                                    </Link>
                                ))}
                            </nav>
                        )}
                    </div>
                </div>
            </section>

            {/* Elenco */}
            <section className="max-w-7xl mx-auto px-6 pb-24">
                {cerca.trim() && !loading && articoli.length > 0 && (
                    <p aria-live="polite" className="font-body text-xs text-nebbia/40 mb-4">
                        {articoli.length === 1 ? '1 articolo trovato' : `${articoli.length} articoli trovati`}
                    </p>
                )}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <span className="w-6 h-6 border-2 border-oro border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : articoli.length === 0 ? (
                    <div className="text-center py-16">
                        <Newspaper size={34} className="mx-auto text-nebbia/10 mb-4" />
                        {cerca.trim() ? (
                            <>
                                <p className="font-display text-xl font-light text-nebbia/40">Nessun articolo per «{cerca.trim()}»</p>
                                <p className="font-body text-sm text-nebbia/25 mt-2">Prova con un'altra parola, o chiedi direttamente a Lex.</p>
                            </>
                        ) : (
                            <>
                                <p className="font-display text-xl font-light text-nebbia/40">Ancora nessun articolo</p>
                                <p className="font-body text-sm text-nebbia/25 mt-2">Torna presto: ne pubblichiamo di nuovi ogni settimana.</p>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {visibili.map(a => (
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
                                            <p className="font-body text-sm text-nebbia/45 leading-relaxed mt-2 flex-1 line-clamp-4">{a.sommario}</p>
                                        )}
                                        <span className="flex items-center gap-2 font-body text-xs text-nebbia/30 mt-4">
                                            {firmaAutore(a.autore)}
                                            <ArrowRight size={12} className="text-oro/50 group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        {visibili.length < articoli.length && (
                            <div className="flex justify-center mt-8">
                                <button
                                    type="button"
                                    onClick={() => setQuanti(n => n + PER_PAGINA)}
                                    className="font-body text-sm px-6 py-2.5 border border-oro/30 text-oro hover:bg-oro/10 transition-colors"
                                >
                                    Mostra altri articoli
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    )
}
