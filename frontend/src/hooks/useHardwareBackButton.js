import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

/**
 * Android Hardware Back Button & Edge Gesture Handler
 * - Closes open modals, drawers, or dialogs first
 * - Navigates back in history on inner pages
 * - Prompts "Press back again to exit" with 2s cooldown on root/home screen
 */
export const useHardwareBackButton = ({ isRiderMode = false } = {}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showExitToast, setShowExitToast] = useState(false);
  const lastBackPressTimeRef = useRef(0);

  useEffect(() => {
    // Only listen on native platforms (Android / iOS)
    if (!Capacitor.isNativePlatform()) return;

    let toastTimer = null;

    const backListenerPromise = CapacitorApp.addListener('backButton', () => {
      // 1. Check if any modal, drawer, or backdrop is currently open in the DOM
      const isLocationOpen = document.querySelector('.location-modal-backdrop, .location-modal');
      const isCartOpen = document.querySelector('.cart-drawer.open, .cart-drawer-backdrop');
      const isAuthOpen = document.querySelector('.auth-modal-overlay');
      const genericBackdrop = document.querySelector('.modal-backdrop');

      if (isLocationOpen || isCartOpen || isAuthOpen || genericBackdrop) {
        // Find and trigger close button
        const closeBtn = document.querySelector(
          '.location-modal-close, .cart-drawer-close, .auth-modal-close, .modal-close-btn'
        );
        if (closeBtn) {
          closeBtn.click();
          return;
        }
        // Fallback: send Escape keydown
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
        return;
      }

      // 2. Check if user is currently on the root / home screen
      const currentPath = (location.pathname || '').toLowerCase();
      const isRoot = isRiderMode
        ? (currentPath === '/delivery' || currentPath === '/delivery/login' || currentPath === '')
        : (currentPath === '/' || currentPath === '');

      if (!isRoot) {
        // Go back to previous screen
        navigate(-1);
        return;
      }

      // 3. User is on the root screen -> Two-tap exit confirmation
      const now = Date.now();
      if (now - lastBackPressTimeRef.current < 2000) {
        // Double-press within 2 seconds: safely exit the app
        CapacitorApp.exitApp();
      } else {
        lastBackPressTimeRef.current = now;
        setShowExitToast(true);

        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          setShowExitToast(false);
        }, 2000);
      }
    });

    return () => {
      if (toastTimer) clearTimeout(toastTimer);
      backListenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [location.pathname, navigate, isRiderMode]);

  return { showExitToast };
};

export default useHardwareBackButton;
