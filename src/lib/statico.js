// src/lib/statico.js
//
// 03-11-2026: le pagine della vetrina arrivano con il testo già dentro l'HTML (scripts/generate-seo-pages.mjs),
// perché i motori delle AI non eseguono JavaScript e prima vedevano solo titolo e descrizione.
// Quel testo sta in <div id="statico"> e resta a schermo finché React non ha disegnato la stessa pagina
// in #root, nascosto fino a quel momento: niente lampi e niente rotelle. Le pagine che scaricano dati
// (Novità) lo tolgono quando i dati sono arrivati.

let avevaStatico = false

export function togliStatico() {
    const statico = document.getElementById('statico')
    if (!statico) return
    avevaStatico = true
    const y = window.scrollY
    const root = document.getElementById('root')
    if (root) root.style.display = ''
    statico.remove()
    window.scrollTo({ top: y, behavior: 'instant' })
}

// La pagina è partita dal testo già pronto: al primo disegno non va riportata in cima.
export function eraStatica() {
    return avevaStatico || !!document.getElementById('statico')
}
