// src/lib/scadenzarioFiscale.js
//
// Scadenzario fiscale italiano precaricato (miglioria IT rispetto a CH).
// Genera le scadenze standard di un anno fiscale in base al regime contabile
// del cliente. Le scadenze restano modificabili/eliminabili a mano dopo la
// generazione: questo è solo il "prospetto di partenza" del mandato.
//
// Regimi (profiles.regime_contabile):
//   ordinario | semplificato → IVA trimestrale + LIPE + dichiarazione IVA
//   forfettario              → niente IVA/LIPE (solo dichiarativi e acconti)
//   null/sconosciuto         → trattato come ordinario (set completo, si cancella)
//
// Regola weekend: se la scadenza cade di sabato/domenica slitta al primo
// giorno lavorativo successivo (regola generale art. 7 DL 70/2011).

function slittaGiornoLavorativo(d) {
    const g = d.getDay()
    if (g === 6) d.setDate(d.getDate() + 2)      // sabato → lunedì
    else if (g === 0) d.setDate(d.getDate() + 1) // domenica → lunedì
    return d
}

function iso(anno, mese, giorno) {
    const d = slittaGiornoLavorativo(new Date(anno, mese - 1, giorno))
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
}

/**
 * Genera l'elenco delle scadenze fiscali standard per un anno.
 * @param {number} anno    - anno di riferimento del mandato (es. 2026)
 * @param {string} regime  - 'ordinario' | 'semplificato' | 'forfettario' | null
 * @returns {Array<{titolo: string, tipo: string, data_scadenza: string, note: string|null}>}
 */
export function generaScadenzeFiscali(anno, regime) {
    const forfettario = regime === 'forfettario'
    const out = []

    // ── IVA: liquidazioni trimestrali + LIPE (non per forfettari) ──
    if (!forfettario) {
        out.push(
            { titolo: `Liquidazione IVA 1° trimestre ${anno}`, tipo: 'iva', data_scadenza: iso(anno, 5, 16), note: 'Versamento F24 — codice tributo 6031' },
            { titolo: `Liquidazione IVA 2° trimestre ${anno}`, tipo: 'iva', data_scadenza: iso(anno, 8, 20), note: 'Versamento F24 — codice tributo 6032' },
            { titolo: `Liquidazione IVA 3° trimestre ${anno}`, tipo: 'iva', data_scadenza: iso(anno, 11, 16), note: 'Versamento F24 — codice tributo 6033' },
            { titolo: `Acconto IVA ${anno}`, tipo: 'iva', data_scadenza: iso(anno, 12, 27), note: 'Metodo storico/previsionale/analitico — codice tributo 6013/6035' },
            { titolo: `Liquidazione IVA 4° trimestre ${anno}`, tipo: 'iva', data_scadenza: iso(anno + 1, 3, 16), note: 'Versamento F24 — codice tributo 6034' },

            { titolo: `LIPE 1° trimestre ${anno}`, tipo: 'lipe', data_scadenza: iso(anno, 5, 31), note: 'Comunicazione liquidazioni periodiche IVA' },
            { titolo: `LIPE 2° trimestre ${anno}`, tipo: 'lipe', data_scadenza: iso(anno, 9, 30), note: 'Comunicazione liquidazioni periodiche IVA' },
            { titolo: `LIPE 3° trimestre ${anno}`, tipo: 'lipe', data_scadenza: iso(anno, 11, 30), note: 'Comunicazione liquidazioni periodiche IVA' },
            { titolo: `LIPE 4° trimestre ${anno}`, tipo: 'lipe', data_scadenza: iso(anno + 1, 2, 28), note: 'Oppure con dichiarazione IVA annuale entro fine febbraio' },

            { titolo: `Dichiarazione IVA ${anno}`, tipo: 'dichiarativo', data_scadenza: iso(anno + 1, 4, 30), note: 'Trasmissione telematica dichiarazione IVA annuale' },
        )
    }

    // ── Imposte dirette: saldo + acconti (tutti i regimi) ──
    out.push(
        { titolo: `Saldo ${anno - 1} e 1° acconto imposte ${anno}`, tipo: 'acconto', data_scadenza: iso(anno, 6, 30), note: 'IRPEF/IRES/IRAP e sostitutiva forfettari — F24 (o 30/7 con maggiorazione 0,4%)' },
        { titolo: `2° acconto imposte ${anno}`, tipo: 'acconto', data_scadenza: iso(anno, 11, 30), note: 'IRPEF/IRES/IRAP e sostitutiva forfettari — F24' },
        { titolo: `Dichiarazione redditi ${anno - 1} (Modello Redditi)`, tipo: 'dichiarativo', data_scadenza: iso(anno, 10, 31), note: 'Trasmissione telematica' },
    )

    // ── IMU (se il cliente possiede immobili: eliminare se non pertinente) ──
    out.push(
        { titolo: `IMU ${anno} — acconto`, tipo: 'imu', data_scadenza: iso(anno, 6, 16), note: 'Se il cliente possiede immobili — eliminare se non pertinente' },
        { titolo: `IMU ${anno} — saldo`, tipo: 'imu', data_scadenza: iso(anno, 12, 16), note: 'Se il cliente possiede immobili — eliminare se non pertinente' },
    )

    return out.sort((a, b) => a.data_scadenza.localeCompare(b.data_scadenza))
}

// Etichette dei tipi di scadenza (per badge/filtri UI)
export const TIPI_SCADENZA = {
    iva: { label: 'IVA', cls: 'bg-oro/10 border-oro/30 text-oro' },
    lipe: { label: 'LIPE', cls: 'bg-salvia/10 border-salvia/30 text-salvia' },
    dichiarativo: { label: 'Dichiarativo', cls: 'bg-blue-400/10 border-blue-400/30 text-blue-300' },
    acconto: { label: 'Acconti', cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
    imu: { label: 'IMU', cls: 'bg-white/5 border-white/15 text-nebbia/50' },
    altro: { label: 'Altro', cls: 'bg-white/5 border-white/15 text-nebbia/40' },
}
