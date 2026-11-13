import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, ShoppingBag, Bike, CalendarDays, BookOpen, ArrowRight } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import HeroOffersStrip from '../components/HeroOffersStrip';

import cafeLogo from '../images/cafe_logo.png';

/* ── Cafe Interior Photo Showcase (Slide 1 ... Slide 10) ───────── */
const photoModules = import.meta.glob(
  '/src/images/Cafe photos/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true, import: 'default' }
);

const CAFE_SLIDES = Object.entries(photoModules)
  .filter(([path]) => /Slide\s*\d+/i.test(path))
  .sort(([pathA], [pathB]) => {
    const numA = parseInt(pathA.match(/Slide\s*(\d+)/i)?.[1] || '0', 10);
    const numB = parseInt(pathB.match(/Slide\s*(\d+)/i)?.[1] || '0', 10);
    return numA - numB;
  })
  .map(([, url]) => url);

const HIGHLIGHTS = [
  { icon: '🌿', title: 'Premium Ingredients', desc: 'Only the finest, freshest produce' },
  { icon: '👨‍🍳', title: 'Expertly Crafted', desc: 'Made by skilled chefs with passion' },
  { icon: '❤️', title: 'Made with Love', desc: 'Every dish tells a story' },
  { icon: '🚀', title: 'Fast Delivery', desc: 'Hot meals right at your door' },
];

/* ═══════════════════════════════════════════════════════════ */
export default function Home() {
  const rowRef = useRef(null);

  useEffect(() => {
    document.title = 'Dood Cafe — Mix of Premium & Desi Feel';
    // Warm the category cache so /menu loads faster
    axiosInstance.get('/menu/categories').catch(() => {});
  }, []);

  // Laptop/desktop click-and-drag mouse scroll
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onPointerDown = (e) => {
      // Mouse drag only (native touch handles mobile swipe)
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.pointerType === 'touch') return;

      isDown = true;
      el.classList.add('is-dragging');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      try {
        el.setPointerCapture(e.pointerId);
      } catch (_) {}
    };

    const onPointerMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = x - startX;
      el.scrollLeft = scrollLeft - walk;
    };

    const onPointerUp = (e) => {
      if (!isDown) return;
      isDown = false;
      el.classList.remove('is-dragging');
      try {
        if (el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  /* ─────────────────────────────────────────────────────────── */
  return (
    <main className="landing-animated">

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg-pattern" aria-hidden="true" />
        <div className="container hero-container">
          <div className="hero-left animate-fade-up">
            <HeroOffersStrip />
            <h1 className="hero-title">
              Open Door Cafe
              <span className="hero-title-accent"> — Welcome Always</span>
            </h1>
            <div className="hero-actions">
              <div className="hero-order-block">
                {/* 3 Order Type Buttons */}
                <div className="hero-order-row">
                  <Link
                    to="/menu?type=dinein"
                    onClick={() => {
                      try { sessionStorage.setItem('doodcafe_order_type', 'dine-in'); } catch (_) {}
                    }}
                    className="hero-btn hero-btn-gold"
                  >
                    <UtensilsCrossed className="hero-btn-icon" size={19} />
                    <span className="hero-btn-title">Dine-in</span>
                  </Link>

                  <Link
                    to="/menu?type=takeaway"
                    onClick={() => {
                      try { sessionStorage.setItem('doodcafe_order_type', 'takeaway'); } catch (_) {}
                    }}
                    className="hero-btn hero-btn-gold"
                  >
                    <ShoppingBag className="hero-btn-icon" size={19} />
                    <span className="hero-btn-title">Takeaway</span>
                  </Link>

                  <Link
                    to="/menu?type=delivery"
                    onClick={() => {
                      try { sessionStorage.setItem('doodcafe_order_type', 'delivery'); } catch (_) {}
                    }}
                    className="hero-btn hero-btn-gold"
                  >
                    <Bike className="hero-btn-icon" size={19} />
                    <span className="hero-btn-title">Live Delivery</span>
                  </Link>
                </div>

                {/* Secondary Row: Book Events & Cafe Menu */}
                <div className="hero-secondary-row">
                  <Link
                    to="/book-events"
                    className="hero-btn hero-btn-glass"
                  >
                    <CalendarDays className="hero-btn-icon" size={18} />
                    <span className="hero-btn-title">Book Events</span>
                  </Link>

                  <Link
                    to="/menu"
                    onClick={() => {
                      try { sessionStorage.removeItem('doodcafe_order_type'); } catch (_) {}
                    }}
                    className="hero-btn hero-btn-glass"
                  >
                    <BookOpen className="hero-btn-icon" size={18} />
                    <span className="hero-btn-title">Cafe Menu</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-right animate-fade-up delay-1">
            <div className="hero-logo-badge">
              <div className="hero-logo-ring" aria-hidden="true" />
              <img
                src={cafeLogo}
                alt="Dood Cafe Premium Emblem"
                className="hero-logo-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          Cafe Interior Photo Swipe Row (Slide 1 ... Slide 10)
      ══════════════════════════════════════════════════════ */}
      {CAFE_SLIDES.length > 0 && (
        <section className="section cafe-photo-section" aria-label="Cafe Photos">
          <div className="container">
            <div
              className="cafe-photo-row"
              ref={rowRef}
              aria-label="Cafe interior photo gallery"
            >
              {CAFE_SLIDES.map((src, index) => (
                <div key={src} className="cafe-photo-card">
                  <img
                    src={src}
                    alt=""
                    className="cafe-photo-img"
                    loading={index < 3 ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Why Dood Cafe ── */}
      <section className="section section-tinted">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why Dood Cafe?</h2>
          </div>
          <div className="highlights-grid">
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} className="highlight-card">
                <span className="highlight-icon">{h.icon}</span>
                <h3 className="highlight-title">{h.title}</h3>
                <p className="highlight-desc">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="cta-banner">
        <div className="container cta-content">
          <div>
            <h2 className="cta-title">Ready to order?</h2>
            <p className="cta-sub">Order online for quick &amp; easy takeaway!</p>
          </div>
          <Link to="/menu" className="btn btn-primary btn-lg" id="cta-order-btn">
            Order Now <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
