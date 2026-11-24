import { useState } from 'react';
import { Gift } from 'lucide-react';
import { resolveImageUrl } from '../utils/resolveImageUrl';

/**
 * OfferCard — displays an offer in the grid.
 * When an image exists, displays ONLY the image (never cropped, object-contain, natural height).
 * When no image exists or if loading fails, falls back to a gold gradient card with the offer title.
 */
export default function OfferCard({ offer, onClick }) {
  const [imgFailed, setImgFailed] = useState(false);

  const rawUrl = offer.imageUrl;
  const hasValidImage = Boolean(rawUrl && !imgFailed);
  const resolvedSrc = hasValidImage ? resolveImageUrl(rawUrl) : null;

  return (
    <button
      type="button"
      onClick={() => onClick?.(offer)}
      aria-label={`View details for offer: ${offer.title}`}
      className="offers-glass-card group relative w-full text-left overflow-hidden cursor-pointer flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 active:scale-[0.98]"
    >
      {hasValidImage ? (
        <div className="w-full flex items-center justify-center p-2.5 min-h-[160px] sm:min-h-[200px]">
          <img
            src={resolvedSrc}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="w-full h-auto max-h-[380px] object-contain rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
          />
        </div>
      ) : (
        /* Glass fallback card with gold title */
        <div className="w-full aspect-[4/3] min-h-[180px] flex flex-col items-center justify-center text-center p-5">
          <div className="w-11 h-11 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mb-3 text-amber-300 shadow-sm group-hover:scale-110 transition-transform">
            <Gift size={22} />
          </div>
          <h3 className="font-black text-amber-300 text-sm sm:text-base leading-snug line-clamp-3 offers-glass-text-shadow">
            {offer.title}
          </h3>
          <span className="mt-3 text-[11px] font-extrabold px-3.5 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/40 uppercase tracking-wider offers-glass-text-shadow">
            {offer.offerType === 'dine-in' ? '🍽 Dine-in' : '🛵 Delivery'}
          </span>
        </div>
      )}
    </button>
  );
}
