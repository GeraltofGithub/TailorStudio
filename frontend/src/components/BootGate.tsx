import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { fetchBootHealth, fetchBootWarmup, fetchBootWelcome } from '../services/bootWake'
import { getAccessToken } from '../utils/authToken'
import { apiUrl } from '../utils/apiOrigin'
import { BootSplash, type BootWakePhase } from './BootSplash'

const MIN_BRAND_MS = 1500
const EXIT_MS = 520

function delay(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms))
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const BootGate = memo(function BootGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [phase, setPhase] = useState<'boot' | 'exit' | 'done'>('boot')
  const [wakePhase, setWakePhase] = useState<BootWakePhase>('starting')
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null)
  const [welcomeTagline, setWelcomeTagline] = useState<string | null>(null)
  const [sewLowMotion] = useState(() => prefersReducedMotion())
  const skipMeAcRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Never show boot canvas inside the authenticated app shell or auth routes.
    // `/app/*` and `/login` should be instant and not replay the splash screen.
    if (
      pathname.startsWith('/app') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/join') ||
      pathname.startsWith('/forgot-password')
    ) {
      setPhase('done')
      return
    }

    let cancelled = false
    const skipMeAc = new AbortController()
    skipMeAcRef.current = skipMeAc

    // Already signed in (e.g. F5 on /app): skip sewing splash — cold wake only for anonymous visitors.
    void (async () => {
      try {
        const token = getAccessToken()
        const me = await fetch(apiUrl('/api/me'), {
          method: 'GET',
          credentials: 'omit',
          cache: 'no-store',
          signal: skipMeAc.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (cancelled || skipMeAc.signal.aborted) return
        if (me.ok) {
          cancelled = true
          setPhase('done')
          return
        }
      } catch {
        // continue with full boot
      }
    })()

    // Wake backend while the animation runs. Do NOT tie these to route-transition abort:
    // if the user clicks "Sign in" mid-sequence, we still want health/warmup/welcome to finish warming Render.
    void (async () => {
      try {
        await Promise.all([fetchBootHealth(), delay(2500)])
        if (cancelled) return
        setWakePhase('health')
        
        await Promise.all([fetchBootWarmup(), delay(3500)])
        if (cancelled) return
        
        const [w] = await Promise.all([fetchBootWelcome(), delay(2000)])
        if (cancelled) return
        setWelcomeMessage(w.message ?? null)
        setWelcomeTagline(w.tagline ?? null)
        setWakePhase('welcome')
      } catch {
        if (!cancelled) setWakePhase('welcome')
      }
    })()

    return () => {
      cancelled = true
      skipMeAc.abort()
      skipMeAcRef.current = null
    }
  }, [pathname, sewLowMotion])

  useEffect(() => {
    let cancelled = false
    if (wakePhase === 'welcome') {
      void (async () => {
        // Delay so they at least see the brand animation for a moment
        await delay(MIN_BRAND_MS)
        if (cancelled || skipMeAcRef.current?.signal.aborted) return
        setPhase('exit')
        await delay(EXIT_MS)
        if (cancelled || skipMeAcRef.current?.signal.aborted) return
        setPhase('done')
      })()
    }
    return () => {
      cancelled = true
    }
  }, [wakePhase])

  useEffect(() => {
    if (phase !== 'done') return
    void import('../pages/LoginPage')
    void import('../pages/SignupPage')
  }, [phase])

  if (phase === 'done') return children

  return (
    <BootSplash
      sewLowMotion={sewLowMotion}
      message={welcomeMessage}
      tagline={welcomeTagline}
      wakePhase={wakePhase}
      exiting={phase === 'exit'}
    />
  )
})
