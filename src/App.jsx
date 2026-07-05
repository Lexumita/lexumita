import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'
import { Analytics } from '@vercel/analytics/react'
import { useAuth } from './context/AuthContext'
import { HelmetProvider } from 'react-helmet-async'
import Verifica2FA from './pages/auth/Verifica2FA'

import AdminLayout from './components/layouts/AdminLayout'
import AvvocatoLayout from './components/layouts/AvvocatoLayout'
import CommercialistaLayout from './components/layouts/CommercialistaLayout'
import ClienteLayout from './components/layouts/ClienteLayout'
import UserLayout from './components/layouts/UserLayout'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

// ── Vetrina ──
import Home from './pages/Home'
import PerAvvocati from '@/pages/PerAvvocati'
import LexAI from '@/pages/LexAI'
import Contatti from './pages/Contatti'
import PrivacyPolicy from '@/pages/PrivacyPolicy'
import TerminiServizio from '@/pages/TerminiServizio'

// ── Auth ──
import Login from './pages/auth/Login'
import Registrati from './pages/auth/Registrati'
import { RecuperaPassword, ResetPassword } from './pages/auth/Password'
import EmailVerificata from './pages/auth/EmailVerificata'

// ── Admin ──
import AdminDashboard from './pages/admin/Dashboard'
import AdminUtenti from './pages/admin/Utenti'
import AdminUtentiDettaglio from './pages/admin/UtentiDettaglio'
import { AdminProdotti, AdminProdottiForm } from './pages/admin/Prodotti'
import { AdminSentenze, AdminSentenzeDettaglio } from './pages/admin/Sentenze'
import { AdminPagamenti, AdminCompensi } from './pages/admin/Pagamenti'
import { AdminAssistenza, AdminAssistenzaDettaglio } from './pages/admin/Assistenza'
import AdminNormativa from './pages/admin/Normativa'
import AdminNormativaDettaglio from './pages/admin/NormativaDettaglio'
import LexLogs from './pages/admin/LexLogs'
import MailLog from '@/pages/admin/MailLog'
import AdminCalendario from './pages/admin/Calendario'
import AdminProfilo from './pages/admin/Profilo'

// ── Commercialista ──
import CommercialistaDashboard from './pages/commercialista/Dashboard'

// ── Avvocato ──
import AvvocatoDashboard from './pages/avvocato/Dashboard'
import { AvvocatoClienti } from './pages/avvocato/clienti/Lista'
import AvvocatoClientiNuovo from './pages/avvocato/clienti/Nuovo'
import AvvocatoClientiDettaglio from './pages/avvocato/clienti/Dettaglio'
import { AvvocatoPratiche, AvvocatoPraticheNuova } from './pages/avvocato/Pratiche'
import PraticaDettaglio from './pages/avvocato/PraticaDettaglio'
import AvvocatoStudio from './pages/avvocato/Studio'
import { AvvocatoAssistenza, AvvocatoAssistenzaNuovo, AvvocatoAssistenzaDettaglio } from './pages/avvocato/Assistenza'
import AvvocatoProfilo from './pages/avvocato/Profilo'
import AvvocatoFatturazione from './pages/avvocato/Fatturazione'
import AvvocatoFatturazioneNuova from './pages/avvocato/FatturazioneNuova'
import AvvocatoFatturazioneDettaglio from './pages/avvocato/FatturazioneDettaglio'
import AvvocatoCalendar from './pages/avvocato/AvvocatoCalendar'
import { BancaDati } from './pages/avvocato/BancaDati'
import Archivio from '@/pages/avvocato/Archivio'
import ArchivioDettaglio from '@/pages/avvocato/ArchivioDettaglio'
import SentenzaDettaglio from './pages/avvocato/SentenzaDettaglio'
import PrassiDettaglio from './pages/avvocato/PrassiDettaglio'
import SentenzaTributariaDettaglio from './pages/avvocato/SentenzaTributariaDettaglio'
import { NormaDettaglio } from './pages/avvocato/NormaDettaglio'
import SentenzaUeDettaglio from './pages/avvocato/SentenzaUeDettaglio'

