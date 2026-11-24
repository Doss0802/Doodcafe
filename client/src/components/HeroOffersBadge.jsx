import { useState, useRef } from 'react';
import { Gift } from 'lucide-react';
import useOffers from '../hooks/useOffers';
import OffersOverlay from './OffersOverlay';

/**
 * HeroOffersBadge — Single gold clay pill badge displayed directly above
 * "OPEN DOOR CAFE — Welcome Always" in the hero.
 * Shows a gift icon, "Offers" label, and a small count bubble.
 * Hidden completely when there are no live offers.
 * Features a subtle gold pulse/glow animation (disabled under prefers-reduced-motion).
 */
export default function HeroOffersBadge() {
  const { offers } = useOffers();
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const badgeRef = useRef(null);

  // Hide completely when no live offers exist
  if (!offers || offers.length === 0) {
    return null;
  }

  const count = offers.length;

  return (
    <>
      <div className="hero-offers-badge-wrapper" role="region" aria-label="Special Offers">
        <button
          ref={badgeRef}
          type="button"
          onClick={() => setIsOverlayOpen(true)}
          className="hero-offers-badge clay-btn clay-gold"
          aria-label={`View ${count} special offer${count === 1 ? '' : 's'}`}
          aria-haspopup="dialog"
          aria-expanded={isOverlayOpen}
        >
          <div className="hero-offers-badge-icon" aria-hidden="true">
            <Gift size={18} className="text-amber-950" />
          </div>
          <span className="hero-offers-badge-label">Offers</span>
          <span className="hero-offers-badge-count" aria-hidden="true">
            {count}
          </span>
        </button>
      </div>

      <OffersOverlay
        isOpen={isOverlayOpen}
        onClose={() => setIsOverlayOpen(false)}
        offers={offers}
        triggerRef={badgeRef}
      />
    </>
  );
}
