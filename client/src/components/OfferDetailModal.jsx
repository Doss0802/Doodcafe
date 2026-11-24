import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, ArrowRight, Calendar, Gift } from 'lucide-react';
import { resolveImageUrl } from '../utils/resolveImageUrl';

/* ── Format endAt date/time in IST ───────────────────────────── */
function formatIST(isoStr) {
  if (!isoStr) return null;
  try {
    return new Date(isoStr).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return null;
  }
}

/**
 * OfferDetailModal — modal dialog showing full offer details.
 * Contains large image, title, full description with preserved line breaks,
 * order type badge, IST validity, and contextual order action button.
 */
export default function OfferDetailModal({ offer, onClose }) {
  const closeBtnRef = useRef(null);
  const [imgFailed, setImgFailed] = useState(false);

  // Focus trap / initial focus on open
  useEffect(() => {
    closeBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!offer || typeof document === 'undefined') return null;

  const isDineIn = offer.offerType === 'dine-in';
  const menuLink = isDineIn ? '/menu?type=dinein' : '/menu?type=delivery';
  const actionLabel = isDineIn ? 'Order Dine-in' : 'Order Live Delivery';
  const validTill = formatIST(offer.endAt);

  const rawUrl = offer.imageUrl;
  const hasValidImage = Boolean(rawUrl && !imgFailed);
  const resolvedSrc = hasValidImage ? resolveImageUrl(rawUrl) : null;

  return createPortal(
    <div
      className="offers-glass-backdrop offers-glass-backdrop-detail animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-detail-title"
    >
      <div className="offers-glass-panel relative w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden text-stone-100">

        {/* ── Header with Type Badge & Close Button ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/20 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-400/20 text-amber-200 border border-amber-400/40 uppercase tracking-wider offers-glass-text-shadow">
            {isDineIn ? '🍽 Dine-in Offer' : '🛵 Live Delivery Offer'}
          </span>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close offer details"
            className="offers-glass-close-btn flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">

          {/* Large Image or Glass Fallback */}
          {hasValidImage ? (
            <div className="w-full rounded-2xl overflow-hidden p-2 flex items-center justify-center border border-white/20 bg-black/10">
              <img
                src={resolvedSrc}
                alt={offer.title}
                loading="lazy"
                decoding="async"
                onError={() => setImgFailed(true)}
                className="w-full h-auto max-h-[340px] sm:max-h-[400px] object-contain rounded-xl"
              />
            </div>
          ) : (
            <div className="w-full aspect-[16/9] min-h-[160px] flex flex-col items-center justify-center text-center p-6 border border-white/20 rounded-2xl bg-black/10">
              <Gift size={32} className="text-amber-300 mb-2 drop-shadow-md" />
              <span className="text-xs uppercase tracking-wider text-amber-200 font-extrabold offers-glass-text-shadow">Special Offer</span>
            </div>
          )}

          {/* Title */}
          <div>
            <h2 id="offer-detail-title" className="offers-glass-title text-xl sm:text-2xl font-black leading-tight m-0">
              {offer.title}
            </h2>
          </div>

          {/* Validity Banner */}
          {validTill && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-100 bg-black/25 border border-amber-400/35 px-4 py-3 rounded-2xl offers-glass-text-shadow">
              <Calendar size={16} className="text-amber-300 flex-shrink-0" />
              <span>
                Valid till: <strong className="text-amber-300 font-bold">{validTill} IST</strong>
              </span>
            </div>
          )}

          {/* Description with Preserved Line Breaks */}
          {offer.description && (
            <div className="text-sm sm:text-base text-stone-100 leading-relaxed whitespace-pre-line bg-black/25 p-4 rounded-2xl border border-white/20 offers-glass-text-shadow">
              {offer.description}
            </div>
          )}
        </div>

        {/* ── Footer with Order Action Button ── */}
        <div className="p-4 border-t border-white/20 flex-shrink-0">
          <Link
            to={menuLink}
            onClick={() => {
              try {
                sessionStorage.setItem('doodcafe_order_type', isDineIn ? 'dine-in' : 'delivery');
              } catch {}
              onClose();
            }}
            className="clay-btn clay-gold w-full min-h-[48px] py-3 px-6 font-extrabold text-base flex items-center justify-center gap-2 rounded-2xl text-stone-950 shadow-lg hover:shadow-amber-500/30 transition-transform active:scale-[0.98]"
          >
            <span>{actionLabel}</span>
            <ArrowRight size={18} />
          </Link>
        </div>

      </div>
    </div>,
    document.body
  );
}
