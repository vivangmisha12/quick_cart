import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Clock, 
  ChevronRight 
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import LazyImage from '../components/LazyImage';
import '../styles/Cart.css';

const Cart = () => {
  const { cart, fetchCart, removeFromCart, updateCartItem, totalItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchCart();
    }
  }, [user]);

  const items = cart.items || [];
  const total = cart.totalPrice || 0;
  
  // Free delivery threshold
  const deliveryThreshold = 499;
  const isFreeDelivery = total >= deliveryThreshold;
  const amountNeeded = Math.max(0, deliveryThreshold - total);
  const deliveryFee = isFreeDelivery || total === 0 ? 0 : 35;
  const handlingFee = total > 0 ? 4 : 0;
  const grandTotal = total + deliveryFee + handlingFee;

  if (items.length === 0) {
    return (
      <div className="cart-page-wrapper">
        <div className="cart-top-back-bar">
          <button
            type="button"
            className="page-back-round-btn"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
        <div className="empty-cart-card">
          <div className="empty-icon-circle">
            <ShoppingBag size={56} color="#0c831f" strokeWidth={1.5} />
          </div>
          <h2>Your cart is empty</h2>
          <p>Explore thousands of fresh groceries & everyday essentials delivered in 10 minutes.</p>
          <Link to="/products" className="start-shopping-action">
            Browse Products <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-wrapper">
      <div className="cart-page-header">
        <div className="cart-title-with-back">
          <button
            type="button"
            className="page-back-round-btn"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1>Shopping Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})</h1>
        </div>
        <div className="cart-delivery-eta-pill">
          <Clock size={15} />
          <span>Delivery in 10-15 mins</span>
        </div>
      </div>

      <div className="cart-grid-layout">
        {/* Items List */}
        <div className="cart-items-container">
          {/* Free Delivery Bar */}
          <div className="cart-free-delivery-banner">
            {isFreeDelivery ? (
              <span className="free-text eligible">🎉 You unlocked <strong>FREE delivery</strong>!</span>
            ) : (
              <span className="free-text">
                Add <strong>₹{amountNeeded.toFixed(0)}</strong> more to get <strong>FREE delivery</strong>
              </span>
            )}
            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.min(100, Math.round((total / deliveryThreshold) * 100))}%` }} 
              />
            </div>
          </div>

          <div className="cart-items-list-card">
            {items.map((item) => {
              const prod = item.productId || {};
              const id = prod._id || item.productId;
              return (
                <div key={id} className="cart-item-row">
                  <div className="cart-item-thumb">
                    {prod.image ? (
                      <LazyImage src={prod.image} alt={prod.name} width={70} height={70} />
                    ) : (
                      <div className="thumb-placeholder">{prod.name?.charAt(0) || 'P'}</div>
                    )}
                  </div>

                  <div className="cart-item-info">
                    <h3>{prod.name}</h3>
                    <span className="item-unit">{prod.unit || '1 unit'}</span>
                    <span className="item-price">₹{item.price}</span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="cart-stepper-pill">
                    <button 
                      type="button" 
                      onClick={() => {
                        if (item.quantity > 1) {
                          updateCartItem(id, item.quantity - 1);
                        } else {
                          removeFromCart(id);
                        }
                      }}
                    >
                      <Minus size={13} strokeWidth={3} />
                    </button>
                    <span className="stepper-val">{item.quantity}</span>
                    <button 
                      type="button" 
                      onClick={() => updateCartItem(id, item.quantity + 1)}
                    >
                      <Plus size={13} strokeWidth={3} />
                    </button>
                  </div>

                  <div className="cart-item-total">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>

                  <button
                    type="button"
                    className="cart-remove-icon-btn"
                    onClick={() => removeFromCart(id)}
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary Column */}
        <div className="cart-summary-col">
          <div className="cart-summary-card">
            <h2>Bill Details</h2>

            <div className="bill-summary-row">
              <span>Items Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>

            <div className="bill-summary-row">
              <span>Delivery Charge</span>
              <span className={isFreeDelivery ? 'text-green' : ''}>
                {isFreeDelivery ? 'FREE' : `₹${deliveryFee}`}
              </span>
            </div>

            <div className="bill-summary-row">
              <span>Handling Charge</span>
              <span>₹{handlingFee}</span>
            </div>

            <div className="bill-summary-divider" />

            <div className="bill-summary-row grand-total-row">
              <strong>Grand Total</strong>
              <strong>₹{grandTotal.toFixed(2)}</strong>
            </div>

            <button
              type="button"
              className="proceed-checkout-btn"
              onClick={() => navigate('/checkout')}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="checkout-trust-badge">
            <ShieldCheck size={20} color="#0c831f" />
            <p>100% Safe Payments • Instant Doorstep Delivery</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
