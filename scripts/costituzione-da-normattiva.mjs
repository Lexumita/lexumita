// scripts/costituzione-da-normattiva.mjs
//
// 08-11-2026: il testo della Costituzione per le pagine /costituzione. Parte dall'export VIGENTE di Normattiva
// (formato JSON, quello di ~/LEXUM norme/normattiva_export.py --tipo costituzione --numero 0 --anno 0) e scrive
// src/lib/costituzione/testo.js. Il testo sta nel sito come file: nessuna lettura dal database e nessun
// permesso agli anonimi sulla Banca Dati.
//
// Si rilancia solo quando la Costituzione cambia (l'ultima volta il 22-10-2023):
//   node scripts/costituzione-da-normattiva.mjs <export.json>
//
// Normattiva scrive gli accenti come apostrofi («liberta'», «e'»): qui tornano lettere accentate. Le parti
// cambiate da una legge successiva restano tra (( )), come le segna Normattiva: la pagina le evidenzia.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sorgente = process.argv[2]
if (!sorgente) {
    console.error('Uso: node scripts/costituzione-da-normattiva.mjs <export Normattiva .json>')
    process.exit(1)
}

// Il JSON di Normattiva a volte arriva in base64 (dal 24-10-2026)
function leggiExport(file) {
    const grezzo = readFileSync(file, 'utf8').trim()
    return JSON.parse(grezzo.startsWith('{') ? grezzo : Buffer.from(grezzo, 'base64').toString('utf8'))
}

const atto = leggiExport(sorgente)

// I nomi delle parti come li scrive la Costituzione (Normattiva li dà in maiuscolo)
const NOMI = {
    'PRINCIPI FONDAMENTALI': 'Principi fondamentali',
    'PARTE I': 'Parte I',
    'DIRITTI E DOVERI DEI CITTADINI': 'Diritti e doveri dei cittadini',
    'PARTE II': 'Parte II',
    'ORDINAMENTO DELLA REPUBBLICA': 'Ordinamento della Repubblica',
    'RAPPORTI CIVILI': 'Rapporti civili',
    'RAPPORTI ETICO-SOCIALI': 'Rapporti etico-sociali',
    'RAPPORTI ECONOMICI': 'Rapporti economici',
    'RAPPORTI POLITICI': 'Rapporti politici',
    'IL PARLAMENTO': 'Il Parlamento',
    'IL PRESIDENTE DELLA REPUBBLICA': 'Il Presidente della Repubblica',
    'IL GOVERNO': 'Il Governo',
    'LA MAGISTRATURA': 'La Magistratura',
    'LE REGIONI, LE PROVINCIE, I COMUNI': 'Le Regioni, le Provincie, i Comuni',
    'GARANZIE COSTITUZIONALI': 'Garanzie costituzionali',
    'DISPOSIZIONI TRANSITORIE E FINALI': 'Disposizioni transitorie e finali',
}

// «PARTE I*DIRITTI E DOVERI*TITOLO I*RAPPORTI CIVILI*» → i livelli che cambiano in questo gruppo
function livelliDi(numNir) {
    const pezzi = numNir.split('*').map(s => s.trim().replace(/\.$/, '')).filter(s => s && s !== '-' && !s.startsWith('COSTITUZIONE DELLA'))
    const livelli = {}
    for (let i = 0; i < pezzi.length; i++) {
        const p = pezzi[i]
        const dopo = pezzi[i + 1]
        const nome = (s) => NOMI[s] ?? s
        if (/^PARTE /.test(p)) { livelli.parte = { numero: nome(p), nome: nome(dopo) }; i++ }
        else if (/^TITOLO /.test(p)) { livelli.titolo = { numero: p.replace('TITOLO', 'Titolo'), nome: nome(dopo) }; i++ }
        else if (/^SEZIONE /.test(p)) { livelli.sezione = { numero: p.replace('SEZIONE', 'Sezione'), nome: dopo }; i++ }
        else livelli.parte = { numero: null, nome: nome(p) }
    }
    return livelli
}

// Gli accenti: vocale + apostrofo in fondo alla parola. «e'» è «è», tranne nelle parole che vogliono «é».
const ACUTE = /^(perch|poich|affinch|bench|finch|giacch|sicch|nonch|purch|anzich|cosicch|s|n|ventitr|trentatr)e'$/i
const VOCALI = { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù', A: 'À', E: 'È', I: 'Ì', O: 'Ò', U: 'Ù' }
function accenti(testo) {
    return testo.replace(/([A-Za-zÀ-ÿ]*)([aeiouAEIOU])'(?=[\s.,;:)\]!?»"]|$)/g, (tutto, prima, vocale) => {
        if ((vocale === 'e' || vocale === 'E') && ACUTE.test(tutto)) return prima + (vocale === 'e' ? 'é' : 'É')
        return prima + VOCALI[vocale]
    })
}

