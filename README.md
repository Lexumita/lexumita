# Lexum — Piattaforma Legale

Sito vetrina + struttura backend per la piattaforma Lexum.

## Stack

| Layer       | Tecnologia                        |
|-------------|-----------------------------------|
| Frontend    | React 18 + Vite 5                 |
| Styling     | Tailwind CSS 3                    |
| Routing     | React Router v6                   |
| Backend     | Supabase (PostgreSQL)             |
| Edge Fn.    | Deno / TypeScript (Supabase)      |
| Deploy      | Vercel / Netlify (frontend)       |

## Setup locale

```bash
# 1. Installa dipendenze
npm install

# 2. Configura variabili d'ambiente
cp .env.example .env.local
# Compila VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# 3. Avvia il dev server
npm run dev
```

## Struttura progetto

```
lexum/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Navbar responsive con scroll effect
│   │   ├── Footer.jsx          # Footer con link e trust points
│   │   └── ScrollToTop.jsx     # Reset scroll al cambio pagina
│   ├── pages/
│   │   ├── Home.jsx            # Hero + funzioni + perché è diversa + CTA
│   │   ├── Funzionalita.jsx    # Blocchi funzionalità dettagliati
│   │   ├── ComeFunziona.jsx    # Flow studio + banca dati + revenue model
│   │   └── Contatti.jsx        # Form contatti (edge function ready)
│   ├── lib/
│   │   └── supabase.js         # Client Supabase + helper callEdgeFunction()
│   ├── assets/
│   │   └── logo.png
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase/
│   ├── schema.sql              # Tabelle iniziali PostgreSQL
│   └── functions/
│       ├── contact-form/       # Edge Function: form contatti
│       │   └── index.ts
│       └── demo-request/       # Edge Function: richiesta demo
│           └── index.ts
├── public/
│   └── logo.png
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## Deploy Edge Functions Supabase

```bash
# Installa Supabase CLI
npm install -g supabase

# Login
supabase login

# Deploy singola funzione
supabase functions deploy contact-form
supabase functions deploy demo-request

# Variabili d'ambiente per le Edge Functions (server-side)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<tua_chiave>
```

## Schema DB

Esegui `supabase/schema.sql` nella SQL Editor del progetto Supabase.
Crea le tabelle `contact_requests` e `demo_requests` con RLS abilitato.

## Palette colori

| Nome         | Hex       | Uso                        |
|--------------|-----------|----------------------------|
| Petrolio     | `#0B1F2A` | Sfondo principale          |
| Slate        | `#243447` | Sezioni / blocchi          |
| Oro          | `#C9A45C` | Accento / bottoni primari  |
| Salvia       | `#7FA39A` | Accento secondario / UI    |
| Nebbia       | `#F4F7F8` | Testo chiaro               |

## Prossimi step (sviluppo piattaforma)

- [ ] Auth avvocati (Supabase Auth)
- [ ] Dashboard studio (clienti, pratiche, documenti)
- [ ] Upload documenti (Supabase Storage)
- [ ] Gestione pagamenti
- [ ] Banca dati legale (upload + classificazione)
- [ ] Sistema revenue sharing
- [ ] Abbonamenti (Stripe)
