/* Ported from backend static/js/receipt.js to preserve UI + print layout. */

function esc(s: unknown) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isoDate(v: unknown) {
  if (!v) return ''
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  if (Array.isArray(v) && v.length >= 3) {
    return `${v[0]}-${String(v[1]).padStart(2, '0')}-${String(v[2]).padStart(2, '0')}`
  }
  return String(v)
}

type Studio = { name?: string; tagline?: string; phone?: string; address?: string }

function studioBlock(studio: Studio) {
  studio = studio || {}
  return (
    '<div class="receipt-brand-block">' +
    '<div class="receipt-studio">' +
    esc(studio.name || 'Tailor Studio') +
    '</div>' +
    (studio.tagline ? '<div class="receipt-tagline">' + esc(studio.tagline) + '</div>' : '') +
    (studio.phone || studio.address
      ? '<div class="receipt-contact">' + esc([studio.phone, studio.address].filter(Boolean).join(' · ')) + '</div>'
      : '') +
    '</div>'
  )
}

export type ReceiptLine = { description: string; amount: number }

export type PaymentReceiptData = {
  lines: ReceiptLine[]
  total?: number
  advance?: number
  balance?: number
  orderDate?: string
  deliveryDate?: string
  customerName?: string
  garment?: string
  serialLabel?: string
  serialNumber?: number
}

export function paymentReceiptHtml(studio: Studio, d: PaymentReceiptData) {
  d = d || {}
  const lines = d.lines || []
  const rows = lines
    .map((ln) => {
      return `<tr><td>${esc(ln.description)}</td><td class="receipt-num">₹ ${(Number(ln.amount) || 0).toFixed(2)}</td></tr>`
    })
    .join('')

  const snText = d.serialLabel != null ? String(d.serialLabel) : d.serialNumber != null ? `#${d.serialNumber}` : 'Draft'
  const sum = typeof d.total === 'number' ? d.total : lines.reduce((s, ln) => s + (Number(ln.amount) || 0), 0)
  const adv = Number(d.advance) || 0
  const bal = typeof d.balance === 'number' ? d.balance : Math.max(0, sum - adv)

  return (
    studioBlock(studio) +
    '<div class="receipt-title">Payment receipt</div>' +
    '<div class="receipt-meta">' +
    esc(`Order ${snText} · Taken ${d.orderDate || ''} · Delivery ${d.deliveryDate || ''}`) +
    '</div>' +
    '<div class="receipt-customer"><strong>Customer:</strong> ' +
    esc(d.customerName || '') +
    '</div>' +
    '<div class="receipt-garment"><strong>Garment:</strong> ' +
    esc(d.garment || '') +
    '</div>' +
    '<table class="receipt-table"><thead><tr><th>Particulars</th><th>Amount</th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="2">—</td></tr>') +
    '</tbody></table>' +
    '<div class="receipt-totals">' +
    `<div class="receipt-row"><span>Total</span><strong>₹ ${sum.toFixed(2)}</strong></div>` +
    `<div class="receipt-row"><span>Advance received</span><span>₹ ${adv.toFixed(2)}</span></div>` +
    `<div class="receipt-row receipt-balance"><span>Balance due</span><strong>₹ ${bal.toFixed(2)}</strong></div></div>` +
    '<p class="receipt-footer">Thank you for your business.</p>'
  )
}

function humanizeMeasureKey(k: string) {
  return String(k)
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
}

export function measurementsSectionHtml(jsonStr: unknown) {
  if (!jsonStr || String(jsonStr).trim() === '' || String(jsonStr).trim() === '{}') {
    return (
      '<div class="receipt-work-block">' +
      '<h4 class="receipt-work-h">Measurements</h4>' +
      '<p class="receipt-work-muted">No measurement snapshot attached on this slip.</p></div>'
    )
  }
  let o: any
  try {
    o = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
  } catch {
    return (
      '<div class="receipt-work-block">' +
      '<h4 class="receipt-work-h">Measurements</h4>' +
      '<p class="receipt-work-muted">Could not read measurement data.</p></div>'
    )
  }
  let unit = 'INCH'
  let vals: any = o
  if (o && typeof o.values === 'object' && o.values !== null) {
    unit = (o.unit || 'INCH').toString()
    vals = o.values
  }
  if (!vals || typeof vals !== 'object') {
    return (
      '<div class="receipt-work-block">' +
      '<h4 class="receipt-work-h">Measurements</h4>' +
      '<p class="receipt-work-muted">No measurement values found.</p></div>'
    )
  }
  const keys = Object.keys(vals).filter((k) => {
    const v = vals[k]
    return v != null && String(v).trim() !== ''
  })
  if (keys.length === 0) {
    return (
      '<div class="receipt-work-block">' +
      '<h4 class="receipt-work-h">Measurements</h4>' +
      '<p class="receipt-work-muted">No measurement values found.</p></div>'
    )
  }
  const rows = keys
    .map((k) => `<tr><td>${esc(humanizeMeasureKey(k))}</td><td class="receipt-mval">${esc(String(vals[k]).trim())}</td></tr>`)
    .join('')
  return (
    '<div class="receipt-work-block">' +
    '<h4 class="receipt-work-h">Measurements</h4>' +
    `<p class="receipt-unit-line"><strong>Unit:</strong> ${esc(unit)}</p>` +
    '<table class="receipt-measure-table"><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>' +
    rows +
    '</tbody></table></div>'
  )
}

