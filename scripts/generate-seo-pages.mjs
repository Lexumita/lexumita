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
// TESTO DELLE PAGINE (03-11-2026): i motori delle AI (GPTBot, ClaudeBot...) non
// eseguono JavaScript: con la sola testata vedevano titolo e descrizione e nessun
// testo. Ora, se c'è il build dist-seo (src/seo/entry-seo.jsx), il corpo della
// pagina entra nell'HTML dentro <div id="statico">; nel browser React disegna in
// #root (nascosto) e poi lo sostituisce (src/lib/statico.js). Se quel build manca
// o una pagina non si disegna, resta la sola testata: il rilascio non si ferma.
//
// dist/index.html è la home col suo testo e Vercel lo serve per «/»: per tutte le
// altre rotte il catch-all di vercel.json punta a dist/app.html, il guscio vuoto.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { ARGOMENTI } from '../src/lib/argomenti.js'
import { HUB_STRUMENTI, STRUMENTI } from '../src/lib/strumenti/testi.js'
import { PERCORSO as COSTITUZIONE, AGGIORNATA_AL, META_INDICE, CON_PAGINA, percorsoDi, titoloDi, metaDi, citatoDa } from '../src/lib/costituzione/index.js'

const DIST = resolve(process.cwd(), 'dist')
const SITE = 'https://www.lexum.it'

const indexPath = resolve(DIST, 'index.html')
if (!existsSync(indexPath)) {
  console.error('[seo] dist/index.html non trovato — esegui prima `vite build`.')
  process.exit(1)
}
const base = readFileSync(indexPath, 'utf8')
writeFileSync(resolve(DIST, 'app.html'), base)

// Il disegno delle pagine in testo (vedi sopra)
let disegna = null
try {
  ;({ disegna } = await import(resolve(process.cwd(), 'dist-seo/entry-seo.js')))
} catch (err) {
  console.warn(`[seo] testo delle pagine non disponibile (${err.message}): solo testate.`)
}

function testoDi(percorso, dati) {
  if (!disegna) return null
  try {
    return disegna(percorso, dati)
  } catch (err) {
    console.warn(`[seo] ${percorso} non disegnata (${err.message}): solo testata.`)
    return null
  }
}

let conTesto = 0
function conCorpo(html, corpo) {
  if (!corpo) return html
  conTesto++
  // funzione come sostituto: nel testo possono esserci «$»
  return html.replace('<div id="root"></div>', () => `<div id="statico">${corpo}</div>\n  <div id="root" style="display:none"></div>`)
}

// I dati strutturati: «<» scritto così non può chiudere il tag script
function datiStrutturati(oggetto) {
  const json = JSON.stringify({ '@context': 'https://schema.org', ...oggetto }).replace(/</g, '\\u003c')
  return `  <script type="application/ld+json">${json}</script>\n</head>`
}

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
  if (m.tipoOg) html = replaceFirst(html, /<meta property="og:type"[\s\S]*?\/>/, `<meta property="og:type" content="${m.tipoOg}" />`)
  for (const dati of m.jsonLd ?? []) html = html.replace('</head>', () => datiStrutturati(dati))
  if (m.corpo) html = conCorpo(html, m.corpo)
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
  scriviTestata(`${route}.html`, `${SITE}/${route}`, { ...m, corpo: testoDi(`/${route}`) })
  count++
}

// Gli strumenti gratuiti: stessa logica degli articoli, cartelle con index.html
scriviTestata('strumenti/index.html', `${SITE}${HUB_STRUMENTI.percorso}`, {
  title: HUB_STRUMENTI.metaTitolo,
  description: HUB_STRUMENTI.metaDescrizione,
  ogTitle: HUB_STRUMENTI.metaTitolo,
  ogDescription: HUB_STRUMENTI.metaDescrizione,
  corpo: testoDi(HUB_STRUMENTI.percorso),
})
count++
for (const x of STRUMENTI) {
  const url = `${SITE}${x.percorso}`
  scriviTestata(`strumenti/${x.slug}/index.html`, url, {
    title: x.metaTitolo,
    description: x.metaDescrizione,
    ogTitle: x.metaTitolo,
    ogDescription: x.metaDescrizione,
    corpo: testoDi(x.percorso),
    jsonLd: [{
      '@type': 'WebApplication',
      name: x.nome,
      description: x.metaDescrizione,
      url,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: 'it-IT',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      provider: { '@type': 'Organization', name: 'Lexum', url: `${SITE}/` },
    }, {
      '@type': 'FAQPage',
      mainEntity: x.domande.map(({ d, r }) => ({
        '@type': 'Question',
        name: d,
        acceptedAnswer: { '@type': 'Answer', text: r },
      })),
    }],
  })
  count++
}

