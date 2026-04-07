import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../api/api';
import '../styles/Checkout.css';

const Checkout = () => {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [formData, setFormData] = useState({
    street: '',
    city: '',
    zipcode: '',
    paymentMethod: 'cod',
  });
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: '',
    cardNumber: '',
    cardholderName: '',
    expiryDate: '',
    cvv: '',
  });

  // Load saved addresses from localStorage
  useEffect(() => {
    if (!user?.id) {
      setSavedAddresses([]);
      return;
    }
    
    const saved = localStorage.getItem(`savedAddresses_${user.id}`);
    if (saved) {
      try {
        const addresses = JSON.parse(saved);
        setSavedAddresses(addresses);
        // Auto-select first address if available
        if (addresses.length > 0) {
          setSelectedAddressId(addresses[0].id);
          setFormData(prev => ({
            ...prev,
            street: addresses[0].street,
            city: addresses[0].city,
            zipcode: addresses[0].zipcode,
          }));
        }
      } catch (error) {
        console.error('Error loading addresses:', error);
        setSavedAddresses([]);
      }
    } else {
      setSavedAddresses([]);
    }
  }, [user?.id]);

  const handleSelectAddress = (address) => {
    setSelectedAddressId(address.id);
    setFormData(prev => ({
      ...prev,
      street: address.street,
      city: address.city,
      zipcode: address.zipcode,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaymentDetailsChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails((prev) => ({ ...prev, [name]: value }));
  };

  const validatePaymentDetails = () => {
    if (formData.paymentMethod === 'upi') {
      if (!paymentDetails.upiId.trim()) {
        alert('Please enter your UPI ID');
        return false;
      }
      // Basic UPI validation
      if (!/^[\w.]+@[\w]+$/.test(paymentDetails.upiId)) {
        alert('Please enter a valid UPI ID (example: 9876543210@upi)');
        return false;
      }
    } else if (formData.paymentMethod === 'card') {
      if (!paymentDetails.cardNumber.trim() || paymentDetails.cardNumber.length < 13) {
        alert('Please enter a valid card number');
        return false;
      }
      if (!paymentDetails.cardholderName.trim()) {
        alert('Please enter cardholder name');
        return false;
      }
      if (!paymentDetails.expiryDate.trim() || !/^\d{2}\/\d{2}$/.test(paymentDetails.expiryDate)) {
        alert('Please enter expiry date in MM/YY format');
        return false;
      }
      if (!paymentDetails.cvv.trim() || paymentDetails.cvv.length < 3) {
        alert('Please enter a valid CVV');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate payment details
    if (!validatePaymentDetails()) {
      return;
    }

    setLoading(true);

    try {
      await ordersAPI.createOrder(
        {
          street: formData.street,
          city: formData.city,
          zipcode: formData.zipcode,
        },
        formData.paymentMethod
      );
      await clearCart();
      setShowSuccess(true);
    } catch (apiError) {
      alert('Error placing order: ' + (apiError.message || 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewLocation = () => {
    navigate('/addresses');
  };

  const total = cart.totalPrice || 0;
  
  // Free delivery threshold
  const deliveryThreshold = 500;
  const isFreeDelivery = total >= deliveryThreshold;
  const amountNeededForFreeDelivery = Math.max(0, deliveryThreshold - total);
  const deliveryCharge = isFreeDelivery ? 0 : 40;
  const orderTotal = total + deliveryCharge;

  return (
    <div className="checkout-container">
      <div className="checkout-form">
        <h1>Checkout</h1>

        <form onSubmit={handleSubmit}>
          <h2>Delivery Address</h2>

          {/* Saved Addresses */}
          {savedAddresses.length > 0 && (
            <div className="saved-addresses-section">
              <h3>📍 Saved Addresses</h3>
              <div className="addresses-grid">
                {savedAddresses.map((address) => (
                  <div
                    key={address.id}
                    className={`address-option ${selectedAddressId === address.id ? 'selected' : ''}`}
                    onClick={() => handleSelectAddress(address)}
                  >
                    <div className="address-radio">
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={selectedAddressId === address.id}
                        onChange={() => handleSelectAddress(address)}
                      />
                    </div>
                    <div className="address-details">
                      <p className="address-street">{address.street}</p>
                      <p className="address-city">{address.city} - {address.zipcode}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="add-new-location-btn"
                onClick={handleAddNewLocation}
              >
                ➕ Add New Location
              </button>

              <div className="address-divider">
                <span>or edit manually below</span>
              </div>
            </div>
          )}

          {/* Manual Address Entry */}
          <div className="form-group">
            <label>Street Address</label>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Zip Code</label>
            <input
              type="text"
              name="zipcode"
              value={formData.zipcode}
              onChange={handleChange}
              required
            />
          </div>

          <h2>Payment Method</h2>
          <div className="payment-options">
            {['cod', 'upi', 'card'].map((method) => (
              <label key={method} className="radio-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method}
                  checked={formData.paymentMethod === method}
                  onChange={handleChange}
                />
                <span className="method-label">
                  {method === 'cod' && 'Cash on Delivery'}
                  {method === 'upi' && 'UPI'}
                  {method === 'card' && 'Card'}
                </span>
              </label>
            ))}
          </div>

          {/* UPI Payment Details */}
          {formData.paymentMethod === 'upi' && (
            <div className="payment-details-card">
              <h3>💳 Enter UPI Details</h3>
              <div className="form-group">
                <label>UPI ID</label>
                <input
                  type="text"
                  name="upiId"
                  placeholder="example: 9876543210@upi"
                  value={paymentDetails.upiId}
                  onChange={handlePaymentDetailsChange}
                  className="payment-input"
                />
                <p className="help-text">Format: 10-digit mobile@upi (or your UPI address)</p>
              </div>
            </div>
          )}

          {/* Card Payment Details */}
          {formData.paymentMethod === 'card' && (
            <div className="payment-details-card">
              <h3>💳 Enter Card Details</h3>
              <div className="form-group">
                <label>Cardholder Name</label>
                <input
                  type="text"
                  name="cardholderName"
                  placeholder="John Doe"
                  value={paymentDetails.cardholderName}
                  onChange={handlePaymentDetailsChange}
                  className="payment-input"
                />
              </div>
              <div className="form-group">
                <label>Card Number</label>
                <input
                  type="text"
                  name="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={paymentDetails.cardNumber}
                  onChange={handlePaymentDetailsChange}
                  className="payment-input"
                  maxLength="19"
                />
              </div>
              <div className="card-row">
                <div className="form-group">
                  <label>Expiry (MM/YY)</label>
                  <input
                    type="text"
                    name="expiryDate"
                    placeholder="12/26"
                    value={paymentDetails.expiryDate}
                    onChange={handlePaymentDetailsChange}
                    className="payment-input"
                    maxLength="5"
                  />
                </div>
                <div className="form-group">
                  <label>CVV</label>
                  <input
                    type="text"
                    name="cvv"
                    placeholder="123"
                    value={paymentDetails.cvv}
                    onChange={handlePaymentDetailsChange}
                    className="payment-input"
                    maxLength="4"
                  />
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="place-order-btn">
            {loading ? 'Processing...' : `Place Order (₹${orderTotal.toFixed(2)})`}
          </button>
        </form>
      </div>

      <div className="order-summary">
        <h2>Order Summary</h2>

        {/* Free Delivery Banner */}
        <div className={`free-delivery-banner ${isFreeDelivery ? 'eligible' : 'ineligible'}`}>
          {isFreeDelivery ? (
            <span>✅ Free Delivery Eligible!</span>
          ) : (
            <span>Add ₹{amountNeededForFreeDelivery.toFixed(0)} more for FREE delivery</span>
          )}
        </div>

        <div className="summary-items">
          {(cart.items || []).map((item) => (
            <div key={item.productId?._id} className="summary-item">
              <span>{item.productId?.name} x {item.quantity}</span>
              <span>₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="summary-divider"></div>

        <div className="summary-row">
          <span>Subtotal:</span>
          <span>₹{total.toFixed(2)}</span>
        </div>

        <div className="summary-row">
          <span>Delivery:</span>
          <span>{isFreeDelivery ? 'Free' : '₹40'}</span>
        </div>

        <div className="summary-total">
          Total: <strong>₹{orderTotal.toFixed(2)}</strong>
        </div>
      </div>

      {showSuccess && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon">✅</div>
            <h3>Order Confirmed</h3>
            <p>Your order has been booked successfully.</p>
            <button
              className="modal-btn"
              onClick={() => {
                setShowSuccess(false);
                navigate('/');
              }}
            >
              Go to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;