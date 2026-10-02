// src/lib/archivio.js
//
// Archivio documenti: spazio, salvataggio ed elenco, condivisi da Archivio e
// Banca Dati. Lo spazio lo calcola il DB (archivio_spazio): è la stessa regola
// che il server applica quando si carica un file, quindi la pagina e il server
// non possono dare numeri diversi.
//
// Regole (decise il 02-10-2026):
//  · privati (ruolo 'user'): 50 MB gratuiti; con il Piano Personale +2 GB
//    finché il piano è attivo. L'archivio resta scrivibile anche senza piano.
//  · professionisti: GB del piano + pacchetti; a piano scaduto sola lettura.

import { supabase } from '@/lib/supabase'

export const MB = 1024 * 1024
export const GB = 1024 * MB

// Indirizzi dell'archivio e degli acquisti: i privati stanno sotto /area
export function rottaArchivio(ruolo) {
    return ruolo === 'user' ? '/area/archivio' : '/archivio'
}
export function rottaAcquisti(ruolo) {
    return ruolo === 'user' ? '/area/acquista' : '/studio?tab=acquista'
}

// Lo studio a cui appartiene l'archivio: il titolare, oppure sé stessi
export function titolareDi(profile) {
    return profile?.titolare_id ?? profile?.id ?? null
}

export async function leggiSpazioArchivio(titolareId) {
    const { data, error } = await supabase.rpc('archivio_spazio', { p_titolare: titolareId })
    if (error) throw new Error('Impossibile leggere lo spazio dell\'archivio')
    const r = Array.isArray(data) ? data[0] : data
    const quota = Number(r?.quota_bytes ?? 0)
    const usati = Number(r?.usati_bytes ?? 0)
    return {
        quota,
        usati,
        liberi: Math.max(0, quota - usati),
        gratuiti: Number(r?.gratuiti_bytes ?? 0),
        piano: Number(r?.piano_bytes ?? 0),
        extra: Number(r?.extra_bytes ?? 0),
        pianoAttivo: !!r?.piano_attivo,
        scrivibile: !!r?.scrivibile,
        ruolo: r?.ruolo ?? null,
    }
}

// "48 MB", "1,5 GB", "2 GB"
export function formattaSpazio(bytes) {
    const b = Number(bytes ?? 0)
    if (b >= GB) {
        const v = Math.round((b / GB) * 10) / 10
        return `${String(v).replace('.', ',')} GB`
    }
    if (b >= MB) return `${Math.round(b / MB)} MB`
    if (b > 0) return `${Math.max(1, Math.round(b / 1024))} KB`
    return '0 MB'
}

// Perché non si può caricare (null = si può). `bytesNuovi`: quanto si vuole aggiungere.
export function motivoBloccoArchivio(spazio, bytesNuovi = 0) {
    if (!spazio) return null
    if (!spazio.scrivibile) return 'Piano scaduto: l\'archivio è in sola lettura.'
    if (spazio.quota <= 0) return 'Il tuo piano non include spazio d\'archivio.'
    if (spazio.usati + bytesNuovi > spazio.quota) {
        return bytesNuovi > 0 && spazio.usati < spazio.quota
            ? `Spazio insufficiente: ti restano ${formattaSpazio(spazio.liberi)} su ${formattaSpazio(spazio.quota)}.`
            : 'Spazio dell\'archivio esaurito.'
    }
    return null
}

