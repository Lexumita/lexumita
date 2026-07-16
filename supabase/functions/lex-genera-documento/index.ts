// ═══════════════════════════════════════════════════════════════
// LEX-GENERA-DOCUMENTO — Agent per generazione atti legali
// VERSIONE 2 — cerca_in_corpus con RICERCA DIRETTA MULTI-FONTE
// ═══════════════════════════════════════════════════════════════
//
// CAMBIO PRINCIPALE rispetto alla v1:
//   cerca_in_corpus NON chiama piu' lex-lead (che orchestrava subagent
//   Sonnet + synthesizer, 90-240s, timeout edge, crediti extra).
//   Ora fa ricerca VETTORIALE DIRETTA via RPC sulle tabelle del corpus,
//   in parallelo sulle fonti scelte dall'agent. ~2-3s, zero crediti extra.
//
//   Ricerca trasversale (richiesta Antonino):
//     - giurisprudenza: per_principio + per_oggetto + chunks (dedup su id)
//     - prassi: per_oggetto + chunks (dedup su id)
//   Cosi' una sentenza/prassi viene trovata anche se il concetto e'
//   nel testo ma non nel campo sintetico (principio/oggetto).
//
// Invocato da lex-pratica quando il classifier riconosce intent
// "genera_documento" con tipo valido. NON chiamato dal frontend.
//
// Body:
//   {
//     pratica_id, tipo_documento, istruzione_avvocato,
//     contesto_pratica, conversazione_id, parent_log_id
//   }
//
// SSE: event: stato | chunk | done | error
//
// CREDITI (P2): scala 1 credito SOLO a generazione completata OK.
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ─── COSTANTI ────────────────────────────────────────────────────

const ENDPOINT_NOME = 'lex_genera_documento'
const MODEL_AGENT = 'claude-sonnet-5'
const MAX_TOKENS_AGENT = 8000
const MAX_ITERAZIONI_AGENT = 6
const EMBED_MODEL = 'text-embedding-3-small'  // 1536 dim, allineato al corpus

// ═══════════════════════════════════════════════════════════════
// FONTI DEL CORPUS + MAPPATURA RPC
// ═══════════════════════════════════════════════════════════════
// Le 6 fonti che l'agent puo' interrogare. Ogni fonte ha:
//  - una o piu' RPC di ricerca vettoriale (in OR, deduplicati per id)
//  - un formattatore specifico per la citazione forense
// ═══════════════════════════════════════════════════════════════

type FonteCorpus =
  | 'norme'
  | 'norme_archivio'
  | 'giurisprudenza'
  | 'prassi'
  | 'norme_ue'
  | 'eur_lex'

const FONTI_VALIDE: FonteCorpus[] = [
  'norme', 'norme_archivio', 'giurisprudenza', 'prassi', 'norme_ue', 'eur_lex'
]

const FONTI_LABEL: Record<FonteCorpus, string> = {
  norme: 'Codici e norme primarie',
  norme_archivio: 'Leggi e decreti (archivio normativo)',
  giurisprudenza: 'Giurisprudenza (Cassazione e merito)',
  prassi: 'Prassi (circolari, risoluzioni, interpelli)',
  norme_ue: 'Normativa UE',
  eur_lex: 'Giurisprudenza UE (CGUE)',
}

// ─── EMBEDDING ───────────────────────────────────────────────────

async function generaEmbedding(testo: string): Promise<number[] | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: testo.slice(0, 8000),
      }),
    })
    if (!res.ok) {
      console.log(JSON.stringify({ evento: 'embedding_error', status: res.status }))
      return null
    }
    const data = await res.json()
    return data.data?.[0]?.embedding ?? null
  } catch (e: any) {
    console.log(JSON.stringify({ evento: 'embedding_exception', errore: e.message }))
    return null
  }
}

// ─── HELPER COMUNI ───────────────────────────────────────────────

function arr(v: any): any[] {
  return Array.isArray(v) ? v : []
}

// Tronca testo lungo per non gonfiare il prompt
function tronca(testo: string | null | undefined, max = 600): string {
  const t = (testo ?? '').trim()
  if (t.length <= max) return t
  return t.slice(0, max) + '...'
}

// ═══════════════════════════════════════════════════════════════
// HELPER PSEUDONIMIZZAZIONE — INLINE  (contesto strutturato)
// I nomi di cliente/controparti/legali/personale non escono in chiaro verso il
// provider AI: sostituiti con placeholder ⟦…⟧ prima dell'invio e ripristinati
// nello stream e nel documento finale. La mappa vive SOLO nella richiesta. Solo
// campi strutturati noti (nessun NER su testo libero). Delimitatori U+27E6/27E7.
// ═══════════════════════════════════════════════════════════════

const PSEUDO_OPEN = '⟦', PSEUDO_CLOSE = '⟧'

