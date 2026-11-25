import { BILL_CONFIG } from '../config/billConfig';

const VALID_PAPER_WIDTHS = new Set(['58mm', '80mm', 'A4']);

/**
 * Resolve paper width with 'A4' fallback when config value is unknown.
 */
export function resolvePaperWidth(paperWidth) {
  return VALID_PAPER_WIDTHS.has(paperWidth) ? paperWidth : 'A4';
}

/**
 * Format timestamp in IST as "DD-MM-YYYY h:mm AM/PM".
 */
export function formatBillDateIST(dateInput) {
  const parsed = dateInput ? new Date(dateInput) : new Date();
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(safeDate);

  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const day = map.day || '01';
  const month = map.month || '01';
  const year = map.year || '2026';
  const hour = map.hour || '12';
  const minute = map.minute || '00';
  const dayPeriod = (map.dayPeriod || 'AM').toUpperCase();

  return `${day}-${month}-${year} ${hour}:${minute} ${dayPeriod}`;
}

function parseFiniteNumber(val) {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

function cleanAddress(rawAddr) {
  if (!rawAddr || typeof rawAddr !== 'string') return '';
  const withoutMaps = rawAddr.split('| Maps:')[0].trim();
  return withoutMaps;
}

function inferOrderType(order) {
  const explicit = (order?.orderType || order?.type || '').toLowerCase().trim();
  if (explicit === 'dine-in' || explicit === 'dinein') return 'dine-in';
  if (explicit === 'delivery') return 'delivery';
  if (explicit === 'takeaway') return 'takeaway';

  if (
    order?.tableNumber ||
    order?.tableNo ||
    order?.deliveryAddress?.toLowerCase().includes('dine-in') ||
    order?.customer_location?.toLowerCase().includes('dine-in')
  ) {
    return 'dine-in';
  }
  return 'takeaway';
}

function extractTableNumber(order) {
  const raw =
    order?.tableNumber ||
    order?.tableNo ||
    order?.deliveryAddress?.match(/Table\s+(\w+)/i)?.[1] ||
    order?.customer_location?.match(/Table\s+(\w+)/i)?.[1] ||
    '';
  return String(raw).trim();
}

function normalizePaymentMethod(mode) {
  const lower = String(mode || 'cash').toLowerCase().trim();
  if (lower === 'upi') return 'UPI';
  if (lower === 'cash') return 'Cash';
  return lower.toUpperCase();
}

function normalizePaymentStatus(status) {
  const lower = String(status || 'pending').toLowerCase().trim();
  if (lower === 'paid') return 'Paid';
  if (lower === 'cod') return 'COD';
  if (lower === 'failed') return 'Failed';
  return 'Pending';
}

/**
 * Build a single normalized bill model shared between UI, Print, and WhatsApp text.
 * Never recomputes order total from client state when server totalAmount is present.
 */
export function buildBillData(order = {}, config = BILL_CONFIG) {
  const mergedConfig = { ...BILL_CONFIG, ...config };
  const paperWidth = resolvePaperWidth(mergedConfig.paperWidth);

  const rawItems = Array.isArray(order?.items)
    ? order.items
    : typeof order?.items === 'string'
    ? (() => {
        try {
          const parsed = JSON.parse(order.items);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })()
    : [];

  const items = rawItems.map((it) => {
    const qty = Math.max(1, parseInt(it?.quantity, 10) || 1);
    const rate = parseFiniteNumber(it?.price ?? it?.unitPrice) ?? 0;
    const lineTotal = parseFiniteNumber(it?.total) ?? Number((rate * qty).toFixed(2));
    return {
      name: String(it?.name || 'ITEM').trim().toUpperCase(),
      hsn: String(it?.hsn || it?.hsnCode || '-').trim(),
      quantity: qty,
      rate: Number(rate.toFixed(2)),
      total: Number(lineTotal.toFixed(2)),
    };
  });

  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);

  // Use server total strictly; fallback only if totalAmount is genuinely absent
  const serverTotal = parseFiniteNumber(order?.totalAmount ?? order?.total);
  const total =
    serverTotal !== null
      ? Number(serverTotal.toFixed(2))
      : Number(items.reduce((sum, it) => sum + it.total, 0).toFixed(2));

  const rate = Number(mergedConfig.taxRatePercent) || 0;
  const serverSubtotal = parseFiniteNumber(order?.subtotal ?? order?.subTotal);
  const serverTax = parseFiniteNumber(order?.tax ?? order?.taxAmount);
  const serverCgst = parseFiniteNumber(order?.cgst);
  const serverSgst = parseFiniteNumber(order?.sgst);

  let subtotal;
  if (serverSubtotal !== null) {
    subtotal = Number(serverSubtotal.toFixed(2));
  } else if (mergedConfig.taxInclusive && rate > 0) {
    subtotal = Number((total / (1 + rate / 100)).toFixed(2));
  } else if (serverTax !== null) {
    subtotal = Number((total - serverTax).toFixed(2));
  } else {
    subtotal = total;
  }

  let tax;
  if (serverTax !== null) {
    tax = Number(serverTax.toFixed(2));
  } else if (serverCgst !== null && serverSgst !== null) {
    tax = Number((serverCgst + serverSgst).toFixed(2));
  } else {
    tax = Number((total - subtotal).toFixed(2));
  }

  let cgst;
  let sgst;
  if (serverCgst !== null && serverSgst !== null) {
    cgst = Number(serverCgst.toFixed(2));
    sgst = Number(serverSgst.toFixed(2));
  } else {
    const halfCents = Math.round((tax * 100) / 2);
    cgst = Number((halfCents / 100).toFixed(2));
    sgst = Number((tax - cgst).toFixed(2));
  }

  const rawPaymentStatus = String(order?.paymentStatus || 'pending').toLowerCase().trim();
  const isPaid = rawPaymentStatus === 'paid';
  const serverPaid = parseFiniteNumber(order?.paidAmount);
  const paidAmount =
    serverPaid !== null ? Number(serverPaid.toFixed(2)) : isPaid ? total : 0;

  const receivedAmount = parseFiniteNumber(
    order?.receivedAmount ?? order?.amountReceived ?? order?.cashReceived ?? order?.tenderedAmount
  );
  const changeAmount = parseFiniteNumber(
    order?.changeAmount ?? order?.changeGiven ?? order?.change
  );

  const fallbackId = String(order?._id || order?.id || '').slice(-6).toUpperCase();
  const billNo =
    order?.billNumber ||
    (order?.orderNumber != null ? `ORD-${order.orderNumber}` : fallbackId || '—');

  const dateStr = formatBillDateIST(order?.createdAt || order?.orderTimestamp);

  const orderType = inferOrderType(order);
  const tableNumber = orderType === 'dine-in' ? extractTableNumber(order) : '';
  const orderTypeLabel =
    orderType === 'dine-in'
      ? tableNumber
        ? `Dine-in - Table ${tableNumber}`
        : 'Dine-in'
      : orderType === 'delivery'
      ? 'Online Order'
      : 'Takeaway';

  const rawCustomerName = String(order?.customerName || order?.user?.name || '').trim();
  const customerName =
    rawCustomerName && rawCustomerName !== 'N/A' ? rawCustomerName : '';

  const rawCustomerPhone = String(order?.customerPhone || order?.user?.phone || '').trim();
  const customerPhone =
    rawCustomerPhone && rawCustomerPhone !== 'N/A' ? rawCustomerPhone : '';

  const rawAddress =
    orderType === 'delivery'
      ? cleanAddress(
          order?.deliveryAddress ||
            order?.customerLocation ||
            order?.customer_location ||
            order?.locationDetails
        )
      : '';

  return {
    config: mergedConfig,
    paperWidth,
    billNo,
    dateStr,
    orderType,
    orderTypeLabel,
    tableNumber,
    customerName,
    customerPhone,
    deliveryAddress: rawAddress,
    items,
    itemCount,
    subtotal,
    tax,
    cgst,
    sgst,
    halfTaxPercent: rate / 2,
    total,
    paymentMethod: normalizePaymentMethod(order?.paymentMode),
    paymentStatus: normalizePaymentStatus(rawPaymentStatus),
    isPaid,
    paidAmount,
    receivedAmount,
    changeAmount,
  };
}

function wrapText(text, width) {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      if (word.length <= width) {
        current = word;
      } else {
        for (let i = 0; i < word.length; i += width) {
          const chunk = word.slice(i, i + width);
          if (chunk.length === width && i + width < word.length) {
            lines.push(chunk);
          } else {
            current = chunk;
          }
        }
      }
    } else if (current.length + 1 + word.length <= width) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      if (word.length <= width) {
        current = word;
      } else {
        current = '';
        for (let i = 0; i < word.length; i += width) {
          const chunk = word.slice(i, i + width);
          if (chunk.length === width && i + width < word.length) {
            lines.push(chunk);
          } else {
            current = chunk;
          }
        }
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

/**
 * Build WhatsApp share text matching the exact thermal receipt layout.
 */
export function buildWhatsAppBillText(order = {}, config = BILL_CONFIG) {
  const b = buildBillData(order, config);
  const { config: c } = b;
  const LINE_W = 40;
  const eqLine = '='.repeat(LINE_W);
  const dashLine = '-'.repeat(LINE_W);

  const centerText = (str) => {
    const s = String(str || '').trim();
    if (s.length >= LINE_W) return s;
    const pad = Math.floor((LINE_W - s.length) / 2);
    return ' '.repeat(pad) + s;
  };

  const lines = [
    centerText(c.businessName),
    centerText(c.address),
    centerText(`Email: ${c.email}`),
    centerText(`Phone: ${c.phone}`),
    centerText(`GST: ${c.gstin}`),
    centerText('INVOICE'),
    eqLine,
  ];

  const leftDate = `Date: ${b.dateStr}`;
  const rightNo = `No: ${b.billNo}`;
  const metaGap = Math.max(1, LINE_W - leftDate.length - rightNo.length);
  lines.push(`${leftDate}${' '.repeat(metaGap)}${rightNo}`);

  lines.push(`Type: ${b.orderTypeLabel}`);
  if (b.customerName || b.customerPhone) {
    const custParts = [];
    if (b.customerName) custParts.push(`Customer: ${b.customerName}`);
    if (b.customerPhone) custParts.push(`Phone: ${b.customerPhone}`);
    lines.push(custParts.join(' | '));
  }
  if (b.deliveryAddress) {
    lines.push(`Address: ${b.deliveryAddress}`);
  }

  lines.push(dashLine);

  const showHsn = Boolean(c.showHsn);
  const nameCol = showHsn ? 11 : 17;
  const hsnCol = showHsn ? 5 : 0;
  const qtyCol = 3;
  const rateCol = 7;
  const totalCol = 8;

  const padL = (s, w) => String(s).slice(0, w).padEnd(w, ' ');
  const padR = (s, w) => String(s).padStart(w, ' ');

  const headerParts = [padL('ITEM', nameCol)];
  if (showHsn) headerParts.push(padL('HSN', hsnCol));
  headerParts.push(padR('QTY', qtyCol), padR('RATE', rateCol), padR('TOTAL', totalCol));
  lines.push(headerParts.join(' '));

  for (const item of b.items) {
    const wrapped = wrapText(item.name, nameCol);
    const firstRow = [padL(wrapped[0], nameCol)];
    if (showHsn) firstRow.push(padL(item.hsn, hsnCol));
    firstRow.push(
      padR(item.quantity, qtyCol),
      padR(item.rate.toFixed(2), rateCol),
      padR(item.total.toFixed(2), totalCol)
    );
    lines.push(firstRow.join(' '));
    for (let i = 1; i < wrapped.length; i += 1) {
      lines.push(wrapped[i]);
    }
  }

  lines.push(dashLine);
  lines.push(`Items : ${b.itemCount}`);
  lines.push(`Sub Total : INR ${b.subtotal.toFixed(2)}`);
  if (c.showTaxLines) {
    lines.push(`CGST (${b.halfTaxPercent}%) : INR ${b.cgst.toFixed(2)}`);
    lines.push(`SGST (${b.halfTaxPercent}%) : INR ${b.sgst.toFixed(2)}`);
  }
  lines.push(`Total : INR ${b.total.toFixed(2)}`);
  lines.push(dashLine);
  lines.push('PAYMENT');
  lines.push(`Method: ${b.paymentMethod}`);
  lines.push(`Status: ${b.paymentStatus}`);
  lines.push(`Paid: INR ${b.paidAmount.toFixed(2)}`);
  if (b.receivedAmount !== null) {
    lines.push(`Received: INR ${b.receivedAmount.toFixed(2)}`);
  }
  if (b.changeAmount !== null) {
    lines.push(`Change: INR ${b.changeAmount.toFixed(2)}`);
  }
  lines.push(dashLine);
  lines.push(centerText(c.footerNote));

  return '```\n' + lines.join('\n') + '\n```';
}

/**
 * Wait until all <img> elements in a container have fully loaded and decoded.
 */
export async function waitForBillImages(container) {
  if (!container) return;
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      if (!img.complete) {
        await new Promise((resolve) => {
          const done = () => resolve();
          const timer = setTimeout(done, 4000);
          img.addEventListener('load', () => { clearTimeout(timer); done(); }, { once: true });
          img.addEventListener('error', () => { clearTimeout(timer); done(); }, { once: true });
        });
      }
      if (typeof img.decode === 'function') {
        try {
          await img.decode();
        } catch {
          // Ignore decode failure if image errored or fallback loaded
        }
      }
    })
  );
}
