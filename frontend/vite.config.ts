import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Local dev: Node API (PORT in server/.env, default 8001).
      '/api': { target: 'http://localhost:8001', changeOrigin: true },
      '/ws': { target: 'http://localhost:8001', ws: true, changeOrigin: true },
    },
  },
})
