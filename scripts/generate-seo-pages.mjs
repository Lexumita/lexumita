// scripts/generate-seo-pages.mjs
// Prerender-lite "head-only" per le pagine vetrina.
//
// Perché: il sito è una SPA (Vite). react-helmet-async scrive le meta LATO CLIENT
// (JS). Google esegue JS e le legge, ma i crawler di anteprima link (WhatsApp,
// Facebook, LinkedIn, Telegram, spesso Slack) NON eseguono JS: vedono solo
// l'<head> statico di index.html. Risultato: le anteprime social delle pagine
// profonde mostrerebbero tutte la testata della home.
//
// Soluzione: dopo `vite build`, partiamo da dist/index.html (che contiene già i
// riferimenti agli asset con hash) e per ogni rotta pubblica scriviamo un file
// dist/<rotta>.html identico, ma con <title>/description/canonical/OG/Twitter
// specifici della pagina. Su Vercel i file statici hanno precedenza sui rewrite,
// e vercel.json mappa esplicitamente /per-commercialisti → /per-commercialisti.html
// (rewrite dedicato per ogni pagina qui sotto). Le rotte applicative (senza file)
// cadono sul rewrite catch-all → index.html (SPA invariata).
//
// ⚠️ NON usare `cleanUrls: true` in vercel.json: con la SPA romperebbe il fallback
// (il rewrite catch-all → /index.html verrebbe 308-redirezionato a /, e ogni
// rotta app profonda darebbe 404). Le URL pulite delle pagine vetrina si ottengono
// coi rewrite espliciti in vercel.json.
// ⚠️ SINCRONIZZAZIONE: se aggiungi una rotta a PAGES, aggiungi il rewrite
// corrispondente in vercel.json (prima del catch-all), altrimenti la sua testata
// social non viene servita.
//
// NOVITÀ (il blog scritto dall'admin): gli articoli non sono nel codice, stanno
// su Supabase. Qui si leggono quelli pubblicati e si scrive una cartella per
// ciascuno — dist/novita/<slug>/index.html — più dist/novita/index.html per
// l'elenco. Le cartelle con index.html Vercel le serve da sé: nessun rewrite da
// tenere allineato, e un articolo pubblicato DOPO il rilascio resta comunque
// raggiungibile (cade sul catch-all → SPA), solo senza testata dedicata. Per
// questo la pubblicazione dall'admin fa ripartire il rilascio.
//
// NB: è "head-only" — il <body> resta il mount della SPA. Serve alle anteprime
// social e a dare a Google una testata corretta anche senza rendering JS. Non è
// un prerender del contenuto (per quello servirebbe un headless browser).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const DIST = resolve(process.cwd(), 'dist')
const SITE = 'https://www.lexum.it'

const indexPath = resolve(DIST, 'index.html')
if (!existsSync(indexPath)) {
  console.error('[seo] dist/index.html non trovato — esegui prima `vite build`.')
  process.exit(1)
}
const base = readFileSync(indexPath, 'utf8')

// Testate per rotta (allineate alle <Helmet> delle pagine).
const PAGES = {
  'per-avvocati': {
    title: 'Lexum per Studi Legali — Gestionale, AI e collaborazione di team',
    description:
      'Lexum per studi legali: gestionale di studio, banca dati giuridica verificata, assistente AI Lex e collaborazione di team. La banca dati è gratuita.',
    ogTitle: 'Lexum per Studi Legali — Gestionale, AI e team',
    ogDescription:
      'Gestionale di studio, banca dati giuridica verificata e assistente AI Lex. Per avvocati e studi legali italiani.',
  },
  'per-commercialisti': {
    title: 'Lexum per Commercialisti — Studio, scadenzario fiscale, contabilita e Lex AI',
    description:
      'Lexum per commercialisti: gestione studio, scadenzario fiscale, contabilita e Lex AI su banca dati fiscale verificata. La banca dati è gratuita.',
    ogTitle: 'Lexum per Commercialisti — Studio, fisco, contabilita e AI',
    ogDescription:
      'Gestione studio, scadenzario fiscale, contabilita e Lex AI su banca dati verificata. Per commercialisti italiani.',
  },
  'contatti': {
    title: 'Lexum — Contatti, demo e supporto',
    description:
      'Contatta Lexum: richiedi una demo, ricevi supporto e informazioni sulla piattaforma per avvocati e commercialisti.',
    ogTitle: 'Lexum — Contatti',
    ogDescription:
      'Richiedi una demo o supporto sulla piattaforma Lexum per avvocati e commercialisti.',
  },
}

