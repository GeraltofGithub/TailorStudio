import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { appService } from '../../services/appService'
import { useAuth } from '../../context/AuthContext'
import { orderSlipHtml, paymentReceiptHtml, printElement } from '../../utils/receipt'

export default memo(function PaymentsPage() {
  const { state } = useAuth()
  const [sp] = useSearchParams()
  const selId = sp.get('id') ? Number(sp.get('id')) : null

  const [orders, setOrders] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)

  const rpRef = useRef<HTMLDivElement | null>(null)
  const roRef = useRef<HTMLDivElement | null>(null)

  const studio = useMemo(() => {
    if (state.status !== 'authed') return { name: 'Tailor Studio', tagline: '', phone: '', address: '' }
    const me: any = state.me as any
    return {
      name: me.businessName || 'Tailor Studio',
      tagline: me.tagline || '',
      phone: me.phone || '',
      address: me.address || '',
    }
  }, [state])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const list = await appService.orders.list()
      if (!alive) return
      setOrders(list || [])
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!selId) {
        if (alive) setSelectedOrder(null)
        return
      }
      let o: any
      try {
        o = await appService.orders.get(selId)
      } catch {
        if (alive) setSelectedOrder(null)
        return
      }
      if (!alive) return
      setSelectedOrder(o)
    })()
    return () => {
      alive = false
    }
  }, [selId])

  useEffect(() => {
    const o = selectedOrder
    if (!o) return

    const lines = (o.lines || []).map((ln: any) => ({ description: ln.description, amount: Number(ln.amount) || 0 }))
    const totalFromLines = lines.reduce((s: number, ln: any) => s + (Number(ln.amount) || 0), 0)
    const total = totalFromLines > 0 ? totalFromLines : Number(o.totalAmount) || 0
    const adv = Number(o.advanceAmount) || 0
    const bal = Math.max(0, total - adv)

    if (rpRef.current) {
      rpRef.current.style.display = 'block'
      rpRef.current.innerHTML = paymentReceiptHtml(studio, {
        serialLabel: o.serialNumber != null ? `#${o.serialNumber}` : 'Draft',
        orderDate: String(o.orderDate || '').slice(0, 10),
        deliveryDate: String(o.deliveryDate || '').slice(0, 10),
        customerName: o.customer?.name ? `${o.customer.name}${o.customer.phone ? ` — ${o.customer.phone}` : ''}` : '',
        garment: o.garmentType,
        lines,
        total,
        advance: adv,
        balance: bal,
      })
    }

    if (roRef.current) {
      roRef.current.style.display = 'block'
      roRef.current.innerHTML = orderSlipHtml(studio, {
        serialLabel: o.serialNumber != null ? `#${o.serialNumber}` : 'Draft',
        orderDate: String(o.orderDate || '').slice(0, 10),
        deliveryDate: String(o.deliveryDate || '').slice(0, 10),
        customerLine: o.customer?.name ? `${o.customer.name}${o.customer.phone ? ` · ${o.customer.phone}` : ''}` : '',
        garment: o.garmentType,
        status: o.status,
        notes: o.notes,
        materialsNotes: o.materialsNotes,
        demandsNotes: o.demandsNotes,
        measurementSnapshotJson: o.measurementSnapshotJson,
        lines,
        totalAmount: total,
        advanceAmount: adv,
        balance: bal,
      })
    }
  }, [selectedOrder, studio])

  return (
    <>
      <div className="no-print" style={{ marginBottom: '1rem' }}>
        <p style={{ margin: '0 0 0.75rem', color: 'var(--muted)', fontSize: '0.95rem' }}>
          View and print the same <strong>payment receipt</strong> and <strong>work order</strong> as on the order screen. Balances reflect saved orders —
          edit an order to update amounts, then open this page again or refresh.
        </p>
        <div className="panel">
          <div className="panel-header">
            <h2>Orders &amp; balances</h2>
            <Link className="btn btn-ghost btn-sm" to="/app/orders">
              Orders list
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Garment</th>
                  <th>Total</th>
                  <th>Advance</th>
                  <th>Balance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(orders || []).length === 0 ? (
                  <tr>
                    <td colSpan={7}>No orders yet.</td>
                  </tr>
                ) : (
                  (orders || []).map((o: any) => {
                    const bal = Number(o.totalAmount) - Number(o.advanceAmount || 0)
                    return (
                      <tr key={o.id} data-id={o.id}>
                        <td>#{o.serialNumber}</td>
                        <td>{o.customer?.name || '—'}</td>
                        <td>{o.garmentType}</td>
                        <td>₹ {Number(o.totalAmount).toFixed(0)}</td>
                        <td>₹ {Number(o.advanceAmount || 0).toFixed(0)}</td>
                        <td>₹ {bal.toFixed(0)}</td>
                        <td className="no-print">
                          <Link className="btn btn-teal btn-sm" to={`/app/payments?id=${o.id}`}>
                            Receipts
                          </Link>{' '}
                          <Link className="btn btn-ghost btn-sm" to={`/app/order?id=${o.id}`}>
                            Edit
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="payments-detail" className="no-print" style={{ display: selId ? 'block' : 'none', marginTop: '1.5rem' }}>
        <div className="panel">
          <div className="panel-header">
            <h2 id="pay-head">{selectedOrder ? `Receipts for order #${selectedOrder.serialNumber}` : 'Receipts'}</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                id="btn-pay-print"
                disabled={!selectedOrder}
                onClick={() => {
                  if (!rpRef.current) return
                  printElement(rpRef.current)
                }}
              >
                Print payment receipt
              </button>
              <button
                type="button"
                className="btn btn-teal btn-sm"
                id="btn-order-print"
                disabled={!selectedOrder}
                onClick={() => {
                  if (!roRef.current) return
                  printElement(roRef.current)
                }}
              >
                Print work order
              </button>
              <Link className="btn btn-ghost btn-sm" id="pay-edit" to={selectedOrder ? `/app/order?id=${selectedOrder.id}` : '#'} aria-disabled={!selectedOrder}>
                Edit order
              </Link>
            </div>
          </div>
          <p style={{ padding: '0 1.25rem 1rem', margin: 0, color: 'var(--muted)', fontSize: '0.88rem' }}>
            Previews load from the server. To change advance or bill amounts, use <strong>Edit order</strong>, save, then refresh this page.
          </p>
        </div>
      </div>

      <div ref={rpRef} id="receipt-payment" className="receipt-sheet" style={{ display: selId ? 'block' : 'none' }} aria-label="Payment receipt" />
      <div
        ref={roRef}
        id="receipt-order"
        className="receipt-sheet"
        style={{ display: selId ? 'block' : 'none', marginTop: '1.5rem' }}
        aria-label="Work order"
      />
    </>
  )
})

