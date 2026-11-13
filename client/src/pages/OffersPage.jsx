import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';

/* ── Format endAt in IST ──────────────────────────────────────── */
function fmtIST(isoStr) {
  if (!isoStr) return null;
  return new Date(isoStr).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function OffersPage() {
  const { type } = useParams(); // 'dine-in' | 'delivery'
  const isDineIn = type === 'dine-in';

  const title   = isDineIn ? 'Dine-in Offers' : 'Live Delivery Offers';
  const apiType = isDineIn ? 'dine-in' : 'delivery';
  const menuLink = isDineIn ? '/menu?type=dinein' : '/menu?type=delivery';
  const menuLabel = isDineIn ? 'Order Dine-in' : 'Order Live Delivery';

  const [offers, setOffers]   = useState(null); // null = loading
  const [error, setError]     = useState(false);

  const fetchOffers = useCallback(async () => {
    setError(false);
    try {
      const res = await axiosInstance.get(`/offers?type=${apiType}`);
      setOffers(res.data?.data || []);
    } catch {
      setError(true);
      setOffers([]);
    }
  }, [apiType]);

  // Initial fetch
  useEffect(() => {
    document.title = `${title} · Dood Cafe`;
    fetchOffers();
  }, [title, fetchOffers]);

  // Poll every 60 s so scheduled offers appear / disappear automatically
  useEffect(() => {
    const id = setInterval(fetchOffers, 60000);
    return () => clearInterval(id);
  }, [fetchOffers]);

  return (
    <main className="offers-page">
      <div className="container">

        {/* ── Header ── */}
        <div className="offers-header">
          <h1 className="offers-page-title">
            {isDineIn ? '🍽' : '🛵'} {title}
          </h1>
          <Link
            to={menuLink}
            onClick={() => {
              try {
                sessionStorage.setItem(
                  'doodcafe_order_type',
                  isDineIn ? 'dine-in' : 'delivery'
                );
              } catch (_e) {}
            }}
            className="clay-btn clay-gold min-h-[48px] px-5 py-2.5 font-bold text-sm flex items-center gap-2"
          >
            {menuLabel} <ArrowRight size={16} />
          </Link>
        </div>

        {/* ── Back to home ── */}
        <Link to="/" className="offers-back-link">← Back to Home</Link>

        {/* ── Content ── */}
        {offers === null ? (
          <div className="offers-loading">Loading offers…</div>
        ) : error ? (
          <div className="offers-empty">
            <p>Couldn&apos;t load offers. Please try again later.</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="offers-empty">
            <span className="offers-empty-icon">{isDineIn ? '🍽' : '🛵'}</span>
            <p>No offers right now. Check back soon!</p>
          </div>
        ) : (
          <div className="offers-list">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function OfferCard({ offer }) {
  const validTill = fmtIST(offer.endAt);

  return (
    <div className="offer-card">
      {offer.imageUrl && (
        <div className="offer-card-img-wrap">
          <img
            src={offer.imageUrl}
            alt={offer.title}
            className="offer-card-img"
            loading="lazy"
            decoding="async"
            onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
          />
        </div>
      )}
      <div className="offer-card-body">
        <h2 className="offer-card-title">{offer.title}</h2>
        {offer.description && (
          <p className="offer-card-desc">{offer.description}</p>
        )}
        {validTill && (
          <p className="offer-card-valid">
            Valid till: <strong>{validTill} IST</strong>
          </p>
        )}
      </div>
    </div>
  );
}
