// src/components/ConsensoRecesso.jsx
//
// L'attivazione immediata e il recesso (20-10-2026). Un consumatore che compra crediti, pacchetti o un piano
// chiede l'attivazione immediata e prende atto di cosa succede al recesso (Termini, punto 4.6): come per
// Anthropic e OpenAI, entro 14 giorni si rimborsa la parte non usata (crediti non usati, abbonamento in
// proporzione); il recesso si perde quando il servizio è stato usato tutto (artt. 57 c.3 e 59 lett. a
// Codice del Consumo). Vale solo per i privati (ruolo «user»): i professionisti non hanno il recesso.
//
// Dal 28-10-2026 niente casella da spuntare a ogni acquisto (deciso da Antonino): come Amazon e Google Play,
// il pulsante che paga si chiama «Paga e attiva subito» e la frase sul recesso sta lì accanto. Il clic è la
// richiesta esplicita per quell'acquisto; viaggia con la richiesta di pagamento (consenso_recesso), il server
// la registra e la ricevuta la conferma. Nei Termini da sola non basterebbe: serve per ogni acquisto.

import { useAuth } from '@/context/AuthContext'

export const PULSANTE_ATTIVA_SUBITO = 'Paga e attiva subito'

export function useConsensoRecesso() {
    const { profile } = useAuth()
    const richiesto = profile?.role === 'user'
    return {
        richiesto,
        // la richiesta è il clic sul pulsante: non c'è più nulla da spuntare prima
        ok: true,
        // da aggiungere al corpo della richiesta di pagamento
        campo: richiesto ? { consenso_recesso: true } : {},
        /** Il testo del pulsante che paga: per i privati dice che l'acquisto si attiva subito. */
        pulsante: (normale) => (richiesto ? PULSANTE_ATTIVA_SUBITO : normale),
    }
}

export const ERRORE_CONSENSO_RECESSO = "Per procedere chiedi l'attivazione immediata."

/** La frase sul recesso, da mettere accanto al pulsante «Paga e attiva subito». */
export default function ConsensoRecesso({ consenso, className = '' }) {
    if (!consenso?.richiesto) return null
    return (
        <p className={`font-body text-xs text-nebbia/50 leading-relaxed ${className}`}>
            Con «{PULSANTE_ATTIVA_SUBITO}» chiedi che l'acquisto sia attivato subito. Se recedi entro 14 giorni ti
            vengono rimborsati solo i crediti non ancora usati o la parte di abbonamento non ancora fornita; il
            recesso non è più possibile quando hai usato tutto (
            <a href="/termini" target="_blank" rel="noopener noreferrer" className="text-oro hover:text-oro/70 underline">
                Termini, punto 4.6
            </a>
            ).
        </p>
    )
}
