// src/lib/strumenti/fatturaPA.js
//
// 03-11-2026: il file XML FatturaPA (FPR12, schema 1.2.3) dello strumento gratuito /strumenti/crea-fattura.
// È lo stesso costruttore della funzione genera-fattura-xml del gestionale (xml.ts), portato nel browser:
// i dati di chi usa lo strumento non passano dai nostri server. Se cambi le regole qui, cambiale anche lì.
//
// Se mancano dati, invece di un file che lo SDI scarterebbe torna l'elenco di cosa manca.

const TIPO_CASSA = { cassa_forense: 'TC01', cnpadc: 'TC02', cnpr: 'TC06' }

const RIF_NATURA = {
    'N1': 'Escluse ex art. 15 DPR 633/72',
    'N2.1': 'Non soggette ex artt. da 7 a 7-septies DPR 633/72',
    'N2.2': 'Non soggette - altri casi',
    'N3.1': 'Non imponibili - esportazioni',
    'N3.2': 'Non imponibili - cessioni intracomunitarie',
    'N3.3': 'Non imponibili - cessioni verso San Marino',
    'N3.4': 'Non imponibili - operazioni assimilate alle esportazioni',
    'N3.5': "Non imponibili - a seguito di dichiarazioni d'intento",
    'N3.6': 'Non imponibili - altre operazioni',
    'N4': 'Esenti ex art. 10 DPR 633/72',
    'N5': 'Regime del margine',
    'N7': 'IVA assolta in altro Stato UE',
}
export const RIF_FORFETTARIO = 'Operazione in franchigia da IVA ex art. 1, commi 54-89, L. 190/2014'

// ─── Testi: solo caratteri ammessi dallo schema ──────────────────────────────

const SOSTITUZIONI = [
    [/[‘’‚‛′]/g, "'"],
    [/[“”„‟″]/g, '"'],
    [/[‐-―−]/g, '-'],
    [/…/g, '...'],
    [/€/g, 'EUR'],
    [/[  -​  　]/g, ' '],
    [/•/g, '-'],
]

// Latin-1 (Basic Latin + Latin-1 Supplement), una riga, al massimo `max` caratteri
export function latino(testo, max) {
    let s = String(testo ?? '').normalize('NFC')
    for (const [re, con] of SOSTITUZIONI) s = s.replace(re, con)
    s = s.replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').replace(/\s+/g, ' ').trim()
    return s.slice(0, max).trim()
}

