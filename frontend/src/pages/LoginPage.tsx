import { memo, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useAppToast } from '../utils/toast'
import { Eye, EyeOff } from 'lucide-react'
import { BASE_URL } from '../utils/constants'
import { useAuth } from '../context/AuthContext'
import { resetSessionReadCaches } from '../services/api/resetSessionReadCaches'
import tailorLogo from '../assets/tailor-logo.png'

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 25000) {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: ctrl.signal })
  } finally {
    window.clearTimeout(t)
  }
}

export default memo(function LoginPage() {
  const [sp] = useSearchParams()
  const showError = sp.get('error') === '1'
  const nav = useNavigate()
  const toast = useAppToast()
  const { refreshMe } = useAuth()
  const [showPass, setShowPass] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!showError) return
    toast.error('Invalid credentials')
    // remove ?error=1 so toast doesn't keep repeating on refresh
    nav('/login', { replace: true })
  }, [nav, showError, toast])

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
          <form
            id="login-form"
            onSubmit={async (e) => {
              e.preventDefault()
              if (pending) return
              setPending(true)
              const fd = new FormData(e.currentTarget)
              const username = String(fd.get('username') || '')
              const password = String(fd.get('password') || '')
              const url = `${BASE_URL || ''}/login`
              try {
                const body = new URLSearchParams()
                body.set('username', username)
                body.set('password', password)
                // CSRF is ignored for POST /login in backend config.
                await fetchWithTimeout(url, {
                  method: 'POST',
                  credentials: 'include',
                  // Backend may respond with redirects on failure; avoid following legacy HTML targets on the API host.
                  redirect: 'manual',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body,
                })

                // Refresh auth context from the API (same client as the rest of the app).
                const ok = await refreshMe({ silent: true })
                if (!ok) {
                  toast.error('Invalid credentials')
                  return
                }
                resetSessionReadCaches()
                try {
                  sessionStorage.setItem('ts_login_success', '1')
                } catch {
                  // ignore
                }
                nav('/app/dashboard', { replace: true })
                return
              } catch (err: any) {
                if (err?.name === 'AbortError') {
                  toast.error('Sign in is taking too long. Please retry in a few seconds.')
                } else {
                  toast.error('Server error during sign-in. Please retry.')
                }
              } finally {
                setPending(false)
              }
            }}
          >
            <fieldset disabled={pending} style={{ border: 'none', margin: 0, padding: 0, display: 'grid', gap: '1rem' }}>
              <div>
                <label htmlFor="username">Email</label>
                <input type="email" id="username" name="username" autoComplete="username" required />
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
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.25rem' }} disabled={pending}>
                {pending ? 'Signing in…' : 'Sign in'}
              </button>
            </fieldset>
          </form>
          <p className="auth-footer">
            New studio? <Link to="/signup">Create an account</Link> · Staff? <Link to="/join">Join with code</Link>
          </p>
        </div>
      </div>
    </div>
  )
})

