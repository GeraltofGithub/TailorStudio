import { Suspense, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { useAppToast } from '../utils/toast'
import { api } from '../services/api/api'
import { appService } from '../services/appService'
import tailorLogo from '../assets/tailor-logo.png'

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
  const navigate = useNavigate()
  const toast = useAppToast()

  const title = useMemo(() => pageTitleFromPath(pathname), [pathname])
  const [signingOut, setSigningOut] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

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

  // Prefetch common data right after auth so tab switches feel instant.
  useEffect(() => {
    if (state.status !== 'authed') return
    const run = () => {
      void appService.dashboard.stats().catch(() => null)
      void appService.customers.list().catch(() => null)
      void appService.orders.list().catch(() => null)
      void appService.team.list().catch(() => null)
    }
    // Prefer idle time to avoid blocking first render.
    const ric = (window as any).requestIdleCallback as ((cb: () => void, opts?: any) => any) | undefined
    if (ric) {
      const id = ric(run, { timeout: 1200 })
      return () => {
        try {
          ;(window as any).cancelIdleCallback?.(id)
        } catch {
          // ignore
        }
      }
    }
    const t = window.setTimeout(run, 250)
    return () => window.clearTimeout(t)
  }, [state.status])

  // Must be declared before any conditional returns (Rules of Hooks).
  const onLogout = useCallback(async () => {
    if (signingOut) return
    setSigningOut(true)

    // Use the shared API client so CSRF is sourced from X-XSRF-TOKEN response headers
    // (critical for cross-origin cookie setups like Vercel + Render).
    const res = await api.postFormLogout('/logout', new URLSearchParams()).catch(() => null)

    // Prefer 204 from API; if backend still redirects, fetch is configured with redirect:'manual' so we don't follow HTML pages on the API host.
    const success =
      !!res &&
      (res.ok ||
        res.type === 'opaqueredirect' ||
        (res.status >= 300 && res.status < 400) ||
        res.status === 0)
    if (!success) {
      toast.error('Logout failed. Please retry.')
      setSigningOut(false)
      return
    }

    // Immediately clear local auth so /app routes require login.
    clearAuth()
    await refreshMe({ silent: true })
    toast.success('Signed out')
    navigate('/', { replace: true })
  }, [clearAuth, navigate, refreshMe, signingOut, toast])

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
      {/* Mobile sidebar overlay */}
      <button
        type="button"
        className={`ts-sidebar-overlay${mobileSidebarOpen ? ' open' : ''}`}
        aria-hidden={!mobileSidebarOpen}
        tabIndex={mobileSidebarOpen ? 0 : -1}
        onClick={() => setMobileSidebarOpen(false)}
      />

      <aside className={`sidebar no-print${mobileSidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <img src={tailorLogo} alt="Tailor Studio logo" className="brand-logo" />
          <div>
            <div className="studio-name">{me.businessName || 'Studio'}</div>
            <div className="studio-tag">Tailor workspace</div>
          </div>
        </div>

        <nav className="nav-links">
          {links.map((n) => (
            <NavLink
              key={n.id}
              to={n.href}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setMobileSidebarOpen(false)}
            >
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
          <div className="ts-topbar-left">
            <button
              type="button"
              className="ts-hamburger"
              aria-label={mobileSidebarOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileSidebarOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
            <h1>{title}</h1>
          </div>
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
          <Suspense
            fallback={
              <div className="panel" style={{ padding: '1.25rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
                Loading…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  )
})

