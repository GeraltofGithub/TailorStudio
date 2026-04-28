import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import { appService } from '../../services/appService'
import { useAuth } from '../../context/AuthContext'

export default memo(function TeamPage() {
  const { state } = useAuth()
  const [team, setTeam] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [joinCode, setJoinCode] = useState<string>('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const list = await appService.team.list()
      if (!alive) return
      setTeam(list || [])
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (state.status !== 'authed') return
    const me: any = state.me as any
    setJoinCode(me.joinCode || '—')
  }, [state])

  const isOwner = state.status === 'authed' && (state.me as any).role === 'OWNER'

  const rotate = useCallback(async () => {
    setMsg('')
    try {
      const data = await appService.team.rotateJoinCode()
      setJoinCode(String((data as any).joinCode || '—'))
      setMsg('New code generated. Share it with new staff only.')
    } catch {
      setMsg('Could not rotate.')
    }
  }, [])

  const rows = useMemo(() => team || [], [team])

  return (
    <>
      {isOwner ? (
        <div className="panel" style={{ marginBottom: '1.25rem' }}>
          <div className="panel-header">
            <h2>Invite staff</h2>
          </div>
          <div style={{ padding: '1.25rem' }}>
            <p style={{ margin: '0 0 1rem', color: 'var(--muted)', maxWidth: '52ch' }}>
              Share this code with cutters and tailors. They use Join with a code to create an account linked to <strong>{(state.me as any).businessName}</strong>. Rotate the code anytime old invites should stop working.
            </p>
            <div className="join-code-box" id="jc">
              {joinCode || '—'}
            </div>
            <div style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-teal" id="rot" onClick={() => void rotate()}>
                Generate new code
              </button>
            </div>
            <p id="rot-msg" style={{ marginTop: '0.75rem', fontSize: '0.88rem', color: 'var(--muted)' }}>
              {msg}
            </p>
          </div>
        </div>
      ) : (
        <div className="panel" style={{ marginBottom: '1.25rem' }}>
          <div style={{ padding: '1.25rem', color: 'var(--muted)' }}>
            Only the studio owner can view or rotate the join code. Ask them to invite new staff.
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <h2>People in this studio</h2>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4}>No team members.</td>
                </tr>
              ) : (
                rows.map((u: any) => (
                  <tr key={u.id || `${u.email}-${u.fullName}`}>
                    <td>{u.fullName}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge badge-ready">{u.role}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{String(u.createdAt || '').slice(0, 10)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
})

