import { createContext, memo, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { MeResponse } from '../services/api/authApi/authApi'
import { authService } from '../services/authService'

type AuthState =
  | { status: 'loading'; me: null }
  | { status: 'anon'; me: null }
  | { status: 'authed'; me: MeResponse }

type AuthContextValue = {
  state: AuthState
  refreshMe: () => Promise<void>
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
    setState({ status: 'anon', me: null })
  }, [])

  const refreshMe = useCallback(async () => {
    setState({ status: 'loading', me: null })
    try {
      const me = await authService.me()
      setState({ status: 'authed', me })
      return
    } catch {
      setState({ status: 'anon', me: null })
      return
    }
  }, [])

  useEffect(() => {
    void refreshMe()
  }, [refreshMe])

  const value = useMemo<AuthContextValue>(() => ({ state, refreshMe, clearAuth }), [state, refreshMe, clearAuth])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
})

