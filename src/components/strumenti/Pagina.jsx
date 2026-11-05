// I pezzi comuni delle pagine degli strumenti gratuiti (03-11-2026).
import { Helmet } from 'react-helmet-async'
import { Check } from 'lucide-react'

const SITO = 'https://www.lexum.it'

export const CAMPO = 'w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25'
export const ETICHETTA = 'block font-body text-xs text-nebbia/50 mb-1.5'

export function TestataPagina({ percorso, titolo, descrizione }) {
    const url = `${SITO}${percorso}`
    return (
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
    )
}

export function Apertura({ etichetta, titolo, evidenza, testo, garanzie = ['Gratis', 'Senza registrazione', 'I dati restano nel tuo browser'] }) {
    return (
        <section className="relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[420px] h-[420px] bg-oro/[0.05] rounded-full blur-3xl" />
            </div>
            <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
                <p className="font-body text-xs text-oro/60 tracking-[0.3em] uppercase mb-4">{etichetta}</p>
                <h1 className="font-display text-4xl md:text-5xl font-light leading-[1.1] mb-5">
                    {titolo} <span className="text-oro">{evidenza}</span>
                </h1>
                <p className="font-body text-base text-nebbia/50 leading-relaxed max-w-2xl mx-auto">{testo}</p>
                <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6">
                    {garanzie.map(t => (
                        <li key={t} className="flex items-center gap-2 font-body text-xs text-nebbia/50">
                            <Check size={13} className="text-salvia" /> {t}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    )
}

export function DomandeFrequenti({ domande }) {
    return (
        <div className="space-y-2">
            {domande.map(({ d, r }) => (
                <details key={d} className="group bg-slate border border-white/5 px-5 py-4 open:border-oro/20">
                    <summary className="font-body text-sm text-nebbia cursor-pointer marker:text-oro/50">{d}</summary>
                    <p className="font-body text-sm text-nebbia/55 leading-relaxed mt-3">{r}</p>
                </details>
            ))}
        </div>
    )
}
