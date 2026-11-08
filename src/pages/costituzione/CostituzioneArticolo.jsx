// src/pages/costituzione/CostituzioneArticolo.jsx
//
// 08-11-2026: un articolo della Costituzione. Il testo in vigore è pubblico; sentenze e massime restano nella
// Banca Dati, per chi ha un account (la pagina ci porta, non le mostra).
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, ArrowRight, ExternalLink, Library, MessageSquare } from 'lucide-react'
import { TestataPagina } from '@/components/strumenti/Pagina'
import { useAuth } from '@/context/AuthContext'
import { articoliCheCitano } from '@/lib/novita'
import {
    PERCORSO, vocePerSlug, nomeDi, spiegazioneDi, titoloDi, metaDi, commiNumerati, continuaComma, pezzi,
    vicini, percorsoDi, segnoNelBlog, dataLunga,
} from '@/lib/costituzione'

// Dove porta chi ha già un account: la Banca Dati e Lex del suo ruolo
const BANCA_DATI = { avvocato: '/banca-dati', commercialista: '/banca-dati', user: '/area' }
const LEX = { avvocato: '/chat', commercialista: '/chat', user: '/area/chat' }

function Riga({ riga }) {
    return pezzi(riga).map((p, i) => {
        if (p.tolto) return <span key={i} title="Parole tolte da una legge successiva" className="text-nebbia/35">[…]</span>
        if (p.modificato) return <mark key={i} className="bg-oro/10 text-nebbia border-b border-oro/40">{p.testo}</mark>
        return <span key={i}>{p.testo}</span>
    })
}

// Le leggi dell'ultima modifica, una volta sola anche se cambiano più punti dell'articolo
function ultimeModifiche(voce) {
    const leggi = []
    for (const m of voce.modifiche) {
        let l = leggi.find(x => x.nome === m.nome)
        if (!l) leggi.push(l = { nome: m.nome, normattiva: m.normattiva, cosa: [] })
        if (m.cosa && !l.cosa.includes(m.cosa)) l.cosa.push(m.cosa)
    }
    return leggi
}

function Riquadro({ icona: Icona, titolo, testo, azione, verso }) {
    return (
        <div className="flex flex-col bg-slate border border-white/5 p-6">
            <Icona size={20} className="text-oro mb-4" />
            <h2 className="font-display text-xl font-light text-nebbia mb-2">{titolo}</h2>
            <p className="font-body text-sm text-nebbia/50 leading-relaxed flex-1">{testo}</p>
            <Link to={verso} className="inline-flex items-center gap-2 font-body text-sm text-oro hover:underline mt-5">
                {azione} <ArrowRight size={14} />
            </Link>
        </div>
    )
}

