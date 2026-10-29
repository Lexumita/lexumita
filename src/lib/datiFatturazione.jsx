// src/lib/datiFatturazione.jsx
//
// Dati di fatturazione per pagare (28-10-2026). La cassa Tagadapay vuole l'indirizzo di fatturazione
// (almeno il paese, per le tasse): senza, la sua pagina si ferma con un errore. Li chiediamo noi prima
// del pulsante «Paga», sul profilo di Lexum, e il server (tagada-checkout) li passa alla cassa già
// compilati. Stessi campi qui e nel server: se ne cambi uno, cambialo anche là.
// Si compra anche da fuori Italia (28-10-2026): il paese si sceglie, la provincia serve solo in Italia.

import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight } from 'lucide-react'

export const CAMPI_ACQUISTO = [
    { key: 'nome',      label: 'Nome' },
    { key: 'cognome',   label: 'Cognome' },
    { key: 'indirizzo', label: 'Indirizzo' },
    { key: 'cap',       label: 'CAP' },
    { key: 'comune',    label: 'Comune' },
    { key: 'provincia', label: 'Provincia', soloItalia: true },
    { key: 'paese',     label: 'Paese' },
]

/** Il paese dell'indirizzo; vuoto vale Italia (è il valore del database). */
export const paeseDi = (profile) => (profile?.paese || 'IT').toUpperCase()

const pieno = (v) => typeof v === 'string' ? v.trim().length > 0 : v != null

/** Le etichette dei dati che mancano per pagare (vuoto = si può pagare). */
export function mancantiAcquisto(profile) {
    const italia = paeseDi(profile) === 'IT'
    return CAMPI_ACQUISTO
        .filter(c => !(c.soloItalia && !italia))
        .filter(c => !pieno(c.key === 'paese' ? paeseDi(profile) : profile?.[c.key]))
        .map(c => c.label)
}

/** Dove si completano: i privati nella loro area, i professionisti nel profilo dello studio. */
export function paginaDatiFatturazione(profile) {
    return profile?.role === 'user' ? '/area/profilo#fatturazione' : '/profilo'
}

export function messaggioDatiMancanti(mancanti) {
    return `Per acquistare completa i dati di fatturazione nel profilo: ${mancanti.join(', ')}.`
}

/** Avviso con il collegamento al profilo; non mostra niente se i dati ci sono. */
export function AvvisoDatiFatturazione({ profile, className = '' }) {
    const mancanti = mancantiAcquisto(profile)
    if (mancanti.length === 0) return null
    return (
        <div id="dati-fatturazione" className={`flex items-start gap-3 p-4 bg-amber-900/10 border border-amber-500/30 ${className}`}>
            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
                <p className="font-body text-sm text-nebbia/80 leading-relaxed">
                    Per acquistare servono i tuoi dati di fatturazione. Mancano: {mancanti.join(' · ')}.
                </p>
                <Link
                    to={paginaDatiFatturazione(profile)}
                    className="inline-flex items-center gap-1.5 font-body text-sm text-oro hover:text-oro/70"
                >
                    Completa i dati <ArrowRight size={13} />
                </Link>
            </div>
        </div>
    )
}
