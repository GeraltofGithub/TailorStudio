import { clearAccessToken, getAccessToken } from '../../utils/authToken'
import { BASE_URL } from '../../utils/constants'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

class Api {
  private _authHeaders(contentType: string): Record<string, string> {
    const h: Record<string, string> = { Accept: 'application/json' }
    if (contentType) h['Content-Type'] = contentType
    const t = getAccessToken()
    if (t) h['Authorization'] = `Bearer ${t}`
    return h
  }

  private _joinUrl(path: string) {
    if (!BASE_URL) return path
    return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
  }

  private async _request<T>(method: HttpMethod, url: string, body?: unknown, fetchOpts?: { signal?: AbortSignal }): Promise<T> {
    const hasBody = body !== undefined && body !== null && method !== 'GET'
    const contentType = hasBody ? 'application/json' : ''

    const doFetch = async () =>
      fetch(this._joinUrl(url), {
        method,
        credentials: 'omit',
        cache: 'no-store',
        headers: this._authHeaders(contentType),
        body: hasBody ? JSON.stringify(body) : undefined,
        signal: fetchOpts?.signal,
      })

    let r = await doFetch()

    if (r.status === 401) {
      const pathOnly = url.split('?')[0]
      const isMeProbe = method === 'GET' && pathOnly === '/api/me'
      if (!pathOnly.startsWith('/api/auth/') && !isMeProbe) {
        clearAccessToken()
        window.dispatchEvent(new CustomEvent('auth:logout'))
      }
    }

    if (!r.ok) {
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

    const ct = r.headers.get('content-type') || ''
    if (!ct.includes('application/json')) {
      return (undefined as unknown) as T
    }
    return (await r.json()) as T
  }

  async postJsonLogout(url: string): Promise<Response> {
    const doFetch = async () =>
      fetch(this._joinUrl(url), {
        method: 'POST',
        credentials: 'omit',
        cache: 'no-store',
        headers: this._authHeaders('application/json'),
        body: '{}',
      })

    let r = await doFetch()

    if (r.status === 401) {
      clearAccessToken()
      window.dispatchEvent(new CustomEvent('auth:logout'))
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
