(function () {
  function esc(s) {
    if (window.TSShell && TSShell.escapeHtml) return TSShell.escapeHtml(s);
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isoDate(v) {
    if (!v) return '';
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    if (Array.isArray(v) && v.length >= 3) {
      return v[0] + '-' + String(v[1]).padStart(2, '0') + '-' + String(v[2]).padStart(2, '0');
    }
    return String(v);
  }

  function studioBlock(studio) {
    studio = studio || {};
    return (
      '<div class="receipt-brand-block">' +
      '<div class="receipt-studio">' +
      esc(studio.name || 'Tailor Studio') +
      '</div>' +
      (studio.tagline ? '<div class="receipt-tagline">' + esc(studio.tagline) + '</div>' : '') +
      (studio.phone || studio.address
        ? '<div class="receipt-contact">' +
          esc([studio.phone, studio.address].filter(Boolean).join(' · ')) +
          '</div>'
        : '') +
      '</div>'
    );
  }

  /** Build HTML for payment receipt. d: lines[], total, advance, balance, orderDate, deliveryDate, customerName, garment, serialLabel */
  function paymentReceiptHtml(studio, d) {
    d = d || {};
    var lines = d.lines || [];
    var rows = lines
      .map(function (ln) {
        return (
          '<tr><td>' +
          esc(ln.description) +
          '</td><td class="receipt-num">₹ ' +
          (Number(ln.amount) || 0).toFixed(2) +
          '</td></tr>'
        );
      })
      .join('');
    var snText =
      d.serialLabel != null
        ? String(d.serialLabel)
        : d.serialNumber != null
          ? '#' + d.serialNumber
          : 'Draft';
    var sum =
      typeof d.total === 'number'
        ? d.total
        : lines.reduce(function (s, ln) {
            return s + (Number(ln.amount) || 0);
          }, 0);
    var adv = Number(d.advance) || 0;
    var bal = typeof d.balance === 'number' ? d.balance : Math.max(0, sum - adv);
    return (
      studioBlock(studio) +
      '<div class="receipt-title">Payment receipt</div>' +
      '<div class="receipt-meta">' +
      esc('Order ' + snText + ' · Taken ' + (d.orderDate || '') + ' · Delivery ' + (d.deliveryDate || '')) +
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
      '<div class="receipt-row"><span>Total</span><strong>₹ ' +
      sum.toFixed(2) +
      '</strong></div>' +
      '<div class="receipt-row"><span>Advance received</span><span>₹ ' +
      adv.toFixed(2) +
      '</span></div>' +
      '<div class="receipt-row receipt-balance"><span>Balance due</span><strong>₹ ' +
      bal.toFixed(2) +
      '</strong></div></div>' +
      '<p class="receipt-footer">Thank you for your business.</p>'
    );
  }

  function humanizeMeasureKey(k) {
    return String(k)
      .replace(/_/g, ' ')
      .split(' ')
      .map(function (w) {
        return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '';
      })
      .join(' ');
  }

  /** HTML block for measurement snapshot JSON (unit + values map). */
  function measurementsSectionHtml(jsonStr) {
    if (!jsonStr || String(jsonStr).trim() === '' || String(jsonStr).trim() === '{}') {
      return (
        '<div class="receipt-work-block">' +
        '<h4 class="receipt-work-h">Measurements</h4>' +
        '<p class="receipt-work-muted">No measurement snapshot attached on this slip.</p></div>'
      );
    }
    var o;
    try {
      o = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    } catch (e) {
      return (
        '<div class="receipt-work-block">' +
        '<h4 class="receipt-work-h">Measurements</h4>' +
        '<p class="receipt-work-muted">Could not read measurement data.</p></div>'
      );
    }
    var unit = 'INCH';
    var vals = o;
    if (o && typeof o.values === 'object' && o.values !== null) {
      unit = (o.unit || 'INCH').toString();
      vals = o.values;
    }
    if (!vals || typeof vals !== 'object') {
      return (
        '<div class="receipt-work-block">' +
        '<h4 class="receipt-work-h">Measurements</h4>' +
        '<p class="receipt-work-muted">No measurement values found.</p></div>'
      );
    }
    var keys = Object.keys(vals).filter(function (k) {
      var v = vals[k];
      return v != null && String(v).trim() !== '';
    });
    if (keys.length === 0) {
      return (
        '<div class="receipt-work-block">' +
        '<h4 class="receipt-work-h">Measurements</h4>' +
        '<p class="receipt-work-muted">No measurement values found.</p></div>'
      );
    }
    var rows = keys
      .map(function (k) {
        return (
          '<tr><td>' +
          esc(humanizeMeasureKey(k)) +
          '</td><td class="receipt-mval">' +
          esc(String(vals[k]).trim()) +
          '</td></tr>'
        );
      })
      .join('');
    return (
      '<div class="receipt-work-block">' +
      '<h4 class="receipt-work-h">Measurements</h4>' +
      '<p class="receipt-unit-line"><strong>Unit:</strong> ' +
      esc(unit) +
      '</p>' +
      '<table class="receipt-measure-table"><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>' +
      rows +
      '</tbody></table></div>'
    );
  }

  function workDetailBlock(title, bodyText) {
    if (!bodyText || String(bodyText).trim() === '') return '';
    return (
      '<div class="receipt-work-block">' +
      '<h4 class="receipt-work-h">' +
      esc(title) +
      '</h4>' +
      '<div class="receipt-work-body">' +
      esc(bodyText) +
      '</div></div>'
    );
  }

  /** Work order — measurements, materials, demands, notes, charges, payment */
  function orderSlipHtml(studio, d) {
    d = d || {};
    var lines = d.lines || [];
    var rows = lines
      .map(function (ln) {
        return (
          '<tr><td>' +
          esc(ln.description) +
          '</td><td class="receipt-num">₹ ' +
          (Number(ln.amount) || 0).toFixed(2) +
          '</td></tr>'
        );
      })
      .join('');
    var snText =
      d.serialLabel != null
        ? String(d.serialLabel)
        : d.serialNumber != null
          ? '#' + d.serialNumber
          : '—';
    var total = Number(d.totalAmount);
    if (isNaN(total)) {
      total = lines.reduce(function (s, ln) {
        return s + (Number(ln.amount) || 0);
      }, 0);
    }
    var adv = Number(d.advanceAmount) || 0;
    var bal =
      typeof d.balance === 'number' ? d.balance : Math.max(0, total - adv);
    var st = (d.status || '').replace(/_/g, ' ');
    var notes = d.notes || '';
    var measHtml = measurementsSectionHtml(d.measurementSnapshotJson);
    var matHtml = workDetailBlock('Materials & cloth', d.materialsNotes);
    var demHtml = workDetailBlock('Customer requests & demands', d.demandsNotes);
    var notesHtml = notes.trim()
      ? '<div class="receipt-work-block"><h4 class="receipt-work-h">Workshop notes</h4><div class="receipt-work-body">' +
        esc(notes) +
        '</div></div>'
      : '';
    return (
      studioBlock(studio) +
      '<div class="receipt-title receipt-title-order">Work order</div>' +
      '<div class="receipt-meta">' +
      esc('Order ' + snText + ' · Placed ' + (d.orderDate || '') + ' · Deliver by ' + (d.deliveryDate || '')) +
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
      '<div class="receipt-row"><span>Total</span><strong>₹ ' +
      total.toFixed(2) +
      '</strong></div>' +
      '<div class="receipt-row"><span>Advance</span><span>₹ ' +
      adv.toFixed(2) +
      '</span></div>' +
      '<div class="receipt-row receipt-balance"><span>Balance</span><strong>₹ ' +
      bal.toFixed(2) +
      '</strong></div></div>' +
      '<p class="receipt-footer">Work order — keep for workshop records.</p>'
    );
  }

  /** Normalize API order to receipt data */
  function paymentDataFromOrder(order) {
    var cust = order.customer || {};
    var lines = (order.lines || []).map(function (ln) {
      return { description: ln.description, amount: Number(ln.amount) || 0 };
    });
    var totalFromLines = lines.reduce(function (s, ln) {
      return s + ln.amount;
    }, 0);
    var total = totalFromLines > 0 ? totalFromLines : Number(order.totalAmount) || 0;
    var adv = Number(order.advanceAmount) || 0;
    return {
      serialNumber: order.serialNumber,
      orderDate: isoDate(order.orderDate),
      deliveryDate: isoDate(order.deliveryDate),
      customerName: cust.name ? cust.name + (cust.phone ? ' — ' + cust.phone : '') : '',
      garment: order.garmentType,
      lines: lines,
      total: total,
      advance: adv,
      balance: Math.max(0, total - adv),
    };
  }

  function orderSlipDataFromOrder(order) {
    var p = paymentDataFromOrder(order);
    var cust = order.customer || {};
    var customerLine = cust.name ? cust.name + (cust.phone ? ' · ' + cust.phone : '') : p.customerName;
    return {
      serialNumber: order.serialNumber,
      orderDate: p.orderDate,
      deliveryDate: p.deliveryDate,
      customerLine: customerLine,
      customerName: p.customerName,
      garment: order.garmentType,
      status: order.status,
      notes: order.notes,
      materialsNotes: order.materialsNotes,
      demandsNotes: order.demandsNotes,
      measurementSnapshotJson: order.measurementSnapshotJson,
      lines: p.lines,
      totalAmount: p.total,
      advanceAmount: p.advance,
      balance: p.balance,
    };
  }

  function printElement(el) {
    if (!el) return;
    var w = window.open('', '_blank');
    var href = window.location.origin + '/css/style.css';
    w.document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Print</title>' +
      '<link rel="stylesheet" href="' +
      href +
      '" /></head><body class="receipt-print-body">' +
      el.outerHTML +
      '</body></html>'
    );
    w.document.close();
    w.onload = function () {
      w.focus();
      w.print();
      w.close();
    };
  }

  window.TSReceipt = {
    esc: esc,
    isoDate: isoDate,
    paymentReceiptHtml: paymentReceiptHtml,
    orderSlipHtml: orderSlipHtml,
    measurementsSectionHtml: measurementsSectionHtml,
    paymentDataFromOrder: paymentDataFromOrder,
    orderSlipDataFromOrder: orderSlipDataFromOrder,
    renderPaymentInto: function (el, studio, order) {
      if (!el) return;
      var p = paymentDataFromOrder(order);
      el.innerHTML = paymentReceiptHtml(studio, p);
    },
    renderOrderSlipInto: function (el, studio, order) {
      if (!el) return;
      el.innerHTML = orderSlipHtml(studio, orderSlipDataFromOrder(order));
    },
    printElement: printElement,
  };
})();
