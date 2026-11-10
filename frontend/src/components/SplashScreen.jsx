import React, { useState, useEffect, useRef } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';
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

const getCategoryImageUrl = (cat) => {
  if (cat?.image) {
    if (cat.image.startsWith('http://') || cat.image.startsWith('https://')) return cat.image;
    if (cat.image.startsWith('/uploads/') || cat.image.startsWith('uploads/')) {
      const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';
      return `${base}${cat.image.startsWith('/') ? '' : '/'}${cat.image}`;
    }
    return cat.image.startsWith('/') ? cat.image : `/${cat.image}`;
  }
  const slug = cat?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `/category-images/${slug}.jpg`;
};

const getBannerImageUrl = (banner) => {
  if (!banner?.image) return null;
  if (banner.image.startsWith('http://') || banner.image.startsWith('https://')) return banner.image;
  const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';
  return `${base}${banner.image.startsWith('/') ? '' : '/'}${banner.image}`;
};

export default function SplashScreen({ onFinish, minDuration = 1800, maxTimeout = 5000 }) {
  const [progress, setProgress] = useState(10);
  const [exiting, setExiting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Connecting to Progicart Dark Store...');
  const [loadedStats, setLoadedStats] = useState({ loaded: 0, total: 0 });

  const hasFinishedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const startTime = Date.now();

    const finishSplash = () => {
      if (hasFinishedRef.current) return;
      hasFinishedRef.current = true;
      setProgress(100);
      setStatusMessage('⚡ All items cached • Ready to deliver in 10 mins!');
      
      setTimeout(() => {
        if (!isMounted) return;
        setExiting(true);
        setTimeout(() => {
          if (onFinish) onFinish();
        }, 450); // match CSS fade-out transition
      }, 250);
    };

    // Preload a single image into browser cache
    const preloadImage = (src) => {
      return new Promise((resolve) => {
        if (!src) return resolve();
        const img = new Image();
        img.src = src;
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // never block on failed single image
        }
      });
    };

    const loadAllHomeAssets = async () => {
      const urlsToLoad = new Set(STATIC_CATEGORY_IMAGES);

      // Fetch dynamic homepage banners, categories, and products from API
      try {
        const [catRes, banRes, prodRes] = await Promise.allSettled([
          categoriesAPI.getAll(),
          bannersAPI.getActive(),
          productsAPI.getAll('', '', '', true) // trending or initial products
        ]);

        if (catRes.status === 'fulfilled' && Array.isArray(catRes.value?.data)) {
          catRes.value.data.forEach((c) => {
            const url = getCategoryImageUrl(c);
            if (url) urlsToLoad.add(url);
          });
        }

        if (banRes.status === 'fulfilled' && Array.isArray(banRes.value?.data)) {
          banRes.value.data.forEach((b) => {
            const url = getBannerImageUrl(b);
            if (url) urlsToLoad.add(url);
          });
        }

        if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value?.data)) {
          prodRes.value.data.slice(0, 16).forEach((p) => {
            if (p.image) urlsToLoad.add(p.image);
            if (Array.isArray(p.images) && p.images[0]) urlsToLoad.add(p.images[0]);
          });
        }
      } catch (e) {
        console.warn('Splash asset fetch notice:', e.message);
      }

      const urlList = Array.from(urlsToLoad);
      const total = urlList.length;
      let loaded = 0;

      if (!isMounted) return;
      setLoadedStats({ loaded: 0, total });
      setStatusMessage(`Preloading fresh products & aisles (0/${total})...`);

      // Preload all images in parallel while updating progress
      const imagePromises = urlList.map((url) =>
        preloadImage(url).then(() => {
          if (!isMounted) return;
          loaded += 1;
          const pct = Math.max(15, Math.round((loaded / total) * 95));
          setProgress(pct);
          setLoadedStats({ loaded, total });
          setStatusMessage(`Preloading fresh products & aisles (${loaded}/${total})...`);
        })
      );

      // Wait until all images finish preloading
      await Promise.all(imagePromises);

      // Enforce smooth minimum display time so animations aren't jarringly brief
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDuration - elapsed);

      setTimeout(() => {
        if (!isMounted) return;
        finishSplash();
      }, remaining);
    };

    // Run preload
    loadAllHomeAssets();

    // Absolute safety timeout so splash never blocks user if internet stalls
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

      {/* Bottom Loading Radar & Progress */}
      <div className="splash-bottom-bar">
        <div className="splash-status-text">
          {progress >= 100 ? (
            <CheckCircle2 size={16} color="#0c831f" />
          ) : (
            <span className="splash-spinner-dot"></span>
          )}
          <span>{statusMessage}</span>
        </div>

        <div className="splash-progress-track">
          <div 
            className="splash-progress-bar"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="splash-counter-row">
          <span className="splash-footer-badge">
            India's Fastest Instant Delivery • v2.4
          </span>
          {loadedStats.total > 0 && (
            <span className="splash-cached-pill">
              {progress >= 100 ? 'All Images Loaded' : `${loadedStats.loaded}/${loadedStats.total} images`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
