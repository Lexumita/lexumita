// src/lib/pdf/impaginaDocumento.js
// ─────────────────────────────────────────────────────────────
// Impaginatore dei documenti Lex (25/09/2026): dal MODELLO alla definizione
// pdfmake, con la grafica Lexum (fondo petrolio, oro, Cormorant e Outfit,
// cornice con angoli, piè di pagina numerato). Nessuna AI qui dentro.
//
// MODELLO
// {
//   titolo, sottotitolo?,
//   quesito: { etichetta, testo },
//   premessa?: Blocco[],
//   sezioni: [{ etichetta?, titolo, blocchi: Blocco[] }],
//   punti_fermi?: [{ titolo, testo }],
//   sintesi?: string,
//   fonti: [{ citazione, descrizione? }],
//   nota_finale: string
// }
// Blocco: { tipo: 'paragrafo', testo } | { tipo: 'titoletto', testo }
//       | { tipo: 'elenco', ordinato?, voci: string[] }
//       | { tipo: 'principio', etichetta?, testo, fonte? }
// I testi sono Markdown in linea: **grassetto**, [citazione](link) o [[citazione]].
//
// Due scelte obbligate da pdfmake:
//   • legature spente: con 'tt', 'ff', 'fi' fuse in un segno solo, il testo
//     copiato dal PDF perdeva lettere ("otemperanza");
//   • testo allineato a sinistra: la giustificazione di pdfmake apre uno
//     spazio a ogni cambio di stile ("dell' art. 112").
// ─────────────────────────────────────────────────────────────

import { marked } from 'marked'

const C = {
    fondo: '#0B1F2A',
    riquadro: '#10283A',
    cornice: '#1E3547',
    linea: '#23394B',
    oro: '#C9A45C',
    oroChiaro: '#E0C184',
    salvia: '#7FA39A',
    testo: '#C3CCD4',
    testoForte: '#F4F7F8',
    grigio: '#8796A3',
    grigioScuro: '#6B7B88',
}

const ROMANI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
const LARGHEZZA = 483   // A4 meno i margini laterali di 56

// ─── testo in linea: Markdown → frammenti pdfmake ───
const pulisci = ({ citazione, ...s }) => s
const decodifica = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const maiuscola = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

function frammenti(md, base = {}) {
    const sorgente = String(md ?? '').replace(/\[\[([^\]]+)\]\]/g, '[$1](cit:)')
    const out = []
    const visita = (tokens, stile) => {
        for (const t of tokens ?? []) {
            if (t.type === 'strong') visita(t.tokens, { ...stile, bold: true, color: stile.citazione ? C.oroChiaro : C.testoForte })
            else if (t.type === 'em') visita(t.tokens, { ...stile, italics: true })
            else if (t.type === 'link') visita(t.tokens, { ...stile, bold: true, color: C.oroChiaro, citazione: true })
            else if (t.type === 'codespan') out.push({ text: t.text, ...pulisci(stile) })
            else if (t.type === 'br') out.push({ text: '\n' })
            else if (t.tokens) visita(t.tokens, stile)
            else out.push({ text: decodifica(t.text ?? t.raw ?? ''), ...pulisci(stile) })
        }
    }
    visita(marked.Lexer.lexInline(sorgente), base)
    // "[art. 526 c.p.p.](...)." diventerebbe "c.p.p..": un punto solo.
    for (let i = 1; i < out.length; i++) {
        if (String(out[i - 1].text).endsWith('.') && String(out[i].text).startsWith('.')) out[i].text = out[i].text.slice(1)
    }
    return out
}

// ─── pezzi grafici ───
const spaziato = (testo, extra = {}) => ({ text: testo.toUpperCase(), characterSpacing: 1.8, fontSize: 6.8, color: C.grigio, ...extra })
const trattino = () => ({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 26, y2: 0, lineWidth: 1.1, lineColor: C.oro }], margin: [0, 3, 0, 8] })
const filetto = (margine) => ({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: LARGHEZZA, y2: 0, lineWidth: 0.6, lineColor: C.linea }], margin: margine })

function riquadro(contenuto, bordo, margine = [0, 0, 0, 14]) {
    return {
        // Una riga sola che non si spezza: il riquadro resta intero su una pagina.
        table: { widths: ['*'], body: [[{ stack: contenuto }]], dontBreakRows: true },
        layout: {
            fillColor: () => C.riquadro,
            hLineColor: () => C.cornice, vLineColor: (i) => (i === 0 ? bordo : C.cornice),
            hLineWidth: () => 0.6, vLineWidth: (i) => (i === 0 ? 1.6 : 0.6),
            paddingLeft: () => 14, paddingRight: () => 14, paddingTop: () => 11, paddingBottom: () => 11,
        },
        margin: margine,
    }
}

