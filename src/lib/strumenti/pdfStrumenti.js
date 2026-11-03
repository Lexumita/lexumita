// src/lib/strumenti/pdfStrumenti.js
//
// 03-11-2026: i PDF degli strumenti gratuiti, creati nel browser: niente passa dai nostri server.
// Il modulo si carica solo al clic: pdfmake e i caratteri pesano parecchio (come lib/pdf/pdfRisposta.js).

import pdfMake from 'pdfmake/build/pdfmake'
import outfit300 from '@fontsource/outfit/files/outfit-latin-300-normal.woff?url'
import outfit500 from '@fontsource/outfit/files/outfit-latin-500-normal.woff?url'
import { formatImporto } from '@/lib/prezzi'
import { scaricaBlob } from './scarica'

// pdfmake nel browser scarica i caratteri solo da indirizzi completi (https://...).
const assoluto = (url) => new URL(url, window.location.origin).href

function caratteri() {
    return {
        Outfit: { normal: assoluto(outfit300), bold: assoluto(outfit500), italics: assoluto(outfit300), bolditalics: assoluto(outfit500) },
    }
}

const PETROLIO = '#0B1F2A'
const GRIGIO = '#5C6B73'
const LINEA = '#D9DEE1'
const SITO = 'www.lexum.it/strumenti'

function creaBlob(definizione) {
    // Se un carattere non arriva, pdfmake non richiama mai: dopo 30 secondi si legge un errore.
    return Promise.race([
        new Promise((ok) => { pdfMake.createPdf(definizione, null, caratteri()).getBlob(ok) }),
        new Promise((_, ko) => setTimeout(() => ko(new Error('Non sono riuscito a creare il PDF. Riprova tra qualche istante.')), 30000)),
    ])
}

const pulisciNome = (s) => s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 90)

function piede(testo) {
    return (pagina, pagine) => ({
        margin: [40, 10, 40, 0],
        columns: [
            { text: testo, fontSize: 7, color: GRIGIO, width: '*' },
            { text: `Pagina ${pagina} di ${pagine}`, fontSize: 7, color: GRIGIO, alignment: 'right', width: 70 },
        ],
    })
}

const rigaTotale = (etichetta, valore, opzioni = {}) => ([
    { text: etichetta, alignment: 'right', ...opzioni },
    { text: valore, alignment: 'right', ...opzioni },
])

const lineeTabella = {
    hLineWidth: (i) => (i === 0 ? 0 : 0.5),
    vLineWidth: () => 0,
    hLineColor: () => LINEA,
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 5,
    paddingBottom: () => 5,
}

// ─── Fattura, pro forma, avviso di parcella ──────────────────────────────────
// d: { tipo, titolo, numero, data, scadenza, emittente: {logo, nome, righe[]}, cliente: {nome, righe[]},
//      righe: [{descrizione, quantita, prezzo_unitario, totale}], totali: [[etichetta, valore]], totale, netto,
//      diciture[], note, pagamento[], avvertenza }
export async function scaricaPdfDocumento(d) {
    const definizione = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 50],
        defaultStyle: { font: 'Outfit', fontSize: 9.5, color: PETROLIO, lineHeight: 1.2 },
        footer: piede(`${d.avvertenza} Creato con Lexum, ${SITO}`),
        content: [
            {
                columns: [
                    {
                        width: '*',
                        stack: [
                            ...(d.emittente.logo ? [{ image: d.emittente.logo, fit: [150, 60], margin: [0, 0, 0, 8] }] : []),
                            { text: d.emittente.nome, bold: true, fontSize: 12, margin: [0, 0, 0, 3] },
                            ...d.emittente.righe.map(r => ({ text: r, fontSize: 8.5, color: GRIGIO })),
                        ],
                    },
                    {
                        width: 165,
                        table: {
                            widths: ['*'],
                            body: [[{
                                stack: [
                                    { text: d.titolo.toUpperCase(), bold: true, fontSize: 10 },
                                    { text: `N. ${d.numero || '—'}`, bold: true, fontSize: 13, margin: [0, 3, 0, 3] },
                                    { text: `Data: ${d.data || '—'}`, fontSize: 8.5, color: GRIGIO },
                                    ...(d.scadenza ? [{ text: `Scadenza: ${d.scadenza}`, fontSize: 8.5, color: GRIGIO }] : []),
                                ],
                                margin: [4, 4, 4, 4],
                            }]],
                        },
                        layout: { hLineColor: () => LINEA, vLineColor: () => LINEA, hLineWidth: () => 0.7, vLineWidth: () => 0.7 },
                    },
                ],
                margin: [0, 0, 0, 18],
            },
            {
                table: {
                    widths: ['*'],
                    body: [[{
                        fillColor: '#F4F6F7',
                        margin: [4, 4, 4, 4],
                        stack: [
                            { text: 'DESTINATARIO', bold: true, fontSize: 8, color: GRIGIO, margin: [0, 0, 0, 3] },
                            { text: d.cliente.nome, bold: true, fontSize: 10.5, margin: [0, 0, 0, 2] },
                            ...d.cliente.righe.map(r => ({ text: r, fontSize: 8.5, color: GRIGIO })),
                        ],
                    }]],
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 16],
            },
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 40, 70, 70],
                    body: [
                        ['Descrizione', { text: 'Qt.', alignment: 'right' }, { text: 'Prezzo', alignment: 'right' }, { text: 'Totale', alignment: 'right' }]
                            .map(c => ({ ...(typeof c === 'string' ? { text: c } : c), bold: true, color: '#FFFFFF', fillColor: PETROLIO, fontSize: 8.5 })),
                        ...d.righe.map(r => ([
                            { text: r.descrizione },
                            { text: String(r.quantita), alignment: 'right' },
                            { text: formatImporto(r.prezzo_unitario), alignment: 'right' },
                            { text: formatImporto(r.totale), alignment: 'right' },
                        ])),
                    ],
                },
                layout: lineeTabella,
                margin: [0, 0, 0, 12],
            },
            {
                columns: [
                    { width: '*', text: '' },
                    {
                        width: 245,
                        table: {
                            widths: ['*', 75],
                            body: [
                                ...d.totali.map(([e, v]) => rigaTotale(e, v, { color: GRIGIO, fontSize: 9 })),
                                rigaTotale('Totale documento', d.totale, { bold: true, fontSize: 11 }),
                                ...(d.netto ? [
                                    rigaTotale(d.netto.etichetta, d.netto.ritenuta, { color: '#B03A3A', fontSize: 9 }),
                                    rigaTotale('Netto a pagare', d.netto.valore, { bold: true, fontSize: 11 }),
                                ] : []),
                            ],
                        },
                        layout: { ...lineeTabella, hLineWidth: () => 0, paddingTop: () => 2, paddingBottom: () => 2 },
                    },
                ],
                margin: [0, 0, 0, 14],
            },
            ...d.diciture.map(t => ({ text: t, fontSize: 8, italics: true, color: GRIGIO, margin: [0, 0, 0, 3] })),
            ...(d.note ? [{ text: 'Note', bold: true, fontSize: 8.5, margin: [0, 8, 0, 2] }, { text: d.note, fontSize: 8.5, color: GRIGIO }] : []),
            ...(d.pagamento.length ? [
                { text: 'Modalità di pagamento', bold: true, fontSize: 8.5, margin: [0, 8, 0, 2] },
                ...d.pagamento.map(t => ({ text: t, fontSize: 8.5, color: GRIGIO })),
            ] : []),
        ],
    }
    const blob = await creaBlob(definizione)
    scaricaBlob(blob, `${pulisciNome(`${d.titolo} ${d.numero || ''} ${d.cliente.nome}`.replace('—', ''))}.pdf`)
}

