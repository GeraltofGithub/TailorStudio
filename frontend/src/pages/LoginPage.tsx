import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { OtpSixBoxes } from '../components/OtpSixBoxes'
import { useAppToast } from '../utils/toast'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { resetSessionReadCaches } from '../services/api/resetSessionReadCaches'
import * as authOtp from '../services/api/authOtpApi/authOtpApi'
import tailorLogo from '../assets/tailor-logo.png'

function padOtp(v: string[]) {
  const a = [...v]
  while (a.length < 6) a.push('')
  return a.slice(0, 6)
}

export default memo(function LoginPage() {
  const [sp] = useSearchParams()
  const showError = sp.get('error') === '1'
  const nav = useNavigate()
  const toast = useAppToast()
  const { refreshMe } = useAuth()
  const [showPass, setShowPass] = useState(false)
  const [pending, setPending] = useState(false)

  const [phase, setPhase] = useState<'credentials' | 'otp'>('credentials')
  const [loginEmail, setLoginEmail] = useState('')
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!showError) return
    toast.error('Invalid credentials')
    nav('/login', { replace: true })
  }, [nav, showError, toast])

  useEffect(() => {
    if (phase !== 'otp' || !otpExpiresAt) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [phase, otpExpiresAt])

  const otpExpired = useMemo(() => {
    if (!otpExpiresAt) return true
    return Date.now() >= new Date(otpExpiresAt).getTime()
  }, [otpExpiresAt, now])

  const otpRemainingSec = useMemo(() => {
    if (!otpExpiresAt) return 0
    return Math.max(0, Math.ceil((new Date(otpExpiresAt).getTime() - Date.now()) / 1000))
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
      else if (e?.status === 503) toast.error('Email is not configured on the server.')
      else toast.error(e?.message || 'Could not resend code.')
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
    if (otpExpired) {
      toast.error('Code expired. Tap Resend code.')
      return
    }
    setPending(true)
    try {
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
  }, [nav, otpDigits, loginEmail, otpExpired, pending, pendingToken, refreshMe, toast])

  const backToCredentials = useCallback(() => {
    setPhase('credentials')
    setPendingToken(null)
    setOtpExpiresAt(null)
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
        <div className="auth-card">
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
                const fd = new FormData(e.currentTarget)
                const email = String(fd.get('email') || '').trim()
                const password = String(fd.get('password') || '')
                if (!email) {
                  toast.error('Enter your email.')
                  return
                }
                setPending(true)
                try {
                  const r = await authOtp.otpLoginChallenge(email, password)
                  setLoginEmail(email)
                  setPendingToken(r.pendingToken)
                  setOtpExpiresAt(r.expiresAt)
                  setOtpDigits(['', '', '', '', '', ''])
                  setPhase('otp')
                  toast.success('Code sent. Check your inbox.')
                } catch (err: any) {
                  const code = err?.payload?.error
                  if (err?.status === 404 && code === 'no_account') toast.error('Account does not exist.')
                  else if (err?.status === 401 && code === 'invalid_credentials') toast.error('Invalid email or password.')
                  else if (err?.status === 503) toast.error('Email is not configured on the server.')
                  else toast.error(err?.message || 'Could not sign in.')
                } finally {
                  setPending(false)
                }
              }}
            >
              <fieldset disabled={pending} style={{ border: 'none', margin: 0, padding: 0, display: 'grid', gap: '1rem' }}>
                <div>
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" autoComplete="username" required />
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
                Enter the code sent to <strong>{loginEmail}</strong>
              </p>
              <div>
                <label>Enter code</label>
                <OtpSixBoxes value={otpDigits} onChange={(v) => setOtpDigits(padOtp(v))} disabled={pending} idPrefix="li-otp" />
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                {otpExpired ? 'Code expired.' : `Expires in ${otpRemainingSec}s`}
              </p>
              <button type="button" className="btn btn-primary" style={{ width: '100%' }} disabled={pending || otpExpired} onClick={() => void verifyOtpLogin()}>
                {pending ? 'Verifying…' : 'Verify & sign in'}
              </button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%' }} disabled={pending || !otpExpired} onClick={() => void resendOtp()}>
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
