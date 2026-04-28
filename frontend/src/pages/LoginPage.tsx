import { memo, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useAppToast } from '../utils/toast'
import { Eye, EyeOff } from 'lucide-react'
import { BASE_URL } from '../utils/constants'

export default memo(function LoginPage() {
  const [sp] = useSearchParams()
  const showError = sp.get('error') === '1'
  const nav = useNavigate()
  const toast = useAppToast()
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    if (!showError) return
    toast.error('Invalid credentials')
    // remove ?error=1 so toast doesn't keep repeating on refresh
    nav('/login', { replace: true })
  }, [nav, showError, toast])

  return (
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
            const fd = new FormData(e.currentTarget)
            const username = String(fd.get('username') || '')
            const password = String(fd.get('password') || '')
            const url = `${BASE_URL || ''}/login`
            try {
              const body = new URLSearchParams()
              body.set('username', username)
              body.set('password', password)
              // CSRF is ignored for POST /login in backend config.
              await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body,
              })

              // Spring Security responds with redirects on success/failure.
              // The most robust check (dev + prod) is to ask /api/me after the POST.
              const meUrl = `${BASE_URL || ''}/api/me`
              const me = await fetch(meUrl, { method: 'GET', credentials: 'include', cache: 'no-store' })
              if (me.ok) {
                try {
                  sessionStorage.setItem('ts_login_success', '1')
                } catch {
                  // ignore
                }
                nav('/app/dashboard', { replace: true })
                return
              }
              toast.error('Invalid credentials')
            } catch {
              toast.error('Server error during sign-in. Please retry.')
            }
          }}
        >
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
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.25rem' }}>
            Sign in
          </button>
        </form>
        <p className="auth-footer">
          New studio? <Link to="/signup">Create an account</Link> · Staff? <Link to="/join">Join with code</Link>
        </p>
      </div>
    </div>
  )
})

