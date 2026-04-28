import { memo, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { appService } from '../../services/appService'

type Customer = {
  id: number
  name: string
  phone: string
  address?: string | null
}

export default memo(function CustomersPage() {
  const [sp] = useSearchParams()
  const q = sp.get('q') || ''
  const nav = useNavigate()
  const [list, setList] = useState<Customer[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const data = (await appService.customers.list(q || undefined)) as Customer[]
      if (!alive) return
      setList(data || [])
    })()
    return () => {
      alive = false
    }
  }, [q])

  const rows = useMemo(() => list, [list])

  return (
    <>
      <div className="panel" style={{ marginBottom: '1rem' }}>
        <div className="panel-header">
          <h2>Search</h2>
        </div>
        <div style={{ padding: '1rem 1.25rem' }}>
          <form
            className="form-grid"
            style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const nextQ = String(fd.get('q') || '')
              nav(`/app/customers?q=${encodeURIComponent(nextQ)}`)
            }}
          >
            <div style={{ flex: 1, minWidth: 200 }}>
              <label htmlFor="sq">Name or phone</label>
              <input id="sq" name="q" defaultValue={q} placeholder="Search…" />
            </div>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
            <Link className="btn btn-ghost" to="/app/customers">
              Clear
            </Link>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>All customers</h2>
          <Link className="btn btn-teal btn-sm" to="/app/customer">
            Add customer
          </Link>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Address</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4}>No customers yet.</td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.address || '—'}</td>
                    <td>
                      <Link className="btn btn-teal btn-sm" to={`/app/customer?id=${c.id}`}>
                        Profile
                      </Link>
                    </td>
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

