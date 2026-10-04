/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development mode Vite forwards all /api calls to the backend.
    // That way the frontend always calls relative URLs ("/api/health") –
    // exactly like later in production, where nginx does the forwarding.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    // Simulated browser (DOM) for component tests
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
