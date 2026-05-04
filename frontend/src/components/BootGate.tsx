import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { fetchBootHealth, fetchBootWarmup, fetchBootWelcome } from '../services/bootWake'
import { apiUrl } from '../utils/apiOrigin'
import { SEW_BOOT_TOTAL_MS } from './sewBootAnimator'
import { BootSplash, type BootWakePhase } from './BootSplash'

/**
 * How long we keep the sewing canvas up while the JVM warms.
 * Canvas story loops every SEW_BOOT_TOTAL_MS — multiply so users see several full cycles on cold start.
 */
const CANVAS_LOOPS_NORMAL = 3
const CANVAS_LOOPS_REDUCED = 1

const MIN_BRAND_MS = 800
const EXIT_MS = 520

function delay(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms))
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const BootGate = memo(function BootGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [bootStage, setBootStage] = useState<'canvas' | 'brand'>('canvas')
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

    const canvasMs = SEW_BOOT_TOTAL_MS * (sewLowMotion ? CANVAS_LOOPS_REDUCED : CANVAS_LOOPS_NORMAL)

    // Already signed in (e.g. F5 on /app): skip sewing splash — cold wake only for anonymous visitors.
    void (async () => {
      try {
        const me = await fetch(apiUrl('/api/me'), {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          signal: skipMeAc.signal,
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

    // Wake backend while the canvas runs. Do NOT tie these to route-transition abort:
    // if the user clicks "Sign in" mid-sequence, we still want health/warmup/welcome to finish warming Render.
    void (async () => {
      try {
        await fetchBootHealth()
        if (cancelled) return
        setWakePhase('health')
        await fetchBootWarmup()
        if (cancelled) return
        const w = await fetchBootWelcome()
        if (cancelled) return
        setWelcomeMessage(w.message ?? null)
        setWelcomeTagline(w.tagline ?? null)
        setWakePhase('welcome')
      } catch {
        // Still keep user on canvas for canvasMs; brand step can use fallbacks.
      }
    })()

    void (async () => {
      await delay(canvasMs)
      if (cancelled) return
      setBootStage('brand')

      await delay(MIN_BRAND_MS)
      if (cancelled) return
      setPhase('exit')
      await delay(EXIT_MS)
      if (cancelled) return
      setPhase('done')
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
      bootStage={bootStage}
      sewLowMotion={sewLowMotion}
      message={welcomeMessage}
      tagline={welcomeTagline}
      wakePhase={wakePhase}
      exiting={phase === 'exit'}
    />
  )
})
