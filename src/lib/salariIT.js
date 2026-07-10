// src/lib/salariIT.js
//
// Helper PURI per il costo del personale (dipendenti/soci) del cliente-azienda.
// Adattamento italiano del modulo salari CH: oltre al lordo, calcola il COSTO
// AZIENDALE = lordo + oneri datore (INPS + INAIL) + accantonamento TFR, usando
// le aliquote impostate sul singolo dipendente (secondo CCNL/inquadramento).
//
// Nessuna dipendenza React: la stessa matematica alimenta la tabella dipendenti
// e i contatori del conto economico / liquidità.

// € con 2 decimali
export function fmtEUR(n) {
    return `€ ${Number(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Salario per la lista (lordo con periodicità)
export function fmtSalario(d) {
    if (d.salario === null || d.salario === undefined) return null
    const v = Number(d.salario).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const suffix = d.salario_periodicita === 'mensile' ? '/mese' : '/anno'
    return `€ ${v}${suffix}`
}

// Aliquote di default se non impostate sul dipendente (stima, editabile per dipendente)
const DEFAULT_INPS = 30, DEFAULT_INAIL = 1, DEFAULT_TFR = 6.91
const pct = (v, def) => { const n = Number(v); return isNaN(n) ? def : n }

// Lordo mensile normalizzato. La percentuale di impiego NON entra (il salario è
// già quello concordato). salario null → 0.
export function lordoMensile(d) {
    const s = Number(d.salario) || 0
    if (s === 0) return 0
    return d.salario_periodicita === 'mensile' ? s : s / 12
}

// Oneri datore + TFR mensili (dettaglio) sul lordo mensile del dipendente.
export function oneriMensili(d) {
    const lordo = lordoMensile(d)
    const inps = lordo * pct(d.aliquota_inps_datore, DEFAULT_INPS) / 100
    const inail = lordo * pct(d.aliquota_inail, DEFAULT_INAIL) / 100
    const tfr = lordo * pct(d.aliquota_tfr, DEFAULT_TFR) / 100
    return { inps, inail, tfr, totale: inps + inail + tfr }
}

// Costo aziendale mensile = lordo + oneri datore + TFR accantonato
export function costoAziendaMensile(d) {
    return lordoMensile(d) + oneriMensili(d).totale
}

// Attivo oggi? (nessuna data_fine, o data_fine futura)
export function eAttivoOggi(d) {
    if (!d.data_fine) return true
    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
    return new Date(d.data_fine) >= oggi
}

// Mesi lavorati in un dato anno, a mese intero di calendario.
export function mesiLavoratiAnno(d, anno) {
    const inizioAnno = new Date(anno, 0, 1)
    const fineAnno = new Date(anno, 11, 31)
    const ass = d.data_assunzione ? new Date(d.data_assunzione) : inizioAnno
    const inizio = ass > inizioAnno ? ass : inizioAnno
    const fin = d.data_fine ? new Date(d.data_fine) : fineAnno
    const fine = fin < fineAnno ? fin : fineAnno
    if (fine < inizioAnno || inizio > fineAnno) return 0
    const mesi = (fine.getFullYear() - inizio.getFullYear()) * 12 + (fine.getMonth() - inizio.getMonth()) + 1
    return Math.max(0, mesi)
}

// Attivo in un mese+anno specifico?
export function eAttivoNelMese(d, mese, anno) {
    const fineMese = new Date(anno, mese + 1, 0)
    const inizioMese = new Date(anno, mese, 1)
    if (d.data_assunzione && new Date(d.data_assunzione) > fineMese) return false
    if (d.data_fine && new Date(d.data_fine) < inizioMese) return false
    return true
}

// ─── Bonus ───
export function bonusDelMese(listaBonus, mese, anno) {
    return listaBonus
        .filter(b => { const dt = new Date(b.data_bonus); return dt.getMonth() === mese && dt.getFullYear() === anno })
        .reduce((t, b) => t + (Number(b.importo) || 0), 0)
}
export function bonusDellAnnoX(listaBonus, anno) {
    return listaBonus
        .filter(b => new Date(b.data_bonus).getFullYear() === anno)
        .reduce((t, b) => t + (Number(b.importo) || 0), 0)
}

// ─── Aggregati costo del personale (usati dai contatori conto economico/liquidità) ───
// "Rilevanti": dipendenti O soci.
function rilevanti(dipendenti) {
    return dipendenti.filter(d => d.is_dipendente || d.is_socio)
}

// Costo azienda di chi era attivo in quel mese+anno (NESSUN bonus).
export function costoPersonaleMeseAttivi(dipendenti, mese, anno) {
    return rilevanti(dipendenti)
        .filter(d => eAttivoNelMese(d, mese, anno))
        .reduce((t, d) => t + costoAziendaMensile(d), 0)
}

// Costo azienda pro-rata sui mesi lavorati nell'anno (NESSUN bonus).
export function costoPersonaleProRataAnno(dipendenti, anno) {
    return rilevanti(dipendenti)
        .reduce((t, d) => t + costoAziendaMensile(d) * mesiLavoratiAnno(d, anno), 0)
}
