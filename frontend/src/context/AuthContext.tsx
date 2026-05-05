import { createContext, memo, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import type { MeResponse } from '../services/api/authApi/authApi'
import { authApi } from '../services/api/authApi/authApi'
import { resetSessionReadCaches } from '../services/api/resetSessionReadCaches'
import { authService } from '../services/authService'
import { clearAccessToken } from '../utils/authToken'

type AuthState =
  | { status: 'loading'; me: null }
  | { status: 'anon'; me: null }
  | { status: 'authed'; me: MeResponse }

type AuthContextValue = {
  state: AuthState
  refreshMe: (opts?: { silent?: boolean; initialMe?: MeResponse }) => Promise<boolean>
  clearAuth: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const v = useContext(AuthContext)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}

export const AuthProvider = memo(function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', me: null })
  const refreshGenRef = useRef(0)

  const clearAuth = useCallback(() => {
    refreshGenRef.current += 1
    authApi.cancelPendingMe()
    clearAccessToken()
    resetSessionReadCaches()
    setState({ status: 'anon', me: null })
  }, [])

  const refreshMe = useCallback(async (opts?: { silent?: boolean; initialMe?: MeResponse }) => {
    const silent = !!opts?.silent
    const initialMe = opts?.initialMe
    if (initialMe) {
      refreshGenRef.current += 1
      authApi.cancelPendingMe()
      startTransition(() => setState({ status: 'authed', me: initialMe }))
      return true
    }
    const gen = ++refreshGenRef.current
    if (!silent) {
      setState((prev) => {
        if (prev.status === 'authed') return prev
        return { status: 'loading', me: null }
      })
    }
    try {
      const me = await authService.me()
      if (gen !== refreshGenRef.current) return true
      startTransition(() => setState({ status: 'authed', me }))
      return true
    } catch (error: any) {
      const err = error
      if (gen !== refreshGenRef.current) return false
      if (silent) {
        try {
          await new Promise<void>((r) => window.setTimeout(r, 550))
          if (gen !== refreshGenRef.current) return false
          const me2 = await authService.me()
          if (gen !== refreshGenRef.current) return true
          startTransition(() => setState({ status: 'authed', me: me2 }))
          return true
        } catch {
          if (gen !== refreshGenRef.current) return false
        }
      }
      if (err?.status === 401 || err?.status === 403) {
        clearAccessToken()
        resetSessionReadCaches()
      }
      startTransition(() => setState({ status: 'anon', me: null }))
      return false
    }
  }, [])

  useEffect(() => {
    void refreshMe()
  }, [refreshMe])

  useEffect(() => {
    if (state.status !== 'authed') return

    const tick = () => {
      void refreshMe({ silent: true })
    }

    let debounceT: ReturnType<typeof setTimeout> | null = null
    const debouncedTick = () => {
      if (debounceT) window.clearTimeout(debounceT)
      debounceT = window.setTimeout(() => {
        debounceT = null
        tick()
      }, 1200)
    }

    const onFocus = () => debouncedTick()
    const onVis = () => {
      if (document.visibilityState === 'visible') debouncedTick()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)

    // Keep session fresh / detect server-side revocation.
    const startDelay = window.setTimeout(() => {
      tick()
    }, 8000)
    const t = window.setInterval(tick, 15000)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
      if (debounceT) window.clearTimeout(debounceT)
      window.clearTimeout(startDelay)
      window.clearInterval(t)
    }
  }, [refreshMe, state.status])

  // If any API call returns 401, our API client dispatches 'auth:logout'.
  // Listen once and immediately clear local auth so AppShell redirects to /login.
  useEffect(() => {
    const onLogout = () => {
      refreshGenRef.current += 1
      authApi.cancelPendingMe()
      clearAccessToken()
      resetSessionReadCaches()
      setState({ status: 'anon', me: null })
    }
    window.addEventListener('auth:logout', onLogout as EventListener)
    return () => window.removeEventListener('auth:logout', onLogout as EventListener)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({ state, refreshMe, clearAuth }), [state, refreshMe, clearAuth])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
})

