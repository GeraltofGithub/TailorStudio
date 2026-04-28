import { memo, useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { authService } from '../services/authService'
import { useAppToast } from '../utils/toast'
import { Eye, EyeOff } from 'lucide-react'

export default memo(function SignupPage() {
  const [pending, setPending] = useState(false)
  const nav = useNavigate()
  const toast = useAppToast()
  const [showPass, setShowPass] = useState(false)

  const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (pending) return
    setPending(true)

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
      toast.success(data.message || 'Studio created')
      window.setTimeout(() => nav('/login'), 900)
    } catch (e: any) {
      const msg = e?.payload?.error || e?.payload?.message || e?.message
      toast.error(msg ? String(msg) : 'Could not create studio. Please try again.')
    }

    setPending(false)
  }, [nav, pending, toast])

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <h1>Create your studio</h1>
        <p className="sub">You become the owner. You’ll get a join code to invite staff.</p>
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
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                id="password"
                name="password"
                required
                minLength={8}
                maxLength={100}
                autoComplete="new-password"
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

