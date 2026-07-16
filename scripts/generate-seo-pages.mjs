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
// NB: è "head-only" — il <body> resta il mount della SPA. Serve alle anteprime
// social e a dare a Google una testata corretta anche senza rendering JS. Non è
// un prerender del contenuto (per quello servirebbe un headless browser).

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

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

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

let count = 0
for (const [route, m] of Object.entries(PAGES)) {
  const url = `${SITE}/${route}`
  let html = base
  html = replaceFirst(html, /<title>[\s\S]*?<\/title>/, `<title>${m.title}</title>`)
  html = replaceFirst(html, /<meta name="description"[\s\S]*?\/>/, `<meta name="description" content="${esc(m.description)}" />`)
  html = replaceFirst(html, /<link rel="canonical"[\s\S]*?\/>/, `<link rel="canonical" href="${url}" />`)
  html = replaceFirst(html, /<meta property="og:url"[\s\S]*?\/>/, `<meta property="og:url" content="${url}" />`)
  html = replaceFirst(html, /<meta property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${esc(m.ogTitle)}" />`)
  html = replaceFirst(html, /<meta property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${esc(m.ogDescription)}" />`)
  html = replaceFirst(html, /<meta name="twitter:title"[\s\S]*?\/>/, `<meta name="twitter:title" content="${esc(m.ogTitle)}" />`)
  html = replaceFirst(html, /<meta name="twitter:description"[\s\S]*?\/>/, `<meta name="twitter:description" content="${esc(m.ogDescription)}" />`)
  writeFileSync(resolve(DIST, `${route}.html`), html)
  count++
  console.log(`[seo] generato dist/${route}.html`)
}
console.log(`[seo] fatto: ${count} pagine vetrina con testata dedicata.`)
