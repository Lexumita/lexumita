// Il numero di ticket aperti che aspettano la mia risposta, per il pallino accanto ad
// «Assistenza» (o «Comunicazioni» per i clienti) nei menu di tutti i ruoli.
// Si ricalcola cambiando pagina, dopo una risposta o un cambio di stato
// (segnalaTicketAggiornato), tornando sulla finestra e ogni minuto.

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { contaTicketDaRispondere, EVENTO_TICKET_AGGIORNATO } from '@/lib/supporto'

export function useTicketDaRispondere() {
    const { pathname } = useLocation()
    const [n, setN] = useState(0)

    useEffect(() => {
        let vivo = true
        const aggiorna = () => contaTicketDaRispondere().then(v => { if (vivo) setN(v) })
        aggiorna()
        const timer = setInterval(aggiorna, 60000)
        window.addEventListener(EVENTO_TICKET_AGGIORNATO, aggiorna)
        window.addEventListener('focus', aggiorna)
        return () => {
            vivo = false
            clearInterval(timer)
            window.removeEventListener(EVENTO_TICKET_AGGIORNATO, aggiorna)
            window.removeEventListener('focus', aggiorna)
        }
    }, [pathname])

    return n
}