// ── Cliente ──
import ClientePanoramica from './pages/cliente/Panoramica'
import ClientePratiche from './pages/cliente/Pratiche'
import ClienteAppuntamenti from './pages/cliente/Appuntamenti'
import ClienteDocumenti from './pages/cliente/Documenti'
import { ClienteComunicazioni, ClienteComunicazioniDettaglio, ClienteComunicazioniNuovo } from './pages/cliente/Comunicazioni'
import ClienteFatture from './pages/cliente/Fatture'
import ClienteProfilo from './pages/cliente/Profilo'

// ── User (area personale) ──
import { UserVerifica, UserVerificaStato } from './pages/user/Verifica'
import { UserAssistenza, UserAssistenzaNuovo, UserAssistenzaDettaglio } from './pages/user/Assistenza'
import UserProfilo from './pages/user/Profilo'
import Ricerche from './pages/user/Ricerche'
import EtichettaDettaglio from './pages/user/EtichettaDettaglio'
import Acquista from './pages/user/Acquista'

import ChatWidget from '@/components/ChatWidget'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000 } } })

// ─── Layout vetrina (con Navbar + Footer + Analytics) ───
// Analytics attivo solo su vetrina + auth: misura il funnel
// visitatore → registrato. L'area autenticata non viene tracciata.
function VetrinaLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-petrolio">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <Analytics />
    </div>
  )
}

// ─── Layout auth (login, registrati, recupera password, ecc.) ───
// Niente Navbar/Footer (gestiti dalle pagine stesse), ma Analytics presente
// per chiudere il funnel di conversione lato Vercel.
function AuthLayout({ children }) {
  return (
    <>
      {children}
      <Analytics />
    </>
  )
}

// ─── Wrapper protetti per ruolo + layout ───
function Avv({ children }) { return <ProtectedRoute roles={['avvocato']}><AvvocatoLayout>{children}</AvvocatoLayout></ProtectedRoute> }
function Adm({ children }) { return <ProtectedRoute roles={['admin']}><AdminLayout>{children}</AdminLayout></ProtectedRoute> }
function Cli({ children }) { return <ProtectedRoute roles={['cliente']}><ClienteLayout>{children}</ClienteLayout></ProtectedRoute> }
function Usr({ children }) { return <ProtectedRoute roles={['user']}><UserLayout>{children}</UserLayout></ProtectedRoute> }

// ─── Professionisti (avvocato + commercialista) ───
// ProLayout sceglie il layout in base al ruolo; DashboardRuolo la dashboard.
// Pro = rotte condivise tra i due profili professionali (stesso pattern di CH).
function ProLayout({ children }) {
  const { profile } = useAuth()
  const Layout = profile?.role === 'commercialista' ? CommercialistaLayout : AvvocatoLayout
  return <Layout>{children}</Layout>
}
function DashboardRuolo() {
  const { profile } = useAuth()
  return profile?.role === 'commercialista' ? <CommercialistaDashboard /> : <AvvocatoDashboard />
}
function Pro({ children }) { return <ProtectedRoute roles={['avvocato', 'commercialista']}><ProLayout>{children}</ProLayout></ProtectedRoute> }