// Sostituisce il PRIMO tag che matcha (di ciascun tipo ce n'è uno solo).
const replaceFirst = (html, re, out) => {
  if (!re.test(html)) {
    console.warn(`[seo] tag non trovato per sostituzione: ${re}`)
    return html
  }
  return html.replace(re, out)
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// Scrive una copia di index.html con la testata della pagina.
function scriviTestata(fileRelativo, url, m) {
  let html = base
  html = replaceFirst(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(m.title)}</title>`)
  html = replaceFirst(html, /<meta name="description"[\s\S]*?\/>/, `<meta name="description" content="${esc(m.description)}" />`)
  html = replaceFirst(html, /<link rel="canonical"[\s\S]*?\/>/, `<link rel="canonical" href="${url}" />`)
  html = replaceFirst(html, /<meta property="og:url"[\s\S]*?\/>/, `<meta property="og:url" content="${url}" />`)
  html = replaceFirst(html, /<meta property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${esc(m.ogTitle)}" />`)
  html = replaceFirst(html, /<meta property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${esc(m.ogDescription)}" />`)
  html = replaceFirst(html, /<meta name="twitter:title"[\s\S]*?\/>/, `<meta name="twitter:title" content="${esc(m.ogTitle)}" />`)
  html = replaceFirst(html, /<meta name="twitter:description"[\s\S]*?\/>/, `<meta name="twitter:description" content="${esc(m.ogDescription)}" />`)
  if (m.image) {
    html = replaceFirst(html, /<meta property="og:image"[\s\S]*?\/>/, `<meta property="og:image" content="${esc(m.image)}" />`)
    html = replaceFirst(html, /<meta name="twitter:image"[\s\S]*?\/>/, `<meta name="twitter:image" content="${esc(m.image)}" />`)
  }
  const destinazione = resolve(DIST, fileRelativo)
  mkdirSync(dirname(destinazione), { recursive: true })
  writeFileSync(destinazione, html)
  console.log(`[seo] generato dist/${fileRelativo}`)
}

let count = 0
for (const [route, m] of Object.entries(PAGES)) {
  scriviTestata(`${route}.html`, `${SITE}/${route}`, m)
  count++
}

// ─── NOVITÀ ───────────────────────────────────────────────────

// In locale le variabili stanno nei file .env (Vite li legge da sé, Node no).
// Su Vercel non esistono: lì arrivano da process.env.
const FILE_ENV = ['.env.local', '.env.production.local', '.env.production', '.env']

function envDaiFile() {
  const out = {}
  for (const nome of FILE_ENV) {
    const file = resolve(process.cwd(), nome)
    if (!existsSync(file)) continue
    for (const riga of readFileSync(file, 'utf8').split('\n')) {
      const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && out[m[1]] === undefined) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return out
}

async function novitaPubblicate() {
  const env = { ...envDaiFile(), ...process.env }
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.warn('[seo] Supabase non configurato: salto le pagine Novità.')
    return []
  }
  const query =
    'select=slug,titolo,sommario,copertina_url&stato=eq.pubblicato&order=pubblicato_il.desc&limit=200'
  try {
    const res = await fetch(`${url}/rest/v1/novita?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (!res.ok) {
      console.warn(`[seo] Novità non lette (HTTP ${res.status}): salto le loro testate.`)
      return []
    }
    return await res.json()
  } catch (err) {
    console.warn(`[seo] Novità non lette (${err.message}): salto le loro testate.`)
    return []
  }
}

const articoli = await novitaPubblicate()

scriviTestata('novita/index.html', `${SITE}/novita`, {
  title: 'Novità — Lexum',
  description:
    'Le novità di Lexum: funzioni nuove, migliorie e aggiornamenti della piattaforma per avvocati e commercialisti.',
  ogTitle: 'Novità — Lexum',
  ogDescription: 'Funzioni nuove, migliorie e aggiornamenti della piattaforma Lexum.',
})
count++

for (const a of articoli) {
  if (!a?.slug) continue
  const descrizione = a.sommario?.trim() || `${a.titolo} — le novità di Lexum.`
  scriviTestata(`novita/${a.slug}/index.html`, `${SITE}/novita/${a.slug}`, {
    title: `${a.titolo} — Lexum`,
    description: descrizione,
    ogTitle: a.titolo,
    ogDescription: descrizione,
    image: a.copertina_url || undefined,
  })
  count++
}

console.log(`[seo] fatto: ${count} pagine con testata dedicata (${articoli.length} articoli Novità).`)
