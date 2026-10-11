// L'assistenza Lexum: gli amministratori che rispondono alle richieste.
// 08-10-2026: i loro profili non si leggono più (prima ogni utente registrato li leggeva per
// intero); il database dà solo gli id, con get_supporto_admin_id e get_supporto_admin_ids.

import { supabase } from '@/lib/supabase'

// Il destinatario di una nuova richiesta: il primo amministratore (null se non si trova).
export async function idSupporto() {
    const { data, error } = await supabase.rpc('get_supporto_admin_id')
    if (error) return null
    return data ?? null
}

// Tutti gli amministratori, per riconoscere i ticket con Lexum.
export async function idsSupporto() {
    const { data, error } = await supabase.rpc('get_supporto_admin_ids')
    if (error) return new Set()
    return new Set(data ?? [])
}

// Un ticket aperto aspetta la risposta di Lexum quando l'ultimo messaggio è dell'altra
// persona; senza messaggi, quando non l'ha aperto un amministratore. Conta l'autore
// dell'ultimo messaggio e non `ultimo_mittente`, che non cambia a ogni risposta.
export function aspettaRispostaAdmin(t) {
    if (t.stato !== 'aperto') return false
    const msgs = [...(t.messaggi ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    if (msgs.length === 0) return t.mittente_ruolo !== 'admin'
    return msgs[0]?.autore_tipo !== 'admin'
}

// Quanti ticket aperti aspettano la MIA risposta (il pallino nel menu), per qualunque
// ruolo: lo calcola il database (ticket_da_rispondere, migrazione 20261011), così il
// sito e l'app contano allo stesso modo. Per l'admin sono i ticket della sua pagina
// Assistenza, con la stessa regola di aspettaRispostaAdmin.
export async function contaTicketDaRispondere() {
    const { data, error } = await supabase.rpc('ticket_da_rispondere')
    if (error) return 0
    return data ?? 0
}

// Dopo una risposta o un cambio di stato il pallino si aggiorna subito.
export const EVENTO_TICKET_AGGIORNATO = 'lexum:ticket-aggiornato'
export function segnalaTicketAggiornato() {
    window.dispatchEvent(new Event(EVENTO_TICKET_AGGIORNATO))
}
