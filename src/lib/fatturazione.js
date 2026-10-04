// src/lib/fatturazione.js
//
// Regole della fatturazione condivise tra le pagine (04-10-2026).
// I conti che valgono li fa il DB (ricalcola_totali_fattura) e le regole
// fiscali le applica crea-fattura: qui c'e' la stessa formula, per l'anteprima,
// piu' le etichette.

export const SOGLIA_BOLLO = 77.47

export const REGIMI = [
    { codice: 'RF01', etichetta: 'Ordinario (RF01)' },
    { codice: 'RF19', etichetta: 'Forfettario (RF19)' },
]

export const CASSE = [
    { codice: 'cassa_forense', etichetta: 'Cassa Forense (C.P.A. 4%)' },
    { codice: 'cnpadc', etichetta: 'CNPADC, dottori commercialisti (4%)' },
    { codice: 'cnpr', etichetta: 'CNPR, ragionieri (4%)' },
    { codice: 'nessuna', etichetta: 'Nessuna cassa' },
]

// Natura IVA per una fattura con IVA 0 in regime ordinario
export const NATURE_FATTURA = [
    { codice: 'N2.1', etichetta: 'N2.1 – Non soggetta (artt. 7-7septies, es. cliente estero)' },
    { codice: 'N2.2', etichetta: 'N2.2 – Non soggetta, altri casi' },
    { codice: 'N3.1', etichetta: 'N3.1 – Non imponibile, esportazioni' },
    { codice: 'N3.2', etichetta: 'N3.2 – Non imponibile, cessioni intracomunitarie' },
    { codice: 'N4', etichetta: 'N4 – Esente (art. 10 DPR 633/72)' },
    { codice: 'N6.9', etichetta: 'N6.9 – Inversione contabile, altri casi' },
    { codice: 'N7', etichetta: 'N7 – IVA assolta in altro Stato UE' },
]

// Natura usata per le righe di spese anticipate in nome e per conto del cliente
export const NATURA_SPESE_ESENTI = 'N1'

export function cassaPredefinita(role) {
    return role === 'commercialista' ? 'cnpadc' : 'cassa_forense'
}

// Etichetta della riga di cassa in fattura (null = nessuna cassa)
export function etichettaCassa(codice, role) {
    const c = codice ?? cassaPredefinita(role)
    if (c === 'nessuna') return null
    if (c === 'cnpadc') return 'Contributo integrativo CNPADC'
    if (c === 'cnpr') return 'Contributo integrativo CNPR'
    return 'Contributo integrativo C.P.A.'
}

export function etichettaNatura(codice) {
    if (!codice) return ''
    if (codice === 'N1') return 'Escluse ex art. 15'
    const n = NATURE_FATTURA.find(x => x.codice === codice)
    return n ? n.etichetta.replace(/^N[0-9.]+ – /, '') : codice
}

function arrotonda(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100
}

// Stessa formula di ricalcola_totali_fattura (DB):
//   cassa    = imponibile * cassa%
//   iva      = (imponibile + cassa) * iva%
//   ritenuta = imponibile * ritenuta%            (se applicata)
//   lordo    = imponibile + cassa + iva + spese esenti + bollo (se a carico del cliente)
//   netto    = lordo - ritenuta                  (quello che paga il cliente)
// Le righe con natura (spese esenti) restano fuori da cassa, IVA e ritenuta.
export function calcolaTotali({ righe, ivaPct, cpaPct, applicaRitenuta, ritenutaPct, bollo = false, bolloACaricoCliente = true }) {
    let imponibile = 0
    let esenti = 0
    for (const r of righe) {
        const t = (parseFloat(r.quantita) || 0) * (parseFloat(r.prezzo_unitario) || 0)
        if (r.natura_iva) esenti += t
        else imponibile += t
    }
    imponibile = arrotonda(imponibile)
    esenti = arrotonda(esenti)
    const cpa = arrotonda(imponibile * (Number(cpaPct) || 0) / 100)
    const iva = arrotonda((imponibile + cpa) * (Number(ivaPct) || 0) / 100)
    const ritenuta = applicaRitenuta ? arrotonda(imponibile * (Number(ritenutaPct) || 0) / 100) : 0
    const bolloInTotale = bollo && bolloACaricoCliente ? 2 : 0
    const lordo = arrotonda(imponibile + cpa + iva + esenti + bolloInTotale)
    const netto = arrotonda(lordo - ritenuta)
    return { imponibile, esenti, cpa, iva, ritenuta, bollo: bolloInTotale, lordo, netto }
}

// Imposta di bollo: dovuta quando la parte senza IVA supera 77,47 euro
export function bolloDovuto(totali, ivaPct) {
    const senzaIva = totali.esenti + (Number(ivaPct) === 0 ? totali.imponibile + totali.cpa : 0)
    return senzaIva > SOGLIA_BOLLO
}

// Quanto deve ancora pagare il cliente: netto meno note di credito e pagamenti
export function importoDovuto(fattura, totaleNoteCredito = 0) {
    const netto = Number(fattura?.totale_netto ?? fattura?.totale_lordo ?? fattura?.importo ?? 0)
    return arrotonda(netto - Number(totaleNoteCredito || 0))
}

export function ibanValido(iban) {
    const s = String(iban ?? '').replace(/\s+/g, '').toUpperCase()
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(s)) return false
    const riordinato = s.slice(4) + s.slice(0, 4)
    let resto = 0
    for (const ch of riordinato) {
        const cifre = ch >= 'A' ? String(ch.charCodeAt(0) - 55) : ch
        for (const d of cifre) resto = (resto * 10 + Number(d)) % 97
    }
    return resto === 1
}

// supabase.functions.invoke: con una risposta non 2xx l'errore ha un messaggio
// generico, il testo vero sta nel corpo della risposta.
export async function messaggioErroreFunzione(error, data, predefinito = 'Operazione non riuscita') {
    if (data?.error) return data.error
    try {
        const corpo = await error?.context?.json?.()
        if (corpo?.error) return corpo.error
    } catch { /* corpo non JSON */ }
    return error?.message ?? predefinito
}
