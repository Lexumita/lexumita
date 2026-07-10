// src/lib/generaScrittura.js
//
// Partita doppia — genera la scrittura contabile da un movimento effettivo
// usando la sua imputazione (mapping categoria→conto). IVA inclusa nel lordo.
//
//   ENTRATA:  Dare Cassa/Banca (lordo) ; Avere Ricavo (netto) + Erario c/IVA a debito (2200)
//   USCITA:   Dare Costo (netto) + Erario c/IVA a credito (1170) ; Avere Cassa/Banca (lordo)
//
// `contiByNumero` serve solo per i conti IVA (1170 / 2200).

const arr2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// Costruisce le righe dare/avere. Ritorna { righe } oppure { errore }.
export function righeDaMovimento(movimento, mapping, contiByNumero = {}) {
    const lordo = arr2(movimento?.importo)
    if (lordo <= 0) return { errore: 'Importo non valido' }
    if (!mapping?.conto_id || !mapping?.conto_cassa_id) return { errore: 'Imputazione incompleta' }

    const aliq = Number(mapping.aliquota_iva) || 0
    const netto = aliq > 0 ? arr2(lordo / (1 + aliq / 100)) : lordo
    const iva = arr2(lordo - netto)
    const righe = []

    if (movimento.tipo === 'entrata') {
        righe.push({ conto_id: mapping.conto_cassa_id, dare: lordo, avere: 0 })
        righe.push({ conto_id: mapping.conto_id, dare: 0, avere: netto })
        if (iva > 0) {
            const c = contiByNumero['2200']
            if (!c) return { errore: 'Conto Erario c/IVA a debito (2200) assente nel piano' }
            righe.push({ conto_id: c.id, dare: 0, avere: iva })
        }
    } else {
        righe.push({ conto_id: mapping.conto_id, dare: netto, avere: 0 })
        if (iva > 0) {
            const c = contiByNumero['1170']
            if (!c) return { errore: 'Conto Erario c/IVA a credito (1170) assente nel piano' }
            righe.push({ conto_id: c.id, dare: iva, avere: 0 })
        }
        righe.push({ conto_id: mapping.conto_cassa_id, dare: 0, avere: lordo })
    }
    return { righe }
}

// Crea la registrazione (testata + righe) collegata al movimento.
// Best-effort: ritorna { registrazione_id } oppure { errore }.
export async function contabilizzaMovimento(supabase, movimento, mapping, contiByNumero, user, studioId) {
    const { righe, errore } = righeDaMovimento(movimento, mapping, contiByNumero)
    if (errore) return { errore }

    const { data: reg, error: e1 } = await supabase.from('registrazioni').insert({
        cliente_id: movimento.cliente_id,
        mandato_id: movimento.mandato_id ?? null,
        data: movimento.data,
        descrizione: movimento.descrizione || 'Movimento',
        tipo: 'ordinaria',
        documento_id: movimento.documento_id ?? null,
        movimento_id: movimento.id,
        avvocato_id: user.id,
        studio_id: studioId ?? null,
        creato_da: user.id,
        aggiornato_da: user.id,
    }).select('id').single()
    if (e1) return { errore: e1.message }

    const payload = righe.map((r, i) => ({ registrazione_id: reg.id, conto_id: r.conto_id, dare: r.dare, avere: r.avere, ordine: i }))
    const { error: e2 } = await supabase.from('righe_registrazione').insert(payload)
    if (e2) {
        await supabase.from('registrazioni').delete().eq('id', reg.id)
        return { errore: e2.message }
    }
    return { registrazione_id: reg.id }
}
