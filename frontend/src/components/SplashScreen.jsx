import React, { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { categoriesAPI, bannersAPI, productsAPI } from '../api/api';
import '../styles/SplashScreen.css';

// Core local category images that should always be cached immediately
const STATIC_CATEGORY_IMAGES = [
  '/logo.png',
  '/category-images/fruits-vegetables.jpg',
  '/category-images/dairy-bread-eggs.jpg',
  '/category-images/snacks-munchies.jpg',
  '/category-images/cold-drinks-juices.jpg',
  '/category-images/bakery-biscuits.jpg',
  '/category-images/atta-rice-dal.jpg',
  '/category-images/masala-oil-more.jpg',
  '/category-images/breakfast-instant-food.jpg',
  '/category-images/tea-coffee-milk-drinks.jpg',
  '/category-images/sweet-tooth.jpg',
  '/category-images/cleaning-essentials.jpg',
  '/category-images/personal-care.jpg',
  '/category-images/baby-care.jpg',
  '/category-images/pet-care.jpg',
  '/category-images/pharma-wellness.jpg',
];

const resolveAssetUrl = (urlPath) => {
  if (!urlPath) return null;
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) return urlPath;
  return urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
};

export default function SplashScreen({ onFinish, minDuration = 1800, maxTimeout = 4500 }) {
  const [progress, setProgress] = useState(15);
  const [exiting, setExiting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Connecting to Progicart Dark Store...');

  const hasFinishedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const startTime = Date.now();

    const finishSplash = () => {
      if (hasFinishedRef.current) return;
      hasFinishedRef.current = true;
      setProgress(100);
      setStatusMessage('⚡ 10-Minute delivery ready in your area');

      setTimeout(() => {
        if (!isMounted) return;
        setExiting(true);
        setTimeout(() => {
          if (onFinish) onFinish();
        }, 450);
      }, 250);
    };

    // Preload an image into browser cache
    const preloadImage = (src) => {
      return new Promise((resolve) => {
        if (!src) return resolve();
        const img = new Image();
        img.src = src;
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }
      });
    };

    const loadAllHomeAssets = async () => {
      const urlsToLoad = new Set(STATIC_CATEGORY_IMAGES);

      try {
        const [catRes, banRes, prodRes] = await Promise.allSettled([
          categoriesAPI.getAll(),
          bannersAPI.getActive(),
          productsAPI.getAll('', '', '', true)
        ]);

        if (catRes.status === 'fulfilled' && Array.isArray(catRes.value?.data)) {
          catRes.value.data.forEach((c) => {
            const url = resolveAssetUrl(c.image);
            if (url) urlsToLoad.add(url);
          });
        }

        if (banRes.status === 'fulfilled' && Array.isArray(banRes.value?.data)) {
          banRes.value.data.forEach((b) => {
            const url = resolveAssetUrl(b.image);
            if (url) urlsToLoad.add(url);
          });
        }

        if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value?.data)) {
          prodRes.value.data.slice(0, 16).forEach((p) => {
            if (p.image) urlsToLoad.add(resolveAssetUrl(p.image));
          });
        }
      } catch (e) {
        // Silent fallback
      }

      const urlList = Array.from(urlsToLoad);
      const total = urlList.length;
      let loaded = 0;

      // Preload images silently in parallel
      const imagePromises = urlList.map((url) =>
        preloadImage(url).then(() => {
          if (!isMounted) return;
          loaded += 1;
          const pct = Math.min(95, Math.max(15, Math.round((loaded / total) * 95)));
          setProgress(pct);

          if (pct >= 50 && pct < 85) {
            setStatusMessage('⚡ 10-Minute delivery ready in your area');
          } else if (pct >= 85) {
            setStatusMessage('Welcome to Progicart!');
          }
        })
      );

      await Promise.all(imagePromises);

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDuration - elapsed);

      setTimeout(() => {
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

      {/* Bottom Loading Radar & Clean Progress (No technical counts) */}
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
          India's Fastest Instant Delivery • 100% Quality Guaranteed
        </span>
      </div>
    </div>
  );
}
