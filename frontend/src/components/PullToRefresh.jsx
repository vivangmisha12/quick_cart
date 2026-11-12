import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import '../styles/PullToRefresh.css';

const PULL_THRESHOLD = 64;
const MAX_PULL = 104;

/**
 * Mobile touch pull-to-refresh controller.
 * Activates only when the page is scrolled to the top (scrollY <= 2) and
 * dispatches 'progicart:refresh' so pages can re-fetch fresh data cleanly.
 */
const PullToRefresh = () => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startYRef = useRef(null);
  const startXRef = useRef(null);
  const pullingRef = useRef(false);
  const refreshingRef = useRef(false);
  const distanceRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    const finishRefresh = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setRefreshing(false);
      setPullDistance(0);
      distanceRef.current = 0;
    };

    const handleRefreshDone = () => {
      setTimeout(finishRefresh, 280);
    };

    const canStartPull = (target) => {
      if (refreshingRef.current) return false;
      if (window.scrollY > 2) return false;
      if (!target || typeof target.closest !== 'function') return true;
      // Avoid interfering with open modals, drawers, or horizontal sliders
      if (
        target.closest(
          '.modal-backdrop, .login-modal-backdrop, .cart-drawer-backdrop, input, textarea, select'
        )
      ) {
        return false;
      }
      return true;
    };

    const handleTouchStart = (e) => {
      if (e.touches.length !== 1 || !canStartPull(e.target)) {
        startYRef.current = null;
        return;
      }
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      pullingRef.current = false;
    };

    const handleTouchMove = (e) => {
      if (startYRef.current === null || refreshingRef.current) return;
      if (window.scrollY > 2) {
        startYRef.current = null;
        if (pullingRef.current) {
          pullingRef.current = false;
          distanceRef.current = 0;
          setPullDistance(0);
        }
        return;
      }

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const dy = currentY - startYRef.current;
      const dx = Math.abs(currentX - (startXRef.current ?? currentX));

      if (!pullingRef.current) {
        if (dy > 10 && dy > dx * 1.4) {
          pullingRef.current = true;
        } else if (dy < -6 || dx > 18) {
          startYRef.current = null;
          return;
        } else {
          return;
        }
      }

      if (dy > 0) {
        const damped = Math.min(MAX_PULL, Math.round(dy * 0.48));
        distanceRef.current = damped;
        setPullDistance(damped);
      }
    };

    const handleTouchEnd = () => {
      if (!pullingRef.current) {
        startYRef.current = null;
        return;
      }
      pullingRef.current = false;
      startYRef.current = null;

      if (distanceRef.current >= PULL_THRESHOLD) {
        setRefreshing(true);
        setPullDistance(54);
        distanceRef.current = 54;
        window.dispatchEvent(new CustomEvent('progicart:refresh'));
        timeoutRef.current = setTimeout(() => {
          finishRefresh();
        }, 2500);
      } else {
        setPullDistance(0);
        distanceRef.current = 0;
      }
    };

    window.addEventListener('progicart:refresh-done', handleRefreshDone);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      window.removeEventListener('progicart:refresh-done', handleRefreshDone);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  if (pullDistance <= 4 && !refreshing) {
    return null;
  }

  const ready = pullDistance >= PULL_THRESHOLD;
  const progress = Math.min(1, pullDistance / PULL_THRESHOLD);

  return (
    <div
      className="pull-to-refresh-layer"
      style={{
        transform: `translate(-50%, ${Math.max(8, pullDistance - 24)}px)`,
        opacity: refreshing ? 1 : Math.min(1, progress * 1.15),
      }}
      aria-live="polite"
    >
      <div className={`pull-to-refresh-pill ${ready ? 'is-ready' : ''} ${refreshing ? 'is-refreshing' : ''}`}>
        <RefreshCw
          size={15}
          strokeWidth={2.4}
          className="ptr-spinner-icon"
          style={
            !refreshing
              ? { transform: `rotate(${Math.round(progress * 260)}deg)` }
              : undefined
          }
        />
        <span>
          {refreshing ? 'Refreshing...' : ready ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    </div>
  );
};

export default PullToRefresh;

