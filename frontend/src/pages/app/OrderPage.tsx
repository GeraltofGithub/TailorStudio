import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { appService } from '../../services/appService'
import { useAuth } from '../../context/AuthContext'
import { orderSlipHtml, paymentReceiptHtml, printElement } from '../../utils/receipt'
import { useAppToast } from '../../utils/toast'

type Garment = 'SHIRT' | 'PANT' | 'BLOUSE' | 'SUIT' | 'KURTA' | 'SHERWANI' | 'INDO_WESTERN' | 'NEHRU_JACKET' | 'WAISTCOAT' | 'JODHPURI'
type Status = 'PENDING' | 'IN_PROGRESS' | 'READY' | 'DELIVERED'

type MeasurementFieldDef = { key: string; label: string; group?: string | null; hint?: string | null }
type TemplatesMap = Record<string, MeasurementFieldDef[]>
type MeasurementPayload = { unit: 'INCH' | 'CM'; values: Record<string, string> }

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function inchToCm(inches: number) {
  return inches * 2.54
}

function exampleInchesForField(label: string) {
  const s = (label || '').toLowerCase()
  if (s.includes('collar') || s.includes('neck')) return 15.5
  if (s.includes('shoulder')) return 18
  if (s.includes('chest')) return 40
  if (s.includes('waist')) return 32
  if (s.includes('seat') || s.includes('hip')) return 40
  if (s.includes('length') && s.includes('sleeve')) return 25
  if (s.includes('sleeve')) return 25
  if (s.includes('shirt') && s.includes('length')) return 29
  if (s.includes('bicep') || s.includes('upper arm')) return 13
  if (s.includes('cuff') || s.includes('wrist')) return 7.5
  return null
}

function placeholderFor(unit: 'INCH' | 'CM', label: string) {
  const exIn = exampleInchesForField(label)
  const unitLabel = unit === 'INCH' ? 'in' : 'cm'
  if (exIn == null) return `Enter value (${unitLabel})`
  const ex = unit === 'INCH' ? exIn : round1(inchToCm(exIn))
  return `Enter value (e.g. ${ex} ${unitLabel})`
}

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

function groupFields(fields: MeasurementFieldDef[]) {
  const by: Record<string, MeasurementFieldDef[]> = {}
  ;(fields || []).forEach((f) => {
    const g = f.group || 'Measurements'
    if (!by[g]) by[g] = []
    by[g].push(f)
  })
  return by
}

function parsePayloadJson(dataJsonStr: string): MeasurementPayload {
  try {
    const o = JSON.parse(dataJsonStr || '{}') as any
    if (o.unit && o.values) return { unit: o.unit as 'INCH' | 'CM', values: (o.values || {}) as Record<string, string> }
    return { unit: 'INCH' as const, values: (o && typeof o === 'object' ? o : {}) as Record<string, string> }
  } catch {
    return { unit: 'INCH' as const, values: {} as Record<string, string> }
  }
}

function hasAnyValues(p: MeasurementPayload | null | undefined) {
  if (!p) return false
  const v = p.values || {}
  return Object.keys(v).some((k) => v[k] != null && String(v[k]).trim() !== '')
}

function isMeasurementPayload(x: any): x is MeasurementPayload {
  return !!x && typeof x === 'object' && typeof x.unit === 'string' && x.values && typeof x.values === 'object'
}

function isOptionalField(f: MeasurementFieldDef) {
  const g = (f.group || '').toLowerCase()
  const h = (f.hint || '').toLowerCase()
  const l = (f.label || '').toLowerCase()
  return g.includes('optional') || h.includes('optional') || l.includes('(optional)')
}

