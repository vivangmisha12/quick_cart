import React, { useState, useEffect } from 'react';
import { Zap, ChevronRight } from 'lucide-react';
import '../styles/SplashScreen.css';

export default function SplashScreen({ onFinish, duration = 1900 }) {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Locating nearest Dark Store...');

  useEffect(() => {
    const startTime = Date.now();
    const interval = 30; // update every 30ms

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct < 35) {
        setStatusMessage('Connecting to nearest Progicart Dark Store...');
      } else if (pct < 75) {
        setStatusMessage('Checking fresh stock & live riders...');
      } else if (pct < 98) {
        setStatusMessage('⚡ 10-Minute delivery ready in your area');
      } else {
        setStatusMessage('Welcome to Progicart!');
      }

      if (pct >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          handleDismiss();
        }, 150);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [duration]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => {
      if (onFinish) onFinish();
    }, 450); // match fade transition duration
  };

  return (
    <div className={`progicart-splash-overlay ${exiting ? 'splash-exit' : ''}`} role="dialog" aria-modal="true" aria-label="Loading Progicart">
      {/* Background ambient lighting */}
      <div className="splash-bg-glow"></div>
      <div className="splash-speed-line splash-speed-line-1"></div>
      <div className="splash-speed-line splash-speed-line-2"></div>
      <div className="splash-speed-line splash-speed-line-3"></div>

      {/* Top action bar */}
      <div className="splash-top-bar">
        <button 
          className="splash-skip-btn" 
          onClick={handleDismiss}
          type="button"
          aria-label="Skip splash screen"
        >
          Skip <ChevronRight size={14} />
        </button>
      </div>

      {/* Central Brand Showcase */}
      <div className="splash-center-content">
        <div className="splash-logo-card">
          <img 
            src="/logo.png" 
            alt="Progicart" 
            className="splash-logo-img"
          />
          <div className="splash-badge-pill">
            <Zap size={14} className="splash-lightning" fill="#f8cb46" />
            <span>10 MINS DELIVERY</span>
          </div>
        </div>

        <h1 className="splash-tagline">
          Everything delivered in <span>10 minutes</span>
        </h1>

        <div className="splash-categories-ticker">
          <span>Fresh Fruits & Veggies</span>
          <span className="ticker-dot"></span>
          <span>Dairy & Milk</span>
          <span className="ticker-dot"></span>
          <span>Snacks & Munchies</span>
          <span className="ticker-dot"></span>
          <span>Instant Needs</span>
        </div>
      </div>

      {/* Bottom Loading Radar & Progress */}
      <div className="splash-bottom-bar">
        <div className="splash-status-text">
          <span className="splash-spinner-dot"></span>
          <span>{statusMessage}</span>
        </div>

        <div className="splash-progress-track">
          <div 
            className="splash-progress-bar"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <span className="splash-footer-badge">
          India's Fastest Instant Delivery • v2.4
        </span>
      </div>
    </div>
  );
}

