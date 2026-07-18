// src/lib/parametriForensi/catalogo.js
//
// Catalogo statico dei parametri forensi per il calcolo del compenso avvocato
// (DM 55/2014, tabelle "2022 vigenti" come sostituite dal DM 147/2022, in
// vigore dal 23/10/2022).
//
// Qui stanno SOLO struttura e regole (scaglioni, fasi, banda, aumenti,
// riduzioni, accessori, catalogo competenze). I VALORI NUMERICI (i "valori
// medi" per competenza × scaglione × fase) stanno in tabelle.js, così i numeri
// — la parte da validare contro la Gazzetta Ufficiale — restano isolati.

export const VERSIONE_DEFAULT = '2022'

export const VERSIONI = [
  {
    id: '2022',
    label: '2022 (vigenti)',
    desc: 'DM 55/2014 agg. DM 147/2022 — attività conclusa dal 23/10/2022',
  },
  // La versione '2014-2018 (precedenti)' è prevista ma non ancora caricata:
  // banda di adeguamento diversa (+80% generale, istruttoria +100%/−70%).
]

// I 13 scaglioni della UI. I primi 6 (fino a € 520.000) sono TABULATI
// nell'allegato al decreto; quelli superiori sono CALCOLATI per progressione
// (art. 6 DM 55/2014) a partire dall'ultimo scaglione tabulato.
export const SCAGLIONI = [
  { id: 'fino_1100',           label: 'Fino a € 1.100',               min: 0,         max: 1100 },
  { id: 'da_1101_5200',        label: 'Da € 1.101 a € 5.200',         min: 1101,      max: 5200 },
  { id: 'da_5201_26000',       label: 'Da € 5.201 a € 26.000',        min: 5201,      max: 26000 },
  { id: 'da_26001_52000',      label: 'Da € 26.001 a € 52.000',       min: 26001,     max: 52000 },
  { id: 'da_52001_260000',     label: 'Da € 52.001 a € 260.000',      min: 52001,     max: 260000 },
  { id: 'da_260001_520000',    label: 'Da € 260.001 a € 520.000',     min: 260001,    max: 520000 },
  { id: 'da_520001_1000000',   label: 'Da € 520.001 a € 1.000.000',   min: 520001,    max: 1000000,   computato: true },
  { id: 'da_1000001_2000000',  label: 'Da € 1.000.001 a € 2.000.000', min: 1000001,   max: 2000000,   computato: true },
  { id: 'da_2000001_4000000',  label: 'Da € 2.000.001 a € 4.000.000', min: 2000001,   max: 4000000,   computato: true },
  { id: 'da_4000001_8000000',  label: 'Da € 4.000.001 a € 8.000.000', min: 4000001,   max: 8000000,   computato: true },
  { id: 'da_8000001_16000000', label: 'Da € 8.000.001 a € 16.000.000',min: 8000001,   max: 16000000,  computato: true },
  { id: 'da_16000001_32000000',label: 'Da € 16.000.001 a € 32.000.000',min:16000001,  max: 32000000,  computato: true },
  { id: 'oltre_32000000',      label: 'Oltre € 32.000.000',           min: 32000001,  max: null,      computato: true },
]

// Ultimo scaglione tabulato: base per la progressione art. 6 sugli scaglioni
// calcolati.
export const SCAGLIONE_BASE_ID = 'da_260001_520000'

export const FASI = [
  { id: 'studio',       label: 'Fase di studio',                sigla: 'Studio' },
  { id: 'introduttiva', label: 'Fase introduttiva',             sigla: 'Introduttiva' },
  { id: 'istruttoria',  label: 'Fase istruttoria / trattazione',sigla: 'Istruttoria' },
  { id: 'decisionale',  label: 'Fase decisionale',              sigla: 'Decisionale' },
]

// Alcune tabelle (es. attività stragiudiziale) non sono a fasi: un compenso
// unico per scaglione. Le trattiamo con questa "fase" sintetica.
export const FASI_COMPENSO = [
  { id: 'compenso', label: 'Compenso', sigla: 'Compenso' },
]

// Fasi da usare per una competenza, in base al suo tipo. Le tabelle a compenso
// unico (stragiudiziale, monitori, volontaria) usano la "fase" sintetica.
export function getFasi(competenzaKey) {
  const c = getCompetenza(competenzaKey)
  return (c?.tipo === 'stragiudiziale' || c?.tipo === 'compensoUnico') ? FASI_COMPENSO : FASI
}

export const LIVELLI = [
  { id: 'min',   label: 'Min',   fattoreKey: 'min' },
  { id: 'medio', label: 'Medio', fattoreKey: null },
  { id: 'max',   label: 'Max',   fattoreKey: 'max' },
]

// Banda di adeguamento art. 4 co.1 (SOLO 2022 vigenti): ±50% attorno al valore
// medio, uguale per tutte le fasi. Il vecchio +80% generale e l'eccezione
// "fase istruttoria +100%/−70%" sono stati ABOLITI dal DM 147/2022.
export const BANDA = {
  '2022': { min: 0.5, max: 1.5 },
}

