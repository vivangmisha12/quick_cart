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
  Bike
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocationContext } from '../context/LocationContext';
import TopCategoryStrip from './TopCategoryStrip';
import '../styles/Navbar.css';

const TRENDING_SEARCHES = ['Milk', 'Curd', 'Bread', 'Potato Chips', 'Cold Drinks', 'Chocolate', 'Onion'];

const Navbar = () => {
  const { token, logout, user } = useAuth();
  const { totalItems, openCartDrawer } = useCart();
  const { location, setLocation, detectLocation, locating, error: locationError } = useLocationContext();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const showCategoryTabs = routeLocation.pathname === '/' || routeLocation.pathname === '/products';

  const [search, setSearch] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showPromo, setShowPromo] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [isCompactViewport, setIsCompactViewport] = useState(() =>
    typeof window !== 'undefined'
      ? window.innerWidth <= 768 || document.body.classList.contains('capacitor-native-app')
      : false
  );

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

  // Load user saved addresses
  useEffect(() => {
    if (!user?.id) {
      setSavedAddresses([]);
      return;
    }
    const saved = localStorage.getItem(`savedAddresses_${user.id}`);
    if (saved) {
      try {
        setSavedAddresses(JSON.parse(saved));
      } catch (err) {
        setSavedAddresses([]);
      }
    }
  }, [user?.id]);

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
    setLocation(loc);
    setShowLocationModal(false);
    navigate('/');
  };

  const handleLogout = () => {
    logout();
    setShowProfileDropdown(false);
    navigate('/');
  };

  return (
    <header className="site-header-wrapper">
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

      {/* Main Navbar */}
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
                <span className="selected-address-text">{location || 'Gomti Nagar, Lucknow'}</span>
                <ChevronDown size={14} className="caret-icon" />
              </div>
            </div>
            <span className="location-10min-badge">
              <Zap size={10} fill="currentColor" aria-hidden="true" />
              <span>10 MIN DELIVERY</span>
            </span>
          </button>

          {/* Search Bar */}
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

          {/* Right Action Icons */}
          <div className="nav-actions-group">
            {/* Search Circle Button (Mobile Header Row 1) */}
            <button
              type="button"
              className="header-circle-btn mobile-search-circle-btn"
              onClick={() => {
                searchInputRef.current?.focus();
                setShowSearchSuggestions(true);
              }}
              aria-label="Focus product search"
            >
              <Search size={17} strokeWidth={1.9} />
            </button>

            {/* Wishlist Heart Circle (Desktop Web View) */}
            <Link
              to="/wishlist"
              className="header-circle-btn wishlist-header-btn"
              aria-label="Saved Wishlist"
              title="Saved Wishlist"
            >
              <Heart size={18} strokeWidth={1.85} />
            </Link>

            {/* Notifications & Delivery Area Bell (Desktop Web View) */}
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

            {/* Emerald My Cart Pill (Desktop) / Cart Circle with Green Badge (Mobile) */}
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

            {/* Auth / Profile User Icon + Chevron */}
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

                {showProfileDropdown && (
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
                )}
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

      {/* Upper Icon Category Tabs on Mobile/App (right under Search Bar) */}
      <TopCategoryStrip />

      {/* Mobile Dark Emerald Offer Pill Banner */}
      {showCategoryTabs && (
        <Link to="/products?sort=discount" className="mobile-offer-banner">
          <div className="mobile-offer-left">
            <BadgePercent size={17} strokeWidth={1.9} className="mobile-offer-icon" aria-hidden="true" />
            <span>
              15% off first 3 orders with code <strong>WELCOME15</strong>
            </span>
          </div>
          <ChevronRight size={16} strokeWidth={2.2} className="mobile-offer-arrow" aria-hidden="true" />
        </Link>
      )}

      {/* Editorial Sub-header Info Bar (hidden inside mobile app or when category tabs sit directly under search) */}
      <div className={`announcement-ticker-bar ${showCategoryTabs ? 'hide-on-compact' : ''}`}>
        <div className="announcement-inner">
          <span><strong>10-min express delivery</strong> active in your area</span>
          <span className="ticker-dot" aria-hidden="true">•</span>
          <span>15% off first 3 orders with code <strong>WELCOME15</strong></span>
          <span className="ticker-dot" aria-hidden="true">•</span>
          <span>Handpicked farm-fresh produce &amp; daily essentials</span>
        </div>
      </div>

      {/* Instant 1-Click Location Modal */}
      {showLocationModal && (
        <div className="modal-backdrop" onClick={() => setShowLocationModal(false)}>
          <div className="location-modal-card" onClick={(e) => e.stopPropagation()}>
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
                  <span>Auto-detect exact coordinates & return to shopping</span>
                </div>
              </button>

              {locationError && (
                <p className="location-err-text">{locationError}</p>
              )}

              {/* Saved Addresses if logged in */}
              {savedAddresses.filter(a => 
                !a.street?.toLowerCase().includes('jalandhar') && 
                !a.street?.toLowerCase().includes('punjab') &&
                !a.street?.toLowerCase().includes('jandu singha')
              ).length > 0 && (
                <div className="modal-locations-group">
                  <h4>My Saved Addresses</h4>
                  <div className="address-pills-list">
                    {savedAddresses
                      .filter(a => 
                        !a.street?.toLowerCase().includes('jalandhar') && 
                        !a.street?.toLowerCase().includes('punjab') &&
                        !a.street?.toLowerCase().includes('jandu singha')
                      )
                      .map((addr) => {
                        const full = addr.street?.includes(addr.city) ? addr.street : `${addr.street}, ${addr.city}`;
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
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
