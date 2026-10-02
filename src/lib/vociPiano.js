// Voci delle schede abbonamento, generate dai dati del prodotto (03-10-2026).
//
// Prima le schede avevano un elenco scritto a mano («Gestione clienti
// illimitati» anche per Silver, che ne ha 100). Ora ogni numero viene da
// public.prodotti: se cambia il prodotto, cambia la scheda.
//
// Le funzioni elencate in fondo esistono davvero per chi compra il piano:
//   pratiche/mandati      → /pratiche (avvocato), /banco-lavoro (commercialista)
//   generatore documenti  → ChatPratica / ChatMandato (lex-genera-documento)
//   fatture e calendario  → /fatturazione, /calendario
//   parcella forense      → CalcolaParcellaModal in /fatturazione/nuova (solo avvocati)

import { formatNumero } from '@/lib/prezzi'

// Segnaposti usati nel listino per «senza limite»
const SENZA_LIMITE = 999999
const ACCESSI_SENZA_LIMITE = 999

const num = (v) => Number(v ?? 0) || 0

/** «Mensile», «Annuale», «6 mesi», «Una tantum». */
export function etichettaDurata(p) {
    const mesi = num(p?.durata_mesi)
    if (!mesi) return 'Una tantum'
    if (mesi === 1) return 'Mensile'
    if (mesi === 12) return 'Annuale'
    return `${formatNumero(mesi)} mesi`
}

/** Suffisso del prezzo: «al mese», «all'anno», «per 6 mesi». */
export function periodoPrezzo(p) {
    const mesi = num(p?.durata_mesi)
    if (!mesi) return ''
    if (mesi === 1) return 'al mese'
    if (mesi === 12) return 'all’anno'
    return `per ${formatNumero(mesi)} mesi`
}

/** Elenco delle voci della scheda, nell'ordine in cui vanno mostrate. */
export function vociPiano(p) {
    if (!p) return []
    const voci = []
    const crediti = num(p.crediti_ai_mensili)
    const gb = num(p.spazio_gb)
    const clienti = num(p.limite_clienti)
    const accessi = num(p.posti) || 1
    const commercialista = p.target_role === 'commercialista'

    if (p.include_banca_dati) voci.push('Accesso completo alla Banca Dati: norme, giurisprudenza e prassi')

    if (crediti >= SENZA_LIMITE) voci.push('Crediti Lex AI illimitati')
    else if (crediti > 0) voci.push(`${formatNumero(crediti)} crediti Lex AI al mese`)

    if (gb >= SENZA_LIMITE) voci.push('Archivio con AI: spazio illimitato')
    else if (gb > 0) voci.push(`Archivio con AI: ${formatNumero(gb)} GB`)

    if (clienti >= SENZA_LIMITE) voci.push('Gestione clienti: illimitati')
    else if (clienti > 0) voci.push(`Gestione clienti: fino a ${formatNumero(clienti)}`)

    voci.push(accessi >= ACCESSI_SENZA_LIMITE ? 'Accessi: illimitati' : `Accessi: ${formatNumero(accessi)}`)

    voci.push(commercialista ? 'Mandati e documenti' : 'Pratiche e documenti')
    voci.push('Generatore di documenti')
    voci.push('Emissione di fatture')
    voci.push('Calendario appuntamenti')
    if (!commercialista) voci.push('Calcolatore della parcella forense')

    return voci
}
