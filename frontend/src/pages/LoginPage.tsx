import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { OtpSixBoxes } from '../components/OtpSixBoxes'
import { useAppToast } from '../utils/toast'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { resetSessionReadCaches } from '../services/api/resetSessionReadCaches'
import * as authOtp from '../services/api/authOtpApi/authOtpApi'
import tailorLogo from '../assets/tailor-logo.png'
import { LoginIntroSequence } from '../components/LoginIntroSequence'
import { formatOtpCountdown } from '../utils/formatOtpCountdown'
import { fetchBootHealth, triggerBackendWarmup } from '../services/bootWake'

function padOtp(v: string[]) {
  const a = [...v]
  while (a.length < 6) a.push('')
  return a.slice(0, 6)
}

export default memo(function LoginPage() {
  const [sp] = useSearchParams()
  const showError = sp.get('error') === '1'
  const skipIntro = showError || sp.get('nointro') === '1'
  const nav = useNavigate()
  const toast = useAppToast()
  const { refreshMe } = useAuth()
  const [showPass, setShowPass] = useState(false)
  const [pending, setPending] = useState(false)

  const [phase, setPhase] = useState<'credentials' | 'otp'>('credentials')
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [now, setNow] = useState(() => Date.now())
  /** Server uses static OTP bypass — skip client-only expiry gate (clock skew / ISO parse). */
  const [staticOtpMode, setStaticOtpMode] = useState(false)
  const challengeSeqRef = useRef(0)
  const challengeAbortRef = useRef<AbortController | null>(null)

  const [introPhase, setIntroPhase] = useState<'running' | 'done'>(() => (skipIntro ? 'done' : 'running'))
  const [introRm] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (!showError) return
    toast.error('Invalid credentials')
    nav('/login', { replace: true })
  }, [nav, showError, toast])

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

  useEffect(() => {
    if (phase !== 'otp' || !otpExpiresAt) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [phase, otpExpiresAt])

  const otpExpiredClient = useMemo(() => {
    if (!otpExpiresAt) return true
    const t = new Date(otpExpiresAt).getTime()
    if (Number.isNaN(t)) return false
    return Date.now() >= t
  }, [otpExpiresAt, now])

  const otpExpiredEffective = staticOtpMode ? false : otpExpiredClient

  const otpRemainingSec = useMemo(() => {
    if (!otpExpiresAt) return 0
    const t = new Date(otpExpiresAt).getTime()
    if (Number.isNaN(t)) return 0
    return Math.max(0, Math.ceil((t - Date.now()) / 1000))
  }, [otpExpiresAt, now])

  const resendOtp = useCallback(async () => {
    if (pending || !pendingToken) return
    setPending(true)
    try {
      const r = await authOtp.otpLoginResend(pendingToken)
      setOtpExpiresAt(r.expiresAt)
      setOtpDigits(['', '', '', '', '', ''])
      toast.success('New code sent. Check your inbox.')
    } catch (e: any) {
      if (e?.status === 400) toast.error('Session expired. Sign in again.')
      else if (e?.status === 503) {
        if (e?.payload?.error === 'mail_send_failed') {
          toast.error('Could not send the email. Check EMAIL / EMAIL_PASSWORD on the server.')
        } else {
          toast.error('Email is not configured on the server.')
        }
      } else toast.error(e?.message || 'Could not resend code.')
    } finally {
      setPending(false)
    }
  }, [pending, pendingToken, toast])

  const verifyOtpLogin = useCallback(async () => {
    if (pending || !pendingToken) return
    const code = padOtp(otpDigits).join('')
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code.')
      return
    }
    if (otpExpiredEffective) {
      toast.error('Code expired. Tap Resend code.')
      return
    }
    setPending(true)
    try {
      await triggerBackendWarmup()
      const me = await authOtp.otpLoginVerify(loginEmail.trim(), code, pendingToken)
      const ok = await refreshMe({ silent: true, initialMe: me })
      if (!ok) {
        toast.error('Could not complete sign-in.')
        return
      }
      resetSessionReadCaches()
      try {
        sessionStorage.setItem('ts_login_success', '1')
      } catch {
        // ignore
      }
      nav('/app/dashboard', { replace: true })
    } catch (e: any) {
      if (e?.payload?.error === 'invalid_otp' || e?.status === 400) toast.error('Invalid code.')
      else toast.error(e?.message || 'Verification failed.')
    } finally {
      setPending(false)
    }
  }, [nav, otpDigits, loginEmail, otpExpiredEffective, pending, pendingToken, refreshMe, toast])

  const backToCredentials = useCallback(() => {
    challengeAbortRef.current?.abort()
    setPhase('credentials')
    setPendingToken(null)
    setOtpExpiresAt(null)
    setStaticOtpMode(false)
    setOtpDigits(['', '', '', '', '', ''])
  }, [])

  return (
    <div className="auth-with-header">
      <header className="landing-header">
        <Link to="/" className="logo-mark">
          <img src={tailorLogo} alt="Tailor Studio logo" className="brand-logo" />
          Tailor Studio
        </Link>
        <nav className="landing-nav">
          <Link className="btn btn-primary" to="/signup">
            Create studio
          </Link>
        </nav>
      </header>
      <div className="auth-page">
        {introPhase === 'running' ? (
          <LoginIntroSequence reducedMotion={introRm} onSkip={() => setIntroPhase('done')} />
        ) : null}
        <div className="auth-card" style={{ display: introPhase === 'running' ? 'none' : undefined }}>
          <h1>Welcome back</h1>
          <p className="sub">Sign in to your tailor workspace.</p>
          <div id="login-err" className="alert alert-error" style={{ display: showError ? 'block' : 'none' }}>
            Sign-in failed. Check your email and password, then try again.
          </div>

          {phase === 'credentials' && (
            <form
              id="login-form"
              onSubmit={async (e) => {
                e.preventDefault()
                if (pending) return
                const email = emailInput.trim()
                const password = passwordInput
                if (!email) {
                  toast.error('Enter your email.')
                  return
                }
                challengeAbortRef.current?.abort()
                const ac = new AbortController()
                challengeAbortRef.current = ac
                const mySeq = ++challengeSeqRef.current
                setPending(true)
                try {
                  await triggerBackendWarmup(ac.signal)
                  const r = await authOtp.otpLoginChallenge(email, password, { signal: ac.signal })
                  if (mySeq !== challengeSeqRef.current) return
                  setLoginEmail(email)
                  setPasswordInput('')
                  setPendingToken(r.pendingToken)
                  setOtpExpiresAt(r.expiresAt)
                  setStaticOtpMode(r.staticOtp === true)
                  setOtpDigits(['', '', '', '', '', ''])
                  setPhase('otp')
                  toast.success(r.staticOtp === true ? 'Enter your sign-in code.' : 'Code sent. Check your inbox.')
                } catch (err: any) {
                  if (err?.name === 'AbortError' || ac.signal.aborted) return
                  const code = err?.payload?.error
                  if (err?.status === 404 && code === 'no_account') toast.error('Account does not exist.')
                  else if (err?.status === 401 && code === 'invalid_credentials') toast.error('Invalid email or password.')
                  else if (err?.status === 503) {
                    if (err?.payload?.error === 'mail_send_failed') {
                      toast.error('Could not send the sign-in email. Check EMAIL / EMAIL_PASSWORD on the server.')
                    } else {
                      toast.error('Email is not configured on the server.')
                    }
                  }
                  else toast.error(err?.message || 'Could not sign in.')
                } finally {
                  if (mySeq === challengeSeqRef.current) setPending(false)
                }
              }}
            >
              <fieldset disabled={pending} style={{ border: 'none', margin: 0, padding: 0, display: 'grid', gap: '1rem' }}>
                <div>
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    autoComplete="username"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="password">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      id="password"
                      name="password"
                      autoComplete="current-password"
                      required
                      style={{ paddingRight: '2.4rem' }}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
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
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Link to="/forgot-password" style={{ fontSize: '0.9rem' }}>
                    Forgot password?
                  </Link>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.25rem' }} disabled={pending}>
                  {pending ? 'Signing in…' : 'Sign in'}
                </button>
              </fieldset>
            </form>
          )}

          {phase === 'otp' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                {staticOtpMode ? (
                  <>
                    Enter your sign-in code for <strong>{loginEmail}</strong>
                  </>
                ) : (
                  <>
                    Enter the code sent to <strong>{loginEmail}</strong>
                  </>
                )}
              </p>
              <div>
                <label>Enter code</label>
                <OtpSixBoxes value={otpDigits} onChange={(v) => setOtpDigits(padOtp(v))} disabled={pending} idPrefix="li-otp" />
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                {otpExpiredEffective ? 'Code expired.' : `Expires in ${formatOtpCountdown(otpRemainingSec)}`}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={pending || otpExpiredEffective}
                onClick={() => void verifyOtpLogin()}
              >
                {pending ? 'Verifying…' : 'Verify & sign in'}
              </button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%' }} disabled={pending || !otpExpiredEffective} onClick={() => void resendOtp()}>
                Resend code
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={backToCredentials}>
                Back to email & password
              </button>
            </div>
          )}

          <p className="auth-footer">
            New studio? <Link to="/signup">Create an account</Link> · Staff? <Link to="/join">Join with code</Link>
          </p>
        </div>
      </div>
    </div>
  )
})
