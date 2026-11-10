import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  ShieldCheck, 
  RotateCcw, 
  Sparkles, 
  Heart 
} from 'lucide-react';
import '../styles/Footer.css';

const POPULAR_CATEGORIES_COL1 = [
  { name: 'Vegetables & Fruits', slug: 'fruits-vegetables' },
  { name: 'Dairy, Bread & Eggs', slug: 'dairy-bread-eggs' },
  { name: 'Snacks & Munchies', slug: 'snacks-munchies' },
  { name: 'Cold Drinks & Juices', slug: 'cold-drinks-juices' },
  { name: 'Breakfast & Instant Food', slug: 'breakfast-instant-food' },
  { name: 'Bakery & Biscuits', slug: 'bakery-biscuits' },
  { name: 'Sweet Tooth & Chocolates', slug: 'sweet-tooth' },
  { name: 'Tea, Coffee & Health Drinks', slug: 'tea-coffee-milk-drinks' },
  { name: 'Paan Corner', slug: 'paan-corner' }
];

const POPULAR_CATEGORIES_COL2 = [
  { name: 'Atta, Rice & Dal', slug: 'atta-rice-dal' },
  { name: 'Masala, Oil & More', slug: 'masala-oil-more' },
  { name: 'Sauces & Spreads', slug: 'sauces-spreads' },
  { name: 'Organic & Healthy Living', slug: 'organic-healthy-living' },
  { name: 'Baby Care Essentials', slug: 'baby-care' },
  { name: 'Pharma & Wellness', slug: 'pharma-wellness' },
  { name: 'Cleaning Essentials', slug: 'cleaning-essentials' },
  { name: 'Home & Office Needs', slug: 'home-office' },
  { name: 'Personal Care & Grooming', slug: 'personal-care' },
  { name: 'Pet Care Essentials', slug: 'pet-care' },
  { name: 'Electronics & Appliances', slug: 'electronics' }
];

