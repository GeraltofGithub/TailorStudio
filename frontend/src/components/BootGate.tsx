import { memo, useEffect, useRef, useState, type ReactNode } from 'react'

import { fetchBootHealth, fetchBootWelcome } from '../services/bootWake'
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
  const [bootStage, setBootStage] = useState<'canvas' | 'brand'>('canvas')
  const [phase, setPhase] = useState<'boot' | 'exit' | 'done'>('boot')
  const [wakePhase, setWakePhase] = useState<BootWakePhase>('starting')
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null)
  const [welcomeTagline, setWelcomeTagline] = useState<string | null>(null)
  const [sewLowMotion] = useState(() => prefersReducedMotion())
  const acRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    acRef.current = ac

    const canvasMs = SEW_BOOT_TOTAL_MS * (sewLowMotion ? CANVAS_LOOPS_REDUCED : CANVAS_LOOPS_NORMAL)

    // Wake backend immediately — do not wait for canvas timer (health → welcome while animation runs).
    void (async () => {
      try {
        await fetchBootHealth(ac.signal)
        if (cancelled || ac.signal.aborted) return
        setWakePhase('health')
        const w = await fetchBootWelcome(ac.signal)
        if (cancelled || ac.signal.aborted) return
        setWelcomeMessage(w.message ?? null)
        setWelcomeTagline(w.tagline ?? null)
        setWakePhase('welcome')
      } catch {
        // Still keep user on canvas for canvasMs; brand step can use fallbacks.
      }
    })()

    void (async () => {
      await delay(canvasMs)
      if (cancelled || ac.signal.aborted) return
      setBootStage('brand')

      await delay(MIN_BRAND_MS)
      if (cancelled || ac.signal.aborted) return
      setPhase('exit')
      await delay(EXIT_MS)
      if (cancelled || ac.signal.aborted) return
      setPhase('done')
    })()

    return () => {
      cancelled = true
      ac.abort()
      acRef.current = null
    }
  }, [sewLowMotion])

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
