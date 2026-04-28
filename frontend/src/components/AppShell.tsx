import Cookies from 'js-cookie'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { useAppToast } from '../utils/toast'
import { BASE_URL } from '../utils/constants'

type NavItem = { href: string; id: string; label: string; icon: string }

const NAV: NavItem[] = [
  { href: '/app/dashboard', id: 'dashboard', label: 'Dashboard', icon: '◇' },
  { href: '/app/customers', id: 'customers', label: 'Customers', icon: '◎' },
  { href: '/app/orders', id: 'orders', label: 'Orders', icon: '☰' },
  { href: '/app/payments', id: 'payments', label: 'Payments', icon: '₹' },
  { href: '/app/team', id: 'team', label: 'Team & code', icon: '✦' },
  { href: '/app/settings', id: 'settings', label: 'Studio', icon: '⚙' },
]

function pageTitleFromPath(pathname: string) {
  if (pathname.startsWith('/app/customers')) return 'Customers'
  if (pathname.startsWith('/app/orders')) return 'Orders'
  if (pathname.startsWith('/app/payments')) return 'Payments'
  if (pathname.startsWith('/app/team')) return 'Team & code'
  if (pathname.startsWith('/app/settings')) return 'Studio'
  return 'Dashboard'
}

export const AppShell = memo(function AppShell() {
  const { state, refreshMe, clearAuth } = useAuth()
  const { pathname } = useLocation()
  const toast = useAppToast()

  const title = useMemo(() => pageTitleFromPath(pathname), [pathname])
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    try {
      const v = sessionStorage.getItem('ts_login_success')
      if (v === '1') {
        sessionStorage.removeItem('ts_login_success')
        toast.success('Login successful')
      }
    } catch {
      // ignore
    }
  }, [toast])

  // Must be declared before any conditional returns (Rules of Hooks).
  const onLogout = useCallback(async () => {
    if (signingOut) return
    setSigningOut(true)

    // CSRF token cookie might not exist yet (SPA doesn't hit backend HTML pages).
    // Force token cookie issuance by touching an authenticated endpoint first.
    async function ensureCsrfCookie() {
      let csrf = Cookies.get('XSRF-TOKEN') || ''
      if (!csrf) {
        await fetch(`${BASE_URL}/api/me`, { credentials: 'include', cache: 'no-store' }).catch(() => null)
        csrf = Cookies.get('XSRF-TOKEN') || ''
      }
      return csrf
    }

    async function postLogout(csrf: string) {
      return fetch(`${BASE_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: csrf
          ? { 'Content-Type': 'application/x-www-form-urlencoded', 'X-XSRF-TOKEN': csrf }
          : { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(csrf ? { _csrf: csrf } : {}).toString(),
        redirect: 'follow',
      }).catch(() => null)
    }

    let csrf = await ensureCsrfCookie()
    let res = await postLogout(csrf)

    // If CSRF was missing/stale, Spring returns 403. Retry once after forcing a fresh CSRF cookie.
    if (res && res.status === 403) {
      await fetch(`${BASE_URL}/api/me`, { credentials: 'include', cache: 'no-store' }).catch(() => null)
      csrf = await ensureCsrfCookie()
      res = await postLogout(csrf)
    }

    // Spring Security logout often responds with 302 redirect to /index.html.
    const success = !!res && (res.ok || (res.status >= 300 && res.status < 400))
    if (!success) {
      toast.error('Logout failed. Please retry.')
      setSigningOut(false)
      return
    }

    // Immediately clear local auth so /app routes require login.
    clearAuth()
    await refreshMe()
    toast.success('Signed out')
    window.location.assign('/')
  }, [clearAuth, refreshMe, signingOut, toast])

  if (state.status === 'loading') {
    return (
      <div className="auth-page" style={{ minHeight: '40vh' }}>
        <p style={{ color: 'var(--text, #e8ecf4)', margin: 0 }}>Loading workspace…</p>
      </div>
    )
  }

  if (state.status !== 'authed') return <Navigate to="/login" replace />

  const me = state.me
  const isOwner = me.role === 'OWNER'
  const links = NAV.filter((n) => !(n.id === 'settings' && !isOwner))

  return (
    <div className="app-layout">
      <aside className="sidebar no-print">
        <div className="sidebar-brand">
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="2" y="2" width="36" height="36" rx="8" stroke="url(#g)" strokeWidth="2" />
            <path d="M12 28L20 10L28 28" stroke="#c9a227" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="40" y2="40">
                <stop stopColor="#2dd4bf" />
                <stop offset="1" stopColor="#c9a227" />
              </linearGradient>
            </defs>
          </svg>
          <div>
            <div className="studio-name">{me.businessName || 'Studio'}</div>
            <div className="studio-tag">Tailor workspace</div>
          </div>
        </div>

        <nav className="nav-links">
          {links.map((n) => (
            <NavLink key={n.id} to={n.href} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span aria-hidden="true">{n.icon}</span> {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          Signed in as
          <br />
          <strong>{me.fullName}</strong>
        </div>
      </aside>

      <div className="app-main">
        <nav className="mobile-nav no-print">
          {links.map((n) => (
            <NavLink key={n.id} to={n.href} className={({ isActive }) => (isActive ? 'active' : '')}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <header className="topbar no-print">
          <h1>{title}</h1>
          <div className="user-pill">
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{me.fullName}</div>
              <div className="role">{me.role}</div>
            </div>
            <button
              type="button"
              onClick={() => void onLogout()}
              disabled={signingOut}
              aria-label="Sign out"
              title="Sign out"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                borderRadius: 999,
                border: '1px solid rgba(248, 113, 113, 0.35)',
                background: 'rgba(248, 113, 113, 0.10)',
                color: 'rgba(127, 29, 29, 0.95)',
                cursor: signingOut ? 'not-allowed' : 'pointer',
                opacity: signingOut ? 0.6 : 1,
              }}
            >
              {/* simple logout icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M10 7V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path d="M3 12h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M7 8l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
})

