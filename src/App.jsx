import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'
import { useAuth } from './context/AuthContext'

import AdminLayout from './components/layouts/AdminLayout'
import AvvocatoLayout from './components/layouts/AvvocatoLayout'
import ClienteLayout from './components/layouts/ClienteLayout'
import UserLayout from './components/layouts/UserLayout'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

import Home from './pages/Home'
import PerAvvocati from '@/pages/PerAvvocati'
import LexAI from '@/pages/LexAI'
import Contatti from './pages/Contatti'

import RegistrazioneLex from '@/pages/auth/RegistrazioneLex'
import Login from './pages/auth/Login'
import Registrati from './pages/auth/Registrati'
import { RecuperaPassword, ResetPassword } from './pages/auth/Password'
import PrivacyPolicy from '@/pages/PrivacyPolicy'
import TerminiServizio from '@/pages/TerminiServizio'

import AdminDashboard from './pages/admin/Dashboard'
import AdminUtenti from './pages/admin/Utenti'
import AdminUtentiDettaglio from './pages/admin/UtentiDettaglio'
import { AdminProdotti, AdminProdottiForm } from './pages/admin/Prodotti'
import { AdminSentenze, AdminSentenzeDettaglio } from './pages/admin/Sentenze'
import { AdminPagamenti, AdminCompensi } from './pages/admin/Pagamenti'
import { AdminAssistenza, AdminAssistenzaDettaglio } from './pages/admin/Assistenza'
import AdminNormativa from './pages/admin/Normativa'
import AdminNormativaDettaglio from './pages/admin/NormativaDettaglio'

import AvvocatoDashboard from './pages/avvocato/Dashboard'
import { AvvocatoClienti, AvvocatoClientiNuovo, AvvocatoClientiDettaglio } from './pages/avvocato/Clienti'
import { AvvocatoPratiche, AvvocatoPraticheNuova } from './pages/avvocato/Pratiche'
import PraticaDettaglio from './pages/avvocato/PraticaDettaglio'
import { AvvocatoSentenze, AvvocatoSentenzeNuova, AvvocatoSentenzeDettaglio, AvvocatoSentenzeModifica } from './pages/avvocato/Sentenze'
import AvvocatoStudio from './pages/avvocato/Studio'
import { AvvocatoAssistenza, AvvocatoAssistenzaNuovo, AvvocatoAssistenzaDettaglio } from './pages/avvocato/Assistenza'
import AvvocatoProfilo from './pages/avvocato/Profilo'
import AvvocatoPagamenti from './pages/avvocato/Pagamenti'
import AvvocatoCalendar from './pages/avvocato/AvvocatoCalendar'
import { AvvocatoNormativa, AvvocatoNormativaDettaglio } from './pages/avvocato/Normativa'
import Archivio from '@/pages/avvocato/Archivio'
import ArchivioDettaglio from '@/pages/avvocato/ArchivioDettaglio'

import { BancaDatiCatalogo, BancaDatiDettaglio, BancaDatiAcquista } from './pages/BancaDati'
import ClientePanoramica from './pages/cliente/Panoramica'
import ClientePratiche from './pages/cliente/Pratiche'
import ClienteAppuntamenti from './pages/cliente/Appuntamenti'
import ClienteDocumenti from './pages/cliente/Documenti'
import { ClienteComunicazioni, ClienteComunicazioniDettaglio, ClienteComunicazioniNuovo } from './pages/cliente/Comunicazioni'
import ClienteFatture from './pages/cliente/Fatture'
import ClienteProfilo from './pages/cliente/Profilo'
import { UserVerifica, UserVerificaStato } from './pages/user/Verifica'
import { UserAssistenza, UserAssistenzaNuovo, UserAssistenzaDettaglio } from './pages/user/Assistenza'
import UserProfilo from './pages/user/Profilo'
import AreaPersonale from '@/pages/AreaPersonale'
import ChatWidget from '@/components/ChatWidget'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000 } } })

function VetrinaLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-petrolio">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

function Avv({ children }) {
  return <ProtectedRoute roles={['avvocato']}><AvvocatoLayout>{children}</AvvocatoLayout></ProtectedRoute>
}
function Adm({ children }) {
  return <ProtectedRoute roles={['admin']}><AdminLayout>{children}</AdminLayout></ProtectedRoute>
}
function Cli({ children }) {
  return <ProtectedRoute roles={['cliente']}><ClienteLayout>{children}</ClienteLayout></ProtectedRoute>
}
function Usr({ children }) {
  return <ProtectedRoute roles={['user']}><UserLayout>{children}</UserLayout></ProtectedRoute>
}

