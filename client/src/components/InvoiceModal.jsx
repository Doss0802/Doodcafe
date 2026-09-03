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
  ArrowRight,
  ImageIcon
} from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import toast from 'react-hot-toast';
import cafeLogo from '../images/cafe_logo.png';
import './InvoiceModal.css';

export default function InvoiceModal({ isOpen, onClose, invoiceData }) {
  const invoiceRef = useRef(null);
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

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

  // ── Download Invoice as PNG Image ─────────────────────────────────────────
  const handleDownloadImage = async () => {
    if (!invoiceRef.current) return;

    setDownloading(true);
    const toastId = toast.loading('🖼️ Capturing crisp bill receipt image...');

    try {
      // Generate crisp 2x high-resolution PNG image
      const dataUrl = await toPng(invoiceRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = 'DoodCafe_Bill_Receipt.png';
      link.href = dataUrl;
      link.click();

      toast.success('📥 DoodCafe_Bill_Receipt.png downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('[Invoice Image Export Error]:', err);
      toast.error('Failed to export receipt image. Please try again.', { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  // ── Share Bill via WhatsApp (with File Attachment or Structured Link) ────
  const handleShareWhatsApp = async () => {
    setSharing(true);
    const toastId = toast.loading('💬 Preparing receipt for WhatsApp...');

    try {
      // 1. Attempt Native Mobile/Desktop OS Share with actual PNG image file
      if (invoiceRef.current && navigator.canShare) {
        try {
          const blob = await toBlob(invoiceRef.current, {
            quality: 0.95,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            cacheBust: true,
          });

          if (blob) {
            const file = new File([blob], 'DoodCafe_Bill_Receipt.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'Dood Cafe Order Receipt',
                text: `☕ Dood Cafe Receipt ${formattedOrderId} | Total: ₹${Number(totalAmount).toFixed(2)}`,
              });
              toast.success('🎉 Bill shared successfully!', { id: toastId });
              setSharing(false);
              return;
            }
          }
        } catch (shareErr) {
          // If native share was dismissed or unsupported, smoothly fallback to WhatsApp Web API
          console.log('[Native share fallback to WhatsApp Web API]', shareErr);
        }
      }

      // 2. Structured WhatsApp Direct API Message Stream
      const trackingUrl = `${window.location.origin}/orders`;
      const itemsList = items.map(
        (item, idx) => `${idx + 1}. *${item.name}* × ${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}`
      ).join('\n');

      const message = 
`☕ *DOOD CAFE - OFFICIAL ORDER RECEIPT & INVOICE* ☕
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
🔗 *Live Order Tracking & Bill Portal:*
${trackingUrl}
=================================
✨ _Thank you for dining with Dood Cafe! Enjoy your freshly brewed moments._
🌐 Visit us again soon!`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      toast.success('💬 WhatsApp sharing opened!', { id: toastId });
    } catch (err) {
      console.error('[WhatsApp Share Error]:', err);
      toast.error('Could not open WhatsApp sharing.', { id: toastId });
    } finally {
      setSharing(false);
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
            
            {/* Invoice Cafe Branding Header with Real Brand Logo */}
            <div className="invoice-brand-header">
              <div className="invoice-brand-info">
                <div className="invoice-brand-logo-wrap">
                  <img 
                    src={cafeLogo} 
                    alt="Dood Cafe Logo" 
                    className="invoice-brand-logo-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/cafe_logo.png';
                    }}
                  />
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
              onClick={handleDownloadImage}
              disabled={downloading}
            >
              <Download size={17} />
              <span>{downloading ? 'Exporting PNG...' : 'Download Bill (PNG)'}</span>
            </button>

            <button
              type="button"
              id="share-whatsapp-btn"
              className="btn btn-invoice-whatsapp"
              onClick={handleShareWhatsApp}
              disabled={sharing}
            >
              <Share2 size={17} />
              <span>{sharing ? 'Opening WhatsApp...' : 'Share Bill via WhatsApp'}</span>
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
