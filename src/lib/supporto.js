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
