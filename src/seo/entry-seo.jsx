// src/seo/entry-seo.jsx
//
// 03-11-2026: disegna le pagine della vetrina in testo, durante il build (vite build --ssr). Lo usa
// scripts/generate-seo-pages.mjs per metterlo dentro l'HTML: i motori delle AI non eseguono JavaScript,
// quindi senza questo vedevano una pagina vuota. Niente hydrate: nel browser React ridisegna da capo.
import '@/i18n'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import GuscioVetrina from '@/components/layouts/GuscioVetrina'
import Home from '@/pages/Home'
import PerAvvocati from '@/pages/PerAvvocati'
import PerCommercialisti from '@/pages/PerCommercialisti'
import Contatti from '@/pages/Contatti'
import Novita from '@/pages/Novita'
import NovitaArticolo from '@/pages/NovitaArticolo'
import Strumenti from '@/pages/strumenti/Strumenti'
import CalcoloParcella from '@/pages/strumenti/CalcoloParcella'
import CreaFattura from '@/pages/strumenti/CreaFattura'
import CalcoloDanno from '@/pages/strumenti/CalcoloDanno'

// dati: { articoli, articolo, correlati }, letti da Supabase dallo script
export function disegna(percorso, dati = {}) {
    const queryClient = new QueryClient()
    const pagina = (el) => <GuscioVetrina>{el}</GuscioVetrina>
    return renderToStaticMarkup(
        <HelmetProvider context={{}}>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <StaticRouter location={percorso}>
                        <Routes>
                            <Route path="/" element={pagina(<Home />)} />
                            <Route path="/per-avvocati" element={pagina(<PerAvvocati />)} />
                            <Route path="/per-commercialisti" element={pagina(<PerCommercialisti />)} />
                            <Route path="/contatti" element={pagina(<Contatti />)} />
                            <Route path="/strumenti" element={pagina(<Strumenti />)} />
                            <Route path="/strumenti/calcolo-parcella-avvocato" element={pagina(<CalcoloParcella />)} />
                            <Route path="/strumenti/crea-fattura" element={pagina(<CreaFattura />)} />
                            <Route path="/strumenti/calcolo-danno-biologico" element={pagina(<CalcoloDanno />)} />
                            <Route path="/novita" element={pagina(<Novita preArticoli={dati.articoli} />)} />
                            <Route path="/novita/argomento/:argomento" element={pagina(<Novita preArticoli={dati.articoli} />)} />
                            <Route path="/novita/:slug" element={pagina(<NovitaArticolo preArticolo={dati.articolo} preCorrelati={dati.correlati} />)} />
                        </Routes>
                    </StaticRouter>
                </AuthProvider>
            </QueryClientProvider>
        </HelmetProvider>
    )
}
