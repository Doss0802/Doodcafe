import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import useOffers from '../hooks/useOffers';
import OfferCard from '../components/OfferCard';
import OfferDetailModal from '../components/OfferDetailModal';

export default function OffersPage() {
  const { type } = useParams(); // 'dine-in' | 'delivery'
  const navigate = useNavigate();
  const isDineIn = type === 'dine-in';

  const title = isDineIn ? 'Dine-in Offers' : 'Live Delivery Offers';
  const apiType = isDineIn ? 'dine-in' : 'delivery';
  const menuLink = isDineIn ? '/menu?type=dinein' : '/menu?type=delivery';
  const menuLabel = isDineIn ? 'Order Dine-in' : 'Order Live Delivery';

  const { offers, loading, error } = useOffers();
  const [selectedOffer, setSelectedOffer] = useState(null);

  const filteredOffers = (offers || []).filter((o) => o.offerType === apiType);

  useEffect(() => {
    document.title = `${title} · Dood Cafe`;
  }, [title]);

  // Keyboard accessibility: Escape key returns to Home page (or closes detail modal)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedOffer) {
          setSelectedOffer(null);
        } else {
          navigate('/');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, selectedOffer]);

  return (
    <main className="offers-page">
      <div className="container">

        {/* ── Top Header with Title and Close (X) Button ── */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{isDineIn ? '🍽' : '🛵'}</span>
            <h1 className="offers-page-title m-0">
              {title}
            </h1>
          </div>
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
            className="clay-btn clay-gold min-h-[44px] px-5 py-2.5 font-bold text-sm flex items-center gap-2 rounded-xl text-stone-950"
          >
            <span>{menuLabel}</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* ── Content ── */}
        {loading && offers.length === 0 ? (
          <div className="offers-loading">Loading offers…</div>
        ) : error ? (
          <div className="offers-empty">
            <p>Couldn&apos;t load offers. Please try again later.</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="offers-empty">
            <span className="offers-empty-icon">{isDineIn ? '🍽' : '🛵'}</span>
            <p>No active {isDineIn ? 'dine-in' : 'live delivery'} offers right now. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 my-4">
            {filteredOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onClick={setSelectedOffer}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Offer Detail Modal ── */}
      {selectedOffer && (
        <OfferDetailModal
          offer={selectedOffer}
          onClose={() => setSelectedOffer(null)}
        />
      )}
    </main>
  );
}
