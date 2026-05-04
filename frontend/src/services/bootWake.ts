import { apiUrl } from '../utils/apiOrigin'

export type WelcomePayload = { ok?: boolean; message?: string; tagline?: string }

const BOOT_FETCH_MS = 45_000

async function getJson<T>(path: string, parentSignal?: AbortSignal): Promise<T | null> {
  const ctrl = new AbortController()
  const tid = window.setTimeout(() => ctrl.abort(), BOOT_FETCH_MS)
  const onParent = () => {
    window.clearTimeout(tid)
    ctrl.abort()
  }
  if (parentSignal) {
    if (parentSignal.aborted) {
      window.clearTimeout(tid)
      return null
    }
    parentSignal.addEventListener('abort', onParent, { once: true })
  }
  try {
    const r = await fetch(apiUrl(path), {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      signal: ctrl.signal,
    })
    if (!r.ok) return null
    const ct = r.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return null
    return (await r.json()) as T
  } catch {
    return null
  } finally {
    window.clearTimeout(tid)
    if (parentSignal) parentSignal.removeEventListener('abort', onParent)
  }
}

/** First request — wakes a cold JVM (e.g. Render). */
export async function fetchBootHealth(signal?: AbortSignal): Promise<boolean> {
  const h = await getJson<{ ok?: boolean }>('/api/health', signal)
  return !!h?.ok
}

/** Second request — welcome copy + extra load while the app is warming. */
export async function fetchBootWelcome(signal?: AbortSignal): Promise<WelcomePayload> {
  const welcome = await getJson<WelcomePayload>('/api/welcome', signal)
  return {
    ok: !!welcome?.ok,
    message: welcome?.message,
    tagline: welcome?.tagline,
  }
}
