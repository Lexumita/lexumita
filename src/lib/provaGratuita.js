// La prova gratuita dello studio (03-11-2026): parte da sola quando chi si registra come avvocato o commercialista
// conferma l'email (trigger nel database, attiva_prova_gratuita). Chi era già iscritto la attiva da qui, con un clic.
// La consulenza resta per chi la vuole: è un ticket già scritto.
import { supabase } from '@/lib/supabase'

const PROFESSIONI = ['avvocato', 'commercialista']

// Lo stesso controllo del server: qui serve solo a non mostrare un pulsante che verrebbe rifiutato
export function puoAttivareProva(profilo) {
    if (!profilo || profilo.prova_gratuita_usata || profilo.titolare_id) return false
    return PROFESSIONI.includes(profilo.role)
        || PROFESSIONI.includes(profilo.tipo_richiesta)
        || PROFESSIONI.includes(profilo.professione)
        || profilo.verification_status === 'approved'
}

export async function attivaProvaGratuita() {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: '{}',
    })
    const json = await res.json()
    if (!json.ok) throw new Error(json.error)
    return json
}

export function linkConsulenza(professione, nuovoTicket = '/assistenza/nuovo') {
    const parametri = new URLSearchParams({
        oggetto: 'Richiesta di consulenza',
        messaggio: `Buongiorno, sono ${professione === 'commercialista' ? 'un commercialista' : 'un avvocato'} e sto valutando Lexum per il mio studio: vorrei una consulenza su quale piano scegliere e cosa posso fare con il profilo professionale. Grazie.`,
    })
    return `${nuovoTicket}?${parametri}`
}