function blocco(b, dopoPrincipio) {
    switch (b.tipo) {
        case 'paragrafo':
            return { text: frammenti(b.testo), margin: [0, 0, 0, 7] }
        case 'titoletto':
            return { text: frammenti(b.testo, { bold: true, color: C.oroChiaro }), fontSize: 9.8, margin: [0, 4, 0, 5] }
        case 'elenco':
            return {
                [b.ordinato ? 'ol' : 'ul']: b.voci.map((v) => ({ text: frammenti(v), margin: [0, 0, 0, 4] })),
                markerColor: C.oro, margin: [4, 0, 0, 7],
            }
        case 'principio':
            return {
                stack: [
                    dopoPrincipio ? null : filetto([0, 4, 0, 7]),
                    spaziato(b.etichetta ?? 'Principio richiamato', { color: C.oro }),
                    { text: frammenti(b.testo), fontSize: 8.7, margin: [0, 5, 0, 4] },
                    b.fonte ? { text: b.fonte, bold: true, color: C.oroChiaro, fontSize: 8.4 } : null,
                    filetto([0, 7, 0, 8]),
                ].filter(Boolean),
                unbreakable: true,
            }
        default:
            return null
    }
}

// Tre punti fermi in colonna, subito dopo la prima sezione.
function puntiFermi(m, contenuto) {
    if (!m.punti_fermi?.length) return
    contenuto.push(filetto([0, 10, 0, 10]))
    contenuto.push(spaziato('In sintesi — i punti fermi', { margin: [0, 0, 0, 8] }))
    contenuto.push({
        columns: m.punti_fermi.slice(0, 3).map((p, i) => ({
            width: '*',
            stack: [
                { text: ROMANI[i], font: 'Cormorant', italics: true, fontSize: 16, color: C.oro, margin: [0, 0, 0, 4] },
                { text: frammenti(p.titolo, { bold: true, color: C.oroChiaro }), fontSize: 8.8, margin: [0, 0, 0, 3] },
                { text: frammenti(p.testo), fontSize: 8, color: C.testo },
            ],
        })),
        columnGap: 18, margin: [0, 0, 0, 14], unbreakable: true,
    })
}

// Riquadro finale di sintesi, tabella delle fonti e nota finale.
function sintesiEFonti(m, contenuto) {
    if (m.sintesi) {
        contenuto.push(riquadro([
            spaziato('In sintesi', { color: C.oro, margin: [0, 0, 0, 6] }),
            { text: frammenti(m.sintesi), fontSize: 9.4, lineHeight: 1.5 },
        ], C.oro, [0, 8, 0, 16]))
    }
    if (m.fonti?.length) {
        contenuto.push({
            stack: [
                spaziato('Fonti richiamate', { margin: [0, 8, 0, 6] }),
                {
                    table: {
                        widths: [150, '*'],
                        body: m.fonti.map((f) => [
                            { text: maiuscola(f.citazione), bold: true, color: C.oroChiaro, fontSize: 8.3 },
                            { text: maiuscola(f.descrizione ?? ''), fontSize: 8.1, color: C.testo },
                        ]),
                    },
                    layout: {
                        hLineColor: () => C.linea, vLineWidth: () => 0,
                        hLineWidth: (i) => (i === 0 ? 0 : 0.5),
                        paddingLeft: () => 0, paddingRight: () => 8, paddingTop: () => 5, paddingBottom: () => 5,
                    },
                },
            ],
            unbreakable: m.fonti.length <= 12,
        })
    }
    contenuto.push({ text: m.nota_finale, fontSize: 7.3, color: C.grigioScuro, margin: [0, 14, 0, 0] })
}

function angoli(w, h) {
    const d = 26, l = 20, s = { lineWidth: 1.3, lineColor: C.oro }
    return [
        { type: 'polyline', points: [{ x: d, y: d + l }, { x: d, y: d }, { x: d + l, y: d }], ...s },
        { type: 'polyline', points: [{ x: w - d - l, y: d }, { x: w - d, y: d }, { x: w - d, y: d + l }], ...s },
        { type: 'polyline', points: [{ x: d, y: h - d - l }, { x: d, y: h - d }, { x: d + l, y: h - d }], ...s },
        { type: 'polyline', points: [{ x: w - d - l, y: h - d }, { x: w - d, y: h - d }, { x: w - d, y: h - d - l }], ...s },
    ]
}

