import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Tag,
  Bell,
  Zap,
  Gift,
  Heart,
  ShoppingCart,
  User,
  MapPin,
  Search,
  Mic,
  BadgePercent,
  ChevronRight,
  ChevronDown,
  Crosshair,
  X,
  Check,
  TrendingUp,
  ClipboardList,
  LogOut,
  ShieldAlert,
  Bike,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocationContext } from '../context/LocationContext';
import { userAddressesAPI } from '../api/api';
import TopCategoryStrip from './TopCategoryStrip';
import '../styles/Navbar.css';

const TRENDING_SEARCHES = ['Milk', 'Curd', 'Bread', 'Potato Chips', 'Cold Drinks', 'Chocolate', 'Onion'];
const IS_INVALID_GATEWAY_ADDR = (street) => {
  const s = (street || '').toLowerCase();
  return s.includes('jalandhar') || s.includes('punjab') || s.includes('jandu singha');
};

const Navbar = () => {
  const { token, logout, user, openAuthModal } = useAuth();
  const { totalItems, openCartDrawer } = useCart();
  const { location, setLocation, detectLocation, searchLocation, locating, error: locationError } = useLocationContext();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const [search, setSearch] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showPromo, setShowPromo] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);

  // In-modal Quick Add Address state
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState('Home');
  const [newAddrHouseNo, setNewAddrHouseNo] = useState('');
  const [newAddrArea, setNewAddrArea] = useState('');
  const [newAddrLandmark, setNewAddrLandmark] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('Lucknow');
  const [newAddrZipcode, setNewAddrZipcode] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressSaveError, setAddressSaveError] = useState('');
  const [isCompactViewport, setIsCompactViewport] = useState(() =>
    typeof window !== 'undefined'
      ? window.innerWidth <= 768 || document.body.classList.contains('capacitor-native-app')
      : false
  );
  const isCatalogMobileHeader = isCompactViewport && routeLocation.pathname === '/products';

  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 768px)');
    const syncViewport = () => {
      setIsCompactViewport(mq.matches || document.body.classList.contains('capacitor-native-app'));
    };
    syncViewport();
    mq.addEventListener?.('change', syncViewport);
    return () => mq.removeEventListener?.('change', syncViewport);
  }, []);

  // Auto-open bottom-sheet location popup on mobile/APK launch when no delivery location is set
  useEffect(() => {
    if (!isCompactViewport || location) {
      return;
    }
    try {
      if (!sessionStorage.getItem('progicart_loc_prompted')) {
        sessionStorage.setItem('progicart_loc_prompted', '1');
        const timer = setTimeout(() => {
          setShowLocationModal(true);
        }, 350);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore sessionStorage restriction
    }
  }, [isCompactViewport, location]);

  // Load user saved addresses from local cache + backend database
  useEffect(() => {
    if (!user?.id) {
      setSavedAddresses([]);
      return;
    }

    let cancelled = false;
    const storageKey = `savedAddresses_${user.id}`;
    const initialList = Array.isArray(user.addresses) ? user.addresses : [];

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedAddresses(parsed);
        } else if (initialList.length > 0) {
          setSavedAddresses(initialList);
        }
      } catch {
        setSavedAddresses(initialList);
      }
    } else if (initialList.length > 0) {
      setSavedAddresses(initialList);
    }

    if (token) {
      userAddressesAPI
        .getAll()
        .then((res) => {
          if (cancelled) return;
          const dbAddresses = res.data?.addresses;
          if (Array.isArray(dbAddresses) && dbAddresses.length > 0) {
            const normalized = dbAddresses.map((addr, idx) => ({
              ...addr,
              id: String(addr.id || addr._id || `db_${idx}`),
            }));
            setSavedAddresses(normalized);
            try {
              localStorage.setItem(storageKey, JSON.stringify(normalized));
            } catch {
              // Ignore storage quota errors
            }
          }
        })
        .catch(() => {
          // Keep cached addresses silently if offline/rate-limited
        });
    }

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.addresses, token]);

  // Debounced manual location search inside bottom-sheet modal
  useEffect(() => {
    if (!showLocationModal) {
      setLocationQuery('');
      setLocationResults([]);
      return;
    }
    const clean = locationQuery.trim();
    if (clean.length < 2) {
      setLocationResults([]);
      setSearchingLocation(false);
      return;
    }
    let cancelled = false;
    setSearchingLocation(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchLocation(clean);
        if (!cancelled) {
          setLocationResults(Array.isArray(results) ? results : []);
        }
      } catch {
        if (!cancelled) setLocationResults([]);
      } finally {
        if (!cancelled) setSearchingLocation(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [locationQuery, showLocationModal, searchLocation]);

  // Listen for real-time address updates
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (user?.id && e.key === `savedAddresses_${user.id}`) {
        setSavedAddresses(JSON.parse(e.newValue || '[]'));
      }
    };
    const handleAddressesUpdated = (e) => {
      setSavedAddresses(e.detail || []);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('addressesUpdated', handleAddressesUpdated);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('addressesUpdated', handleAddressesUpdated);
    };
  }, [user?.id]);

  // Handle outside click & keyboard shortcuts (Escape to dismiss, Ctrl+K or / to focus search)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchSuggestions(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowProfileDropdown(false);
        setShowSearchSuggestions(false);
        setShowNotifications(false);
        setShowLocationModal(false);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowSearchSuggestions(true);
        return;
      }
      if (
        e.key === '/' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/products?search=${encodeURIComponent(search.trim())}`);
      setShowSearchSuggestions(false);
    }
  };

  const handleQuickSearch = (term) => {
    setSearch(term);
    navigate(`/products?search=${encodeURIComponent(term)}`);
    setShowSearchSuggestions(false);
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      searchInputRef.current?.focus();
      setShowSearchSuggestions(true);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const spoken = event.results?.[0]?.[0]?.transcript?.trim();
        if (spoken) {
          setSearch(spoken);
          navigate(`/products?search=${encodeURIComponent(spoken)}`);
          setShowSearchSuggestions(false);
        }
      };
      recognition.onerror = () => {
        searchInputRef.current?.focus();
        setShowSearchSuggestions(true);
      };
      recognition.start();
    } catch {
      searchInputRef.current?.focus();
      setShowSearchSuggestions(true);
    }
  };

  // Instant 1-Click GPS Geolocation Detection: detects, updates context, closes modal, and returns to Homepage!
  const handleDetectGPS = async () => {
    if (!user) {
      setShowLocationModal(false);
      if (openAuthModal) {
        openAuthModal({
          title: 'Sign in for Delivery',
          subtitle: 'Please sign in to detect and save your delivery address.',
          onSuccess: () => {
            setShowLocationModal(true);
          },
        });
      }
      return;
    }

    try {
      const res = await detectLocation();
      const detectedAddress = res?.display || location || 'Husainabad, Lucknow';
      setLocation(detectedAddress);

      // Auto-save address to user's saved addresses if logged in
      if (token && user?.id && res?.lat && res?.lng) {
        const newAddr = {
          id: Date.now().toString(),
          label: 'Current Location',
          street: detectedAddress,
          city: res.city || 'Lucknow',
          latitude: Number(res.lat).toFixed(6),
          longitude: Number(res.lng).toFixed(6),
          isDefault: true,
        };
        const currentSaved = JSON.parse(localStorage.getItem(`savedAddresses_${user.id}`) || '[]');
        const updated = [newAddr, ...currentSaved.filter(a => a.street !== detectedAddress)];
        localStorage.setItem(`savedAddresses_${user.id}`, JSON.stringify(updated));
        setSavedAddresses(updated);
        window.dispatchEvent(new CustomEvent('addressesUpdated', { detail: updated }));
      }

      // Close modal and navigate immediately to home page
      setShowLocationModal(false);
      navigate('/');
    } catch (err) {
      console.warn('GPS detection error:', err);
    }
  };

  // 1-Click Saved Address Selector
  const handleSelectLocation = (loc) => {
    if (!user) {
      setShowLocationModal(false);
      if (openAuthModal) {
        openAuthModal({
          title: 'Sign in for Delivery',
          subtitle: 'Please sign in to set your delivery address & get 10-minute delivery.',
          onSuccess: () => {
            setLocation(loc);
            navigate('/');
          },
        });
      }
      return;
    }
    setLocation(loc);
    setShowLocationModal(false);
    navigate('/');
  };

  const handleAutoFillWithGPS = async () => {
    try {
      const res = await detectLocation();
      if (res) {
        if (res.street) setNewAddrArea(res.street);
        else if (res.display) setNewAddrArea(res.display);
        if (res.city) setNewAddrCity(res.city);
        if (res.zipcode) setNewAddrZipcode(res.zipcode);
      }
    } catch (e) {
      console.warn('Auto-fill GPS warning:', e);
    }
  };

  const handleSaveNewAddress = async (e) => {
    e.preventDefault();
    if (!newAddrArea.trim() || !newAddrCity.trim()) {
      setAddressSaveError('Please enter area/street and city.');
      return;
    }
    setSavingAddress(true);
    setAddressSaveError('');

    const houseNo = newAddrHouseNo.trim();
    const area = newAddrArea.trim();
    const landmark = newAddrLandmark.trim();
    const fullStreet = [houseNo, area, landmark ? `(Near ${landmark})` : '']
      .filter(Boolean)
      .join(', ');

    const payload = {
      label: newAddrLabel || 'Home',
      houseNo,
      area,
      landmark,
      street: fullStreet || area,
      city: newAddrCity.trim() || 'Lucknow',
      state: 'Uttar Pradesh',
      zipcode: newAddrZipcode.trim(),
      isDefault: true,
    };

    try {
      let apiAddresses = null;
      try {
        const res = await userAddressesAPI.save(payload);
        apiAddresses = res.data?.addresses;
      } catch (err) {
        console.warn('Backend address save error:', err);
      }

      const updated = Array.isArray(apiAddresses) && apiAddresses.length > 0
        ? apiAddresses
        : [{ ...payload, id: Date.now().toString() }, ...savedAddresses];

      setSavedAddresses(updated);
      if (user?.id) {
        localStorage.setItem(`savedAddresses_${user.id}`, JSON.stringify(updated));
      }
      window.dispatchEvent(new CustomEvent('addressesUpdated', { detail: updated }));

      const fullDisplay = `${payload.street}, ${payload.city}`;
      setLocation(fullDisplay);
      setShowAddAddressForm(false);
      setShowLocationModal(false);
      navigate('/');
    } catch (err) {
      setAddressSaveError(err.message || 'Failed to save address');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleLogout = () => {
    logout();
    setShowProfileDropdown(false);
    navigate('/');
  };

  const renderSearchBar = () => (
    <div className="search-bar-container" ref={searchRef}>
      <form className="search-form" onSubmit={handleSearchSubmit}>
        <Search size={16} strokeWidth={2} className="search-icon-left" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder={isCompactViewport ? 'Search for atta, dal, milk and more...' : 'Search for groceries, dairy, snacks and more...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setShowSearchSuggestions(true)}
          className="search-input"
          aria-label="Search products"
        />
        {!search ? (
          <button
            type="button"
            className="mobile-mic-btn"
            onClick={handleVoiceSearch}
            aria-label="Voice search"
          >
            <Mic size={16} strokeWidth={1.9} />
          </button>
        ) : (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => setSearch('')}
            aria-label="Clear search"
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        )}
      </form>

      {/* Quick Suggestions Popup */}
      {showSearchSuggestions && (
        <div className="search-suggestions-dropdown">
          <div className="suggestion-section-title">
            <TrendingUp size={13} strokeWidth={2.2} className="suggestion-title-icon" />
            <span>Popular Searches</span>
          </div>
          <div className="trending-tags-grid">
            {TRENDING_SEARCHES.map((item) => (
              <button
                key={item}
                type="button"
                className="trending-tag-pill"
                onClick={() => handleQuickSearch(item)}
              >
                <Search size={12} strokeWidth={2} />
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProfileDropdown = () => (
    <div className="profile-popover">
      <div className="profile-popover-header">
        <p className="user-fullname">{user?.name || 'Customer'}</p>
        <p className="user-email-text">{user?.email}</p>
        {user?.isAdmin && (
          <span className="admin-chip">Admin Access</span>
        )}
        {(user?.isDeliveryPartner || user?.role === 'delivery_partner') && (
          <span className="admin-chip" style={{ background: '#fff3cd', color: '#856404' }}>Rider Fleet</span>
        )}
      </div>
      <div className="popover-divider" />
      <button
        type="button"
        className="popover-menu-item popover-location-trigger"
        onClick={() => {
          setShowProfileDropdown(false);
          setShowLocationModal(true);
        }}
      >
        <MapPin size={16} color="#168A32" />
        <span className="popover-loc-truncate">{location || 'Select Location'}</span>
      </button>
      {user?.isAdmin && (
        <Link
          to="/admin"
          className="popover-menu-item"
          onClick={() => setShowProfileDropdown(false)}
        >
          <ShieldAlert size={16} color="#168A32" />
          <span>Admin Panel</span>
        </Link>
      )}
      {(user?.isDeliveryPartner || user?.role === 'delivery_partner') && (
        <Link
          to="/delivery"
          className="popover-menu-item"
          onClick={() => setShowProfileDropdown(false)}
        >
          <Bike size={16} color="#168A32" />
          <span>Rider Console</span>
        </Link>
      )}
      <Link
        to="/orders"
        className="popover-menu-item"
        onClick={() => setShowProfileDropdown(false)}
      >
        <ClipboardList size={16} />
        <span>My Orders</span>
      </Link>
      <Link
        to="/wishlist"
        className="popover-menu-item"
        onClick={() => setShowProfileDropdown(false)}
      >
        <Heart size={16} />
        <span>My Wishlist</span>
      </Link>
      <Link
        to="/addresses"
        className="popover-menu-item"
        onClick={() => setShowProfileDropdown(false)}
      >
        <MapPin size={16} />
        <span>Saved Addresses</span>
      </Link>
      <Link
        to="/profile"
        className="popover-menu-item"
        onClick={() => setShowProfileDropdown(false)}
      >
        <User size={16} />
        <span>Account Settings</span>
      </Link>
      <div className="popover-divider" />
      <button
        type="button"
        onClick={handleLogout}
        className="popover-menu-item logout-action"
      >
        <LogOut size={16} />
        <span>Log Out</span>
      </button>
    </div>
  );

  return (
    <>
      {/* =========================================================================
          DESKTOP HEADER (Screen >= 769px)
          ========================================================================= */}
      {!isCompactViewport && (
        <header className="site-header-wrapper desktop-header-wrapper">
          {/* Top Green Textured Announcement Header */}
          {showPromo && (
            <div className="top-promo-banner">
              <div className="top-promo-content">
                <span className="promo-pill">
                  <Zap size={11} strokeWidth={2.4} fill="currentColor" aria-hidden="true" />
                  <span>10 MIN DELIVERY</span>
                </span>
                <span className="promo-divider" aria-hidden="true">|</span>
                <span className="promo-text">Fresh groceries at your doorstep</span>
                <span className="promo-divider" aria-hidden="true">|</span>
                <span className="promo-text">Free delivery on orders above ₹499</span>
                <span className="promo-divider" aria-hidden="true">|</span>
                <span className="promo-offer">
                  <Gift size={14} strokeWidth={2.2} className="promo-gift-icon" aria-hidden="true" />
                  <span>
                    Get 15% off on first 3 orders with code <strong className="promo-code-text">WELCOME15</strong>
                  </span>
                </span>
              </div>
              <button
                type="button"
                className="close-promo"
                onClick={() => setShowPromo(false)}
                aria-label="Dismiss banner"
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>
          )}

          {/* Main Desktop Navbar */}
          <nav className="navbar">
            <div className="navbar-container">
              {/* Progicart Logo */}
              <Link to="/" className="progicart-brand-logo" aria-label="Progicart Home">
                <img src="/logo.png" alt="Progicart" className="brand-logo-img" />
              </Link>

              {/* Delivery Location Trigger Button */}
              <button
                type="button"
                className="location-trigger-btn"
                onClick={() => setShowLocationModal(true)}
                aria-label="Select delivery address"
              >
                <div className="location-pin-wrap">
                  <MapPin size={18} strokeWidth={2} className="pin-icon" />
                </div>
                <div className="location-text-col">
                  <span className="delivery-time-badge">Delivery in 10 minutes</span>
                  <div className="selected-address-row">
                    <span className="selected-address-text">{location || 'Select delivery location'}</span>
                    <ChevronDown size={14} className="caret-icon" />
                  </div>
                </div>
                <span className="location-10min-badge">
                  <Zap size={10} fill="currentColor" aria-hidden="true" />
                  <span>10 MIN DELIVERY</span>
                </span>
              </button>

              {/* Desktop Search Bar */}
              {renderSearchBar()}

              {/* Right Action Icons */}
              <div className="nav-actions-group">
                <Link
                  to="/wishlist"
                  className="header-circle-btn wishlist-header-btn"
                  aria-label="Saved Wishlist"
                  title="Saved Wishlist"
                >
                  <Heart size={18} strokeWidth={1.85} />
                </Link>

                {/* Notifications & Delivery Area Bell */}
                <div className="notif-dropdown-wrapper" ref={notifRef}>
                  <button
                    type="button"
                    className="header-circle-btn notif-btn"
                    onClick={() => setShowNotifications((prev) => !prev)}
                    aria-label="Notifications and delivery info"
                    aria-expanded={showNotifications}
                  >
                    <Bell size={18} strokeWidth={1.85} />
                    <span className="notif-active-dot" aria-hidden="true" />
                  </button>

                  {showNotifications && (
                    <div className="notif-popover">
                      <div className="notif-popover-head">
                        <span>Updates &amp; Delivery</span>
                      </div>
                      <button
                        type="button"
                        className="notif-location-card"
                        onClick={() => {
                          setShowNotifications(false);
                          setShowLocationModal(true);
                        }}
                      >
                        <MapPin size={16} className="notif-pin-icon" />
                        <div className="notif-location-text">
                          <strong>Delivery in 10 mins</strong>
                          <span>{location || 'Gomti Nagar, Lucknow'}</span>
                        </div>
                        <span className="notif-change-tag">Change</span>
                      </button>
                      <div className="popover-divider" />
                      <Link
                        to="/products?sort=discount"
                        className="popover-menu-item"
                        onClick={() => setShowNotifications(false)}
                      >
                        <Tag size={15} />
                        <span>Explore Today&apos;s Deals</span>
                      </Link>
                      <Link
                        to="/wishlist"
                        className="popover-menu-item"
                        onClick={() => setShowNotifications(false)}
                      >
                        <Heart size={15} />
                        <span>Saved Wishlist</span>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Emerald My Cart Pill */}
                <button
                  type="button"
                  className={`blinkit-cart-pill-btn ${totalItems > 0 ? 'has-items' : ''}`}
                  onClick={openCartDrawer}
                  aria-label="Open Cart"
                >
                  <ShoppingCart size={17} strokeWidth={2} className="cart-pill-icon" />
                  <span className="cart-desktop-label">My Cart</span>
                  {totalItems > 0 && (
                    <span className="cart-desktop-badge">{totalItems}</span>
                  )}
                </button>

                {/* Profile User Icon */}
                {token ? (
                  <div className="profile-dropdown-wrapper" ref={profileRef}>
                    <button
                      type="button"
                      className="nav-action-link profile-trigger"
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      aria-label="User menu"
                      aria-expanded={showProfileDropdown}
                    >
                      <div className="nav-icon-circle profile-circle">
                        <User size={18} strokeWidth={2} />
                      </div>
                      <ChevronDown size={14} className="profile-chevron-desktop" />
                      <span className="nav-action-label">{user?.name ? user.name.split(' ')[0] : 'Profile'}</span>
                    </button>
                    {showProfileDropdown && renderProfileDropdown()}
                  </div>
                ) : (
                  <Link to="/login" className="blinkit-login-btn" aria-label="Login">
                    <User size={16} strokeWidth={1.9} className="login-user-icon-mobile" />
                    <span className="login-text-label">Login</span>
                  </Link>
                )}
              </div>
            </div>
          </nav>

          {/* Desktop Announcement Ticker */}
          <div className="announcement-ticker-bar">
            <div className="announcement-inner">
              <span><strong>10-min express delivery</strong> active in your area</span>
              <span className="ticker-dot" aria-hidden="true">•</span>
              <span>15% off first 3 orders with code <strong>WELCOME15</strong></span>
              <span className="ticker-dot" aria-hidden="true">•</span>
              <span>Handpicked farm-fresh produce &amp; daily essentials</span>
            </div>
          </div>
        </header>
      )}

      {/* =========================================================================
          MOBILE HEADER (Mobile View / Capacitor Native App)
          - Top row & 15% off banner: Scroll away naturally with the page
          - Search bar & Categories strip: Stick fixed to the top at 120fps with ZERO lag
          ========================================================================= */}
      {isCompactViewport && (
        <>
          {/* Scrollable Top Row: Logo, Location, Cart/Profile */}
          {!isCatalogMobileHeader && (
            <div className="mobile-header-top-scrollable">
              <div className="mobile-header-top-row">
                <Link to="/" className="progicart-brand-logo" aria-label="Progicart Home">
                  <img src="/logo.png" alt="Progicart" className="brand-logo-img" />
                </Link>

                <button
                  type="button"
                  className="location-trigger-btn"
                  onClick={() => setShowLocationModal(true)}
                  aria-label="Select delivery address"
                >
                  <div className="location-pin-wrap">
                    <MapPin size={16} strokeWidth={2} className="pin-icon" />
                  </div>
                  <div className="location-text-col">
                    <span className="delivery-time-badge">Deliver to</span>
                    <div className="selected-address-row">
                      <span className="selected-address-text">{location || 'Select delivery location'}</span>
                      <ChevronDown size={13} className="caret-icon" />
                    </div>
                  </div>
                </button>

                <div className="nav-actions-group">
                  <button
                    type="button"
                    className={`blinkit-cart-pill-btn mobile-cart-round-btn ${totalItems > 0 ? 'has-items' : ''}`}
                    onClick={openCartDrawer}
                    aria-label="Open Cart"
                  >
                    <ShoppingCart size={17} strokeWidth={2} className="cart-pill-icon" />
                    {totalItems > 0 && (
                      <span className="cart-desktop-badge">{totalItems}</span>
                    )}
                  </button>

                  {token ? (
                    <div className="profile-dropdown-wrapper" ref={profileRef}>
                      <button
                        type="button"
                        className="nav-action-link profile-trigger"
                        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                        aria-label="User menu"
                        aria-expanded={showProfileDropdown}
                      >
                        <div className="nav-icon-circle profile-circle">
                          <User size={17} strokeWidth={2} />
                        </div>
                      </button>
                      {showProfileDropdown && renderProfileDropdown()}
                    </div>
                  ) : (
                    <Link to="/login" className="blinkit-login-btn mobile-login-round-btn" aria-label="Login">
                      <User size={16} strokeWidth={1.9} className="login-user-icon-mobile" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fixed/Sticky Header: Search Bar + Categories Strip (Sticks cleanly at top: 0 forever!) */}
          <header className={`site-header-sticky-nav ${isCatalogMobileHeader ? 'catalog-mobile-search-header' : ''}`}>
            {isCatalogMobileHeader ? (
              <div className="catalog-mobile-search-row">
                {renderSearchBar()}
                <Link
                  to="/wishlist"
                  className="header-circle-btn wishlist-header-btn"
                  aria-label="Saved Wishlist"
                  title="Saved Wishlist"
                >
                  <Heart size={18} strokeWidth={1.85} />
                </Link>
              </div>
            ) : (
              <>
                <div className="mobile-sticky-search-wrap">
                  {renderSearchBar()}
                </div>
                <TopCategoryStrip />
              </>
            )}
          </header>

          {/* 15% OFF Full Width Strip (BELOW Categories, scrolls away with page!) */}
          {!isCatalogMobileHeader && (
            <Link to="/products?sort=discount" className="mobile-offer-banner-fullwidth">
              <div className="mobile-offer-left">
                <BadgePercent size={15} strokeWidth={2.2} className="mobile-offer-icon" aria-hidden="true" />
                <span>
                  15% off first 3 orders with code <strong>WELCOME15</strong>
                </span>
              </div>
              <ChevronRight size={15} strokeWidth={2.4} className="mobile-offer-arrow" aria-hidden="true" />
            </Link>
          )}
        </>
      )}

      {/* Instant 1-Click Location Bottom Sheet */}
      {showLocationModal && (
        <div className="modal-backdrop" onClick={() => setShowLocationModal(false)}>
          <div className="location-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="location-sheet-handle" aria-hidden="true" />
            <div className="location-modal-header">
              <h3>Select Delivery Location</h3>
              <button
                type="button"
                className="modal-close-icon"
                onClick={() => setShowLocationModal(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="location-modal-body">
              {/* Unauthenticated Login Notice */}
              {!user && (
                <div className="location-auth-banner">
                  <div className="loc-auth-left">
                    <div className="loc-auth-icon-wrap">
                      <Zap size={18} color="#168A32" />
                    </div>
                    <div className="loc-auth-text-col">
                      <h4>Sign in to deliver here</h4>
                      <p>Log in to save multiple addresses and enjoy lightning 10-minute delivery.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="loc-auth-login-btn"
                    onClick={() => {
                      setShowLocationModal(false);
                      if (openAuthModal) {
                        openAuthModal({
                          title: 'Sign in for Delivery',
                          subtitle: 'Log in to set your address & get 10-minute instant delivery.',
                          onSuccess: () => setShowLocationModal(true),
                        });
                      }
                    }}
                  >
                    Sign In
                  </button>
                </div>
              )}

              {/* Quick Area / Pincode Search */}
              <div className="location-search-box">
                <Search size={16} className="location-search-icon" />
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="Search area, street name or city..."
                  className="location-search-input"
                  aria-label="Search delivery area"
                />
                {locationQuery && (
                  <button
                    type="button"
                    className="location-search-clear"
                    onClick={() => setLocationQuery('')}
                    aria-label="Clear location search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {searchingLocation && (
                <p className="location-searching-hint">Searching nearby areas...</p>
              )}

              {locationResults.length > 0 && (
                <div className="modal-locations-group">
                  <h4>Search Results</h4>
                  <div className="address-pills-list">
                    {locationResults.map((item, idx) => (
                      <div
                        key={`${item.display}_${idx}`}
                        className={`address-select-row ${location === item.display ? 'active' : ''}`}
                        onClick={() => handleSelectLocation(item.display)}
                      >
                        <MapPin size={16} />
                        <div className="addr-info">
                          <span className="addr-tag">{item.street || item.city || 'Area'}</span>
                          <span className="addr-str">{item.display}</span>
                        </div>
                        {location === item.display && <Check size={16} className="check-icon" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 1-Click GPS Detect Button: Pure GPS tracking */}
              <button
                type="button"
                className="detect-location-btn"
                onClick={handleDetectGPS}
                disabled={locating}
              >
                <Crosshair size={22} className={locating ? 'spin-icon' : ''} />
                <div className="detect-text-col">
                  <strong>{locating ? 'Detecting your real-time GPS location…' : 'Use Current Location (GPS)'}</strong>
                  <span>Auto-detect your area for quick delivery</span>
                </div>
              </button>

              {locationError && (
                <p className="location-err-text">{locationError}</p>
              )}

              {/* Add New Address Action Bar */}
              <div className="modal-add-addr-header-row">
                <h4>{user ? 'My Saved Addresses' : 'Delivery Addresses'}</h4>
                <button
                  type="button"
                  className="quick-add-addr-btn"
                  onClick={() => {
                    if (!user) {
                      setShowLocationModal(false);
                      if (openAuthModal) {
                        openAuthModal({
                          title: 'Sign in to add address',
                          subtitle: 'Please sign in to save delivery addresses to your account.',
                          onSuccess: () => {
                            setShowLocationModal(true);
                            setShowAddAddressForm(true);
                          },
                        });
                      }
                      return;
                    }
                    setShowAddAddressForm(!showAddAddressForm);
                    setAddressSaveError('');
                  }}
                >
                  <Plus size={15} strokeWidth={2.4} />
                  <span>{showAddAddressForm ? 'Cancel Form' : 'Add New Address'}</span>
                </button>
              </div>

              {/* In-Modal Quick Add Address Form */}
              {showAddAddressForm && (
                <form onSubmit={handleSaveNewAddress} className="modal-quick-addr-form">
                  <div className="addr-form-top-row">
                    <span className="addr-form-title">Add New Delivery Address</span>
                    <button
                      type="button"
                      className="addr-gps-autofill-btn"
                      onClick={handleAutoFillWithGPS}
                      title="Auto-fill with GPS"
                    >
                      <Crosshair size={13} />
                      <span>Auto-fill GPS</span>
                    </button>
                  </div>

                  {addressSaveError && (
                    <div className="addr-form-error">{addressSaveError}</div>
                  )}

                  {/* Label selector */}
                  <div className="addr-label-selector">
                    {['Home', 'Work', 'Other'].map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        className={`addr-label-btn ${newAddrLabel === lbl ? 'active' : ''}`}
                        onClick={() => setNewAddrLabel(lbl)}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>

                  <div className="addr-input-row">
                    <input
                      type="text"
                      placeholder="Flat / House / Building No."
                      value={newAddrHouseNo}
                      onChange={(e) => setNewAddrHouseNo(e.target.value)}
                      className="addr-field-input"
                    />
                  </div>

                  <div className="addr-input-row">
                    <input
                      type="text"
                      placeholder="Area / Street / Sector *"
                      value={newAddrArea}
                      onChange={(e) => setNewAddrArea(e.target.value)}
                      className="addr-field-input"
                      required
                    />
                  </div>

                  <div className="addr-input-row">
                    <input
                      type="text"
                      placeholder="Nearby Landmark (Optional)"
                      value={newAddrLandmark}
                      onChange={(e) => setNewAddrLandmark(e.target.value)}
                      className="addr-field-input"
                    />
                  </div>

                  <div className="addr-input-grid-2">
                    <input
                      type="text"
                      placeholder="City *"
                      value={newAddrCity}
                      onChange={(e) => setNewAddrCity(e.target.value)}
                      className="addr-field-input"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={newAddrZipcode}
                      onChange={(e) => setNewAddrZipcode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="addr-field-input"
                    />
                  </div>

                  <div className="addr-form-actions">
                    <button
                      type="button"
                      className="addr-cancel-btn"
                      onClick={() => setShowAddAddressForm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="addr-save-submit-btn"
                      disabled={savingAddress}
                    >
                      {savingAddress ? 'Saving…' : 'Save & Deliver Here'}
                    </button>
                  </div>
                </form>
              )}

              {/* Saved Addresses List */}
              {user && savedAddresses.filter((a) => !IS_INVALID_GATEWAY_ADDR(a.street)).length > 0 && (
                <div className="modal-locations-group">
                  <div className="address-pills-list">
                    {savedAddresses
                      .filter((a) => !IS_INVALID_GATEWAY_ADDR(a.street))
                      .map((addr) => {
                        const full = addr.street?.includes(addr.city) || !addr.city ? addr.street : `${addr.street}, ${addr.city}`;
                        const isSelected = location === full;
                        return (
                          <div
                            key={addr.id}
                            className={`address-select-row ${isSelected ? 'active' : ''}`}
                            onClick={() => handleSelectLocation(full)}
                          >
                            <MapPin size={16} />
                            <div className="addr-info">
                              <div className="addr-tag-row">
                                <span className="addr-tag">{addr.label || 'Home'}</span>
                                {(addr.latitude || addr.longitude) && (
                                  <span className="addr-gps-pill">
                                    GPS Verified
                                  </span>
                                )}
                              </div>
                              <span className="addr-str">{full}</span>
                            </div>
                            {isSelected && <Check size={16} className="check-icon" />}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {user && savedAddresses.filter((a) => !IS_INVALID_GATEWAY_ADDR(a.street)).length === 0 && !showAddAddressForm && (
                <div className="empty-saved-addr-hint">
                  <p>No saved addresses yet. Click "+ Add New Address" above to save one!</p>
                </div>
              )}

              {token && (
                <Link
                  to="/addresses"
                  className="manage-saved-addr-link"
                  onClick={() => setShowLocationModal(false)}
                >
                  Manage All Saved Addresses in Settings →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
