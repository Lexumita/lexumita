// src/lib/documentoOrigine.js
//
// 07-10-2026: una risposta di Lex salvata (ricerche, tipo ricerca_ai) ricorda il documento da cui è nata.
//   ricerche.archivio_documento_id → il documento dell'archivio (diventa NULL se lo si elimina dall'archivio)
//   ricerche.documento_origine     → fotografia { nome, archivio_documento_id } che resta anche dopo
// Il database completa da solo la fotografia e rifiuta un documento che chi salva non può vedere.
// Lex sull'etichetta legge anche questi documenti (cerca_archivio_etichetta).

// Campi da aggiungere all'insert di una ricerca nata da un documento allegato in Banca Dati
export function campiDocumentoOrigine(documento) {
    if (!documento?.nome && !documento?.archivioId) return {}
    return {
        archivio_documento_id: documento.archivioId ?? null,
        documento_origine: { nome: documento.nome ?? null },
    }
}

// Colonne da leggere insieme alla ricerca per mostrare il badge
export const COLONNE_DOCUMENTO_ORIGINE =
    'archivio_documento_id, documento_origine, archivio_documento:archivio_documento_id(id, titolo)'

// null = nessun documento; 'presente' = si apre dall'archivio; 'eliminato'; 'non_salvato' = letto da Lex ma mai
// salvato nell'archivio
export function statoDocumentoOrigine(ricerca) {
    const foto = ricerca?.documento_origine ?? null
    if (!foto && !ricerca?.archivio_documento_id) return null
    const nome = ricerca?.archivio_documento?.titolo || foto?.nome || null
    if (ricerca.archivio_documento_id) return { stato: 'presente', id: ricerca.archivio_documento_id, nome }
    if (foto?.archivio_documento_id) return { stato: 'eliminato', nome }
    return { stato: 'non_salvato', nome }
}
