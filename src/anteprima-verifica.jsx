// Anteprima TEMPORANEA (non va nel repo): la scelta della professione con i componenti veri, nello spazio
// della pagina dell'area (a destra del menu).
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import './index.css'
import { SceltaDirezione } from '@/pages/user/Verifica'

createRoot(document.getElementById('root')).render(
  <MemoryRouter>
    <div className="flex min-h-screen">
      <div className="w-64 shrink-0 bg-slate/60 border-r border-white/5" />
      <main className="flex-1 p-8">
        <SceltaDirezione onScelta={() => {}} loading={false} nuovoTicket="/area/assistenza/nuovo" />
      </main>
    </div>
  </MemoryRouter>
)