function _escRe(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

// ADATTATO a QUESTA funzione: il contesto è `contesto_pratica` con cliente.nome,
// controparti[].nome/.legale_nome e personale[].nome (equivalente dei "dipendenti"
// del template CH). Nessun `elementi_contesto` qui. Il professionista che redige
// (avvocato/commercialista) è l'utente stesso: NON va pseudonimizzato.
function raccogliEntita(pratica: any): Array<{ nome: string; ph: string }> {
  const coppie: Array<{ nome: string; ph: string }> = []
  const add = (nome: any, ph: string) => {
    const n = (nome ?? '').toString().trim()
    if (n.length >= 3 && !/^\d+$/.test(n)) coppie.push({ nome: n, ph: `${PSEUDO_OPEN}${ph}${PSEUDO_CLOSE}` })
  }
  if (pratica && typeof pratica === 'object') {
    if (pratica.cliente?.nome) add(pratica.cliente.nome, 'CLIENTE')
    for (let i = 0; i < (pratica.controparti ?? []).length; i++) {
      const c = pratica.controparti[i]
      add(c?.nome, `CONTROPARTE_${i + 1}`)
      add(c?.legale_nome, `LEGALE_${i + 1}`)
    }
    for (let i = 0; i < (pratica.personale ?? []).length; i++) {
      add(pratica.personale[i]?.nome, `PERSONALE_${i + 1}`)
    }
  }
  const seen = new Map<string, { nome: string; ph: string }>()
  for (const c of coppie) if (!seen.has(c.nome.toLowerCase())) seen.set(c.nome.toLowerCase(), c)
  return [...seen.values()].sort((a, b) => b.nome.length - a.nome.length)
}

function pseudonimizza(testo: string, mappa: Array<{ nome: string; ph: string }>): string {
  let out = testo
  for (const { nome, ph } of mappa) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${_escRe(nome)})(?=[^\\p{L}\\p{N}]|$)`, 'giu')
    out = out.replace(re, (_m, pre) => pre + ph)
  }
  return out
}

function creaDePseudo(mappa: Array<{ nome: string; ph: string }>) {
  const rev = new Map(mappa.map(({ nome, ph }) => [ph, nome]))
  let buf = ''
  const applica = (s: string) => { for (const [ph, nome] of rev) s = s.split(ph).join(nome); return s }
  return {
    push(chunk: string): string {
      buf += chunk
      const lastOpen = buf.lastIndexOf(PSEUDO_OPEN)
      let emit: string
      if (lastOpen === -1 || buf.indexOf(PSEUDO_CLOSE, lastOpen) !== -1) { emit = buf; buf = '' }
      else { emit = buf.slice(0, lastOpen); buf = buf.slice(lastOpen) }
      return applica(emit)
    },
    flush(): string { const o = applica(buf); buf = ''; return o },
  }
}

// De-pseudonimizzazione one-shot su stringa intera (documento finale: done + log).
function depseudo(testo: string, mappa: Array<{ nome: string; ph: string }>): string {
  let out = testo
  for (const { nome, ph } of mappa) out = out.split(ph).join(nome)
  return out
}

// ═══════════════════════════════════════════════════════════════
// FINE HELPER PSEUDONIMIZZAZIONE
// ═══════════════════════════════════════════════════════════════

// ─── RICERCA PER FONTE (RPC dirette) ─────────────────────────────
// Ogni funzione ritorna un array di stringhe gia' formattate come
// citazioni. Gestisce internamente gli errori (ritorna []).

// 1) NORME (codici primari) — cerca_norme_simili (versione ricca)
async function cercaNorme(embedding: number[]): Promise<string[]> {
  const { data, error } = await supabase.rpc('cerca_norme_simili', {
    query_embedding: embedding,
    match_threshold: 0.35,
    match_count: 6,
    filter_codice: null,
  })
  if (error) {
    console.log(JSON.stringify({ evento: 'rpc_error', fonte: 'norme', errore: error.message }))
    return []
  }
  return arr(data).map((r: any) => {
    const codice = r.codice ? `[${r.codice}]` : ''
    const art = r.articolo ? `art. ${r.articolo}` : '(articolo n/d)'
    const rubrica = r.rubrica ? ` — ${r.rubrica}` : ''
    return `${codice} ${art}${rubrica}\n${tronca(r.testo)}`
  })
}

// 2) NORME ARCHIVIO (leggi/decreti) — cerca_archivio_simili (no filtro vigenza)
async function cercaNormeArchivio(embedding: number[]): Promise<string[]> {
  const { data, error } = await supabase.rpc('cerca_archivio_simili', {
    query_embedding: embedding,
    match_threshold: 0.35,
    match_count: 6,
    filter_tipo_atto: null,
    filter_anno_min: null,
    filter_solo_vigenti: false,
  })
  if (error) {
    console.log(JSON.stringify({ evento: 'rpc_error', fonte: 'norme_archivio', errore: error.message }))
    return []
  }
  return arr(data).map((r: any) => {
    const tipo = (r.tipo_atto ?? '').toUpperCase()
    const num = r.numero_atto ?? ''
    const anno = r.anno_atto ?? ''
    const estremi = [tipo, num && `n. ${num}`, anno && `/${anno}`]
      .filter(Boolean).join(' ').replace(' /', '/')
    const art = r.articolo ? `art. ${r.articolo}` : ''
    const rubrica = r.rubrica ? ` — ${r.rubrica}` : ''
    return `[${estremi}] ${art}${rubrica}\n${tronca(r.testo)}`
  })
}

// 3) GIURISPRUDENZA — per_principio + per_oggetto + chunks (OR, dedup su id sentenza)
//    Ricerca trasversale: copre sentenze dove il concetto e' nel principio,
//    nell'oggetto, OPPURE solo nel testo pieno (chunks).
async function cercaGiurisprudenza(embedding: number[]): Promise<string[]> {
  const [resP, resO, resC] = await Promise.all([
    supabase.rpc('cerca_giurisprudenza_per_principio', {
      query_embedding: embedding, match_threshold: 0.30, match_count: 6,
      filter_organo: null, filter_materia: null,
      filter_anno_min: null, filter_anno_max: null, filter_ids_esclusi: null,
    }),
    supabase.rpc('cerca_giurisprudenza_per_oggetto', {
      query_embedding: embedding, match_threshold: 0.30, match_count: 6,
      filter_organo: null, filter_materia: null,
      filter_anno_min: null, filter_anno_max: null, filter_ids_esclusi: null,
    }),
    supabase.rpc('cerca_giurisprudenza_chunks', {
      query_embedding: embedding, match_threshold: 0.30, match_count: 6,
      filter_organo: null, filter_anno_min: null, filter_ids_esclusi: null,
    }),
  ])

  if (resP.error) console.log(JSON.stringify({ evento: 'rpc_error', fonte: 'giuri_principio', errore: resP.error.message }))
  if (resO.error) console.log(JSON.stringify({ evento: 'rpc_error', fonte: 'giuri_oggetto', errore: resO.error.message }))
  if (resC.error) console.log(JSON.stringify({ evento: 'rpc_error', fonte: 'giuri_chunks', errore: resC.error.message }))

  // Dedup su id sentenza. per_principio/oggetto -> r.id ; chunks -> r.giurisprudenza_id
  const mappa = new Map<string, { sim: number; testo: string }>()
  function aggiungi(id: any, sim: number, testo: string) {
    if (id === null || id === undefined) return
    const k = String(id)
    const ex = mappa.get(k)
    if (!ex || sim > ex.sim) mappa.set(k, { sim, testo })
  }

  for (const r of arr(resP.data)) {
    const estremi = formattaEstremiGiuri(r)
    const corpo = r.principio_diritto ? tronca(r.principio_diritto, 700) : tronca(r.oggetto, 400)
    aggiungi(r.id, r.similarity ?? 0, `${estremi}\n${corpo}`)
  }
  for (const r of arr(resO.data)) {
    const estremi = formattaEstremiGiuri(r)
    const corpo = r.principio_diritto ? tronca(r.principio_diritto, 700) : tronca(r.oggetto, 400)
    aggiungi(r.id, r.similarity ?? 0, `${estremi}\n${corpo}`)
  }
  for (const r of arr(resC.data)) {
    const estremi = formattaEstremiGiuri(r)
    aggiungi(r.giurisprudenza_id, r.similarity ?? 0, `${estremi}\n${tronca(r.chunk_text, 600)}`)
  }

  return [...mappa.values()]
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 8)
    .map(x => x.testo)
}

function formattaEstremiGiuri(r: any): string {
  const organo = r.organo ?? 'Organo n/d'
  const sez = r.sezione ? `, ${r.sezione}` : ''
  const num = r.numero ? `n. ${r.numero}` : ''
  const anno = r.anno ? `/${r.anno}` : ''
  const numAnno = (num || anno) ? ` ${num}${anno}`.replace(' n. /', ' ') : ''
  return `${organo}${sez}${numAnno}`.trim()
}

// 4) PRASSI — per_oggetto + chunks (OR, dedup su id)
//    Ricerca trasversale come per giurisprudenza.
async function cercaPrassi(embedding: number[]): Promise<string[]> {
  const [resO, resC] = await Promise.all([
    supabase.rpc('cerca_prassi_per_oggetto', {
      query_embedding: embedding, match_threshold: 0.35, match_count: 6,
      filter_ente: null, filter_tipo_atto: null, filter_anno_min: null, filter_ids_esclusi: null,
    }),
    supabase.rpc('cerca_prassi_chunks', {
      query_embedding: embedding, match_threshold: 0.35, match_count: 6,
      filter_ente: null, filter_anno_min: null, filter_ids_esclusi: null,
    }),
  ])

  if (resO.error) console.log(JSON.stringify({ evento: 'rpc_error', fonte: 'prassi_oggetto', errore: resO.error.message }))
  if (resC.error) console.log(JSON.stringify({ evento: 'rpc_error', fonte: 'prassi_chunks', errore: resC.error.message }))

  const mappa = new Map<string, { sim: number; testo: string }>()
  function aggiungi(id: any, sim: number, testo: string) {
    if (id === null || id === undefined) return
    const k = String(id)
    const ex = mappa.get(k)
    if (!ex || sim > ex.sim) mappa.set(k, { sim, testo })
  }

  for (const r of arr(resO.data)) {
    const estremi = formattaEstremiPrassi(r)
    const corpo = r.sintesi ? tronca(r.sintesi, 600) : tronca(r.oggetto, 400)
    aggiungi(r.id, r.similarity ?? 0, `${estremi}\n${corpo}`)
  }
  for (const r of arr(resC.data)) {
    const estremi = formattaEstremiPrassi(r)
    aggiungi(r.prassi_id, r.similarity ?? 0, `${estremi}\n${tronca(r.testo_chunk, 600)}`)
  }

  return [...mappa.values()]
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 6)
    .map(x => x.testo)
}

function formattaEstremiPrassi(r: any): string {
  const fonte = r.fonte ?? r.ente ?? ''
  const tipo = r.tipo_atto ?? ''
  const num = r.numero ? `n. ${r.numero}` : ''
  const anno = r.anno ? `/${r.anno}` : ''
  const numAnno = `${num}${anno}`.replace('n. /', '')
  const oggetto = r.oggetto ? ` — ${tronca(r.oggetto, 120)}` : ''
  return `${fonte} ${tipo} ${numAnno}${oggetto}`.replace(/\s+/g, ' ').trim()
}

// 5) NORME UE — cerca_ue_simili
async function cercaNormeUe(embedding: number[]): Promise<string[]> {
  const { data, error } = await supabase.rpc('cerca_ue_simili', {
    query_embedding: embedding,
    match_threshold: 0.35,
    match_count: 5,
    filter_tipo_atto: null,
    filter_anno_min: null,
    filter_eurovoc_ids: null,
  })
  if (error) {
    console.log(JSON.stringify({ evento: 'rpc_error', fonte: 'norme_ue', errore: error.message }))
    return []
  }
  return arr(data).map((r: any) => {
    const tipo = r.tipo_atto ?? ''
    const num = r.numero_atto ?? ''
    const anno = r.anno_atto ?? ''
    const celex = r.celex ? ` (CELEX ${r.celex})` : ''
    const titolo = r.titolo_breve ?? r.titolo_doc ?? ''
    const art = r.articolo ? `art. ${r.articolo}` : ''
    const rubrica = r.rubrica ? ` — ${r.rubrica}` : ''
    return `${tipo} ${num}/${anno}${celex} ${art}${rubrica}\n${tronca(titolo, 200)}\n${tronca(r.testo)}`.trim()
  })
}

// 6) EUR-LEX (CGUE) — cerca_eur_lex_per_oggetto
async function cercaEurLex(embedding: number[]): Promise<string[]> {
  const { data, error } = await supabase.rpc('cerca_eur_lex_per_oggetto', {
    query_embedding: embedding,
    match_threshold: 0.35,
    match_count: 5,
    filter_tipo: null,
    filter_anno_min: null,
    filter_anno_max: null,
    filter_ids_esclusi: null,
  })
  if (error) {
    console.log(JSON.stringify({ evento: 'rpc_error', fonte: 'eur_lex', errore: error.message }))
    return []
  }
  return arr(data).map((r: any) => {
    const organo = r.organo ?? 'CGUE'
    const caso = r.numero_caso ? `causa ${r.numero_caso}` : ''
    const ecli = r.ecli ? ` (${r.ecli})` : ''
    const data_dec = r.data_decisione ? ` del ${r.data_decisione}` : ''
    const oggetto = r.oggetto ? tronca(r.oggetto, 500) : ''
    return `${organo} ${caso}${ecli}${data_dec}\n${oggetto}`.trim()
  })
}

// ─── DISPATCHER: cerca_in_corpus con fonti in parallelo ──────────

const RICERCA_PER_FONTE: Record<FonteCorpus, (e: number[]) => Promise<string[]>> = {
  norme: cercaNorme,
  norme_archivio: cercaNormeArchivio,
  giurisprudenza: cercaGiurisprudenza,
  prassi: cercaPrassi,
  norme_ue: cercaNormeUe,
  eur_lex: cercaEurLex,
}

async function eseguiCercaInCorpus(
  query: string,
  fonti: FonteCorpus[],
  requestId: string
): Promise<string> {
  // Normalizza: tieni solo fonti valide; se vuoto, default norme+giurisprudenza
  let fontiPulite = (Array.isArray(fonti) ? fonti : [])
    .filter((f): f is FonteCorpus => FONTI_VALIDE.includes(f as FonteCorpus))
  if (fontiPulite.length === 0) {
    fontiPulite = ['norme', 'giurisprudenza']
  }

  const embedding = await generaEmbedding(query)
  if (!embedding) {
    return '[Errore: impossibile generare embedding per la ricerca. Riprova con una query diversa.]'
  }

  console.log(JSON.stringify({
    evento: 'cerca_in_corpus',
    request_id: requestId,
    query: query.slice(0, 120),
    fonti: fontiPulite,
  }))

  // Lancia in parallelo solo le fonti scelte
  const risultatiPerFonte = await Promise.all(
    fontiPulite.map(async (fonte) => {
      try {
        const risultati = await RICERCA_PER_FONTE[fonte](embedding)
        return { fonte, risultati }
      } catch (e: any) {
        console.log(JSON.stringify({ evento: 'fonte_exception', fonte, errore: e.message }))
        return { fonte, risultati: [] as string[] }
      }
    })
  )

  // Componi il blocco testuale etichettato per fonte
  let out = ''
  let totaleRisultati = 0
  for (const { fonte, risultati } of risultatiPerFonte) {
    if (risultati.length === 0) continue
    totaleRisultati += risultati.length
    out += `\n### ${FONTI_LABEL[fonte]}\n\n`
    risultati.forEach((r, i) => {
      out += `${i + 1}. ${r}\n\n`
    })
  }

  if (totaleRisultati === 0) {
    return `Nessun risultato trovato nel corpus per "${query}" nelle fonti: ${fontiPulite.join(', ')}. Prova a riformulare la query con termini giuridici diversi, oppure procedi citando i riferimenti che conosci con il marcatore [VERIFICARE: ...].`
  }

  return `Risultati dal corpus Lexum per "${query}":\n${out}`.trim()
}

