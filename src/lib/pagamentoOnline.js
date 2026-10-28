// src/lib/pagamentoOnline.js
//
// Cassa Tagadapay (27-10-2026), al posto di Stripe. Il server (funzione tagada-checkout) decide il
// prezzo, upgrade compresi, e risponde con l'indirizzo della pagina di pagamento. Se la cassa non è
// disponibile si va al bonifico (src/lib/bonifico.js), che resta come riserva.

import { supabase } from '@/lib/supabase'
import { paginaBonifico } from '@/lib/bonifico'
import { ricordaRitorno } from '@/lib/ritornoCassa'

/**
 * Porta il browser alla cassa per un prodotto. In caso d'errore porta al bonifico.
 * Con un codice sconto il server lo riverifica e toglie la percentuale (src/components/CodiceSconto.jsx).
 * @param {{ prodottoId: string, isUpgrade?: boolean, consenso?: object, codiceSconto?: string, ritorno?: string, importo?: number }} opz
 */
export async function apriCassa({ prodottoId, isUpgrade = false, consenso = {}, codiceSconto, ritorno, importo }) {
    const percorso = ritorno ?? `${window.location.pathname}${window.location.search}`
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
                ...(codiceSconto ? { codice_sconto: codiceSconto } : {}),
                ritorno: percorso,
            }),
        })
        const json = await res.json().catch(() => ({}))
        // dopo il pagamento Tagadapay manda a /pagamento/esito, che riporta qui (src/lib/ritornoCassa.js)
        if (json.url) { ricordaRitorno(percorso); window.location.href = json.url; return }
        if (json.bonifico_url) { window.location.href = json.bonifico_url; return }
        if (json.error && res.status < 500) throw Object.assign(new Error(json.error), { mostrabile: true })
    } catch (e) {
        if (e?.mostrabile) throw e
    }
    window.location.href = paginaBonifico(prodottoId, importo)
}
