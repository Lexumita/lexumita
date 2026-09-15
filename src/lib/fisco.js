// src/lib/fisco.js
//
// Posta fiscale: caricamento dei documenti (archivio + documenti_fiscali),
// lettura automatica (edge fisco-classifica) e piccoli aiuti di formato.
// Le scadenze le calcola il DB (v_documenti_fiscali): qui non si calcola nulla.

import { supabase } from '@/lib/supabase'

export const FORMATI_ACCETTATI = 'application/pdf,image/jpeg,image/png,image/webp'

// Le foto del telefono pesano 3-6 MB: ridotte a 2200 px restano leggibili
// e stanno sotto il limite di 5 MB della lettura automatica.
const LATO_MAX_FOTO = 2200
const QUALITA_FOTO = 0.85

export const STATI_DOC = {
    in_analisi: { label: 'Lettura in corso', variant: 'gray' },
    da_verificare: { label: 'Da verificare', variant: 'warning' },
    confermato: { label: 'Confermato', variant: 'salvia' },
    archiviato: { label: 'Archiviato', variant: 'gray' },
    errore: { label: 'Da controllare', variant: 'red' },
}

export const AZIONI = {
    pagamento: 'Pagamento',
    ricorso: 'Ricorso',
    scadenza: 'Scadenza',
}

// ─── FORMATO ───

export function nomeDaProfilo(c) {
    if (!c) return ''
    return c.ragione_sociale?.trim() || [c.nome, c.cognome].filter(Boolean).join(' ').trim()
}

export function nomeClienteDoc(d) {
    if (!d) return ''
    return d.cliente_ragione_sociale?.trim()
        || [d.cliente_nome, d.cliente_cognome].filter(Boolean).join(' ').trim()
}

export function fmtData(iso) {
    if (!iso) return '—'
    return new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('it-IT')
}

