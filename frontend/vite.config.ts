import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Im Entwicklungsmodus leitet Vite alle /api-Aufrufe ans Backend weiter.
    // So ruft das Frontend immer relative URLs auf ("/api/health") –
    // genau wie später im Betrieb, wo nginx diese Weiterleitung übernimmt.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
