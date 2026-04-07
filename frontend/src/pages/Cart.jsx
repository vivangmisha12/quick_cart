import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import '../styles/Cart.css';

const Cart = () => {
  const { cart, fetchCart, removeFromCart, updateCartItem } = useCart();
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
  const deliveryThreshold = 500;
  const isFreeDelivery = total >= deliveryThreshold;
  const amountNeededForFreeDelivery = Math.max(0, deliveryThreshold - total);

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity > 0) {
      updateCartItem(productId, newQuantity);
    }
  };

  if (items.length === 0) {
    return (
      <div className="cart-container">
        <div className="empty-cart">
          <h2>Your cart is empty</h2>
          <p>Add some products to get started!</p>
          <Link to="/products" className="continue-shopping">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h1>Shopping Cart</h1>
      <div className="cart-content">
        <div className="cart-items">
          {items.map((item) => (
            <div key={item.productId?._id || item.productId} className="cart-item">
              <img
                src={item.productId?.image || 'https://via.placeholder.com/100'}
                alt={item.productId?.name}
              />
              <div className="item-details">
                <h3>{item.productId?.name}</h3>
                <p>₹{item.price}</p>
              </div>
              <div className="quantity-control">
                <button onClick={() => handleQuantityChange(item.productId._id, item.quantity - 1)}>-</button>
                <input type="number" value={item.quantity} readOnly />
                <button onClick={() => handleQuantityChange(item.productId._id, item.quantity + 1)}>+</button>
              </div>
              <div className="item-total">
                ₹{(item.price * item.quantity).toFixed(2)}
              </div>
              <button
                className="remove-btn"
                onClick={() => removeFromCart(item.productId._id)}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h2>Order Summary</h2>

          {/* Free Delivery Banner */}
          <div className={`free-delivery-banner ${isFreeDelivery ? 'eligible' : 'ineligible'}`}>
            {isFreeDelivery ? (
              <span>✅ Free Delivery Eligible!</span>
            ) : (
              <span>Add ₹{amountNeededForFreeDelivery.toFixed(0)} more for FREE delivery</span>
            )}
          </div>

          <div className="summary-row">
            <span>Subtotal:</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Delivery:</span>
            <span>{isFreeDelivery ? 'Free' : '₹40'}</span>
          </div>
          <div className="summary-row total">
            <span>Total:</span>
            <span>₹{(total + (isFreeDelivery ? 0 : 40)).toFixed(2)}</span>
          </div>
          <button
            className="checkout-btn"
            onClick={() => navigate('/checkout')}
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;