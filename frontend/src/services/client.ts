import Cookies from 'js-cookie'

import { BASE_URL } from '../utils/constants'

function joinUrl(path: string) {
  if (!BASE_URL) return path
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

function csrfHeaders() {
  const t = Cookies.get('XSRF-TOKEN')
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (t) h['X-XSRF-TOKEN'] = t
  return h
}

export async function apiGet(path: string) {
  return fetch(joinUrl(path), { credentials: 'include', cache: 'no-store' })
}

export async function apiPostJson<TBody>(path: string, body: TBody) {
  return fetch(joinUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: csrfHeaders(),
    body: JSON.stringify(body),
  })
}

export async function apiPutJson<TBody>(path: string, body: TBody) {
  return fetch(joinUrl(path), {
    method: 'PUT',
    credentials: 'include',
    headers: csrfHeaders(),
    body: JSON.stringify(body),
  })
}

export async function apiPatchJson<TBody>(path: string, body: TBody) {
  return fetch(joinUrl(path), {
    method: 'PATCH',
    credentials: 'include',
    headers: csrfHeaders(),
    body: JSON.stringify(body),
  })
}

export async function apiPost(path: string) {
  return fetch(joinUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: csrfHeaders(),
  })
}