// La home: stesso file, stessa testata, col testo dentro
writeFileSync(indexPath, conCorpo(base, testoDi('/')))

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
    'select=slug,titolo,sommario,contenuto,copertina_url,autore,categoria,argomenti,instagram_url,tiktok_url,pubblicato_il,updated_at&stato=eq.pubblicato&order=pubblicato_il.desc&limit=200'
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

// Stesso interruttore di src/lib/novita.js (acceso il 07/10/2026)
const NOVITA_ATTIVA = true
const articoli = NOVITA_ATTIVA ? await novitaPubblicate() : []
// L'elenco non ha bisogno del testo degli articoli
const elenco = articoli.map(({ contenuto, ...resto }) => resto)

if (NOVITA_ATTIVA) scriviTestata('novita/index.html', `${SITE}/novita`, {
  title: 'Articoli di legge spiegati in modo semplice — Lexum',
  description: 'Leggi, sentenze e casi di attualità spiegati in modo semplice, con le fonti: casa, lavoro, famiglia, penale, fisco e altro ancora.',
  ogTitle: 'Articoli di legge spiegati in modo semplice — Lexum',
  ogDescription: 'Leggi, sentenze e casi di attualità spiegati in modo semplice, con le fonti.',
  corpo: testoDi('/novita', { articoli: elenco }),
})
if (NOVITA_ATTIVA) count++

// Le pagine degli argomenti (src/lib/argomenti.js): solo quelli che hanno già articoli
const argomentiAttivi = ARGOMENTI.filter(x => articoli.some(a => a.argomenti?.includes(x.slug)))
for (const x of argomentiAttivi) {
  const url = `${SITE}/novita/argomento/${x.slug}`
  scriviTestata(`novita/argomento/${x.slug}/index.html`, url, {
    title: `${x.titolo} — Lexum`,
    description: x.descrizione,
    ogTitle: x.titolo,
    ogDescription: x.descrizione,
    corpo: testoDi(`/novita/argomento/${x.slug}`, { articoli: elenco }),
    jsonLd: [{
      '@type': 'CollectionPage',
      name: x.titolo,
      description: x.descrizione,
      url,
      inLanguage: 'it-IT',
      isPartOf: { '@id': `${SITE}/#website` },
    }],
  })
  count++
}