// ═══════════════════════════════════════════════════════════════
// LISTA 12 TIPI DOCUMENTO + GUIDE AGENT
// Mantenere allineata (sui CODICI) con la lista in lex-pratica.
// Ogni tipo ha "fonti_consigliate": pre-orienta l'agent.
// ═══════════════════════════════════════════════════════════════

type CategoriaDocumento =
  | 'stragiudiziale' | 'introduttivo' | 'difensivo'
  | 'istruttorio' | 'esecutivo' | 'impugnazione'
  | 'fiscale'

interface TipoDocumento {
  codice: string
  nome: string
  categoria: CategoriaDocumento
  descrizione_breve: string
  fonti_consigliate: FonteCorpus[]
  guida_agent: string
}

const TIPI_DOCUMENTO: TipoDocumento[] = [
  // ─── STRAGIUDIZIALI ──────────────────────────────────────────
  {
    codice: 'diffida',
    nome: 'Diffida e messa in mora',
    categoria: 'stragiudiziale',
    descrizione_breve: 'Intimazione formale di adempimento entro un termine',
    fonti_consigliate: ['norme', 'norme_archivio'],
    guida_agent: `Atto stragiudiziale di intimazione formale al debitore di adempiere entro un termine perentorio.

STRUTTURA TIPICA:
1. Carta intestata dello studio (avvocato, foro, albo, PEC)
2. Luogo e data
3. Modalita' di invio (PEC e/o raccomandata A/R)
4. Destinatario con dati anagrafici completi
5. Oggetto: "Diffida e messa in mora"
6. Premessa che identifica l'avvocato come legale del cliente
7. PREMESSO CHE: esposizione cronologica dei fatti (origine del credito, prestazioni rese, scadenza, mancato pagamento)
8. TANTO PREMESSO: fondamento giuridico della pretesa
9. DIFFIDA E INTIMA: richiesta operativa con importo (capitale + interessi + spese) e IBAN per pagamento
10. Termine perentorio espresso in giorni e in lettere
11. AVVERTE: conseguenze in caso di inadempimento (azione giudiziaria, interessi, spese)
12. Riserva di azione e formule di chiusura
13. Sottoscrizione avvocato

FONTI: cerca_in_corpus su 'norme' per costituzione in mora, interessi moratori; 'norme_archivio' per la disciplina sui ritardi nei pagamenti commerciali (B2B). Cerca SEMPRE gli articoli aggiornati prima di citarli, non assumere numeri a memoria.

VINCOLI STILISTICI:
- Tono fermo, professionale, mai minaccioso
- Lingua forense italiana di registro alto
- Periodi paragrafati, niente elenchi puntati nel corpo
- Persona giuridica: "Spett.le [Ragione sociale], in persona del legale rappresentante pro tempore..."
- Persona fisica: "Egr. Sig./Sig.ra [Nome] [Cognome], nato/a a..., C.F..., residente in..."
- Mai disclaimer "consulta un avvocato" (l'utente E' un avvocato)

DATI MANCANTI: usa [DATO MANCANTE: descrizione] e genera comunque il documento completo nelle parti che hai.`
  },
  {
    codice: 'parere_legale',
    nome: 'Parere legale motivato',
    categoria: 'stragiudiziale',
    descrizione_breve: 'Parere pro veritate al cliente su una questione giuridica',
    fonti_consigliate: ['norme', 'norme_archivio', 'giurisprudenza', 'prassi'],
    guida_agent: `Parere legale rivolto al cliente (NON a una controparte). Analisi giuridica motivata che risponde a un quesito.

STRUTTURA TIPICA:
1. Carta intestata dello studio
2. Data, formula "Riservato e personale"
3. Destinatario: il CLIENTE
4. Oggetto: "Parere legale pro veritate" / "orientativo" / "strategico"
5. QUESITO: riformulazione in termini giuridici della domanda del cliente
6. FATTI PACIFICI E DOCUMENTAZIONE ESAMINATA
7. QUADRO NORMATIVO APPLICABILE: norme rilevanti
8. ANALISI GIURIDICA: applicazione delle norme ai fatti, con richiami giurisprudenziali
9. CRITICITA' E RISCHI: elementi probatori carenti, orientamenti contrari, costi/tempi
10. CONCLUSIONE: risposta chiara al quesito + indicazioni operative
11. Clausola di stile: "salvo diverso orientamento che dovesse emergere..."
12. Sottoscrizione avvocato

FONTI: e' l'atto piu' completo. Cerca su 'norme' e 'norme_archivio' per il quadro normativo, 'giurisprudenza' per gli orientamenti, 'prassi' se materia fiscale/tributaria/lavoro (circolari, risoluzioni, interpelli). Per profili UE usa 'norme_ue'/'eur_lex'.

TONO: equilibrato e onesto, comprensibile anche a non giurista. "Lei"/"la S.V." per il cliente.

DATI MANCANTI: [DATO MANCANTE: ...] inline.`
  },

  // ─── INTRODUTTIVI ────────────────────────────────────────────
  {
    codice: 'atto_citazione_civile',
    nome: 'Atto di citazione civile',
    categoria: 'introduttivo',
    descrizione_breve: 'Atto introduttivo del giudizio civile ordinario',
    fonti_consigliate: ['norme', 'giurisprudenza', 'norme_archivio'],
    guida_agent: `Atto introduttivo di un giudizio civile ordinario. Sara' notificato e depositato.

STRUTTURA TIPICA:
1. Intestazione: "TRIBUNALE ORDINARIO DI [...]" (e sezione se nota)
2. Titolo: "ATTO DI CITAZIONE"
3. Epigrafe: "PER" [attore con dati, avvocato, domiciliazione, PEC] - "ATTORE -"
4. "CONTRO" [convenuti con dati] - "CONVENUTI -"
5. OGGETTO: sintesi del petitum
6. Valore della causa
7. SVOLGIMENTO DEI FATTI: capoversi numerati, cronologici
8. MOTIVI DI DIRITTO: norme applicabili e orientamenti giurisprudenziali
9. QUANTIFICAZIONE DEL DANNO (se monetaria)
10. CONCLUSIONI: "Voglia l'Ill.mo Tribunale, contrariis reiectis,..." con domande in lettere
11. ISTANZE ISTRUTTORIE
12. CITAZIONE: "CITA [convenuti] a comparire avanti..." con data udienza e avvertimenti ex art. 163 c.p.c.
13. Valore per Contributo Unificato
14. Allegati
15. Luogo, data, sottoscrizione

FONTI: 'norme' per gli articoli sostanziali e processuali (es. art. 163 c.p.c., norme civili della fattispecie); 'giurisprudenza' E' ESSENZIALE per gli orientamenti su materie come responsabilita' medica, contrattuale, ecc. — cerca i principi di diritto e richiamali ("secondo l'orientamento consolidato..."). 'norme_archivio' per leggi speciali.

VINCOLI CRITICI:
- Art. 163 c.p.c.: elementi a pena di nullita', trattali con cura
- Termini di comparizione: verifica nel corpus la disciplina post Cartabia, usa [VERIFICARE: ...] se incerto
- NON inventare numeri di sentenza: usa quelli che il corpus ti restituisce, o formule generali
- Dati mancanti: [DATO MANCANTE: ...]`
  },
  {
    codice: 'ricorso_decreto_ingiuntivo',
    nome: 'Ricorso per decreto ingiuntivo',
    categoria: 'introduttivo',
    descrizione_breve: 'Procedimento monitorio per crediti liquidi ed esigibili',
    fonti_consigliate: ['norme', 'norme_archivio'],
    guida_agent: `Ricorso al Presidente del Tribunale per decreto ingiuntivo. Procedura sommaria, contraddittorio differito.

REQUISITI: credito CERTO, LIQUIDO, ESIGIBILE + PROVA SCRITTA (fatture + estratto contabile, parcella vistata, ricognizione di debito, scrittura privata autenticata).

STRUTTURA TIPICA:
1. "TRIBUNALE ORDINARIO DI [...]"
2. "RICORSO PER DECRETO INGIUNTIVO"
3. "PER" [ricorrente] - "RICORRENTE -" / "NEI CONFRONTI DI" [debitore] - "INGIUNGENDO -"
4. ESPOSIZIONE DEI FATTI E DEL RAPPORTO
5. FONDAMENTO DEL CREDITO E PROVA SCRITTA: dimostrazione requisiti + descrizione prova
6. QUANTIFICAZIONE: capitale + interessi (legali / moratori commerciali B2B / convenzionali) + spese
7. ISTANZA DI PROVVISORIA ESECUTIVITA' (se richiesta)
8. CONCLUSIONI: "...ingiungere a [...] di pagare entro il termine di legge la somma di EUR [...], oltre interessi e spese..."
9. Documenti offerti (allegati numerati)
10. Valore per CU (dimezzato per monitorio)
11. Luogo, data, sottoscrizione

FONTI: 'norme' per procedimento monitorio (art. 633 ss. c.p.c.) e interessi; 'norme_archivio' per la disciplina sui ritardi di pagamento nelle transazioni commerciali. Cerca gli articoli prima di citarli.

VINCOLI:
- Importo ESATTO, mai "da determinarsi"
- Numerare i documenti probatori
- Per crediti professionali: parcella vistata dall'ordine
- Verificare prescrizione`
  },

  // ─── DIFENSIVI ───────────────────────────────────────────────
  {
    codice: 'comparsa_costituzione_risposta',
    nome: 'Comparsa di costituzione e risposta',
    categoria: 'difensivo',
    descrizione_breve: 'Atto di costituzione del convenuto in giudizio civile',
    fonti_consigliate: ['norme', 'giurisprudenza'],
    guida_agent: `Atto con cui il convenuto si costituisce. ATTENZIONE alle decadenze: eccezioni in senso stretto, domanda riconvenzionale e chiamata di terzo vanno proposte qui a pena di decadenza.

STRUTTURA TIPICA:
1. Intestazione: Tribunale + R.G. + Giudice + data udienza
2. "COMPARSA DI COSTITUZIONE E RISPOSTA"
3. "PER" [convenuto] - "CONVENUTO -" / "CONTRO" [attore] - "ATTORE -"
4. PREMESSA: inquadramento + formula di costituzione tempestiva
5. CONTESTAZIONE SPECIFICA DEI FATTI (principio di non contestazione)
6. ECCEZIONI PROCESSUALI (preliminari)
7. ECCEZIONI DI MERITO (in senso stretto): prescrizione, compensazione, inadempimento, nullita' — A PENA DI DECADENZA
8. ARGOMENTI DIFENSIVI NEL MERITO
9. DOMANDA RICONVENZIONALE (se presente)
10. CHIAMATA IN CAUSA DI TERZO (se presente)
11. CONCLUSIONI con domande in lettere
12. ISTANZE ISTRUTTORIE
13. Allegati, luogo, data, sottoscrizione

FONTI: 'norme' per le norme processuali e sostanziali delle eccezioni; 'giurisprudenza' per gli orientamenti a sostegno delle difese (es. su prescrizione, riparto onere della prova).

VINCOLI: contesta specificamente ogni fatto rilevante. Articola l'eccezione di prescrizione (termine, decorrenza, motivo). Termini post Cartabia: [VERIFICARE: ...] se incerto.`
  },
  {
    codice: 'memoria_171_ter',
    nome: 'Memoria istruttoria 171-ter c.p.c.',
    categoria: 'difensivo',
    descrizione_breve: 'Memoria integrativa istruttoria post-Cartabia',
    fonti_consigliate: ['norme', 'giurisprudenza'],
    guida_agent: `Memoria istruttoria post Cartabia. I tre termini hanno funzioni DIVERSE e contenuto VINCOLATO.

CONTENUTO PER TERMINE:
- PRIMO: precisazione/modifica domande e conclusioni; nuove eccezioni conseguenza delle difese altrui. NO nuove domande.
- SECONDO: articolazione mezzi di prova (testi con capitoli, CTU, esibizione, interrogatorio formale). Termine ULTIMO per i mezzi.
- TERZO: prova CONTRARIA rispetto al secondo termine avversario.

STRUTTURA TIPICA:
1. Intestazione: Tribunale + R.G. + Giudice + data udienza
2. "MEMORIA ISTRUTTORIA EX ART. 171-TER C.P.C. - [primo/secondo/terzo] TERMINE"
3. "PER" [parte] (specifica ruolo) / "CONTRO" [controparti]
4. PREMESSA: quale termine
5. SVOLGIMENTO calibrato sul termine
6. CONCLUSIONI specifiche
7. CAPITOLI DI PROVA + TESTIMONI (solo secondo termine)
8. Sottoscrizione

FONTI: 'norme' per la disciplina dell'art. 171-ter e dei mezzi di prova; 'giurisprudenza' per ammissibilita'/rilevanza dei mezzi.

VINCOLI: niente ripetizione di citazione/comparsa. Capitoli specifici, "Vero che...". Non inventare nomi testimoni: [DATO MANCANTE: ...]. Termini (40/20/10 standard ma verifica nel corpus).`
  },

  // ─── ISTRUTTORI ──────────────────────────────────────────────
  {
    codice: 'istanza_ammissione_prove',
    nome: 'Istanza di ammissione mezzi di prova',
    categoria: 'istruttorio',
    descrizione_breve: 'Istanza al giudice per ammissione di prove istruttorie',
    fonti_consigliate: ['norme'],
    guida_agent: `Istanza per l'ammissione di specifici mezzi di prova. I capitoli sono il cuore: specifici, circostanziati, ammissibili.

STRUTTURA TIPICA:
1. Intestazione: Tribunale + R.G. + Giudice istruttore
2. "ISTANZA DI AMMISSIONE MEZZI ISTRUTTORI"
3. Epigrafe parti
4. PREMESSA PROCESSUALE: punti controversi
5. RILEVANZA DELLE PROVE: ammissibilita' e rilevanza di ogni mezzo
6. RICHIESTA AMMISSIONE: "Voglia l'Ill.mo Giudice istruttore ammettere: a)... b)..."
7. CAPITOLI DI PROVA TESTIMONIALE
8. TESTIMONI: nome, cognome, residenza
9. QUESITI CTU (se richiesta)
10. Sottoscrizione

FONTI: 'norme' per prova testimoniale, CTU, esibizione (art. 244 ss., 191 ss. c.p.c.).

VINCOLI: capitoli con "Vero che...", specifici e circostanziati (luogo/tempo/modalita'). Niente capitoli valutativi. Quesiti CTU tecnici non giuridici. Nomi/residenze mancanti: [DATO MANCANTE: ...].`
  },
  {
    codice: 'istanza_ctu',
    nome: 'Istanza di nomina CTU',
    categoria: 'istruttorio',
    descrizione_breve: "Istanza di nomina consulente tecnico d'ufficio",
    fonti_consigliate: ['norme'],
    guida_agent: `Istanza per la nomina di un CTU. Focalizzata sulla sola CTU.

STRUTTURA TIPICA:
1. Intestazione Tribunale + R.G.
2. "ISTANZA DI NOMINA CTU"
3. Epigrafe parti
4. PREMESSA: causa e ragione della necessita'
5. NECESSITA' DELL'ACCERTAMENTO TECNICO: questione tecnica fuori dalla scienza giuridica
6. SPECIALIZZAZIONE RICHIESTA: medico-legale, contabile, informatica forense, ingegneria, ecc.
7. QUESITI PROPOSTI: tecnici, specifici, a risposta determinata
8. CONCLUSIONI
9. Sottoscrizione

FONTI: 'norme' per la disciplina della CTU (art. 191 ss. c.p.c.).

VINCOLI: i quesiti NON chiedono valutazioni giuridiche ("dica se l'opera presenta i vizi e quantifichi il ripristino" giusto; "dica se c'e' inadempimento" sbagliato). Formula: "Ci si rimette alla diversa formulazione che il Giudice vorra' adottare".`
  },

  // ─── ESECUTIVI ───────────────────────────────────────────────
  {
    codice: 'atto_precetto',
    nome: 'Atto di precetto',
    categoria: 'esecutivo',
    descrizione_breve: "Atto preliminare all'esecuzione forzata",
    fonti_consigliate: ['norme'],
    guida_agent: `Atto preliminare all'esecuzione forzata. Intima l'adempimento entro 10 giorni; poi si procede a pignoramento.

REQUISITI: titolo esecutivo (sentenza, decreto ingiuntivo con formula esecutiva, atto pubblico, ecc.).

STRUTTURA TIPICA:
1. "ATTO DI PRECETTO"
2. "Su istanza di" [creditore] - "CREDITORE PROCEDENTE -"
3. "SI INTIMA E FA PRECETTO A" [debitore] - "DEBITORE ESECUTATO -"
4. PREMESSO: descrizione del titolo (tipo, autorita', numero, data, formula, notifica)
5. CALCOLO DEL CREDITO: capitale + interessi (tasso e periodo) + spese = TOTALE
6. INTIMA E FA PRECETTO: "...di pagare entro il termine perentorio di GIORNI DIECI (10) dalla notifica la somma di EUR [...], oltre interessi e spese, mediante bonifico su IBAN [...]"
7. AVVERTIMENTO: in mancanza, esecuzione forzata
8. AVVERTIMENTI EX ART. 480 C.P.C. (a pena di nullita'): opposizione, mediazione/negoziazione assistita, composizione crisi sovraindebitamento
9. ELEZIONE DI DOMICILIO
10. Luogo, data, sottoscrizione + richiesta notifica all'UG

FONTI: 'norme' per titolo esecutivo e contenuto del precetto (art. 480 c.p.c.). Cerca la disciplina aggiornata.

VINCOLI: importi ESATTI ([DATO MANCANTE: ...] se mancano dati per il calcolo). Avvertimento ex art. 480 obbligatorio a pena di nullita'. "GIORNI DIECI (10)" termine fisso.`
  },
  {
    codice: 'pignoramento_presso_terzi',
    nome: 'Pignoramento presso terzi',
    categoria: 'esecutivo',
    descrizione_breve: 'Atto di pignoramento ex art. 543 c.p.c.',
    fonti_consigliate: ['norme'],
    guida_agent: `Pignoramento delle somme che il terzo (banca, datore di lavoro, ecc.) deve al debitore. Ex art. 543 ss. c.p.c.

REQUISITI: titolo esecutivo + precetto notificato e scaduto (10gg) + individuazione del terzo.

STRUTTURA TIPICA:
1. "ATTO DI PIGNORAMENTO PRESSO TERZI"
2. "Ad istanza di" [creditore] - "CREDITORE PROCEDENTE -"
3. "A" [terzo pignorato] / "E A" [debitore esecutato]
4. PREMESSO: titolo esecutivo + precetto (notifica, importo, decorrenza)
5. CITAZIONE DEL TERZO: intima di non disporre delle somme nei limiti dell'importo precettato aumentato della meta'
6. INVITO AL TERZO ex art. 547 c.p.c.: dichiarare entro il termine se e quanto deve
7. CITAZIONE DEL DEBITORE all'udienza
8. INDICAZIONE DELL'UDIENZA avanti il GE
9. AVVERTIMENTI ex art. 543 c.p.c.
10. Luogo, data, sottoscrizione

FONTI: 'norme' per pignoramento presso terzi, soglie di impignorabilita' (art. 543, 545, 547 c.p.c.). Cerca gli articoli.

VINCOLI: importo = precettato + 1/2. Per stipendio/pensione: limiti del quinto (art. 545). Verifica titolo, formula, notifica precetto.`
  },

  // ─── IMPUGNAZIONI ────────────────────────────────────────────
  {
    codice: 'atto_appello_civile',
    nome: 'Atto di appello civile',
    categoria: 'impugnazione',
    descrizione_breve: 'Impugnazione di sentenza di primo grado',
    fonti_consigliate: ['norme', 'giurisprudenza'],
    guida_agent: `Impugnazione di sentenza di primo grado avanti la Corte di Appello. ART. 342 c.p.c.: MOTIVI SPECIFICI a pena di inammissibilita'.

STRUTTURA TIPICA:
1. "CORTE DI APPELLO DI [...]"
2. "ATTO DI APPELLO" (o "INCIDENTALE")
3. "PER" [appellante] - "APPELLANTE -" / "CONTRO" [appellati] - "APPELLATI -"
4. SENTENZA IMPUGNATA: estremi (giudice, numero, data, R.G.) + tempestivita'
5. SVOLGIMENTO DEL GIUDIZIO DI PRIMO GRADO
6. CAPI DELLA SENTENZA IMPUGNATI
7. MOTIVI SPECIFICI: "PRIMO MOTIVO", "SECONDO MOTIVO"... per ciascuno: capo criticato + cosa ha statuito + perche' errato + cosa si chiede in riforma
8. ISTANZA DI INIBITORIA (se richiesta)
9. CONCLUSIONI: "...in riforma della sentenza impugnata,..."
10. CITAZIONE IN APPELLO
11. Valore (CU doppio)
12. Allegati (sentenza impugnata)
13. Sottoscrizione

FONTI: 'norme' per appello, motivi specifici, termini (art. 342, 345 c.p.c.); 'giurisprudenza' ESSENZIALE per mostrare che la sentenza ha deciso contro l'orientamento consolidato — cerca i principi e contrapponili alla motivazione impugnata.

VINCOLI: art. 342 (motivi specifici), art. 345 (no nuove domande/prove salvo indispensabili). Tono critico ma rispettoso. Termini: cerca nel corpus.`
  },
  {
    codice: 'reclamo_cautelare',
    nome: 'Reclamo cautelare',
    categoria: 'impugnazione',
    descrizione_breve: 'Reclamo contro provvedimenti cautelari ex art. 669-terdecies c.p.c.',
    fonti_consigliate: ['norme', 'giurisprudenza'],
    guida_agent: `Reclamo contro ordinanza cautelare (sequestro, inibitoria, provvedimento d'urgenza ex art. 700). Al collegio o alla Corte d'Appello. Termine 15gg (verifica).

STRUTTURA TIPICA:
1. "TRIBUNALE DI [...] IN COMPOSIZIONE COLLEGIALE" (o Corte d'Appello)
2. "RECLAMO EX ART. 669-TERDECIES C.P.C."
3. "PER" [reclamante] / "CONTRO" [reclamato]
4. ORDINANZA RECLAMATA: estremi + tempestivita'
5. PREMESSA: oggetto del cautelare, fumus e periculum, ordinanza adottata
6. MOTIVI DEL RECLAMO: per ciascuno capo criticato + perche' errato (errata valutazione fumus/periculum, errore sulla misura, error in procedendo)
7. CONCLUSIONI: "...riformare/revocare l'ordinanza..."
8. Eventuale istanza di sospensione dell'esecutivita'
9. Allegati (ordinanza impugnata)
10. Sottoscrizione

FONTI: 'norme' per procedimento cautelare uniforme, reclamo, sospensione (art. 669-terdecies ss. c.p.c.); 'giurisprudenza' per gli orientamenti su fumus/periculum nella materia specifica.

VINCOLI: e' riesame della fase cautelare, non nuovo merito. Tono critico tecnico, mai polemico. Dati mancanti: [DATO MANCANTE: ...].`
  },
  // ─── FISCALI ─────────────────────────────────────────────────
  {
    codice: 'parere_fiscale',
    nome: 'Parere fiscale',
    categoria: 'fiscale',
    descrizione_breve: 'Parere professionale su questione fiscale o tributaria',
    fonti_consigliate: ['norme', 'prassi', 'giurisprudenza'],
    guida_agent: `Parere professionale del commercialista su una questione fiscale/tributaria. Registro tecnico ma leggibile dal cliente.

STRUTTURA TIPICA:
1. Carta intestata dello studio
2. "PARERE IN MATERIA FISCALE" + oggetto sintetico
3. QUESITO: la domanda posta dal cliente, riformulata con precisione
4. FATTI RILEVANTI: la situazione concreta (dati dal contesto del mandato: regime, attivita', numeri)
5. QUADRO NORMATIVO: le disposizioni applicabili (TUIR, DPR 633/72, ecc.)
6. PRASSI: circolari e risoluzioni dell'Agenzia delle Entrate pertinenti
7. ANALISI: applicazione delle norme al caso concreto, alternative possibili
8. CONCLUSIONI OPERATIVE: risposta netta al quesito + adempimenti conseguenti
9. AVVERTENZE: limiti del parere, elementi da verificare
10. Luogo, data, sottoscrizione (Dott.)

FONTI: 'norme' per la normativa tributaria; 'prassi' per circolari/risoluzioni AdE; 'giurisprudenza' per orientamenti di Cassazione tributaria se pertinenti.

VINCOLI: MAI inventare aliquote, soglie o termini: se un valore non emerge dal corpus o dal contesto, scrivere [VERIFICARE: ...]. Le conclusioni devono essere operative, non accademiche.`
  },
  {
    codice: 'rendiconto_contabile',
    nome: 'Rendiconto contabile periodico',
    categoria: 'fiscale',
    descrizione_breve: 'Rendiconto della situazione contabile del cliente nel periodo',
    fonti_consigliate: [],
    guida_agent: `Rendiconto periodico della situazione contabile ed economica del cliente, destinato al cliente stesso. Chiaro, ordinato, senza gergo inutile.

STRUTTURA TIPICA:
1. Carta intestata dello studio
2. "RENDICONTO CONTABILE" + cliente + periodo di riferimento
3. SINTESI: entrate, uscite e saldo del periodo (dai dati del contesto)
4. COMPOSIZIONE: principali voci di entrata e di uscita per categoria
5. POSIZIONE IVA: debito/credito emergente, prossime liquidazioni
6. COSTO DEL PERSONALE: se presente nel contesto, sintesi del costo aziendale
7. SCADENZE IMMINENTI: adempimenti in arrivo dal contesto
8. NOTE E RACCOMANDAZIONI dello studio
9. Luogo, data, sottoscrizione (Dott.)

FONTI: nessuna ricerca nel corpus necessaria di norma: il rendiconto si basa sui dati del mandato.

VINCOLI: usare ESCLUSIVAMENTE i numeri presenti nel contesto del mandato. MAI stimare o inventare importi: se un dato manca, scrivere [DATO MANCANTE: ...]. Formattare gli importi in euro con due decimali.`
  },
  {
    codice: 'lettera_cliente',
    nome: 'Lettera al cliente',
    categoria: 'fiscale',
    descrizione_breve: 'Comunicazione professionale al cliente (richieste, informative, esiti)',
    fonti_consigliate: [],
    guida_agent: `Lettera professionale dello studio al cliente: richiesta di documentazione, informativa su un adempimento, comunicazione di un esito. Tono cortese, diretto, professionale.

STRUTTURA TIPICA:
1. Carta intestata dello studio
2. Destinatario (il cliente del mandato)
3. Luogo e data
4. OGGETTO: sintetico e specifico
5. Corpo: contesto in 1-2 frasi, poi il punto della comunicazione
6. Se richieste: elenco puntato dei documenti/informazioni necessari, con eventuale termine
7. Disponibilita' dello studio per chiarimenti
8. Saluti e sottoscrizione (Dott.)

FONTI: di norma nessuna; 'norme' solo se serve citare la fonte di un obbligo.

VINCOLI: breve (una pagina). Niente formule arcaiche; italiano professionale contemporaneo. Le richieste devono essere azionabili (cosa, come, entro quando).`
  },
  {
    codice: 'comunicazione_scadenze',
    nome: 'Comunicazione scadenze fiscali',
    categoria: 'fiscale',
    descrizione_breve: 'Promemoria al cliente delle scadenze fiscali del periodo',
    fonti_consigliate: ['norme'],
    guida_agent: `Comunicazione al cliente con il quadro delle scadenze fiscali imminenti e cosa serve allo studio per adempiervi.

STRUTTURA TIPICA:
1. Carta intestata dello studio
2. Destinatario + oggetto ("Scadenze fiscali del periodo ...")
3. Breve premessa
4. ELENCO SCADENZE: per ciascuna — data, adempimento, cosa comporta (versamento/dichiarazione), eventuale importo se noto dal contesto
5. DOCUMENTAZIONE RICHIESTA: cosa il cliente deve far pervenire allo studio e entro quando
6. Avvertenza sulle conseguenze del mancato rispetto dei termini (sobria, non allarmistica)
7. Saluti e sottoscrizione (Dott.)

FONTI: 'norme' solo per riferimenti normativi degli adempimenti, se utili.

VINCOLI: elencare SOLO le scadenze presenti nel contesto del mandato, con le date esatte. MAI aggiungere scadenze non presenti nel contesto. Ordinare per data crescente.`
  },
  {
    codice: 'relazione_bilancio',
    nome: 'Relazione sulla situazione contabile',
    categoria: 'fiscale',
    descrizione_breve: 'Relazione di accompagnamento alla situazione contabile/bilancio',
    fonti_consigliate: ['norme'],
    guida_agent: `Relazione professionale di accompagnamento alla situazione contabile o al bilancio del cliente. Linguaggio civilistico-contabile, sobrio.

STRUTTURA TIPICA:
1. Carta intestata dello studio
2. "RELAZIONE SULLA SITUAZIONE CONTABILE" + cliente + esercizio/periodo
3. PREMESSA: incarico ricevuto e perimetro della relazione
4. CRITERI: base dei dati utilizzati (contabilita' del mandato) e loro limiti
5. ANDAMENTO DELLA GESTIONE: ricavi, costi e risultato del periodo (dati dal contesto)
6. SITUAZIONE PATRIMONIALE E FINANZIARIA: sintesi se i dati sono disponibili nel contesto
7. POSIZIONE FISCALE: IVA e principali debiti/crediti tributari emergenti
8. COSTO DEL PERSONALE: se presente
9. CONCLUSIONI
10. Luogo, data, sottoscrizione (Dott.)

FONTI: 'norme' per eventuali riferimenti agli artt. 2423 ss. c.c., se pertinenti.

VINCOLI: dati ESCLUSIVAMENTE dal contesto del mandato; dove il dato non c'e', [DATO MANCANTE: ...]. Nessuna asseverazione o attestazione: e' una relazione informativa dello studio, dichiararlo nella premessa.`
  },
]

