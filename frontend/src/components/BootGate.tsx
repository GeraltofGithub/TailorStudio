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

    const doExit = async () => {
      if (cancelled) return
      setPhase('exit')
      await delay(EXIT_MS)
      if (cancelled) return
      setPhase('done')
    }

    // Wake backend while the animation runs. Do NOT tie these to route-transition abort:
    // if the user clicks "Sign in" mid-sequence, we still want health/warmup/welcome to finish warming Render.
    void (async () => {
      // 1) Loop the 3 animation phases so the user doesn't get stuck on one for too long
      let loopRunning = true
      const runLoop = async () => {
        while (loopRunning && !cancelled) {
          setWakePhase('starting')
          await delay(2500)
          if (!loopRunning || cancelled) break
          setWakePhase('health')
          await delay(3500)
          if (!loopRunning || cancelled) break
          setWakePhase('welcome')
          await delay(2500)
        }
      }
      runLoop()

      // 2) Keep hitting the backend until it fully wakes up
      const apiCalls = async () => {
        let welcomeRes = null
        while (!cancelled) {
          const hOk = await fetchBootHealth()
          if (!hOk && !cancelled) { await delay(2000); continue }

          const wOk = await fetchBootWarmup()
          if (!wOk && !cancelled) { await delay(2000); continue }

          const w = await fetchBootWelcome()
          if ((!w || !w.ok) && !cancelled) { await delay(2000); continue }

          welcomeRes = w
          break
        }
        return welcomeRes
      }

      // Max total loading time is 1 minute
      const timeoutPromise = delay(60000).then(() => 'timeout' as const)

      try {
        const result = await Promise.race([apiCalls(), timeoutPromise])
        if (cancelled) return
        
        loopRunning = false

        if (result && result !== 'timeout' && result.message) {
          setWelcomeMessage(result.message)
          setWelcomeTagline(result.tagline ?? null)
          setWakePhase('welcome')
          await delay(MIN_BRAND_MS)
        }
        
        await doExit()
      } catch {
        if (!cancelled) {
          loopRunning = false
          await doExit()
        }
      }
    })()

    return () => {
      cancelled = true
      skipMeAc.abort()
      skipMeAcRef.current = null
    }
  }, [pathname, sewLowMotion])

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
