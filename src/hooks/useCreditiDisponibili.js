// I crediti AI disponibili, per il contatore in alto nei menu di tutti i ruoli.
// Si ricalcolano cambiando pagina, tornando sulla finestra e quando qualcuno segnala che sono cambiati
// (segnalaCreditiCambiati): per esempio il riquadro della pagina Acquista, che dopo la cassa aspetta
// l'accredito del webhook. Prima si leggevano una volta sola e il contatore restava vecchio fino al
// ricaricamento della pagina (28-10-2026).

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export const EVENTO_CREDITI_CAMBIATI = 'lexum:crediti-cambiati'
export function segnalaCreditiCambiati() {
    window.dispatchEvent(new Event(EVENTO_CREDITI_CAMBIATI))
}

export function useCreditiDisponibili(userId) {
    const { pathname } = useLocation()
    const [crediti, setCrediti] = useState(0)

    useEffect(() => {
        if (!userId) return
        let vivo = true
        const aggiorna = () => supabase
            .from('crediti_ai')
            .select('crediti_totali, crediti_usati')
            .eq('user_id', userId)
            .or(`periodo_fine.is.null,periodo_fine.gte.${new Date().toISOString()}`)
            .then(({ data }) => {
                if (!vivo) return
                setCrediti((data ?? []).reduce((acc, c) => acc + (c.crediti_totali - c.crediti_usati), 0))
            })
        aggiorna()
        window.addEventListener(EVENTO_CREDITI_CAMBIATI, aggiorna)
        window.addEventListener('focus', aggiorna)
        return () => {
            vivo = false
            window.removeEventListener(EVENTO_CREDITI_CAMBIATI, aggiorna)
            window.removeEventListener('focus', aggiorna)
        }
    }, [userId, pathname])

    return crediti
}
