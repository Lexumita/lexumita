// src/lib/documento/correzioni.js
//
// 08-10-2026: «Correggi un dettaglio» nei documenti scritti da Lex. La funzione lex-correggi-documento
// (Haiku 5.5, gratis) risponde solo con le sostituzioni «trova → sostituisci»; qui si applicano al testo.

import { supabase } from '@/lib/supabase'
import { sanitizzaErrore } from '@/lib/sanitizzaErrore'
import { applicaSostituzioni } from './testoDocumento'

const MSG_ERRORE = 'Non sono riuscito a fare la correzione. Riprova tra qualche istante.'

/** @returns {Promise<{ testo: string, applicate: number, scartate: number, messaggio: string }>} */
export async function correggiDocumento({ testo, richiesta }) {
    const { data, error } = await supabase.functions.invoke('lex-correggi-documento', { body: { testo, richiesta } })
    if (error) {
        let corpo = null
        try { corpo = await error.context?.json?.() } catch { corpo = null }
        throw new Error(sanitizzaErrore(corpo?.error, MSG_ERRORE) ?? MSG_ERRORE)
    }
    if (!data?.ok) throw new Error(sanitizzaErrore(data?.error, MSG_ERRORE) ?? MSG_ERRORE)
    const esito = applicaSostituzioni(testo, data.sostituzioni)
    return { ...esito, scartate: (data.scartate ?? 0) + (data.sostituzioni?.length ?? 0) - esito.applicate, messaggio: data.messaggio ?? '' }
}