// Solo ASCII stampabile (Numero, NumeroCivico...)
export function ascii(testo, max) {
    let s = String(testo ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    for (const [re, con] of SOSTITUZIONI) s = s.replace(re, con)
    return s.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim().slice(0, max).trim()
}

// Solo contenuto di elementi (mai attributi con dati): bastano & < >
function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── Numeri ──────────────────────────────────────────────────────────────────

function r2(x) {
    return Math.round((x + Math.sign(x) * Number.EPSILON) * 100) / 100
}
function n(x) {
    const v = Number(x ?? 0)
    return Number.isFinite(v) ? v : 0
}
function f2(x) {
    return r2(n(x)).toFixed(2)
}
// Quantità e prezzi: almeno 2 decimali, al massimo 8
function f8(x) {
    const s = n(x).toFixed(8).replace(/0+$/, '')
    const [intero, dec = ''] = s.split('.')
    return `${intero}.${dec.padEnd(2, '0')}`
}

// ─── Codici fiscali ──────────────────────────────────────────────────────────

export function pivaValida(p) {
    if (!/^[0-9]{11}$/.test(p)) return false
    let somma = 0
    for (let i = 0; i < 10; i++) {
        let c = p.charCodeAt(i) - 48
        if (i % 2 === 1) { c *= 2; if (c > 9) c -= 9 }
        somma += c
    }
    return (10 - (somma % 10)) % 10 === p.charCodeAt(10) - 48
}

const CF_DISPARI = {
    0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21,
    A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18, N: 20,
    O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
}

export function cfValido(cf) {
    if (/^[0-9]{11}$/.test(cf)) return pivaValida(cf)
    if (!/^[A-Z0-9]{16}$/.test(cf)) return false
    let somma = 0
    for (let i = 0; i < 15; i++) {
        const c = cf[i]
        if (i % 2 === 0) somma += CF_DISPARI[c]
        else somma += /[0-9]/.test(c) ? c.charCodeAt(0) - 48 : c.charCodeAt(0) - 65
    }
    return String.fromCharCode(65 + (somma % 26)) === cf[15]
}

// ─── XML ─────────────────────────────────────────────────────────────────────

class Scrittore {
    righe = []
    livello = 0
    apri(tag) { this.righe.push(`${'  '.repeat(this.livello)}<${tag}>`); this.livello++ }
    chiudi(tag) { this.livello--; this.righe.push(`${'  '.repeat(this.livello)}</${tag}>`) }
    campo(tag, valore) {
        if (valore === null || valore === undefined || valore === '') return
        this.righe.push(`${'  '.repeat(this.livello)}<${tag}>${esc(valore)}</${tag}>`)
    }
}

function modalitaPagamento(metodo, iban) {
    const m = metodo.toLowerCase()
    if (m.includes('bonifico')) return 'MP05'
    if (m.includes('contanti')) return 'MP01'
    if (m.includes('assegno')) return 'MP02'
    if (m.includes('pos') || m.includes('carta')) return 'MP08'
    return iban ? 'MP05' : null
}

export function costruisciFatturaPA({ fattura, righe, emittente, cliente }) {
    const mancano = []

    // ─── Chi emette ───
    const pivaEm = String(emittente.partita_iva ?? '').replace(/\s+/g, '')
    const cfEm = String(emittente.cf ?? '').replace(/\s+/g, '').toUpperCase()
    if (!pivaEm) mancano.push('la tua partita IVA')
    else if (!pivaValida(pivaEm)) mancano.push('la tua partita IVA non è valida: controlla le cifre')
    if (cfEm && !cfValido(cfEm)) mancano.push('il tuo codice fiscale non è valido: controlla i caratteri')
    const denomEm = latino(emittente.ragione_sociale, 80)
    const nomeEm = latino(emittente.nome, 60)
    const cognomeEm = latino(emittente.cognome, 60)
    if (!denomEm && (!nomeEm || !cognomeEm)) mancano.push('il tuo nome e cognome, o la denominazione')
    const indEm = latino(emittente.indirizzo, 60)
    const capEm = String(emittente.cap ?? '').trim()
    const comuneEm = latino(emittente.comune, 60)
    const provEm = String(emittente.provincia ?? '').trim().toUpperCase()
    const paeseEm = String(emittente.paese ?? 'IT').trim().toUpperCase() || 'IT'
    if (!indEm) mancano.push('il tuo indirizzo')
    if (!/^[0-9]{5}$/.test(capEm)) mancano.push('il tuo CAP (5 cifre)')
    if (!comuneEm) mancano.push('il tuo comune')
    if (provEm && !/^[A-Z]{2}$/.test(provEm)) mancano.push('la tua provincia (sigla di 2 lettere)')

    // ─── Cliente ───
    const paeseCli = String(cliente.paese ?? 'IT').trim().toUpperCase() || 'IT'
    const estero = paeseCli !== 'IT'
    const pivaCli = String(cliente.partita_iva ?? '').replace(/\s+/g, '').toUpperCase()
    const cfCli = String(cliente.cf ?? '').replace(/\s+/g, '').toUpperCase()
    const giuridica = cliente.tipo_soggetto === 'persona_giuridica'
    const denomCli = latino(cliente.ragione_sociale, 80)
    const nomeCli = latino(cliente.nome, 60)
    const cognomeCli = latino(cliente.cognome, 60)
    if (giuridica ? !denomCli : (!nomeCli || !cognomeCli)) {
        mancano.push(giuridica ? 'la ragione sociale del cliente' : 'nome e cognome del cliente')
    }
    if (!estero) {
        if (!pivaCli && !cfCli) mancano.push('il codice fiscale o la partita IVA del cliente')
        if (pivaCli && !pivaValida(pivaCli)) mancano.push('la partita IVA del cliente non è valida: controlla le cifre')
        if (cfCli && !cfValido(cfCli)) mancano.push('il codice fiscale del cliente non è valido: controlla i caratteri')
    }
    const indCli = latino(cliente.indirizzo, 60)
    const capCli = estero ? '00000' : String(cliente.cap ?? '').trim()
    const comuneCli = latino(cliente.comune, 60)
    const provCli = estero ? '' : String(cliente.provincia ?? '').trim().toUpperCase()
    if (!indCli) mancano.push("l'indirizzo del cliente")
    if (!/^[0-9]{5}$/.test(capCli)) mancano.push('il CAP del cliente (5 cifre)')
    if (!comuneCli) mancano.push('il comune del cliente')
    if (provCli && !/^[A-Z]{2}$/.test(provCli)) mancano.push('la provincia del cliente (sigla di 2 lettere)')
    const codiceSdi = String(cliente.codice_destinatario_sdi ?? '').trim().toUpperCase()
    if (codiceSdi && !/^[A-Z0-9]{7}$/.test(codiceSdi)) mancano.push('il codice destinatario SDI del cliente (7 caratteri)')

    // ─── Fattura ───
    const numero = ascii(fattura.numero, 20)
    if (!numero) mancano.push('il numero della fattura')
    if (!fattura.data_emissione) mancano.push('la data della fattura')
    if (!righe.length) mancano.push('almeno una riga con descrizione e importo')
    const ivaPct = n(fattura.iva_percentuale)
    const naturaFatt = fattura.natura_iva ? String(fattura.natura_iva) : null
    const righeSenzaNatura = righe.filter((r) => !r.natura_iva)
    if (ivaPct === 0 && righeSenzaNatura.length && !naturaFatt) mancano.push('la natura IVA (con IVA 0% è obbligatoria)')

    if (mancano.length) return { ok: false, mancano }

    // ─── Riepilogo IVA, come lo ricontrolla lo SDI ───
    const forfettario = fattura.regime_fiscale === 'RF19'
    const rifPrincipale = forfettario ? RIF_FORFETTARIO : (naturaFatt ? RIF_NATURA[naturaFatt] ?? null : null)
    const gruppi = new Map()
    const aggiungi = (aliquota, natura, importo, rif) => {
        const chiave = `${aliquota.toFixed(2)}|${natura ?? ''}`
        const g = gruppi.get(chiave) ?? { aliquota, natura, imponibile: 0, imposta: 0, rif }
        g.imponibile += importo
        gruppi.set(chiave, g)
    }
    for (const r of righe) {
        if (r.natura_iva) aggiungi(0, r.natura_iva, n(r.totale), RIF_NATURA[r.natura_iva] ?? null)
        else aggiungi(ivaPct, ivaPct === 0 ? naturaFatt : null, n(r.totale), ivaPct === 0 ? rifPrincipale : null)
    }
    const cassa = n(fattura.cpa_importo)
    const tipoCassa = TIPO_CASSA[String(fattura.cassa_previdenza)] ?? null
    if (cassa > 0) aggiungi(ivaPct, ivaPct === 0 ? naturaFatt : null, cassa, ivaPct === 0 ? rifPrincipale : null)
    const bollo = n(fattura.bollo_importo)
    const bolloAlCliente = bollo > 0 && fattura.bollo_a_carico_cliente !== false
    if (bolloAlCliente) aggiungi(0, 'N1', bollo, RIF_NATURA.N1)
    for (const g of gruppi.values()) {
        g.imponibile = r2(g.imponibile)
        g.imposta = g.aliquota > 0 ? r2(n(fattura.iva_importo)) : 0
    }
    const sommaRiepilogo = r2([...gruppi.values()].reduce((s, g) => s + g.imponibile + g.imposta, 0))
    const lordo = r2(n(fattura.totale_lordo))
    if (Math.abs(sommaRiepilogo - lordo) > 0.011) {
        return { ok: false, mancano: [`i totali della fattura non tornano (${sommaRiepilogo.toFixed(2)} contro ${lordo.toFixed(2)})`] }
    }
    const ritenuta = fattura.applica_ritenuta === true && n(fattura.ritenuta_importo) > 0

    // ─── Trasmissione ───
    const idTrasmittente = /^[A-Z0-9]{16}$/.test(cfEm) ? cfEm : pivaEm
    const progressivo = (numero.replace(/[^A-Za-z0-9]/g, '').slice(-10)) || '1'
    const codiceDest = estero ? 'XXXXXXX' : (codiceSdi || '0000000')
    const pecDest = !estero && !codiceSdi ? String(cliente.pec_fatturazione ?? '').trim() : ''

    const w = new Scrittore()
    w.righe.push('<?xml version="1.0" encoding="UTF-8"?>')
    w.righe.push('<p:FatturaElettronica versione="FPR12" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">')
    w.livello = 1

    w.apri('FatturaElettronicaHeader')
    w.apri('DatiTrasmissione')
    w.apri('IdTrasmittente'); w.campo('IdPaese', 'IT'); w.campo('IdCodice', idTrasmittente); w.chiudi('IdTrasmittente')
    w.campo('ProgressivoInvio', progressivo)
    w.campo('FormatoTrasmissione', 'FPR12')
    w.campo('CodiceDestinatario', codiceDest)
    if (pecDest && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pecDest)) w.campo('PECDestinatario', pecDest.slice(0, 256))
    w.chiudi('DatiTrasmissione')

    w.apri('CedentePrestatore')
    w.apri('DatiAnagrafici')
    w.apri('IdFiscaleIVA'); w.campo('IdPaese', 'IT'); w.campo('IdCodice', pivaEm); w.chiudi('IdFiscaleIVA')
    if (cfEm) w.campo('CodiceFiscale', cfEm)
    w.apri('Anagrafica')
    if (denomEm) w.campo('Denominazione', denomEm)
    else { w.campo('Nome', nomeEm); w.campo('Cognome', cognomeEm) }
    w.chiudi('Anagrafica')
    w.campo('RegimeFiscale', forfettario ? 'RF19' : 'RF01')
    w.chiudi('DatiAnagrafici')
    w.apri('Sede')
    w.campo('Indirizzo', indEm)
    w.campo('NumeroCivico', ascii(emittente.numero_civico, 8))
    w.campo('CAP', capEm)
    w.campo('Comune', comuneEm)
    w.campo('Provincia', paeseEm === 'IT' ? provEm : '')
    w.campo('Nazione', /^[A-Z]{2}$/.test(paeseEm) ? paeseEm : 'IT')
    w.chiudi('Sede')
    w.chiudi('CedentePrestatore')

    w.apri('CessionarioCommittente')
    w.apri('DatiAnagrafici')
    if (estero) {
        w.apri('IdFiscaleIVA'); w.campo('IdPaese', paeseCli); w.campo('IdCodice', ascii(pivaCli, 28) || '99999999999'); w.chiudi('IdFiscaleIVA')
    } else {
        if (pivaCli) { w.apri('IdFiscaleIVA'); w.campo('IdPaese', 'IT'); w.campo('IdCodice', pivaCli); w.chiudi('IdFiscaleIVA') }
        if (cfCli) w.campo('CodiceFiscale', cfCli)
    }
    w.apri('Anagrafica')
    if (giuridica) w.campo('Denominazione', denomCli)
    else { w.campo('Nome', nomeCli); w.campo('Cognome', cognomeCli) }
    w.chiudi('Anagrafica')
    w.chiudi('DatiAnagrafici')
    w.apri('Sede')
    w.campo('Indirizzo', indCli)
    w.campo('NumeroCivico', ascii(cliente.numero_civico, 8))
    w.campo('CAP', capCli)
    w.campo('Comune', comuneCli)
    w.campo('Provincia', provCli)
    w.campo('Nazione', paeseCli)
    w.chiudi('Sede')
    w.chiudi('CessionarioCommittente')
    w.chiudi('FatturaElettronicaHeader')

    w.apri('FatturaElettronicaBody')
    w.apri('DatiGenerali')
    w.apri('DatiGeneraliDocumento')
    w.campo('TipoDocumento', 'TD01')
    w.campo('Divisa', 'EUR')
    w.campo('Data', String(fattura.data_emissione).slice(0, 10))
    w.campo('Numero', numero)
    if (ritenuta) {
        w.apri('DatiRitenuta')
        w.campo('TipoRitenuta', emittente.tipo_soggetto === 'persona_giuridica' ? 'RT02' : 'RT01')
        w.campo('ImportoRitenuta', f2(fattura.ritenuta_importo))
        w.campo('AliquotaRitenuta', f2(fattura.ritenuta_percentuale))
        w.campo('CausalePagamento', 'A')
        w.chiudi('DatiRitenuta')
    }
    if (bollo > 0) {
        w.apri('DatiBollo'); w.campo('BolloVirtuale', 'SI'); w.campo('ImportoBollo', f2(bollo)); w.chiudi('DatiBollo')
    }
    if (cassa > 0 && tipoCassa) {
        w.apri('DatiCassaPrevidenziale')
        w.campo('TipoCassa', tipoCassa)
        w.campo('AlCassa', f2(fattura.cpa_percentuale))
        w.campo('ImportoContributoCassa', f2(cassa))
        w.campo('ImponibileCassa', f2(fattura.imponibile))
        w.campo('AliquotaIVA', f2(ivaPct))
        if (ivaPct === 0) w.campo('Natura', naturaFatt)
        w.chiudi('DatiCassaPrevidenziale')
    }
    w.campo('ImportoTotaleDocumento', f2(lordo))
    const note = latino(fattura.note_pubbliche, 600)
    if (note) {
        for (let i = 0; i < note.length; i += 200) w.campo('Causale', latino(note.slice(i, i + 200), 200))
    }
    w.chiudi('DatiGeneraliDocumento')
    w.chiudi('DatiGenerali')

    w.apri('DatiBeniServizi')
    let numeroLinea = 0
    for (const r of righe) {
        numeroLinea++
        w.apri('DettaglioLinee')
        w.campo('NumeroLinea', String(numeroLinea))
        w.campo('Descrizione', latino(r.descrizione, 1000) || 'Prestazione professionale')
        w.campo('Quantita', f8(r.quantita ?? 1))
        w.campo('PrezzoUnitario', f8(r.prezzo_unitario))
        w.campo('PrezzoTotale', f8(r.totale))
        if (r.natura_iva) {
            w.campo('AliquotaIVA', '0.00')
            w.campo('Natura', r.natura_iva)
        } else {
            w.campo('AliquotaIVA', f2(ivaPct))
            if (ritenuta) w.campo('Ritenuta', 'SI')
            if (ivaPct === 0) w.campo('Natura', naturaFatt)
        }
        w.chiudi('DettaglioLinee')
    }
    if (bolloAlCliente) {
        numeroLinea++
        w.apri('DettaglioLinee')
        w.campo('NumeroLinea', String(numeroLinea))
        w.campo('Descrizione', 'Imposta di bollo assolta in modo virtuale')
        w.campo('Quantita', '1.00')
        w.campo('PrezzoUnitario', f8(bollo))
        w.campo('PrezzoTotale', f8(bollo))
        w.campo('AliquotaIVA', '0.00')
        w.campo('Natura', 'N1')
        w.chiudi('DettaglioLinee')
    }
    for (const g of gruppi.values()) {
        w.apri('DatiRiepilogo')
        w.campo('AliquotaIVA', f2(g.aliquota))
        if (g.natura) w.campo('Natura', g.natura)
        w.campo('ImponibileImporto', f2(g.imponibile))
        w.campo('Imposta', f2(g.imposta))
        if (g.aliquota > 0) w.campo('EsigibilitaIVA', 'I')
        if (g.natura) w.campo('RiferimentoNormativo', latino(g.rif ?? RIF_NATURA[g.natura] ?? '', 100))
        w.chiudi('DatiRiepilogo')
    }
    w.chiudi('DatiBeniServizi')

    // Pagamento: con quanto il cliente versa davvero (il netto)
    const iban = String(fattura.iban_pagamento ?? '').replace(/\s+/g, '').toUpperCase()
    const modalita = modalitaPagamento(String(fattura.metodo_pagamento ?? ''), iban)
    if (modalita && n(fattura.totale_netto) > 0) {
        w.apri('DatiPagamento')
        w.campo('CondizioniPagamento', 'TP02')
        w.apri('DettaglioPagamento')
        w.campo('ModalitaPagamento', modalita)
        if (fattura.data_scadenza) w.campo('DataScadenzaPagamento', String(fattura.data_scadenza).slice(0, 10))
        w.campo('ImportoPagamento', f2(fattura.totale_netto))
        if (modalita === 'MP05' && /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) w.campo('IBAN', iban)
        w.chiudi('DettaglioPagamento')
        w.chiudi('DatiPagamento')
    }
    w.chiudi('FatturaElettronicaBody')
    w.righe.push('</p:FatturaElettronica>')

    // Nome file: IT + codice del trasmittente + progressivo di 5 caratteri
    const anno = Number(String(fattura.data_emissione).slice(0, 4))
    // Tutte le cifre del numero: con «1/2026» e «2/2026» le ultime sarebbero uguali, e il file pure
    const numeroProg = Number(numero.replace(/\D/g, '') || 0)
    const prog5 = (anno * 10000 + numeroProg).toString(36).toUpperCase().padStart(5, '0').slice(-5)
    return { ok: true, xml: w.righe.join('\n') + '\n', nomeFile: `IT${idTrasmittente}_${prog5}.xml` }
}
