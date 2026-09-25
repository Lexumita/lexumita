// src/lib/pdf/pdfRisposta.js
// ─────────────────────────────────────────────────────────────
// "Scarica PDF" di una risposta di Lex in Banca Dati (25/09/2026).
// Il testo della risposta e' impaginato cosi' com'e'; titolo, quesito in
// sintesi, titoli di sezione, tre punti fermi, sintesi e descrizione delle
// fonti li scrive Sonnet (edge lex-impagina, ~1,5 centesimi, nessun credito).
// Se Sonnet non risponde il PDF esce lo stesso, con le sole parti di Lex.
// Il modulo si carica solo al click: pdfmake e i caratteri pesano ~1,4 MB (600 KB compressi).
// ─────────────────────────────────────────────────────────────

import pdfMake from 'pdfmake/build/pdfmake'
import outfit300 from '@fontsource/outfit/files/outfit-latin-300-normal.woff?url'
import outfit500 from '@fontsource/outfit/files/outfit-latin-500-normal.woff?url'
import cormorant500 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff?url'
import cormorant600 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff?url'
import cormorant500i from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff?url'
import cormorant600i from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-italic.woff?url'
import logoPdf from '@/assets/logo-pdf.png'
import { supabase } from '@/lib/supabase'
import { sanitizzaErrore } from '@/lib/sanitizzaErrore'
import { modelloMeccanico, unisciEditoriale } from './modelloRisposta'
import { definizioneDocumento } from './impaginaDocumento'

// pdfmake nel browser scarica i caratteri solo da indirizzi completi (https://...).
const assoluto = (url) => new URL(url, window.location.origin).href

function caratteri() {
    return {
        Outfit: { normal: assoluto(outfit300), bold: assoluto(outfit500), italics: assoluto(outfit300), bolditalics: assoluto(outfit500) },
        Cormorant: { normal: assoluto(cormorant500), bold: assoluto(cormorant600), italics: assoluto(cormorant500i), bolditalics: assoluto(cormorant600i) },
    }
}

async function comeDataUrl(url) {
    const blob = await (await fetch(url)).blob()
    return await new Promise((ok, ko) => {
        const lettore = new FileReader()
        lettore.onload = () => ok(lettore.result)
        lettore.onerror = ko
        lettore.readAsDataURL(blob)
    })
}

async function chiediEditoriale({ domanda, risposta, sezioni }) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lex-impagina`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ domanda, risposta, sezioni }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.ok) throw new Error(json.error ?? `Il servizio non ha risposto (codice ${res.status}).`)
    return json.editoriale
}

const nomeFile = (titolo) =>
    `LEXUM - ${(titolo || 'Analisi giuridica').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)}.pdf`

/**
 * Crea il PDF di una risposta.
 * @returns {{ blob: Blob, nome: string, avviso: string|null }} avviso se il PDF e' uscito senza le parti di Sonnet
 */
export async function creaPdfRisposta({ domanda, risposta }) {
    const base = modelloMeccanico({ domanda, risposta })
    let modello = base
    let avviso = null
    try {
        const editoriale = await chiediEditoriale({ domanda, risposta, sezioni: base.sezioni.map((s) => s.titolo) })
        modello = unisciEditoriale(base, editoriale)
    } catch (e) {
        const motivo = (sanitizzaErrore(e) ?? 'Il servizio non ha risposto').replace(/[.!?\s]*$/, '.')
        avviso = `${motivo} Il PDF è stato creato comunque, senza titolo, punti fermi e sintesi.`
    }

    const logo = await comeDataUrl(logoPdf).catch(() => null)
    // Se un carattere non arriva, pdfmake non richiama mai: dopo 30 secondi
    // l'utente legge un errore invece di aspettare per sempre.
    const blob = await Promise.race([
        new Promise((ok) => {
            pdfMake.createPdf(definizioneDocumento(modello, { logo }), null, caratteri()).getBlob(ok)
        }),
        new Promise((_, ko) => setTimeout(() => ko(new Error('Non sono riuscito a creare il PDF. Riprova tra qualche istante.')), 30000)),
    ])
    return { blob, nome: nomeFile(modello.titolo), avviso }
}

/** Crea il PDF e lo fa scaricare al browser. */
export async function scaricaPdfRisposta(parametri) {
    const { blob, nome, avviso } = await creaPdfRisposta(parametri)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    return { avviso }
}