// preCitazioni: gli articoli del blog che lo citano, già letti da chi prepara l'HTML (src/seo/entry-seo.jsx)
export default function CostituzioneArticolo({ preCitazioni = null }) {
    const { slug } = useParams()
    const voce = vocePerSlug(slug)
    const { profile } = useAuth()
    const [citazioni, setCitazioni] = useState(preCitazioni ?? [])

    useEffect(() => {
        if (!voce || voce.tipo !== 'articolo') { setCitazioni([]); return }
        let attivo = true
        articoliCheCitano(segnoNelBlog(voce)).then(c => { if (attivo) setCitazioni(c) })
        return () => { attivo = false }
    }, [slug])

    if (!voce) {
        return (
            <div className="min-h-screen bg-petrolio text-nebbia pt-32 px-6">
                <div className="max-w-2xl mx-auto text-center">
                    <Helmet><title>Articolo non trovato — Lexum</title><meta name="robots" content="noindex, follow" /></Helmet>
                    <h1 className="font-display text-3xl font-light mb-3">Articolo non trovato</h1>
                    <p className="font-body text-sm text-nebbia/40 mb-8">La Costituzione ha 139 articoli e 18 disposizioni transitorie e finali.</p>
                    <Link to={PERCORSO} className="inline-flex items-center gap-2 font-body text-sm text-oro hover:underline">
                        <ArrowLeft size={14} /> Torna alla Costituzione
                    </Link>
                </div>
            </div>
        )
    }

    const nome = nomeDi(voce)
    const spiegazione = spiegazioneDi(voce)
    const meta = metaDi(voce)
    const { prima, dopo } = vicini(voce)
    const leggi = ultimeModifiche(voce)
    const haTolto = voce.commi.some(c => c.includes('((…))'))
    const ruolo = profile?.role
    const percorso = [voce.parte, voce.titolo, voce.sezione].filter(Boolean)

    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <TestataPagina percorso={percorsoDi(voce)} titolo={meta.titolo} descrizione={meta.descrizione} />

            <article className="max-w-3xl mx-auto px-6 pt-12 pb-24">
                <nav aria-label="Percorso" className="flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-xs text-nebbia/35 mb-8">
                    <Link to={PERCORSO} className="text-nebbia/50 hover:text-oro transition-colors">Costituzione</Link>
                    {percorso.map(l => (
                        <span key={`${l.numero}${l.nome}`} className="flex items-center gap-2">
                            <span className="text-nebbia/20">›</span>
                            {l.numero ? `${l.numero} · ${l.nome}` : l.nome}
                        </span>
                    ))}
                </nav>

                <h1 className="font-display text-4xl md:text-5xl font-light leading-[1.15]">{titoloDi(voce)}</h1>
                {nome && <p className="font-display text-2xl md:text-3xl font-light text-oro mt-2">{nome}</p>}

                {/* Il testo in vigore, comma per comma */}
                <section className="mt-10 bg-slate border border-white/5 p-6 md:p-8">
                    <p className="font-body text-xs text-nebbia/40 tracking-[0.25em] uppercase mb-5">
                        Testo in vigore{voce.inVigoreDal ? ` dal ${dataLunga(voce.inVigoreDal)}` : ''}
                    </p>
                    <div className="space-y-3">
                        {commiNumerati(voce).map(({ riga, numero }, i) => (
                            <p key={i} className={`flex gap-4 font-body text-base text-nebbia/80 leading-relaxed ${continuaComma(riga) ? 'pl-8 sm:pl-10' : ''}`}>
                                {numero != null && (
                                    <span className="w-4 shrink-0 text-right font-body text-xs text-nebbia/25 pt-1" title={`Comma ${numero}`}>{numero}</span>
                                )}
                                <span className="min-w-0"><Riga riga={riga} /></span>
                            </p>
                        ))}
                    </div>
                    {voce.firme?.length > 0 && (
                        <div className="mt-6 pt-5 border-t border-white/5 space-y-1">
                            {voce.firme.map((f, i) => <p key={i} className="font-body text-sm text-nebbia/45">{f}</p>)}
                        </div>
                    )}

                    {(leggi.length > 0 || voce.note.length > 0) && (
                        <div className="mt-6 pt-5 border-t border-white/5 space-y-3 font-body text-sm text-nebbia/50 leading-relaxed">
                            {leggi.map(l => (
                                <div key={l.nome}>
                                    <p>
                                        Ultima modifica:{' '}
                                        {l.normattiva
                                            ? <a href={l.normattiva} target="_blank" rel="noopener noreferrer" className="text-oro hover:underline">{l.nome}</a>
                                            : l.nome}
                                    </p>
                                    {l.cosa.map(c => <p key={c} className="text-nebbia/35">{c.charAt(0).toUpperCase() + c.slice(1)}</p>)}
                                </div>
                            ))}
                            {voce.commi.some(c => /\(\((?!…)/.test(c)) && (
                                <p className="text-nebbia/35"><mark className="bg-oro/10 text-nebbia/60 border-b border-oro/40 px-0.5">In evidenza</mark> le parti cambiate dall'ultima modifica.</p>
                            )}
                            {haTolto && <p className="text-nebbia/35">[…] segna le parole tolte da una legge successiva.</p>}
                            {voce.note.map(n => <p key={n} className="text-nebbia/40">Nota: {n}</p>)}
                        </div>
                    )}

                    <a href={voce.normattiva} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-6 font-body text-sm text-nebbia/50 hover:text-oro transition-colors">
                        Leggilo su Normattiva, la fonte ufficiale <ExternalLink size={13} />
                    </a>
                </section>

                {spiegazione && (
                    <section className="mt-12">
                        <h2 className="font-display text-2xl font-light mb-4">In parole semplici</h2>
                        {spiegazione.map(p => <p key={p} className="font-body text-base text-nebbia/70 leading-relaxed mb-4">{p}</p>)}
                        <p className="font-body text-xs text-nebbia/30">Una spiegazione per orientarsi, scritta da Lexum: non sostituisce il parere di un avvocato sul tuo caso.</p>
                    </section>
                )}

                {citazioni.length > 0 && (
                    <section className="mt-12">
                        <h2 className="font-display text-2xl font-light mb-4">Ne abbiamo parlato</h2>
                        <ul className="space-y-3">
                            {citazioni.map(c => (
                                <li key={c.slug}>
                                    <Link to={`/novita/${c.slug}`} className="font-display text-lg font-light text-nebbia hover:text-oro transition-colors">{c.titolo}</Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <section className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Riquadro
                        icona={Library}
                        titolo="Sentenze e massime"
                        testo={BANCA_DATI[ruolo]
                            ? `Nella Banca Dati trovi le decisioni della Corte costituzionale e delle altre corti che applicano ${voce.tipo === 'articolo' ? `l'art. ${voce.numero}` : 'questa disposizione'}.`
                            : `Le decisioni della Corte costituzionale e delle altre corti che applicano ${voce.tipo === 'articolo' ? `l'art. ${voce.numero}` : 'questa disposizione'} sono nella Banca Dati di Lexum. È gratuita: serve solo un account.`}
                        azione={BANCA_DATI[ruolo] ? 'Apri la Banca Dati' : "Crea l'account gratuito"}
                        verso={BANCA_DATI[ruolo] ?? '/registrati'}
                    />
                    <Riquadro
                        icona={MessageSquare}
                        titolo="Hai un caso concreto?"
                        testo={LEX[ruolo]
                            ? 'Chiedi a Lex se e come questo articolo si applica al tuo caso: risponde con le norme e le sentenze collegate.'
                            : "Lex, l'intelligenza artificiale di Lexum, risponde sul tuo caso con le norme e le sentenze collegate. Con un account gratuito la prima domanda è in omaggio."}
                        azione="Chiedi a Lex"
                        verso={LEX[ruolo] ?? '/registrati'}
                    />
                </section>

                <nav aria-label="Articoli vicini" className="mt-14 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
                    <div>
                        {prima && (
                            <Link to={percorsoDi(prima)} className="group inline-flex flex-col">
                                <span className="flex items-center gap-2 font-body text-xs text-nebbia/35"><ArrowLeft size={13} /> Prima</span>
                                <span className="font-body text-sm text-nebbia/70 group-hover:text-oro transition-colors mt-1">{prima.etichetta}{nomeDi(prima) ? ` · ${nomeDi(prima)}` : ''}</span>
                            </Link>
                        )}
                    </div>
                    <div className="text-right">
                        {dopo && (
                            <Link to={percorsoDi(dopo)} className="group inline-flex flex-col items-end">
                                <span className="flex items-center gap-2 font-body text-xs text-nebbia/35">Dopo <ArrowRight size={13} /></span>
                                <span className="font-body text-sm text-nebbia/70 group-hover:text-oro transition-colors mt-1">{dopo.etichetta}{nomeDi(dopo) ? ` · ${nomeDi(dopo)}` : ''}</span>
                            </Link>
                        )}
                    </div>
                </nav>
                <p className="text-center mt-8">
                    <Link to={PERCORSO} className="font-body text-sm text-nebbia/40 hover:text-oro transition-colors">Tutti gli articoli della Costituzione</Link>
                </p>
            </article>
        </div>
    )
}
