import { memo, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { LoginIntroSequence } from '../components/LoginIntroSequence'
import { authService } from '../services/authService'
import { useAppToast } from '../utils/toast'
import { Eye, EyeOff } from 'lucide-react'
import tailorLogo from '../assets/tailor-logo.png'
import { fetchBootHealth, triggerBackendWarmup } from '../services/bootWake'

const SIGNUP_TIMEOUT_MS = 20000

async function signupWithTimeout<T>(p: Promise<T>, timeoutMs = SIGNUP_TIMEOUT_MS): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('timeout')), timeoutMs)
    }),
  ])
}

export default memo(function SignupPage() {
  const [sp] = useSearchParams()
  const skipIntro = sp.get('nointro') === '1'
  const [pending, setPending] = useState(false)
  const nav = useNavigate()
  const toast = useAppToast()
  const [showPass, setShowPass] = useState(false)

  const [introPhase, setIntroPhase] = useState<'running' | 'done'>(() => (skipIntro ? 'done' : 'running'))
  const [introRm] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (introPhase !== 'running') return
    const minMs = introRm ? 650 : 5000
    let cancelled = false
    const warm = async () => {
      await Promise.allSettled([fetchBootHealth(), triggerBackendWarmup()])
    }
    void (async () => {
      await Promise.all([warm(), new Promise<void>((resolve) => window.setTimeout(resolve, minMs))])
      if (!cancelled) setIntroPhase('done')
    })()
    return () => {
      cancelled = true
    }
  }, [introPhase, introRm])

  useEffect(() => {
    if (introPhase !== 'done') return
    if (!skipIntro) return
    void fetchBootHealth()
    void triggerBackendWarmup()
  }, [introPhase, skipIntro])

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (pending) return

      // Read the form synchronously: React clears `e.currentTarget` after the first `await`.
      const form = e.currentTarget
      const fd = new FormData(form)
      const body = {
        businessName: String(fd.get('businessName') || '').trim(),
        tagline: String(fd.get('tagline') || '').trim() || null,
        address: String(fd.get('address') || '').trim() || null,
        phone: String(fd.get('phone') || '').trim() || null,
        secondaryPhone: String(fd.get('secondaryPhone') || '').trim() || null,
        ownerName: String(fd.get('ownerName') || '').trim(),
        email: String(fd.get('email') || '').trim(),
        password: String(fd.get('password') || ''),
      }

      setPending(true)
      try {
        const data = await signupWithTimeout(
          Promise.all([
            triggerBackendWarmup().catch(() => undefined),
            authService.signup(body),
          ]).then(([, signupResult]) => signupResult),
        )
        toast.success(data.message || 'Studio created')
        nav('/login', { replace: true })
      } catch (err: unknown) {
        const anyErr = err as { message?: string; payload?: { error?: string; message?: string } }
        const msg =
          anyErr?.message === 'timeout'
            ? 'Sign up failed: request timed out. Please try again.'
            : anyErr?.payload?.error || anyErr?.payload?.message || anyErr?.message
        toast.error(msg ? String(msg) : 'Sign up failed. Please try again.')
      } finally {
        setPending(false)
      }
    },
    [nav, pending, toast],
  )

  return (
    <div className="auth-with-header">
      <header className="landing-header">
        <Link to="/" className="logo-mark">
          <img src={tailorLogo} alt="Tailor Studio logo" className="brand-logo" />
          Tailor Studio
        </Link>
        <nav className="landing-nav">
          <Link className="btn btn-ghost" to="/login">
            Sign in
          </Link>
        </nav>
      </header>
      <div className="auth-page">
        {introPhase === 'running' ? (
          <LoginIntroSequence variant="signup" reducedMotion={introRm} onSkip={() => setIntroPhase('done')} />
        ) : null}
        <div className="auth-card" style={{ maxWidth: 520, display: introPhase === 'running' ? 'none' : undefined }}>
        <h1>Create your studio</h1>
        <p className="sub">You become the owner. You’ll get a join code to invite staff.</p>
          <form id="f" onSubmit={onSubmit}>
            <fieldset disabled={pending} style={{ border: 'none', margin: 0, padding: 0, display: 'grid', gap: '1rem' }}>
          <div className="form-grid two">
            <div>
              <label htmlFor="businessName">
                Studio name <span className="req-mark" aria-hidden="true">*</span>
              </label>
              <input id="businessName" name="businessName" required maxLength={200} placeholder="e.g. Mohit & Mini Designer Studio" />
            </div>
            <div>
              <label htmlFor="tagline">Tagline (optional)</label>
              <input id="tagline" name="tagline" maxLength={300} placeholder="Short line under your name" />
            </div>
          </div>
          <div>
            <label htmlFor="address">Address</label>
            <input id="address" name="address" maxLength={500} placeholder="Street, city, PIN" />
          </div>
          <div className="form-grid two">
            <div>
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" maxLength={50} />
            </div>
            <div>
              <label htmlFor="secondaryPhone">Alt. phone (optional)</label>
              <input id="secondaryPhone" name="secondaryPhone" maxLength={50} />
            </div>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />
          <div className="form-grid two">
            <div>
              <label htmlFor="ownerName">
                Your name <span className="req-mark" aria-hidden="true">*</span>
              </label>
              <input id="ownerName" name="ownerName" required maxLength={120} />
            </div>
            <div>
              <label htmlFor="email">
                Email (login) <span className="req-mark" aria-hidden="true">*</span>
              </label>
              <input type="email" id="email" name="email" required autoComplete="email" />
            </div>
          </div>
          <div>
            <label htmlFor="password">
              Password (min 8) <span className="req-mark" aria-hidden="true">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                id="password"
                name="password"
                required
                minLength={8}
                maxLength={100}
                autoComplete="new-password"
                style={{ paddingRight: '2.4rem' }}
              />
              <button
                type="button"
                className="ts-icon-btn"
                aria-label={showPass ? 'Hide password' : 'Show password'}
                onClick={() => setShowPass((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '0.35rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={pending}>
            {pending ? 'Creating…' : 'Create studio'}
          </button>
            </fieldset>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        </div>
      </div>
    </div>
  )
})

