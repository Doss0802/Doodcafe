import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Share2,
  CheckCircle2,
  X,
  ArrowRight,
  Printer,
} from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import toast from 'react-hot-toast';
import Bill from './Bill';
import { buildWhatsAppBillText } from '../utils/billUtils';
import { printBillOrder } from '../utils/printBill';
import './InvoiceModal.css';

export default function InvoiceModal({ isOpen, onClose, invoiceData }) {
  const invoiceRef = useRef(null);
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [printing, setPrinting] = useState(false);

  if (!isOpen || !invoiceData) return null;

  const { _id, orderNumber, totalAmount = 0 } = invoiceData;

  const formattedOrderId = invoiceData.billNumber
    || (orderNumber ? `#ORD-${String(orderNumber).padStart(4, '0')}` : `#${String(_id || '').slice(-6).toUpperCase() || 'DOOD-001'}`);

  // ── Print Thermal Bill ────────────────────────────────────────────────────
  const handlePrint = async () => {
    setPrinting(true);
    try {
      await printBillOrder(invoiceData);
    } finally {
      setPrinting(false);
    }
  };

  // ── Download Invoice as PNG Image ─────────────────────────────────────────
  const handleDownloadImage = async () => {
    if (!invoiceRef.current) return;

    setDownloading(true);
    const toastId = toast.loading('🖼️ Capturing crisp bill receipt image...');

    try {
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

  // ── Share Bill via WhatsApp (with File Attachment or Unified Receipt Text) ──
  const handleShareWhatsApp = async () => {
    setSharing(true);
    const toastId = toast.loading('💬 Preparing receipt for WhatsApp...');

    try {
      const whatsappText = buildWhatsAppBillText(invoiceData);

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
                title: `Dood Cafe Receipt ${formattedOrderId}`,
                text: whatsappText || `Dood Cafe Receipt ${formattedOrderId} | Total: INR ${Number(totalAmount).toFixed(2)}`,
              });
              toast.success('🎉 Bill shared successfully!', { id: toastId });
              setSharing(false);
              return;
            }
          }
          // Native share dismissed or unsupported — fall through to WhatsApp Web API
        } catch {
          // Native share dismissed or unsupported — fall through silently to WhatsApp Web API
        }
      }

      // 2. Unified Bill Text via WhatsApp URL
      const encodedMessage = encodeURIComponent(whatsappText);
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
          <div className="invoice-paper invoice-paper-thermal" id="doodcafe-invoice-content" ref={invoiceRef}>
            <Bill order={invoiceData} />
          </div>
        </div>

        {/* Modal Action Controls Footer */}
        <div className="invoice-modal-footer">
          <div className="invoice-actions-group">
            <button
              type="button"
              id="print-invoice-btn"
              className="btn btn-invoice-print"
              onClick={handlePrint}
              disabled={printing}
            >
              <Printer size={17} />
              <span>{printing ? 'Preparing...' : 'Print Bill'}</span>
            </button>

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
