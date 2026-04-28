import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { appService } from '../../services/appService'
import { useAuth } from '../../context/AuthContext'
import { orderSlipHtml, paymentReceiptHtml, printElement } from '../../utils/receipt'
import { useAppToast } from '../../utils/toast'

type Garment = 'SHIRT' | 'PANT' | 'BLOUSE' | 'SUIT'
type Status = 'PENDING' | 'IN_PROGRESS' | 'READY' | 'DELIVERED'

function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}
function plusDays(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function isoDate(v: any) {
  if (!v) return todayISODate()
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  if (Array.isArray(v) && v.length >= 3) return `${v[0]}-${String(v[1]).padStart(2, '0')}-${String(v[2]).padStart(2, '0')}`
  return todayISODate()
}

function parseSnapFromOrder(existing: any) {
  if (!existing || !existing.measurementSnapshotJson) return null
  try {
    return JSON.parse(existing.measurementSnapshotJson)
  } catch {
    return null
  }
}

export default memo(function OrderPage() {
  const { state } = useAuth()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const oid = sp.get('id') ? Number(sp.get('id')) : null
  const toast = useAppToast()

  const [existingOrder, setExistingOrder] = useState<any | null>(null)
  const [orderMissing, setOrderMissing] = useState(false)

  const [customers, setCustomers] = useState<any[]>([])
  const [customerPhoneMap, setCustomerPhoneMap] = useState<Record<string, string>>({})

  const [customerId, setCustomerId] = useState<string>('')
  const [garmentType, setGarmentType] = useState<Garment>('SHIRT')
  const [orderDate, setOrderDate] = useState<string>(todayISODate())
  const [deliveryDate, setDeliveryDate] = useState<string>(plusDays(7))
  const [status, setStatus] = useState<Status>('PENDING')
  const [advance, setAdvance] = useState<string>('0')

  const [billTotal, setBillTotal] = useState<string>('')
  const [billDesc, setBillDesc] = useState<string>('')
  const [extraEnabled, setExtraEnabled] = useState(false)
  const [extraDesc, setExtraDesc] = useState('')
  const [extraAmt, setExtraAmt] = useState<string>('')

  const [notes, setNotes] = useState('')
  const [matNotes, setMatNotes] = useState('')
  const [demNotes, setDemNotes] = useState('')

  const [snapCache, setSnapCache] = useState<any>(null)
  const [snapPreview, setSnapPreview] = useState<string>('')

  const [waPhone, setWaPhone] = useState('')
  const [waDate, setWaDate] = useState('')
  const [waIncPay, setWaIncPay] = useState(true)
  const [waIncDate, setWaIncDate] = useState(true)
  const [waPreview, setWaPreview] = useState<string>('')

  const [paymentInfo, setPaymentInfo] = useState<any>({ phonePeConfigured: false })
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payStep, setPayStep] = useState<'choice' | 'cash' | 'online'>('choice')
  const [payCashAmt, setPayCashAmt] = useState<string>('')

  const receiptPayRef = useRef<HTMLDivElement | null>(null)
  const orderSlipRef = useRef<HTMLDivElement | null>(null)
  const savingRef = useRef(false)

  const studio = useMemo(() => {
    if (state.status !== 'authed') return { name: 'Tailor Studio', tagline: '', phone: '', address: '' }
    const me: any = state.me as any
    return { name: me.businessName || 'Tailor Studio', tagline: me.tagline || '', phone: me.phone || '', address: me.address || '' }
  }, [state])

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!oid) return
      if (!alive) return
      try {
        const o = await appService.orders.get(oid)
        if (!alive) return
        setExistingOrder(o)
        setSnapCache(parseSnapFromOrder(o))
      } catch {
        setOrderMissing(true)
        return
      }
    })()
    return () => {
      alive = false
    }
  }, [oid])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const list = await appService.customers.list()
      if (!alive) return
      setCustomers(list || [])
      const map: Record<string, string> = {}
      ;(list || []).forEach((c: any) => {
        map[String(c.id)] = c.phone || ''
      })
      setCustomerPhoneMap(map)
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const existing = existingOrder
    if (!existing) return
    setCustomerId(existing?.customer?.id != null ? String(existing.customer.id) : '')
    setGarmentType(existing.garmentType || 'SHIRT')
    setOrderDate(isoDate(existing.orderDate))
    setDeliveryDate(isoDate(existing.deliveryDate))
    setStatus(existing.status || 'PENDING')
    setAdvance(String(existing.advanceAmount ?? 0))
    setNotes(existing.notes || '')
    setMatNotes(existing.materialsNotes || '')
    setDemNotes(existing.demandsNotes || '')

    const lines = existing.lines && existing.lines.length ? existing.lines : []
    const totalEst = lines.reduce((s: number, ln: any) => s + (Number(ln.amount) || 0), 0)
    setBillTotal(totalEst > 0 ? String(totalEst) : '')
    let d = lines[0] && lines[0].description ? lines[0].description : ''
    if (lines.length > 2) d = d ? `${d} (+ more lines)` : 'Combined charges'
    setBillDesc(d)

    const extraLine = lines.length > 1 ? lines[1] : null
    if (extraLine) {
      setExtraEnabled(true)
      setExtraDesc(extraLine.description || '')
      const ea = Number(extraLine.amount) || 0
      setExtraAmt(ea > 0 ? String(ea) : '')
    }

    const cust = existing.customer || null
    setWaPhone(cust?.phone || '')
    setWaDate(isoDate(existing.deliveryDate))
  }, [existingOrder])

  const statusRank = useMemo(() => {
    const s = status || 'PENDING'
    if (s === 'IN_PROGRESS') return 1
    if (s === 'READY') return 2
    if (s === 'DELIVERED') return 3
    return 0
  }, [status])

  const isCompleted = !!(oid && status === 'DELIVERED')

  const gatherLines = useCallback(() => {
    const g = garmentType
    const main = parseFloat(billTotal) || 0
    const desc = billDesc.trim() || `${g} — tailoring`
    const out: any[] = [{ description: desc, rate: main, amount: main }]
    if (extraEnabled) {
      const ed = extraDesc.trim()
      const ea = parseFloat(extraAmt) || 0
      if (ed && ea > 0) out.push({ description: ed, rate: ea, amount: ea })
    }
    return out
  }, [billDesc, billTotal, extraAmt, extraDesc, extraEnabled, garmentType])

  const totals = useMemo(() => {
    const lines = gatherLines()
    const sum = lines.reduce((s: number, ln: any) => s + (Number(ln.amount) || 0), 0)
    const adv = parseFloat(advance) || 0
    const bal = Math.max(0, sum - adv)
    return { lines, sum, adv, bal }
  }, [advance, gatherLines])

  const measurementJsonForSlip = useCallback(() => {
    if (snapCache && Object.keys(snapCache).length) {
      try {
        return JSON.stringify(snapCache)
      } catch {
        return ''
      }
    }
    if (existingOrder && existingOrder.measurementSnapshotJson) return existingOrder.measurementSnapshotJson
    return ''
  }, [existingOrder, snapCache])

  const renderReceipts = useCallback(() => {
    const snLabel = existingOrder?.serialNumber ? `#${existingOrder.serialNumber}` : 'Draft'
    const custOpt = customers.find((c) => String(c.id) === String(customerId))
    const name = custOpt ? `${custOpt.name} — ${custOpt.phone}` : ''

    if (receiptPayRef.current) {
      receiptPayRef.current.innerHTML = paymentReceiptHtml(studio, {
        serialLabel: snLabel,
        orderDate,
        deliveryDate,
        customerName: name,
        garment: garmentType,
        lines: totals.lines.map((l: any) => ({ description: l.description, amount: Number(l.amount) || 0 })),
        total: totals.sum,
        advance: totals.adv,
        balance: totals.bal,
      })
    }
    if (orderSlipRef.current) {
      orderSlipRef.current.innerHTML = orderSlipHtml(studio, {
        serialLabel: snLabel,
        orderDate,
        deliveryDate,
        customerLine: name,
        garment: garmentType,
        status,
        notes,
        materialsNotes: matNotes,
        demandsNotes: demNotes,
        measurementSnapshotJson: measurementJsonForSlip(),
        lines: totals.lines.map((l: any) => ({ description: l.description, amount: Number(l.amount) || 0 })),
        totalAmount: totals.sum,
        advanceAmount: totals.adv,
        balance: totals.bal,
      })
    }
  }, [
    customers,
    customerId,
    deliveryDate,
    demNotes,
    garmentType,
    matNotes,
    measurementJsonForSlip,
    notes,
    orderDate,
    existingOrder,
    status,
    studio,
    totals,
  ])

  useEffect(() => {
    renderReceipts()
  }, [renderReceipts])

  const loadPaymentInfo = useCallback(async () => {
    if (!oid) return
    try {
      setPaymentInfo(await appService.orders.paymentInfo(oid))
    } catch {
      // ignore
    }
  }, [oid])

  useEffect(() => {
    void loadPaymentInfo()
  }, [loadPaymentInfo])

  const refreshMeasurementSnapshot = useCallback(async () => {
    if (!customerId) return {}
    const m = await appService.customers.getMeasurement(Number(customerId), garmentType)
    try {
      return JSON.parse(m?.dataJson || '{}')
    } catch {
      return {}
    }
  }, [customerId, garmentType])

  const pullMeasurements = useCallback(async () => {
    const snap = await refreshMeasurementSnapshot()
    setSnapCache(snap)
    setSnapPreview(JSON.stringify(snap, null, 2))
  }, [refreshMeasurementSnapshot])

  const waMessageText = useCallback(() => {
    const custOpt = customers.find((c) => String(c.id) === String(customerId))
    const custLabel = custOpt ? `${custOpt.name} — ${custOpt.phone}` : ''
    const delivery = waDate || deliveryDate
    const parts: string[] = [`Hello ${custLabel ? custLabel.split(' — ')[0] : 'Customer'},`]
    parts.push(`Your order for ${garmentType} is in process.`)
    if (waIncPay) parts.push(`Payment update: Total Rs ${totals.sum.toFixed(2)}, Paid Rs ${totals.adv.toFixed(2)}, Balance Rs ${totals.bal.toFixed(2)}.`)
    if (waIncDate && delivery) parts.push(`Expected delivery date: ${delivery}.`)
    parts.push(`Thank you, ${studio.name || 'Tailor Studio'}`)
    return parts.join('\n')
  }, [customers, customerId, deliveryDate, garmentType, studio.name, totals, waDate, waIncDate, waIncPay])

  const onSubmitSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (savingRef.current) return
    if (isCompleted) {
      toast.error('Order completed. Delivered orders cannot be updated.')
      return
    }
    savingRef.current = true
    let snap = snapCache
    if (!snap || !Object.keys(snap).length) snap = await refreshMeasurementSnapshot()
    if (!snap || !Object.keys(snap).length) snap = {}

    const body = {
      customerId: parseInt(customerId, 10),
      garmentType,
      measurementSnapshot: snap,
      orderDate,
      deliveryDate,
      status,
      advanceAmount: parseFloat(advance) || 0,
      notes,
      materialsNotes: matNotes || '',
      demandsNotes: demNotes || '',
      lines: gatherLines(),
    }

    try {
      const data = oid ? await appService.orders.update(oid, body) : await appService.orders.create(body)
      if (!oid && (data as any).id) {
        nav(`/app/order?id=${(data as any).id}`)
        toast.success('Order saved')
        savingRef.current = false
        return
      }
      setExistingOrder(data)
      setSnapCache(parseSnapFromOrder(data))
      await loadPaymentInfo()
      toast.success('Order saved')
    } catch (e: any) {
      const msg = e?.payload?.message || e?.payload?.error || e?.message
      toast.error(msg ? String(msg) : 'Could not save order. Please try again.')
    } finally {
      savingRef.current = false
    }
  }, [
    advance,
    customerId,
    demNotes,
    deliveryDate,
    garmentType,
    gatherLines,
    isCompleted,
    loadPaymentInfo,
    matNotes,
    nav,
    notes,
    oid,
    orderDate,
    refreshMeasurementSnapshot,
    snapCache,
    status,
    toast,
  ])

  if (orderMissing) return <p>Order not found.</p>

  const canPayActions = !!oid && (totals.bal > 0.005 || (paymentInfo?.balanceDue != null && Number(paymentInfo.balanceDue) > 0.005))
  const showSync = !!oid && !!paymentInfo?.phonePeConfigured && canPayActions

  return (
    <>
      <div className="no-print" style={{ marginBottom: '1rem' }}>
        <Link className="btn btn-ghost btn-sm" to="/app/orders">
          ← Orders
        </Link>
      </div>

      <div className="no-print">
        <form id="of" className="ts-app-form" onSubmit={onSubmitSave}>
          <div className="panel">
            <div className="panel-header">
              <h2>{existingOrder ? `Order #${existingOrder.serialNumber}` : oid ? 'Edit order' : 'New order'}</h2>
              <div className="no-print" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  id="btn-print-pay"
                  onClick={() => {
                    renderReceipts()
                    printElement(receiptPayRef.current, 'Payment receipt')
                  }}
                >
                  Print payment receipt
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  id="btn-print-order"
                  onClick={() => {
                    renderReceipts()
                    printElement(orderSlipRef.current, 'Work order')
                  }}
                >
                  Print work order
                </button>
              </div>
            </div>

            <div className="form-grid" style={{ padding: '1.25rem', gap: '1rem' }}>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
                Who it&apos;s for, what you&apos;re stitching, dates, and money — like a paper register, without the columns you don&apos;t need.
              </p>

              <div className="form-grid two">
                <div>
                  <label>Customer</label>
                  <select
                    id="cust"
                    required
                    value={customerId}
                    onChange={(e) => {
                      setCustomerId(e.target.value)
                      setWaPhone(customerPhoneMap[String(e.target.value)] || '')
                    }}
                  >
                    <option value="">Choose customer…</option>
                    {(customers || []).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.phone}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Garment</label>
                  <select id="gar" value={garmentType} onChange={(e) => setGarmentType(e.target.value as Garment)}>
                    {(['SHIRT', 'PANT', 'BLOUSE', 'SUIT'] as Garment[]).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid two">
                <div>
                  <label>Order taken on</label>
                  <input id="od" type="date" required value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
                </div>
                <div>
                  <label>Ready / delivery by</label>
                  <input
                    id="dd"
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => {
                      setDeliveryDate(e.target.value)
                      setWaDate(e.target.value)
                    }}
                  />
                </div>
              </div>

              <div className="form-grid two">
                <div>
                  <label>Work status</label>
                  <select
                    id="st"
                    value={status}
                    disabled={isCompleted}
                    onChange={(e) => {
                      const next = e.target.value as Status
                      setStatus(next)
                      if (next === 'PENDING') toast.success('Work status: Pending')
                      if (next === 'IN_PROGRESS') toast.success('Work status: In progress')
                      if (next === 'READY') toast.success('Work status: Ready')
                      if (next === 'DELIVERED') toast.success('Work status: Delivered')
                    }}
                  >
                    {(['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED'] as Status[]).map((s) => {
                      const r = s === 'PENDING' ? 0 : s === 'IN_PROGRESS' ? 1 : s === 'READY' ? 2 : 3
                      const disabled = r < statusRank
                      return (
                        <option key={s} value={s} disabled={disabled}>
                          {s.replace(/_/g, ' ')}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div>
                  <label>Advance taken (₹)</label>
                  <input id="adv" type="number" step="0.01" min={0} value={advance} placeholder="0" onChange={(e) => setAdvance(e.target.value)} />
                </div>
              </div>

              <div className="panel" style={{ marginTop: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="panel-header">
                  <h2 style={{ fontSize: '1rem' }}>Bill</h2>
                </div>
                <div style={{ padding: '1rem 1.25rem' }}>
                  <div className="form-grid two">
                    <div>
                      <label>Total charge for this job (₹)</label>
                      <input id="bill-total" type="number" step="0.01" min={0} value={billTotal} placeholder="e.g. 1500" onChange={(e) => setBillTotal(e.target.value)} />
                    </div>
                    <div>
                      <label>What it&apos;s for (on bill)</label>
                      <input
                        id="bill-desc"
                        type="text"
                        value={billDesc}
                        placeholder="e.g. Shirt — full stitching"
                        onChange={(e) => setBillDesc(e.target.value)}
                      />
                    </div>
                  </div>

                  <div
                    id="extra-row"
                    className={extraEnabled ? '' : 'order-extra-hidden'}
                    style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border)' }}
                  >
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>Extra (lining, buttons, urgent fee…)</p>
                    <div className="form-grid two">
                      <div>
                        <label>Extra description</label>
                        <input id="extra-desc" type="text" value={extraDesc} placeholder="Optional" onChange={(e) => setExtraDesc(e.target.value)} />
                      </div>
                      <div>
                        <label>Extra amount (₹)</label>
                        <input id="extra-amt" type="number" step="0.01" min={0} value={extraAmt} onChange={(e) => setExtraAmt(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    id="toggle-extra"
                    style={{ marginTop: '0.75rem' }}
                    onClick={() => {
                      setExtraEnabled((v) => {
                        const next = !v
                        if (!next) {
                          setExtraAmt('')
                          setExtraDesc('')
                        }
                        return next
                      })
                    }}
                  >
                    {extraEnabled ? 'Remove extra line' : '+ Add extra charge (material / fees)'}
                  </button>
                </div>
              </div>

              <div className="panel" style={{ marginTop: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="panel-header">
                  <h2 style={{ fontSize: '1rem' }}>Payment</h2>
                </div>
                <div style={{ padding: '1rem 1.25rem', fontSize: '0.95rem' }}>
                  <div className="stat-row">
                    <span>Job total</span>
                    <strong id="sum-display">₹ {totals.sum.toFixed(2)}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Advance received</span>
                    <strong id="adv-display">₹ {totals.adv.toFixed(2)}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Balance due</span>
                    <strong id="bal-display">₹ {totals.bal.toFixed(2)}</strong>
                  </div>
                  <p style={{ margin: '0.75rem 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                    Set status to Delivered when the customer collects; balance zero means fully paid.
                  </p>

                  <div id="pay-actions-wrap" style={{ marginTop: '0.75rem' }}>
                    {oid ? (
                      <>
                        <p id="pay-actions-hint" style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', color: 'var(--muted)', display: canPayActions ? 'block' : 'none' }}>
                          Record cash, UPI (PhonePe), or mark fully paid when there is balance due.
                        </p>
                        <div
                          id="pay-actions"
                          style={{
                            display: canPayActions ? 'flex' : 'none',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            alignItems: 'center',
                            minHeight: '2.25rem',
                          }}
                        >
                          <button type="button" className="btn btn-teal btn-sm" id="btn-receive-pay" onClick={() => { setPayModalOpen(true); setPayStep('choice') }}>
                            Receive payment
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            id="btn-mark-paid"
                            onClick={async () => {
                              if (!oid) return
                              if (!confirm('Mark this order as fully paid (set advance equal to total)?')) return
                              try {
                                const data = await appService.orders.markPaid(oid)
                                setExistingOrder(data)
                                setAdvance(String((data as any).advanceAmount))
                                await loadPaymentInfo()
                                toast.success('Order marked as fully paid')
                              } catch (e: any) {
                                const msg = e?.payload?.error || e?.payload?.message || e?.message
                                toast.error(msg ? String(msg) : 'Failed to mark order as paid. Please try again.')
                              }
                            }}
                          >
                            Mark fully paid
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            id="btn-sync-phonepe"
                            style={{ display: showSync ? 'inline-block' : 'none' }}
                            onClick={async () => {
                              if (!oid) return
                              try {
                                const data = await appService.orders.phonePeSync(oid)
                                setExistingOrder(data)
                                setAdvance(String((data as any).advanceAmount))
                                await loadPaymentInfo()
                                toast.success('Payment status synced')
                              } catch (e: any) {
                                const msg = e?.payload?.error || e?.payload?.message || e?.message
                                toast.error(msg ? String(msg) : 'Could not sync online payment. Please try again.')
                              }
                            }}
                          >
                            Sync online payment
                          </button>
                        </div>
                        <p id="paid-full-note" style={{ display: canPayActions ? 'none' : 'block', margin: '0.5rem 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
                          No balance due — this order is fully paid.
                        </p>
                      </>
                    ) : (
                      <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
                        Save the order first to record payments (cash, UPI, or mark as paid).
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="panel" style={{ marginTop: '1rem' }}>
                <div className="panel-header">
                  <h2 style={{ fontSize: '1rem' }}>Work order details</h2>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>
                    Shown on the <strong>work order</strong> print — not on the payment receipt.
                  </p>
                </div>
                <div style={{ padding: '1rem 1.25rem' }} className="form-grid ts-app-form">
                  <div>
                    <label>Materials & cloth</label>
                    <textarea id="mat_notes" rows={2} placeholder="Fabric, colour, lining, buttons, supplies…" value={matNotes} onChange={(e) => setMatNotes(e.target.value)} />
                  </div>
                  <div>
                    <label>Customer requests & demands</label>
                    <textarea id="dem_notes" rows={2} placeholder="Fitting preferences, deadlines, special instructions…" value={demNotes} onChange={(e) => setDemNotes(e.target.value)} />
                  </div>
                  <div>
                    <label>Workshop notes</label>
                    <textarea id="notes" rows={2} placeholder="Internal reminders, fitting notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="panel" style={{ marginTop: '1rem' }}>
                <div className="panel-header">
                  <h2 style={{ fontSize: '1rem' }}>Measurements on this order</h2>
                  <button type="button" className="btn btn-teal btn-sm" id="pullM" onClick={() => void pullMeasurements()}>
                    Copy from customer profile
                  </button>
                </div>
                <div style={{ padding: '1rem 1.25rem', color: 'var(--muted)', fontSize: '0.88rem' }}>
                  Uses saved sizes for the customer and garment above. Click after selecting both.
                </div>
                <pre
                  id="snap-preview"
                  style={{
                    display: snapPreview ? 'block' : 'none',
                    whiteSpace: 'pre-wrap',
                    background: 'var(--bg-elevated)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontSize: '0.8rem',
                    maxHeight: 220,
                    overflow: 'auto',
                  }}
                >
                  {snapPreview}
                </pre>
              </div>

              <div className="panel" style={{ marginTop: '1rem' }}>
                <div className="panel-header">
                  <h2 style={{ fontSize: '1rem' }}>WhatsApp customer notification (demo)</h2>
                </div>
                <div style={{ padding: '1rem 1.25rem' }} className="wa-demo-box">
                  <p style={{ margin: '0 0 0.5rem', color: 'var(--muted)', fontSize: '0.86rem' }}>
                    Demo-only UI: prepares a message with payment and delivery date details.
                  </p>
                  <div className="form-grid two">
                    <div>
                      <label>Notify customer phone</label>
                      <input id="wa-phone" type="text" placeholder="Customer phone" value={waPhone} onChange={(e) => setWaPhone(e.target.value)} />
                    </div>
                    <div>
                      <label>Expected delivery date</label>
                      <input id="wa-date" type="date" value={waDate} onChange={(e) => setWaDate(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <label style={{ margin: 0, textTransform: 'none', letterSpacing: 'normal', fontSize: '0.88rem' }}>
                      <input id="wa-inc-pay" type="checkbox" checked={waIncPay} onChange={(e) => setWaIncPay(e.target.checked)} /> Include payment summary
                    </label>
                    <label style={{ margin: 0, textTransform: 'none', letterSpacing: 'normal', fontSize: '0.88rem' }}>
                      <input id="wa-inc-date" type="checkbox" checked={waIncDate} onChange={(e) => setWaIncDate(e.target.checked)} /> Include expected delivery date
                    </label>
                  </div>
                  <button
                    type="button"
                    className="btn btn-teal btn-sm"
                    id="wa-preview-btn"
                    style={{ marginTop: '0.75rem' }}
                    onClick={() => {
                      const msg = waMessageText()
                      setWaPreview(msg)
                    }}
                  >
                    Generate demo message
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    id="wa-send-btn"
                    style={{ marginTop: '0.75rem' }}
                    onClick={() => {
                      const p = (waPhone || '').trim()
                      if (!p) {
                        toast.error('Enter customer phone to preview WhatsApp message.')
                        return
                      }
                      const msg = waMessageText()
                      setWaPreview(msg)
                      toast.success('WhatsApp demo message generated')
                    }}
                  >
                    Simulate WhatsApp send
                  </button>
                  <div id="wa-preview" className="wa-preview" style={{ display: waPreview ? 'block' : 'none' }}>
                    {waPreview}
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={isCompleted}>
                {!oid ? 'Create order' : isCompleted ? 'Order completed' : 'Update order'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Payment modal */}
      <div
        id="pay-modal"
        className="no-print"
        style={{
          display: payModalOpen ? 'flex' : 'none',
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setPayModalOpen(false)
        }}
      >
        <div className="panel pay-modal-shell" style={{ margin: 0, position: 'relative' }}>
          <div className="pay-modal-body">
            <button type="button" id="pay-modal-close" className="btn btn-ghost btn-sm" style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }} aria-label="Close" onClick={() => setPayModalOpen(false)}>
              ✕
            </button>

            {payStep === 'choice' ? (
              <div id="pay-step-choice">
                <h3 style={{ marginTop: 0 }}>Receive payment</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>How is the customer paying the balance?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    id="pay-opt-cash"
                    onClick={() => {
                      setPayCashAmt(totals.bal > 0 ? totals.bal.toFixed(2) : '')
                      setPayStep('cash')
                    }}
                  >
                    Cash
                  </button>
                  <button type="button" className="btn btn-teal" id="pay-opt-online" onClick={() => setPayStep('online')}>
                    Online (UPI / PhonePe)
                  </button>
                </div>
              </div>
            ) : null}

            {payStep === 'cash' ? (
              <div id="pay-step-cash">
                <h3 style={{ marginTop: 0 }}>Cash received</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  Balance due: <strong id="pay-bal-due">₹ {totals.bal.toFixed(2)}</strong>
                </p>
                <label>Amount received (₹)</label>
                <input id="pay-cash-amt" type="number" step="0.01" min={0} value={payCashAmt} onChange={(e) => setPayCashAmt(e.target.value)} />
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    id="pay-cash-submit"
                    onClick={async () => {
                      if (!oid) return
                      const amt = parseFloat(payCashAmt)
                      if (!amt || amt <= 0) {
                        toast.error('Enter the cash amount received.')
                        return
                      }
                      try {
                        const data = await appService.orders.payCash(oid, amt)
                        setExistingOrder(data)
                        setAdvance(String((data as any).advanceAmount))
                        setPayModalOpen(false)
                        await loadPaymentInfo()
                        toast.success('Cash payment recorded')
                      } catch (e: any) {
                        const msg = e?.payload?.error || e?.payload?.message || e?.message
                        toast.error(msg ? String(msg) : 'Could not record cash payment. Please try again.')
                      }
                    }}
                  >
                    Record cash
                  </button>
                  <button type="button" className="btn btn-ghost" id="pay-cash-back" onClick={() => setPayStep('choice')}>
                    Back
                  </button>
                </div>
              </div>
            ) : null}

            {payStep === 'online' ? (
              <div id="pay-step-online">
                <h3 style={{ marginTop: 0 }}>Online payment</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                  You will be redirected to PhonePe to pay with UPI or card. When you return, we confirm the payment automatically.
                </p>
                <p id="pay-online-off" style={{ display: paymentInfo?.phonePeConfigured ? 'none' : 'block', color: '#b44', fontSize: '0.9rem' }}>
                  PhonePe is not configured. Set phonepe.enabled and credentials in application.properties, then restart the app.
                </p>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    id="pay-online-go"
                    disabled={!paymentInfo?.phonePeConfigured}
                    onClick={async () => {
                      if (!oid || !paymentInfo?.phonePeConfigured) return
                      try {
                        const data = await appService.orders.phonePeInitiate(oid)
                        if ((data as any).redirectUrl) window.location.href = (data as any).redirectUrl
                        else toast.error(String((data as any).error || 'Could not start PhonePe checkout. Please try again.'))
                      } catch (e: any) {
                        const msg = e?.payload?.error || e?.payload?.message || e?.message
                        toast.error(msg ? String(msg) : 'Could not start PhonePe checkout. Please try again.')
                      }
                    }}
                  >
                    Pay now
                  </button>
                  <button type="button" className="btn btn-ghost" id="pay-online-back" onClick={() => setPayStep('choice')}>
                    Back
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Print previews (hidden area used for print) */}
      <div className="receipt-previews">
        <div ref={receiptPayRef} id="receipt-print" className="receipt-sheet" aria-label="Payment receipt" />
        <div ref={orderSlipRef} id="order-slip-print" className="receipt-sheet" aria-label="Work order" />
      </div>
    </>
  )
})