function BancaDatiWrapper({ children }) {
  const { profile } = useAuth()
  const Layout = profile?.role === 'user' ? UserLayout : AvvocatoLayout
  return (
    <ProtectedRoute roles={['avvocato', 'user']}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <ChatWidget />
          <Routes>
            {/* Vetrina */}
            <Route path="/" element={<VetrinaLayout><Home /></VetrinaLayout>} />
            <Route path="/per-avvocati" element={<VetrinaLayout><PerAvvocati /></VetrinaLayout>} />
            <Route path="/lex-ai" element={<VetrinaLayout><LexAI /></VetrinaLayout>} />
            <Route path="/contatti" element={<VetrinaLayout><Contatti /></VetrinaLayout>} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/registrati" element={<Registrati />} />
            <Route path="/recupera-password" element={<RecuperaPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<VetrinaLayout><PrivacyPolicy /></VetrinaLayout>} />
            <Route path="/termini" element={<VetrinaLayout><TerminiServizio /></VetrinaLayout>} />

            {/* Admin */}
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
            <Route path="/admin/normativa/:codice" element={<Adm><AdminNormativaDettaglio /></Adm>} />

            {/* Avvocato */}
            <Route path="/dashboard" element={<Avv><AvvocatoDashboard /></Avv>} />
            <Route path="/clienti" element={<Avv><AvvocatoClienti /></Avv>} />
            <Route path="/clienti/nuovo" element={<Avv><AvvocatoClientiNuovo /></Avv>} />
            <Route path="/clienti/:id" element={<Avv><AvvocatoClientiDettaglio /></Avv>} />
            <Route path="/pratiche" element={<Avv><AvvocatoPratiche /></Avv>} />
            <Route path="/pratiche/nuova" element={<Avv><AvvocatoPraticheNuova /></Avv>} />
            <Route path="/pratiche/:id" element={<Avv><PraticaDettaglio /></Avv>} />
            <Route path="/calendario" element={<Avv><AvvocatoCalendar /></Avv>} />
            <Route path="/sentenze" element={<Avv><AvvocatoSentenze /></Avv>} />
            <Route path="/sentenze/nuova" element={<Avv><AvvocatoSentenzeNuova /></Avv>} />
            <Route path="/sentenze/:id" element={<Avv><AvvocatoSentenzeDettaglio /></Avv>} />
            <Route path="/sentenze/:id/modifica" element={<Avv><AvvocatoSentenzeModifica /></Avv>} />
            <Route path="/pagamenti" element={<Avv><AvvocatoPagamenti /></Avv>} />
            <Route path="/assistenza" element={<Avv><AvvocatoAssistenza /></Avv>} />
            <Route path="/archivio" element={<Avv><Archivio /></Avv>} />
            <Route path="/assistenza/nuovo" element={<Avv><AvvocatoAssistenzaNuovo /></Avv>} />
            <Route path="/assistenza/:id" element={<Avv><AvvocatoAssistenzaDettaglio /></Avv>} />
            <Route path="/profilo" element={<Avv><AvvocatoProfilo /></Avv>} />
            <Route path="/archivio/:id" element={<Avv><ArchivioDettaglio /></Avv>} />

            {/* Cliente */}
            <Route path="/portale" element={<Cli><ClientePanoramica /></Cli>} />
            <Route path="/portale/pratiche" element={<Cli><ClientePratiche /></Cli>} />
            <Route path="/portale/appuntamenti" element={<Cli><ClienteAppuntamenti /></Cli>} />
            <Route path="/portale/documenti" element={<Cli><ClienteDocumenti /></Cli>} />
            <Route path="/portale/comunicazioni" element={<Cli><ClienteComunicazioni /></Cli>} />
            <Route path="/portale/comunicazioni/nuovo" element={<Cli><ClienteComunicazioniNuovo /></Cli>} />
            <Route path="/portale/comunicazioni/:id" element={<Cli><ClienteComunicazioniDettaglio /></Cli>} />
            <Route path="/portale/fatture" element={<Cli><ClienteFatture /></Cli>} />
            <Route path="/portale/profilo" element={<Cli><ClienteProfilo /></Cli>} />

            {/* User */}
            <Route path="/verifica" element={<Usr><UserVerifica /></Usr>} />
            <Route path="/verifica/stato" element={<Usr><UserVerificaStato /></Usr>} />
            <Route path="/user/assistenza" element={<Usr><UserAssistenza /></Usr>} />
            <Route path="/user/assistenza/nuovo" element={<Usr><UserAssistenzaNuovo /></Usr>} />
            <Route path="/user/assistenza/:id" element={<Usr><UserAssistenzaDettaglio /></Usr>} />
            <Route path="/user/profilo" element={<Usr><UserProfilo /></Usr>} />

            <Route path="/registrati-lex" element={<RegistrazioneLex />} />
            <Route path="/area-personale" element={<ProtectedRoute roles={['lex_user']}><AreaPersonale /></ProtectedRoute>} />

            {/* Condivise: avvocato + user */}
            <Route path="/studio" element={<BancaDatiWrapper><AvvocatoStudio /></BancaDatiWrapper>} />
            <Route path="/banca-dati" element={<BancaDatiWrapper><BancaDatiCatalogo /></BancaDatiWrapper>} />
            <Route path="/banca-dati/:id" element={<BancaDatiWrapper><BancaDatiDettaglio /></BancaDatiWrapper>} />
            <Route path="/banca-dati/:id/acquista" element={<BancaDatiWrapper><BancaDatiAcquista /></BancaDatiWrapper>} />
            <Route path="/normativa" element={<BancaDatiWrapper><AvvocatoNormativa /></BancaDatiWrapper>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}