const MAPPA_TIPI = new Map(TIPI_DOCUMENTO.map(t => [t.codice, t]))

// ─── TELEMETRIA ──────────────────────────────────────────────────

type LexEsito = 'ok' | 'error' | 'rate_limit' | 'no_credits' | 'rejected' | 'timeout'
type LexQualita = 'alta' | 'media' | 'bassa' | 'nulla'

interface LexLogParams {
  user_id: string | null
  studio_id?: string | null
  request_id: string
  parent_log_id?: string | null
  endpoint: string
  azione?: string | null
  domanda?: string | null
  conversazione_id?: string | null
  modello?: string | null
  token_input?: number
  token_output?: number
  token_cached?: number
  durata_ms?: number
  iterazioni?: number
  tool_usati?: string[] | null
  esito?: LexEsito
  errore?: string | null
  qualita_retrieval?: LexQualita | null
  principali_count?: number | null
  credito_scalato?: boolean
  metadati?: Record<string, unknown> | null
  risposta_text?: string | null
}

// La RPC si chiama 'lex_logs_insert'. Firma a 22 parametri, identica al
// synthesizer. p_risposta_text salva il testo generato (qui: il documento).
async function logLexCall(params: LexLogParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('lex_logs_insert', {
      p_user_id: params.user_id,
      p_studio_id: params.studio_id ?? null,
      p_request_id: params.request_id,
      p_parent_log_id: params.parent_log_id ?? null,
      p_endpoint: params.endpoint,
      p_azione: params.azione ?? null,
      p_domanda: params.domanda ?? null,
      p_conversazione_id: params.conversazione_id ?? null,
      p_modello: params.modello ?? null,
      p_token_input: params.token_input ?? 0,
      p_token_output: params.token_output ?? 0,
      p_token_cached: params.token_cached ?? 0,
      p_durata_ms: params.durata_ms ?? null,
      p_iterazioni: params.iterazioni ?? 1,
      p_tool_usati: params.tool_usati ?? null,
      p_esito: params.esito ?? 'ok',
      p_errore: params.errore ?? null,
      p_qualita_retrieval: params.qualita_retrieval ?? null,
      p_principali_count: params.principali_count ?? null,
      p_credito_scalato: params.credito_scalato ?? false,
      p_metadati: params.metadati ?? null,
      p_risposta_text: params.risposta_text ?? null,
    })
    if (error) {
      console.log(JSON.stringify({ evento: 'log_error', errore: error.message }))
      return null
    }
    return data ?? null
  } catch (e: any) {
    console.log(JSON.stringify({ evento: 'log_exception', errore: e.message }))
    return null
  }
}