// ─── Banca dati condivisa user + professionisti ───
// Il componente BancaDati gestisce internamente la differenza di ruolo
// (mostra/nasconde pannello pratiche, pulsanti "Aggiungi a pratica", ecc.)
function BancaDatiSharedUser({ children }) {
  return <ProtectedRoute roles={['user']}><UserLayout>{children}</UserLayout></ProtectedRoute>
}
function BancaDatiSharedAvv({ children }) {
  return <ProtectedRoute roles={['avvocato', 'commercialista']}><ProLayout>{children}</ProLayout></ProtectedRoute>
}

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <ChatWidget />
            <Routes>

              {/* ═══════════════════════════════════════════════════════
                VETRINA (pubblica, tracciata da Vercel Analytics)
                ═══════════════════════════════════════════════════════ */}
              <Route path="/" element={<VetrinaLayout><Home /></VetrinaLayout>} />
              <Route path="/per-avvocati" element={<VetrinaLayout><PerAvvocati /></VetrinaLayout>} />
              <Route path="/lex-ai" element={<VetrinaLayout><LexAI /></VetrinaLayout>} />
              <Route path="/contatti" element={<VetrinaLayout><Contatti /></VetrinaLayout>} />
              <Route path="/privacy" element={<VetrinaLayout><PrivacyPolicy /></VetrinaLayout>} />
              <Route path="/termini" element={<VetrinaLayout><TerminiServizio /></VetrinaLayout>} />

              {/* ═══════════════════════════════════════════════════════
                AUTH (tracciato da Vercel Analytics per misurare il funnel)
                ═══════════════════════════════════════════════════════ */}
              <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
              <Route path="/registrati" element={<AuthLayout><Registrati /></AuthLayout>} />
              <Route path="/recupera-password" element={<AuthLayout><RecuperaPassword /></AuthLayout>} />
              <Route path="/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />
              <Route path="/email-verificata" element={<AuthLayout><EmailVerificata /></AuthLayout>} />
              <Route path="/verifica-2fa" element={
                <ProtectedRoute roles={['admin', 'avvocato', 'commercialista', 'cliente', 'user']}>
                  <Verifica2FA />
                </ProtectedRoute>
              } />

              {/* ═══════════════════════════════════════════════════════
                ADMIN
                ═══════════════════════════════════════════════════════ */}
              <Route path="/admin/dashboard" element={<Adm><AdminDashboard /></Adm>} />
              <Route path="/admin/utenti" element={<Adm><AdminUtenti /></Adm>} />
              <Route path="/admin/utenti/:id" element={<Adm><AdminUtentiDettaglio /></Adm>} />
              <Route path="/admin/prodotti" element={<Adm><AdminProdotti /></Adm>} />
              <Route path="/admin/prodotti/nuovo" element={<Adm><AdminProdottiForm /></Adm>} />
              <Route path="/admin/prodotti/:id" element={<Adm><AdminProdottiForm /></Adm>} />
              <Route path="/admin/sentenze" element={<Adm><AdminSentenze /></Adm>} />
              <Route path="/admin/sentenze/:id" element={<Adm><AdminSentenzeDettaglio /></Adm>} />
              <Route path="/admin/pagamenti" element={<Adm><AdminPagamenti /></Adm>} />
              <Route path="/admin/compensi" element={<Adm><AdminCompensi /></Adm>} />
              <Route path="/admin/assistenza" element={<Adm><AdminAssistenza /></Adm>} />
              <Route path="/admin/assistenza/:id" element={<Adm><AdminAssistenzaDettaglio /></Adm>} />
              <Route path="/admin/normativa" element={<Adm><AdminNormativa /></Adm>} />
              <Route path="/admin/normativa/:tipo/:slug" element={<Adm><AdminNormativaDettaglio /></Adm>} />
              <Route path="/admin/mail-log" element={<Adm><MailLog /></Adm>} />
              {/* Retrocompat: vecchia rotta /admin/normativa/:codice → /admin/normativa/it/:codice */}
              <Route path="/admin/normativa/:codice" element={<Adm><AdminNormativaDettaglio /></Adm>} />
              <Route path="/admin/lex-logs" element={<Adm><LexLogs /></Adm>} />
              <Route path="/admin/calendario" element={<Adm><AdminCalendario /></Adm>} />
              <Route path="/admin/profilo" element={<Adm><AdminProfilo /></Adm>} />

              {/* ═══════════════════════════════════════════════════════
                PROFESSIONISTI (avvocato + commercialista)
                Rotte condivise: il layout/dashboard giusti li sceglie ProLayout.
                Le pratiche restano solo avvocato; il commercialista avrà i
                mandati (Banco Lavoro) con la Fase 1.
                ═══════════════════════════════════════════════════════ */}
              <Route path="/dashboard" element={<Pro><DashboardRuolo /></Pro>} />
              <Route path="/clienti" element={<Pro><AvvocatoClienti /></Pro>} />
              <Route path="/clienti/nuovo" element={<Pro><AvvocatoClientiNuovo /></Pro>} />
              <Route path="/clienti/:id" element={<Pro><AvvocatoClientiDettaglio /></Pro>} />
              <Route path="/pratiche" element={<Avv><AvvocatoPratiche /></Avv>} />
              <Route path="/pratiche/nuova" element={<Avv><AvvocatoPraticheNuova /></Avv>} />
              <Route path="/pratiche/:id" element={<Avv><PraticaDettaglio /></Avv>} />
              <Route path="/calendario" element={<Pro><AvvocatoCalendar /></Pro>} />
              <Route path="/fatturazione" element={<Pro><AvvocatoFatturazione /></Pro>} />
              <Route path="/fatturazione/nuova" element={<Pro><AvvocatoFatturazioneNuova /></Pro>} />
              <Route path="/fatturazione/:id" element={<Pro><AvvocatoFatturazioneDettaglio /></Pro>} />
              <Route path="/assistenza" element={<Pro><AvvocatoAssistenza /></Pro>} />
              <Route path="/assistenza/nuovo" element={<Pro><AvvocatoAssistenzaNuovo /></Pro>} />
              <Route path="/assistenza/:id" element={<Pro><AvvocatoAssistenzaDettaglio /></Pro>} />
              <Route path="/archivio" element={<Pro><Archivio /></Pro>} />
              <Route path="/archivio/:id" element={<Pro><ArchivioDettaglio /></Pro>} />
              <Route path="/profilo" element={<Pro><AvvocatoProfilo /></Pro>} />
              <Route path="/banca-dati/eur-lex/:id" element={<BancaDatiSharedAvv><SentenzaUeDettaglio /></BancaDatiSharedAvv>} />

              {/* Ricerche professionisti */}
              <Route path="/ricerche" element={<Pro><Ricerche /></Pro>} />
              <Route path="/etichette/:id" element={<Pro><EtichettaDettaglio /></Pro>} />

              {/* Banca dati avvocato (con pannello pratiche attivo) */}
              <Route path="/banca-dati" element={<BancaDatiSharedAvv><BancaDati /></BancaDatiSharedAvv>} />
              <Route path="/banca-dati/lexum/:id" element={<BancaDatiSharedAvv><SentenzaDettaglio fonte="lexum" /></BancaDatiSharedAvv>} />
              <Route path="/banca-dati/avvocato/:id" element={<BancaDatiSharedAvv><SentenzaDettaglio fonte="avvocato" /></BancaDatiSharedAvv>} />
              <Route path="/banca-dati/prassi/:id" element={<BancaDatiSharedAvv><PrassiDettaglio /></BancaDatiSharedAvv>} />
              <Route path="/banca-dati/norma/:id" element={<BancaDatiSharedAvv><NormaDettaglio /></BancaDatiSharedAvv>} />
              <Route path="/banca-dati/tributario/:id" element={<BancaDatiSharedAvv><SentenzaTributariaDettaglio /></BancaDatiSharedAvv>} />

              {/* Studio condiviso professionisti + user */}
              <Route path="/studio" element={
                <ProtectedRoute roles={['avvocato', 'commercialista', 'user']}>
                  <AvvocatoLayoutOrUser><AvvocatoStudio /></AvvocatoLayoutOrUser>
                </ProtectedRoute>
              } />

              {/* ═══════════════════════════════════════════════════════
                CLIENTE
                ═══════════════════════════════════════════════════════ */}
              <Route path="/portale" element={<Cli><ClientePanoramica /></Cli>} />
              <Route path="/portale/pratiche" element={<Cli><ClientePratiche /></Cli>} />
              <Route path="/portale/appuntamenti" element={<Cli><ClienteAppuntamenti /></Cli>} />
              <Route path="/portale/documenti" element={<Cli><ClienteDocumenti /></Cli>} />
              <Route path="/portale/comunicazioni" element={<Cli><ClienteComunicazioni /></Cli>} />
              <Route path="/portale/comunicazioni/nuovo" element={<Cli><ClienteComunicazioniNuovo /></Cli>} />
              <Route path="/portale/comunicazioni/:id" element={<Cli><ClienteComunicazioniDettaglio /></Cli>} />
              <Route path="/portale/fatture" element={<Cli><ClienteFatture /></Cli>} />
              <Route path="/portale/profilo" element={<Cli><ClienteProfilo /></Cli>} />

              {/* ═══════════════════════════════════════════════════════
                USER (area personale)
                ═══════════════════════════════════════════════════════ */}
              {/* Home utente = banca dati embedded */}
              <Route path="/area" element={<Usr><BancaDati /></Usr>} />
              <Route path="/area/ricerche" element={<Usr><Ricerche /></Usr>} />
              <Route path="/area/etichette/:id" element={<Usr><EtichettaDettaglio /></Usr>} />
              <Route path="/area/acquista" element={<Usr><Acquista /></Usr>} />
              <Route path="/area/assistenza" element={<Usr><UserAssistenza /></Usr>} />
              <Route path="/area/assistenza/nuovo" element={<Usr><UserAssistenzaNuovo /></Usr>} />
              <Route path="/area/assistenza/:id" element={<Usr><UserAssistenzaDettaglio /></Usr>} />
              <Route path="/area/profilo" element={<Usr><UserProfilo /></Usr>} />

              {/* Banca dati dettagli per user */}
              <Route path="/area/lexum/:id" element={<Usr><SentenzaDettaglio fonte="lexum" /></Usr>} />
              <Route path="/area/avvocato/:id" element={<Usr><SentenzaDettaglio fonte="avvocato" /></Usr>} />
              <Route path="/area/prassi/:id" element={<Usr><PrassiDettaglio /></Usr>} />
              <Route path="/area/norma/:id" element={<Usr><NormaDettaglio /></Usr>} />
              <Route path="/area/tributario/:id" element={<Usr><SentenzaTributariaDettaglio /></Usr>} />
              <Route path="/area/eur-lex/:id" element={<Usr><SentenzaUeDettaglio /></Usr>} />

              {/* Verifica identità (per diventare avvocato) */}
              <Route path="/verifica" element={<Usr><UserVerifica /></Usr>} />
              <Route path="/verifica/stato" element={<Usr><UserVerificaStato /></Usr>} />

              {/* ═══════════════════════════════════════════════════════
                REDIRECT (retro-compatibilità)
                ═══════════════════════════════════════════════════════ */}
              <Route path="/pagamenti" element={<Navigate to="/fatturazione" replace />} />
              <Route path="/abbonamenti" element={<Navigate to="/area/acquista" replace />} />
              <Route path="/abbonamenti/checkout" element={<Navigate to="/area/acquista" replace />} />
              <Route path="/normativa" element={<Navigate to="/banca-dati" replace />} />

              {/* Vecchie rotte ricerche/:id → etichette/:id (canonical change) */}
              <Route path="/ricerche/:id" element={<RicercheToEtichetta />} />
              <Route path="/area/ricerche/:id" element={<AreaRicercheToEtichetta />} />
              <Route path="/etichette" element={<Navigate to="/ricerche" replace />} />
              <Route path="/area/etichette" element={<Navigate to="/area/ricerche" replace />} />

              {/* Vecchie rotte /user/* → /area/* */}
              <Route path="/user/assistenza" element={<Navigate to="/area/assistenza" replace />} />
              <Route path="/user/assistenza/nuovo" element={<Navigate to="/area/assistenza/nuovo" replace />} />
              <Route path="/user/assistenza/:id" element={<UserRedirectAssistenza />} />
              <Route path="/user/profilo" element={<Navigate to="/area/profilo" replace />} />

              {/* ═══════════════════════════════════════════════════════
                FALLBACK
                ═══════════════════════════════════════════════════════ */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  )
}

// ─── Wrapper per /studio condiviso user/professionisti ───
function AvvocatoLayoutOrUser({ children }) {
  const { profile } = useAuth()
  const Layout = profile?.role === 'user' ? UserLayout
    : profile?.role === 'commercialista' ? CommercialistaLayout
      : AvvocatoLayout
  return <Layout>{children}</Layout>
}

// ─── Redirect dinamico per /user/assistenza/:id → /area/assistenza/:id ───
function UserRedirectAssistenza() {
  const path = window.location.pathname.replace('/user/', '/area/')
  return <Navigate to={path} replace />
}

// ─── Redirect ricerche/:id → etichette/:id (rinominato per chiarezza) ───
function RicercheToEtichetta() {
  const path = window.location.pathname.replace('/ricerche/', '/etichette/')
  return <Navigate to={path} replace />
}
function AreaRicercheToEtichetta() {
  const path = window.location.pathname.replace('/area/ricerche/', '/area/etichette/')
  return <Navigate to={path} replace />
}