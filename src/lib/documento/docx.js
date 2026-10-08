// src/lib/documento/docx.js
//
// 08-10-2026: file Word (.docx) dei documenti scritti da Lex, costruito nel browser senza librerie in più:
// un .docx è uno zip di file XML. Times New Roman 12, pagina A4, carta intestata del professionista
// nell'intestazione della pagina (se c'è), numero di pagina in basso. Niente marchio Lexum.

const codifica = new TextEncoder()

// ── zip senza compressione (metodo «store»): Word lo apre come qualsiasi .docx ──
let tabellaCrc = null
function crc32(dati) {
    if (!tabellaCrc) {
        tabellaCrc = new Uint32Array(256)
        for (let n = 0; n < 256; n++) {
            let c = n
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
            tabellaCrc[n] = c >>> 0
        }
    }
    let crc = 0xffffffff
    for (let i = 0; i < dati.length; i++) crc = tabellaCrc[(crc ^ dati[i]) & 0xff] ^ (crc >>> 8)
    return (crc ^ 0xffffffff) >>> 0
}

function zip(file) {
    const parti = []
    const centrale = []
    let offset = 0
    const ora = new Date()
    const orario = (ora.getHours() << 11) | (ora.getMinutes() << 5) | (ora.getSeconds() >> 1)
    const data = ((ora.getFullYear() - 1980) << 9) | ((ora.getMonth() + 1) << 5) | ora.getDate()
    for (const f of file) {
        const nome = codifica.encode(f.nome)
        const dati = codifica.encode(f.testo)
        const crc = crc32(dati)
        const locale = new DataView(new ArrayBuffer(30))
        locale.setUint32(0, 0x04034b50, true)
        locale.setUint16(4, 20, true)
        locale.setUint16(6, 0x0800, true)
        locale.setUint16(8, 0, true)
        locale.setUint16(10, orario, true)
        locale.setUint16(12, data, true)
        locale.setUint32(14, crc, true)
        locale.setUint32(18, dati.length, true)
        locale.setUint32(22, dati.length, true)
        locale.setUint16(26, nome.length, true)
        locale.setUint16(28, 0, true)
        parti.push(new Uint8Array(locale.buffer), nome, dati)
        const voce = new DataView(new ArrayBuffer(46))
        voce.setUint32(0, 0x02014b50, true)
        voce.setUint16(4, 20, true)
        voce.setUint16(6, 20, true)
        voce.setUint16(8, 0x0800, true)
        voce.setUint16(10, 0, true)
        voce.setUint16(12, orario, true)
        voce.setUint16(14, data, true)
        voce.setUint32(16, crc, true)
        voce.setUint32(20, dati.length, true)
        voce.setUint32(24, dati.length, true)
        voce.setUint16(28, nome.length, true)
        voce.setUint16(30, 0, true)
        voce.setUint16(32, 0, true)
        voce.setUint16(34, 0, true)
        voce.setUint16(36, 0, true)
        voce.setUint32(38, 0, true)
        voce.setUint32(42, offset, true)
        centrale.push(new Uint8Array(voce.buffer), nome)
        offset += 30 + nome.length + dati.length
    }
    const dimensioneCentrale = centrale.reduce((s, p) => s + p.length, 0)
    const fine = new DataView(new ArrayBuffer(22))
    fine.setUint32(0, 0x06054b50, true)
    fine.setUint16(4, 0, true)
    fine.setUint16(6, 0, true)
    fine.setUint16(8, file.length, true)
    fine.setUint16(10, file.length, true)
    fine.setUint32(12, dimensioneCentrale, true)
    fine.setUint32(16, offset, true)
    fine.setUint16(20, 0, true)
    return new Blob([...parti, ...centrale, new Uint8Array(fine.buffer)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
}

// ── XML di Word ──
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const testa = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

// eslint-disable-next-line no-control-regex
const xml = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function corsa(p, extra = '') {
    const proprieta = `${p.grassetto ? '<w:b/>' : ''}${p.corsivo ? '<w:i/>' : ''}${extra}`
    const rPr = proprieta ? `<w:rPr>${proprieta}</w:rPr>` : ''
    return String(p.testo).split('\n')
        .map((t, i) => `${i ? `<w:r>${rPr}<w:br/></w:r>` : ''}<w:r>${rPr}<w:t xml:space="preserve">${xml(t)}</w:t></w:r>`)
        .join('')
}

const paragrafo = (pezzi, pPr = '', extra = '') =>
    `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${pezzi.map((p) => corsa(p, extra)).join('')}</w:p>`

function corpoXml(blocchi) {
    const out = []
    for (const b of blocchi) {
        if (b.tipo === 'titolo') out.push(paragrafo(b.pezzi, `<w:pStyle w:val="Heading${b.livello}"/>`))
        else if (b.tipo === 'paragrafo') out.push(paragrafo(b.pezzi))
        else if (b.tipo === 'citazione') out.push(paragrafo(b.pezzi, '<w:ind w:left="567"/>', '<w:i/>'))
        else if (b.tipo === 'linea') {
            out.push('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="999999"/></w:pBdr></w:pPr></w:p>')
        } else if (b.tipo === 'elenco') {
            for (const v of b.voci) {
                const sinistra = 567 + v.livello * 425
                out.push(v.segno
                    ? paragrafo([{ testo: `${v.segno}\t` }, ...v.pezzi],
                        `<w:tabs><w:tab w:val="left" w:pos="${sinistra}"/></w:tabs><w:spacing w:after="80"/><w:ind w:left="${sinistra}" w:hanging="425"/>`)
                    : paragrafo(v.pezzi, `<w:spacing w:after="80"/><w:ind w:left="${sinistra}"/>`))
            }
        }
    }
    return out.join('')
}

function intestazioneXml(carta) {
    const righe = [carta.intestatario, ...carta.righe]
    return `${testa}<w:hdr xmlns:w="${W}">${righe.map((r, i) => paragrafo(
        [{ testo: r, grassetto: i === 0 }],
        `<w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/>${i === righe.length - 1
            ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="6" w:color="808080"/></w:pBdr>' : ''}`,
        i === 0 ? '<w:sz w:val="26"/>' : '<w:sz w:val="18"/><w:color w:val="404040"/>',
    )).join('')}<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p></w:hdr>`
}

const piede = `${testa}<w:ftr xmlns:w="${W}"><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>`
    + '<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>'
    + '<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
    + '<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r>'
    + '<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r>'
    + '<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>'

const stili = `${testa}<w:styles xmlns:w="${W}">`
    + '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>'
    + '<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="it-IT"/></w:rPr></w:rPrDefault>'
    + '<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="300" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr></w:pPrDefault></w:docDefaults>'
    + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>'
    + '<w:pPr><w:keepNext/><w:spacing w:before="240" w:after="240"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>'
    + '<w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:jc w:val="left"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>'
    + '<w:pPr><w:keepNext/><w:spacing w:before="200" w:after="100"/><w:jc w:val="left"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:i/></w:rPr></w:style>'
    + '</w:styles>'

/**
 * Il documento come file Word.
 * @param {{ blocchi: Array, carta: { intestatario: string, righe: string[] } | null, titolo?: string }} p
 * @returns {Blob}
 */
export function creaDocx({ blocchi, carta, titolo }) {
    const conCarta = !!(carta && (carta.intestatario || carta.righe?.length))
    const sezione = '<w:sectPr>'
        + `${conCarta ? '<w:headerReference w:type="default" r:id="rIdIntestazione"/>' : ''}`
        + '<w:footerReference w:type="default" r:id="rIdPiede"/>'
        + '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="567" w:footer="567" w:gutter="0"/>'
        + '</w:sectPr>'
    const documento = `${testa}<w:document xmlns:w="${W}" xmlns:r="${R}"><w:body>${corpoXml(blocchi)}${sezione}</w:body></w:document>`
    const relazioni = `${testa}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
        + '<Relationship Id="rIdStili" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        + '<Relationship Id="rIdPiede" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'
        + `${conCarta ? '<Relationship Id="rIdIntestazione" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' : ''}`
        + '</Relationships>'
    const tipi = `${testa}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
        + '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
        + `${conCarta ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ''}`
        + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
        + '</Types>'
    const radice = `${testa}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
        + '</Relationships>'
    const proprieta = `${testa}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" `
        + 'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
        + `<dc:title>${xml(titolo ?? '')}</dc:title><dc:creator>${xml(carta?.intestatario ?? '')}</dc:creator>`
        + `<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created>`
        + '</cp:coreProperties>'
    const file = [
        { nome: '[Content_Types].xml', testo: tipi },
        { nome: '_rels/.rels', testo: radice },
        { nome: 'docProps/core.xml', testo: proprieta },
        { nome: 'word/document.xml', testo: documento },
        { nome: 'word/styles.xml', testo: stili },
        { nome: 'word/footer1.xml', testo: piede },
        { nome: 'word/_rels/document.xml.rels', testo: relazioni },
    ]
    if (conCarta) file.push({ nome: 'word/header1.xml', testo: intestazioneXml(carta) })
    return zip(file)
}