function nuovoRequestId(): string {
  return crypto.randomUUID()
}

// ─── CREDITI ─────────────────────────────────────────────────────

interface CreditiInfo {
  disponibili: boolean
  crediti_rimasti: number
  crediti_row_id?: string
  crediti_usati?: number
}

async function verificaCrediti(userId: string): Promise<CreditiInfo> {
  const { data } = await supabase
    .from('crediti_ai')
    .select('id, crediti_totali, crediti_usati, periodo_fine, tipo')
    .eq('user_id', userId)

  if (!data || data.length === 0) return { disponibili: false, crediti_rimasti: 0 }

  const now = new Date()
  let totaleRimasti = 0
  let primaRigaUsabile: any = null

  const ordinePriorita: Record<string, number> = { piano: 1, benvenuto: 2, topup: 3 }
  const dataOrdinata = [...data].sort((a, b) =>
    (ordinePriorita[a.tipo] ?? 99) - (ordinePriorita[b.tipo] ?? 99)
  )

  for (const row of dataOrdinata) {
    const residui = row.crediti_totali - row.crediti_usati
    const scaduto = row.periodo_fine && new Date(row.periodo_fine) < now
    if (residui > 0 && !scaduto) {
      totaleRimasti += residui
      if (!primaRigaUsabile) primaRigaUsabile = row
    }
  }

  if (totaleRimasti <= 0 || !primaRigaUsabile) return { disponibili: false, crediti_rimasti: 0 }

  return {
    disponibili: true,
    crediti_rimasti: totaleRimasti,
    crediti_row_id: primaRigaUsabile.id,
    crediti_usati: primaRigaUsabile.crediti_usati,
  }
}