// Cause di valore indeterminabile (art. 5): mappano su uno scaglione tabulato.
// Valori di riferimento; la mappatura precisa è annotata in tabelle.js/regole.
export const INDETERMINABILE = [
  { id: 'bassa',       label: 'Indeterminabile — complessità bassa',        scaglione: 'da_26001_52000' },
  { id: 'media',       label: 'Indeterminabile — complessità media',        scaglione: 'da_52001_260000' },
  { id: 'alta',        label: 'Indeterminabile — complessità alta',         scaglione: 'da_52001_260000' },
  { id: 'particolare', label: 'Indeterminabile — di particolare importanza',scaglione: 'da_260001_520000' },
]

// ─────────────────────────────────────────────────────────────
// COMPETENZE (tabella da usare). tipo:
//   'scaglione'      → civile/amministrativo/tributario: scaglione × 4 fasi
//   'penale'         → per autorità giudiziaria × fasi (nessuno scaglione di valore)
//   'stragiudiziale' → attività stragiudiziale: scaglione di valore × fasi
// ─────────────────────────────────────────────────────────────
export const GRUPPI_COMPETENZE = [
  {
    gruppo: 'Civile — giurisdizione',
    voci: [
      { key: 'tribunale_ordinario', label: 'Tribunale — giudizi ordinari di cognizione', tipo: 'scaglione' },
      { key: 'giudice_di_pace',     label: 'Giudice di pace',                              tipo: 'scaglione' },
      { key: 'corte_appello',       label: "Corte d'Appello",                              tipo: 'scaglione' },
      { key: 'cassazione',          label: 'Corte di Cassazione',                          tipo: 'scaglione' },
    ],
  },
  {
    gruppo: 'Civile — materie e riti speciali',
    voci: [
      { key: 'lavoro',                   label: 'Cause di lavoro e previdenza',                 tipo: 'scaglione' },
      { key: 'volontaria_giurisdizione', label: 'Volontaria giurisdizione',                     tipo: 'compensoUnico' },
      { key: 'procedimenti_monitori',    label: 'Procedimenti monitori (decreto ingiuntivo)',   tipo: 'compensoUnico' },
      { key: 'procedimenti_cautelari',   label: 'Procedimenti cautelari',                       tipo: 'scaglione' },
      { key: 'istruzione_preventiva',    label: 'Istruzione preventiva',                        tipo: 'scaglione' },
      { key: 'precetto',                 label: 'Atto di precetto',                             tipo: 'compensoUnico' },
      { key: 'sfratti',                  label: 'Convalida di sfratto / licenza',               tipo: 'scaglione' },
      { key: 'esecuzioni',               label: 'Esecuzioni mobiliari',                         tipo: 'scaglione' },
      { key: 'esecuzioni_presso_terzi',  label: 'Esecuzioni presso terzi / consegna e rilascio',tipo: 'scaglione' },
      { key: 'esecuzioni_immobiliari',   label: 'Esecuzioni immobiliari',                       tipo: 'scaglione' },
      { key: 'iscrizione_ipotecaria',    label: 'Iscrizione ipotecaria / affari tavolari',      tipo: 'compensoUnico' },
      { key: 'fallimento',               label: 'Dichiarazione di fallimento',                  tipo: 'compensoUnico' },
      { key: 'accertamento_passivo',     label: 'Accertamento del passivo (fall./liq. giud.)',  tipo: 'scaglione' },
    ],
  },
  {
    gruppo: 'Amministrativo',
    voci: [
      { key: 'tar',               label: 'T.A.R. (primo grado)',            tipo: 'scaglione' },
      { key: 'consiglio_di_stato',label: 'Consiglio di Stato (appello)',    tipo: 'scaglione' },
    ],
  },
  {
    gruppo: 'Tributario',
    voci: [
      { key: 'cgt_primo_grado',   label: 'Corte di Giustizia Tributaria — primo grado',   tipo: 'scaglione' },
      { key: 'cgt_secondo_grado', label: 'Corte di Giustizia Tributaria — secondo grado', tipo: 'scaglione' },
    ],
  },
  {
    gruppo: 'Altre giurisdizioni',
    voci: [
      { key: 'corte_dei_conti',        label: 'Corte dei Conti',                               tipo: 'scaglione' },
      { key: 'corte_costituzionale_ue',label: 'Corte Cost. / Corte Europea / Corte Giust. UE', tipo: 'scaglione' },
      { key: 'arbitrato',              label: 'Arbitrato',                                     tipo: 'compensoUnico' },
    ],
  },
  {
    gruppo: 'Penale',
    voci: [
      { key: 'penale_giudice_di_pace',     label: 'Giudice di pace penale',        tipo: 'penale' },
      { key: 'penale_indagini_preliminari',label: 'Indagini preliminari',          tipo: 'penale' },
      { key: 'penale_indagini_difensive',  label: 'Indagini difensive',            tipo: 'penale' },
      { key: 'penale_convalida_arresto',   label: "Convalida dell'arresto",        tipo: 'penale' },
      { key: 'penale_cautelari_personali', label: 'Misure cautelari personali',    tipo: 'penale' },
      { key: 'penale_cautelari_reali',     label: 'Misure cautelari reali',        tipo: 'penale' },
      { key: 'penale_gip_gup',             label: 'GIP e GUP',                     tipo: 'penale' },
      { key: 'penale_tribunale_mono',      label: 'Tribunale penale (monocratico)',tipo: 'penale' },
      { key: 'penale_tribunale_coll',      label: 'Tribunale penale (collegiale)', tipo: 'penale' },
      { key: 'penale_corte_assise',        label: "Corte d'Assise",                tipo: 'penale' },
      { key: 'penale_sorveglianza_trib',   label: 'Tribunale di Sorveglianza',     tipo: 'penale' },
      { key: 'penale_sorveglianza_mag',    label: 'Magistrato di Sorveglianza',    tipo: 'penale' },
      { key: 'penale_appello',             label: "Corte d'Appello penale",        tipo: 'penale' },
      { key: 'penale_assise_appello',      label: "Corte d'Assise d'Appello",      tipo: 'penale' },
      { key: 'penale_cassazione',          label: 'Cassazione e giurisdizioni superiori', tipo: 'penale' },
    ],
  },
  {
    gruppo: 'Stragiudiziale',
    voci: [
      { key: 'stragiudiziale', label: 'Attività stragiudiziale', tipo: 'stragiudiziale' },
    ],
  },
]

