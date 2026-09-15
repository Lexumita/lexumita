// src/lib/novita.js
//
// Gli articoli della pagina "Novità": li scrive l'admin, li legge chiunque.
// Le bozze restano invisibili fuori dall'admin (ci pensa la RLS).

import { supabase } from '@/lib/supabase'

const CAMPI_ELENCO = 'slug, titolo, sommario, copertina_url, autore, categoria, pubblicato_il'

export async function elencoNovita(limite = 60) {
    const { data } = await supabase
        .from('novita')
        .select(CAMPI_ELENCO)
        .eq('stato', 'pubblicato')
        .order('pubblicato_il', { ascending: false })
        .limit(limite)
    return data ?? []
}

export async function articoloDaSlug(slug) {
    const { data } = await supabase
        .from('novita')
        .select('slug, titolo, sommario, contenuto, copertina_url, autore, categoria, pubblicato_il')
        .eq('slug', slug)
        .eq('stato', 'pubblicato')
        .maybeSingle()
    return data ?? null
}

// Senza autore l'articolo si firma Lexum.
export function firmaAutore(autore) {
    return autore?.trim() || 'Lexum'
}

export function fmtDataLunga(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Titolo → indirizzo dell'articolo. Il DB rifinisce comunque lo slug.
export function slugDa(titolo) {
    return (titolo ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80)
}