async function scalaCredito(
  userId: string, rowId: string | undefined, creditiUsatiAttuali: number | undefined
): Promise<void> {
  if (!rowId || creditiUsatiAttuali === undefined) return
  await supabase
    .from('crediti_ai')
    .update({ crediti_usati: creditiUsatiAttuali + 1 })
    .eq('id', rowId)
    .eq('user_id', userId)
}

// ─── COSTRUZIONE CONTESTO PER IL PROMPT ──────────────────────────

function costruisciContestoPratica(p: any): string {
  let s = ''

  s += `## Identita del caso\n`
  if (p.titolo) s += `**Titolo**: ${p.titolo}\n`
  if (p.tipo) s += `**Tipo di causa**: ${p.tipo}\n`
  if (p.stato) s += `**Stato**: ${p.stato}\n`
  if (p.cliente?.nome) s += `**Cliente**: ${p.cliente.nome}\n`
  if (p.regime_contabile) s += `**Regime contabile**: ${p.regime_contabile}\n`

  if (Array.isArray(p.scadenze) && p.scadenze.length > 0) {
    s += `\n## Scadenze fiscali\n`
    for (const sc of p.scadenze) {
      s += `- ${sc.data} — ${sc.titolo}`
      if (sc.tipo) s += ` [${sc.tipo}]`
      if (sc.stato) s += ` (${sc.stato})`
      s += `\n`
    }
  }

  if (p.conto_economico) {
    const ce = p.conto_economico
    s += `\n## Conto economico${ce.anno ? ' ' + ce.anno : ''}\n`
    s += `**Entrate**: EUR ${Number(ce.entrate ?? 0).toFixed(2)}\n`
    s += `**Uscite**: EUR ${Number(ce.uscite ?? 0).toFixed(2)}\n`
    s += `**Saldo**: EUR ${Number(ce.saldo ?? 0).toFixed(2)}\n`
    if (Array.isArray(ce.movimenti) && ce.movimenti.length > 0) {
      s += `\nUltimi movimenti:\n`
      for (const m of ce.movimenti) {
        s += `- ${m.data} ${m.tipo === 'entrata' ? '+' : '-'}${Number(m.importo ?? 0).toFixed(2)}`
        if (m.descrizione) s += ` — ${m.descrizione}`
        if (m.categoria) s += ` [${m.categoria}]`
        s += `\n`
      }
    }
  }

  if (Array.isArray(p.personale) && p.personale.length > 0) {
    s += `\n## Personale\n`
    for (const per of p.personale) {
      s += `- ${per.nome}${per.ruolo ? ` (${per.ruolo})` : ''}${per.dettaglio ? `: ${per.dettaglio}` : ''}\n`
    }
  }

  if (Array.isArray(p.controparti) && p.controparti.length > 0) {
    s += `\n## Controparti (${p.controparti.length})\n`
    for (let i = 0; i < p.controparti.length; i++) {
      const c = p.controparti[i]
      s += `${i + 1}. **${c.ruolo ?? 'controparte'}**: ${c.nome}`
      if (c.legale_nome) s += ` (legale: ${c.legale_nome}${c.legale_foro ? `, foro ${c.legale_foro}` : ''})`
      if (c.note) s += ` — note: ${c.note}`
      s += `\n`
    }
  }

  if (Array.isArray(p.cronologia_udienze) && p.cronologia_udienze.length > 0) {
    s += `\n## Cronologia udienze\n`
    for (const u of p.cronologia_udienze.slice(0, 5)) {
      const data = u.data ? new Date(u.data).toLocaleDateString('it-IT') : '?'
      s += `- ${data}: ${u.tipo ?? 'udienza'} [${u.stato ?? '?'}]`
      if (u.esito) s += ` — esito: ${u.esito}`
      s += `\n`
    }
  }

  if (p.prossima_udienza) {
    const pu = p.prossima_udienza
    const data = pu.data ? new Date(pu.data).toLocaleDateString('it-IT') : '?'
    s += `\n## Prossima udienza\n${data} — ${pu.tipo ?? 'udienza'}\n`
    if (pu.oggetto) s += `Oggetto: ${pu.oggetto}\n`
  }

  if (Array.isArray(p.documenti) && p.documenti.length > 0) {
    s += `\n## Documenti dell'archivio (${p.documenti.length})\n`
    s += `_Sotto trovi il testo estratto. Cita il contenuto specifico quando rilevante._\n\n`
    for (let i = 0; i < p.documenti.length; i++) {
      const d = p.documenti[i]
      const data = d.data ? new Date(d.data).toLocaleDateString('it-IT') : ''
      s += `### ${i + 1}. ${d.titolo ?? '(senza titolo)'}`
      if (d.tipo) s += ` _(${d.tipo})_`
      if (data) s += ` · ${data}`
      s += `\n`
      if (d.riassunto) s += `**Sintesi**: ${d.riassunto}\n`
      if (d.testo_estratto) s += `\n**Contenuto**:\n${d.testo_estratto}\n`
      s += `\n---\n`
    }
  }

  if (Array.isArray(p.chunks_rilevanti) && p.chunks_rilevanti.length > 0) {
    s += `\n## Passaggi rilevanti dai documenti della pratica\n`
    s += `_Estratti recuperati tramite ricerca semantica sui documenti della pratica._\n\n`
    for (const c of p.chunks_rilevanti) {
      s += `**Da "${c.doc_titolo ?? 'documento'}"** (rilevanza ${Math.round((c.similarity ?? 0) * 100)}%):\n`
      s += `> ${c.testo_chunk}\n\n`
    }
  }

  if (Array.isArray(p.ricerche) && p.ricerche.length > 0) {
    s += `\n## Ricerche gia' fatte sulla pratica (${p.ricerche.length})\n`
    s += `_Sono riassunti. Usali per orientarti su cosa l'avvocato ha gia' indagato, ma per CITARE recupera i riferimenti precisi dal corpus._\n\n`
    for (let i = 0; i < p.ricerche.length; i++) {
      const r = p.ricerche[i]
      s += `${i + 1}. **${r.titolo ?? '(senza titolo)'}**`
      if (r.tipo) s += ` _(${r.tipo})_`
      s += `\n`
      if (r.riassunto) s += `   ${r.riassunto}\n`
    }
  }

  return s
}

// ─── DATI PROFESSIONISTA (avvocato che redige) ───────────────────
// Iniettati in testa al contesto cosi' l'agent compila intestazione e
// sottoscrizione. I campi mancanti restano [DATO MANCANTE: ...].

