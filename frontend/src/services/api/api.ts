import Cookies from 'js-cookie'

import { BASE_URL } from '../../utils/constants'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

class Api {
  private _csrfPrimed = false

  private _joinUrl(path: string) {
    if (!BASE_URL) return path
    return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
  }

  private async _ensureCsrfCookie() {
    const existing = Cookies.get('XSRF-TOKEN')
    if (existing) {
      this._csrfPrimed = true
      return existing
    }
    // Spring issues CSRF token cookie on (some) GETs; touch a backend endpoint first.
    try {
      await fetch(this._joinUrl('/api/me'), { method: 'GET', credentials: 'include', cache: 'no-store' })
    } catch {
      // ignore
    }
    // Cookie set via Set-Cookie can be visible slightly after the fetch resolves.
    for (let i = 0; i < 8; i++) {
      const t = Cookies.get('XSRF-TOKEN')
      if (t) {
        this._csrfPrimed = true
        return t
      }
      await new Promise((r) => window.setTimeout(r, 25))
    }
    const t = Cookies.get('XSRF-TOKEN') || ''
    if (t) this._csrfPrimed = true
    return t
  }

  private _csrfHeaders(contentType: string) {
    const t = Cookies.get('XSRF-TOKEN')
    const h: Record<string, string> = { Accept: 'application/json' }
    if (contentType) h['Content-Type'] = contentType
    if (t) h['X-XSRF-TOKEN'] = t
    return h
  }

  private async _request<T>(method: HttpMethod, url: string, body?: unknown): Promise<T> {
    const hasBody = body !== undefined && body !== null && method !== 'GET'
    const contentType = hasBody ? 'application/json' : ''
    const isWrite = method !== 'GET'

    // Prime CSRF once before the first write, so the very first POST/PUT/PATCH/DELETE never fails.
    if (isWrite && !this._csrfPrimed) await this._ensureCsrfCookie()

    const doFetch = async () =>
      fetch(this._joinUrl(url), {
        method,
        credentials: 'include',
        cache: 'no-store',
        headers: this._csrfHeaders(contentType),
        body: hasBody ? JSON.stringify(body) : undefined,
      })

    let r = await doFetch()

    // If CSRF cookie was missing/stale, Spring returns 403 and also sets XSRF-TOKEN cookie.
    // Retry once after ensuring the cookie exists.
    if (isWrite && r.status === 403) {
      this._csrfPrimed = false
      await this._ensureCsrfCookie()
      r = await doFetch()
    }

    if (r.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:logout'))
    }

    if (!r.ok) {
      // Try to throw JSON error (same as backend often returns).
      let payload: any = null
      try {
        const text = await r.text()
        payload = text ? JSON.parse(text) : null
      } catch {
        payload = null
      }
      const err: any = new Error(payload?.error || payload?.message || `Request failed (${r.status})`)
      err.status = r.status
      err.payload = payload
      throw err
    }

    // Empty response
    const ct = r.headers.get('content-type') || ''
    if (!ct.includes('application/json')) {
      return (undefined as unknown) as T
    }
    return (await r.json()) as T
  }

  _get<T = unknown>(url: string): Promise<T> {
    return this._request<T>('GET', url)
  }

  _post<T = unknown>(url: string, data?: unknown): Promise<T> {
    return this._request<T>('POST', url, data ?? {})
  }

  _put<T = unknown>(url: string, data?: unknown): Promise<T> {
    return this._request<T>('PUT', url, data ?? {})
  }

  _patch<T = unknown>(url: string, data?: unknown): Promise<T> {
    return this._request<T>('PATCH', url, data ?? {})
  }
}

const api = new Api()
export { api }

