// Punto unico di verità per "profilo completo".
//
// Sostituisce la verifica dell'albo come condizione per acquistare: i dati di
// fatturazione si verificano DA SOLI (una partita IVA sbagliata fa fallire la
// fattura elettronica), quindi sbloccano subito senza approvazione manuale.
// La verifica dei documenti resta, ma facoltativa: dà il distintivo
// "professionista verificato", non il permesso di comprare.
//
// Se cambi i campi richiesti, cambiali QUI: la pagina Profilo e la pagina
// Acquista leggono entrambe da questa funzione e non possono divergere.

export const CAMPI_FATTURAZIONE = [
  { key: 'telefono',   label: 'Telefono' },
  { key: 'indirizzo',  label: 'Indirizzo' },
  { key: 'cap',        label: 'CAP' },
  { key: 'comune',     label: 'Comune' },
  { key: 'provincia',  label: 'Provincia' },
  { key: 'cf',         label: 'Codice fiscale' },
  { key: 'partita_iva',label: 'Partita IVA' },
]

// Per la fattura elettronica ne basta UNO dei due: chi ha la PEC non è tenuto
// ad avere il codice destinatario e viceversa.
export const CAMPI_RECAPITO_SDI = [
  { key: 'pec',                     label: 'PEC' },
  { key: 'codice_destinatario_sdi', label: 'Codice destinatario SDI' },
]

// Fuori dall'Italia (29-10-2026, deciso da Antonino): provincia, codice fiscale e PEC/SDI non esistono,
// e il Profilo non li mostra. Bastano telefono, indirizzo e partita IVA.
export const CAMPI_FATTURAZIONE_ESTERO = [
  { key: 'telefono',   label: 'Telefono' },
  { key: 'indirizzo',  label: 'Indirizzo' },
  { key: 'cap',        label: 'Codice postale' },
  { key: 'comune',     label: 'Città' },
  { key: 'partita_iva',label: 'Partita IVA' },
]

const pieno = (v) => typeof v === 'string' ? v.trim().length > 0 : v != null
const inItalia = (profile) => (profile?.paese || 'IT') === 'IT'
const campiRichiesti = (profile) => inItalia(profile) ? CAMPI_FATTURAZIONE : CAMPI_FATTURAZIONE_ESTERO

/** Elenco delle etichette ancora da compilare (vuoto = profilo completo). */
export function campiMancanti(profile) {
  if (!profile) return [...CAMPI_FATTURAZIONE.map(c => c.label), 'PEC o Codice SDI']
  const mancanti = campiRichiesti(profile).filter(c => !pieno(profile[c.key])).map(c => c.label)
  if (inItalia(profile) && !CAMPI_RECAPITO_SDI.some(c => pieno(profile[c.key]))) mancanti.push('PEC o Codice SDI')
  return mancanti
}

export function profiloCompleto(profile) {
  return campiMancanti(profile).length === 0
}

/** 0-100, per la barra di avanzamento. */
export function percentualeProfilo(profile) {
  const totale = campiRichiesti(profile).length + (inItalia(profile) ? 1 : 0)   // +1 = recapito SDI
  return Math.round(((totale - campiMancanti(profile).length) / totale) * 100)
}
