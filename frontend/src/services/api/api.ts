type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

class Api {
  private _csrfPrimed = false
  private _csrfToken = ''

  private _joinUrl(path: string) {
    // Always same-origin.
    // - Local dev: Vite proxies /api, /login, /logout to backend.
    // - Production (Vercel): serverless proxy handles /api and auth endpoints.
    return path
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

  private async _request<T>(method: HttpMethod, url: string, body?: unknown): Promise<T> {
    const hasBody = body !== undefined && body !== null && method !== 'GET'
    const contentType = hasBody ? 'application/json' : ''
    const isWrite = method !== 'GET'

    // Prime CSRF once before the first write, so the very first POST/PUT/PATCH/DELETE never fails.
    if (isWrite && !this._csrfPrimed) await this._ensureCsrfToken()

    const doFetch = async () =>
      fetch(this._joinUrl(url), {
        method,
        credentials: 'include',
        cache: 'no-store',
        headers: this._csrfHeaders(contentType),
        body: hasBody ? JSON.stringify(body) : undefined,
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

