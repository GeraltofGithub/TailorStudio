import { createContext, memo, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { MeResponse } from '../services/api/authApi/authApi'
import { resetSessionReadCaches } from '../services/api/resetSessionReadCaches'
import { authService } from '../services/authService'

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

  const clearAuth = useCallback(() => {
    resetSessionReadCaches()
    setState({ status: 'anon', me: null })
  }, [])

  const refreshMe = useCallback(async (opts?: { silent?: boolean; initialMe?: MeResponse }) => {
    const silent = !!opts?.silent
    const initialMe = opts?.initialMe
    if (initialMe) {
      if (!silent) setState({ status: 'loading', me: null })
      setState({ status: 'authed', me: initialMe })
      return true
    }
    if (!silent) setState({ status: 'loading', me: null })
    try {
      const me = await authService.me()
      setState({ status: 'authed', me })
      return true
    } catch {
      setState({ status: 'anon', me: null })
      return false
    }
  }, [])

  useEffect(() => {
    void refreshMe()
  }, [refreshMe])

  // If any API call returns 401, our API client dispatches 'auth:logout'.
  // Listen once and immediately clear local auth so AppShell redirects to /login.
  useEffect(() => {
    const onLogout = () => {
      resetSessionReadCaches()
      setState({ status: 'anon', me: null })
    }
    window.addEventListener('auth:logout', onLogout as EventListener)
    return () => window.removeEventListener('auth:logout', onLogout as EventListener)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({ state, refreshMe, clearAuth }), [state, refreshMe, clearAuth])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
})

