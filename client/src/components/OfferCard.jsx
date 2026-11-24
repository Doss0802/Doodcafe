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
      className="group relative w-full text-left rounded-2xl overflow-hidden border border-amber-500/20 bg-stone-900/90 hover:border-amber-400/60 shadow-md hover:shadow-amber-500/20 transition-all duration-200 cursor-pointer flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950 active:scale-[0.98]"
    >
      {hasValidImage ? (
        <div className="w-full bg-stone-950/70 flex items-center justify-center p-2 min-h-[160px] sm:min-h-[200px]">
          <img
            src={resolvedSrc}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="w-full h-auto max-h-[380px] object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.01]"
          />
        </div>
      ) : (
        /* Gold gradient fallback card with title */
        <div className="w-full aspect-[4/3] min-h-[180px] flex flex-col items-center justify-center text-center p-5 bg-gradient-to-br from-amber-600/30 via-yellow-700/20 to-stone-900">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-3 text-amber-400 group-hover:scale-110 transition-transform">
            <Gift size={20} />
          </div>
          <h3 className="font-extrabold text-stone-100 text-sm sm:text-base leading-snug line-clamp-3">
            {offer.title}
          </h3>
          <span className="mt-3 text-[11px] font-bold px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
            {offer.offerType === 'dine-in' ? '🍽 Dine-in' : '🛵 Delivery'}
          </span>
        </div>
      )}
    </button>
  );
}
