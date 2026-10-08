// src/lib/documento/datiCompilazione.js
//
// 08-10-2026: i dati con cui si compila un documento scritto da Lex («Compila con i dati di una pratica /
// di un mandato»). Qui solo trasformazioni, senza database: dalle righe lette con l'accesso dell'utente
// ai valori con le chiavi della funzione lex-compila-documento («cliente.nome», «controparte_1.pec»...).
// Alla funzione vanno solo le chiavi e il ruolo delle parti, mai i valori: i valori restano nel browser.

export const MAX_CONTROPARTI = 10
const FUSO = 'Europe/Rome'

const pulito = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
const unisci = (parti, sep = ' ') => parti.map(pulito).filter(Boolean).join(sep)
const giuridica = (r) => r?.tipo_soggetto === 'persona_giuridica'

// '1980-03-12' → '12/03/1980'
const dataBreve = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''))
    return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}
// → '8 ottobre 2026'
const dataLunga = (d) => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: FUSO })
const oraDi = (d) => new Date(d).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: FUSO })

// 'Via Roma 1, 20121 Milano (MI)'
function indirizzo({ via, civico, cap, comune, provincia }) {
    const prov = pulito(provincia)
    return unisci([unisci([via, civico]), unisci([cap, comune, prov ? `(${prov.toUpperCase()})` : ''])], ', ')
}

// Dati di una persona: il cliente (riga di profiles) o una controparte (riga di controparti)
function datiPersona(r, { controparte = false } = {}) {
    if (!r) return {}
    const g = giuridica(r)
    const sede = g ? pulito(r.sede_legale) : ''
    const rappresentante = g ? (unisci([r.rappr_nome, r.rappr_cognome]) || pulito(r.rappresentante_legale)) : ''
    const dati = {
        nome: g ? pulito(r.ragione_sociale) : unisci([r.nome, r.cognome]),
        codice_fiscale: pulito(r.cf).toUpperCase(),
        partita_iva: pulito(r.partita_iva),
        data_nascita: g ? '' : dataBreve(r.data_nascita),
        luogo_nascita: g ? '' : pulito(r.luogo_nascita),
        indirizzo: sede || indirizzo({ via: r.indirizzo, civico: r.numero_civico, cap: r.cap, comune: r.comune, provincia: r.provincia }),
        citta: pulito(r.comune),
        pec: pulito(r.pec),
        email: pulito(r.email),
        telefono: pulito(r.telefono),
        rappresentante,
        rappresentante_carica: rappresentante ? pulito(r.rappr_carica) : '',
        rappresentante_codice_fiscale: rappresentante ? pulito(r.rappr_cf).toUpperCase() : '',
    }
    if (controparte) {
        dati.legale = unisci([r.legale_nome, r.legale_cognome])
        dati.legale_foro = pulito(r.legale_foro)
        dati.legale_pec = pulito(r.legale_pec)
    }
    return dati
}

// Il professionista che firma: il profilo di chi è collegato
function datiProfessionista(p) {
    if (!p) return {}
    const nome = unisci([p.nome, p.cognome])
    return {
        nome,
        titolo_nome: nome ? `${p.role === 'avvocato' ? 'Avv.' : 'Dott.'} ${nome}` : '',
        studio: pulito(p.studio) || pulito(p.ragione_sociale),
        indirizzo: indirizzo({ via: p.indirizzo, civico: p.numero_civico, cap: p.cap, comune: p.comune, provincia: p.provincia }),
        citta: pulito(p.comune),
        codice_fiscale: pulito(p.cf).toUpperCase(),
        partita_iva: pulito(p.partita_iva),
        pec: pulito(p.pec),
        email: pulito(p.email),
        telefono: pulito(p.telefono),
        foro: p.role === 'avvocato' ? pulito(p.foro).replace(/^(?:foro|ordine degli avvocati)\s+di\s+/i, '') : '',
        numero_albo: pulito(p.numero_albo),
    }
}

function aggiungi(valori, prefisso, dati) {
    for (const [k, v] of Object.entries(dati)) if (v) valori[`${prefisso}.${k}`] = v
}

/**
 * Dati di una pratica dell'avvocato.
 * @returns {{ valori: Record<string,string>, parti: object, tipo: string, udienza: 'prossima'|'ultima'|null }}
 */
