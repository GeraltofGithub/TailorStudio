import { memo, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { appService } from '../../services/appService'
import { Pagination } from '../../components/Pagination'
import { useAppToast } from '../../utils/toast'
import { Eye, ShieldCheck, ShieldOff } from 'lucide-react'

type Customer = {
  id: number
  name: string
  phone: string
  address?: string | null
  active?: boolean
}

export default memo(function CustomersPage() {
  const [sp] = useSearchParams()
  const q = sp.get('q') || ''
  const nav = useNavigate()
  const toast = useAppToast()
  const [list, setList] = useState<Customer[]>([])
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 15

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

  useEffect(() => {
    setPage(1)
  }, [q])

  const rows = useMemo(() => list, [list])
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [page, pageSize, rows])

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
                pagedRows.map((c) => (
                  <tr key={c.id} style={{ opacity: c.active === false ? 0.55 : 1 }}>
                    <td>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.address || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <Link className="btn btn-teal btn-sm ts-icon-btn" to={`/app/customer?id=${c.id}`} aria-label="View profile">
                          <Eye size={16} />
                        </Link>
                        {c.active === false ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm ts-icon-btn"
                            aria-label="Enable customer"
                            disabled={togglingId === c.id}
                            onClick={async () => {
                              if (togglingId === c.id) return
                              setTogglingId(c.id)
                              try {
                                await appService.customers.enable(c.id)
                                setList((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: true } : x)))
                                toast.success('Customer enabled')
                              } catch (e: any) {
                                const msg = e?.payload?.message || e?.payload?.error || e?.message
                                toast.error(msg ? String(msg) : 'Could not enable customer. Please try again.')
                              } finally {
                                setTogglingId(null)
                              }
                            }}
                          >
                            <ShieldCheck size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm ts-icon-btn"
                            aria-label="Disable customer"
                            disabled={togglingId === c.id}
                            onClick={async () => {
                              if (togglingId === c.id) return
                              setTogglingId(c.id)
                              try {
                                await appService.customers.disable(c.id)
                                setList((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: false } : x)))
                                toast.success('Customer disabled')
                              } catch (e: any) {
                                const msg = e?.payload?.message || e?.payload?.error || e?.message
                                toast.error(msg ? String(msg) : 'Could not disable customer. Please try again.')
                              } finally {
                                setTogglingId(null)
                              }
                            }}
                          >
                            <ShieldOff size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
      </div>
    </>
  )
})

