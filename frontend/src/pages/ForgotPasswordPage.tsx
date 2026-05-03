import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { OtpSixBoxes } from '../components/OtpSixBoxes'
import { useAppToast } from '../utils/toast'
import { Eye, EyeOff } from 'lucide-react'
import * as authOtp from '../services/api/authOtpApi/authOtpApi'
import tailorLogo from '../assets/tailor-logo.png'

function padOtp(v: string[]) {
  const a = [...v]
  while (a.length < 6) a.push('')
  return a.slice(0, 6)
}

export default memo(function ForgotPasswordPage() {
  const nav = useNavigate()
  const toast = useAppToast()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', ''])
  const [resetToken, setResetToken] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (step !== 2 || !expiresAt) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [step, expiresAt])

  const expired = useMemo(() => {
    if (!expiresAt) return true
    return Date.now() >= new Date(expiresAt).getTime()
  }, [expiresAt, now])

  const remainingSec = useMemo(() => {
    if (!expiresAt) return 0
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
  }, [expiresAt, now])

  const sendForgot = useCallback(async () => {
    if (pending) return
    const em = email.trim()
    if (!em) {
      toast.error('Enter your email.')
      return
    }
    setPending(true)
    try {
      const r = await authOtp.otpForgotSend(em)
      setExpiresAt(r.expiresAt)
      setOtp(['', '', '', '', '', ''])
      setStep(2)
      toast.success('OTP sent. Check your inbox.')
    } catch (e: any) {
      if (e?.status === 404) toast.error('Account does not exist.')
      else if (e?.status === 503) toast.error('Email is not configured on the server.')
      else toast.error(e?.message || 'Could not send OTP.')
    } finally {
      setPending(false)
    }
  }, [email, pending, toast])

  const verifyOtp = useCallback(async () => {
    if (pending) return
    const code = padOtp(otp).join('')
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code.')
      return
    }
    if (expired) {
      toast.error('Code expired. Tap Resend OTP.')
      return
    }
    setPending(true)
    try {
      const r = await authOtp.otpForgotVerify(email.trim(), code)
      setResetToken(r.resetToken)
      setStep(3)
      toast.success('Choose a new password.')
    } catch {
      toast.error('Invalid or expired code.')
    } finally {
      setPending(false)
    }
  }, [email, expired, otp, pending, toast])

  const submitReset = useCallback(async () => {
    if (pending) return
    if (pw.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    if (pw !== pw2) {
      toast.error('Passwords do not match.')
      return
    }
    setPending(true)
    try {
      await authOtp.otpForgotReset(resetToken, pw)
      toast.success('Password updated. You can sign in now.')
      window.setTimeout(() => nav('/login', { replace: true }), 600)
    } catch {
      toast.error('Reset link expired or invalid. Start again.')
    } finally {
      setPending(false)
    }
  }, [nav, pending, pw, pw2, resetToken, toast])

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
        <div className="auth-card" style={{ maxWidth: 440 }}>
          <h1>Forgot password</h1>
          <p className="sub">Reset your password in three steps.</p>

          <div className="ts-stepper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '1.25rem 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
            <span style={{ color: step >= 1 ? 'var(--accent, #3db8a8)' : undefined }}>{step > 1 ? '✓' : '1'} Email</span>
            <span style={{ color: step >= 2 ? 'var(--accent, #3db8a8)' : undefined }}>2 OTP</span>
            <span style={{ color: step >= 3 ? 'var(--accent, #3db8a8)' : undefined }}>3 New password</span>
          </div>

          {step === 1 && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label htmlFor="fp-email">Email</label>
                <input
                  id="fp-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                  required
                />
              </div>
              <button type="button" className="btn btn-primary" style={{ width: '100%' }} disabled={pending} onClick={() => void sendForgot()}>
                {pending ? 'Sending…' : 'Send OTP'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                OTP sent to <strong>{email}</strong>
              </p>
              <div>
                <label>Enter OTP</label>
                <OtpSixBoxes value={otp} onChange={(v) => setOtp(padOtp(v))} disabled={pending} idPrefix="fp-otp" />
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                {expired ? 'Code expired.' : `Expires in ${remainingSec}s`}
              </p>
              <button type="button" className="btn btn-primary" style={{ width: '100%' }} disabled={pending || expired} onClick={() => void verifyOtp()}>
                {pending ? 'Verifying…' : 'Verify OTP'}
              </button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%' }} disabled={pending || !expired} onClick={() => void sendForgot()}>
                Resend OTP
              </button>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label htmlFor="fp-pw">New password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="fp-pw"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    disabled={pending}
                    style={{ paddingRight: '2.4rem' }}
                  />
                  <button
                    type="button"
                    className="ts-icon-btn"
                    aria-label={showPw ? 'Hide new password' : 'Show new password'}
                    onClick={() => setShowPw((v) => !v)}
                    style={{ position: 'absolute', right: '0.35rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted)' }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="fp-pw2">Confirm password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="fp-pw2"
                    type={showPw2 ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    disabled={pending}
                    style={{ paddingRight: '2.4rem' }}
                  />
                  <button
                    type="button"
                    className="ts-icon-btn"
                    aria-label={showPw2 ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => setShowPw2((v) => !v)}
                    style={{
                      position: 'absolute',
                      right: '0.35rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'var(--muted)',
                    }}
                  >
                    {showPw2 ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="button" className="btn btn-primary" style={{ width: '100%' }} disabled={pending} onClick={() => void submitReset()}>
                {pending ? 'Saving…' : 'Reset password'}
              </button>
            </div>
          )}

          <p className="auth-footer" style={{ marginTop: '1rem' }}>
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
})