// Gli errori del server tradotti per chi legge
export function traduciErroreArchivio(err) {
    const m = `${err?.message ?? ''} ${err?.hint ?? ''} ${err?.error ?? ''}`
    if (/archivio_spazio_esaurito|spazio dell'archivio esaurito/i.test(m)) return 'Spazio dell\'archivio esaurito.'
    if (/archivio_sola_lettura|sola lettura/i.test(m)) return 'Piano scaduto: l\'archivio è in sola lettura.'
    // La policy di storage rifiuta il file quando lo spazio è finito
    if (/row-level security|violates|unauthorized/i.test(m)) return 'Spazio dell\'archivio esaurito, oppure archivio non disponibile.'
    return 'Salvataggio non riuscito: riprova.'
}

export function tipoDaFile(file) {
    const ext = (file?.name?.split('.').pop() || '').toLowerCase()
    if (ext === 'pdf' || file?.type === 'application/pdf') return 'pdf'
    if (ext === 'txt') return 'txt'
    return 'file'
}

// Salva un file nell'archivio dello studio. Se il testo è già stato letto
// (Banca Dati, dopo l'analisi) lo si passa: l'archivio lo indicizza senza
// rileggere il file né rifare l'OCR.
export async function salvaInArchivio({ file, testo = null, titolareId, userId, categoriaId = null, titolo = null }) {
    const ext = (file.name.split('.').pop() || '').toLowerCase() || 'bin'
    const tipo = tipoDaFile(file)
    const path = `${titolareId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { error: upErr } = await supabase.storage.from('archivio').upload(path, file, {
        contentType: file.type || undefined,
    })
    if (upErr) throw new Error(traduciErroreArchivio(upErr))

    const haTesto = typeof testo === 'string' && testo.trim().length > 0
    const { data: doc, error: dbErr } = await supabase
        .from('archivio_documenti')
        .insert({
            autore_id: userId,
            titolare_id: titolareId,
            categoria_id: categoriaId || null,
            tipo,
            titolo: titolo || file.name,
            storage_path: path,
            tipo_file: file.type || null,
            dimensione: file.size,
            tags: [],
            testo_estratto: haTesto ? testo : null,
            ocr_status: (haTesto || tipo === 'pdf' || tipo === 'txt') ? 'pending' : 'skipped',
            metadati: { origine: haTesto ? 'banca_dati' : 'caricamento' },
        })
        .select()
        .single()

    if (dbErr) {
        // Riga rifiutata (es. spazio finito con il file appena caricato): il file non deve restare orfano
        await supabase.storage.from('archivio').remove([path]).catch(() => { })
        throw new Error(traduciErroreArchivio(dbErr))
    }

    if (doc.ocr_status === 'pending') {
        supabase.functions.invoke('process-archivio', {
            body: { documento_id: doc.id, usa_testo_presente: haTesto },
        }).catch(() => { })
    }
    return doc
}

export async function leggiCategorieArchivio(titolareId) {
    const { data } = await supabase
        .from('categorie_archivio')
        .select('id, nome, colore')
        .eq('titolare_id', titolareId)
        .order('nome')
    return data ?? []
}

// Documenti dell'archivio già letti (si possono analizzare). Ricerca sul titolo
// lato server e massimo `limite` righe: niente elenchi da migliaia di righe.
export async function cercaDocumentiLetti({ titolareId, userId, cerca = '', categoriaId = '', limite = 50 }) {
    let q = supabase
        .from('archivio_documenti')
        .select('id, titolo, categoria_id, created_at, dimensione, ocr_status')
        .or(`titolare_id.eq.${titolareId},autore_id.eq.${userId}`)
        .eq('ocr_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(limite)
    const testo = cerca.trim()
    if (testo) q = q.ilike('titolo', `%${testo.replace(/[%_,()]/g, ' ')}%`)
    if (categoriaId === 'senza') q = q.is('categoria_id', null)
    else if (categoriaId) q = q.eq('categoria_id', categoriaId)
    const { data, error } = await q
    if (error) throw new Error('Impossibile leggere l\'archivio')
    return data ?? []
}

// Quanti documenti sono ancora in lettura (per spiegare un elenco vuoto)
export async function contaDocumentiInLettura({ titolareId, userId }) {
    const { count } = await supabase
        .from('archivio_documenti')
        .select('id', { count: 'exact', head: true })
        .or(`titolare_id.eq.${titolareId},autore_id.eq.${userId}`)
        .in('ocr_status', ['pending', 'processing'])
    return count ?? 0
}
