import { BASE_URL } from '../../utils/constants'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

class Api {
  private _csrfPrimed = false
  private _csrfToken = ''

  private _joinUrl(path: string) {
    if (!BASE_URL) return path
    return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
  }

  private async _ensureCsrfToken() {
    if (this._csrfToken) {
      this._csrfPrimed = true
      return this._csrfToken
    }
    try {
      const r = await fetch(this._joinUrl('/api/me'), { method: 'GET', credentials: 'include', cache: 'no-store' })
      const t = r.headers.get('x-xsrf-token') || r.headers.get('X-XSRF-TOKEN') || ''
      if (t) {
        this._csrfToken = t
        this._csrfPrimed = true
        return t
      }
    } catch {
      // ignore
    }
    return this._csrfToken
  }

  private _csrfHeaders(contentType: string) {
    const h: Record<string, string> = { Accept: 'application/json' }
    if (contentType) h['Content-Type'] = contentType
    if (this._csrfToken) h['X-XSRF-TOKEN'] = this._csrfToken
    return h
  }

  private async _request<T>(method: HttpMethod, url: string, body?: unknown, fetchOpts?: { signal?: AbortSignal }): Promise<T> {
    const hasBody = body !== undefined && body !== null && method !== 'GET'
    const contentType = hasBody ? 'application/json' : ''
    const isWrite = method !== 'GET'

    // Prime CSRF once before the first write (skip public /api/auth/* — CSRF ignored there; /api/me would 401 before login).
    const authPublicWrite = url.startsWith('/api/auth/')
    if (isWrite && !this._csrfPrimed && !authPublicWrite) await this._ensureCsrfToken()

    const doFetch = async () =>
      fetch(this._joinUrl(url), {
        method,
        credentials: 'include',
        cache: method === 'GET' ? 'default' : 'no-store',
        headers: this._csrfHeaders(contentType),
        body: hasBody ? JSON.stringify(body) : undefined,
        signal: fetchOpts?.signal,
      })

    let r = await doFetch()

    const nextToken = r.headers.get('x-xsrf-token') || r.headers.get('X-XSRF-TOKEN') || ''
    if (nextToken) {
      this._csrfToken = nextToken
      this._csrfPrimed = true
    }

    // If CSRF cookie was missing/stale, Spring returns 403 and also sets XSRF-TOKEN cookie.
    // Retry once after ensuring the cookie exists.
    if (isWrite && r.status === 403) {
      this._csrfPrimed = false
      await this._ensureCsrfToken()
      r = await doFetch()
    }

    if (r.status === 401) {
      const path = url.split('?')[0]
      const isMeProbe = method === 'GET' && path === '/api/me'
      if (!path.startsWith('/api/auth/') && !isMeProbe) {
        window.dispatchEvent(new CustomEvent('auth:logout'))
      }
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

  /**
   * Spring Security logout is a form POST that typically responds with a redirect/HTML (not JSON).
   * Use the same CSRF priming + retry logic as JSON requests, but do not attempt JSON parsing.
   */
  async postFormLogout(url: string, body: URLSearchParams): Promise<Response> {
    const contentType = 'application/x-www-form-urlencoded'
    const isWrite = true

    if (isWrite && !this._csrfPrimed) await this._ensureCsrfToken()

    const doFetch = async () =>
      fetch(this._joinUrl(url), {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        // Avoid following Spring's legacy HTML redirects on the API host (often 404 for SPAs).
        redirect: 'manual',
        headers: this._csrfHeaders(contentType),
        body: body.toString(),
      })

    let r = await doFetch()

    const nextToken = r.headers.get('x-xsrf-token') || r.headers.get('X-XSRF-TOKEN') || ''
    if (nextToken) {
      this._csrfToken = nextToken
      this._csrfPrimed = true
    }

    if (isWrite && r.status === 403) {
      this._csrfPrimed = false
      await this._ensureCsrfToken()
      r = await doFetch()
    }

    if (r.status === 401) {
      const path = url.split('?')[0]
      const isMeProbe = path === '/api/me'
      if (!path.startsWith('/api/auth/') && !isMeProbe) {
        window.dispatchEvent(new CustomEvent('auth:logout'))
      }
    }

    return r
  }

  _get<T = unknown>(url: string, fetchOpts?: { signal?: AbortSignal }): Promise<T> {
    return this._request<T>('GET', url, undefined, fetchOpts)
  }

  _post<T = unknown>(url: string, data?: unknown, fetchOpts?: { signal?: AbortSignal }): Promise<T> {
    return this._request<T>('POST', url, data ?? {}, fetchOpts)
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

