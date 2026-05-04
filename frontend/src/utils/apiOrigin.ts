import { BASE_URL } from './constants'

/** Absolute API origin for cross-origin production (e.g. Vercel → Render), or empty for same-origin + Vite proxy. */
export function apiOrigin(): string {
  return BASE_URL.replace(/\/$/, '')
}

/** Build URL for a path like `/api/health` — works in dev (proxy) and prod (`VITE_API_BASE_URL`). */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  const o = apiOrigin()
  return o ? `${o}${p}` : p
}
