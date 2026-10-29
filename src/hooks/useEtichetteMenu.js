// src/hooks/useEtichetteMenu.js
//
// Le etichette dell'utente per la barra a sinistra (29-10-2026, come nell'app), con quanti elementi ha
// ciascuna. Il numero non conta i collegamenti a ricerche o documenti cancellati: la pagina dell'etichetta
// non li mostra, e l'app nemmeno. Si rileggono cambiando pagina, tornando sulla finestra e quando una
// pagina avvisa che le etichette sono cambiate (segnalaEtichetteCambiate), come il contatore dei crediti.
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export const EVENTO_ETICHETTE_CAMBIATE = 'lexum:etichette-cambiate'

export function segnalaEtichetteCambiate() {
    window.dispatchEvent(new Event(EVENTO_ETICHETTE_CAMBIATE))
}

const TIPI_RICERCA = ['ricerca_ai', 'ricerca_manuale', 'chat_lex']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// gli id che esistono ancora in una tabella (a blocchi, come l'app)
async function esistenti(tabella, ids) {
    const trovati = new Set()
    const validi = ids.filter(id => UUID.test(id))
    for (let i = 0; i < validi.length; i += 100) {
        const { data, error } = await supabase.from(tabella).select('id').in('id', validi.slice(i, i + 100))
        if (error) throw error
        for (const r of data ?? []) trovati.add(String(r.id))
    }
    return trovati
}

/** null finché non arrivano; poi [{ id, nome, colore, quanti }] in ordine di nome. */
export function useEtichetteMenu(userId) {
    const { pathname } = useLocation()
    const [etichette, setEtichette] = useState(null)
    const ultimoGiro = useRef(0)

    useEffect(() => {
        if (!userId) return
        async function carica() {
            // se partono due letture insieme, vale solo l'ultima
            const giro = ++ultimoGiro.current
            try {
                const [{ data: e, error: erroreEtichette }, { data: rel, error: erroreElementi }] = await Promise.all([
                    supabase.from('etichette').select('id, nome, colore').eq('user_id', userId).order('nome', { ascending: true }),
                    supabase.from('elementi_etichette').select('etichetta_id, tipo, elemento_id'),
                ])
                if (erroreEtichette) throw erroreEtichette
                if (erroreElementi) throw erroreElementi
                const righe = rel ?? []
                const idsDi = cond => [...new Set(righe.filter(cond).map(r => String(r.elemento_id)))]
                const [ricerche, documenti] = await Promise.all([
                    esistenti('ricerche', idsDi(r => TIPI_RICERCA.includes(r.tipo))),
                    esistenti('archivio_documenti', idsDi(r => r.tipo === 'archivio_documento')),
                ])
                const quanti = {}
                for (const r of righe) {
                    const id = String(r.elemento_id)
                    if (TIPI_RICERCA.includes(r.tipo) && !ricerche.has(id)) continue
                    if (r.tipo === 'archivio_documento' && !documenti.has(id)) continue
                    quanti[r.etichetta_id] = (quanti[r.etichetta_id] ?? 0) + 1
                }
                if (giro === ultimoGiro.current) setEtichette((e ?? []).map(x => ({ ...x, quanti: quanti[x.id] ?? 0 })))
            } catch {
                // la barra resta com'era: le etichette si rileggono alla prossima occasione
            }
        }
        carica()
        window.addEventListener(EVENTO_ETICHETTE_CAMBIATE, carica)
        window.addEventListener('focus', carica)
        return () => {
            ultimoGiro.current++
            window.removeEventListener(EVENTO_ETICHETTE_CAMBIATE, carica)
            window.removeEventListener('focus', carica)
        }
    }, [userId, pathname])

    return etichette
}
