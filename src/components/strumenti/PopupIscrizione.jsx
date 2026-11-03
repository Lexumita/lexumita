// La finestra dopo il primo documento creato con uno strumento gratuito (03-11-2026): il documento è già
// scaricato, la finestra non blocca niente. Una sola volta per browser, mai a chi ha già un account.
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { registraEvento } from '@/lib/visite'
import { leggi, scrivi } from '@/lib/strumenti/memoria'

export function usePopupIscrizione(strumento) {
    const { profile } = useAuth()
    const [aperto, setAperto] = useState(false)

    const dopoDocumento = useCallback(() => {
        registraEvento(`/strumenti/${strumento}/documento`)
        if (profile || leggi('popupVisto')) return
        scrivi('popupVisto', true)
        setAperto(true)
    }, [profile, strumento])

    const popup = aperto ? <PopupIscrizione strumento={strumento} onChiudi={() => setAperto(false)} /> : null
    return { dopoDocumento, popup }
}

// Una sola strada: la registrazione è una per tutti e si entra come user. Chi è avvocato o commercialista lo dice
// nel campo Professione, e allo studio ci arriva dopo, con lo stesso account.
const VANTAGGI = [
    'Il calcolo della parcella e la fattura, sempre a portata di mano',
    'La Banca Dati, con oltre 4,5 milioni di documenti',
    'Una domanda a Lex offerta da noi, con le norme e le sentenze collegate',
]

function PopupIscrizione({ strumento, onChiudi }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm" onClick={onChiudi}>
            <div role="dialog" aria-modal="true" aria-labelledby="popup-iscrizione-titolo"
                className="relative bg-slate border border-oro/25 w-full max-w-md max-h-full overflow-y-auto p-7 shadow-2xl" onClick={e => e.stopPropagation()}>
                <button onClick={onChiudi} aria-label="Chiudi" className="absolute top-3 right-3 p-2 text-nebbia/40 hover:text-nebbia transition-colors"><X size={16} /></button>
                <p className="flex items-center gap-2 font-body text-xs text-salvia tracking-widest uppercase mb-3">
                    <Check size={13} /> Documento pronto
                </p>
                <h2 id="popup-iscrizione-titolo" className="font-display text-3xl font-light text-nebbia leading-tight mb-3">
                    Tieni tutto in un <span className="text-oro">unico portale.</span>
                </h2>
                <p className="font-body text-sm text-nebbia/60 leading-relaxed mb-3">
                    Con un account gratuito ritrovi tutto nella tua area:
                </p>
                <ul className="space-y-2 mb-6">
                    {VANTAGGI.map(v => (
                        <li key={v} className="flex items-start gap-2 font-body text-sm text-nebbia/70 leading-snug">
                            <Check size={14} className="text-oro shrink-0 mt-0.5" /> {v}
                        </li>
                    ))}
                </ul>
                <Link to="/registrati" onClick={() => registraEvento(`/strumenti/${strumento}/iscrizione`)}
                    className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors">
                    Crea l'account gratuito <ArrowRight size={14} />
                </Link>
                <p className="font-body text-xs text-nebbia/40 text-center mt-2">Niente carta di credito.</p>
                <p className="font-body text-xs text-nebbia/50 leading-relaxed mt-5 pt-4 border-t border-white/5">
                    <span className="text-nebbia/80">Sei un avvocato o un commercialista?</span> Ti iscrivi allo stesso modo, indicando la professione. Poi, dopo una consulenza con il team, attivi la prova dello studio: pratiche, clienti, atti e fatture.
                </p>
                <button onClick={onChiudi} className="block w-full mt-3 py-2 font-body text-xs text-nebbia/40 hover:text-nebbia transition-colors">
                    Continua senza account
                </button>
            </div>
        </div>
    )
}
