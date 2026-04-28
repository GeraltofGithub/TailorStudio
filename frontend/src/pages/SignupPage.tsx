import { memo, useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { authService } from '../services/authService'

type Msg = { kind: 'success' | 'error'; text: string } | null

export default memo(function SignupPage() {
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, setPending] = useState(false)
  const nav = useNavigate()

  const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (pending) return
    setPending(true)
    setMsg(null)

    const fd = new FormData(e.currentTarget)
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

    try {
      const data = await authService.signup(body)
      setMsg({ kind: 'success', text: data.message || 'Created.' })
      window.setTimeout(() => nav('/login'), 900)
    } catch (e: any) {
      setMsg({ kind: 'error', text: e?.payload?.error || e?.payload?.message || e?.message || 'Could not create studio' })
    }

    setPending(false)
  }, [nav, pending])

  const msgNode = useMemo(() => {
    if (!msg) return null
    return <div className={`alert ${msg.kind === 'success' ? 'alert-success' : 'alert-error'}`}>{msg.text}</div>
  }, [msg])

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <h1>Create your studio</h1>
        <p className="sub">You become the owner. You’ll get a join code to invite staff.</p>
        <div id="msg">{msgNode}</div>
        <form id="f" onSubmit={onSubmit}>
          <div className="form-grid two">
            <div>
              <label htmlFor="businessName">Studio name</label>
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
              <label htmlFor="ownerName">Your name</label>
              <input id="ownerName" name="ownerName" required maxLength={120} />
            </div>
            <div>
              <label htmlFor="email">Email (login)</label>
              <input type="email" id="email" name="email" required autoComplete="email" />
            </div>
          </div>
          <div>
            <label htmlFor="password">Password (min 8)</label>
            <input type="password" id="password" name="password" required minLength={8} maxLength={100} autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={pending}>
            {pending ? 'Creating…' : 'Create studio'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
})