// Mappa piatta key → voce (con gruppo), per lookup rapido.
export const COMPETENZE = GRUPPI_COMPETENZE.flatMap(g =>
  g.voci.map(v => ({ ...v, gruppo: g.gruppo }))
)

export function getCompetenza(key) {
  return COMPETENZE.find(c => c.key === key) ?? null
}

// ─────────────────────────────────────────────────────────────
// AUMENTI e RIDUZIONI (art. 4 DM 55/2014). I valori con `pct` sono percentuali
// applicate al compenso (somma delle fasi). "parti" usa la formula per parte.
// ─────────────────────────────────────────────────────────────
export const AUMENTI = [
  { id: 'parti',               label: 'Pluralità di parti (stessa posizione)', tipo: 'parti', riferimento: 'art. 4 co.2', help: '+30% per ogni parte oltre la prima (fino a 10), poi +10% dall’11ª alla 30ª' },
  { id: 'coniugi',             label: 'Entrambi i coniugi (sep./div. congiunti)', pct: 20, riferimento: 'art. 4 co.3', help: '+20%' },
  { id: 'manifesta_fondatezza',label: 'Manifesta fondatezza',                     pct: 33, riferimento: 'art. 4 co.8', help: 'fino a +1/3' },
  { id: 'class_action',        label: 'Azione collettiva (class action)',         pct: 200, riferimento: 'art. 4 co.10', help: 'fino al triplo (+200%)' },
  { id: 'telematici',          label: 'Atti telematici con testo ricercabile',    pct: 30, riferimento: 'art. 4 co.1-bis', help: 'fino a +30%' },
]

export const RIDUZIONI = [
  { id: 'stessa_posizione_distinte', label: 'Stessa posizione, questioni distinte', pct: 30, riferimento: 'art. 4 co.4', help: 'fino a −30%' },
  { id: 'solo_rito',                 label: 'Definizione solo in rito',             pct: 50, riferimento: 'art. 4 co.9', help: 'fino a −50%' },
  { id: 'gratuito_patrocinio',       label: 'Gratuito patrocinio / spese Stato',    pct: 50, riferimento: 'art. 130 DPR 115/2002', help: '−50%' },
  { id: 'praticante',                label: 'Praticante abilitato',                 pct: 50, riferimento: 'art. 9', help: 'fino a −50%' },
]

// Accessori di legge per costruire la parcella (in aggiunta al compenso).
export const ACCESSORI = {
  speseGeneraliPct: 15, // art. 2 co.2 DM 55/2014, sul compenso
  cpaPct: 4,            // Cassa Forense, su (compenso + spese generali)
  ivaPct: 22,           // su (compenso + spese generali + CPA)
  ritenutaPct: 20,      // su (compenso + spese generali), se cliente sostituto d'imposta
}

// Percentuale complessiva dell'aumento per pluralità di parti (art. 4 co.2):
// +30% per ogni parte oltre la prima (max 10 parti), +10% dall'11ª alla 30ª.
export function pctAumentoParti(nParti) {
  const n = Math.max(1, Math.floor(Number(nParti) || 1))
  const oltrePrima = Math.min(n - 1, 9)              // fino a 10 parti totali
  const daUndicesima = Math.max(0, Math.min(n, 30) - 10)
  return oltrePrima * 30 + daUndicesima * 10
}

export const DISCLAIMER =
  'Stima basata sui parametri forensi (DM 55/2014, agg. DM 147/2022) — importi ' +
  'orientativi, non un prezzo dovuto. Il compenso con il cliente è liberamente ' +
  'pattuibile e prevale sull’accordo. Verifica gli importi e i presupposti prima ' +
  'di emettere la fattura.'
