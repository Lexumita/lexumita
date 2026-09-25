// Telefono: prefisso internazionale da una tendina + numero.
// Si salva in forma compatta (+393331234567): la stessa che il database
// ricava da sé con normalizza_telefono() quando il numero arriva scritto a mano
// (profili, form admin), così in tabella i numeri si leggono tutti uguali.

export const PREFISSI = [
  { v: '+39', l: '🇮🇹 +39', paese: 'Italia' },
  { v: '+41', l: '🇨🇭 +41', paese: 'Svizzera' },
  { v: '+378', l: '🇸🇲 +378', paese: 'San Marino' },
  { v: '+33', l: '🇫🇷 +33', paese: 'Francia' },
  { v: '+49', l: '🇩🇪 +49', paese: 'Germania' },
  { v: '+43', l: '🇦🇹 +43', paese: 'Austria' },
  { v: '+34', l: '🇪🇸 +34', paese: 'Spagna' },
  { v: '+44', l: '🇬🇧 +44', paese: 'Regno Unito' },
  { v: '+1', l: '🇺🇸 +1', paese: 'Stati Uniti e Canada' },
]

// Dal più lungo al più corto, così +378 non viene preso per un +3…
const PER_LUNGHEZZA = [...PREFISSI].sort((a, b) => b.v.length - a.v.length)

const pulisci = (s) => (s ?? '').replace(/[\s.()/-]/g, '')

// Se nel campo del numero è finito anche il prefisso (scritto, incollato o
// messo dal completamento automatico del browser) lo stacca e lo restituisce
// a parte: { prefisso, numero }. Altrimenti null.
export function staccaPrefisso(testo) {
  let x = pulisci(testo)
  if (x.startsWith('00')) x = '+' + x.slice(2)
  if (!x.startsWith('+')) return null
  const p = PER_LUNGHEZZA.find((p) => x.startsWith(p.v))
  return p ? { prefisso: p.v, numero: x.slice(p.v.length) } : null
}

// Numero completo da salvare, o null se il campo è vuoto.
export function componiTelefono(prefisso, numero) {
  const x = pulisci(numero)
  if (!x) return null
  // Prefisso scritto a mano e non in tendina (es. +351): vale quello.
  if (x.startsWith('+')) return x
  if (x.startsWith('00')) return '+' + x.slice(2)
  // In Italia e a San Marino lo 0 iniziale fa parte del numero (+39 02…);
  // negli altri paesi è il prefisso interurbano e cade (+41 79…, non +41 079…).
  const nazionale = prefisso === '+39' || prefisso === '+378' ? x : x.replace(/^0/, '')
  return prefisso + nazionale
}

// Messaggio d'errore, o null se va bene. Campo vuoto = nessun errore: il
// telefono è facoltativo e non deve mai bloccare una registrazione.
export function erroreTelefono(prefisso, numero) {
  const tel = componiTelefono(prefisso, numero)
  if (!tel) return null
  if (!/^\+[1-9]\d{6,14}$/.test(tel)) return 'Numero non valido'
  if (tel.startsWith('+39')) {
    const n = tel.slice(3)
    if (!/^[03]/.test(n)) return 'In Italia i cellulari iniziano con 3 e i fissi con 0'
    if (n.startsWith('3') && !/^3\d{8,9}$/.test(n)) return 'Il cellulare deve avere 9 o 10 cifre'
  }
  return null
}
