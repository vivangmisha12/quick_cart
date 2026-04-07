import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const { token, logout, user } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('Husainabad, Lucknow');
  const [showDropdown, setShowDropdown] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const dropdownRef = useRef(null);

  // Load saved addresses on mount and when user changes
  useEffect(() => {
    // Clear addresses if no user is logged in
    if (!user?.id) {
      setSavedAddresses([]);
      return;
    }
    
    const saved = localStorage.getItem(`savedAddresses_${user.id}`);
    if (saved) {
      try {
        setSavedAddresses(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading addresses:', error);
        setSavedAddresses([]);
      }
    } else {
      setSavedAddresses([]);
    }
  }, [user?.id]);

  // Listen for address updates (real-time)
  useEffect(() => {
    // Listen for storage changes (when addresses are updated in another tab)
    const handleStorageChange = (e) => {
      if (user?.id && e.key === `savedAddresses_${user.id}`) {
        const updated = JSON.parse(e.newValue || '[]');
        setSavedAddresses(updated);
      }
    };

    // Listen for custom event when addresses are updated in same tab
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

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/products?search=${search}`);
      setSearch('');
    }
  };

  const cartCount = totalItems || 0;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo Section */}
        <Link to="/" className="navbar-logo">
          🛒 <span className="quick-text">Quick</span> <span className="cart-text">Cart</span>
        </Link>

        {/* Location & Delivery Section */}
        <div className="location-section">
          <span className="delivery-text">🚚 Delivery in 17 minutes</span>
          <div className="location-picker">
            <select className="location-select" value={location} onChange={(e) => setLocation(e.target.value)}>
              <optgroup label="Default Locations">
                <option>Husainabad, Lucknow</option>
                <option>Gomti Nagar, Lucknow</option>
                <option>Aliganj, Lucknow</option>
                <option>Hazratganj, Lucknow</option>
                <option>Mohanlalganj, Lucknow</option>
              </optgroup>
              {savedAddresses.length > 0 && (
                <optgroup label="My Addresses">
                  {savedAddresses.map(addr => (
                    <option key={addr.id} value={`${addr.street}, ${addr.city}`}>
                      {addr.street}, {addr.city}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search 'chocolate'"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">🔍</button>
        </form>

        {/* Navigation Links */}
        <div className="nav-links">
          <Link
            to={token ? '/cart' : '/login'}
            className="mobile-user-link"
            aria-label={token ? 'Open cart' : 'Open account'}
          >
            {token ? '🛒' : '👤'}
            {token && cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          <div className="desktop-nav-links">
          {token ? (
            <>
              <Link to="/cart" className="cart-link">
                🛒 <span className={cartCount > 0 ? 'cart-link-active' : ''}>Cart</span>
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </Link>
              
              {/* User Dropdown Menu */}
              <div className="profile-dropdown-wrapper" ref={dropdownRef}>
                <button 
                  className="profile-link" 
                  onClick={() => setShowDropdown(!showDropdown)}
                  title={user?.name || 'Profile'}
                >
                  <span className="user-icon-circle">👤</span>
                </button>
                
                {showDropdown && (
                  <div className="dropdown-menu">
                    <div className="dropdown-header">
                      <p className="user-name">{user?.name || 'User'}</p>
                      <p className="user-email">{user?.email}</p>
                    </div>
                    <div className="dropdown-divider"></div>
                    <Link 
                      to="/orders" 
                      className="dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      📋 My Orders
                    </Link>
                    <Link 
                      to="/addresses" 
                      className="dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      📍 Saved Addresses
                    </Link>
                    <Link 
                      to="/wishlist" 
                      className="dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      ❤️ My Wishlist
                    </Link>
                    <Link 
                      to="/profile" 
                      className="dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      👤 My Profile
                    </Link>
                    <div className="dropdown-divider"></div>
                    <Link 
                      to="" 
                      className="dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      💊 My Prescriptions
                    </Link>
                    <Link 
                      to="" 
                      className="dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      🎁 E-Gift Cards
                    </Link>
                    <Link 
                      to="" 
                      className="dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      ❓ FAQ's
                    </Link>
                    <Link 
                      to="" 
                      className="dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      🔒 Account Privacy
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button 
                      onClick={handleLogout} 
                      className="dropdown-item logout-item"
                    >
                      🚪 Log Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="login-link">Login</Link>
              <Link to="/register" className="register-link">Register</Link>
            </>
          )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;