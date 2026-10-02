import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  // Identificatore di build: cache-busting dei JSON di traduzione scaricati
  // dalla rete (i namespace fuori dal guscio, che entra invece nel bundle).
  define: {
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173 },
})
