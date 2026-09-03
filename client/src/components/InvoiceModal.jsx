import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, 
  Share2, 
  CheckCircle2, 
  X, 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  CreditCard, 
  Package, 
  Coffee, 
  ArrowRight,
  FileText
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';
import './InvoiceModal.css';

export default function InvoiceModal({ isOpen, onClose, invoiceData }) {
  const invoiceRef = useRef(null);
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !invoiceData) return null;

  const {
    _id,
    orderNumber,
    customerName = 'Valued Customer',
    customerPhone = 'N/A',
    customerLocation = 'Dood Cafe Counter',
    formattedDate = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    items = [],
    totalAmount = 0,
    paymentMode = 'cash',
    orderType = 'takeaway',
    specialInstructions = ''
  } = invoiceData;

  const formattedOrderId = orderNumber 
    ? `#ORD-${String(orderNumber).padStart(4, '0')}` 
    : `#${String(_id || '').slice(-6).toUpperCase() || 'DOOD-001'}`;

  // ── Download Invoice as PDF ───────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;

    setDownloading(true);
    const toastId = toast.loading('📄 Generating your crisp PDF invoice...');

    try {
      const opt = {
        margin: [8, 8, 8, 8],
        filename: 'DoodCafe_Invoice.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(invoiceRef.current).save();
      toast.success('📥 DoodCafe_Invoice.pdf downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('[Invoice Download Error]:', err);
      toast.error('Failed to generate PDF. Please try again.', { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  // ── Share Bill via WhatsApp Web Bridge ─────────────────────────────────────
  const handleShareWhatsApp = () => {
    try {
      const itemsList = items.map(
        (item, idx) => `${idx + 1}. *${item.name}* × ${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}`
      ).join('\n');

      const message = 
`☕ *DOOD CAFE - OFFICIAL ORDER RECEIPT* ☕
=================================
🧾 *Invoice ID:* ${formattedOrderId}
📅 *Date & Time:* ${formattedDate}
👤 *Customer Name:* ${customerName}
📞 *Phone Number:* ${customerPhone}
📍 *Delivery / Location:* ${customerLocation}
💳 *Payment Mode:* ${paymentMode.toUpperCase()}
📦 *Order Type:* ${orderType.toUpperCase()}
=================================
📋 *ITEMIZED ORDER SUMMARY:*
${itemsList}
=================================
💵 *GRAND TOTAL:* ₹${Number(totalAmount).toFixed(2)}
${specialInstructions ? `📝 *Note:* ${specialInstructions}\n=================================\n` : ''}
✨ _Thank you for dining with Dood Cafe! Enjoy your freshly brewed moments._
🌐 Visit us again soon!`;

      const encodedMessage = encodeURIComponent(message);
      // Universal WhatsApp Web / App API URL
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      toast.success('💬 WhatsApp sharing opened!');
    } catch (err) {
      console.error('[WhatsApp Share Error]:', err);
      toast.error('Could not open WhatsApp sharing.');
    }
  };

  const handleDoneAndNavigate = () => {
    if (onClose) onClose();
    navigate('/orders');
  };

  return (
    <div className="invoice-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="invoice-modal-title">
      <div className="invoice-modal-container">
        
        {/* Modal Top Floating Header */}
        <div className="invoice-modal-header">
          <div className="invoice-modal-header-badge">
            <CheckCircle2 size={20} className="text-emerald-500" />
            <span id="invoice-modal-title">Order Confirmed & Invoice Generated</span>
          </div>
          <button 
            type="button" 
            className="invoice-close-btn" 
            onClick={handleDoneAndNavigate}
            title="Close and go to Orders"
            aria-label="Close invoice modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Printable Invoice Content */}
        <div className="invoice-modal-body">
          <div className="invoice-paper" id="doodcafe-invoice-content" ref={invoiceRef}>
            
            {/* Invoice Cafe Branding Header */}
            <div className="invoice-brand-header">
              <div className="invoice-brand-info">
                <div className="invoice-brand-logo-wrap">
                  <span className="invoice-brand-icon">☕</span>
                  <div>
                    <h2 className="invoice-brand-name">DOOD CAFE</h2>
                    <p className="invoice-brand-tagline">Artisanal Coffee & Gourmet Delights</p>
                  </div>
                </div>
                <div className="invoice-cafe-meta">
                  <p>100 Feet Road, Indiranagar / Anna Nagar</p>
                  <p>Contact: +91 98765 43210 | support@doodcafe.com</p>
                  <p>GSTIN: 33AAAAA0000A1Z5</p>
                </div>
              </div>

              <div className="invoice-meta-badge">
                <div className="invoice-badge-title">TAX INVOICE / RECEIPT</div>
                <div className="invoice-badge-number">{formattedOrderId}</div>
                <div className="invoice-badge-date">
                  <Calendar size={13} /> {formattedDate}
                </div>
              </div>
            </div>

            <div className="invoice-divider" />

            {/* Customer & Location Summary Grid */}
            <div className="invoice-customer-grid">
              <div className="invoice-info-block">
                <span className="invoice-info-label"><User size={13} /> Customer Name</span>
                <span className="invoice-info-value highlight">{customerName}</span>
              </div>

              <div className="invoice-info-block">
                <span className="invoice-info-label"><Phone size={13} /> Phone Number</span>
                <span className="invoice-info-value">{customerPhone}</span>
              </div>

              <div className="invoice-info-block">
                <span className="invoice-info-label"><CreditCard size={13} /> Payment Mode</span>
                <span className="invoice-info-value uppercase-text">
                  <span className="payment-pill">{paymentMode}</span>
                </span>
              </div>

              <div className="invoice-info-block">
                <span className="invoice-info-label"><Package size={13} /> Order Fulfillment</span>
                <span className="invoice-info-value capitalize-text">{orderType}</span>
              </div>

              <div className="invoice-info-block full-col">
                <span className="invoice-info-label"><MapPin size={13} /> Full Delivery / Location Address</span>
                <span className="invoice-info-value address-text">{customerLocation}</span>
              </div>

              {specialInstructions && (
                <div className="invoice-info-block full-col instructions-block">
                  <span className="invoice-info-label">Special Cooking Instructions:</span>
                  <span className="invoice-info-value italic-text">"{specialInstructions}"</span>
                </div>
              )}
            </div>

            {/* Detailed Itemized Cafe Items Table */}
            <div className="invoice-table-wrap">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th className="th-num">#</th>
                    <th className="th-item">Cafe Item Description</th>
                    <th className="th-qty">Qty</th>
                    <th className="th-price">Unit Price</th>
                    <th className="th-total">Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const lineTotal = (item.price || 0) * (item.quantity || 1);
                    return (
                      <tr key={idx} className="invoice-row">
                        <td className="td-num">{idx + 1}</td>
                        <td className="td-item">
                          <span className="item-name-cell">{item.name}</span>
                        </td>
                        <td className="td-qty">×{item.quantity}</td>
                        <td className="td-price">₹{Number(item.price).toFixed(2)}</td>
                        <td className="td-total">₹{Number(lineTotal).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Invoice Total Calculation Breakdown */}
            <div className="invoice-calc-grid">
              <div className="invoice-terms">
                <h4>Customer Notice & Terms:</h4>
                <p>• All food items are freshly prepared to order.</p>
                <p>• Keep this receipt for tracking and any customer support queries.</p>
                <p>• Scan your receipt or share on WhatsApp for easy order reference.</p>
              </div>

              <div className="invoice-summary-box">
                <div className="invoice-summary-row">
                  <span>Items Subtotal:</span>
                  <span>₹{Number(totalAmount).toFixed(2)}</span>
                </div>
                <div className="invoice-summary-row">
                  <span>Taxes & GST (Included):</span>
                  <span>₹0.00</span>
                </div>
                <div className="invoice-summary-row">
                  <span>Packaging & Delivery:</span>
                  <span className="text-emerald-600">FREE</span>
                </div>
                <div className="invoice-summary-divider" />
                <div className="invoice-summary-row grand-total-row">
                  <span>Grand Total</span>
                  <span className="grand-total-amount">₹{Number(totalAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="invoice-paper-footer">
              <p className="footer-thanks">✦ Thank you for choosing Dood Cafe! ✦</p>
              <p className="footer-sub">Handcrafted with passion & fresh ingredients.</p>
            </div>

          </div>
        </div>

        {/* Modal Action Controls Footer */}
        <div className="invoice-modal-footer">
          <div className="invoice-actions-group">
            <button
              type="button"
              id="download-invoice-btn"
              className="btn btn-invoice-download"
              onClick={handleDownloadPdf}
              disabled={downloading}
            >
              <Download size={17} />
              <span>{downloading ? 'Exporting PDF...' : 'Download Invoice'}</span>
            </button>

            <button
              type="button"
              id="share-whatsapp-btn"
              className="btn btn-invoice-whatsapp"
              onClick={handleShareWhatsApp}
            >
              <Share2 size={17} />
              <span>Share Bill via WhatsApp</span>
            </button>
          </div>

          <button
            type="button"
            id="invoice-tracking-btn"
            className="btn btn-invoice-track"
            onClick={handleDoneAndNavigate}
          >
            <span>Proceed to Order Tracking</span>
            <ArrowRight size={17} />
          </button>
        </div>

      </div>
    </div>
  );
}
