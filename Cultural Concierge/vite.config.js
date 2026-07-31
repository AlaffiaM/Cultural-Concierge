import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config: React plugin + dev proxy to local backend
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    proxy: {
      // Forward /api/* requests to the Express backend during development
      // Avoids CORS issues — the frontend thinks it's talking to its own origin
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
