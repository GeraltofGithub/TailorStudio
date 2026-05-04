import { memo, useEffect, useState } from 'react'
import { Check, Lock, User } from 'lucide-react'

import tailorLogo from '../assets/tailor-logo.png'

type Props = {
  /** Shorter, calmer intro when OS requests reduced motion. */
  reducedMotion: boolean
  onSkip?: () => void
  /** Sign-up uses the same visuals with copy tuned for creating a studio. */
  variant?: 'login' | 'signup'
}

const CAPTIONS_LOGIN = [
  'Waking your studio…',
  'Connecting to the server…',
  'Preparing a secure sign-in…',
  'Ready when you are.',
]

const CAPTIONS_SIGNUP = [
  'Waking your studio…',
  'Connecting to the server…',
  'Preparing your new workspace…',
  'Ready when you are.',
]

/**
 * Lightweight “fake GIF” — no binary GIF file; SVG + CSS + timed copy so cold backends
 * get a few seconds of warm time without a heavy download.
 */
export const LoginIntroSequence = memo(function LoginIntroSequence({ reducedMotion, onSkip, variant = 'login' }: Props) {
  const [capIdx, setCapIdx] = useState(0)
  const captions = variant === 'signup' ? CAPTIONS_SIGNUP : CAPTIONS_LOGIN
  const barMs = reducedMotion ? 750 : 5000
  const stepMs = reducedMotion ? 190 : 1250

  useEffect(() => {
    const t = window.setInterval(() => {
      setCapIdx((i) => (i + 1) % captions.length)
    }, stepMs)
    return () => window.clearInterval(t)
  }, [captions.length, stepMs])

  return (
    <div className={`ts-login-intro${reducedMotion ? ' ts-login-intro--reduced' : ''}`} role="status" aria-live="polite" aria-busy="true">
      <div className="ts-login-intro__card">
        <div className="ts-login-intro__logo">
          <img src={tailorLogo} alt="" width={56} height={56} decoding="async" />
        </div>

        <div className="ts-login-intro__thread" aria-hidden>
          <svg viewBox="0 0 120 32" className="ts-login-intro__svg">
            <path
              className="ts-login-intro__path"
              d="M6 22 Q34 6 60 22 T114 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="ts-login-intro__icons" aria-hidden>
          <span className="ts-login-intro__icon ts-login-intro__icon--user">
            <User size={22} strokeWidth={2.2} />
          </span>
          <span className="ts-login-intro__icon ts-login-intro__icon--lock">
            <Lock size={22} strokeWidth={2.2} />
          </span>
          <span className="ts-login-intro__icon ts-login-intro__icon--ok">
            <Check size={22} strokeWidth={2.6} />
          </span>
        </div>

        <p className="ts-login-intro__caption">{captions[capIdx]}</p>

        <div className="ts-login-intro__track" aria-hidden>
          <div className="ts-login-intro__bar" style={{ animationDuration: `${barMs}ms` }} />
        </div>

        <p className="ts-login-intro__fine">This short wait helps after the server has been asleep (e.g. Render free tier).</p>
        {onSkip ? (
          <button type="button" className="btn btn-ghost btn-sm ts-login-intro__skip" onClick={onSkip}>
            {variant === 'signup' ? 'Skip and continue' : 'Skip and sign in now'}
          </button>
        ) : null}
      </div>
    </div>
  )
})
