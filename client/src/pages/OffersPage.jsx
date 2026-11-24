import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { resolveImageUrl } from '../utils/resolveImageUrl';

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
  const navigate = useNavigate();
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

  // Keyboard accessibility: Escape key returns to Home page
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Poll every 30 s so scheduled offers appear / disappear automatically
  useEffect(() => {
    const id = setInterval(fetchOffers, 30000);
    return () => clearInterval(id);
  }, [fetchOffers]);

  return (
    <main className="offers-page">
      <div className="container">

        {/* ── Top Header with Title and Close (X) Button ── */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <h1 className="offers-page-title m-0 flex-1">
            {isDineIn ? '🍽' : '🛵'} {title}
          </h1>
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Close offers and return to home"
            title="Close (Esc)"
            className="clay-btn clay-light min-h-[44px] min-w-[44px] w-11 h-11 p-0 flex items-center justify-center rounded-xl text-stone-700 hover:text-stone-900 flex-shrink-0 cursor-pointer shadow-sm transition-transform active:scale-95"
          >
            <X size={22} />
          </button>
        </div>

        {/* ── Sub Navigation Row ── */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <Link to="/" className="offers-back-link mb-0">← Back to Home</Link>
          <Link
            to={menuLink}
            onClick={() => {
              try {
                sessionStorage.setItem(
                  'doodcafe_order_type',
                  isDineIn ? 'dine-in' : 'delivery'
                );
              } catch {}
            }}
            className="clay-btn clay-gold min-h-[44px] px-5 py-2.5 font-bold text-sm flex items-center gap-2"
          >
            {menuLabel} <ArrowRight size={16} />
          </Link>
        </div>

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
  const [imgError, setImgError] = useState(false);
  const validTill = fmtIST(offer.endAt);
  const imgSrc = !imgError && offer.imageUrl ? resolveImageUrl(offer.imageUrl) : null;

  return (
    <div className="offer-card">
      {imgSrc && (
        <div className="offer-card-img-wrap">
          <img
            src={imgSrc}
            alt={offer.title}
            className="offer-card-img"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
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
