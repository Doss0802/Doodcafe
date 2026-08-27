import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, LogOut, User, ClipboardList, Coffee, UserCircle2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import toast from 'react-hot-toast';
import cafeLogo from '../images/cafe_logo.png';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { items, toggleCart } = useCartStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setProfileOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    setProfileOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Menu', path: '/menu' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar">
      <div className="navbar-inner container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={() => setMobileOpen(false)}>
          {/* Desktop: yellow cup icon */}
          <div className="logo-icon logo-icon-desktop">
            <Coffee size={20} />
          </div>
          {/* Mobile: cafe logo image */}
          <div className="logo-icon-mobile">
            <img src={cafeLogo} alt="Dood Cafe" className="navbar-mobile-logo-img" />
          </div>
          <div className="logo-text">
            <span className="logo-main">Dood</span>
            <span className="logo-sub">Cafe</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="navbar-links">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${isActive(link.path) ? 'nav-link-active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="navbar-actions">
          {/* Cart — always visible on all screen sizes */}
          <button
            id="cart-toggle-btn"
            className="cart-btn"
            onClick={toggleCart}
            aria-label="Open cart"
          >
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <span className="cart-badge">{totalItems}</span>
            )}
          </button>

          {/* Desktop auth section (hidden on mobile via CSS) */}
          {isAuthenticated ? (
            <div
              className={`user-menu auth-btns${profileOpen ? ' dropdown-open' : ''}`}
              ref={profileRef}
            >
              <button
                id="profile-avatar-btn"
                className="user-avatar"
                onClick={() => setProfileOpen((o) => !o)}
                aria-haspopup="true"
                aria-expanded={profileOpen}
                aria-label="Profile menu"
              >
                <User size={16} />
              </button>
              <div className="user-dropdown" role="menu">
                {/* ── Mini profile card ── */}
                <div className="user-dropdown-profile">
                  <div className="udp-avatar">
                    <User size={18} />
                  </div>
                  <div className="udp-info">
                    <span className="udp-name">{user?.name}</span>
                    <span className="udp-email">{user?.email}</span>
                    {user?.phone && (
                      <span className="udp-phone">{user.phone}</span>
                    )}
                  </div>
                </div>
                <div className="udp-divider" />
                <Link
                  to="/profile"
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                >
                  <UserCircle2 size={14} />
                  Profile
                </Link>
                <Link
                  to="/orders"
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                >
                  <ClipboardList size={14} />
                  My Orders
                </Link>
                <Link
                  to="/admin"
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                >
                  <Coffee size={14} />
                  Admin Panel
                </Link>
                <button
                  onClick={handleLogout}
                  className="dropdown-item dropdown-logout"
                  role="menuitem"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-btns">
              <Link to="/login" className="btn btn-ghost-sm">Login</Link>
              <Link to="/register" className="btn btn-primary-sm">Sign Up</Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileOpen && (
        <div className="mobile-menu">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`mobile-nav-link ${isActive(link.path) ? 'nav-link-active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                Profile
              </Link>
              <Link to="/orders" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                My Orders
              </Link>
              <Link to="/admin" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                Admin Panel
              </Link>
              <button className="mobile-nav-link mobile-logout" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Login</Link>
              <Link to="/register" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
