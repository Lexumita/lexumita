// src/lib/documento/pdfDocumento.js
//
// 08-10-2026: PDF dei documenti scritti da Lex (modalità atto). Diverso dal PDF delle risposte di ricerca
// (pdfRisposta.js): niente marchio Lexum, carta intestata del professionista in testa alla prima pagina (se
// c'è), numero di pagina in basso, Cormorant Garamond come nel foglio a schermo. Si carica solo al click.

import pdfMake from 'pdfmake/build/pdfmake'
import cormorant500 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff?url'
import cormorant600 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff?url'
import cormorant500i from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff?url'
import cormorant600i from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-italic.woff?url'

// pdfmake nel browser scarica i caratteri solo da indirizzi completi (https://...)
const assoluto = (url) => new URL(url, window.location.origin).href

const caratteri = () => ({
    Cormorant: {
        normal: assoluto(cormorant500),
        bold: assoluto(cormorant600),
        italics: assoluto(cormorant500i),
        bolditalics: assoluto(cormorant600i),
    },
})

const LARGHEZZA = 455   // A4 (595 pt) meno i margini laterali di 70

const testo = (pezzi) => pezzi.map((p) => ({ text: p.testo, bold: !!p.grassetto, italics: !!p.corsivo }))

function contenuto(blocchi) {
    const out = []
    for (const b of blocchi) {
        if (b.tipo === 'titolo') out.push({ text: testo(b.pezzi), style: `titolo${b.livello}` })
        else if (b.tipo === 'paragrafo') out.push({ text: testo(b.pezzi), style: 'paragrafo' })
        else if (b.tipo === 'citazione') out.push({ text: testo(b.pezzi), style: 'citazione' })
        else if (b.tipo === 'linea') {
            out.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: LARGHEZZA, y2: 0, lineWidth: 0.5, lineColor: '#999999' }], margin: [0, 4, 0, 12] })
        } else if (b.tipo === 'elenco') {
            for (const v of b.voci) {
                const rientro = 18 + v.livello * 18
                out.push(v.segno
                    ? { columns: [{ width: rientro, text: v.segno, alignment: 'right' }, { width: '*', text: testo(v.pezzi), alignment: 'justify' }], columnGap: 8, margin: [0, 0, 0, 4] }
                    : { text: testo(v.pezzi), alignment: 'justify', margin: [rientro + 8, 0, 0, 4] })
            }
            out.push({ text: '', margin: [0, 0, 0, 4] })
        }
    }
    return out
}

function testata(carta) {
    if (!carta) return []
    return [
        { text: carta.intestatario, style: 'intestatario' },
        ...carta.righe.map((r) => ({ text: r, style: 'rigaIntestazione' })),
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LARGHEZZA, y2: 0, lineWidth: 0.6, lineColor: '#808080' }], margin: [0, 6, 0, 20] },
    ]
}

/**
 * Il documento come PDF.
 * @param {{ blocchi: Array, carta: object|null, titolo: string }} p
 * @returns {Promise<Blob>}
 */
export async function creaPdfDocumento({ blocchi, carta, titolo }) {
    const definizione = {
        pageSize: 'A4',
        pageMargins: [70, 60, 70, 60],
        info: { title: titolo || 'Documento', author: carta?.intestatario ?? '' },
        content: [...testata(carta), ...contenuto(blocchi)],
        footer: (pagina, pagine) => ({ text: `${pagina} / ${pagine}`, alignment: 'center', fontSize: 9, color: '#666666', margin: [0, 24, 0, 0] }),
        defaultStyle: { font: 'Cormorant', fontSize: 12.5, lineHeight: 1.2, color: '#1a1a1a' },
        styles: {
            paragrafo: { alignment: 'justify', margin: [0, 0, 0, 8] },
            titolo1: { fontSize: 15, bold: true, alignment: 'center', margin: [0, 6, 0, 12] },
            titolo2: { fontSize: 13, bold: true, margin: [0, 10, 0, 6] },
            titolo3: { fontSize: 12.5, bold: true, italics: true, margin: [0, 8, 0, 4] },
            citazione: { italics: true, margin: [24, 0, 0, 8] },
            intestatario: { fontSize: 15, bold: true, alignment: 'center', margin: [0, 0, 0, 2] },
            rigaIntestazione: { fontSize: 9.5, alignment: 'center', color: '#444444' },
        },
    }
    // Se un carattere non arriva, pdfmake non richiama mai: dopo 30 secondi un errore invece dell'attesa infinita
    return await Promise.race([
        new Promise((ok) => { pdfMake.createPdf(definizione, null, caratteri()).getBlob(ok) }),
        new Promise((_, ko) => setTimeout(() => ko(new Error('Non sono riuscito a creare il PDF. Riprova tra qualche istante.')), 30000)),
    ])
}
