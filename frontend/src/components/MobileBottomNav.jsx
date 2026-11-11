import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingBag, ShoppingCart, User, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import '../styles/MobileBottomNav.css';

const MobileBottomNav = () => {
  const { totalItems, cart, openCartDrawer } = useCart();
  const { token, user } = useAuth();
  const location = useLocation();

  // Hide on checkout page so user has complete focus on payment
  if (location.pathname === '/checkout') {
    return null;
  }

  const cartTotal = cart?.totalPrice || 0;
  const accountRoute = token ? (user?.isAdmin ? '/admin' : '/profile') : '/login';
  const accountLabel = token ? (user?.isAdmin ? 'Admin' : 'Account') : 'Login';

  return (
    <>
      {/* Blinkit Floating Cart Strip on Mobile when Cart has items */}
      {totalItems > 0 && location.pathname !== '/cart' && (
        <div className="mobile-floating-cart-bar" onClick={openCartDrawer}>
          <div className="floating-cart-left">
            <span className="cart-items-count-badge">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
            <span className="cart-items-price-tag">₹{cartTotal.toFixed(0)}</span>
          </div>
          <div className="floating-cart-right">
            <span>View Cart</span>
            <ArrowRight size={16} />
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav-bar" aria-label="Mobile Navigation">
        <NavLink
          to="/"
          className={({ isActive }) => `bottom-nav-tab ${isActive ? 'active' : ''}`}
          end
        >
          <Home size={22} className="tab-icon" />
          <span className="tab-label">Home</span>
        </NavLink>

        <NavLink
          to="/orders"
          className={({ isActive }) => `bottom-nav-tab ${isActive ? 'active' : ''}`}
        >
          <ShoppingBag size={22} className="tab-icon" />
          <span className="tab-label">Order Again</span>
        </NavLink>

        <NavLink
          to="/products"
          className={({ isActive }) => `bottom-nav-tab ${isActive ? 'active' : ''}`}
        >
          <LayoutGrid size={22} className="tab-icon" />
          <span className="tab-label">Categories</span>
        </NavLink>

        <button
          type="button"
          className="bottom-nav-tab cart-tab-trigger"
          onClick={openCartDrawer}
          aria-label="Open Cart"
        >
          <div className="cart-icon-wrapper">
            <ShoppingCart size={22} className="tab-icon" />
            {totalItems > 0 && (
              <span className="cart-tab-badge">{totalItems}</span>
            )}
          </div>
          <span className="tab-label">Cart</span>
        </button>

        <NavLink
          to={accountRoute}
          className={({ isActive }) => `bottom-nav-tab ${isActive ? 'active' : ''}`}
        >
          <User size={22} className="tab-icon" />
          <span className="tab-label">{accountLabel}</span>
        </NavLink>
      </nav>
    </>
  );
};

export default MobileBottomNav;

