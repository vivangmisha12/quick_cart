import React, { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { bootstrapHomeData, preloadImage } from '../utils/homeBootstrap';
import '../styles/SplashScreen.css';

const IS_RIDER_APP = import.meta.env.VITE_APP_MODE === 'rider';

export default function SplashScreen({ onFinish, minDuration = 1800, maxTimeout = 4500 }) {
  const [progress, setProgress] = useState(15);
  const [exiting, setExiting] = useState(false);

  const hasFinishedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const startTime = Date.now();

    const finishSplash = () => {
      if (hasFinishedRef.current) return;
      hasFinishedRef.current = true;
      setProgress(100);

      setTimeout(() => {
        if (!isMounted) return;
        setExiting(true);
        setTimeout(() => {
          if (onFinish) onFinish();
        }, 450);
      }, 250);
    };

    let delayTimer = null;

    const loadAllHomeAssets = async () => {
      if (IS_RIDER_APP) {
        await preloadImage('/logo.png');
        const remaining = Math.max(0, minDuration - (Date.now() - startTime));
        delayTimer = setTimeout(() => {
          if (!isMounted) return;
          finishSplash();
        }, remaining);
        return;
      }

      try {
        await bootstrapHomeData({
          onProgress: (pct) => {
            if (!isMounted) return;
            setProgress((prev) => Math.max(prev, pct));
          },
        });
      } catch (err) {
        console.warn('Splash preload warning:', err);
      }

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDuration - elapsed);

      delayTimer = setTimeout(() => {
        if (!isMounted) return;
        finishSplash();
      }, remaining);
    };

    loadAllHomeAssets();

    const safetyTimer = setTimeout(() => {
      if (!isMounted) return;
      finishSplash();
    }, maxTimeout);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (delayTimer) clearTimeout(delayTimer);
    };
  }, [minDuration, maxTimeout, onFinish]);

  return (
    <div 
      className={`progicart-splash-overlay ${exiting ? 'splash-exit' : ''}`} 
      role="dialog" 
      aria-modal="true" 
      aria-label="Loading Progicart"
    >
      {/* Background ambient lighting & speed effects */}
      <div className="splash-bg-glow"></div>
      <div className="splash-speed-line splash-speed-line-1"></div>
      <div className="splash-speed-line splash-speed-line-2"></div>
      <div className="splash-speed-line splash-speed-line-3"></div>

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
            <span>{IS_RIDER_APP ? 'RIDER FLEET APP' : '10 MINS DELIVERY'}</span>
          </div>
        </div>

        <h1 className="splash-tagline">
          {IS_RIDER_APP ? (
            <>
              Progicart Partner <span>Delivery Console</span>
            </>
          ) : (
            <>
              Everything delivered in <span>10 minutes</span>
            </>
          )}
        </h1>

        <div className="splash-categories-ticker">
          {IS_RIDER_APP ? (
            <>
              <span>Live Order Alerts</span>
              <span className="ticker-dot"></span>
              <span>GPS Route Sync</span>
              <span className="ticker-dot"></span>
              <span>Fast Payouts</span>
              <span className="ticker-dot"></span>
              <span>Dark Store Hub</span>
            </>
          ) : (
            <>
              <span>Fresh Fruits & Veggies</span>
              <span className="ticker-dot"></span>
              <span>Dairy & Milk</span>
              <span className="ticker-dot"></span>
              <span>Snacks & Munchies</span>
              <span className="ticker-dot"></span>
              <span>Instant Needs</span>
            </>
          )}
        </div>
      </div>

      {/* Bottom Loading Radar & Clean Progress */}
      <div className="splash-bottom-bar">
        <div className="splash-progress-track">
          <div 
            className="splash-progress-bar"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <span className="splash-footer-badge">
          {IS_RIDER_APP
            ? 'Progicart Delivery Partner Network • Dedicated Rider App'
            : "India's Fastest Instant Delivery • 100% Quality Guaranteed"}
        </span>
      </div>
    </div>
  );
}