for (const a of articoli) {
  if (!a?.slug) continue
  const descrizione = a.sommario?.trim() || `${a.titolo} — le novità di Lexum.`
  const url = `${SITE}/novita/${a.slug}`
  // Gli stessi di articoliCorrelati (src/lib/novita.js)
  const correlati = a.argomenti?.length
    ? elenco.filter(c => c.slug !== a.slug && c.argomenti?.some(x => a.argomenti.includes(x))).slice(0, 3)
    : []
  scriviTestata(`novita/${a.slug}/index.html`, url, {
    title: `${a.titolo} — Lexum`,
    description: descrizione,
    ogTitle: a.titolo,
    ogDescription: descrizione,
    image: a.copertina_url || undefined,
    tipoOg: 'article',
    corpo: testoDi(`/novita/${a.slug}`, { articolo: a, correlati }),
    jsonLd: [{
      '@type': 'Article',
      headline: a.titolo,
      description: descrizione,
      image: a.copertina_url || `${SITE}/logo.png`,
      datePublished: a.pubblicato_il,
      dateModified: a.updated_at || a.pubblicato_il,
      inLanguage: 'it-IT',
      url,
      mainEntityOfPage: url,
      articleSection: a.categoria || undefined,
      isAccessibleForFree: true,
      author: a.autore?.trim()
        ? { '@type': 'Person', name: a.autore.trim() }
        : { '@type': 'Organization', name: 'Lexum', url: `${SITE}/` },
      publisher: { '@type': 'Organization', name: 'Lexum', url: `${SITE}/`, logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` } },
    }, {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Lexum', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Articoli', item: `${SITE}/novita` },
        { '@type': 'ListItem', position: 3, name: a.titolo, item: url },
      ],
    }],
  })
  count++
}

// ─── COSTITUZIONE (08-11-2026) ─────────────────────────────────
// Il testo è nel codice (src/lib/costituzione/testo.js): una cartella per articolo, come gli strumenti.
// «Ne abbiamo parlato» viene dagli articoli del blog appena letti.
scriviTestata('costituzione/index.html', `${SITE}${COSTITUZIONE}`, {
  title: META_INDICE.titolo,
  description: META_INDICE.descrizione,
  ogTitle: META_INDICE.titolo,
  ogDescription: META_INDICE.descrizione,
  corpo: testoDi(COSTITUZIONE),
  jsonLd: [{
    '@type': 'Legislation',
    name: 'Costituzione della Repubblica italiana',
    legislationIdentifier: 'urn:nir:stato:costituzione:1947-12-27',
    legislationType: 'Costituzione',
    legislationJurisdiction: 'IT',
    legislationDate: '1947-12-27',
    legislationLegalForce: 'InForce',
    dateModified: AGGIORNATA_AL,
    inLanguage: 'it-IT',
    url: `${SITE}${COSTITUZIONE}`,
    sameAs: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:costituzione:1947-12-27',
  }],
})
count++
for (const voce of CON_PAGINA) {
  const url = `${SITE}${percorsoDi(voce)}`
  const meta = metaDi(voce)
  scriviTestata(`${percorsoDi(voce).slice(1)}/index.html`, url, {
    title: meta.titolo,
    description: meta.descrizione,
    ogTitle: meta.titolo.replace(/ — Lexum$/, ''),
    ogDescription: meta.descrizione,
    corpo: testoDi(percorsoDi(voce), { citazioni: citatoDa(voce, articoli) }),
    jsonLd: [{
      '@type': 'Legislation',
      name: `Costituzione della Repubblica italiana, ${voce.tipo === 'articolo' ? `art. ${voce.numero}` : `disposizione transitoria e finale ${voce.numero}`}`,
      alternateName: titoloDi(voce),
      legislationIdentifier: voce.tipo === 'articolo' ? `urn:nir:stato:costituzione:1947-12-27~art${voce.numero}` : undefined,
      legislationType: 'Costituzione',
      legislationJurisdiction: 'IT',
      legislationDate: '1947-12-27',
      legislationLegalForce: 'InForce',
      dateModified: voce.inVigoreDal || undefined,
      inLanguage: 'it-IT',
      url,
      sameAs: voce.normattiva,
      isPartOf: { '@type': 'Legislation', name: 'Costituzione della Repubblica italiana', url: `${SITE}${COSTITUZIONE}` },
    }, {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Lexum', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Costituzione', item: `${SITE}${COSTITUZIONE}` },
        { '@type': 'ListItem', position: 3, name: voce.etichetta, item: url },
      ],
    }],
  })
  count++
}

// Sitemap: public/sitemap.xml ha le pagine fisse; il blog ci entra qui, a ogni
// rilascio (pubblicare un articolo fa ripartire il rilascio), così Google trova
// /novita e ogni articolo senza aggiornare il file a mano.
if (NOVITA_ATTIVA) {
  const sitemapPath = resolve(DIST, 'sitemap.xml')
  if (existsSync(sitemapPath)) {
    const giorno = d => (d ? new Date(d) : new Date()).toISOString().slice(0, 10)
    const voce = (loc, lastmod, freq, prio) =>
      `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n  </url>\n`
    let voci = voce(`${SITE}${HUB_STRUMENTI.percorso}`, giorno(), 'monthly', '0.8')
    for (const x of STRUMENTI) voci += voce(`${SITE}${x.percorso}`, giorno(), 'monthly', '0.8')
    voci += voce(`${SITE}${COSTITUZIONE}`, AGGIORNATA_AL, 'monthly', '0.8')
    for (const v of CON_PAGINA) voci += voce(`${SITE}${percorsoDi(v)}`, v.inVigoreDal || AGGIORNATA_AL, 'yearly', '0.6')
    voci += voce(`${SITE}/novita`, giorno(articoli[0]?.pubblicato_il), 'weekly', '0.8')
    for (const x of argomentiAttivi) {
      const recente = articoli.find(a => a.argomenti?.includes(x.slug))
      voci += voce(`${SITE}/novita/argomento/${x.slug}`, giorno(recente?.pubblicato_il), 'weekly', '0.6')
    }
    for (const a of articoli) {
      if (!a?.slug) continue
      voci += voce(`${SITE}/novita/${a.slug}`, giorno(a.updated_at || a.pubblicato_il), 'monthly', '0.7')
    }
    const xml = readFileSync(sitemapPath, 'utf8')
    if (!xml.includes(`${SITE}/novita<`)) {
      writeFileSync(sitemapPath, xml.replace('</urlset>', `\n${voci}</urlset>`))
      console.log(`[seo] sitemap: aggiunte /novita, ${articoli.length} articoli e ${CON_PAGINA.length + 1} pagine della Costituzione`)
    }
  }
}

console.log(`[seo] fatto: ${count} pagine con testata dedicata (${articoli.length} articoli Novità), ${conTesto} col testo dentro.`)
