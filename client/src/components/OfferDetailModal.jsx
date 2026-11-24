import { useEffect, useRef, useState } from 'react';
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

  if (!offer) return null;

  const isDineIn = offer.offerType === 'dine-in';
  const menuLink = isDineIn ? '/menu?type=dinein' : '/menu?type=delivery';
  const actionLabel = isDineIn ? 'Order Dine-in' : 'Order Live Delivery';
  const validTill = formatIST(offer.endAt);

  const rawUrl = offer.imageUrl;
  const hasValidImage = Boolean(rawUrl && !imgFailed);
  const resolvedSrc = hasValidImage ? resolveImageUrl(rawUrl) : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-detail-title"
    >
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-stone-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden text-stone-100">

        {/* ── Header with Close Button ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-800 bg-stone-950/70">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {isDineIn ? '🍽 Dine-in Offer' : '🛵 Live Delivery Offer'}
          </span>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close offer details"
            className="clay-btn clay-light min-w-[44px] min-h-[44px] w-11 h-11 p-0 flex items-center justify-center rounded-xl text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 cursor-pointer shadow-sm transition-transform active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto p-5 space-y-4">

          {/* Large Image or Gold Gradient Fallback */}
          {hasValidImage ? (
            <div className="w-full bg-stone-950/80 rounded-xl overflow-hidden p-2 flex items-center justify-center border border-stone-800/80">
              <img
                src={resolvedSrc}
                alt={offer.title}
                loading="lazy"
                decoding="async"
                onError={() => setImgFailed(true)}
                className="w-full h-auto max-h-[340px] sm:max-h-[400px] object-contain rounded-lg"
              />
            </div>
          ) : (
            <div className="w-full aspect-[16/9] min-h-[160px] flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-amber-600/30 via-yellow-700/20 to-stone-900 border border-amber-500/30 rounded-xl">
              <Gift size={32} className="text-amber-400 mb-2" />
              <span className="text-xs uppercase tracking-wider text-amber-300/80 font-semibold">Special Offer</span>
            </div>
          )}

          {/* Title */}
          <div>
            <h2 id="offer-detail-title" className="text-xl sm:text-2xl font-black text-amber-400 leading-tight">
              {offer.title}
            </h2>
          </div>

          {/* Validity Banner */}
          {validTill && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-300 bg-stone-950/60 border border-amber-500/20 px-3.5 py-2.5 rounded-xl">
              <Calendar size={16} className="text-amber-400 flex-shrink-0" />
              <span>
                Valid till: <strong className="text-amber-300 font-semibold">{validTill} IST</strong>
              </span>
            </div>
          )}

          {/* Description with Preserved Line Breaks */}
          {offer.description && (
            <div className="text-sm sm:text-base text-stone-300 leading-relaxed whitespace-pre-line bg-stone-950/40 p-4 rounded-xl border border-stone-800">
              {offer.description}
            </div>
          )}
        </div>

        {/* ── Footer with Order Action Button ── */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/80">
          <Link
            to={menuLink}
            onClick={() => {
              try {
                sessionStorage.setItem('doodcafe_order_type', isDineIn ? 'dine-in' : 'delivery');
              } catch {}
              onClose();
            }}
            className="clay-btn clay-gold w-full min-h-[48px] py-3 px-6 font-bold text-base flex items-center justify-center gap-2 rounded-xl text-stone-950 shadow-lg hover:shadow-amber-500/30 transition-transform active:scale-[0.98]"
          >
            <span>{actionLabel}</span>
            <ArrowRight size={18} />
          </Link>
        </div>

      </div>
    </div>
  );
}
