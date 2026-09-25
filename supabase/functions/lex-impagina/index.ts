// supabase/functions/lex-impagina/index.ts
// ─────────────────────────────────────────────────────────────
// Parti editoriali del PDF di una risposta di Lex in Banca Dati (25/09/2026):
// titolo, quesito in sintesi, etichetta e titolo di ogni sezione, tre punti
// fermi, sintesi finale, descrizione delle fonti. Il testo della risposta NON
// viene riscritto: lo impagina il browser cosi' com'e' (src/lib/pdf).
//
// Costo misurato ~1,5 centesimi a documento (Sonnet 5, effort low, ~9 s):
// NESSUN credito, per decisione del 25/09/2026. Contro gli abusi un tetto
// giornaliero per utente, contato sul registro lex_logs.
//
// Body:     { domanda: string, risposta: string, sezioni: string[] }
// Risposta: { ok: true, editoriale } | { ok: false, error }
// Auth manuale (verify_jwt=false a piattaforma).
// ─────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const ENDPOINT_NOME = 'lex_impagina'
const MODELLO = 'claude-sonnet-5'
// Il tetto comprende il ragionamento; con effort low l'uscita misurata e' ~850 token.
const MAX_TOKENS = 6000
const LIMITE_GIORNALIERO = 40
const MAX_CARATTERI_RISPOSTA = 60000
const TIMEOUT_MS = 60000

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Regola white-label: all'utente mai il nome del fornitore AI ne' un testo tecnico.
const MSG_ERRORE = 'Il servizio non ha risposto in tempo.'

const PROMPT = `Sei l'impaginatore editoriale di Lexum. Ricevi la DOMANDA di un utente, la RISPOSTA gia' scritta da Lex, l'assistente giuridico di Lexum, e l'elenco numerato delle sue SEZIONI. Il testo della risposta verra' impaginato cosi' com'e': tu scrivi solo gli elementi editoriali attorno. Restituisci SOLO un oggetto JSON con questo schema:
{
  "titolo": "titolo breve ed evocativo, al massimo 60 caratteri",
  "sottotitolo": "da 3 a 4 temi separati da ' · '",
  "quesito": "la domanda riformulata in una frase",
  "sezioni": [ { "etichetta": "tema in 2-5 parole", "titolo": "titolo discorsivo" } ],
  "punti_fermi": [ { "titolo": "...", "testo": "..." } ],
  "sintesi": "chiusura di 2-3 frasi",
  "fonti": [ { "citazione": "...", "descrizione": "al massimo 12 parole" } ]
}
Una voce in "sezioni" per ogni sezione, nello stesso ordine. Esattamente 3 punti fermi, testo al massimo 25 parole.
Regole di contenuto, inderogabili:
- Non aggiungere informazioni giuridiche che non sono nella risposta. Non inventare norme, sentenze, date o numeri.
- Mantieni il registro e la persona grammaticale della risposta: se da' del Lei, continua col Lei.
- Le fonti sono SOLO quelle citate nella risposta, norme e sentenze, nell'ordine in cui compaiono.
Testo in linea: **grassetto** per i passaggi chiave, con misura; [[...]] attorno a ogni citazione di norma o sentenza, per esempio [[art. 526 c.p.p.]].
Rispondi solo con il JSON, senza testo prima o dopo e senza blocchi di codice.`

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
  modello: string
  token_input?: number
  token_output?: number
  token_cached?: number
  durata_ms?: number
  iterazioni?: number
  tool_usati?: string[]
  esito: LexEsito
  errore?: string | null
  qualita_retrieval?: LexQualita | null
  principali_count?: number | null
  credito_scalato?: boolean
  metadati?: Record<string, any> | null
}

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
      p_modello: params.modello,
      p_token_input: params.token_input ?? 0,
      p_token_output: params.token_output ?? 0,
      p_token_cached: params.token_cached ?? 0,
      p_durata_ms: params.durata_ms ?? null,
      p_iterazioni: params.iterazioni ?? 1,
      p_tool_usati: params.tool_usati ?? null,
      p_esito: params.esito,
      p_errore: params.errore ?? null,
      p_qualita_retrieval: params.qualita_retrieval ?? null,
      p_principali_count: params.principali_count ?? null,
      p_credito_scalato: params.credito_scalato ?? false,
      p_metadati: params.metadati ?? null,
    })
    if (error) {
      console.log(JSON.stringify({ evento: 'lex_log_error', endpoint: params.endpoint, errore: error.message }))
      return null
    }
    return data as string
  } catch (err: any) {
    console.log(JSON.stringify({ evento: 'lex_log_exception', endpoint: params.endpoint, errore: err.message }))
    return null
  }
}


function json(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json', ...CORS } })
}

