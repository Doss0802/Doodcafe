import { useState, useRef } from 'react';
import useOffers from '../hooks/useOffers';
import OffersOverlay from './OffersOverlay';

/**
 * HeroOffersBadge — Red starburst "sale" badge with zigzag edge (20 spikes).
 * Positioned absolute at the top-right corner of the hero section.
 * Features:
 * - clip-path 20-spike polygon
 * - Red gradient (#ff3b30 to #c40000)
 * - Bold white uppercase "OFFERS" + small "TAP"
 * - Slight tilt (-8deg)
 * - Wrapper filter drop-shadow red glow + subtle pulse animation
 * - Count bubble on badge edge (white circle with red number)
 * - Hidden completely when no live offers exist
 * - Accessible >= 44px tap target (76px mobile, 98px desktop)
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
      <div className="hero-starburst-wrapper" role="region" aria-label="Special Offers">
        <button
          ref={badgeRef}
          type="button"
          onClick={() => setIsOverlayOpen(true)}
          className="hero-starburst-badge"
          aria-label={`View ${count} special offer${count === 1 ? '' : 's'}`}
          aria-haspopup="dialog"
          aria-expanded={isOverlayOpen}
        >
          <span className="hero-starburst-tap" aria-hidden="true">TAP</span>
          <span className="hero-starburst-title">OFFERS</span>
        </button>

        {/* Count bubble on the badge edge */}
        <span className="hero-starburst-count" aria-hidden="true">
          {count}
        </span>
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
