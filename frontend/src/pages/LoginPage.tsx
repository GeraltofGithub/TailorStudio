import Cookies from 'js-cookie'
import { memo, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useAppToast } from '../utils/toast'

export default memo(function LoginPage() {
  const [sp] = useSearchParams()
  const showError = sp.get('error') === '1'
  const csrf = Cookies.get('XSRF-TOKEN') || ''
  const nav = useNavigate()
  const toast = useAppToast()

  // Keep this relative so Vite proxy handles it in local dev.
  // If you set VITE_API_BASE_URL to localhost:8081, the browser would POST directly to 8081
  // and then follow Spring's default redirect to /app/dashboard.html on the backend.
  const action = useMemo(() => `/login`, [])

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
          method="post"
          action={action}
          id="login-form"
          onSubmit={() => {
            // Show toast once after successful auth redirect.
            try {
              sessionStorage.setItem('ts_login_success', '1')
            } catch {
              // ignore
            }
          }}
        >
          <input type="hidden" name="_csrf" id="_csrf" value={csrf} />
          <div>
            <label htmlFor="username">Email</label>
            <input type="email" id="username" name="username" autoComplete="username" required />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" autoComplete="current-password" required />
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