const Footer = () => {
  return (
    <footer className="footer-container">
      {/* 1. Value Proposition & Trust Badges Strip */}
      <div className="footer-features">
        <div className="feature-item">
          <div className="feature-icon-wrap green">
            <Zap size={24} />
          </div>
          <div className="feature-text">
            <h4>Superfast 10-Min Delivery</h4>
            <p>Direct from nearest local dark store right to your doorstep</p>
          </div>
        </div>

        <div className="feature-item">
          <div className="feature-icon-wrap yellow">
            <Sparkles size={24} />
          </div>
          <div className="feature-text">
            <h4>Best Prices & Daily Offers</h4>
            <p>Farm-fresh sourcing & brand-direct pricing with zero middlemen</p>
          </div>
        </div>

        <div className="feature-item">
          <div className="feature-icon-wrap blue">
            <ShieldCheck size={24} />
          </div>
          <div className="feature-text">
            <h4>100% Genuine Quality</h4>
            <p>Rigorous quality checks across 5,000+ handpicked products</p>
          </div>
        </div>

        <div className="feature-item">
          <div className="feature-icon-wrap purple">
            <RotateCcw size={24} />
          </div>
          <div className="feature-text">
            <h4>Easy Doorstep Returns</h4>
            <p>Instant refund & hassle-free return policy if not satisfied</p>
          </div>
        </div>
      </div>

      {/* 2. Main Multi-Column Links Section */}
      <div className="footer-main">
        {/* Brand & App Download Column */}
        <div className="footer-col brand-col">
          <Link to="/" className="footer-brand-logo" aria-label="Progicart Home">
            <img src="/logo.png" alt="Progicart" className="footer-logo-img" />
          </Link>
          <p className="footer-brand-desc">
            India's most loved instant grocery delivery app. From farm-fresh vegetables & dairy to munchies, electronics, medicines and household essentials, get everything delivered in 10 minutes with Progicart.
          </p>

          <div className="app-download-box">
            <span className="app-download-heading">Experience Progicart app on mobile:</span>
            <div className="app-buttons-group">
              <a 
                href="https://play.google.com" 
                target="_blank" 
                rel="noreferrer" 
                className="store-button google-play"
              >
                <svg className="store-icon" viewBox="0 0 24 24" width="22" height="22">
                  <path fill="#4285F4" d="M3.6 1.8L13.8 12 3.6 22.2c-.4-.4-.6-1-.6-1.7V3.5c0-.7.2-1.3.6-1.7z"/>
                  <path fill="#FBBC05" d="M17.4 8.4L13.8 12l3.6 3.6 2.4-1.4c.8-.5.8-1.9 0-2.4l-2.4-1.4z"/>
                  <path fill="#EA4335" d="M13.8 12L3.6 1.8c.6-.4 1.4-.4 2.1 0l11.7 6.6-3.6 3.6z"/>
                  <path fill="#34A853" d="M13.8 12l3.6 3.6-11.7 6.6c-.7.4-1.5.4-2.1 0L13.8 12z"/>
                </svg>
                <div className="store-btn-text">
                  <span className="store-sub">GET IT ON</span>
                  <strong className="store-main">Google Play</strong>
                  <span className="store-rating">4.7 ★ (1M+ reviews)</span>
                </div>
              </a>

              <a 
                href="https://apple.com/app-store" 
                target="_blank" 
                rel="noreferrer" 
                className="store-button apple-store"
              >
                <svg className="store-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.57.65-.98 1.71-.85 2.73.99.08 2.02-.48 2.55-1.23z"/>
                </svg>
                <div className="store-btn-text">
                  <span className="store-sub">Download on the</span>
                  <strong className="store-main">App Store</strong>
                  <span className="store-rating">4.8 ★ (500K+ reviews)</span>
                </div>
              </a>
            </div>
          </div>

          <div className="social-links-box">
            <span className="social-label">Follow Us:</span>
            <div className="social-icons-row">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="social-circle-btn" aria-label="Instagram">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="social-circle-btn" aria-label="X (Twitter)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="social-circle-btn" aria-label="Facebook">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.779 0-1.255.195-1.513.585-.246.39-.371 1.054-.371 1.992v1.403h3.708l-.513 3.667h-3.195v7.98H9.101z"/>
                </svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="social-circle-btn" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37h2.79V10.9H6.46M7.86 6.84a1.63 1.63 0 1 0 1.63 1.63 1.63 1.63 0 0 0-1.63-1.63z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Useful Links Column */}
        <div className="footer-col">
          <h4>Useful Links</h4>
          <ul>
            <li><Link to="/products">Browse All Products</Link></li>
            <li><Link to="/orders">My Orders</Link></li>
            <li><Link to="/delivery" style={{ color: '#0c831f', fontWeight: '700' }}>🏍️ Delivery Partner App</Link></li>
            <li><Link to="/admin/login" style={{ color: '#0c831f', fontWeight: '700' }}>🔒 Admin Portal</Link></li>
            <li><Link to="/wishlist">My Wishlist</Link></li>
            <li><Link to="/addresses">Saved Addresses</Link></li>
            <li><Link to="/profile">My Account</Link></li>
            <li><Link to="/info/about-us">About Progicart</Link></li>
            <li><Link to="/info/contact-us">Contact Support</Link></li>
          </ul>
        </div>

        {/* Customer Care & Policies Column */}
        <div className="footer-col">
          <h4>Customer Care</h4>
          <ul>
            <li><Link to="/info/faqs">Help & FAQs</Link></li>
            <li><Link to="/info/delivery-info">Delivery Standards</Link></li>
            <li><Link to="/info/privacy-policy">Privacy Policy</Link></li>
            <li><Link to="/info/terms-and-conditions">Terms & Conditions</Link></li>
            <li><Link to="/info/cancellation-and-refunds">Cancellation & Refunds</Link></li>
            <li><Link to="/info/contact-us">24x7 Customer Support</Link></li>
          </ul>
        </div>

        {/* Popular Categories Column 1 (Fresh & Daily) */}
        <div className="footer-col">
          <h4>Fresh & Daily</h4>
          <ul>
            {POPULAR_CATEGORIES_COL1.map((cat) => (
              <li key={cat.slug}>
                <Link to={`/products?search=${encodeURIComponent(cat.name)}`}>
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Popular Categories Column 2 (Pantry & Household) */}
        <div className="footer-col">
          <h4>Pantry & Household</h4>
          <ul>
            {POPULAR_CATEGORIES_COL2.map((cat) => (
              <li key={cat.slug}>
                <Link to={`/products?search=${encodeURIComponent(cat.name)}`}>
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Copyright & Legal Trademark Strip */}
      <div className="footer-bottom">
        <div className="legal-notes">
          <p className="footer-copyright">
            © {new Date().getFullYear()} Progicart Technologies Private Limited. All rights reserved.
          </p>
          <p className="trademark-notice">
            "Progicart" is an instant grocery & essentials delivery platform providing fast 10-minute doorstep service.
          </p>
        </div>
        <div className="footer-made-badge">
          <span>Crafted with</span>
          <Heart size={14} fill="#e23744" color="#e23744" />
          <span>for India • 10-Minute Delivery</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
