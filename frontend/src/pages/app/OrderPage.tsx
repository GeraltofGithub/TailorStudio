import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { appService } from '../../services/appService'
import { onOrdersChanged, publishOrdersChanged } from '../../services/businessRealtime'
import { ordersApi } from '../../services/api/ordersApi/ordersApi'
import { useAuth } from '../../context/AuthContext'
import { orderSlipHtml, paymentReceiptHtml, printElement } from '../../utils/receipt'
import { formatMoneyForInput, parseMoneyAmount, sanitizeMoneyInput } from '../../utils/moneyInput'
import { idFromApi } from '../../utils/apiId'
import { useAppToast } from '../../utils/toast'
import {
  User,
  Scissors,
  Ruler,
  Banknote,
  ClipboardList,
  X,
  ArrowLeft,
  Check,
  Smartphone,
  Printer,
  Plus,
  Save,
  RotateCcw
} from 'lucide-react'

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
    ; (fields || []).forEach((f) => {
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
  const oid = sp.get('id') || null
  const toast = useAppToast()

  const [existingOrder, setExistingOrder] = useState<any | null>(null)
  const [orderMissing, setOrderMissing] = useState(false)

  const [customers, setCustomers] = useState<any[]>([])

  const [customerId, setCustomerId] = useState<string>('')
  const selectedCustomer = useMemo(() => customers.find(c => String(c.id) === String(customerId)), [customers, customerId])
  const [garmentType, setGarmentType] = useState<Garment | ''>('')
  const [orderDate, setOrderDate] = useState<string>(todayISODate())
  const [deliveryDate, setDeliveryDate] = useState<string>(plusDays(7))
  const [status, setStatus] = useState<Status | ''>('')
  const [advance, setAdvance] = useState<string>('')

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
  const [saving, setSaving] = useState(false)
  const [pullingMeasurements, setPullingMeasurements] = useState(false)
  const [syncingPhonePe, setSyncingPhonePe] = useState(false)
  const [recordingCash, setRecordingCash] = useState(false)
  const [initiatingOnlinePay, setInitiatingOnlinePay] = useState(false)
  const [updateModalOpen, setUpdateModalOpen] = useState(false)

  // NEW CUSTOMER STATE
  const [isNewCustomer, setIsNewCustomer] = useState(true)
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustAddress, setNewCustAddress] = useState('')
  const [newCustUnit, setNewCustUnit] = useState<'INCH' | 'CM'>('INCH')

  const receiptPayRef = useRef<HTMLDivElement | null>(null)
  const orderSlipRef = useRef<HTMLDivElement | null>(null)
  const savingRef = useRef(false)
  const moneyFieldFocusRef = useRef(false)

  const studio = useMemo(() => {
    if (state.status !== 'authed') return { name: 'Tailor Studio', tagline: '', phone: '', address: '' }
    const me: any = state.me as any
    return { name: me.businessName || 'Tailor Studio', tagline: me.tagline || '', phone: me.phone || '', address: me.address || '' }
  }, [state])

  const applyOrderResponse = useCallback((o: any) => {
    if (!o) return
    setExistingOrder(o)
    setOrderMissing(false)
    const snap = parseSnapFromOrder(o)
    setSnapCache(snap)
    if (isMeasurementPayload(snap)) {
      setSnapPreview(JSON.stringify(snap, null, 2))
    } else {
      setSnapPreview('')
    }
  }, [])

  const loadPaymentInfo = useCallback(async (orderId?: string | null) => {
    const id = orderId ?? oid
    if (!id) return
    try {
      setPaymentInfo(await appService.orders.paymentInfo(id))
    } catch {
      // ignore
    }
  }, [oid])

  const reloadOrder = useCallback(
    async (orderId?: string | null) => {
      const id = orderId ?? oid
      if (!id) return
      ordersApi.invalidateOrderCache(id)
      try {
        const o = await appService.orders.get(id)
        applyOrderResponse(o)
        await loadPaymentInfo(id)
      } catch {
        setOrderMissing(true)
      }
    },
    [applyOrderResponse, loadPaymentInfo, oid],
  )

  useEffect(() => {
    if (!oid) {
      setExistingOrder(null)
      setOrderMissing(false)
      return
    }
    let alive = true
      ; (async () => {
        try {
          const o = await appService.orders.get(oid)
          if (!alive) return
          applyOrderResponse(o)
          await loadPaymentInfo(oid)
        } catch {
          if (!alive) return
          setOrderMissing(true)
        }
      })()
    return () => {
      alive = false
    }
  }, [oid, applyOrderResponse, loadPaymentInfo])

  useEffect(() => {
    return onOrdersChanged((detail) => {
      if (!oid || !detail.orderId || String(detail.orderId) !== oid) return
      void reloadOrder(oid)
    })
  }, [oid, reloadOrder])

  useEffect(() => {
    let alive = true
      ; (async () => {
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
      ; (async () => {
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
    if (moneyFieldFocusRef.current) return
    setCustomerId(existing?.customer?.id != null ? String(existing.customer.id) : '')
    setIsNewCustomer(false)
    setGarmentType(existing.garmentType || 'SHIRT')
    setOrderDate(isoDate(existing.orderDate))
    setDeliveryDate(isoDate(existing.deliveryDate))
    setStatus(existing.status || 'PENDING')
    setAdvance((existing.advanceAmount ?? 0) > 0 ? formatMoneyForInput(existing.advanceAmount) : '')
    setNotes(existing.notes || '')
    setMatNotes(existing.materialsNotes || '')
    setDemNotes(existing.demandsNotes || '')

    const lines = existing.lines && existing.lines.length ? existing.lines : []
    const totalEst = lines.reduce((s: number, ln: any) => s + (Number(ln.amount) || 0), 0)
    setBillTotal(totalEst > 0 ? formatMoneyForInput(totalEst) : '')
    let d = lines[0] && lines[0].description ? lines[0].description : ''
    if (lines.length > 2) d = d ? `${d} (+ more lines)` : 'Combined charges'
    setBillDesc(d)

    const extraLine = lines.length > 1 ? lines[1] : null
    if (extraLine) {
      setExtraEnabled(true)
      setExtraDesc(extraLine.description || '')
      const ea = Number(extraLine.amount) || 0
      setExtraAmt(ea > 0 ? formatMoneyForInput(ea) : '')
    }
  }, [existingOrder])

  useEffect(() => {
    if (!isNewCustomer && customerId && customers.length > 0) {
      const found = customers.find(c => String(c.id) === String(customerId))
      if (found) {
        setNewCustName(found.name || '')
        setNewCustPhone(found.phone || '')
        setNewCustAddress(found.address || '')
      }
    }
  }, [customerId, customers, isNewCustomer])

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
    const main = parseMoneyAmount(billTotal)
    const desc = billDesc.trim() || `${g} — tailoring`
    const out: any[] = [{ description: desc, rate: main, amount: main }]
    if (extraEnabled) {
      const ed = extraDesc.trim()
      const ea = parseMoneyAmount(extraAmt)
      if (ed && ea > 0) out.push({ description: ed, rate: ea, amount: ea })
    }
    return out
  }, [billDesc, billTotal, extraAmt, extraDesc, extraEnabled, garmentType])

  const totals = useMemo(() => {
    const lines = gatherLines()
    const sum = lines.reduce((s: number, ln: any) => s + (Number(ln.amount) || 0), 0)
    const adv = parseMoneyAmount(advance)
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
    const snLabel = existingOrder?.serialNumber ? `OD_${String(existingOrder.serialNumber).padStart(3, '0')}` : 'Draft'
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

  useEffect(() => {
    void loadPaymentInfo()
  }, [loadPaymentInfo])

  useEffect(() => {
    // Only clear staged measurements for NEW orders.
    // For existing orders, keep the saved snapshot visible (no need to copy again).
    if (oid || existingOrder) return
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
      const m = await appService.customers.getMeasurement(customerId, garmentType)
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
    if (!customerId && !isNewCustomer) {
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
  }, [customerId, isNewCustomer, garmentType, measureDraft, templates, toast])

  const billDescTouchedRef = useRef(false)
  useEffect(() => {
    // keep default bill description aligned to selected garment, unless user edited it
    if (billDescTouchedRef.current) return
    setBillDesc(`${garmentType} — tailoring`)
  }, [garmentType])

  const onSubmitSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (savingRef.current) return
      if (isCompleted) {
        toast.error('Order completed. Delivered orders cannot be updated.')
        return
      }

      let finalCustomerId = customerId

      if (isNewCustomer) {
        if (!newCustName.trim() || !newCustPhone.trim()) {
          toast.error('Please enter name and phone for the new customer.')
          return
        }
        setSaving(true)
        savingRef.current = true
        try {
          const created = await appService.customers.create({
            name: newCustName.trim(),
            phone: newCustPhone.trim(),
            address: newCustAddress.trim(),
            preferredUnit: newCustUnit,
          })
          const newId = idFromApi(created)
          if (!newId) throw new Error('Failed to get new customer ID')
          finalCustomerId = newId
          setCustomerId(newId)
          // Refresh customer list
          const list = await appService.customers.listActive()
          setCustomers(list || [])
        } catch (err: any) {
          const msg = err?.payload?.message || err?.payload?.error || err?.message
          toast.error(msg ? `Customer creation failed: ${msg}` : 'Could not create customer.')
          setSaving(false)
          savingRef.current = false
          return
        }
      } else if (customerId) {
        if (!newCustName.trim() || !newCustPhone.trim()) {
          toast.error('Customer name and phone are mandatory fields.')
          return
        }
        setSaving(true)
        savingRef.current = true
        try {
          const prefUnit = selectedCustomer?.preferredUnit || 'INCH'
          await appService.customers.update(customerId, {
            name: newCustName.trim(),
            phone: newCustPhone.trim(),
            address: newCustAddress.trim(),
            preferredUnit: prefUnit,
          })
          // Refresh customer list
          const list = await appService.customers.listActive()
          setCustomers(list || [])
        } catch (err: any) {
          const msg = err?.payload?.message || err?.payload?.error || err?.message
          toast.error(msg ? `Customer update failed: ${msg}` : 'Could not update customer details.')
          setSaving(false)
          savingRef.current = false
          return
        }
      }

      if (!finalCustomerId) {
        toast.error('Select or create a customer.')
        return
      }
      const totalNum = parseMoneyAmount(billTotal)
      if (!Number.isFinite(totalNum) || totalNum <= 0) {
        toast.error('Enter total charge (must be greater than 0).')
        return
      }

      // Measurements are mandatory for creating/updating an order.
      const snap = snapCache
      if (!isMeasurementPayload(snap) || !hasAnyValues(snap)) {
        toast.error(`Please enter ${garmentType} measurements before saving the order.`)
        setMeasureEditorOpen(true)
        setSaving(false)
        savingRef.current = false
        return
      }

      setSaving(true)
      savingRef.current = true

      const body = {
        customerId: finalCustomerId,
        garmentType,
        measurementSnapshot: snap,
        orderDate,
        deliveryDate,
        status,
        advanceAmount: parseMoneyAmount(advance),
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
              .saveMeasurement(finalCustomerId, garmentType, { unit: snap.unit, values: snap.values })
              .catch(() => null)
            setPendingProfileSave(false)
          }
          const newId = String((data as any).id)
          ordersApi.invalidateOrderCache(newId)
          applyOrderResponse(data)
          nav(`/app/order?id=${newId}`, { replace: true })
          loadPaymentInfo(newId)
          publishOrdersChanged({ orderId: newId, action: 'created' })
          toast.success('Order created')
          const st = (data as any)?.status as Status | undefined
          if (st === 'IN_PROGRESS') toast.success('Work status: In progress')
          if (st === 'READY') toast.success('Work status: Ready')
          if (st === 'DELIVERED') toast.success('Work status: Delivered')
          savingRef.current = false
          return
        }
        applyOrderResponse(data)
        loadPaymentInfo(oid)
        publishOrdersChanged({ orderId: oid, action: 'updated' })
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
            .saveMeasurement(finalCustomerId, garmentType, { unit: snap.unit, values: snap.values })
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
    },
    [
      advance,
      customerId,
      demNotes,
      deliveryDate,
      garmentType,
      billTotal,
      gatherLines,
      applyOrderResponse,
      existingOrder?.status,
      isCompleted,
      loadPaymentInfo,
      matNotes,
      pendingProfileSave,
      nav,
      notes,
      oid,
      orderDate,
      snapCache,
      status,
      toast,
      isNewCustomer,
      newCustName,
      newCustPhone,
      newCustAddress,
      newCustUnit,
    ],
  )

  if (orderMissing) return <p>Order not found.</p>

  const canPayActions = !!oid && (totals.bal > 0.005 || (paymentInfo?.balanceDue != null && Number(paymentInfo.balanceDue) > 0.005))
  const showSync = !!oid && !!paymentInfo?.phonePeConfigured && canPayActions

  return (
    <>
      <div className="no-print" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link className="btn btn-ghost btn-sm" to="/app/orders">
          <ArrowLeft size={16} /> Back to Orders
        </Link>
        {oid && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                renderReceipts()
                printElement(receiptPayRef.current, 'Payment receipt')
              }}
            >
              <Printer size={16} /> Print Receipt
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                renderReceipts()
                printElement(orderSlipRef.current, 'Work order')
              }}
            >
              <Printer size={16} /> Print Work Order
            </button>
          </div>
        )}
      </div>

      <div className="no-print">
        <form id="of" className="order-form-premium" onSubmit={onSubmitSave}>
          <div className="order-grid">
            {/* LEFT COLUMN: Main Details */}
            <div className="order-main-col">
              {/* ROW 1: CUSTOMER + BILLING */}
              <div className="top-row-grid">
                {/* SECTION 1: CUSTOMER */}
                <div className="premium-card">
                  <div className="card-header">
                    <div className="header-icon"><User size={20} /></div>
                    <div>
                      <h3>Customer Details</h3>
                      <p>Selection or creation.</p>
                    </div>
                  </div>
                  <div className="card-body">
                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${isNewCustomer ? 'btn-teal' : 'btn-ghost'}`}
                        onClick={() => setIsNewCustomer(true)}
                        style={{ flex: 1 }}
                      >
                        New
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${!isNewCustomer ? 'btn-teal' : 'btn-ghost'}`}
                        onClick={() => setIsNewCustomer(false)}
                        style={{ flex: 1 }}
                      >
                        Existing
                      </button>
                    </div>

                    {!isNewCustomer ? (
                      <div className="form-grid">
                        <div>
                          <label>Select Customer</label>
                          <select
                            id="cust"
                            required={!isNewCustomer}
                            value={customerId}
                            disabled={isCompleted || !!oid}
                            onChange={(e) => setCustomerId(e.target.value)}
                          >
                            <option value="">Choose from list…</option>
                            {(customers || []).map((c: any) => (
                              <option key={c.id} value={c.id}>
                                {c.name} — {c.phone}
                              </option>
                            ))}
                          </select>
                        </div>
                        {selectedCustomer && (
                          <div className="form-grid" style={{ marginTop: '0.5rem' }}>
                            <div className="form-grid two">
                              <div>
                                <label>Name <span className="req-star" style={{ color: 'var(--danger)' }}>*</span></label>
                                <input
                                  type="text"
                                  value={newCustName}
                                  onChange={(e) => setNewCustName(e.target.value)}
                                  placeholder="e.g. John Doe"
                                  required
                                />
                              </div>
                              <div>
                                <label>Phone <span className="req-star" style={{ color: 'var(--danger)' }}>*</span></label>
                                <input
                                  type="tel"
                                  value={newCustPhone}
                                  onChange={(e) => setNewCustPhone(e.target.value)}
                                  placeholder="e.g. 9876543210"
                                  required
                                />
                              </div>
                            </div>
                            <div>
                              <label>Address (Optional)</label>
                              <textarea
                                rows={1}
                                value={newCustAddress}
                                onChange={(e) => setNewCustAddress(e.target.value)}
                                placeholder="Address details…"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="form-grid">
                        <div className="form-grid two">
                          <div>
                            <label>Name {isNewCustomer && <span className="req-star" style={{ color: 'var(--danger)' }}>*</span>}</label>
                            <input
                              type="text"
                              placeholder="e.g. John Doe"
                              value={newCustName}
                              onChange={(e) => setNewCustName(e.target.value)}
                              required={isNewCustomer}
                            />
                          </div>
                          <div>
                            <label>Phone {isNewCustomer && <span className="req-star" style={{ color: 'var(--danger)' }}>*</span>}</label>
                            <input
                              type="tel"
                              placeholder="e.g. 9876543210"
                              value={newCustPhone}
                              onChange={(e) => setNewCustPhone(e.target.value)}
                              required={isNewCustomer}
                            />
                          </div>
                        </div>
                        <div>
                          <label>Address (Optional)</label>
                          <textarea
                            placeholder="Address details…"
                            rows={1}
                            value={newCustAddress}
                            onChange={(e) => setNewCustAddress(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* TOP RIGHT: PAYMENT BOX */}
                <div className="premium-card bill-card">
                  <div className="card-header">
                    <div className="header-icon"><Banknote size={20} /></div>
                    <h3>Payment Box</h3>
                  </div>
                  <div className="card-body">
                    <div className="form-grid">
                      <div className="form-grid two">
                        <div>
                          <label>Total (₹) <span className="req-star">*</span></label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={billTotal}
                            placeholder="Enter amount"
                            disabled={isCompleted}
                            onFocus={() => (moneyFieldFocusRef.current = true)}
                            onBlur={() => (moneyFieldFocusRef.current = false)}
                            onChange={(e) => setBillTotal(sanitizeMoneyInput(e.target.value))}
                            style={{ fontWeight: 700, color: 'var(--teal)' }}
                          />
                        </div>
                        <div>
                          <label>Advance (₹) <span className="req-star">*</span></label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={advance}
                            placeholder="Advance paid"
                            disabled={isCompleted}
                            onFocus={() => (moneyFieldFocusRef.current = true)}
                            onBlur={() => (moneyFieldFocusRef.current = false)}
                            onChange={(e) => setAdvance(sanitizeMoneyInput(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bill-summary" style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '10px' }}>
                      <div className="summary-row" style={{ border: 'none', margin: 0 }}>
                        <span style={{ fontSize: '0.8rem' }}>Total:</span>
                        <strong>₹ {totals.sum.toFixed(2)}</strong>
                      </div>
                      <div className="summary-row" style={{ border: 'none', margin: 0 }}>
                        <span style={{ fontSize: '0.8rem' }}>Paid:</span>
                        <strong className="text-success">₹ {totals.adv.toFixed(2)}</strong>
                      </div>
                      <div className="summary-row balance-row" style={{ border: 'none', margin: 0, marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
                        <span style={{ fontSize: '0.8rem' }}>Balance:</span>
                        <strong className={totals.bal > 0 ? 'text-danger' : 'text-success'} style={{ fontSize: '1.35rem' }}>₹ {totals.bal.toFixed(2)}</strong>
                      </div>
                    </div>

                    {oid ? (
                      totals.bal > 0.005 ? (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '0.85rem 0.5rem', fontSize: '0.95rem', whiteSpace: 'nowrap' }}
                            disabled={
                              saving || 
                              !garmentType || 
                              !status || 
                              !(isMeasurementPayload(snapCache) && hasAnyValues(snapCache)) ||
                              !orderDate ||
                              !deliveryDate ||
                              String(billTotal).trim() === '' ||
                              String(advance).trim() === '' ||
                              (isNewCustomer ? (!newCustName.trim() || !newCustPhone.trim()) : !customerId)
                            }
                            onClick={() => setUpdateModalOpen(true)}
                          >
                            {saving ? 'Updating…' : 'Update Order'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-teal"
                            style={{ flex: 1, padding: '0.85rem 0.5rem', fontSize: '0.95rem', whiteSpace: 'nowrap' }}
                            onClick={() => {
                              setPayCashAmt(totals.bal.toFixed(2))
                              setPayStep('choice')
                              setPayModalOpen(true)
                            }}
                          >
                            Receive Payment
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary btn-block"
                          style={{ marginTop: '1.25rem', width: '100%', padding: '0.85rem', fontSize: '1.05rem' }}
                          disabled={
                            saving || 
                            !garmentType || 
                            !status || 
                            !(isMeasurementPayload(snapCache) && hasAnyValues(snapCache)) ||
                            !orderDate ||
                            !deliveryDate ||
                            String(billTotal).trim() === '' ||
                            String(advance).trim() === '' ||
                            (isNewCustomer ? (!newCustName.trim() || !newCustPhone.trim()) : !customerId)
                          }
                          onClick={() => setUpdateModalOpen(true)}
                        >
                          {saving ? 'Updating…' : 'Update Order'}
                        </button>
                      )
                    ) : null}

                    {!oid && (
                      <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        style={{ marginTop: '1.25rem', width: '100%', padding: '0.85rem', fontSize: '1.05rem' }}
                        disabled={
                          saving || 
                          !garmentType || 
                          !status || 
                          !(isMeasurementPayload(snapCache) && hasAnyValues(snapCache)) ||
                          !orderDate ||
                          !deliveryDate ||
                          String(billTotal).trim() === '' ||
                          String(advance).trim() === '' ||
                          (isNewCustomer ? (!newCustName.trim() || !newCustPhone.trim()) : !customerId)
                        }
                      >
                        {saving ? 'Creating…' : 'Create Order'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: ORDER DETAILS */}
              <div className="premium-card">
                <div className="card-header">
                  <div className="header-icon"><Scissors size={20} /></div>
                  <div>
                    <h3>Order & Garment</h3>
                    <p>What are we stitching and when is it due?</p>
                  </div>
                </div>
                <div className="card-body">
                  <div className="form-grid two">
                    <div>
                      <label>Garment Type</label>
                      <select
                        id="gar"
                        value={garmentType}
                        required
                        disabled={isCompleted || !!oid}
                        onChange={(e) => setGarmentType(e.target.value as Garment)}
                      >
                        <option value="" disabled>Select garment type</option>
                        {[
                          'SHIRT',
                          'PANT',
                          'BLOUSE',
                          'SUIT',
                          'KURTA',
                          'SHERWANI',
                          'INDO_WESTERN',
                          'NEHRU_JACKET',
                          'WAISTCOAT',
                          'JODHPURI',
                        ].map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Work Status</label>
                      <select
                        id="st"
                        required
                        value={status}
                        disabled={isCompleted}
                        onChange={(e) => setStatus(e.target.value as Status)}
                      >
                        <option value="" disabled>Select work status</option>
                        {(['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED'] as Status[]).map((s) => {
                          const r = rankOfStatus(s)
                          const disabled = r < persistedRank || (!!oid && s === 'PENDING')
                          return (
                            <option key={s} value={s} disabled={disabled}>
                              {s.replace(/_/g, ' ')}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="form-grid two" style={{ marginTop: '1rem' }}>
                    <div>
                      <label>Order Date</label>
                      <input
                        type="date"
                        required
                        value={orderDate}
                        disabled={isCompleted}
                        onClick={(e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.showPicker) target.showPicker();
                        }}
                        onChange={(e) => setOrderDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label>Delivery Date</label>
                      <input
                        type="date"
                        required
                        value={deliveryDate}
                        disabled={isCompleted}
                        onClick={(e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.showPicker) target.showPicker();
                        }}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3 & 4: MEASUREMENTS & WORKSHOP NOTES */}
              <div className="form-grid two laptop-grid">
                <div className="premium-card">
                  <div className="card-header">
                    <div className="header-icon"><Ruler size={20} /></div>
                    <div>
                      <h3>Measurements</h3>
                      <p>Record or pull saved sizes.</p>
                    </div>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <button
                        type="button"
                        className="btn btn-teal"
                        style={{ flex: 1 }}
                        onClick={() => setMeasureEditorOpen(true)}
                        disabled={isCompleted}
                      >
                        {hasAnyValues(snapCache) ? <><RotateCcw size={16} /> Edit</> : <><Plus size={16} /> Enter</>}
                      </button>
                      {!isNewCustomer && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                          disabled={isCompleted || pullingMeasurements || !customerId}
                          onClick={() => void pullMeasurements()}
                        >
                          {pullingMeasurements ? '…' : <><RotateCcw size={14} /> Fetch from profile</>}
                        </button>
                      )}
                    </div>

                    {hasAnyValues(snapCache) ? (
                      <div className="measurement-snapshot-box small">
                        <div className="snapshot-unit">Unit: {snapCache.unit}</div>
                        <div className="snapshot-grid">
                          {Object.entries(snapCache.values || {})
                            .filter(([_, v]) => v != null && String(v).trim() !== '')
                            .map(([k, v]) => (
                              <div key={k} className="snapshot-item">
                                <span className="key">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                                <span className="val">{v}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state" style={{ padding: '1rem' }}>No measurements added.</div>
                    )}
                  </div>
                </div>

                <div className="premium-card">
                  <div className="card-header">
                    <div className="header-icon"><ClipboardList size={20} /></div>
                    <div>
                      <h3>Workshop Notes</h3>
                      <p>Internal instructions.</p>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="form-grid">
                      <div>
                        <label>Materials & Cloth</label>
                        <textarea
                          placeholder="e.g. Cotton, Blue checks…"
                          rows={2}
                          value={matNotes}
                          disabled={isCompleted}
                          onChange={(e) => setMatNotes(e.target.value)}
                        />
                      </div>
                      <div>
                        <label>Demands</label>
                        <textarea
                          placeholder="e.g. Slim fit, Side slits…"
                          rows={2}
                          value={demNotes}
                          disabled={isCompleted}
                          onChange={(e) => setDemNotes(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAYMENT FOOTER: Sync Actions */}
              {oid && showSync && (
                <div className="premium-card">
                  <div className="card-body" style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                        Manage UPI sync or manual payment status.
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={syncingPhonePe}
                          onClick={async () => {
                            if (syncingPhonePe) return
                            setSaving(true)
                            try {
                              await appService.orders.phonePeSync(oid)
                              await reloadOrder(oid)
                              publishOrdersChanged({ orderId: oid, action: 'payment' })
                              toast.success('Synced')
                            } catch (e: any) {
                              toast.error('Sync failed.')
                            } finally {
                              setSaving(false)
                            }
                          }}
                        >
                          <RotateCcw size={14} /> Sync UPI
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
        onClick={(e) => e.target === e.currentTarget && setPayModalOpen(false)}
      >
        <div className="premium-card modal-card" style={{ width: 'min(420px, 100%)' }}>
          <div className="card-header">
            <h3>Receive Payment</h3>
            <button className="close-btn" onClick={() => setPayModalOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="card-body">
            {payStep === 'choice' && (
              <div className="payment-choices">
                <button
                  className="payment-choice-btn"
                  onClick={() => {
                    setPayCashAmt(totals.bal.toFixed(2))
                    setPayStep('cash')
                  }}
                >
                  <span className="icon"><Banknote size={24} /></span>
                  <div className="info">
                    <strong>Cash</strong>
                    <span>Record manual cash entry</span>
                  </div>
                </button>
                <button className="payment-choice-btn teal" onClick={() => setPayStep('online')}>
                  <span className="icon"><Smartphone size={24} /></span>
                  <div className="info">
                    <strong>Online / UPI</strong>
                    <span>Pay via PhonePe Gateway</span>
                  </div>
                </button>
              </div>
            )}

            {payStep === 'cash' && (
              <div className="cash-entry">
                <p style={{ marginBottom: '1rem', color: 'var(--muted)' }}>
                  Recording cash for <strong>Balance: ₹ {totals.bal.toFixed(2)}</strong>
                </p>
                <label>Amount Received (₹)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={payCashAmt}
                  onChange={(e) => setPayCashAmt(sanitizeMoneyInput(e.target.value))}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                    disabled={recordingCash}
                    onClick={async () => {
                      const amt = parseMoneyAmount(payCashAmt)
                      if (!amt || amt <= 0) return toast.error('Enter valid amount')
                      setRecordingCash(true)
                      try {
                        await appService.orders.payCash(oid!, amt)
                        setPayModalOpen(false)
                        await reloadOrder(oid)
                        publishOrdersChanged({ orderId: oid!, action: 'payment' })
                        toast.success('Payment recorded')
                      } catch (err: any) {
                        toast.error('Failed to record payment')
                      } finally {
                        setRecordingCash(false)
                      }
                    }}
                  >
                    Confirm Cash
                  </button>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setPayModalOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {payStep === 'online' && (
              <div className="online-entry">
                <p style={{ marginBottom: '1.5rem', color: 'var(--muted)' }}>
                  Redirecting to PhonePe to collect <strong>₹ {totals.bal.toFixed(2)}</strong>.
                </p>
                {!paymentInfo?.phonePeConfigured && (
                  <p className="error-text" style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
                    PhonePe is not configured in settings.
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                    disabled={!paymentInfo?.phonePeConfigured || initiatingOnlinePay}
                    onClick={async () => {
                      setInitiatingOnlinePay(true)
                      try {
                        const res = await appService.orders.phonePeInitiate(oid!)
                        if ((res as any).redirectUrl) window.location.href = (res as any).redirectUrl
                        else toast.error('Payment initialization failed.')
                      } catch (err) {
                        toast.error('Could not start payment.')
                      } finally {
                        setInitiatingOnlinePay(false)
                      }
                    }}
                  >
                    Open Payment Gateway
                  </button>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setPayStep('choice')}>
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Measurement modal */}
      <div
        id="measure-modal"
        className="no-print"
        style={{
          display: measureEditorOpen ? 'flex' : 'none',
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
        onClick={(e) => e.target === e.currentTarget && setMeasureEditorOpen(false)}
      >
        <div className="premium-card modal-card" style={{ width: 'min(960px, 100%)', maxHeight: '92vh' }}>
          <div className="card-header" style={{ padding: '1rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="header-icon"><Ruler size={18} /></div>
              <div>
                <h3 style={{ fontSize: '1rem' }}>{garmentType} Measurements</h3>
                <p style={{ fontSize: '0.8rem' }}>Record the custom sizing for this job.</p>
              </div>
            </div>
            <button className="close-btn" onClick={() => setMeasureEditorOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="card-body" style={{ overflowY: 'auto', padding: '1.5rem', background: 'var(--bg-card)' }}>
            <div className="modal-actions-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.5rem', background: 'var(--bg-elevated)', padding: '1.25rem', borderRadius: '12px', position: 'relative', zIndex: 5 }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label style={{ fontSize: '0.75rem' }}>Switch Garment Type</label>
                <select
                  value={garmentType}
                  disabled={!!oid}
                  onChange={(e) => setGarmentType(e.target.value as Garment)}
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                >
                  {[
                    'SHIRT',
                    'PANT',
                    'BLOUSE',
                    'SUIT',
                    'KURTA',
                    'SHERWANI',
                    'INDO_WESTERN',
                    'NEHRU_JACKET',
                    'WAISTCOAT',
                    'JODHPURI',
                  ].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="unit-selector" style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '0.35rem 0.75rem' }}>
                <label style={{ margin: 0, fontSize: '0.75rem' }}>Measurement Unit</label>
                <div className="radio-group">
                  <label className="radio-btn">
                    <input
                      type="radio"
                      name="modal-unit"
                      checked={measureDraft.unit === 'INCH'}
                      onChange={() => setMeasureDraft((p) => ({ ...p, unit: 'INCH' }))}
                    />
                    <span>Inches</span>
                  </label>
                  <label className="radio-btn">
                    <input
                      type="radio"
                      name="modal-unit"
                      checked={measureDraft.unit === 'CM'}
                      onChange={() => setMeasureDraft((p) => ({ ...p, unit: 'CM' }))}
                    />
                    <span>CM</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="measurement-editor-grid" style={{ display: 'grid', gap: '2rem' }}>
              {(Object.entries(groupFields(templates[garmentType] || [])) || []).map(([gn, fs]) => (
                <div key={gn} className="measurement-group" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
                  <h4 className="group-title" style={{ marginTop: '-2rem', background: 'var(--bg-card)', padding: '0 0.5rem', width: 'fit-content', marginLeft: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--teal)', position: 'relative', zIndex: 1 }}>
                    {gn}
                  </h4>
                  <div className="fields-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                    {fs.map((f) => (
                      <div key={f.key} className="field-item">
                        <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          {f.label}
                          {!isOptionalField(f) && <span className="req-star" style={{ color: 'var(--danger)' }}>*</span>}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                          value={measureDraft.values[f.key] || ''}
                          placeholder={placeholderFor(measureDraft.unit, f.label)}
                          onChange={(e) =>
                            setMeasureDraft((p) => ({ ...p, values: { ...p.values, [f.key]: e.target.value } }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setMeasureEditorOpen(false)}>
              Discard
            </button>
            <button type="button" className="btn btn-primary" style={{ minWidth: '160px' }} onClick={() => void saveMeasurementsToProfile()}>
              <Save size={16} /> Save Measurements
            </button>
          </div>
        </div>
      </div>



      {/* Update Order Modal */}
      {updateModalOpen && (
        <div
          className="no-print modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setUpdateModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div className="premium-card modal-card" style={{ width: 'min(400px, 100%)' }}>
            <div className="card-header">
              <h3>Update Order</h3>
              <button className="close-btn" onClick={() => setUpdateModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <label>Work Status</label>
                <select
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                >
                  <option value="" disabled>Select work status</option>
                  <option value="PENDING" disabled>PENDING</option>
                  <option value="IN_PROGRESS" disabled={rankOfStatus('IN_PROGRESS') < persistedRank}>IN PROGRESS</option>
                  <option value="READY" disabled={rankOfStatus('READY') < persistedRank}>READY</option>
                  <option value="DELIVERED" disabled={rankOfStatus('DELIVERED') < persistedRank}>DELIVERED</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving || !status}
                  onClick={(e) => {
                    setUpdateModalOpen(false);
                    onSubmitSave(e as any);
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>

                {canPayActions && (
                  <button
                    type="button"
                    className="btn btn-teal"
                    onClick={() => {
                      setUpdateModalOpen(false);
                      setPayCashAmt(totals.bal.toFixed(2));
                      setPayStep('cash');
                      setPayModalOpen(true);
                    }}
                  >
                    <Banknote size={16} style={{ marginRight: '0.5rem' }} /> Receive Payment (Cash)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print previews (hidden) */}
      <div className="receipt-previews">
        <div ref={receiptPayRef} id="receipt-print" className="receipt-sheet" />
        <div ref={orderSlipRef} id="order-slip-print" className="receipt-sheet" />
      </div>

      <style>{`
        select {
          cursor: pointer;
        }

        .order-form-premium {
          --card-bg: var(--bg-card);
          --card-border: var(--border);
          --header-bg: var(--bg-elevated);
        }

        .order-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          width: 100%;
        }

        .top-row-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 1.5rem;
          align-items: stretch;
        }

        @media (max-width: 1100px) {
          .top-row-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 1024px) {
          .order-grid {
            grid-template-columns: 1fr;
          }
          .laptop-grid {
            grid-template-columns: 1fr !important;
          }
          .sticky-card {
            position: static !important;
          }
        }

        .laptop-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          align-items: stretch;
        }

        .laptop-grid .premium-card {
          margin-bottom: 0;
          height: 100%;
        }

        .premium-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          margin-bottom: 1.5rem;
          overflow: hidden;
        }

        .card-header {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(to bottom, var(--header-bg), transparent);
          border-bottom: 1px solid var(--card-border);
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .card-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: var(--text-h);
        }

        .card-header p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--muted);
        }

        .header-icon {
          width: 40px;
          height: 40px;
          background: var(--teal-dim);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .card-body {
          padding: 1.5rem;
        }

        .sticky-card {
          position: sticky;
          top: 1.5rem;
        }

        .bill-total-input {
          font-size: 1.5rem !important;
          font-weight: 700;
          color: var(--teal) !important;
          text-align: right;
        }

        .bill-summary {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px dashed var(--border);
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
        }

        .balance-row {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border);
          font-size: 1.1rem;
        }

        .text-success { color: #10b981; }
        .text-danger { color: #ef4444; }

        .paid-badge {
          background: #ecfdf5;
          color: #059669;
          padding: 0.75rem;
          border-radius: 10px;
          text-align: center;
          font-weight: 700;
          margin-top: 1rem;
        }

        .measurement-snapshot-box {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1rem;
        }

        .snapshot-unit {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 0.75rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.5rem;
        }

        .snapshot-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 0.75rem;
        }

        .measurement-snapshot-box.small {
          padding: 0.75rem;
          font-size: 0.82rem;
        }

        .measurement-snapshot-box.small .snapshot-grid {
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 0.5rem;
        }

        .measurement-snapshot-box.small .snapshot-item .val {
          font-size: 0.88rem;
        }

        .snapshot-item {
          display: flex;
          flex-direction: column;
        }

        .snapshot-item .key {
          font-size: 0.75rem;
          color: var(--muted);
          text-transform: capitalize;
        }

        .snapshot-item .val {
          font-weight: 600;
          font-size: 0.95rem;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          background: var(--bg-elevated);
          border: 1px dashed var(--border);
          border-radius: 12px;
          color: var(--muted);
          font-style: italic;
        }

        .modal-card {
          background-color: var(--bg-card);
          background-image: none;
          color: var(--text);
          animation: modalSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border);
          position: relative;
          z-index: 1001;
        }

        @keyframes modalSlideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .payment-choices {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .payment-choice-btn {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
          color: inherit;
        }

        .payment-choice-btn:hover {
          background: var(--bg-elevated);
          transform: translateY(-2px);
          border-color: var(--teal);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .payment-choice-btn.teal {
          background: var(--teal-dim);
          border-color: rgba(47, 127, 123, 0.2);
        }

        .payment-choice-btn .info strong {
          display: block;
          font-size: 1rem;
        }

        .payment-choice-btn .info span {
          font-size: 0.8rem;
          color: var(--muted);
        }

        .measurement-editor-grid {
          display: grid;
          gap: 2.5rem;
        }

        .measurement-group {
          position: relative;
          transition: all 0.2s;
        }

        .group-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--teal);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1.25rem;
        }

        .fields-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1.25rem;
        }

        .field-item {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .field-item label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--muted);
        }

        .field-item input {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg);
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .field-item input:focus {
          border-color: var(--teal);
          background: var(--bg-card);
          outline: none;
          box-shadow: 0 0 0 3px var(--teal-dim);
        }

        .field-item input::placeholder {
          color: var(--border);
          font-size: 0.85rem;
        }

        .unit-selector {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-radius: 12px;
          padding: 0.25rem;
        }

        .radio-group {
          display: flex;
          gap: 0.25rem;
          background: var(--bg);
          padding: 0.25rem;
          border-radius: 8px;
          border: 1px solid var(--border);
        }

        .radio-btn {
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .radio-btn:has(input:checked) {
          background: var(--teal);
          color: white;
        }

        .radio-btn input { display: none; }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--muted);
          padding: 0.5rem;
          border-radius: 50%;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: var(--bg-elevated);
          color: var(--text);
        }
      `}</style>
    </>
  )
})