// Le righe di un articolo: i commi e, dopo la riga di trattini, le note «AGGIORNAMENTO» di Normattiva
function righe(testo, tipo) {
    const pulito = testo
        .replace(/\(\(\s*\d+\s*\)\)/g, '')            // ((19)): il rimando alla nota, la nota è sotto
        .replace(/[ \t]\(\d+\)[ \t]*$/gm, '')          // (3) in fondo alla riga: lo stesso rimando
        .replace(/\.[ \t]+\./g, '.')                    // «uno. ((20)).» diventava «uno. .»
        .replace(/\(\(\s*(\.\s*){2,}\)\)/g, '((…))')   // (( . . . )): parole tolte da una legge successiva
    let linee = pulito.split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean)
    // l'intestazione «Art. 13.» o il numero romano; all'art. 1 la precede la formula di promulgazione
    const intestazione = linee.findIndex(l => tipo === 'articolo' ? /^Art\. \d+[a-z-]*\.?$/i.test(l) : /^[IVXL]+$/.test(l))
    if (intestazione >= 0 && intestazione < 8) linee = linee.slice(intestazione + 1)
    const trattini = linee.findIndex(l => /^-{5,}$/.test(l))
    // ogni nota è un paragrafo; più note sono separate da altri trattini
    const note = []
    if (trattini >= 0) {
        let nota = []
        for (const l of [...linee.slice(trattini + 1), '-----']) {
            if (/^-{5,}$/.test(l)) { if (nota.length) note.push(accenti(nota.join(' '))); nota = [] }
            else if (!/^AGGIORNAMENTO( \(\d+\))?$/.test(l)) nota.push(l)
        }
    }
    if (trattini >= 0) linee = linee.slice(0, trattini)
    // righe spezzate a metà frase dall'impaginazione di Normattiva: si riattaccano
    const unite = []
    for (const l of linee) {
        const prima = unite.at(-1)
        const inizio = l.replace(/^\(\(\s*/, '')
        if (prima && !/[.;:]\s*(\)\))?$/.test(prima) && /^[a-zà-ù…]/.test(inizio)) unite[unite.length - 1] = `${prima} ${l}`
        else unite.push(l)
    }
    // (( )) chiuse e riaperte a ogni riga, così ogni comma si disegna da solo
    let dentro = false
    const commi = unite.map(l => {
        let r = (dentro ? '((' : '') + l
        for (const m of l.matchAll(/\(\(|\)\)/g)) dentro = m[0] === '(('
        if (dentro) r += '))'
        return accenti(r).replace(/\(\(\s*\)\)/g, '').trim()
    }).filter(Boolean)
    return { commi, note }
}

// Disposizione XVIII: data e firme non sono commi. Normattiva le impagina su due colonne e le mescola: qui sono
// come nella Gazzetta Ufficiale.
function firmeXVIII(commi) {
    const data = commi.findIndex(c => c.startsWith('Data a Roma'))
    if (data < 0) return { commi, firme: [] }
    let firme = commi.slice(data)
    const i = firme.findIndex(c => c.startsWith('Il Presidente del Consiglio dei Ministri'))
    if (i >= 0 && /DE GASPERI/.test(firme[i + 1] ?? '')) {
        firme = [...firme.slice(0, i), 'Il Presidente del Consiglio dei Ministri', 'ALCIDE DE GASPERI', 'Visto: il Guardasigilli', 'GRASSI', ...firme.slice(i + 2)]
    }
    return { commi: commi.slice(0, data), firme }
}

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
const dataLunga = (iso) => {
    const [a, m, g] = iso.split('-').map(Number)
    return `${g === 1 ? '1°' : g} ${MESI[m - 1]} ${a}`
}

// Le leggi che hanno cambiato la Costituzione, ritrovate dalla data della Gazzetta Ufficiale
const versioni = new Map()
for (const s of atto.metadati.storia.elementi) {
    const chiave = s.dataPubblicazione
    if (s.tipodoc === 'LEGGE COSTITUZIONALE') {
        versioni.set(chiave, {
            nome: `Legge costituzionale ${dataLunga(s.datadoc)}, n. ${s.numdoc}`,
            normattiva: `https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge.costituzionale:${s.datadoc};${s.numdoc}`,
        })
    } else if (s.tipodoc === 'ERRATA-CORRIGE') {
        versioni.set(chiave, { nome: `Errata corrige (Gazzetta Ufficiale del ${dataLunga(chiave)})`, normattiva: null })
    }
}
const daGazzetta = (gg) => { const [g, m, a] = gg.split('/'); return `${a}-${m}-${g}` }