const testo = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// Solo i campi attesi, stringhe accorciate: il browser non riceve altro.
function normalizza(g: any, nSezioni: number) {
  return {
    titolo: testo(g?.titolo, 90),
    sottotitolo: testo(g?.sottotitolo, 160),
    quesito: testo(g?.quesito, 400),
    sezioni: (Array.isArray(g?.sezioni) ? g.sezioni : []).slice(0, nSezioni).map((s: any) => ({
      etichetta: testo(s?.etichetta, 50),
      titolo: testo(s?.titolo, 120),
    })),
    punti_fermi: (Array.isArray(g?.punti_fermi) ? g.punti_fermi : []).slice(0, 3)
      .map((p: any) => ({ titolo: testo(p?.titolo, 70), testo: testo(p?.testo, 320) }))
      .filter((p: any) => p.titolo && p.testo),
    sintesi: testo(g?.sintesi, 900),
    fonti: (Array.isArray(g?.fonti) ? g.fonti : []).slice(0, 25)
      .map((f: any) => ({ citazione: testo(f?.citazione, 90), descrizione: testo(f?.descrizione, 160) }))
      .filter((f: any) => f.citazione),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const requestId = crypto.randomUUID()
  const inizio = Date.now()
  let userId: string | null = null

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json(401, { ok: false, error: 'Non autorizzato' })
    const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userErr || !userData?.user) return json(401, { ok: false, error: 'Token non valido' })
    userId = userData.user.id

    const body = await req.json().catch(() => null)
    const domanda = testo(body?.domanda, 4000)
    const risposta = typeof body?.risposta === 'string' ? body.risposta : ''
    const sezioni = (Array.isArray(body?.sezioni) ? body.sezioni : []).slice(0, 20).map((s: unknown) => testo(s, 200))
    if (!risposta.trim()) return json(400, { ok: false, error: 'Risposta mancante' })
    if (risposta.length > MAX_CARATTERI_RISPOSTA) return json(400, { ok: false, error: 'Risposta troppo lunga per il PDF' })

    // Tetto giornaliero: nessun credito, ma nemmeno chiamate senza fine.
    const dalle = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { count } = await supabase.from('lex_logs').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('endpoint', ENDPOINT_NOME).gte('created_at', dalle)
    if ((count ?? 0) >= LIMITE_GIORNALIERO) {
      return json(429, { ok: false, error: `Hai raggiunto il limite di ${LIMITE_GIORNALIERO} PDF curati al giorno.` })
    }

    // I link alla banca dati non servono all'impaginatore: via gli indirizzi, resta il testo.
    const rispostaPulita = risposta.replace(/\[([^\]]+)\]\((\/banca-dati\/[^)\s]+)\)/g, '$1')
    const utente = `DOMANDA:\n${domanda}\n\nRISPOSTA DI LEX:\n${rispostaPulita}\n\nSEZIONI:\n` +
      sezioni.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODELLO,
        max_tokens: MAX_TOKENS,
        output_config: { effort: 'low' },
        system: PROMPT,
        messages: [{ role: 'user', content: utente }],
      }),
    }).finally(() => clearTimeout(timer))
    const d = await r.json().catch(() => null)
    if (!r.ok || !d) {
      const e: any = new Error(`Anthropic ${r.status}: ${JSON.stringify(d?.error ?? null).slice(0, 200)}`)
      throw e
    }

    const grezzo = (d.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
    // Il modello a volte chiude il JSON in un blocco di codice: si legge fra la prima { e l'ultima }.
    const editoriale = normalizza(JSON.parse(grezzo.slice(grezzo.indexOf('{'), grezzo.lastIndexOf('}') + 1)), sezioni.length)

    await logLexCall({
      user_id: userId, request_id: requestId, endpoint: ENDPOINT_NOME, azione: 'pdf_risposta', modello: MODELLO,
      token_input: d.usage?.input_tokens ?? 0, token_output: d.usage?.output_tokens ?? 0,
      durata_ms: Date.now() - inizio, esito: 'ok', credito_scalato: false,
      metadati: { stop_reason: d.stop_reason ?? null, caratteri_risposta: risposta.length, sezioni: sezioni.length },
    })
    return json(200, { ok: true, editoriale })
  } catch (err: any) {
    console.log(JSON.stringify({ evento: 'lex_impagina_error', errore: err?.message, request_id: requestId }))
    await logLexCall({
      user_id: userId, request_id: requestId, endpoint: ENDPOINT_NOME, azione: 'pdf_risposta', modello: MODELLO,
      durata_ms: Date.now() - inizio, esito: err?.name === 'AbortError' ? 'timeout' : 'error',
      errore: err?.message ?? null, credito_scalato: false,
    })
    return json(500, { ok: false, error: MSG_ERRORE })
  }
})
