import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, ShoppingBag, Bike, CalendarDays, BookOpen, ArrowRight } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';

import cafeLogo from '../images/cafe_logo.png';

/* ── Per-item hero images (fast web-optimized URLs) ───────────── */
const quickBitesImg = '/quick-bites/French fries.jpeg';
const loadedFriesImg = '/loaded-fries/Corn cheese Fries.jpeg';
const crispyChickenImg = '/crispy-chicken/Crispy chicken strips.jpeg';
const burgerImg = '/burger/Crispy Chicken Burger.jpeg';
const sandwichImg = '/sandwich/Veg Grilled Sandwich.jpeg';
const rollAndWrapImg = '/roll-and-wrap/Veg Roll.jpeg';
const koreanImg = '/korean/Korean Ramen veg noodles.jpeg';
const pastaPulaoImg = '/pasta-and-pulao/Alfredo veg Pasta.jpeg';
const shakeImg = '/milkshakes/Lotus Biscoff.jpeg';
const mojitoImg = '/mojitos/Lime & Mint.jpeg';
const dessertsImg = '/desserts-and-beverages/Ice scoop.jpeg';

/* ── Static dining room strip data ─────────────────────────── */
const DINING_ITEMS = [
  { slug: 'quick-bites', label: 'Quick Bites', emoji: '🍿', img: quickBitesImg },
  { slug: 'loaded-fries', label: 'Loaded Fries', emoji: '🍟', img: loadedFriesImg },
  { slug: 'crispy-chicken', label: 'Crispy chicken', emoji: '🍗', img: crispyChickenImg },
  { slug: 'burger', label: 'Burger', emoji: '🍔', img: burgerImg },
  { slug: 'sandwich', label: 'Sandwich', emoji: '🥪', img: sandwichImg },
  { slug: 'roll-wrap', label: 'Roll & Wrap', emoji: '🌯', img: rollAndWrapImg },
  { slug: 'korean', label: 'Korean', emoji: '🍜', img: koreanImg },
  { slug: 'pasta-pulao', label: 'Pasta & Pulao', emoji: '🍛', img: pastaPulaoImg },
  { slug: 'mojito', label: 'Mojito', emoji: '🍹', img: mojitoImg },
  { slug: 'milkshake', label: 'Milkshake', emoji: '🥤', img: shakeImg },
  { slug: 'desserts-beverages', label: 'Desserts & Beverages', emoji: '🍰', img: dessertsImg },
];

const HIGHLIGHTS = [
  { icon: '🌿', title: 'Premium Ingredients', desc: 'Only the finest, freshest produce' },
  { icon: '👨‍🍳', title: 'Expertly Crafted', desc: 'Made by skilled chefs with passion' },
  { icon: '❤️', title: 'Made with Love', desc: 'Every dish tells a story' },
  { icon: '🚀', title: 'Fast Delivery', desc: 'Hot meals right at your door' },
];

/* ═══════════════════════════════════════════════════════════ */
export default function Home() {
  const scrollRef = useRef(null); // ref for the dining-room scroll track

  useEffect(() => {
    document.title = 'Dood Cafe — Mix of Premium & Desi Feel';
    // Warm the category cache so /menu loads faster
    axiosInstance.get('/menu/categories').catch(() => {});
  }, []);

  /* ─────────────────────────────────────────────────────────── */
  return (
    <main className="landing-animated">

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg-pattern" aria-hidden="true" />
        <div className="container hero-container">
          <div className="hero-left animate-fade-up">
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
          The Dining Room — Horizontal Touch-Scroll Strip
      ══════════════════════════════════════════════════════ */}
      <section className="section" id="dining-room">
        <div className="container">

          {/* Header row */}
          <div className="dr-header animate-fade-up">
            <Link to="/menu" style={{ textDecoration: 'none' }}>
              <h2 className="section-title cursive-title" title="Click to browse full menu">
                The Dining Room
              </h2>
            </Link>
          </div>

          {/* ── Touch-scroll track ── */}
          <div
            className="dr-scroll-track"
            ref={scrollRef}
            aria-label="Menu categories scroll strip"
          >
            {DINING_ITEMS.map((item) => (
              <Link
                key={item.slug}
                to={`/menu?category=${item.slug}`}
                className="dr-card"
                id={`dining-${item.slug}`}
                draggable="false"
              >
                <div className="dr-img-wrap">
                  <img
                    src={item.img}
                    alt={item.label}
                    className="dr-img"
                    loading="lazy"
                    draggable="false"
                  />
                  {/* Dark gradient at bottom for text contrast */}
                  <div className="dr-overlay" aria-hidden="true" />
                  {/* Emoji bubble top-right */}
                  <span className="dr-emoji" aria-hidden="true">{item.emoji}</span>
                  {/* Label overlaid on image */}
                  <div className="dr-label">
                    <span className="dr-label-text">{item.label}</span>
                    <span className="dr-label-cta">View Menu →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

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