function missingRequiredFields(fields: MeasurementFieldDef[], payload: MeasurementPayload) {
  const vals = payload?.values || {}
  const missing: MeasurementFieldDef[] = []
  for (const f of fields || []) {
    if (isOptionalField(f)) continue
    const v = vals[f.key]
    if (v == null || String(v).trim() === '') missing.push(f)
  }
  return missing
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
  const [templates, setTemplates] = useState<TemplatesMap>({})
  const [measureDraft, setMeasureDraft] = useState<MeasurementPayload>({ unit: 'INCH', values: {} })
  const [measureEditorOpen, setMeasureEditorOpen] = useState(false)
  const [pendingProfileSave, setPendingProfileSave] = useState(false)

  const [paymentInfo, setPaymentInfo] = useState<any>({ phonePeConfigured: false })
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payStep, setPayStep] = useState<'choice' | 'cash' | 'online'>('choice')
  const [payCashAmt, setPayCashAmt] = useState<string>('')
  const [markPaidConfirmOpen, setMarkPaidConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pullingMeasurements, setPullingMeasurements] = useState(false)
  const [syncingPhonePe, setSyncingPhonePe] = useState(false)
  const [recordingCash, setRecordingCash] = useState(false)
  const [initiatingOnlinePay, setInitiatingOnlinePay] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)

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
        const snap = parseSnapFromOrder(o)
        setSnapCache(snap)
        if (isMeasurementPayload(snap)) {
          setSnapPreview(JSON.stringify(snap, null, 2))
        } else {
          setSnapPreview('')
        }
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
      const list = await appService.customers.listActive()
      if (!alive) return
      setCustomers(list || [])
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      let t: TemplatesMap = {}
      try {
        t = (await appService.customers.templates()) as TemplatesMap
      } catch {
        t = {}
      }
      if (!alive) return
      setTemplates(t || {})
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
  }, [existingOrder])

  const rankOfStatus = useCallback((s: Status) => {
    if (s === 'IN_PROGRESS') return 1
    if (s === 'READY') return 2
    if (s === 'DELIVERED') return 3
    return 0
  }, [])

  // Lock progression only based on the LAST SAVED status (existingOrder),
  // not the current unsaved dropdown choice.
  const persistedStatus: Status = useMemo(() => {
    const raw = (existingOrder?.status || 'PENDING') as Status
    return raw
  }, [existingOrder?.status])

  const persistedRank = useMemo(() => {
    if (!oid && !existingOrder) return 0
    return rankOfStatus(persistedStatus)
  }, [existingOrder, oid, persistedStatus, rankOfStatus])

  const isCompleted = !!(oid && persistedStatus === 'DELIVERED')

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
    // Only use persisted snapshot if it belongs to the currently selected garment.
    // Prevents showing SHIRT measurements when user selects PANT, etc.
    if (existingOrder && existingOrder.measurementSnapshotJson && String(existingOrder.garmentType || '') === String(garmentType || '')) {
      return existingOrder.measurementSnapshotJson
    }
    return ''
  }, [existingOrder, garmentType, snapCache])

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

  useEffect(() => {
    // Only clear staged measurements for NEW orders.
    // For existing orders, keep the saved snapshot visible (no need to copy again).
    if (oid || existingOrder) return
    setMeasureEditorOpen(false)
    setSnapPreview('')
    setSnapCache(null)
  }, [customerId, garmentType])

  const pullMeasurements = useCallback(async () => {
    if (!customerId) {
      toast.error('Select a customer first.')
      return
    }
    if (pullingMeasurements) return
    setPullingMeasurements(true)
    try {
      const m = await appService.customers.getMeasurement(Number(customerId), garmentType)
      const payload = parsePayloadJson(String(m?.dataJson || '{}'))
      if (!hasAnyValues(payload)) {
        setMeasureDraft(payload)
        setMeasureEditorOpen(true)
        setPendingProfileSave(true)
        toast.error(`No saved ${garmentType} measurements for this customer. Enter now.`)
        return
      }
      setMeasureDraft(payload)
      setSnapCache(payload)
      setSnapPreview(JSON.stringify(payload, null, 2))
      toast.success(`Copied ${garmentType} measurements`)
    } catch (e: any) {
      const msg = e?.payload?.message || e?.payload?.error || e?.message
      toast.error(msg ? String(msg) : 'Could not copy measurements. Please try again.')
    } finally {
      setPullingMeasurements(false)
    }
  }, [customerId, garmentType, pullingMeasurements, toast])

  const saveMeasurementsToProfile = useCallback(async () => {
    if (!customerId) {
      toast.error('Select a customer first.')
      return
    }
    const reqMissing = missingRequiredFields(templates[garmentType] || [], measureDraft)
    if (reqMissing.length) {
      toast.error(`Please fill required fields: ${reqMissing.slice(0, 4).map((x) => x.label).join(', ')}${reqMissing.length > 4 ? '…' : ''}`)
      return
    }
    // IMPORTANT: do not persist to DB until the order is successfully created/updated.
    setSnapCache(measureDraft)
    setSnapPreview(JSON.stringify(measureDraft, null, 2))
    setMeasureEditorOpen(false)
    setPendingProfileSave(true)
    toast.success(`${garmentType} measurements added to order`)
  }, [customerId, garmentType, measureDraft, templates, toast])

  const billDescTouchedRef = useRef(false)
  useEffect(() => {
    // keep default bill description aligned to selected garment, unless user edited it
    if (billDescTouchedRef.current) return
    setBillDesc(`${garmentType} — tailoring`)
  }, [garmentType])

  const onSubmitSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (savingRef.current) return
    if (isCompleted) {
      toast.error('Order completed. Delivered orders cannot be updated.')
      return
    }

    if (!customerId) {
      toast.error('Select a customer.')
      return
    }
    const totalNum = parseFloat(billTotal)
    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      toast.error('Enter total charge (must be greater than 0).')
      return
    }

    // Measurements are mandatory for creating/updating an order.
    // User must explicitly copy from customer profile OR save from the measurement modal.
    if (measureEditorOpen) {
      toast.error(`Save ${garmentType} measurements first, then create the order.`)
      return
    }
    const snap = snapCache
    if (!isMeasurementPayload(snap) || !hasAnyValues(snap)) {
      toast.error(`Copy or enter ${garmentType} measurements before saving the order.`)
      return
    }

    savingRef.current = true
    setSaving(true)

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
      const beforeStatus = existingOrder?.status as Status | undefined
      const data = oid ? await appService.orders.update(oid, body) : await appService.orders.create(body)
      if (!oid && (data as any).id) {
        // After order is saved successfully, persist measurement to customer profile (only if we entered via modal).
        if (pendingProfileSave && isMeasurementPayload(snap)) {
          await appService.customers
            .saveMeasurement(Number(customerId), garmentType, { unit: snap.unit, values: snap.values })
            .catch(() => null)
          setPendingProfileSave(false)
        }
        nav(`/app/order?id=${(data as any).id}`)
        toast.success('Order created')
        const st = (data as any)?.status as Status | undefined
        if (st === 'IN_PROGRESS') toast.success('Work status: In progress')
        if (st === 'READY') toast.success('Work status: Ready')
        if (st === 'DELIVERED') toast.success('Work status: Delivered')
        savingRef.current = false
        return
      }
      setExistingOrder(data)
      setSnapCache(parseSnapFromOrder(data))
      await loadPaymentInfo()
      toast.success('Order updated')
      const afterStatus = (data as any)?.status as Status | undefined
      if (afterStatus && afterStatus !== beforeStatus) {
        if (afterStatus === 'IN_PROGRESS') toast.success('Work status: In progress')
        if (afterStatus === 'READY') toast.success('Work status: Ready')
        if (afterStatus === 'DELIVERED') toast.success('Work status: Delivered')
      }
      // After order is saved successfully, persist measurement to customer profile (only if we entered via modal).
      if (pendingProfileSave && isMeasurementPayload(snap)) {
        await appService.customers
          .saveMeasurement(Number(customerId), garmentType, { unit: snap.unit, values: snap.values })
          .catch(() => null)
        setPendingProfileSave(false)
      }
    } catch (e: any) {
      const msg = e?.payload?.message || e?.payload?.error || e?.message
      toast.error(msg ? String(msg) : 'Could not save order. Please try again.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [
    advance,
    customerId,
    demNotes,
    deliveryDate,
    garmentType,
    billTotal,
    gatherLines,
    existingOrder?.status,
    isCompleted,
    loadPaymentInfo,
    matNotes,
    measureEditorOpen,
    pendingProfileSave,
    templates,
    nav,
    notes,
    oid,
    orderDate,
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
                    disabled={isCompleted}
                    onChange={(e) => {
                      setCustomerId(e.target.value)
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
                  <select
                    id="gar"
                    value={garmentType}
                    disabled={isCompleted || !!oid || !!existingOrder}
                    onChange={(e) => setGarmentType(e.target.value as Garment)}
                  >
                    {(['SHIRT', 'PANT', 'BLOUSE', 'SUIT', 'KURTA', 'SHERWANI', 'INDO_WESTERN', 'NEHRU_JACKET', 'WAISTCOAT', 'JODHPURI'] as Garment[]).map((g) => (
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
                  <input
                    id="od"
                    type="date"
                    required
                    value={orderDate}
                    disabled={isCompleted}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
                <div>
                  <label>Ready / delivery by</label>
                  <input
                    id="dd"
                    type="date"
                    required
                    value={deliveryDate}
                    disabled={isCompleted}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                    onChange={(e) => {
                      setDeliveryDate(e.target.value)
                    }}
                  />
                </div>
              </div>

              <div className="form-grid two">
                <div>
                  <label>
                    Work status<span className="req-star">*</span>
                  </label>
                  <select
                    id="st"
                    required
                    value={status}
                    disabled={isCompleted}
                    onChange={(e) => {
                      const next = e.target.value as Status
                      setStatus(next)
                    }}
                  >
                    {(['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED'] as Status[]).map((s) => {
                      const r = rankOfStatus(s)
                      const disabled = r < persistedRank
                      return (
                        <option key={s} value={s} disabled={disabled}>
                          {s.replace(/_/g, ' ')}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div>
                  <label>
                    Advance taken (₹)<span className="req-star">*</span>
                  </label>
                  <input
                    id="adv"
                    type="number"
                    step="0.01"
                    min={0}
                    value={advance}
                    placeholder="0"
                    disabled={isCompleted}
                    onChange={(e) => setAdvance(e.target.value)}
                  />
                </div>
              </div>

              <div className="panel" style={{ marginTop: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="panel-header">
                  <h2 style={{ fontSize: '1rem' }}>Bill</h2>
                </div>
                <div style={{ padding: '1rem 1.25rem' }}>
                  <div className="form-grid two">
                    <div>
                      <label>
                        Total charge for this job (₹)<span className="req-star">*</span>
                      </label>
                      <input
                        id="bill-total"
                        type="number"
                        step="0.01"
                        min={0}
                        value={billTotal}
                        placeholder="e.g. 1500"
                        disabled={isCompleted}
                        onChange={(e) => setBillTotal(e.target.value)}
                      />
                    </div>
                    <div>
                      <label>What it&apos;s for (on bill)</label>
                      <input
                        id="bill-desc"
                        type="text"
                        value={billDesc}
                        placeholder="e.g. Shirt — full stitching"
                        disabled={isCompleted}
                        onChange={(e) => {
                          billDescTouchedRef.current = true
                          setBillDesc(e.target.value)
                        }}
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
                        <input
                          id="extra-desc"
                          type="text"
                          value={extraDesc}
                          placeholder="Optional"
                          disabled={isCompleted}
                          onChange={(e) => setExtraDesc(e.target.value)}
                        />
                      </div>
                      <div>
                        <label>Extra amount (₹)</label>
                        <input
                          id="extra-amt"
                          type="number"
                          step="0.01"
                          min={0}
                          value={extraAmt}
                          disabled={isCompleted}
                          onChange={(e) => setExtraAmt(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    id="toggle-extra"
                    style={{ marginTop: '0.75rem' }}
                    disabled={isCompleted}
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
                              setMarkPaidConfirmOpen(true)
                            }}
                          >
                            Mark fully paid
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            id="btn-sync-phonepe"
                            style={{ display: showSync ? 'inline-block' : 'none' }}
                            disabled={syncingPhonePe}
                            onClick={async () => {
                              if (!oid) return
                              if (syncingPhonePe) return
                              setSyncingPhonePe(true)
                              try {
                                const data = await appService.orders.phonePeSync(oid)
                                setExistingOrder(data)
                                setAdvance(String((data as any).advanceAmount))
                                await loadPaymentInfo()
                                toast.success('Payment status synced')
                              } catch (e: any) {
                                const msg = e?.payload?.error || e?.payload?.message || e?.message
                                toast.error(msg ? String(msg) : 'Could not sync online payment. Please try again.')
                              } finally {
                                setSyncingPhonePe(false)
                              }
                            }}
                          >
                            {syncingPhonePe ? 'Syncing…' : 'Sync online payment'}
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
                    <textarea
                      id="mat_notes"
                      rows={2}
                      placeholder="Fabric, colour, lining, buttons, supplies…"
                      value={matNotes}
                      disabled={isCompleted}
                      onChange={(e) => setMatNotes(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Customer requests & demands</label>
                    <textarea
                      id="dem_notes"
                      rows={2}
                      placeholder="Fitting preferences, deadlines, special instructions…"
                      value={demNotes}
                      disabled={isCompleted}
                      onChange={(e) => setDemNotes(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Workshop notes</label>
                    <textarea
                      id="notes"
                      rows={2}
                      placeholder="Internal reminders, fitting notes…"
                      value={notes}
                      disabled={isCompleted}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="panel" style={{ marginTop: '1rem' }}>
                <div className="panel-header">
                  <h2 style={{ fontSize: '1rem' }}>
                    Measurements on this order<span className="req-star">*</span>
                  </h2>
                  <button
                    type="button"
                    className="btn btn-teal btn-sm"
                    id="pullM"
                    disabled={isCompleted || pullingMeasurements}
                    onClick={() => void pullMeasurements()}
                  >
                    {pullingMeasurements ? 'Copying…' : 'Copy from customer profile'}
                  </button>
                </div>
                <div style={{ padding: '1rem 1.25rem', color: 'var(--muted)', fontSize: '0.88rem' }}>
                  Uses saved sizes for the customer and <strong>{garmentType}</strong>. This is required to create the order.
                </div>
                {/* measurement entry happens in a modal */}
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

              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: '1rem', opacity: isCompleted || saving ? 0.75 : 1 }}
                disabled={isCompleted || saving}
              >
                {!oid ? (saving ? 'Creating…' : 'Create order') : isCompleted ? 'Order completed' : saving ? 'Updating…' : 'Update order'}
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
                    disabled={recordingCash}
                    onClick={async () => {
                      if (!oid) return
                      if (recordingCash) return
                      const amt = parseFloat(payCashAmt)
                      if (!amt || amt <= 0) {
                        toast.error('Enter the cash amount received.')
                        return
                      }
                      setRecordingCash(true)
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
                      } finally {
                        setRecordingCash(false)
                      }
                    }}
                  >
                    {recordingCash ? 'Recording…' : 'Record cash'}
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
                    disabled={!paymentInfo?.phonePeConfigured || initiatingOnlinePay}
                    onClick={async () => {
                      if (!oid || !paymentInfo?.phonePeConfigured) return
                      if (initiatingOnlinePay) return
                      setInitiatingOnlinePay(true)
                      try {
                        const data = await appService.orders.phonePeInitiate(oid)
                        if ((data as any).redirectUrl) window.location.href = (data as any).redirectUrl
                        else toast.error(String((data as any).error || 'Could not start PhonePe checkout. Please try again.'))
                      } catch (e: any) {
                        const msg = e?.payload?.error || e?.payload?.message || e?.message
                        toast.error(msg ? String(msg) : 'Could not start PhonePe checkout. Please try again.')
                      } finally {
                        setInitiatingOnlinePay(false)
                      }
                    }}
                  >
                    {initiatingOnlinePay ? 'Opening…' : 'Pay now'}
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

      {/* Mark fully paid confirm modal */}
      <div
        id="mark-paid-modal"
        className="no-print"
        style={{
          display: markPaidConfirmOpen ? 'flex' : 'none',
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMarkPaidConfirmOpen(false)
        }}
      >
        <div className="panel pay-modal-shell" style={{ margin: 0, position: 'relative', width: 'min(560px, 100%)' }}>
          <div className="pay-modal-body">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}
              aria-label="Close"
              onClick={() => setMarkPaidConfirmOpen(false)}
            >
              ✕
            </button>
            <h3 style={{ marginTop: 0 }}>Mark fully paid?</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>
              This will set <strong>Advance received</strong> equal to <strong>Job total</strong>.
            </p>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={markingPaid}
                onClick={async () => {
                  if (!oid) return
                  if (markingPaid) return
                  setMarkingPaid(true)
                  try {
                    const data = await appService.orders.markPaid(oid)
                    setExistingOrder(data)
                    setAdvance(String((data as any).advanceAmount))
                    setMarkPaidConfirmOpen(false)
                    await loadPaymentInfo()
                    toast.success('Order marked as fully paid')
                  } catch (e: any) {
                    const msg = e?.payload?.error || e?.payload?.message || e?.message
                    toast.error(msg ? String(msg) : 'Failed to mark order as paid. Please try again.')
                  } finally {
                    setMarkingPaid(false)
                  }
                }}
              >
                {markingPaid ? 'Saving…' : 'Confirm'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setMarkPaidConfirmOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Measurements modal (shown only when customer has no saved measurements for selected garment) */}
      <div
        id="measure-modal"
        className="no-print"
        style={{
          display: measureEditorOpen ? 'flex' : 'none',
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMeasureEditorOpen(false)
        }}
      >
        <div className="panel pay-modal-shell" style={{ margin: 0, position: 'relative', width: 'min(920px, 100%)' }}>
          <div className="pay-modal-body" style={{ maxHeight: '82vh', overflow: 'auto' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}
              aria-label="Close"
              onClick={() => setMeasureEditorOpen(false)}
            >
              ✕
            </button>

            <h3 style={{ marginTop: 0 }}>Enter {garmentType} measurements</h3>
            <p style={{ margin: '0 0 0.75rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
              This customer doesn&apos;t have saved <strong>{garmentType}</strong> measurements yet. Save once to reuse next time.
            </p>

            <div className="ts-app-form">
              <div className="unit-toggle" style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--muted)' }}>Unit</span>
                <label>
                  <input
                    type="radio"
                    name="ord-unit"
                    value="INCH"
                    checked={measureDraft.unit === 'INCH'}
                    onChange={() => setMeasureDraft((p) => ({ ...p, unit: 'INCH' }))}
                  />{' '}
                  in
                </label>
                <label>
                  <input
                    type="radio"
                    name="ord-unit"
                    value="CM"
                    checked={measureDraft.unit === 'CM'}
                    onChange={() => setMeasureDraft((p) => ({ ...p, unit: 'CM' }))}
                  />{' '}
                  cm
                </label>
              </div>

              {(Object.entries(groupFields(templates[garmentType] || [])) || []).map(([gn, fs]) => (
                <div key={gn}>
                  <div className="measurement-group-title">{gn}</div>
                  <div className="form-grid two">
                    {fs.map((f) => {
                      const v = measureDraft.values[f.key] != null ? String(measureDraft.values[f.key]) : ''
                      return (
                        <div key={f.key}>
                          <label>
                            {f.label}
                            <span className="req-star">*</span>
                          </label>
                          {f.hint ? <p className="field-hint">{f.hint}</p> : null}
                          <input
                            type="text"
                            value={v}
                            placeholder={placeholderFor(measureDraft.unit, f.label)}
                            onChange={(e) =>
                              setMeasureDraft((p) => ({ ...p, values: { ...p.values, [f.key]: e.target.value } }))
                            }
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                <button type="button" className="btn btn-primary" onClick={() => void saveMeasurementsToProfile()}>
                  {`Save ${garmentType} to customer`}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setMeasureEditorOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
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

