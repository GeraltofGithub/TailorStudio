import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Rewrite Spring Security redirects away from legacy *.html pages.
      // This keeps the browser on :5173 even if backend sends Location: /app/dashboard.html etc.
      //
      // NOTE: This only affects local dev (Vite proxy). In production you should configure backend to redirect
      // to SPA routes or serve the SPA.
      //
      // We keep it minimal and safe: only rewrite Location headers.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      '/login': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        // Only proxy the form POST. Let SPA handle GET /login and /login?error=1.
        bypass: (req) => {
          if (req.method && req.method !== 'POST') return '/index.html'
          return undefined
        },
        configure: (proxy: any) => {
          proxy.on('proxyRes', (proxyRes: any) => {
            const rawLoc = proxyRes.headers?.location
            if (!rawLoc || typeof rawLoc !== 'string') return
            // Spring may send absolute redirects like:
            //   Location: http://localhost:8081/login.html?error=1
            // Normalize to path+query first so we can rewrite.
            let loc = rawLoc
            if (/^https?:\/\//i.test(loc)) {
              try {
                const u = new URL(loc)
                loc = `${u.pathname}${u.search || ''}`
              } catch {
                // keep raw
              }
            }
            const map: Record<string, string> = {
              '/index.html': '/',
              '/login.html': '/login',
              '/signup.html': '/signup',
              '/join.html': '/join',
              '/app/dashboard.html': '/app/dashboard',
              '/app/customers.html': '/app/customers',
              '/app/customer.html': '/app/customer',
              '/app/orders.html': '/app/orders',
              '/app/order.html': '/app/order',
              '/app/payments.html': '/app/payments',
              '/app/team.html': '/app/team',
              '/app/settings.html': '/app/settings',
              '/app/phonepe-return.html': '/app/phonepe-return',
            }
            for (const [from, to] of Object.entries(map)) {
              if (loc === from) {
                proxyRes.headers.location = to
                return
              }
              if (loc.startsWith(from + '?')) {
                proxyRes.headers.location = to + loc.slice(from.length)
                return
              }
            }
          })
        },
      },
      // Local dev: backend Spring Boot on 8081.
      // In production (Vercel), set VITE_API_BASE_URL to your Render backend URL.
      '/api': { target: 'http://localhost:8081', changeOrigin: true },
      // Logout can redirect to /index.html; rewrite it too.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      '/logout': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        // Logout endpoint is POST-only. Let SPA handle accidental GETs.
        bypass: (req) => {
          if (req.method && req.method !== 'POST') return '/index.html'
          return undefined
        },
        configure: (proxy: any) => {
          proxy.on('proxyRes', (proxyRes: any) => {
            const rawLoc = proxyRes.headers?.location
            if (!rawLoc || typeof rawLoc !== 'string') return
            let loc = rawLoc
            if (/^https?:\/\//i.test(loc)) {
              try {
                const u = new URL(loc)
                loc = `${u.pathname}${u.search || ''}`
              } catch {
                // keep raw
              }
            }
            if (loc === '/index.html') proxyRes.headers.location = '/'
          })
        },
      },
    },
  },
})