function workDetailBlock(title: string, bodyText: unknown) {
  if (!bodyText || String(bodyText).trim() === '') return ''
  return `<div class="receipt-work-block"><h4 class="receipt-work-h">${esc(title)}</h4><div class="receipt-work-body">${esc(bodyText)}</div></div>`
}

export type OrderSlipData = {
  serialLabel?: string
  serialNumber?: number
  orderDate?: string
  deliveryDate?: string
  customerLine?: string
  customerName?: string
  garment?: string
  status?: string
  notes?: string
  materialsNotes?: string
  demandsNotes?: string
  measurementSnapshotJson?: string
  lines?: ReceiptLine[]
  totalAmount?: number
  advanceAmount?: number
  balance?: number
}

export function orderSlipHtml(studio: Studio, d: OrderSlipData) {
  d = d || {}
  const lines = d.lines || []
  const rows = lines
    .map((ln) => `<tr><td>${esc(ln.description)}</td><td class="receipt-num">₹ ${(Number(ln.amount) || 0).toFixed(2)}</td></tr>`)
    .join('')
  const snText = d.serialLabel != null ? String(d.serialLabel) : d.serialNumber != null ? `#${d.serialNumber}` : '—'
  let total = Number(d.totalAmount)
  if (Number.isNaN(total)) total = lines.reduce((s, ln) => s + (Number(ln.amount) || 0), 0)
  const adv = Number(d.advanceAmount) || 0
  const bal = typeof d.balance === 'number' ? d.balance : Math.max(0, total - adv)
  const st = (d.status || '').replace(/_/g, ' ')
  const notes = d.notes || ''
  const measHtml = measurementsSectionHtml(d.measurementSnapshotJson)
  const matHtml = workDetailBlock('Materials & cloth', d.materialsNotes)
  const demHtml = workDetailBlock('Customer requests & demands', d.demandsNotes)
  const notesHtml = String(notes).trim()
    ? `<div class="receipt-work-block"><h4 class="receipt-work-h">Workshop notes</h4><div class="receipt-work-body">${esc(notes)}</div></div>`
    : ''

  return (
    studioBlock(studio) +
    '<div class="receipt-title receipt-title-order">Work order</div>' +
    '<div class="receipt-meta">' +
    esc(`Order ${snText} · Placed ${d.orderDate || ''} · Deliver by ${d.deliveryDate || ''}`) +
    '</div>' +
    '<div class="receipt-customer"><strong>Customer:</strong> ' +
    esc(d.customerLine || d.customerName || '') +
    '</div>' +
    '<div class="receipt-garment"><strong>Garment:</strong> ' +
    esc(d.garment || '') +
    ' · <strong>Status:</strong> ' +
    esc(st) +
    '</div>' +
    measHtml +
    matHtml +
    demHtml +
    notesHtml +
    '<h4 class="receipt-work-h receipt-subhead-charges">Charges</h4>' +
    '<table class="receipt-table"><thead><tr><th>Work / charges</th><th>Amount</th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="2">—</td></tr>') +
    '</tbody></table>' +
    '<div class="receipt-totals">' +
    `<div class="receipt-row"><span>Total</span><strong>₹ ${total.toFixed(2)}</strong></div>` +
    `<div class="receipt-row"><span>Advance</span><span>₹ ${adv.toFixed(2)}</span></div>` +
    `<div class="receipt-row receipt-balance"><span>Balance</span><strong>₹ ${bal.toFixed(2)}</strong></div></div>` +
    '<p class="receipt-footer">Work order — keep for workshop records.</p>'
  )
}

function openPrintWindow(el: HTMLElement, title: string) {
  const w = window.open('', '_blank')
  if (!w) return null

  // In Vite dev, CSS is often injected as <style> tags (no stylesheet link),
  // so we copy both <link rel="stylesheet"> and <style> from the current document.
  const styleHtml = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((n) => (n as HTMLLinkElement).outerHTML)
    .join('\n')
  const inlineStyleHtml = Array.from(document.querySelectorAll('style'))
    .map((n) => `<style>${n.textContent || ''}</style>`)
    .join('\n')

  w.document.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
      esc(title) +
      '</title>' +
      styleHtml +
      inlineStyleHtml +
      '</head><body class="receipt-print-body">' +
      el.outerHTML +
      '</body></html>'
  )
  w.document.close()
  return w
}

export function printElement(el: HTMLElement | null, title = 'Receipt') {
  if (!el) return
  const w = openPrintWindow(el, title)
  if (!w) return
  w.onload = function () {
    w.focus()
    w.print()
    w.close()
  }
}

export { esc, isoDate }

