// La sezione dell'app (30-10-2026): testo e pulsante di Google Play da una parte, due schermate vere
// dell'app (quelle della scheda di Google Play) dentro due telefoni disegnati dall'altra.
// Home e pagina Avvocati cambiano solo testo e schermate.
import BadgeApp from '@/components/BadgeApp'

function Telefono({ src, alt, className = '' }) {
    return (
        <div className={`w-[200px] sm:w-[240px] rounded-[2.4rem] bg-[#0d1a21] p-2.5 shadow-2xl shadow-black/60 ring-1 ring-white/10 ${className}`}>
            <img src={src} alt={alt} loading="lazy" className="block w-full rounded-[1.9rem]" />
        </div>
    )
}

export default function SezioneApp({ etichetta, titolo, evidenza, testo, punti = [], davanti, dietro }) {
    return (
        <section id="app" className="py-24 px-6 border-t border-white/5 overflow-hidden scroll-mt-28">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div className="text-center lg:text-left">
                    <p className="font-body text-xs text-oro/60 tracking-[0.3em] uppercase mb-3">{etichetta}</p>
                    <h2 className="font-display text-3xl md:text-4xl font-light text-nebbia mb-5">
                        {titolo} <span className="text-oro">{evidenza}</span>
                    </h2>
                    <p className="font-body text-base text-nebbia/45 leading-relaxed mb-6 max-w-xl mx-auto lg:mx-0">{testo}</p>
                    {punti.length > 0 && (
                        <ul className="space-y-2.5 mb-8 max-w-xl mx-auto lg:mx-0 text-left">
                            {punti.map(p => (
                                <li key={p} className="flex items-start gap-3 font-body text-sm text-nebbia/60 leading-relaxed">
                                    <span className="mt-2 w-1.5 h-1.5 bg-oro/60 rotate-45 shrink-0" />{p}
                                </li>
                            ))}
                        </ul>
                    )}
                    <BadgeApp allinea="items-center lg:items-start" />
                </div>
                <div className="relative h-[460px] sm:h-[540px] flex items-center justify-center">
                    <Telefono src={dietro.src} alt={dietro.alt}
                        className="absolute left-1/2 top-4 -translate-x-[95%] -rotate-6 opacity-60" />
                    <Telefono src={davanti.src} alt={davanti.alt} className="relative translate-x-[18%] rotate-2" />
                </div>
            </div>
        </section>
    )
}
