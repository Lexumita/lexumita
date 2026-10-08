// src/lib/fileSpazio.js
//
// 08-10-2026: i file dello spazio file (archivio, documenti delle pratiche e del portale, PDF delle
// fatture, sentenze e prassi, allegati del calendario, documenti di verifica) si aprono dal browser con
// l'accesso di chi è entrato. Prima si apriva un collegamento temporaneo (un'ora): nella barra degli
// indirizzi compariva l'indirizzo del server e il collegamento si poteva copiare e girare a chiunque.
// Ora il file si scarica con la sessione dell'utente (valgono le stesse regole dello spazio file) e si
// mostra da un indirizzo locale del browser (blob:), che fuori da questa pagina non apre niente.
// Stesso principio dell'app (src/telefono/apriFile.ts, apriNelBrowser).
//
// Un file si descrive con { bucket, percorso, nome }: `nome` è quello che vede l'utente (se manca vale
// l'ultimo pezzo del percorso) e serve quando il file si salva.
//
// All'indirizzo del sito si mostrano solo PDF, immagini, testo, audio e video: ogni altro file (pagine
// web, SVG, XML, Word, Excel...) si salva e basta, così un file caricato da altri non può girare come
// pagina del sito.

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Dopo quanto si libera la memoria di un file aperto in una scheda o salvato (la scheda l'ha già letto)
const DURATA_INDIRIZZO = 60 * 1000

const TIPI = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    avif: 'image/avif',
    heic: 'image/heic',
    heif: 'image/heif',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    txt: 'text/plain',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
}

// Tipi che non dicono niente (file caricati senza tipo): conta l'estensione
const GENERICI = ['', 'application/octet-stream', 'binary/octet-stream', 'text/plain']

// Tipi che si possono mostrare all'indirizzo del sito senza che eseguano niente
const SICURI = /^(application\/pdf|image\/(png|jpeg|gif|webp|bmp|avif|heic|heif|tiff)|text\/plain|audio\/[\w.+-]+|video\/[\w.+-]+)$/

// Tipi che ogni browser mostra da solo in una scheda (HEIC e TIFF li mostra solo Safari: si salvano)
const MOSTRABILI = /^(application\/pdf|image\/(png|jpeg|gif|webp|bmp|avif)|text\/plain|audio\/(mpeg|mp4|wav|ogg|webm|aac)|video\/(mp4|webm|ogg|quicktime))$/

const tipoBase = (tipo) => String(tipo ?? '').split(';')[0].trim().toLowerCase()
const estensione = (s) => /\.([a-z0-9]{1,8})$/i.exec(String(s ?? '').trim())?.[1]?.toLowerCase() ?? ''

// Il tipo del file: quello salvato con il file; se non dice niente, quello dell'estensione
function tipoDel(blob, f) {
    const delFile = blob.type || ''
    if (!GENERICI.includes(tipoBase(delFile))) return delFile
    const daEstensione = TIPI[estensione(f.percorso) || estensione(f.nome)]
    if (daEstensione && daEstensione !== tipoBase(delFile)) return daEstensione
    return delFile || 'application/octet-stream'
}

function mostrabileNelBrowser(tipo) {
    const t = tipoBase(tipo)
    // senza visore PDF (Chrome su Android) il PDF si salva
    if (t === 'application/pdf') return typeof navigator === 'undefined' || navigator.pdfViewerEnabled !== false
    return MOSTRABILI.test(t)
}

// Il nome con cui si salva: quello del documento (se manca, l'ultimo pezzo del percorso), senza i
// caratteri che i file non accettano, con la sua estensione.
function nomeFile(f) {
    const pezzo = String(f.percorso ?? '').split('/').pop()
    const nome = String(f.nome || pezzo || '')
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 150) || 'documento'
    const est = estensione(f.percorso)
    const estNome = estensione(nome)
    if (!est || estNome === est || (TIPI[est] && TIPI[estNome] === TIPI[est])) return nome
    return `${nome}.${est}`
}

// Scarica il file con l'accesso di chi è entrato e lo prepara: il tipo giusto e, se non è un tipo
// sicuro, un tipo neutro che il browser non apre (lo salva soltanto).
async function prepara(f) {
    const { data, error } = await supabase.storage.from(f.bucket).download(f.percorso)
    if (error || !data) throw error ?? new Error('File non disponibile')
    const tipo = tipoDel(data, f)
    const sicuro = SICURI.test(tipoBase(tipo))
    return {
        blob: new Blob([data], { type: sicuro ? tipo : 'application/octet-stream' }),
        nome: nomeFile(f),
        mostrabile: sicuro && mostrabileNelBrowser(tipo),
    }
}

