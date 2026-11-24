import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles } from 'lucide-react';
import OfferCard from './OfferCard';
import OfferDetailModal from './OfferDetailModal';

/**
 * OffersOverlay — full-screen sheet on mobile, centered large modal on desktop.
 * Displays all live offers in a responsive card grid, handles mobile back button history,
 * body scroll locking, and opens OfferDetailModal on top when an offer card is tapped.
 */
export default function OffersOverlay({ isOpen, onClose, offers = [], triggerRef }) {
  const [selectedOffer, setSelectedOffer] = useState(null);
  const closeBtnRef = useRef(null);

  // Track if this instance pushed history states so we can safely clean up
  const pushedHistoryRef = useRef({ list: false, detail: false });

  /* ── 1. Scroll Lock ────────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  /* ── 2. Focus Management & Keyboard Escape ─────────────────── */
  useEffect(() => {
    if (!isOpen) return;

    // Focus close button on open
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedOffer) {
          // If detail modal is open, close detail first
          handleCloseDetail();
        } else {
          // Otherwise close overlay
          handleCloseList();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const triggerEl = triggerRef?.current;

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      // Return focus to trigger button when overlay closes
      triggerEl?.focus();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedOffer]);

  /* ── 3. Mobile Back Button (History State Management) ─────── */
  useEffect(() => {
    if (!isOpen) {
      pushedHistoryRef.current.list = false;
      pushedHistoryRef.current.detail = false;
      return;
    }

    // Push history state for the overlay if not yet pushed
    if (!pushedHistoryRef.current.list) {
      window.history.pushState({ modal: 'doodcafe-offers-list' }, '');
      pushedHistoryRef.current.list = true;
    }

    const handlePopState = () => {
      if (selectedOffer) {
        // User pressed back while detail was open
        setSelectedOffer(null);
        pushedHistoryRef.current.detail = false;
      } else if (isOpen) {
        // User pressed back while list was open
        pushedHistoryRef.current.list = false;
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, selectedOffer, onClose]);

  // Handle open card detail: push detail history state
  const handleOpenDetail = useCallback((offer) => {
    if (!pushedHistoryRef.current.detail) {
      window.history.pushState({ modal: 'doodcafe-offer-detail' }, '');
      pushedHistoryRef.current.detail = true;
    }
    setSelectedOffer(offer);
  }, []);

  // Handle close detail: pop history if pushed
  const handleCloseDetail = useCallback(() => {
    if (pushedHistoryRef.current.detail) {
      pushedHistoryRef.current.detail = false;
      if (window.history.state?.modal === 'doodcafe-offer-detail') {
        window.history.back();
        return;
      }
    }
    setSelectedOffer(null);
  }, []);

  // Handle close list: pop history if pushed
  const handleCloseList = useCallback(() => {
    if (pushedHistoryRef.current.list) {
      pushedHistoryRef.current.list = false;
      if (window.history.state?.modal === 'doodcafe-offers-list') {
        window.history.back();
        return;
      }
    }
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !selectedOffer) {
          handleCloseList();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Offers"
    >
      <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl flex flex-col bg-stone-900 border-0 sm:border sm:border-amber-500/30 sm:rounded-3xl shadow-2xl overflow-hidden text-stone-100">

        {/* ── Overlay Header ── */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b border-stone-800 bg-stone-950/80 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-amber-400 m-0 leading-tight">
                Offers
              </h1>
              <p className="text-xs text-stone-400 m-0">
                Exclusive deals for Dine-in &amp; Live Delivery
              </p>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={handleCloseList}
            aria-label="Close offers"
            className="clay-btn clay-light min-w-[44px] min-h-[44px] w-11 h-11 p-0 flex items-center justify-center rounded-xl text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 cursor-pointer shadow-sm transition-transform active:scale-95 flex-shrink-0"
          >
            <X size={22} />
          </button>
        </div>

        {/* ── Responsive Grid of Offer Cards ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-stone-950/40">
          {offers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-stone-400">
              <p className="text-base font-semibold">No offers currently active.</p>
              <p className="text-xs text-stone-500 mt-1">Check back soon for fresh deals!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onClick={handleOpenDetail}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Detail Modal on Top ── */}
      {selectedOffer && (
        <OfferDetailModal
          offer={selectedOffer}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
