// src/pages/strumenti/Strumenti.jsx
//
// 03-11-2026: la pagina degli strumenti gratuiti. Si usano senza account e senza AI: portano qui chi cerca
// «calcolo parcella» o «crea fattura», e dopo il primo documento c'è l'invito a provare Lex.
import { Link } from 'react-router-dom'
import { ArrowRight, FileText, Scale } from 'lucide-react'
import { TestataPagina, Apertura } from '@/components/strumenti/Pagina'
import { HUB_STRUMENTI, PARCELLA, FATTURA } from '@/lib/strumenti/testi'

const SCHEDE = [
    { ...PARCELLA, icona: Scale, azione: 'Calcola la parcella' },
    { ...FATTURA, icona: FileText, azione: 'Crea la fattura' },
]

export default function Strumenti() {
    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <TestataPagina percorso={HUB_STRUMENTI.percorso} titolo={HUB_STRUMENTI.metaTitolo} descrizione={HUB_STRUMENTI.metaDescrizione} />
            <Apertura
                etichetta="Strumenti gratis"
                titolo="Il lavoro di tutti i giorni,"
                evidenza="senza pagare."
                testo="Due strumenti per avvocati e professionisti, pronti da usare: niente iscrizione e niente intelligenza artificiale, solo conti giusti e documenti in ordine."
            />
            <section className="max-w-5xl mx-auto px-6 pb-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SCHEDE.map(({ percorso, nome, breve, icona: Icona, azione }) => (
                        <Link key={percorso} to={percorso}
                            className="group flex flex-col bg-slate border border-white/5 hover:border-oro/30 transition-colors p-7">
                            <Icona size={22} className="text-oro mb-5" />
                            <h2 className="font-display text-2xl font-light text-nebbia group-hover:text-oro transition-colors mb-3">{nome}</h2>
                            <p className="font-body text-sm text-nebbia/50 leading-relaxed flex-1">{breve}</p>
                            <span className="flex items-center gap-2 font-body text-sm text-oro mt-6">
                                {azione} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
            <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
                <h2 className="font-display text-3xl font-light mb-4">Quando serve un ragionamento, <span className="text-oro">c'è Lex.</span></h2>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-7">
                    Lex è l'intelligenza artificiale di Lexum per il diritto e il fisco: risponde con le norme e le sentenze collegate, sui tuoi casi e sui tuoi documenti. Con un account gratuito la prima domanda è in omaggio.
                </p>
                <Link to="/registrati" className="inline-flex items-center gap-2 px-6 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors">
                    Iscriviti gratis <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    )
}
