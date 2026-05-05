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
    if (b && b.length > 0) {
      console.log('[AUTH] getAccessToken: found in localStorage (len:', b.length, ')')
      return b
    }
  } catch {
    // ignore
  }
  const c = getCookie(KEY)
  if (c) {
    console.log('[AUTH] getAccessToken: found in cookie (len:', c.length, ')')
    return c
  }
  console.log('[AUTH] getAccessToken: no token found')
  return null
}

export function setAccessToken(token: string | null): void {
  console.log(`[AUTH] setAccessToken called. Has token? ${!!token} ${token ? '(len: ' + token.length + ')' : ''}`)
  try {
    if (token) {
      localStorage.setItem(KEY, token)
      console.log('[AUTH] setAccessToken: localStorage updated')
    } else {
      localStorage.removeItem(KEY)
      console.log('[AUTH] setAccessToken: localStorage cleared')
    }
  } catch (err) {
    console.warn('[AUTH] setAccessToken: localStorage failed:', err)
  }
  setCookie(KEY, token)
  console.log('[AUTH] setAccessToken: cookie updated')
}

export function clearAccessToken(): void {
  console.log('[AUTH] clearAccessToken called')
  setAccessToken(null)
}