// ─── Parcella ────────────────────────────────────────────────────────────────
// p: { competenza, scaglione, righe, rp (riepilogo del motore), note[], avvertenza, ritenuta }
export async function scaricaPdfParcella(p) {
    const { rp } = p
    const definizione = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 50],
        defaultStyle: { font: 'Outfit', fontSize: 9.5, color: PETROLIO, lineHeight: 1.2 },
        footer: piede(`Creato con Lexum, ${SITO}`),
        content: [
            { text: 'Calcolo della parcella', fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
            { text: 'Parametri forensi: DM 55/2014, tabelle aggiornate dal DM 147/2022', fontSize: 9, color: GRIGIO, margin: [0, 0, 0, 2] },
            { text: [p.competenza, p.scaglione].filter(Boolean).join(' · '), fontSize: 9, color: GRIGIO, margin: [0, 0, 0, 16] },
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 80],
                    body: [
                        [{ text: 'Voce' }, { text: 'Importo', alignment: 'right' }].map(c => ({ ...c, bold: true, color: '#FFFFFF', fillColor: PETROLIO, fontSize: 8.5 })),
                        ...p.righe.map(r => ([{ text: r.descrizione }, { text: formatImporto(r.prezzo_unitario), alignment: 'right' }])),
                    ],
                },
                layout: lineeTabella,
                margin: [0, 0, 0, 12],
            },
            {
                columns: [
                    { width: '*', text: '' },
                    {
                        width: 245,
                        table: {
                            widths: ['*', 75],
                            body: [
                                rigaTotale('Imponibile', formatImporto(rp.imponibile), { color: GRIGIO, fontSize: 9 }),
                                rigaTotale('C.P.A. 4%', formatImporto(rp.cpa), { color: GRIGIO, fontSize: 9 }),
                                rigaTotale('IVA 22%', formatImporto(rp.iva), { color: GRIGIO, fontSize: 9 }),
                                rigaTotale('Totale', formatImporto(rp.totaleLordo), { bold: true, fontSize: 11 }),
                                ...(p.ritenuta ? [
                                    rigaTotale("Ritenuta d'acconto 20%", `- ${formatImporto(rp.ritenuta)}`, { color: '#B03A3A', fontSize: 9 }),
                                    rigaTotale('Netto a pagare', formatImporto(rp.totaleNetto), { bold: true, fontSize: 11 }),
                                ] : []),
                            ],
                        },
                        layout: { ...lineeTabella, hLineWidth: () => 0, paddingTop: () => 2, paddingBottom: () => 2 },
                    },
                ],
                margin: [0, 0, 0, 14],
            },
            ...p.note.map(t => ({ text: t, fontSize: 8, italics: true, color: GRIGIO, margin: [0, 0, 0, 3] })),
            { text: p.avvertenza, fontSize: 8, italics: true, color: GRIGIO, margin: [0, 6, 0, 0] },
        ],
    }
    const blob = await creaBlob(definizione)
    scaricaBlob(blob, `${pulisciNome(`Parcella ${p.competenza}`)}.pdf`)
}
