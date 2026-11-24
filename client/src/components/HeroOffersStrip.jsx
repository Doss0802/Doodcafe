import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { resolveImageUrl } from '../utils/resolveImageUrl';

/**
 * HeroOffersStrip — 2-column dark glass card shown above "Open Door Cafe" text
 * in the mobile hero. Fetches live offers for dine-in and delivery.
 */
export default function HeroOffersStrip() {
  const [dineIn, setDineIn]     = useState(null); // null = loading
  const [delivery, setDelivery] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        axiosInstance.get('/offers?type=dine-in'),
        axiosInstance.get('/offers?type=delivery'),
      ]);
      setDineIn(r1.data?.data || []);
      setDelivery(r2.data?.data || []);
    } catch {
      setDineIn((prev) => prev || []);
      setDelivery((prev) => prev || []);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    const onFocus = () => {
      fetchAll();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAll();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Poll every 30 seconds while page is open
    const intervalId = setInterval(fetchAll, 30000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(intervalId);
    };
  }, [fetchAll]);

  // Don't render until both loaded — avoids layout shift
  if (dineIn === null || delivery === null) return null;
  // Don't render if neither type has any live offers
  if (dineIn.length === 0 && delivery.length === 0) return null;

  return (
    <div className="hero-offers-strip" role="region" aria-label="Current Offers">
      {/* Left: Dine-in */}
      <Link to="/offers/dine-in" className="hero-offers-half" aria-label="Dine-in offers">
        <span className="hero-offers-heading">🍽 Dine-in Offers</span>
        <OfferPreview offers={dineIn} />
      </Link>

      {/* Gold divider */}
      <div className="hero-offers-divider" aria-hidden="true" />

      {/* Right: Delivery */}
      <Link to="/offers/delivery" className="hero-offers-half" aria-label="Live Delivery offers">
        <span className="hero-offers-heading">🛵 Live Delivery</span>
        <OfferPreview offers={delivery} />
      </Link>
    </div>
  );
}

function OfferPreview({ offers }) {
  const [imgError, setImgError] = useState(false);
  if (!offers || offers.length === 0) {
    return <span className="hero-offers-none">No offers right now</span>;
  }
  const first = offers[0];
  const extra = offers.length - 1;
  const imgSrc = !imgError && first.imageUrl ? resolveImageUrl(first.imageUrl) : null;

  return (
    <div className="flex items-center gap-2 w-full min-w-0">
      {imgSrc && (
        <img
          src={imgSrc}
          alt=""
          aria-hidden="true"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-md object-cover flex-shrink-0 border border-amber-500/30"
          onError={() => setImgError(true)}
        />
      )}
      <span className="hero-offers-title flex-1 min-w-0">
        {first.title}
        {extra > 0 && (
          <span className="hero-offers-more"> +{extra} more</span>
        )}
      </span>
    </div>
  );
}
