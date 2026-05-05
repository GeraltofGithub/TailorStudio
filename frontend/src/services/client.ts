import { getAccessToken } from '../utils/authToken'
import { BASE_URL } from '../utils/constants'

function joinUrl(path: string) {
  if (!BASE_URL) return path
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

function jsonHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const t = getAccessToken()
  if (t) h['Authorization'] = `Bearer ${t}`
  return h
}

export async function apiGet(path: string) {
  const t = getAccessToken()
  return fetch(joinUrl(path), {
    credentials: 'omit',
    cache: 'no-store',
    headers: t ? { Authorization: `Bearer ${t}` } : undefined,
  })
}

export async function apiPostJson<TBody>(path: string, body: TBody) {
  return fetch(joinUrl(path), {
    method: 'POST',
    credentials: 'omit',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  })
}

export async function apiPutJson<TBody>(path: string, body: TBody) {
  return fetch(joinUrl(path), {
    method: 'PUT',
    credentials: 'omit',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  })
}

export async function apiPatchJson<TBody>(path: string, body: TBody) {
  return fetch(joinUrl(path), {
    method: 'PATCH',
    credentials: 'omit',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  })
}

export async function apiPost(path: string) {
  return fetch(joinUrl(path), {
    method: 'POST',
    credentials: 'omit',
    headers: jsonHeaders(),
  })
}
