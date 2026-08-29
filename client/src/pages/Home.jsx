import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Coffee, ChevronLeft } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { categoryImages } from '../utils/imageMapper';

import cafeLogo from '../images/cafe_logo.png';

/* ── Per-item hero images (fast web-optimized URLs) ───────────── */
const quickBitesImg = '/quick-bites/French fries.jpeg';
const teaImg = 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80';
const burgerImg = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80';
const pastaImg = 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80';
const ramenImg = 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80';
const shakeImg = 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80';
const sandwichImg = 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80';
const wrapImg = 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80';
const mojitoImg = 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80';

/* ── Static dining room strip data ─────────────────────────── */
const DINING_ITEMS = [
  { slug: 'quick-bites', label: 'Quick Bites', emoji: '🍟', img: quickBitesImg },
  { slug: 'tea', label: 'Tea & Chai', emoji: '🍵', img: teaImg },
  { slug: 'burgers', label: 'Burgers', emoji: '🍔', img: burgerImg },
  { slug: 'pasta', label: 'Pasta', emoji: '🍝', img: pastaImg },
  { slug: 'korean-ramen', label: 'Korean Ramen', emoji: '🍜', img: ramenImg },
  { slug: 'milkshakes', label: 'Milkshakes', emoji: '🥤', img: shakeImg },
  { slug: 'sandwiches', label: 'Sandwiches', emoji: '🥪', img: sandwichImg },
  { slug: 'wraps', label: 'Wraps', emoji: '🌯', img: wrapImg },
  { slug: 'mojitos', label: 'Mojitos', emoji: '🍹', img: mojitoImg },
];

const HIGHLIGHTS = [
  { icon: '🌿', title: 'Premium Ingredients', desc: 'Only the finest, freshest produce' },
  { icon: '👨‍🍳', title: 'Expertly Crafted', desc: 'Made by skilled chefs with passion' },
  { icon: '❤️', title: 'Made with Love', desc: 'Every dish tells a story' },
  { icon: '🚀', title: 'Fast Delivery', desc: 'Hot meals right at your door' },
];

const SERVICES = [
  { icon: '📦', label: 'Takeaway', desc: 'Order & pick up in minutes' },
  { icon: '🛵', label: 'Delivery', desc: 'Right to your doorstep' },
];

/* ═══════════════════════════════════════════════════════════ */
export default function Home() {
  /* ── Backend state (keep all API calls intact) ── */
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategorySlug, setActiveCategorySlug] = useState('quick-bites');
  const navigate = useNavigate();
  const scrollRef = useRef(null);   // ref for the scroll track

  /* ── Fetch categories from backend on mount ── */
  useEffect(() => {
    document.title = 'Dood Cafe — Mix of Premium & Desi Feel';
    const fetchData = async () => {
      try {
        const catRes = await axiosInstance.get('/menu/categories');
        setCategories(catRes.data.data);
      } catch (err) {
        console.error('Category fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* ── Scroll helpers ── */
  const handleOrderNowClick = (e) => {
    e.preventDefault();
    document.getElementById('dining-room')?.scrollIntoView({ behavior: 'smooth' });
  };

  /** Scroll the strip left/right by one card width */
  const scrollStrip = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = el.querySelector('.dr-card')?.offsetWidth ?? 180;
    el.scrollBy({ left: dir * (cardW + 16), behavior: 'smooth' });
  };

  /* Kept: activeCategoryImages still available for future use */
  const activeCategoryImages = categoryImages[activeCategorySlug] || categoryImages['quick-bites'];

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
              <a
                href="#dining-room"
                id="hero-order-btn"
                className="btn btn-primary btn-lg"
                onClick={handleOrderNowClick}
              >
                Order Now <ArrowRight size={18} />
              </a>
              <Link to="/menu" className="btn btn-outline btn-lg" id="hero-view-menu-btn">
                View Menu
              </Link>
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
            <p className="cta-sub">Order online for quick & easy takeaway!</p>
          </div>
          <Link to="/menu" className="btn btn-primary btn-lg" id="cta-order-btn">
            Order Now <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
