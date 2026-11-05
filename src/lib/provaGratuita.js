// La prova gratuita dello studio. Dal 05-11-2026 non parte più alla conferma dell'email: si attiva con un clic da
// «Completa il profilo» quando ci sono documento d'identità, iscrizione all'Albo e dati di fatturazione. Nessuno la
// deve approvare: il controllo è nel database (attiva_prova_gratuita) e i documenti si guardano dopo. Se l'admin li
// rifiuta la prova si ferma e l'utente vede il motivo; se li ricarica e vengono approvati, riparte.
// I commercialisti per ora non la vedono (04-11-2026): il loro piano è spento.
// La consulenza resta per chi la vuole: è un ticket già scritto.
import { supabase } from '@/lib/supabase'

// Lo stesso controllo del server: qui serve solo a non mostrare un pulsante che verrebbe rifiutato
export function puoAttivareProva(profilo) {
    if (!profilo || profilo.prova_gratuita_usata || profilo.titolare_id) return false
    if (profilo.role !== 'user') return profilo.role === 'avvocato'
    const dichiarata = profilo.tipo_richiesta ?? profilo.professione
    if (dichiarata === 'commercialista') return false
    return dichiarata === 'avvocato' || profilo.verification_status === 'approved'
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
