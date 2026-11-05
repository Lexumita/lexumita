// La sezione degli strumenti gratuiti nelle pagine della vetrina (03-11-2026).
import { Link } from 'react-router-dom'
import { ArrowRight, Calculator, FileText, Scale } from 'lucide-react'
import { PARCELLA, FATTURA, DANNO } from '@/lib/strumenti/testi'

const ICONE = { [PARCELLA.slug]: Scale, [FATTURA.slug]: FileText, [DANNO.slug]: Calculator }

export default function SezioneStrumenti({ titolo = 'Parcelle, fatture e danno biologico,', evidenza = 'gratis e senza iscrizione.' }) {
    return (
        <section className="py-24 px-6 border-t border-white/5">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-10">
                    <p className="font-body text-xs text-oro/60 tracking-[0.3em] uppercase mb-3">Strumenti gratis</p>
                    <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia">{titolo} <span className="text-oro">{evidenza}</span></h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[PARCELLA, FATTURA, DANNO].map(x => {
                        const Icona = ICONE[x.slug]
                        return (
                            <Link key={x.percorso} to={x.percorso} className="group flex flex-col bg-slate border border-white/5 hover:border-oro/30 transition-colors p-6">
                                <Icona size={20} className="text-oro mb-4" />
                                <h3 className="font-display text-xl font-light text-nebbia group-hover:text-oro transition-colors mb-2">{x.nome}</h3>
                                <p className="font-body text-sm text-nebbia/50 leading-relaxed flex-1">{x.breve}</p>
                                <span className="flex items-center gap-2 font-body text-xs text-oro mt-4">
                                    Apri lo strumento <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
