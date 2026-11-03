import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { createHash } from 'crypto'

// L'impronta dei JSON di traduzione: cambia solo quando cambiano loro.
function improntaTraduzioni() {
  const hash = createHash('sha1')
  const visita = (cartella) => {
    for (const nome of fs.readdirSync(cartella).sort()) {
      const percorso = path.join(cartella, nome)
      if (fs.statSync(percorso).isDirectory()) visita(percorso)
      else if (nome.endsWith('.json')) hash.update(percorso.slice(cartella.length)).update(fs.readFileSync(percorso))
    }
  }
  visita(path.resolve(__dirname, 'public/locales'))
  return hash.digest('hex').slice(0, 12)
}

export default defineConfig({
  plugins: [react()],
  // Identificatore di build: cache-busting dei JSON di traduzione scaricati
  // dalla rete (i namespace fuori dal guscio, che entra invece nel bundle).
  // 03-11-2026: dall'impronta dei JSON e non più dall'ora. A ogni articolo pubblicato il sito si ricostruisce da
  // solo: con l'ora cambiavano i nomi di tutti i file anche a codice fermo, e chi aveva una pagina aperta
  // chiedeva file spariti («Failed to fetch dynamically imported module»).
  define: {
    __BUILD_ID__: JSON.stringify(improntaTraduzioni()),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173 },
})
