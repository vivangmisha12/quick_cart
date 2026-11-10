import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  ShoppingCart, 
  User, 
  MapPin, 
  Search, 
  ChevronDown, 
  Crosshair, 
  X, 
  Check, 
  Sparkles,
  ClipboardList,
  LogOut,
  ShieldAlert,
  Navigation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocationContext } from '../context/LocationContext';
import '../styles/Navbar.css';

const TRENDING_SEARCHES = ['Milk', 'Curd', 'Bread', 'Potato Chips', 'Cold Drinks', 'Chocolate', 'Onion'];

const Navbar = () => {
  const { token, logout, user } = useAuth();
  const { totalItems, cart, openCartDrawer } = useCart();
  const { location, setLocation, detectLocation, locating, error: locationError } = useLocationContext();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showPromo, setShowPromo] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState([]);

  const profileRef = useRef(null);
  const searchRef = useRef(null);

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

  // Handle outside click for profile dropdown & search suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const cartTotal = cart?.totalPrice || 0;

  return (
    <header className="site-header-wrapper">
      {/* Top Promo Banner */}
      {showPromo && (
        <div className="top-promo-banner">
          <div className="top-promo-content">
            <span className="promo-pill">⚡ 10 MINS DELIVERY</span>
            <span className="promo-text">Get fresh groceries delivered at your doorstep in minutes!</span>
            <span className="promo-divider">•</span>
            <span className="promo-highlight">FREE delivery on orders above ₹499 🎉</span>
          </div>
          <button 
            className="close-promo" 
            onClick={() => setShowPromo(false)} 
            aria-label="Dismiss banner"
          >
            ✕
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
              <MapPin size={20} className="pin-icon" />
            </div>
            <div className="location-text-col">
              <span className="delivery-time-badge">Delivery in 10 minutes</span>
              <div className="selected-address-row">
                <span className="selected-address-text">{location || 'Husainabad, Lucknow'}</span>
                <ChevronDown size={14} className="caret-icon" />
              </div>
            </div>
          </button>

          {/* Search Bar */}
          <div className="search-bar-container" ref={searchRef}>
            <form className="search-form" onSubmit={handleSearchSubmit}>
              <Search size={18} className="search-icon-left" />
              <input
                type="text"
                placeholder='Search "milk", "bread", "chips", "butter"...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setShowSearchSuggestions(true)}
                className="search-input"
              />
              {search && (
                <button 
                  type="button" 
                  className="search-clear-btn"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </form>

            {/* Quick Suggestions Popup */}
            {showSearchSuggestions && (
              <div className="search-suggestions-dropdown">
                <div className="suggestion-section-title">
                  <Sparkles size={14} color="#f8cb46" />
                  <span>Trending Searches</span>
                </div>
                <div className="trending-tags-grid">
                  {TRENDING_SEARCHES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="trending-tag-pill"
                      onClick={() => handleQuickSearch(item)}
                    >
                      <Search size={12} />
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Action Icons */}
          <div className="nav-actions-group">
            <Link to="/wishlist" className="nav-action-link" title="My Wishlist">
              <div className="nav-icon-circle">
                <Heart size={20} />
              </div>
              <span className="nav-action-label">Wishlist</span>
            </Link>

            {/* Auth / Profile */}
            {token ? (
              <div className="profile-dropdown-wrapper" ref={profileRef}>
                <button
                  type="button"
                  className="nav-action-link profile-trigger"
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  aria-label="User menu"
                >
                  <div className="nav-icon-circle profile-circle">
                    <User size={20} />
                  </div>
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
                    </div>
                    <div className="popover-divider" />
                    {user?.isAdmin && (
                      <Link 
                        to="/admin" 
                        className="popover-menu-item"
                        onClick={() => setShowProfileDropdown(false)}
                      >
                        <ShieldAlert size={16} color="#0c831f" />
                        <span>Admin Panel</span>
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
              <Link to="/login" className="blinkit-login-btn">
                Login
              </Link>
            )}

            {/* Iconic Blinkit Green Cart Pill Button */}
            <button
              type="button"
              className={`blinkit-cart-pill-btn ${totalItems > 0 ? 'has-items' : ''}`}
              onClick={openCartDrawer}
              aria-label="Open Cart"
            >
              <ShoppingCart size={19} className="cart-pill-icon" />
              <div className="cart-pill-text">
                {totalItems > 0 ? (
                  <>
                    <span className="cart-pill-count">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                    <span className="cart-pill-price">₹{cartTotal.toFixed(0)}</span>
                  </>
                ) : (
                  <span className="cart-pill-empty-label">My Cart</span>
                )}
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Modern Ticker Announcement */}
      <div className="announcement-ticker-bar">
        <div className="ticker-track">
          <div className="ticker-content">
            <span>⚡ <strong>SUPERFAST 10 MIN DELIVERY</strong> in your area</span>
            <span className="ticker-dot">•</span>
            <span>🎁 Flat 15% OFF on first 3 orders • Code: <strong>WELCOME15</strong></span>
            <span className="ticker-dot">•</span>
            <span>🥑 Fresh Farm Fruits & Vegetables handpicked daily</span>
            <span className="ticker-dot">•</span>
            <span>⚡ <strong>SUPERFAST 10 MIN DELIVERY</strong> in your area</span>
            <span className="ticker-dot">•</span>
            <span>🎁 Flat 15% OFF on first 3 orders • Code: <strong>WELCOME15</strong></span>
          </div>
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
