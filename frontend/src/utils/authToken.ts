const KEY = 'ts_access_token'

/** Prefer sessionStorage; fall back to localStorage (some mobile / privacy modes behave differently). */
export function getAccessToken(): string | null {
  try {
    const a = sessionStorage.getItem(KEY)
    if (a && a.length > 0) return a
    const b = localStorage.getItem(KEY)
    return b && b.length > 0 ? b : null
  } catch {
    try {
      const b = localStorage.getItem(KEY)
      return b && b.length > 0 ? b : null
    } catch {
      return null
    }
  }
}

export function setAccessToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(KEY, token)
      try {
        localStorage.setItem(KEY, token)
      } catch {
        // session-only is OK
      }
    } else {
      sessionStorage.removeItem(KEY)
      try {
        localStorage.removeItem(KEY)
      } catch {
        // ignore
      }
    }
  } catch {
    try {
      if (token) localStorage.setItem(KEY, token)
      else localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
  }
}

export function clearAccessToken(): void {
  setAccessToken(null)
}
