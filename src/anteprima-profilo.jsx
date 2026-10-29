// Anteprima TEMPORANEA (non va nel repo): pagine vere con un utente e dati finti.
// Il client Supabase qui risponde da solo: niente accesso, niente database.
// ?pagina=profilo|verifica|scelta|chat  ?layout=user|avvocato|commercialista  ?paese=IT|CH  ?pagamenti=N
// ?direzione=avvocato|commercialista  ?etichette=N
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import './index.css'
import { supabase } from '@/lib/supabase'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import UserProfilo from '@/pages/user/Profilo'
import { UserVerifica, SceltaDirezione } from '@/pages/user/Verifica'
import { NuovaChat } from '@/pages/avvocato/BancaDati'
import UserLayout from '@/components/layouts/UserLayout'
import AvvocatoLayout from '@/components/layouts/AvvocatoLayout'
import CommercialistaLayout from '@/components/layouts/CommercialistaLayout'

const parametri = new URLSearchParams(location.search)
const layout = parametri.get('layout')
const UTENTE = { id: 'anteprima', email: 'usertest@gmail.com' }
const PROFILO = {
    id: 'anteprima', email: 'usertest@gmail.com', role: layout && layout !== 'user' ? layout : 'user', nome: 'user', cognome: 'test', telefono: '',
    paese: parametri.get('paese') ?? 'CH', indirizzo: 'Via Domenico Fontana 1', cap: '6900', comune: 'Lugano',
    tipo_richiesta: parametri.get('direzione') ?? 'avvocato',
}
const PAGAMENTI = Array.from({ length: Number(parametri.get('pagamenti') ?? 3) }, (_, i) => ({
    id: String(i), prodotto_nome: 'Pacchetto Lampo · 5 crediti Lex AI', importo: 3.99, stato: 'pagato',
    created_at: '2026-10-28T21:00:00Z', metadati: {},
}))
const COLORI = ['#7FA39A', '#C9A45C', '#D96B6B', '#6B8FD9']
const id = i => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const ETICHETTE = Array.from({ length: Number(parametri.get('etichette') ?? 3) }, (_, i) => ({
    id: id(i), nome: ['Affitto', 'Lavoro', 'Prova etichetta', 'Condominio con un nome molto lungo da tagliare', 'Successioni'][i % 5] + (i >= 5 ? ` ${i}` : ''), colore: COLORI[i % 4],
}))
// ogni etichetta ha due elementi: una ricerca che esiste e una cancellata (quella non si conta)
const ELEMENTI = ETICHETTE.flatMap((e, i) => [
    { etichetta_id: e.id, tipo: 'ricerca_ai', elemento_id: id(1000 + i) },
    { etichetta_id: e.id, tipo: 'ricerca_ai', elemento_id: id(5000 + i) },
])
const DATI = {
    profiles: [PROFILO],
    transazioni: PAGAMENTI,
    etichette: ETICHETTE,
    elementi_etichette: ELEMENTI,
    ricerche: ETICHETTE.map((_, i) => ({ id: id(1000 + i) })),
}
window.__dati = DATI   // per le prove dalla console

// una «query» finta: ogni metodo restituisce sé stessa, e alla fine dà i dati
function risposta(dati) {
    const q = new Proxy(function () { }, {
        get(_, prop) {
            if (prop === 'then') return (ok, ko) => Promise.resolve({ data: dati, error: null, count: Array.isArray(dati) ? dati.length : 0 }).then(ok, ko)
            if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ data: Array.isArray(dati) ? (dati[0] ?? null) : dati, error: null })
            return () => q
        },
    })
    return q
}
supabase.auth.getSession = async () => ({ data: { session: { user: UTENTE, access_token: 'finto' } } })
supabase.auth.getUser = async () => ({ data: { user: UTENTE } })
supabase.auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe() { } } } })
supabase.from = tabella => risposta(DATI[tabella] ?? [])
supabase.rpc = () => risposta(null)
supabase.channel = () => { const c = { on: () => c, subscribe: () => c, unsubscribe: () => { } }; return c }
supabase.removeChannel = () => { }

// come nel sito: la pagina parte quando il profilo è arrivato
function Pagina() {
    const { profile } = useAuth()
    const pagina = parametri.get('pagina') ?? 'profilo'
    if (pagina === 'scelta') return <SceltaDirezione onScelta={() => { }} loading={false} nuovoTicket="/area/assistenza/nuovo" />
    if (!profile) return null
    if (pagina === 'chat') return <NuovaChat />
    return pagina === 'verifica' ? <UserVerifica /> : <UserProfilo />
}

const LAYOUT = { user: UserLayout, avvocato: AvvocatoLayout, commercialista: CommercialistaLayout }
const Layout = LAYOUT[layout]
const percorso = layout === 'user' ? '/area/chat' : layout ? '/chat' : '/area/profilo'

createRoot(document.getElementById('root')).render(
    <MemoryRouter initialEntries={[percorso]}>
        <AuthProvider>
            {Layout ? (
                <Layout><Pagina /></Layout>
            ) : (
                <div className="flex min-h-screen">
                    <div className="w-64 shrink-0 bg-slate/60 border-r border-white/5" />
                    <main className="flex-1 p-8"><Pagina /></main>
                </div>
            )}
        </AuthProvider>
    </MemoryRouter>
)