export function datiDaPratica({ pratica, cliente, controparti = [], udienze = [], profilo, adesso = new Date() }) {
    const valori = {}
    aggiungi(valori, 'professionista', datiProfessionista(profilo))
    aggiungi(valori, 'cliente', datiPersona(cliente))
    const parti = { cliente: { tipo: cliente?.tipo_soggetto ?? null }, controparti: [] }
    controparti.slice(0, MAX_CONTROPARTI).forEach((c, i) => {
        aggiungi(valori, `controparte_${i + 1}`, datiPersona(c, { controparte: true }))
        parti.controparti.push({ n: i + 1, ruolo: pulito(c.ruolo), tipo: c.tipo_soggetto ?? null })
    })
    // La prossima udienza in programma; se non c'è, l'ultima già tenuta
    const tempo = (u) => new Date(u.data_ora).getTime()
    const conData = udienze.filter((u) => u.data_ora)
    const prossima = conData.filter((u) => u.stato === 'programmata' && tempo(u) >= adesso.getTime()).sort((a, b) => tempo(a) - tempo(b))[0]
    const ultima = conData.filter((u) => tempo(u) < adesso.getTime()).sort((a, b) => tempo(b) - tempo(a))[0]
    const u = prossima ?? ultima
    if (u) {
        aggiungi(valori, 'udienza', {
            data: dataLunga(u.data_ora), ora: oraDi(u.data_ora), ufficio: pulito(u.tribunale), sezione: pulito(u.sezione), giudice: pulito(u.giudice),
        })
    }
    valori.oggi = dataLunga(adesso)
    return { valori, parti, tipo: pulito(pratica?.tipo), udienza: u ? (prossima ? 'prossima' : 'ultima') : null }
}

/** Dati di un mandato del commercialista. */
export function datiDaMandato({ mandato, cliente, profilo, adesso = new Date() }) {
    const valori = {}
    aggiungi(valori, 'professionista', datiProfessionista(profilo))
    aggiungi(valori, 'cliente', { ...datiPersona(cliente), regime_contabile: pulito(cliente?.regime_contabile) })
    if (mandato?.anno_riferimento) valori['mandato.anno'] = String(mandato.anno_riferimento)
    valori.oggi = dataLunga(adesso)
    return { valori, parti: { cliente: { tipo: cliente?.tipo_soggetto ?? null } }, tipo: pulito(mandato?.tipo), udienza: null }
}

// «{controparte_1.nome}, C.F. {controparte_1.codice_fiscale}» → testo; null se manca un dato
export function compilaModello(modello, valori) {
    let manca = false
    const testo = String(modello ?? '').replace(/\{([a-z]+(?:_\d{1,2})?(?:\.[a-z_]+)?)\}/g, (_, chiave) => {
        const v = valori[chiave]
        if (!v) manca = true
        return v ?? ''
    })
    return manca ? null : testo.replace(/\s+/g, ' ').trim() || null
}

/**
 * Dalla risposta della funzione ai valori dei segnaposto.
 * @returns {{ valori: Record<number,string>, gruppi: Array<{ segnaposto: string, valore: string, numeri: number[] }> }}
 */
export function applicaAbbinamenti(abbinamenti, valoriDati, segnaposti) {
    const testoDi = new Map(segnaposti.map((s) => [s.n, s.segnaposto]))
    const valori = {}
    const gruppi = []
    for (const a of abbinamenti ?? []) {
        const valore = compilaModello(a.modello, valoriDati)
        const numeri = (a.numeri ?? []).filter((n) => testoDi.has(n) && valori[n] == null)
        if (!valore || !numeri.length) continue
        numeri.forEach((n) => { valori[n] = valore })
        // Un gruppo per segnaposto e valore: lo stesso dato inserito in più punti si vede una volta
        for (const n of numeri) {
            const segnaposto = testoDi.get(n)
            const gruppo = gruppi.find((g) => g.segnaposto === segnaposto && g.valore === valore)
            if (gruppo) gruppo.numeri.push(n)
            else gruppi.push({ segnaposto, valore, numeri: [n] })
        }
    }
    return { valori, gruppi }
}
