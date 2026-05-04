import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { authService } from '../services/authService'
import tailorLogo from '../assets/tailor-logo.png'
import { triggerBackendWarmup } from '../services/bootWake'

type Msg = { kind: 'success' | 'error'; text: string } | null

async function joinWithTimeout<T>(p: Promise<T>, timeoutMs = 25000): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('timeout')), timeoutMs)
    }),
  ])
}

export default memo(function JoinPage() {
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, setPending] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    void triggerBackendWarmup()
  }, [])

  const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (pending) return
    setPending(true)
    setMsg(null)

    await triggerBackendWarmup()

    const fd = new FormData(e.currentTarget)
    const body = {
      joinCode: String(fd.get('joinCode') || '').trim(),
      fullName: String(fd.get('fullName') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      password: String(fd.get('password') || ''),
    }

    try {
      const data = await joinWithTimeout(authService.staffSignup(body))
      setMsg({ kind: 'success', text: data.message || 'Joined.' })
      window.setTimeout(() => nav('/login'), 900)
    } catch (e: any) {
      setMsg({ kind: 'error', text: e?.message === 'timeout' ? 'Join is taking too long. Please retry in a few seconds.' : e?.payload?.error || e?.payload?.message || e?.message || 'Could not join' })
    }

    setPending(false)
  }, [nav, pending])

  const msgNode = useMemo(() => {
    if (!msg) return null
    return <div className={`alert ${msg.kind === 'success' ? 'alert-success' : 'alert-error'}`}>{msg.text}</div>
  }, [msg])

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
          <Link className="btn btn-primary" to="/signup">
            Create studio
          </Link>
        </nav>
      </header>
      <div className="auth-page">
        <div className="auth-card">
          <h1>Join your studio</h1>
          <p className="sub">Ask the owner for the join code, then create your staff account.</p>
          <div id="msg">{msgNode}</div>
          <form id="f" onSubmit={onSubmit}>
            <fieldset disabled={pending} style={{ border: 'none', margin: 0, padding: 0, display: 'grid', gap: '1rem' }}>
            <div>
              <label htmlFor="joinCode">Studio join code</label>
              <input
                id="joinCode"
                name="joinCode"
                required
                minLength={8}
                maxLength={64}
                autoComplete="off"
                className="join-code-box"
                style={{ textAlign: 'left' }}
                placeholder="e.g. A1B2C3D4"
              />
            </div>
            <div>
              <label htmlFor="fullName">Your name</label>
              <input id="fullName" name="fullName" required maxLength={120} />
            </div>
            <div>
              <label htmlFor="email">Email (login)</label>
              <input type="email" id="email" name="email" required autoComplete="email" />
            </div>
            <div>
              <label htmlFor="password">Password (min 8)</label>
              <input type="password" id="password" name="password" required minLength={8} maxLength={100} autoComplete="new-password" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={pending}>
              {pending ? 'Joining…' : 'Join studio'}
            </button>
            </fieldset>
          </form>
          <p className="auth-footer">
            <Link to="/login">Sign in</Link> · <Link to="/signup">Create a new studio</Link>
          </p>
        </div>
      </div>
    </div>
  )
})