// Il file come Blob, per chi lo tiene da parte (per esempio nella cache di react-query) e lo mostra
// con useIndirizzoDi.
export async function scaricaFile(f) {
    return (await prepara(f)).blob
}

function salvaConNome(indirizzo, nome) {
    const a = document.createElement('a')
    a.href = indirizzo
    a.download = nome
    document.body.appendChild(a)
    a.click()
    a.remove()
}

// Apre il file in una scheda nuova. La scheda si apre SUBITO, dentro il clic e prima di scaricare:
// dopo un'attesa il browser la bloccherebbe. Va quindi chiamata nel clic prima di qualunque await.
// Se il browser blocca la scheda lo stesso, se la scheda viene chiusa prima che il file arrivi o se il
// browser non sa mostrare quel tipo di file, il file si salva con il suo nome.
// Se il file non si scarica, la scheda vuota si chiude e l'errore torna a chi ha chiesto, che lo dice
// come prima.
// `file` può essere anche una funzione (asincrona) che lo trova, per esempio leggendo il percorso dal
// database: si chiama con la scheda già aperta; se non trova niente (null) la scheda si chiude e basta.
export async function apriFile(file) {
    const scheda = window.open('', '_blank')
    try {
        const f = typeof file === 'function' ? await file() : file
        if (!f?.percorso) {
            scheda?.close()
            return
        }
        const pronto = await prepara(f)
        const indirizzo = URL.createObjectURL(pronto.blob)
        setTimeout(() => URL.revokeObjectURL(indirizzo), DURATA_INDIRIZZO)
        if (scheda && !scheda.closed && pronto.mostrabile) {
            scheda.location.href = indirizzo
            return
        }
        scheda?.close()
        salvaConNome(indirizzo, pronto.nome)
    } catch (e) {
        scheda?.close()
        throw e
    }
}

// Anteprime nella pagina (<iframe>, <img>): il file scaricato vive a un indirizzo locale finché serve.
// Quando l'anteprima cambia, si svuota o la pagina si chiude, l'indirizzo si revoca e il file esce
// dalla memoria. Se si chiedono due anteprime una dopo l'altra vale l'ultima.
//   anteprima: { url, nome, mostrabile, blob } oppure null
//   caricando: true mentre il file arriva
//   carica(file): scarica e mostra (ritorna l'anteprima; se il file non si scarica, lancia l'errore)
//   svuota(): toglie l'anteprima
export function useAnteprimaFile() {
    const [anteprima, setAnteprima] = useState(null)
    const [caricando, setCaricando] = useState(false)
    const turno = useRef(0)
    const vivo = useRef(false)

    useEffect(() => {
        vivo.current = true
        return () => {
            vivo.current = false
            turno.current++
        }
    }, [])

    useEffect(() => () => {
        if (anteprima) URL.revokeObjectURL(anteprima.url)
    }, [anteprima])

    const carica = useCallback(async (f) => {
        const mio = ++turno.current
        setCaricando(true)
        try {
            const pronto = await prepara(f)
            if (!vivo.current || mio !== turno.current) return null
            const nuova = { ...pronto, url: URL.createObjectURL(pronto.blob) }
            setAnteprima(nuova)
            return nuova
        } catch (e) {
            if (vivo.current && mio === turno.current) setAnteprima(null)
            throw e
        } finally {
            if (vivo.current && mio === turno.current) setCaricando(false)
        }
    }, [])

    const svuota = useCallback(() => {
        turno.current++
        setAnteprima(null)
        setCaricando(false)
    }, [])

    return { anteprima, caricando, carica, svuota }
}

// Un file già scaricato (scaricaFile) mostrato nella pagina: ogni componente ha il suo indirizzo
// locale, revocato quando il componente si chiude o il file cambia.
export function useIndirizzoDi(blob) {
    const [indirizzo, setIndirizzo] = useState(null)
    useEffect(() => {
        if (!blob) {
            setIndirizzo(null)
            return undefined
        }
        const u = URL.createObjectURL(blob)
        setIndirizzo(u)
        return () => URL.revokeObjectURL(u)
    }, [blob])
    return indirizzo
}