function costruisciDatiProfessionista(p: any): string {
  if (!p) return ''
  const isCommercialista = p.role === 'commercialista'
  const titoloProf = isCommercialista ? 'Dott.' : 'Avv.'
  const nomeCompleto = [p.nome, p.cognome].filter(Boolean).join(' ').trim()
  let s = `## Dati del professionista che redige l'atto\n`
  s += `_Usa questi dati per l'intestazione (carta intestata) e la sottoscrizione. Se un campo manca, usa [DATO MANCANTE: ...]._\n`
  s += `**${isCommercialista ? 'Commercialista' : 'Avvocato'}**: ${nomeCompleto ? `${titoloProf} ${nomeCompleto}` : '[DATO MANCANTE: nome e cognome professionista]'}\n`
  if (!isCommercialista && p.foro) s += `**Foro**: ${p.foro}\n`
  if (p.numero_albo) s += `**Iscrizione Albo n.**: ${p.numero_albo}\n`
  if (p.pec) s += `**PEC**: ${p.pec}\n`
  if (p.email) s += `**Email**: ${p.email}\n`
  return s + '\n'
}

// ─── SYSTEM PROMPT ───────────────────────────────────────────────

function buildSystemPrompt(tipo: TipoDocumento): string {
  const fontiConsigliate = tipo.fonti_consigliate
    .map(f => `'${f}'`)
    .join(', ')

  return `Sei Lex, assistente AI giuridico di Lexum, una piattaforma per avvocati italiani.

Stai generando un atto legale specifico: **${tipo.nome}**.

# REGOLE ASSOLUTE

1. RAGIONA sul contesto della pratica fornito (cliente, controparti, udienze, documenti dell'archivio, passaggi rilevanti, ricerche gia' fatte). NON inventare fatti, persone, date che non sono nei dati forniti.
2. Sii CONCRETO: usa nomi, date, riferimenti specifici della pratica.
3. Se mancano dati essenziali, NON bloccare: usa il marcatore [DATO MANCANTE: descrizione specifica] inline e prosegui.
4. Per i riferimenti normativi e giurisprudenziali: usa il tool \`cerca_in_corpus\` per recuperarli aggiornati dal corpus Lexum PRIMA di citarli. NON citare numeri di articoli o sentenze a memoria.
5. NON inventare giurisprudenza. Cita solo le sentenze che il corpus ti restituisce. Se serve un orientamento che non trovi, usa una formula generale ("secondo l'orientamento consolidato...") oppure [VERIFICARE: ...].
6. Lingua forense italiana di registro alto. Nessun disclaimer, nessuna premessa di prudenza, nessun "ti consiglio di consultare un avvocato" (l'utente E' un avvocato).
7. Output in Markdown. Usa heading (#, ##) per le sezioni, **bold** per le formule rituali ("PREMESSO CHE", "CONCLUSIONI", ecc.).

# USO DELLE RICERCHE GIA' PRESENTI NELLA PRATICA

Nel contesto trovi le "Ricerche gia' fatte sulla pratica" in forma di riassunto. Usale per capire su quali temi l'avvocato ha gia' indagato. Ma i riassunti NON bastano per una citazione formale: per citare una norma o una sentenza nell'atto, recupera SEMPRE il riferimento preciso dal corpus con \`cerca_in_corpus\`. Se una ricerca salvata e il corpus divergono (es. la ricerca cita un orientamento, il corpus ne ha uno piu' recente), privilegia il corpus e segnala con [NOTA: ...] se la differenza e' rilevante per la strategia.

# TOOL DISPONIBILI

- \`cerca_in_corpus(query, fonti)\`: ricerca diretta nel corpus legale Lexum.
   - \`query\`: stringa mirata e specifica con i concetti giuridici (es. "messa in mora del debitore interessi moratori", "responsabilita' struttura sanitaria nesso causale", "art 342 cpc motivi specifici appello").
   - \`fonti\`: array delle fonti da interrogare. Valori possibili: "norme" (codici primari), "norme_archivio" (leggi e decreti speciali), "giurisprudenza" (Cassazione e merito), "prassi" (circolari, risoluzioni, interpelli), "norme_ue" (normativa UE), "eur_lex" (sentenze CGUE).
   - Scegli le fonti in base a cosa ti serve. Puoi chiamarlo piu' volte con query e fonti diverse (massimo 3-4 chiamate totali).
   - IMPORTANTE: quando chiami cerca_in_corpus NON scrivere testo o commenti prima o dopo la chiamata. Limitati a invocare il tool.

Quando hai raccolto cio' che ti serve, NON usare piu' alcun tool: scrivi DIRETTAMENTE il documento completo come tua risposta testuale finale, in Markdown. La fine della tua risposta testuale chiude la generazione. La prosa la scrivi SOLO per il documento finale, mai accanto alle ricerche.

# FONTI CONSIGLIATE PER QUESTO TIPO DI ATTO

Per "${tipo.nome}" le fonti tipicamente utili sono: ${fontiConsigliate}.
Puoi comunque usarne altre se il caso concreto lo richiede (es. profili UE, profili fiscali).

# FLUSSO IDEALE

1. Leggi il contesto della pratica (gia' nel messaggio utente).
2. Identifica i 1-2 nuclei normativi/giurisprudenziali che ti servono.
3. Chiama \`cerca_in_corpus\` (1-3 volte) con query mirate e le fonti giuste, SENZA scrivere testo accanto alle chiamate.
4. Quando hai i riferimenti, scrivi DIRETTAMENTE il documento completo come risposta testuale finale (Markdown), usando i dati della pratica + i riferimenti recuperati. Non usare nessun tool per consegnarlo.

# GUIDA SPECIFICA AL TIPO DI DOCUMENTO

${tipo.guida_agent}`
}

// ─── TOOL DEFINITIONS ────────────────────────────────────────────

const TOOLS = [
  {
    name: 'cerca_in_corpus',
    description: 'Ricerca vettoriale diretta nel corpus legale Lexum (norme, leggi, giurisprudenza, prassi, UE). Usa per recuperare riferimenti aggiornati prima di citarli. Specifica le fonti da interrogare in base a cosa ti serve.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Query mirata in italiano, concentrata sui concetti giuridici. Buona: "diffida messa in mora interessi moratori". Cattiva: "cosa dice la legge sulla diffida".'
        },
        fonti: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['norme', 'norme_archivio', 'giurisprudenza', 'prassi', 'norme_ue', 'eur_lex']
          },
          description: 'Fonti da interrogare. Es. ["norme"] per un precetto, ["norme","giurisprudenza"] per una citazione, ["norme","prassi"] per un parere fiscale.'
        }
      },
      required: ['query', 'fonti']
    }
  }
]

