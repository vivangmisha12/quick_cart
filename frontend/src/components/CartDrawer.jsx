import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, ArrowRight, ShieldCheck, Clock, Trash2, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import '../styles/CartDrawer.css';

const CartDrawer = () => {
  const { cart, totalItems, isCartDrawerOpen, closeCartDrawer, updateCartItem, removeFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tip, setTip] = useState(0);

  if (!isCartDrawerOpen) return null;

  const items = cart.items || [];
  const itemTotal = cart.totalPrice || 0;
  const deliveryThreshold = 499;
  const isFreeDelivery = itemTotal >= deliveryThreshold;
  const amountNeeded = Math.max(0, deliveryThreshold - itemTotal);
  const progressPercent = Math.min(100, Math.round((itemTotal / deliveryThreshold) * 100));

  const deliveryCharge = isFreeDelivery || itemTotal === 0 ? 0 : 35;
  const handlingFee = itemTotal > 0 ? 4 : 0;
  const grandTotal = itemTotal + deliveryCharge + handlingFee + tip;

  const handleCheckout = () => {
    closeCartDrawer();
    if (!user) {
      navigate('/login');
    } else {
      navigate('/checkout');
    }
  };

  return (
    <div className="cart-drawer-overlay" onClick={closeCartDrawer}>
      <div 
        className="cart-drawer" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Shopping Cart"
      >
        {/* Header */}
        <div className="cart-drawer-header">
          <div className="cart-header-left">
            <h3>My Cart</h3>
            <span className="cart-header-count">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
          </div>
          <div className="cart-header-right">
            <div className="delivery-eta-chip">
              <Clock size={14} className="eta-icon" />
              <span>10-15 mins</span>
            </div>
            <button className="cart-drawer-close" onClick={closeCartDrawer} aria-label="Close cart">
              <X size={20} />
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          /* Empty State */
          <div className="cart-drawer-empty">
            <div className="empty-cart-icon-wrapper">
              <ShoppingBag size={48} color="#0c831f" strokeWidth={1.5} />
            </div>
            <h4>Your cart is empty</h4>
            <p>Looks like you haven't added anything to your cart yet</p>
            <button 
              className="start-shopping-btn"
              onClick={() => {
                closeCartDrawer();
                navigate('/products');
              }}
            >
              Browse Products
            </button>
          </div>
        ) : (
          <>
            {/* Scrollable Content */}
            <div className="cart-drawer-body">
              {/* Free Delivery Milestone */}
              <div className="free-delivery-milestone">
                <div className="milestone-top">
                  {isFreeDelivery ? (
                    <span className="milestone-text success">🎉 Yay! You unlocked <strong>FREE delivery</strong></span>
                  ) : (
                    <span className="milestone-text">
                      Shop for <strong>₹{amountNeeded}</strong> more to get <strong>FREE delivery</strong>
                    </span>
                  )}
                  <span className="milestone-target">₹{deliveryThreshold}</span>
                </div>
                <div className="milestone-progress-bar">
                  <div 
                    className="milestone-progress-fill" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="cart-items-section">
                <h4 className="section-title">Review Items ({totalItems})</h4>
                <div className="drawer-items-list">
                  {items.map((item) => {
                    const product = item.productId || {};
                    const id = product._id || item.productId;
                    return (
                      <div key={id} className="drawer-item-card">
                        <div className="drawer-item-img-box">
                          {product.image ? (
                            <img src={product.image} alt={product.name} />
                          ) : (
                            <div className="drawer-img-placeholder">
                              {product.name?.charAt(0) || 'P'}
                            </div>
                          )}
                        </div>
                        <div className="drawer-item-details">
                          <p className="drawer-item-name">{product.name || 'Product'}</p>
                          <span className="drawer-item-unit">{product.unit || '1 pc'}</span>
                          <div className="drawer-item-price-row">
                            <span className="drawer-item-price">₹{item.price}</span>
                            {product.discount > 0 && (
                              <span className="drawer-item-mrp">
                                ₹{Math.round(item.price / (1 - product.discount / 100))}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="drawer-qty-stepper">
                          <button 
                            className="qty-step-btn"
                            onClick={() => {
                              if (item.quantity > 1) {
                                updateCartItem(id, item.quantity - 1);
                              } else {
                                removeFromCart(id);
                              }
                            }}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="qty-step-val">{item.quantity}</span>
                          <button 
                            className="qty-step-btn"
                            onClick={() => updateCartItem(id, item.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tip Delivery Partner */}
              <div className="tip-partner-box">
                <div className="tip-title-row">
                  <h4>Tip your delivery partner</h4>
                  <span className="tip-sub">100% goes to the rider</span>
                </div>
                <div className="tip-options-chips">
                  {[10, 20, 30, 50].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className={`tip-chip ${tip === amount ? 'selected' : ''}`}
                      onClick={() => setTip(tip === amount ? 0 : amount)}
                    >
                      {tip === amount ? '✓ ' : ''}₹{amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bill Details */}
              <div className="bill-details-card">
                <h4 className="bill-title">Bill Details</h4>
                <div className="bill-row">
                  <span>Items total</span>
                  <span className="bill-val">₹{itemTotal.toFixed(2)}</span>
                </div>
                <div className="bill-row">
                  <span>Delivery charge</span>
                  <span className={`bill-val ${isFreeDelivery ? 'green-free' : ''}`}>
                    {isFreeDelivery ? 'FREE' : `₹${deliveryCharge}`}
                  </span>
                </div>
                <div className="bill-row">
                  <span>Handling charge</span>
                  <span className="bill-val">₹{handlingFee}</span>
                </div>
                {tip > 0 && (
                  <div className="bill-row">
                    <span>Delivery tip</span>
                    <span className="bill-val">₹{tip}</span>
                  </div>
                )}
                <div className="bill-divider" />
                <div className="bill-row grand-total-row">
                  <strong>Grand Total</strong>
                  <strong>₹{grandTotal.toFixed(2)}</strong>
                </div>
              </div>

              {/* Safe & Secure Guarantee */}
              <div className="safe-checkout-badge">
                <ShieldCheck size={18} color="#0c831f" />
                <span>100% Safe and Secure payments guaranteed</span>
              </div>
            </div>

            {/* Sticky Bottom Bar */}
            <div className="cart-drawer-footer">
              <button className="blinkit-checkout-btn" onClick={handleCheckout}>
                <div className="checkout-btn-left">
                  <span className="btn-total-amount">₹{grandTotal.toFixed(2)}</span>
                  <span className="btn-subtext">TOTAL • {totalItems} items</span>
                </div>
                <div className="checkout-btn-right">
                  <span>Proceed to Pay</span>
                  <ArrowRight size={18} />
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;

