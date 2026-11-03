import './i18n'  // ← DEVE restare la prima riga: i testi devono esserci prima del primo disegno
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { togliStatico } from './lib/statico'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Rete di sicurezza: se una pagina non toglie il testo già pronto (vedi lib/statico.js), lo si toglie qui.
setTimeout(togliStatico, 3000)