// ═══════════════════════════════════════════════════════════════
// HANDLER HTTP
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    })
  }

  const startTime = Date.now()
  let requestId = nuovoRequestId()

  let userId: string | null = null
  let studioId: string | null = null
  let praticaId: string | null = null
  let tipoCodice: string | null = null
  let parentLogId: string | null = null
  let conversazioneId: string | null = null
  let creditoScalato = false

  function jsonError(status: number, msg: string, extra: any = {}) {
    return new Response(
      JSON.stringify({ ok: false, error: msg, ...extra }),
      { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonError(401, 'Authorization header mancante')

    const userToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(userToken)
    if (authErr || !user) return jsonError(401, 'Token non valido')

    const body = await req.json()
    const {
      pratica_id,
      tipo_documento,
      istruzione_avvocato = '',
      contesto_pratica,
      conversazione_id = null,
      parent_log_id = null,
    } = body

    userId = user.id
    praticaId = pratica_id
    tipoCodice = tipo_documento
    conversazioneId = conversazione_id
    if (parent_log_id) requestId = parent_log_id
    parentLogId = null

    if (!pratica_id || !tipo_documento || !contesto_pratica) {
      return jsonError(400, 'Parametri mancanti: pratica_id, tipo_documento, contesto_pratica')
    }

    const tipo = MAPPA_TIPI.get(tipo_documento)
    if (!tipo) return jsonError(400, `Tipo documento non riconosciuto: ${tipo_documento}`)

    const { data: profilo } = await supabase
      .from('profiles')
      .select('studio_id, titolare_id, nome, cognome, foro, numero_albo, pec, email, role')
      .eq('id', userId)
      .single()
    studioId = profilo?.studio_id ?? profilo?.titolare_id ?? userId

    const creditiInfo = await verificaCrediti(userId)
    if (!creditiInfo.disponibili) {
      await logLexCall({
        user_id: userId, studio_id: studioId, request_id: requestId, parent_log_id: parentLogId,
        endpoint: ENDPOINT_NOME, azione: 'genera_documento', domanda: istruzione_avvocato,
        conversazione_id: conversazioneId, modello: MODEL_AGENT,
        durata_ms: Date.now() - startTime, esito: 'no_credits', errore: 'crediti esauriti',
        metadati: { pratica_id, tipo_documento }
      })
      return jsonError(402, 'Crediti esauriti', { crediti_esauriti: true })
    }

    console.log(JSON.stringify({
      evento: 'genera_documento_start',
      user_id: userId, pratica_id, tipo_documento, request_id: requestId, parent_log_id: parentLogId,
    }))

    const systemPrompt = buildSystemPrompt(tipo)
    const datiProfessionista = costruisciDatiProfessionista(profilo)
    const contestoTesto = datiProfessionista + costruisciContestoPratica(contesto_pratica)

    const userMessageIniziale = `# PRATICA SU CUI STAI LAVORANDO

${contestoTesto}

# RICHIESTA DEL PROFESSIONISTA

Tipo di documento da generare: **${tipo.nome}** (categoria: ${tipo.categoria}).

Istruzione specifica del professionista:
"${istruzione_avvocato || '(nessuna istruzione aggiuntiva, genera il documento usando il contesto della pratica)'}"

# COSA DEVI FARE ORA

1. Leggi il contesto della pratica sopra.
2. Se ti servono riferimenti normativi o giurisprudenziali, chiama \`cerca_in_corpus\` (1-3 volte, con query mirate e le fonti giuste, senza scrivere testo accanto alle chiamate).
3. Quando hai tutto, scrivi DIRETTAMENTE il documento completo come tua risposta testuale finale (Markdown). Non serve nessun tool per consegnarlo: la fine della tua risposta chiude la generazione.

Procedi.`

    // ── PSEUDONIMIZZAZIONE contesto strutturato (fallback totale su errore) ──
    // I nomi di cliente/controparti/legali/personale non escono in chiaro verso il
    // modello: placeholder ⟦…⟧ prima dell'invio, ripristinati nello stream e nel
    // documento finale (done + log). La mappa vive SOLO in questa richiesta.
    let mappaPseudo: Array<{ nome: string; ph: string }> = []
    let userMessageSafe = userMessageIniziale
    try {
      mappaPseudo = raccogliEntita(contesto_pratica)
      if (mappaPseudo.length > 0) userMessageSafe = pseudonimizza(userMessageIniziale, mappaPseudo)
    } catch (_e) {
      mappaPseudo = []
      userMessageSafe = userMessageIniziale
    }
    if (mappaPseudo.length > 0) {
      console.log(JSON.stringify({ evento: 'genera_documento_pseudonimizzato', entita: mappaPseudo.length, request_id: requestId }))
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let testoFinaleDocumento = ''
        let tokenInputTotale = 0
        let tokenOutputTotale = 0
        let toolCallCount = 0
        const dePseudo = creaDePseudo(mappaPseudo)

        function inviaEvento(eventName: string, data: any) {
          controller.enqueue(encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`))
        }

        try {
          inviaEvento('stato', { messaggio: `Preparo la generazione: ${tipo.nome}` })

          const messaggi: any[] = [{ role: 'user', content: userMessageSafe }]
          let iterazione = 0
          let documentoCompletato = false

          // Esegue UNA iterazione dell'agent in STREAMING reale.
          // I text_delta vengono inoltrati LIVE al client come 'chunk' (come il
          // synthesizer). Durante le ricerche il modello non scrive prosa (vedi
          // system prompt), quindi gli unici text_delta sono quelli del documento.
          // Ritorna stop_reason + i content block ricostruiti (text + tool_use)
          // da rimettere nello storico messaggi per l'iterazione successiva.
          async function eseguiTurnoStreaming(): Promise<{ stopReason: string; blocks: any[] }> {
            const resp = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: MODEL_AGENT,
                max_tokens: MAX_TOKENS_AGENT,
                stream: true,
                system: systemPrompt,
                tools: TOOLS,
                messages: messaggi,
              })
            })

            if (!resp.ok) {
              const errText = await resp.text()
              throw new Error(`Anthropic error ${resp.status}: ${errText.slice(0, 300)}`)
            }

            const reader = resp.body!.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            const blocks: any[] = []     // indicizzati per content_block index
            let stopReason = ''

            while (true) {
              const { value, done } = await reader.read()
              if (done) break
              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() ?? ''

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                const payload = line.slice(6).trim()
                if (!payload) continue

                let ev: any
                try { ev = JSON.parse(payload) } catch { continue }

                if (ev.type === 'message_start') {
                  tokenInputTotale += ev.message?.usage?.input_tokens ?? 0
                } else if (ev.type === 'content_block_start') {
                  const cb = ev.content_block ?? {}
                  blocks[ev.index] = cb.type === 'tool_use'
                    ? { type: 'tool_use', id: cb.id, name: cb.name, _json: '' }
                    : { type: 'text', text: '' }
                } else if (ev.type === 'content_block_delta') {
                  const b = blocks[ev.index]
                  if (!b) continue
                  if (ev.delta?.type === 'text_delta') {
                    b.text += ev.delta.text   // storico: resta pseudonimizzato (il modello vede solo placeholder)
                    const testoChunk = mappaPseudo.length > 0 ? dePseudo.push(ev.delta.text) : ev.delta.text
                    if (testoChunk) inviaEvento('chunk', { text: testoChunk })   // streaming reale, nomi ripristinati
                  } else if (ev.delta?.type === 'input_json_delta') {
                    b._json += ev.delta.partial_json ?? ''
                  }
                } else if (ev.type === 'message_delta') {
                  if (ev.delta?.stop_reason) stopReason = ev.delta.stop_reason
                  tokenOutputTotale += ev.usage?.output_tokens ?? 0
                }
              }
            }

            // Ricostruisce i block per lo storico: parse del JSON dei tool_use
            const blocksPuliti = blocks.filter(Boolean).map((b: any) => {
              if (b.type === 'tool_use') {
                let input: any = {}
                try { input = b._json ? JSON.parse(b._json) : {} } catch { /* json parziale */ }
                return { type: 'tool_use', id: b.id, name: b.name, input }
              }
              return { type: 'text', text: b.text }
            })

            return { stopReason, blocks: blocksPuliti }
          }

          while (iterazione < MAX_ITERAZIONI_AGENT && !documentoCompletato) {
            iterazione++

            const { stopReason, blocks } = await eseguiTurnoStreaming()
            // Fix 400 "messages: text content blocks must be non-empty": se il
            // modello va dritto al tool senza scrivere, il turno contiene un text
            // block vuoto che, rimesso nello storico, farebbe rifiutare la richiesta
            // successiva. Si scartano i text block vuoti dallo storico assistant
            // (i tool_use restano -> il turno non e' mai privo di contenuto).
            const blocksStorico = blocks.filter(
              (b: any) => b.type !== 'text' || (typeof b.text === 'string' && b.text.trim().length > 0)
            )
            messaggi.push({ role: 'assistant', content: blocksStorico })

            if (stopReason === 'tool_use') {
              const toolResults: any[] = []
              for (const block of blocks) {
                if (block.type !== 'tool_use') continue

                if (block.name === 'cerca_in_corpus') {
                  toolCallCount++
                  const query = block.input?.query ?? ''
                  const fonti = block.input?.fonti ?? ['norme', 'giurisprudenza']
                  const fontiLabel = Array.isArray(fonti) ? fonti.join(', ') : 'corpus'
                  // La query generata dal modello puo' contenere placeholder: ripristina i
                  // nomi SOLO per il messaggio di stato mostrato all'utente. All'embedding/RPC
                  // va la query pseudonimizzata (niente nomi veri verso OpenAI).
                  const queryVista = mappaPseudo.length > 0 ? depseudo(query, mappaPseudo) : query
                  inviaEvento('stato', { messaggio: `Cerco nel corpus (${fontiLabel}): "${queryVista.slice(0, 70)}"` })

                  const risultatoCorpus = await eseguiCercaInCorpus(query, fonti, requestId)
                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: block.id,
                    content: risultatoCorpus.trim().length > 0
                      ? risultatoCorpus.slice(0, 12000)
                      : 'Nessun risultato pertinente trovato nel corpus.',
                  })
                } else {
                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: block.id,
                    content: `Tool sconosciuto: ${block.name}`,
                    is_error: true,
                  })
                }
              }
              messaggi.push({ role: 'user', content: toolResults })

            } else if (stopReason === 'end_turn' || stopReason === 'max_tokens') {
              // Il modello ha scritto il documento come testo finale, gia'
              // streammato live al client. Lo ricomponiamo dai text block.
              testoFinaleDocumento = blocks
                .filter((b: any) => b.type === 'text')
                .map((b: any) => b.text)
                .join('\n')
                .trim()

              if (testoFinaleDocumento.length > 100) {
                documentoCompletato = true
                if (stopReason === 'max_tokens') {
                  inviaEvento('stato', { messaggio: 'Documento troncato (lunghezza massima raggiunta).' })
                }
              } else {
                throw new Error('Generazione terminata senza documento (testo finale vuoto)')
              }
            } else {
              throw new Error(`stop_reason inatteso: ${stopReason}`)
            }
          }

          if (!documentoCompletato || !testoFinaleDocumento) {
            throw new Error(`Documento non completato dopo ${iterazione} iterazioni`)
          }

          // ── DE-PSEUDONIMIZZAZIONE finale: ripristina i nomi veri per l'utente ──
          // Flush dell'eventuale placeholder rimasto nel buffer dello stream +
          // ripristino nomi nel documento finale (done + log). Il modello ha visto
          // sempre e solo i placeholder; l'utente vede i nomi reali.
          if (mappaPseudo.length > 0) {
            const coda = dePseudo.flush()
            if (coda) inviaEvento('chunk', { text: coda })
            testoFinaleDocumento = depseudo(testoFinaleDocumento, mappaPseudo)
          }

          await scalaCredito(userId!, creditiInfo.crediti_row_id, creditiInfo.crediti_usati)
          creditoScalato = true

          await logLexCall({
            user_id: userId!, studio_id: studioId, request_id: requestId, parent_log_id: parentLogId,
            endpoint: ENDPOINT_NOME, azione: 'genera_documento',
            domanda: istruzione_avvocato, conversazione_id: conversazioneId, modello: MODEL_AGENT,
            token_input: tokenInputTotale, token_output: tokenOutputTotale,
            durata_ms: Date.now() - startTime, esito: 'ok', credito_scalato: true,
            iterazioni: iterazione,
            tool_usati: ['cerca_in_corpus'],
            risposta_text: testoFinaleDocumento,
            metadati: {
              pratica_id, tipo_documento, tipo_nome: tipo.nome,
              iterazioni: iterazione, tool_call_count: toolCallCount,
              lunghezza_documento: testoFinaleDocumento.length,
            }
          })

          inviaEvento('done', {
            documento_markdown: testoFinaleDocumento,
            tipo_documento: tipo.codice,
            tipo_nome: tipo.nome,
            crediti_rimasti: creditiInfo.crediti_rimasti - 1,
          })

          controller.close()
        } catch (err: any) {
          console.log(JSON.stringify({
            evento: 'genera_documento_error', errore: err.message,
            request_id: requestId, parent_log_id: parentLogId, credito_scalato: creditoScalato,
          }))

          await logLexCall({
            user_id: userId!, studio_id: studioId, request_id: requestId, parent_log_id: parentLogId,
            endpoint: ENDPOINT_NOME, azione: 'genera_documento',
            domanda: tipoCodice ? `[tipo: ${tipoCodice}]` : null, modello: MODEL_AGENT,
            token_input: tokenInputTotale, token_output: tokenOutputTotale,
            durata_ms: Date.now() - startTime, esito: 'error', errore: err.message,
            credito_scalato: creditoScalato,
            metadati: { pratica_id: praticaId, tipo_documento: tipoCodice }
          })

          inviaEvento('error', { error: err.message })
          controller.close()
        }
      }
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      }
    })

  } catch (err: any) {
    console.log(JSON.stringify({
      evento: 'genera_documento_fatal_error', errore: err.message,
      stack: err.stack?.slice(0, 500), request_id: requestId,
    }))

    await logLexCall({
      user_id: userId, studio_id: studioId, request_id: requestId, parent_log_id: parentLogId,
      endpoint: ENDPOINT_NOME, azione: 'genera_documento',
      durata_ms: Date.now() - startTime, esito: 'error', errore: err.message,
      metadati: { pratica_id: praticaId, tipo_documento: tipoCodice }
    })

    return jsonError(500, err.message)
  }
})
