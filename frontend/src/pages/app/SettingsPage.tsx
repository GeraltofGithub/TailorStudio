import { memo, useCallback, useState } from 'react'

import { appService } from '../../services/appService'
import { useAuth } from '../../context/AuthContext'

export default memo(function SettingsPage() {
  const { state, refreshMe } = useAuth()
  const [sm, setSm] = useState('')
  const me: any = state.status === 'authed' ? (state.me as any) : null

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setSm('')
      const fd = new FormData(e.currentTarget)
      const body = {
        name: String(fd.get('name') || ''),
        tagline: String(fd.get('tagline') || '') || null,
        address: String(fd.get('address') || '') || null,
        phone: String(fd.get('phone') || '') || null,
        secondaryPhone: String(fd.get('secondaryPhone') || '') || null,
      }
      try {
        await appService.business.update(body)
        setSm('Saved.')
        await refreshMe()
      } catch {
        setSm('Could not save.')
      }
    },
    [refreshMe]
  )

  if (state.status !== 'authed') return null
  if (me.role !== 'OWNER') {
    return (
      <div className="panel">
        <div style={{ padding: '1.5rem', color: 'var(--muted)' }}>Studio settings are only available to the owner account.</div>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Business details</h2>
      </div>
      <div style={{ padding: '1.25rem' }}>
        <form id="sf" className="form-grid" style={{ maxWidth: 520 }} onSubmit={onSubmit}>
          <div>
            <label>Studio name</label>
            <input name="name" required defaultValue={me.businessName || ''} />
          </div>
          <div>
            <label>Tagline</label>
            <input name="tagline" defaultValue={me.tagline || ''} />
          </div>
          <div>
            <label>Address</label>
            <textarea name="address" defaultValue={me.address || ''} />
          </div>
          <div className="form-grid two">
            <div>
              <label>Phone</label>
              <input name="phone" defaultValue={me.phone || ''} />
            </div>
            <div>
              <label>Alt. phone</label>
              <input name="secondaryPhone" defaultValue={me.secondaryPhone || ''} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </form>
        <p id="sm" style={{ marginTop: '1rem' }}>
          {sm}
        </p>
      </div>
    </div>
  )
})

