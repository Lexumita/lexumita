// src/lib/pagamentoOnline.js
//
// Cassa Tagadapay (27-10-2026), al posto di Stripe. Il server (funzione tagada-checkout) decide il
// prezzo e risponde con l'indirizzo della pagina di pagamento, oppure con quello del bonifico quando
// l'importo di oggi non è quello di listino (upgrade di un piano) o la cassa non è disponibile.

import { supabase } from '@/lib/supabase'
import { paginaBonifico } from '@/lib/bonifico'

/**
 * Porta il browser alla cassa per un prodotto. In caso d'errore porta al bonifico.
 * @param {{ prodottoId: string, isUpgrade?: boolean, consenso?: object, ritorno?: string, importo?: number }} opz
 */
export async function apriCassa({ prodottoId, isUpgrade = false, consenso = {}, ritorno, importo }) {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tagada-checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
                prodotto_id: prodottoId,
                is_upgrade: isUpgrade,
                ...consenso,
                ritorno: ritorno ?? `${window.location.pathname}${window.location.search}`,
            }),
        })
        const json = await res.json().catch(() => ({}))
        if (json.url) { window.location.href = json.url; return }
        if (json.bonifico_url) { window.location.href = json.bonifico_url; return }
        if (json.error && res.status < 500) throw Object.assign(new Error(json.error), { mostrabile: true })
    } catch (e) {
        if (e?.mostrabile) throw e
    }
    window.location.href = paginaBonifico(prodottoId, importo)
}
