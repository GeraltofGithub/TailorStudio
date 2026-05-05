const KEY = 'ts_access_token'

export function getAccessToken(): string | null {
  try {
    const t = sessionStorage.getItem(KEY)
    return t && t.length > 0 ? t : null
  } catch {
    return null
  }
}

export function setAccessToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(KEY, token)
    else sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

export function clearAccessToken(): void {
  setAccessToken(null)
}
