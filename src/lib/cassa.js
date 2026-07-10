// src/lib/cassa.js
//
// Motore di calcolo della cassa / conto economico cliente (pure functions).
// Port del layer cassa fiduciario CH, adattato IT (EUR) e SENZA i salari
// dei dipendenti (modulo dipendenti = Fase 4): le proiezioni girano sui soli
// movimenti finché i dipendenti non saranno disponibili.

export const MESI_ABBR = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

export function fmtEUR(n) {
    return Number(n ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Formato compatto (senza decimali) per chip/label strette
export function fmtEURbreve(n) {
    return Number(n ?? 0).toLocaleString('it-IT', { maximumFractionDigits: 0 })
}

// Espande un movimento previsto in occorrenze {data: Date, importo, tipo}
// all'interno della finestra (daDate, aDate]. una_tantum → al massimo una.
export function espandiPrevisto(m, daDate, aDate) {
    const imp = Number(m.importo) || 0
    if (!imp) return []
    const start = new Date(m.data)
    const occ = []

    const step = m.ricorrenza === 'mensile' ? 1
        : m.ricorrenza === 'trimestrale' ? 3
            : m.ricorrenza === 'annuale' ? 12
                : 0

    if (step === 0) {
        if (start > daDate && start <= aDate) occ.push({ data: start, importo: imp, tipo: m.tipo })
        return occ
    }

    const fine = m.ricorrenza_fine ? new Date(m.ricorrenza_fine) : aDate
    let d = new Date(start)
    let guardia = 0
    while (d <= aDate && d <= fine && guardia < 600) {
        if (d > daDate) occ.push({ data: new Date(d), importo: imp, tipo: m.tipo })
        d = new Date(d.getFullYear(), d.getMonth() + step, d.getDate())
        guardia++
    }
    return occ
}

// Proiezione mensile della liquidità.
//   saldoAncora     : number   - cassa alla dataAncora
//   dataAncora      : Date     - data del saldo noto
//   movimenti       : array    - movimenti (con stato/ricorrenza)
//   mesi            : number    - orizzonte (default 12)
//   salariMensiliFn : (mese, anno) => number  - costo del personale del mese (opzionale).
//                     Il mese in corso (bucket 0) NON include i salari (assunti già pagati / nel saldo).
export function proiezioneLiquidita({ saldoAncora = 0, dataAncora, movimenti = [], mesi = 12, salariMensiliFn = null }) {
    const ancora = dataAncora instanceof Date ? dataAncora : new Date(dataAncora)
    const aDate = new Date(ancora.getFullYear(), ancora.getMonth() + mesi, 0)

    // 1) Occorrenze di cassa (> ancora, entro la finestra)
    const occ = []
    for (const m of movimenti) {
        const imp = Number(m.importo) || 0
        if (!imp) continue
        const previstoRicorrente = (m.stato ?? 'effettivo') === 'previsto' && m.ricorrenza && m.ricorrenza !== 'una_tantum'
        if (previstoRicorrente) {
            for (const o of espandiPrevisto(m, ancora, aDate)) occ.push(o)
        } else {
            const d = new Date(m.data)
            if (d > ancora && d <= aDate) occ.push({ data: d, importo: imp, tipo: m.tipo })
        }
    }

    // 2) Bucket mensili
    const buckets = []
    let saldo = saldoAncora
    for (let i = 0; i < mesi; i++) {
        const moAbs = ancora.getMonth() + i
        const y = ancora.getFullYear() + Math.floor(moAbs / 12)
        const mo = ((moAbs % 12) + 12) % 12
        const mStart = new Date(y, mo, 1)
        const mEnd = new Date(y, mo + 1, 0)
        const inMese = (d) => d >= mStart && d <= mEnd

        const entrate = occ.filter(o => o.tipo === 'entrata' && inMese(o.data)).reduce((t, o) => t + o.importo, 0)
        const uscite = occ.filter(o => o.tipo === 'uscita' && inMese(o.data)).reduce((t, o) => t + o.importo, 0)
        // Mese in corso (i===0): salari esclusi (già pagati / nel saldo). Poi mese pieno.
        const salari = i === 0 || !salariMensiliFn ? 0 : (Number(salariMensiliFn(mo, y)) || 0)
        const netto = entrate - uscite - salari
        saldo += netto
        buckets.push({ anno: y, mese: mo, entrate, uscite, salari, netto, saldoFine: saldo })
    }

    const minBucket = buckets.reduce((min, b) => (b.saldoFine < min.saldoFine ? b : min), buckets[0] ?? null)
    const primaSottoZero = buckets.find(b => b.saldoFine < 0) ?? null

    return {
        buckets,
        saldoIniziale: saldoAncora,
        saldoFinale: buckets.length ? buckets[buckets.length - 1].saldoFine : saldoAncora,
        saldoMin: minBucket ? minBucket.saldoFine : saldoAncora,
        minBucket,
        primaSottoZero,
    }
}

// Categorie predefinite suggerite (oltre a quelle già usate dal cliente).
// Testo libero: sono solo suggerimenti per l'autocompletamento.
export const CATEGORIE_SUGGERITE = {
    entrata: ['Corrispettivi', 'Fatture attive', 'Interessi attivi', 'Rimborsi', 'Altri ricavi'],
    uscita: ['Fornitori', 'Affitto', 'Utenze', 'Stipendi', 'Consulenze', 'Imposte', 'Contributi', 'Banca/commissioni', 'Altri costi'],
}
