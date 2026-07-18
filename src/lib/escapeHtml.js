// src/lib/escapeHtml.js
// Escape dei caratteri HTML pericolosi. Da usare SEMPRE prima di iniettare
// testo con dangerouslySetInnerHTML (es. funzioni di evidenziazione ricerca).
// Senza questo escape, un titolo documento o un riepilogo generato dall'AI che
// contenga markup (es. <img src=x onerror=...>) verrebbe eseguito nel browser
// dell'utente → XSS (anche stored, via contenuto caricato o output AI).
export function escapeHtml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default escapeHtml
