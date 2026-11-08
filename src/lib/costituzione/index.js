// src/lib/costituzione/index.js
//
// 08-11-2026: la Costituzione nella vetrina (/costituzione e /costituzione/articolo-N). Il testo viene da
// Normattiva (scripts/costituzione-da-normattiva.mjs → testo.js), i nomi brevi e «In parole semplici» da
// spiegazioni.js. Le sentenze restano nella Banca Dati, che è per chi ha un account.

// con le estensioni: lo importa anche scripts/generate-seo-pages.mjs, in Node
import testo from './testo.js'
import { NOMI, SPIEGAZIONI } from './spiegazioni.js'

export const PERCORSO = '/costituzione'
export const AGGIORNATA_AL = testo.aggiornataAl
export const VOCI = testo.articoli

// Le voci con una pagina: gli articoli abrogati (115, 124, 128, 129, 130) restano solo nell'indice
export const CON_PAGINA = VOCI.filter(v => !v.abrogato)

export const percorsoDi = (voce) => `${PERCORSO}/${voce.slug}`
export const vocePerSlug = (slug) => CON_PAGINA.find(v => v.slug === slug) ?? null
export const nomeDi = (voce) => (voce.tipo === 'articolo' ? NOMI[voce.numero] : null) ?? null
export const spiegazioneDi = (voce) => (voce.tipo === 'articolo' ? SPIEGAZIONI[voce.numero] : null) ?? null

// «Articolo 13 della Costituzione», «XII disposizione transitoria e finale»
export function titoloDi(voce) {
    return voce.tipo === 'articolo'
        ? `Articolo ${voce.numero} della Costituzione`
        : `${voce.numero} disposizione transitoria e finale`
}

// Il testo senza i segni delle modifiche, per le anteprime e le descrizioni
export const testoPiano = (riga) => riga.replace(/\(\(…\)\)/g, '…').replace(/\(\(|\)\)/g, '')

export function anteprima(voce, lunghezza = 140) {
    const t = testoPiano(voce.commi.join(' '))
    return t.length > lunghezza ? `${t.slice(0, lunghezza).replace(/\s+\S*$/, '')}…` : t
}

// Una riga di un comma in pezzi: { testo, modificato } per le parti tra (( )), { tolto } per le parole tolte
export function pezzi(riga) {
    const out = []
    for (const parte of riga.split(/(\(\([\s\S]*?\)\))/)) {
        if (!parte) continue
        if (parte === '((…))') out.push({ tolto: true })
        else if (parte.startsWith('((')) out.push({ testo: parte.slice(2, -2), modificato: true })
        else out.push({ testo: parte, modificato: false })
    }
    return out
}

// Le righe che non aprono un comma: le lettere di un elenco («a) politica estera…») e le righe in minuscolo
// dopo i due punti («sulle controversie…»). Servono per numerare i commi come si citano.
export const continuaComma = (riga) => /^(\(\()?([a-z]\)|[a-zà-ù])/.test(riga)

export function commiNumerati(voce) {
    let n = 0
    return voce.commi.map(riga => {
        const nuovo = !continuaComma(riga)
        if (nuovo) n++
        return { riga, numero: nuovo ? n : null }
    })
}

// La Costituzione per l'indice: un gruppo per ogni parte, titolo e sezione, nell'ordine del testo
export function gruppi() {
    const out = []
    for (const v of VOCI) {
        const chiave = [v.parte?.nome, v.titolo?.nome, v.sezione?.nome].join('|')
        let g = out.at(-1)
        if (!g || g.chiave !== chiave) {
            g = { chiave, parte: v.parte, titolo: v.titolo, sezione: v.sezione, voci: [] }
            out.push(g)
        }
        g.voci.push(v)
    }
    return out
}

// La voce prima e quella dopo, saltando gli articoli abrogati
export function vicini(voce) {
    const i = CON_PAGINA.findIndex(v => v.slug === voce.slug)
    return { prima: CON_PAGINA[i - 1] ?? null, dopo: CON_PAGINA[i + 1] ?? null }
}

// Normattiva → pagina di Lexum, per i collegamenti degli articoli del blog: …costituzione:1947-12-27~art13
const URN_ARTICOLO = /^https?:\/\/(www\.)?normattiva\.it\/uri-res\/N2Ls\?urn:nir:stato:costituzione:1947-12-27~art(\d+)$/
export function paginaDaNormattiva(href) {
    const m = URN_ARTICOLO.exec(href ?? '')
    if (!m) return null
    const voce = vocePerSlug(`articolo-${m[2]}`)
    return voce ? percorsoDi(voce) : null
}

// Il pezzo di collegamento che gli articoli del blog usano per questa voce (sempre seguito da «)» nel markdown)
export const segnoNelBlog = (voce) => `costituzione:1947-12-27~art${voce.numero})`

// Gli articoli del blog che citano la voce, dal loro testo (lo usa chi prepara l'HTML)
export function citatoDa(voce, articoli) {
    if (voce.tipo !== 'articolo') return []
    const segno = segnoNelBlog(voce)
    return articoli.filter(a => a.contenuto?.includes(segno)).map(({ slug, titolo }) => ({ slug, titolo }))
}

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
export function dataLunga(iso) {
    if (!iso) return ''
    const [a, m, g] = iso.split('-').map(Number)
    return `${g === 1 ? '1°' : g} ${MESI[m - 1]} ${a}`
}

// Titolo e descrizione per Google, uguali nella pagina e nell'HTML preparato al rilascio
export const META_INDICE = {
    titolo: 'Costituzione italiana: testo in vigore, articolo per articolo — Lexum',
    descrizione: "Il testo in vigore della Costituzione della Repubblica italiana, articolo per articolo: principi fondamentali, diritti e doveri, ordinamento della Repubblica, con le modifiche e la fonte ufficiale.",
}

export function metaDi(voce) {
    const nome = nomeDi(voce)
    const titolo = voce.tipo === 'articolo'
        ? `Art. ${voce.numero} Costituzione: ${nome ? nome.charAt(0).toLowerCase() + nome.slice(1) : 'testo in vigore'} — Lexum`
        : `${voce.numero} disposizione transitoria e finale della Costituzione — Lexum`
    const chi = voce.tipo === 'articolo' ? `dell'art. ${voce.numero} della Costituzione` : `della ${voce.numero} disposizione transitoria e finale`
    const descrizione = `Il testo in vigore ${chi}: «${anteprima(voce, 95)}»${spiegazioneDi(voce) ? ' Con la spiegazione in parole semplici.' : ''}`
    return { titolo, descrizione }
}
