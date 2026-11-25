import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { BILL_CONFIG } from '../config/billConfig';
import { resolvePaperWidth, waitForBillImages } from './billUtils';
import Bill from '../components/Bill';

let activePrintRoot = null;
let activePrintHost = null;

function cleanupPrintHost() {
  document.body.classList.remove('bill-printing-active');
  if (activePrintRoot) {
    try {
      activePrintRoot.unmount();
    } catch {
      // Ignore already unmounted root
    }
    activePrintRoot = null;
  }
  if (activePrintHost && activePrintHost.parentNode) {
    activePrintHost.parentNode.removeChild(activePrintHost);
    activePrintHost = null;
  }
}

/**
 * Mount the bill inside a dedicated print-only container, ensure @page size matches
 * billConfig.paperWidth (A4 fallback), wait until the logo image finishes loading/decoding,
 * then invoke window.print().
 */
export async function printBillOrder(order, config = BILL_CONFIG) {
  if (!order) return;

  cleanupPrintHost();

  const mergedConfig = { ...BILL_CONFIG, ...config };
  const paperWidth = resolvePaperWidth(mergedConfig.paperWidth);
  const pageSizeRule =
    paperWidth === '58mm'
      ? '58mm auto'
      : paperWidth === '80mm'
      ? '80mm auto'
      : 'A4';

  let pageStyle = document.getElementById('bill-print-page-style');
  if (!pageStyle) {
    pageStyle = document.createElement('style');
    pageStyle.id = 'bill-print-page-style';
    document.head.appendChild(pageStyle);
  }
  pageStyle.textContent = `@media print { @page { size: ${pageSizeRule}; margin: 0; } }`;

  const host = document.createElement('div');
  host.id = 'bill-print-root';
  host.className = 'bill-print-only';
  document.body.appendChild(host);
  activePrintHost = host;

  const root = createRoot(host);
  activePrintRoot = root;
  root.render(createElement(Bill, { order, config: mergedConfig }));

  // Allow React to commit the DOM before checking and decoding images
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  );
  await waitForBillImages(host);

  document.body.classList.add('bill-printing-active');
  window.addEventListener('afterprint', cleanupPrintHost, { once: true });
  window.print();
}

export default printBillOrder;
