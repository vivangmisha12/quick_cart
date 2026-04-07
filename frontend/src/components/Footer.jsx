import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { categoriesAPI } from '../api/api';
import '../styles/Footer.css';

const Footer = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      setCategories(res.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setLoading(false);
    }
  };

  // Divide categories into sections
  const categoriesSection = categories.slice(0, 6);
  const moreCategoriesSection = categories.slice(6, 12);
  const lifestyleSection = categories.slice(12, 18);

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Useful Links Section */}
        <div className="footer-section">
          <h3>Useful Links</h3>
          <ul>
            <li><Link to="#">Blog</Link></li>
            <li><Link to="#">Privacy</Link></li>
            <li><Link to="#">Terms</Link></li>
            <li><Link to="#">FAQs</Link></li>
            <li><Link to="#">Security</Link></li>
            <li><Link to="#">Contact</Link></li>
          </ul>
        </div>

        {/* Partner Section */}
        <div className="footer-section">
          <h3>Partners</h3>
          <ul>
            <li><Link to="#">Partner</Link></li>
            <li><Link to="#">Franchise</Link></li>
            <li><Link to="#">Seller</Link></li>
            <li><Link to="#">Warehouse</Link></li>
            <li><Link to="#">Deliver</Link></li>
            <li><Link to="#">Resources</Link></li>
          </ul>
        </div>

        {/* Categories Section - Dynamic */}
        {categoriesSection.length > 0 && (
          <div className="footer-section">
            <h3>Categories</h3>
            <ul>
              {categoriesSection.map((cat) => (
                <li key={cat._id}>
                  <Link to={`/products?category=${cat._id}`}>{cat.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* More Categories Section - Dynamic */}
        {moreCategoriesSection.length > 0 && (
          <div className="footer-section">
            <h3>More Categories</h3>
            <ul>
              {moreCategoriesSection.map((cat) => (
                <li key={cat._id}>
                  <Link to={`/products?category=${cat._id}`}>{cat.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Lifestyle Section - Dynamic */}
        {lifestyleSection.length > 0 && (
          <div className="footer-section">
            <h3>Lifestyle</h3>
            <ul>
              {lifestyleSection.map((cat) => (
                <li key={cat._id}>
                  <Link to={`/products?category=${cat._id}`}>{cat.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Download & Social Section */}
      <div className="footer-bottom">
        <div className="download-section">
          <span className="download-text">Download App</span>
          <div className="app-buttons">
            <a href="#" className="app-btn app-store">
              🍎 App Store
            </a>
            <a href="#" className="app-btn google-play">
              📱 Google Play
            </a>
          </div>
        </div>

        {/* Social Media */}
        <div className="social-links">
          <a href="#" className="social-icon">f</a>
          <a href="#" className="social-icon">𝕏</a>
          <a href="#" className="social-icon">📷</a>
          <a href="#" className="social-icon">in</a>
          <a href="#" className="social-icon">⚡</a>
        </div>
      </div>

      {/* Copyright */}
      <div className="footer-copyright">
        <p>© Quick Cart 2024-2026. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;