export function definizioneDocumento(m, { logo } = {}) {
    const contenuto = []

    // Intestazione: logo, filetto con rombo, dicitura, titolo e temi
    contenuto.push(logo
        ? { image: logo, width: 150, alignment: 'center', margin: [0, 0, 0, 10] }
        : { text: 'L E X U M', font: 'Cormorant', fontSize: 20, color: C.oro, alignment: 'center', margin: [0, 0, 0, 8] })
    contenuto.push({ canvas: [
        { type: 'line', x1: 206, y1: 3, x2: 236, y2: 3, lineWidth: 0.7, lineColor: C.oro },
        { type: 'polyline', closePath: true, color: C.oro, points: [{ x: 241.5, y: 0.5 }, { x: 244, y: 3 }, { x: 241.5, y: 5.5 }, { x: 239, y: 3 }] },
        { type: 'line', x1: 247, y1: 3, x2: 277, y2: 3, lineWidth: 0.7, lineColor: C.oro },
    ], margin: [0, 0, 0, 8] })
    contenuto.push({ ...spaziato('Lex AI · Analisi giuridica'), alignment: 'center', margin: [0, 0, 0, 16] })
    contenuto.push({ text: m.titolo, font: 'Cormorant', italics: true, fontSize: 25, color: C.oroChiaro, alignment: 'center', lineHeight: 1.05, margin: [30, 0, 30, 6] })
    contenuto.push(m.sottotitolo
        ? { text: m.sottotitolo, fontSize: 8.4, color: C.grigio, alignment: 'center', margin: [30, 0, 30, 18] }
        : { text: '', margin: [0, 0, 0, 12] })

    // Quesito e premessa
    contenuto.push(riquadro([
        spaziato(m.quesito.etichetta ?? 'Il quesito', { color: C.oro, margin: [0, 0, 0, 6] }),
        { text: m.quesito.testo, font: 'Cormorant', italics: true, fontSize: 12, color: C.oroChiaro, lineHeight: 1.2 },
    ], C.oro))
    if (m.premessa?.length) {
        contenuto.push(riquadro([
            spaziato('Premessa', { color: C.salvia, bold: true, margin: [0, 0, 0, 6] }),
            ...m.premessa.map((b) => ({ ...blocco(b), fontSize: 8.8 })),
        ], C.salvia))
    }

    // Sezioni; i punti fermi, se ci sono, dopo la prima (come un sommario)
    m.sezioni.forEach((s, i) => {
        const numero = String(i + 1).padStart(2, '0')
        contenuto.push({
            stack: [
                spaziato(s.etichetta ? `${numero} — ${s.etichetta}` : numero, { margin: [0, 10, 0, 0] }),
                trattino(),
                { text: s.titolo, font: 'Cormorant', italics: true, fontSize: 17, color: C.oroChiaro, margin: [0, 0, 0, 8] },
            ],
            unbreakable: true,
        })
        s.blocchi.forEach((b, j) => {
            // due principi di fila: una riga sola fra i due
            const r = blocco(b, b.tipo === 'principio' && s.blocchi[j - 1]?.tipo === 'principio')
            if (r) contenuto.push(r)
        })
        if (i === 0) puntiFermi(m, contenuto)
    })

    sintesiEFonti(m, contenuto)

    return {
        pageSize: 'A4',
        pageMargins: [56, 58, 56, 70],
        info: { title: m.titolo, author: 'Lexum · Lex AI', creator: 'Lexum' },
        background: (pagina, formato) => ({
            canvas: [
                { type: 'rect', x: 0, y: 0, w: formato.width, h: formato.height, color: C.fondo },
                { type: 'rect', x: 26, y: 26, w: formato.width - 52, h: formato.height - 52, lineWidth: 0.6, lineColor: C.cornice },
                ...angoli(formato.width, formato.height),
            ],
        }),
        footer: (pagina, totale) => ({
            stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LARGHEZZA, y2: 0, lineWidth: 0.6, lineColor: C.linea }], margin: [56, 0, 56, 6] },
                {
                    columns: [
                        { text: [{ text: 'LEXUM', bold: true, color: C.oro, characterSpacing: 1.4 }, { text: '  ·  Analisi generata con Lex AI  ·  lexum.it', color: C.grigioScuro }], fontSize: 7 },
                        { text: `${pagina} / ${totale}`, alignment: 'right', fontSize: 7, color: C.grigioScuro },
                    ],
                    margin: [56, 0, 56, 0],
                },
            ],
            margin: [0, 18, 0, 0],
        }),
        content: contenuto,
        defaultStyle: { font: 'Outfit', fontSize: 9.2, color: C.testo, lineHeight: 1.42, fontFeatures: { liga: false, clig: false } },
    }
}
