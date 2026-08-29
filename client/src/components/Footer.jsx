import { Coffee, MapPin, Phone, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        {/* Brand */}
        <div className="footer-brand">
          <div className="footer-logo">
            <Coffee size={22} />
            <span>Dood Cafe</span>
          </div>
          <p className="footer-tagline">Mix of Premium &amp; Desi Feel</p>
          <p className="footer-slogan">Step In · Sip · Relax · Repeat</p>
          <div className="footer-socials">
            <a href="#" aria-label="Instagram" className="social-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a href="#" aria-label="Facebook" className="social-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-col">
          <h4 className="footer-heading">Quick Links</h4>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/menu">Menu</Link></li>
            <li><Link to="/orders">My Orders</Link></li>
            <li><Link to="/login">Login</Link></li>
          </ul>
        </div>

        {/* Menu Categories */}
        <div className="footer-col">
          <h4 className="footer-heading">Our Menu</h4>
          <ul className="footer-links">
            <li><Link to="/menu?category=quick-bites">• Quick Bites</Link></li>
            <li><Link to="/menu?category=loaded-fries">• Loaded Fries</Link></li>
            <li><Link to="/menu?category=burgers">• Burgers</Link></li>
            <li><Link to="/menu?category=sandwiches">• Sandwiches</Link></li>
            <li><Link to="/menu?category=wraps">• Wraps</Link></li>
            <li><Link to="/menu?category=pasta">• Pasta</Link></li>
            <li><Link to="/menu?category=korean-ramen">• Korean Ramen</Link></li>
            <li><Link to="/menu?category=mojitos">• Mojitos</Link></li>
            <li><Link to="/menu?category=milkshakes">• Milkshakes</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div className="footer-col">
          <h4 className="footer-heading">Find Us</h4>
          <ul className="footer-contact">
            <li>
              <MapPin size={15} />
              <span>Racecourse, Dood Cafe</span>
            </li>
            {/* <li>
              <Phone size={15} />
              <span>+91 98765 43210</span>
            </li> */}
            {/* <li>
              <Mail size={15} />
              <span>hello@doodcafe.com</span>
            </li> */}
          </ul>
          {/* <div className="footer-hours">
            <span className="open-dot" />
            Open Daily: 8:00 AM – 11:00 PM
          </div> */}
        </div>
      </div>

      <div className="footer-bottom">
      </div>
    </footer>
  );
}
