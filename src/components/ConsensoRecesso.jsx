// src/components/ConsensoRecesso.jsx
//
// La casella del recesso (20-10-2026). Un consumatore che compra crediti, pacchetti, una sentenza o un piano
// chiede l'attivazione immediata e prende atto di cosa succede al recesso: Termini, punto 4.6; art. 59,
// comma 1, lettere a e o, del Codice del Consumo. Vale solo per i privati (ruolo «user»): i professionisti
// non hanno il recesso. Senza la spunta il pagamento non parte; la scelta viaggia con la richiesta di
// pagamento (consenso_recesso), così il server la registra e la ricevuta la conferma.

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export function useConsensoRecesso() {
    const { profile } = useAuth()
    const richiesto = profile?.role === 'user'
    const [dato, setDato] = useState(false)
    return {
        richiesto,
        dato,
        setDato,
        ok: !richiesto || dato,
        // da aggiungere al corpo della richiesta di pagamento
        campo: richiesto ? { consenso_recesso: true } : {},
    }
}

export const ERRORE_CONSENSO_RECESSO = "Per procedere spunta la casella sull'attivazione immediata."

export default function ConsensoRecesso({ consenso, className = '' }) {
    if (!consenso?.richiesto) return null
    return (
        <label className={`flex items-start gap-3 cursor-pointer select-none ${className}`}>
            <input
                type="checkbox"
                checked={consenso.dato}
                onChange={e => consenso.setDato(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-[#C9A45C] cursor-pointer"
            />
            <span className="font-body text-xs text-nebbia/60 leading-relaxed">
                Chiedo che l'acquisto sia attivato subito. So che per crediti, pacchetti e contenuti digitali
                perdo così il diritto di recesso di 14 giorni e che, per un abbonamento, se recedo pago la parte
                già fornita (
                <a href="/termini" target="_blank" rel="noopener noreferrer" className="text-oro hover:text-oro/70 underline">
                    Termini, punto 4.6
                </a>
                ).
            </span>
        </label>
    )
}
