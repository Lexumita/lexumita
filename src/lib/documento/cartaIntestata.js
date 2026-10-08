// src/lib/documento/cartaIntestata.js
//
// 08-10-2026: carta intestata dei documenti scritti da Lex, presa dal profilo di chi scarica. Solo per i
// professionisti (avvocati e commercialisti, decisione dell'utente dell'08-10): i privati scaricano il
// documento senza intestazione. Niente marchio Lexum sui documenti da firmare.

export const RUOLI_CARTA_INTESTATA = ['avvocato', 'commercialista']

const pulito = (v) => String(v ?? '').trim()

// { intestatario: 'Avv. Mario Rossi', righe: ['Studio Legale Rossi', 'Via ... – 20100 Milano (MI)', ...] } o null
export function cartaIntestata(profile) {
    if (!profile || !RUOLI_CARTA_INTESTATA.includes(profile.role)) return null
    const nome = [pulito(profile.nome), pulito(profile.cognome)].filter(Boolean).join(' ')
    const intestatario = nome ? `${profile.role === 'avvocato' ? 'Avv.' : 'Dott.'} ${nome}` : null
    const studio = pulito(profile.studio) || pulito(profile.ragione_sociale) || null
    const via = [pulito(profile.indirizzo), pulito(profile.numero_civico)].filter(Boolean).join(' ')
    const provincia = pulito(profile.provincia)
    const citta = [pulito(profile.cap), pulito(profile.comune), provincia ? `(${provincia})` : ''].filter(Boolean).join(' ')
    const indirizzo = [via, citta].filter(Boolean).join(' – ')
    const contatti = [
        pulito(profile.telefono) && `Tel. ${pulito(profile.telefono)}`,
        pulito(profile.email),
        pulito(profile.pec) && `PEC ${pulito(profile.pec)}`,
    ].filter(Boolean).join(' · ')
    const foro = pulito(profile.foro)
    const albo = profile.role === 'avvocato'
        ? [foro && (/^foro\b/i.test(foro) ? foro : `Foro di ${foro}`), pulito(profile.numero_albo) && `n. ${pulito(profile.numero_albo)}`]
            .filter(Boolean).join(' – ')
        : pulito(profile.numero_albo) ? `Iscrizione all'albo n. ${pulito(profile.numero_albo)}` : ''
    const fiscali = pulito(profile.partita_iva) ? `P. IVA ${pulito(profile.partita_iva)}` : ''
    const righe = [
        studio && studio !== intestatario ? studio : '',
        indirizzo,
        contatti,
        [albo, fiscali].filter(Boolean).join(' · '),
    ].filter(Boolean)
    if (!intestatario && !righe.length) return null
    return { intestatario: intestatario ?? studio, righe: intestatario ? righe : righe.filter((r) => r !== studio) }
}
