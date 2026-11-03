// src/lib/strumenti/memoria.js
//
// 03-11-2026: quello che gli strumenti gratuiti ricordano, solo nel browser di chi li usa. Può essere
// vuoto o bloccato (navigazione privata, pulizia dei dati): ogni lettura e scrittura è protetta.

const CHIAVI = {
    emittente: 'lexum_strumenti_emittente',
    ultimoNumero: 'lexum_strumenti_ultimo_numero',
    popupVisto: 'lexum_strumenti_popup_visto',
}

export function leggi(chiave) {
    try {
        const v = window.localStorage.getItem(CHIAVI[chiave])
        return v ? JSON.parse(v) : null
    } catch { return null }
}

export function scrivi(chiave, valore) {
    try {
        if (valore === null) window.localStorage.removeItem(CHIAVI[chiave])
        else window.localStorage.setItem(CHIAVI[chiave], JSON.stringify(valore))
    } catch { /* piena o bloccata: pazienza */ }
}

// Le righe che il calcolo della parcella passa alla fattura, per questa scheda
const CHIAVE_RIGHE = 'lexum_strumenti_righe_parcella'

export function passaRigheAllaFattura(righe) {
    try { window.sessionStorage.setItem(CHIAVE_RIGHE, JSON.stringify(righe)) } catch { /* si riparte da vuoto */ }
}

export function prendiRigheDallaParcella() {
    try {
        const v = window.sessionStorage.getItem(CHIAVE_RIGHE)
        window.sessionStorage.removeItem(CHIAVE_RIGHE)
        return v ? JSON.parse(v) : null
    } catch { return null }
}
