import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

/**
 * HeroOffersStrip — 2-column dark glass card shown above "Open Door Cafe" text
 * in the mobile hero. Fetches live offers for dine-in and delivery.
 */
export default function HeroOffersStrip() {
  const [dineIn, setDineIn]     = useState(null); // null = loading
  const [delivery, setDelivery] = useState(null);

  useEffect(() => {
    let alive = true;

    async function fetchAll() {
      try {
        const [r1, r2] = await Promise.all([
          axiosInstance.get('/offers?type=dine-in'),
          axiosInstance.get('/offers?type=delivery'),
        ]);
        if (!alive) return;
        setDineIn(r1.data?.data || []);
        setDelivery(r2.data?.data || []);
      } catch {
        if (!alive) return;
        setDineIn([]);
        setDelivery([]);
      }
    }

    fetchAll();
    return () => { alive = false; };
  }, []);

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
  if (!offers || offers.length === 0) {
    return <span className="hero-offers-none">No offers right now</span>;
  }
  const first = offers[0];
  const extra = offers.length - 1;
  return (
    <span className="hero-offers-title">
      {first.title}
      {extra > 0 && (
        <span className="hero-offers-more"> +{extra} more</span>
      )}
    </span>
  );
}