export function fmtEuro(n) {
    if (n == null || n === '') return '—'
    return Number(n).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

export function oggiISO(delta = 0) {
    const d = new Date()
    d.setDate(d.getDate() + delta)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const gg = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${gg}`
}

export function giorniMancanti(iso) {
    if (!iso) return null
    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)
    return Math.round((new Date(`${String(iso).slice(0, 10)}T00:00:00`) - oggi) / 86400000)
}

export function testoGiorni(g) {
    if (g == null) return ''
    if (g < 0) return g === -1 ? 'Scaduta ieri' : `Scaduta da ${-g} giorni`
    if (g === 0) return 'Scade oggi'
    if (g === 1) return 'Scade domani'
    return `Tra ${g} giorni`
}

export function coloreGiorni(g) {
    if (g == null) return 'text-nebbia/40'
    if (g <= 7) return 'text-red-400'
    if (g <= 30) return 'text-amber-400'
    return 'text-salvia'
}

// Una lettura che non ha mai risposto (rete caduta, pagina chiusa) non deve
// lasciare la scheda in "Sto leggendo…" per sempre: dopo 4 minuti si propone
// di rileggere.
export function conStatoVisibile(d) {
    if (d.stato !== 'in_analisi') return d
    const ferma = Date.now() - new Date(d.updated_at).getTime() > 4 * 60 * 1000
    return ferma
        ? { ...d, stato: 'errore', errore: 'La lettura non si è conclusa. Premi «Rileggi» per riprovare.' }
        : d
}

// ─── SPAZIO (stessa regola dell'Archivio) ───

export async function verificaSpazio(titolareId, userId) {
    const [{ data: q }, { data: docs }, { data: sentenze }] = await Promise.all([
        supabase.rpc('quota_studio', { p_proprietario_id: titolareId }),
        supabase.from('archivio_documenti').select('dimensione').eq('titolare_id', titolareId),
        supabase.from('sentenze').select('pdf_size_bytes').eq('autore_id', userId),
    ])
    const quota = Array.isArray(q) ? q[0] : q
    if (!quota?.piano_attivo) return 'Piano scaduto: per caricare documenti rinnova l\'abbonamento.'
    const occupati = (docs ?? []).reduce((s, d) => s + (d.dimensione ?? 0), 0)
        + (sentenze ?? []).reduce((s, x) => s + (x.pdf_size_bytes ?? 0), 0)
    const totali = (quota.gb_totali ?? 0) * 1024 * 1024 * 1024
    if (totali === 0 || occupati >= totali) {
        return 'Spazio esaurito: libera qualche file dall\'archivio o acquista un pacchetto di spazio.'
    }
    return null
}

// ─── CARICAMENTO E LETTURA ───

async function preparaFile(file) {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
    try {
        const immagine = await createImageBitmap(file, { imageOrientation: 'from-image' })
        const scala = Math.min(1, LATO_MAX_FOTO / Math.max(immagine.width, immagine.height))
        if (scala === 1 && file.type === 'image/jpeg' && file.size < 1.5 * 1024 * 1024) return file
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(immagine.width * scala)
        canvas.height = Math.round(immagine.height * scala)
        canvas.getContext('2d').drawImage(immagine, 0, 0, canvas.width, canvas.height)
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', QUALITA_FOTO))
        if (!blob) return file
        return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' })
    } catch {
        return file
    }
}

// Carica il file nell'archivio dello studio e crea la riga fiscale.
// La lettura automatica si lancia a parte con analizzaDocumento().
export async function caricaDocumentoFiscale({ file, titolareId, userId, clienteId = null }) {
    const f = await preparaFile(file)
    const ext = (f.name.split('.').pop() || '').toLowerCase()
    const isPdf = f.type === 'application/pdf' || ext === 'pdf'
    const path = `${titolareId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext || (isPdf ? 'pdf' : 'jpg')}`

    const { error: upErr } = await supabase.storage.from('archivio').upload(path, f, {
        contentType: f.type || undefined,
    })
    if (upErr) throw new Error('Caricamento non riuscito: controlla la connessione e riprova.')

    const { data: arch, error: archErr } = await supabase
        .from('archivio_documenti')
        .insert({
            autore_id: userId,
            titolare_id: titolareId,
            cliente_id: clienteId,
            tipo: isPdf ? 'pdf' : 'file',
            titolo: file.name,
            storage_path: path,
            tipo_file: f.type,
            dimensione: f.size,
            tags: ['fisco'],
            ocr_status: isPdf ? 'pending' : 'skipped',
        })
        .select('id')
        .single()
    if (archErr) {
        await supabase.storage.from('archivio').remove([path])
        throw new Error('Caricamento non riuscito: riprova.')
    }

    const { data: doc, error: docErr } = await supabase
        .from('documenti_fiscali')
        .insert({
            professionista_id: userId,
            archivio_documento_id: arch.id,
            cliente_id: clienteId,
            nome_file: file.name,
            fonte: 'upload',
            stato: 'in_analisi',
        })
        .select('id')
        .single()
    if (docErr) throw new Error('Caricamento non riuscito: riprova.')

    // Indicizzazione per la ricerca in archivio, in background come nell'Archivio
    if (isPdf) {
        supabase.functions.invoke('process-archivio', { body: { documento_id: arch.id } }).catch(() => { })
    }
    return doc
}

export async function analizzaDocumento(documentoId) {
    const { data, error } = await supabase.functions.invoke('fisco-classifica', {
        body: { documento_id: documentoId },
    })
    if (error) return { ok: false, error: 'La lettura automatica non è riuscita: riprova tra poco.' }
    return data
}

// ─── AZIONI SUL DOCUMENTO ───

export async function aggiornaDocumento(id, campi) {
    const { error } = await supabase.from('documenti_fiscali').update(campi).eq('id', id)
    if (error) throw new Error(error.message)
}

export async function assegnaCliente(documentoId, clienteId) {
    const { error } = await supabase.rpc('fisco_assegna_cliente', {
        p_documento: documentoId,
        p_cliente: clienteId,
    })
    if (error) throw new Error(error.message)
}

// Conferma + agenda in un gesto; i messaggi d'errore arrivano già in italiano
// semplice dal DB ("Scegli il cliente...", "Indica la data di notifica...").
export async function confermaDocumento(documentoId) {
    const { data, error } = await supabase.rpc('fisco_conferma_documento', { p_documento: documentoId })
    if (error) throw new Error(error.message)
    return data
}

export async function segnaScadenza(scadenzaId, fatta) {
    const { error } = await supabase
        .from('scadenze_mandato')
        .update({
            stato: fatta ? 'completata' : 'aperta',
            data_completamento: fatta ? oggiISO() : null,
        })
        .eq('id', scadenzaId)
    if (error) throw new Error(error.message)
}

export async function eliminaDocumentoFiscale(doc) {
    if (doc.archivio_documento_id) {
        const { data: arch } = await supabase
            .from('archivio_documenti')
            .select('storage_path, metadati')
            .eq('id', doc.archivio_documento_id)
            .maybeSingle()
        if (arch?.storage_path) {
            await supabase.storage.from(arch.metadati?.bucket ?? 'archivio').remove([arch.storage_path])
        }
        await supabase.from('archivio_documenti').delete().eq('id', doc.archivio_documento_id)
    }
    const { error } = await supabase.from('documenti_fiscali').delete().eq('id', doc.id)
    if (error) throw new Error('Eliminazione non riuscita: riprova.')
}

// La finestra si apre subito (gesto dell'utente), poi riceve l'indirizzo
// firmato: così i blocchi dei popup non la fermano.
export async function apriDocumento(archivioDocumentoId) {
    if (!archivioDocumentoId) return
    const finestra = window.open('', '_blank')
    const { data } = await supabase
        .from('archivio_documenti')
        .select('storage_path, metadati')
        .eq('id', archivioDocumentoId)
        .maybeSingle()
    const { data: firmato } = data?.storage_path
        ? await supabase.storage.from(data.metadati?.bucket ?? 'archivio').createSignedUrl(data.storage_path, 3600)
        : { data: null }
    if (!firmato?.signedUrl) {
        finestra?.close()
        return
    }
    if (finestra) finestra.location.href = firmato.signedUrl
    else window.location.href = firmato.signedUrl
}

// ─── DALL'ARCHIVIO ───

// Si mandano a Fisco i file d'archivio che la lettura sa aprire (PDF e foto):
// non le sentenze, le fatture o i documenti generati da Lex.
export function inviabileAFisco(doc) {
    if (!doc || doc._kind === 'sentenza' || !doc.storage_path) return false
    const kind = doc.metadati?.kind
    if (kind === 'fattura' || kind === 'documento_generato') return false
    return doc.tipo === 'pdf' || String(doc.tipo_file ?? '').startsWith('image/')
}

// Un documento già in Archivio entra in Fisco sulla stessa riga d'archivio,
// senza ricaricare il file; il tag 'fisco' lo segnala anche nell'Archivio.
// Se era già stato mandato si ritrova quello esistente: l'indice unico sul DB
// impedisce i doppioni.
export async function mandaAFisco(doc, userId) {
    const riga = {
        professionista_id: userId,
        archivio_documento_id: doc.id,
        cliente_id: doc.cliente_id ?? null,
        // il titolo in archivio si rinomina solo se è ancora il nome del file
        nome_file: /\.(pdf|jpe?g|png|webp|gif)$/i.test(doc.titolo ?? '') ? doc.titolo : null,
        fonte: 'archivio',
        stato: 'in_analisi',
    }
    let { data, error } = await supabase.from('documenti_fiscali').insert(riga).select('id').single()
    if (error && riga.cliente_id && /cliente/i.test(error.message)) {
        // cliente d'archivio non tra i propri: si manda senza e lo si sceglie in Fisco
        ({ data, error } = await supabase.from('documenti_fiscali')
            .insert({ ...riga, cliente_id: null })
            .select('id')
            .single())
    }
    const gia = error?.code === '23505'
    if (error && !gia) throw new Error('Invio a Fisco non riuscito: riprova.')

    if (!(doc.tags ?? []).includes('fisco')) {
        await supabase.from('archivio_documenti')
            .update({ tags: [...(doc.tags ?? []), 'fisco'] })
            .eq('id', doc.id)
    }
    if (gia) return { id: await idInFisco(doc.id), gia: true }

    analizzaDocumento(data.id)   // prosegue da sola: l'esito compare in Fisco
    return { id: data.id, gia: false }
}

export async function idInFisco(archivioDocumentoId) {
    const { data } = await supabase
        .from('documenti_fiscali')
        .select('id')
        .eq('archivio_documento_id', archivioDocumentoId)
        .maybeSingle()
    return data?.id ?? null
}
