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

// Quanti ticket del supporto Lexum aspettano una risposta: gli stessi della pagina
// Assistenza dell'admin (entranti verso un amministratore o senza destinatario, uscenti
// aperti da un amministratore). Serve al pallino nel menu.
export async function contaTicketDaRispondereAdmin() {
    const admin = [...await idsSupporto()]
    if (admin.length === 0) return 0
    const { data, error } = await supabase
        .from('ticket_assistenza')
        .select('id, stato, mittente_ruolo, messaggi:messaggi_ticket(autore_tipo, created_at)')
        .eq('stato', 'aperto')
        .or(`destinatario_id.is.null,mittente_ruolo.eq.admin,destinatario_id.in.(${admin.join(',')})`)
    if (error) return 0
    return (data ?? []).filter(aspettaRispostaAdmin).length
}

// Dopo una risposta o un cambio di stato il pallino si aggiorna subito.
export const EVENTO_TICKET_AGGIORNATO = 'lexum:ticket-aggiornato'
export function segnalaTicketAggiornato() {
    window.dispatchEvent(new Event(EVENTO_TICKET_AGGIORNATO))
}