const NORMATTIVA = 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:costituzione:1947-12-27'

const articoli = []
const problemi = []
// Normattiva dà a ogni gruppo solo i livelli che cambiano: una parte nuova azzera titolo e sezione, un titolo
// nuovo azzera la sezione
function avanza(corrente, nuovi) {
    if (nuovi.parte) return { parte: nuovi.parte, titolo: nuovi.titolo ?? null, sezione: nuovi.sezione ?? null }
    if (nuovi.titolo) return { ...corrente, titolo: nuovi.titolo, sezione: nuovi.sezione ?? null }
    if (nuovi.sezione) return { ...corrente, sezione: nuovi.sezione }
    return corrente
}

function visita(elementi, contesto, tipo) {
    let corrente = contesto
    for (const e of elementi) {
        if (e.testo == null) {
            corrente = avanza(corrente, livelliDi(e.numNir ?? ''))
            visita(e.elementi ?? [], corrente, tipo)
            continue
        }
        const numero = e.numNir.replace(/^Allegato-/, '')
        let { commi, note } = righe(e.testo, tipo)
        let firme = []
        if (numero === 'XVIII') ({ commi, firme } = firmeXVIII(commi))
        const abrogato = commi.length === 1 && /ABROGATO/.test(commi[0])
        const modifiche = (e.articoliAggiornanti ?? []).map(a => {
            const legge = versioni.get(daGazzetta(a.dataPubblicazioneGazzetta))
            if (!legge) problemi.push(`${numero}: legge del ${a.dataPubblicazioneGazzetta} non trovata`)
            return { ...(legge ?? { nome: `Atto pubblicato il ${a.dataPubblicazioneGazzetta}`, normattiva: null }), cosa: accenti((a.testo ?? '').replace(/\s+/g, ' ').trim()) }
        })
        // righe che non finiscono come un comma: da guardare a mano
        commi.forEach((c, i) => {
            if (!/[.;:]\s*(\)\))?$/.test(c) && !abrogato) problemi.push(`${numero}: riga ${i + 1} non finisce con un punto: …${c.slice(-50)}`)
        })
        articoli.push({
            tipo,
            numero,
            slug: tipo === 'articolo' ? `articolo-${numero}` : `disposizione-transitoria-${numero.toLowerCase()}`,
            etichetta: tipo === 'articolo' ? `Art. ${numero}` : `Disposizione ${numero}`,
            parte: contesto.parte ?? null,
            titolo: contesto.titolo ?? null,
            sezione: contesto.sezione ?? null,
            commi,
            note,
            ...(firme.length ? { firme } : {}),
            abrogato,
            inVigoreDal: (e.dataVigoreVersione?.[0]?.inizioVigore) ?? null,
            modifiche,
            normattiva: tipo === 'articolo' ? `${NORMATTIVA}~art${numero}` : NORMATTIVA,
        })
    }
}
visita(atto.articolato.elementi, {}, 'articolo')
visita(atto.annessi.elementi, { parte: { numero: null, nome: 'Disposizioni transitorie e finali' } }, 'disposizione')

const consolidata = atto.metadati.eli.match(/CONSOLIDATED\/(\d{4})(\d{2})(\d{2})/)
const uscita = {
    fonte: 'Normattiva',
    aggiornataAl: consolidata ? `${consolidata[1]}-${consolidata[2]}-${consolidata[3]}` : null,
    controllataIl: new Date().toISOString().slice(0, 10),
    articoli,
}
// Un modulo JS e non un .json: così lo leggono sia il sito (Vite) sia scripts/generate-seo-pages.mjs (Node)
const destinazione = resolve(process.cwd(), 'src/lib/costituzione/testo.js')
writeFileSync(destinazione, `// File scritto da scripts/costituzione-da-normattiva.mjs: non modificarlo a mano.\nexport default ${JSON.stringify(uscita, null, 1)}\n`)
console.log(`[costituzione] ${articoli.length} voci (${articoli.filter(a => a.abrogato).length} abrogate), aggiornata al ${uscita.aggiornataAl} → ${destinazione}`)
for (const p of problemi) console.warn(`[costituzione] DA GUARDARE ${p}`)
