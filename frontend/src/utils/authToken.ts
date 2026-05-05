const KEY = 'ts_access_token'

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  if (match) return decodeURIComponent(match[2])
  return null
}

function setCookie(name: string, value: string | null, days: number = 30) {
  let expires = ''
  if (value === null) {
    days = -1
  }
  if (days) {
    const date = new Date()
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
    expires = '; expires=' + date.toUTCString()
  }
  const val = value === null ? '' : encodeURIComponent(value)
  document.cookie = name + '=' + val + expires + '; path=/; SameSite=Lax'
}

export function getAccessToken(): string | null {
  try {
    const b = localStorage.getItem(KEY)
    if (b && b.length > 0) return b
  } catch {
    // ignore
  }
  return getCookie(KEY)
}

export function setAccessToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(KEY, token)
    } else {
      localStorage.removeItem(KEY)
    }
  } catch {
    // ignore
  }
  setCookie(KEY, token)
}

export function clearAccessToken(): void {
  setAccessToken(null)
}
