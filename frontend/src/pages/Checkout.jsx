import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Crosshair,
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Sparkles,
  ChevronRight,
  Plus,
  DoorClosed,
  BellOff,
  PhoneOff,
  Shield,
  ShoppingBag,
  AlertCircle,
  Check,
  ArrowLeft,
  Truck
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocationContext } from '../context/LocationContext';
import { ordersAPI, userAddressesAPI } from '../api/api';
import '../styles/Checkout.css';

const DELIVERY_INSTRUCTIONS_OPTIONS = [
  { id: 'door', label: 'Leave at door', icon: DoorClosed },
  { id: 'bell', label: "Don't ring bell", icon: BellOff },
  { id: 'call', label: 'Avoid calling', icon: PhoneOff },
  { id: 'guard', label: 'Leave with guard', icon: Shield },
];

const TIP_OPTIONS = [0, 10, 20, 30, 50];

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

const loadRazorpayCheckoutScript = () => {
  if (typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existing && existing.dataset.status !== 'error') {
      existing.addEventListener('load', () => resolve(Boolean(window.Razorpay)), { once: true });
      existing.addEventListener('error', () => {
        existing.dataset.status = 'error';
        resolve(false);
      }, { once: true });
      return;
    }
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      script.dataset.status = 'loaded';
      resolve(Boolean(window.Razorpay));
    };
    script.onerror = () => {
      script.dataset.status = 'error';
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

const broadcastOrderPlaced = (placedOrder) => {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('blinkit_realtime_orders');
      channel.postMessage({ type: 'NEW_ORDER', order: placedOrder, timestamp: Date.now() });
      channel.close();
    }
    localStorage.setItem(
      'blinkit_last_order_ping',
      JSON.stringify({
        orderId: placedOrder._id,
        time: Date.now(),
      })
    );
  } catch (bcErr) {
    console.warn('Realtime broadcast notice:', bcErr);
  }
};

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  
  // Location Context Integration
  const { 
    location: ctxLocation, 
    formattedAddress: ctxFormattedAddress, 
    addressParts: ctxAddressParts, 
    coords: ctxCoords, 
    detectLocation: ctxDetectLocation,
    locating: ctxLocating 
  } = useLocationContext();

  const [loading, setLoading] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsSuccessNotice, setGpsSuccessNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('current_location');

  // Address Details Form
  const [addressForm, setAddressForm] = useState({
    houseNo: '',
    street: '',
    landmark: '',
    city: '',
    state: '',
    zipcode: '',
    addressType: 'Home',
  });

  // Delivery options
  const [selectedInstructions, setSelectedInstructions] = useState(['Leave at door']);
  const [deliveryTip, setDeliveryTip] = useState(20);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

  // Order Success Modal State
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Sync with LocationContext on initial load or change
  useEffect(() => {
    if (selectedAddressId === 'current_location') {
      const streetVal = ctxAddressParts?.street || ctxLocation || '';
      const cityVal = ctxAddressParts?.city || 'Lucknow';
      const stateVal = ctxAddressParts?.state || 'Uttar Pradesh';
      const zipVal = ctxAddressParts?.zipcode || '226010';

      setAddressForm((prev) => ({
        ...prev,
        street: prev.street && prev.street !== '' ? prev.street : streetVal,
        city: prev.city && prev.city !== '' ? prev.city : cityVal,
        state: prev.state && prev.state !== '' ? prev.state : stateVal,
        zipcode: prev.zipcode && prev.zipcode !== '' ? prev.zipcode : zipVal,
      }));
    }
  }, [ctxAddressParts, ctxLocation, selectedAddressId]);

  const applyAddressToForm = (addr) => {
    if (!addr) return;
    setAddressForm({
      houseNo: addr.houseNo || '',
      street: addr.area || addr.street || '',
      landmark: addr.landmark || '',
      city: addr.city || 'Lucknow',
      state: addr.state || 'Uttar Pradesh',
      zipcode: addr.zipcode || '226010',
      addressType: addr.label || 'Home',
    });
  };

  const syncSavedAddressesState = (list) => {
    if (!Array.isArray(list)) return;
    const normalized = list.map((addr) => ({
      ...addr,
      id: String(addr.id || addr._id || Date.now()),
    }));
    setSavedAddresses(normalized);
    if (user?.id) {
      localStorage.setItem(`savedAddresses_${user.id}`, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent('addressesUpdated', { detail: normalized }));
    }
    if (typeof updateUser === 'function') {
      updateUser({ addresses: normalized });
    }
  };

  // Load saved addresses from User DB record with localStorage fallback
  useEffect(() => {
    let cancelled = false;
    const initAddresses = async () => {
      if (!user?.id) {
        setSavedAddresses([]);
        return;
      }

      let resolvedList = Array.isArray(user.addresses) ? user.addresses : [];
      try {
        const res = await userAddressesAPI.getAll();
        if (Array.isArray(res.data?.addresses)) {
          resolvedList = res.data.addresses;
        }
      } catch (err) {
        // Fallback cleanly to hydrated user addresses or localStorage cache
      }

      if (resolvedList.length === 0) {
        const saved = localStorage.getItem(`savedAddresses_${user.id}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) resolvedList = parsed;
          } catch (e) {
            console.warn('Error reading saved addresses:', e);
          }
        }
      }

      if (cancelled) return;

      if (resolvedList.length > 0) {
        const normalized = resolvedList.map((a) => ({
          ...a,
          id: String(a.id || a._id || Date.now()),
        }));
        setSavedAddresses(normalized);
        localStorage.setItem(`savedAddresses_${user.id}`, JSON.stringify(normalized));
        const defaultAddr = normalized.find((a) => a.isDefault) || normalized[0];
        setSelectedAddressId(defaultAddr.id);
        applyAddressToForm(defaultAddr);
        return;
      }

      setSelectedAddressId('current_location');
      setAddressForm({
        houseNo: '',
        street: ctxAddressParts?.street || ctxLocation || 'Gomti Nagar',
        landmark: '',
        city: ctxAddressParts?.city || 'Lucknow',
        state: ctxAddressParts?.state || 'Uttar Pradesh',
        zipcode: ctxAddressParts?.zipcode || '226010',
        addressType: 'Home',
      });
    };

    initAddresses();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Mark body while checkout is active to suppress mobile bottom-nav extra padding/footer clutter
  useEffect(() => {
    document.body.classList.add('checkout-page-active');
    return () => {
      document.body.classList.remove('checkout-page-active');
    };
  }, []);

  // Switch Selected Address
  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(String(addr.id || addr._id));
    applyAddressToForm(addr);
    setGpsSuccessNotice('');
  };

  const handleSelectCurrentLocation = () => {
    setSelectedAddressId('current_location');
    setAddressForm((prev) => ({
      ...prev,
      street: ctxAddressParts?.street || ctxLocation || 'Gomti Nagar',
      city: ctxAddressParts?.city || 'Lucknow',
      state: ctxAddressParts?.state || 'Uttar Pradesh',
      zipcode: ctxAddressParts?.zipcode || '226010',
    }));
    setGpsSuccessNotice('Current detected location applied!');
  };

  // Trigger GPS Geolocation
  const handleDetectLocationGPS = async () => {
    setDetectingGps(true);
    setGpsSuccessNotice('');
    setErrorNotice('');
    try {
      const res = await ctxDetectLocation();
      setSelectedAddressId('current_location');
      setAddressForm((prev) => ({
        ...prev,
        street: res?.street || res?.display || prev.street,
        city: res?.city || prev.city,
        state: res?.state || prev.state,
        zipcode: res?.postcode || prev.zipcode,
      }));
      setGpsSuccessNotice(`📍 GPS Detected: ${res?.display || 'Coordinates verified'}`);
      setTimeout(() => setGpsSuccessNotice(''), 5000);
    } catch (err) {
      console.error('GPS detect error in checkout:', err);
      setErrorNotice(err.message || 'Could not fetch GPS location. Please allow browser location access.');
      setTimeout(() => setErrorNotice(''), 6000);
    } finally {
      setDetectingGps(false);
    }
  };

  // Toggle delivery instruction chips
  const toggleInstruction = (label) => {
    setSelectedInstructions((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  // Calculation Breakdown
  const items = cart.items || [];
  const itemTotal = cart.totalPrice || 0;
  const deliveryThreshold = 499;
  const isFreeDelivery = itemTotal >= deliveryThreshold;
  const deliveryFee = isFreeDelivery ? 0 : 15;
  const handlingFee = itemTotal > 0 ? 2 : 0;
  const grandTotal = Math.max(0, itemTotal + deliveryFee + handlingFee + deliveryTip);

  // Build full shipping address object (including separate flat/houseNo, area, landmark for DB storage)
  const buildShippingAddress = () => {
    const houseNo = (addressForm.houseNo || '').trim();
    const area = (addressForm.street || '').trim();
    const landmark = (addressForm.landmark || '').trim();
    const fullStreetParts = [];
    if (houseNo) fullStreetParts.push(houseNo);
    if (area) fullStreetParts.push(area);
    if (landmark) fullStreetParts.push(`(Near ${landmark})`);

    return {
      label: addressForm.addressType || 'Home',
      houseNo,
      area,
      landmark,
      street: fullStreetParts.join(', ') || ctxLocation || 'Gomti Nagar, Lucknow',
      city: (addressForm.city || 'Lucknow').trim(),
      state: (addressForm.state || 'Uttar Pradesh').trim(),
      zipcode: (addressForm.zipcode || '226010').trim(),
      country: 'India',
    };
  };

  // Validate required delivery address inputs before order/payment
  const validateDeliveryForm = () => {
    if (items.length === 0) {
      setErrorNotice('Your cart is empty.');
      return false;
    }
    if (!addressForm.houseNo?.trim()) {
      setErrorNotice('Please enter House / Flat / Block / Floor No.');
      return false;
    }
    if (!addressForm.street?.trim()) {
      setErrorNotice('Please enter Area / Street / Sector for delivery.');
      return false;
    }
    if (!/^\d{6}$/.test((addressForm.zipcode || '').trim())) {
      setErrorNotice('Please enter a valid 6-digit delivery pincode.');
      return false;
    }
    return true;
  };

  // Process Cash on Delivery (COD)
  const handlePlaceOrderCOD = async () => {
    if (!validateDeliveryForm()) return;
    setLoading(true);
    setErrorNotice('');

    try {
      const shippingAddress = buildShippingAddress();
      const res = await ordersAPI.createOrder({
        shippingAddress,
        deliveryCoordinates: ctxCoords?.lat && ctxCoords?.lng ? ctxCoords : undefined,
        paymentMethod: 'cod',
        deliveryTip,
        deliveryInstructions: selectedInstructions,
      });

      if (Array.isArray(res.data?.savedAddresses) && res.data.savedAddresses.length > 0) {
        syncSavedAddressesState(res.data.savedAddresses);
      }

      await clearCart();
      const placedOrder = res.data?.order || {
        _id: `ORD-${Date.now()}`,
        totalPrice: grandTotal,
        shippingAddress,
        paymentMethod: 'cod',
        items,
        deliveryTip,
      };

      broadcastOrderPlaced(placedOrder);

      setOrderSuccess({
        orderId: placedOrder._id,
        amount: placedOrder.totalPrice || grandTotal,
        paymentMethod: 'Cash on Delivery (COD)',
        address: `${shippingAddress.street}, ${shippingAddress.city} - ${shippingAddress.zipcode}`,
        estimatedTime: '10-15 mins',
      });
    } catch (err) {
      console.error('COD order error:', err);
      setErrorNotice(err.response?.data?.message || err.message || 'Failed to place order.');
    } finally {
      setLoading(false);
    }
  };

  const formatPaymentErrorForUser = (
    errObj,
    fallback = 'Online payment is temporarily unavailable right now. Please try again or pay with Cash on Delivery (COD).'
  ) => {
    const raw =
      typeof errObj === 'string'
        ? errObj
        : errObj?.response?.data?.message || errObj?.message || '';
    if (!raw) return fallback;
    if (
      /(\.env|RAZORPAY_|credential|not configured|authentication failed|invalid key|sdk|server response|gateway|econnrefused|network error)/i.test(
        raw
      )
    ) {
      return fallback;
    }
    return raw;
  };

  // Process Official Production Razorpay Checkout Payment Flow
  const handlePayWithRazorpay = async () => {
    if (!validateDeliveryForm()) return;
    setLoading(true);
    setErrorNotice('');

    try {
      const sdkLoaded = await loadRazorpayCheckoutScript();
      if (!sdkLoaded || !window.Razorpay) {
        throw new Error('Unable to load the payment page. Please check your internet connection and try again.');
      }

      const shippingAddress = buildShippingAddress();
      const rzpOrderRes = await ordersAPI.createRazorpayOrder(deliveryTip, shippingAddress);
      const { id: rzpOrderId, amount: rzpAmount, currency, keyId } = rzpOrderRes.data || {};

      if (!rzpOrderId || !keyId) {
        throw new Error(
          'Online payment is temporarily unavailable right now. Please try again or use Cash on Delivery (COD).'
        );
      }

      const isPublicWebOrigin =
        typeof window !== 'undefined' &&
        window.location.origin.startsWith('https://') &&
        !window.location.hostname.includes('localhost');

      const options = {
        key: keyId,
        amount: rzpAmount,
        currency: currency || 'INR',
        name: 'Progicart',
        description: `10-Min Grocery Order (${items.length} ${items.length === 1 ? 'item' : 'items'})`,
        ...(isPublicWebOrigin ? { image: `${window.location.origin}/logo.png` } : {}),
        order_id: rzpOrderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        notes: {
          address: `${shippingAddress.street}, ${shippingAddress.city} - ${shippingAddress.zipcode}`,
        },
        theme: {
          color: '#0c831f',
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setLoading(false);
            setErrorNotice('Payment was cancelled. Your cart items are still saved.');
          },
        },
        handler: async (response) => {
          setLoading(true);
          setErrorNotice('');
          try {
            const verifyRes = await ordersAPI.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              shippingAddress,
              deliveryCoordinates: ctxCoords?.lat && ctxCoords?.lng ? ctxCoords : undefined,
              deliveryTip,
              deliveryInstructions: selectedInstructions,
            });

            if (Array.isArray(verifyRes.data?.savedAddresses) && verifyRes.data.savedAddresses.length > 0) {
              syncSavedAddressesState(verifyRes.data.savedAddresses);
            }

            await clearCart();
            const placedOrder = verifyRes.data?.order || {
              _id: response.razorpay_order_id,
              totalPrice: grandTotal,
              shippingAddress,
              paymentMethod: 'razorpay',
              items,
              deliveryTip,
            };

            broadcastOrderPlaced(placedOrder);

            setOrderSuccess({
              orderId: placedOrder._id,
              paymentId: response.razorpay_payment_id,
              amount: placedOrder.totalPrice || grandTotal,
              paymentMethod: placedOrder.paymentMethodDetail
                ? `Razorpay (${placedOrder.paymentMethodDetail.toUpperCase()})`
                : 'Razorpay Verified Online Payment',
              address: `${shippingAddress.street}, ${shippingAddress.city} - ${shippingAddress.zipcode}`,
              estimatedTime: '10-15 mins',
            });
          } catch (verifyErr) {
            console.error('Payment verification error:', verifyErr);
            setErrorNotice(
              formatPaymentErrorForUser(
                verifyErr,
                'We could not confirm your payment. Please contact support if any amount was debited.'
              )
            );
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (failRes) => {
        console.error('Razorpay payment failed:', failRes?.error);
        setLoading(false);
        setErrorNotice(
          formatPaymentErrorForUser(
            failRes?.error?.description,
            'Your payment could not be completed. Please try another payment method or Cash on Delivery (COD).'
          )
        );
      });
      rzp.open();
    } catch (err) {
      console.error('Razorpay init error:', err);
      setLoading(false);
      setErrorNotice(
        formatPaymentErrorForUser(
          err,
          'Unable to start online payment right now. Please try again or pay with Cash on Delivery (COD).'
        )
      );
    }
  };

  // If cart is empty and no successful order placed
  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="checkout-empty-state">
        <div className="empty-cart-card">
          <div className="empty-icon-bubble">
            <ShoppingBag size={48} className="empty-icon" />
          </div>
          <h2>Your Cart is Empty</h2>
          <p>You haven't added any groceries to your cart yet. Add items to enjoy 10-minute instant delivery!</p>
          <Link to="/products" className="explore-groceries-btn">
            Explore Groceries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page-container">
      {/* Top Breadcrumb & Speed Banner */}
      <div className="checkout-top-strip">
        <div className="strip-container">
          <button className="back-to-cart-btn" onClick={() => navigate('/cart')}>
            <ArrowLeft size={16} /> Back to Cart
          </button>
          <div className="delivery-time-pill">
            <span className="lightning-icon">⚡</span>
            <span>Delivering in <strong>10-15 minutes</strong> to <strong>{addressForm.city || 'Lucknow'}</strong></span>
          </div>
        </div>
      </div>

      <div className="checkout-layout">
        {/* LEFT COLUMN: Address, Delivery Instructions, Items, and Payment Choice */}
        <div className="checkout-main-content">
          
          {/* Address Section */}
          <div className="checkout-card checkout-address-card">
            <div className="card-header">
              <div className="card-header-title">
                <MapPin className="section-icon text-green" size={20} />
                <div>
                  <h3>1. Delivery Address</h3>
                  <p className="card-header-sub">Doorstep delivery within 10-15 mins</p>
                </div>
              </div>

              {/* Instant 1-Click GPS Button */}
              <button 
                type="button" 
                className={`gps-locate-btn ${detectingGps || ctxLocating ? 'locating' : ''}`}
                onClick={handleDetectLocationGPS}
                disabled={detectingGps || ctxLocating}
                title="Detect exact coordinates via GPS"
              >
                <Crosshair size={16} className={detectingGps || ctxLocating ? 'spin-icon' : ''} />
                <span>{detectingGps || ctxLocating ? 'Detecting GPS...' : 'Use Current GPS'}</span>
              </button>
            </div>

            {/* GPS Success Notice */}
            {gpsSuccessNotice && (
              <div className="alert-notice-success">
                <CheckCircle2 size={16} />
                <span>{gpsSuccessNotice}</span>
              </div>
            )}

            {/* Error Notice */}
            {errorNotice && (
              <div className="alert-notice-error">
                <AlertCircle size={16} />
                <span>{errorNotice}</span>
              </div>
            )}

            {/* Address Switcher Chips */}
            <div className="address-quick-chips">
              <button
                type="button"
                className={`address-chip ${selectedAddressId === 'current_location' ? 'active' : ''}`}
                onClick={handleSelectCurrentLocation}
              >
                <MapPin size={14} />
                <span>📍 Current GPS Location ({ctxLocation || 'Detected'})</span>
              </button>

              {savedAddresses.map((addr) => {
                const displayLine = addr.houseNo
                  ? `${addr.houseNo}, ${addr.area || addr.street || ''}`
                  : addr.street || '';
                const chipId = String(addr.id || addr._id);
                return (
                  <button
                    key={chipId}
                    type="button"
                    className={`address-chip ${selectedAddressId === chipId ? 'active' : ''}`}
                    onClick={() => handleSelectSavedAddress(addr)}
                  >
                    <span>{addr.label || 'Home'}: {displayLine.slice(0, 22)}{displayLine.length > 22 ? '...' : ''}</span>
                  </button>
                );
              })}

              <Link to="/addresses" className="address-chip-manage">
                <Plus size={14} /> Manage Addresses
              </Link>
            </div>

            {/* Address Form Inputs */}
            <div className="address-form-grid">
              <div className="form-field full-width">
                <label>House / Flat / Block / Floor No. <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Flat 302, Royal Residency / House 12-A"
                  value={addressForm.houseNo}
                  onChange={(e) => setAddressForm({ ...addressForm, houseNo: e.target.value })}
                />
              </div>

              <div className="form-field full-width">
                <label>Area / Street / Sector <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Vibhuti Khand, Gomti Nagar"
                  value={addressForm.street}
                  onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                  required
                />
              </div>

              <div className="form-field">
                <label>Nearby Landmark (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Opposite Wave Mall"
                  value={addressForm.landmark}
                  onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>City</label>
                <input
                  type="text"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  required
                />
              </div>

              <div className="form-field">
                <label>State</label>
                <input
                  type="text"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  required
                />
              </div>

              <div className="form-field">
                <label>Pincode <span className="req">*</span></label>
                <input
                  type="text"
                  value={addressForm.zipcode}
                  onChange={(e) => setAddressForm({ ...addressForm, zipcode: e.target.value })}
                  maxLength="6"
                  required
                />
              </div>
            </div>

            {/* Address Type Tag */}
            <div className="address-tag-row">
              <span className="tag-label">Save as:</span>
              {['Home', 'Work', 'Other'].map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`tag-btn ${addressForm.addressType === type ? 'active' : ''}`}
                  onClick={() => setAddressForm({ ...addressForm, addressType: type })}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Instructions Section */}
          <div className="checkout-card instructions-card">
            <div className="card-header">
              <div className="card-header-title">
                <Truck className="section-icon text-green" size={20} />
                <div>
                  <h3>2. Delivery Instructions</h3>
                  <p className="card-header-sub">Rider will follow these contactless guidelines</p>
                </div>
              </div>
            </div>

            <div className="instructions-grid">
              {DELIVERY_INSTRUCTIONS_OPTIONS.map((item) => {
                const IconComp = item.icon;
                const isSelected = selectedInstructions.includes(item.label);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`instruction-pill ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleInstruction(item.label)}
                  >
                    <IconComp size={18} className="pill-icon" />
                    <span>{item.label}</span>
                    {isSelected && <Check size={14} className="pill-check" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="checkout-card payment-method-card">
            <div className="card-header">
              <div className="card-header-title">
                <CreditCard className="section-icon text-green" size={20} />
                <div>
                  <h3>3. Select Payment Method</h3>
                  <p className="card-header-sub">100% Secure & encrypted checkout</p>
                </div>
              </div>
            </div>

            <div className="payment-options-list">
              {/* Razorpay Option */}
              <div 
                className={`payment-option-row ${paymentMethod === 'razorpay' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('razorpay')}
              >
                <div className="radio-circle">
                  {paymentMethod === 'razorpay' && <div className="radio-inner" />}
                </div>
                <div className="option-info">
                  <div className="option-title-row">
                    <span className="option-name">Razorpay Secure Online Payment</span>
                    <span className="badge-blinkit-green">⚡ Recommended</span>
                  </div>
                  <p className="option-desc">
                    UPI (Google Pay, PhonePe, Paytm, BHIM), NetBanking (SBI, HDFC, ICICI, etc.), Cards & Wallets
                  </p>
                  <div className="payment-badges-strip">
                    <span className="pay-badge">UPI</span>
                    <span className="pay-badge">GPay</span>
                    <span className="pay-badge">PhonePe</span>
                    <span className="pay-badge">NetBanking</span>
                    <span className="pay-badge">Visa</span>
                    <span className="pay-badge">Mastercard</span>
                    <span className="pay-badge">RuPay</span>
                  </div>
                </div>
              </div>

              {/* Cash on Delivery Option */}
              <div 
                className={`payment-option-row ${paymentMethod === 'cod' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('cod')}
              >
                <div className="radio-circle">
                  {paymentMethod === 'cod' && <div className="radio-inner" />}
                </div>
                <div className="option-info">
                  <div className="option-title-row">
                    <span className="option-name">Cash on Delivery (COD)</span>
                    <span className="badge-cod">Pay at Doorstep</span>
                  </div>
                  <p className="option-desc">
                    Pay with Cash or UPI directly to our delivery partner upon receiving groceries.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cart Items Preview */}
          <div className="checkout-card items-preview-card">
            <div className="card-header">
              <div className="card-header-title">
                <ShoppingBag className="section-icon text-green" size={20} />
                <div>
                  <h3>Items in Cart ({items.length})</h3>
                  <p className="card-header-sub">Packed fresh from nearest dark store</p>
                </div>
              </div>
            </div>

            <div className="items-list-compact">
              {items.map((item) => {
                const product = item.productId || {};
                const id = product._id || item.productId;
                return (
                  <div key={id} className="item-row-compact">
                    <div className="item-img-box">
                      {product.image ? (
                        <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
                      ) : (
                        <div className="img-placeholder">{product.name?.charAt(0) || 'P'}</div>
                      )}
                    </div>
                    <div className="item-details">
                      <h4 className="item-name">{product.name}</h4>
                      <span className="item-unit">{product.unit || '1 pack'}</span>
                    </div>
                    <div className="item-qty-badge">
                      <span>Qty: {item.quantity}</span>
                    </div>
                    <div className="item-price">
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Tip Selector, Bill Details, and CTA */}
        <div className="checkout-sidebar">
          
          {/* Tip Section */}
          <div className="sidebar-card tip-card">
            <div className="tip-header">
              <Sparkles size={16} className="text-yellow" />
              <h4>Delivery Partner Tip</h4>
            </div>
            <p className="tip-sub">100% of the tip goes directly to your delivery partner</p>
            <div className="tip-pills">
              {TIP_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={`tip-btn ${deliveryTip === amount ? 'selected' : ''}`}
                  onClick={() => setDeliveryTip(amount)}
                >
                  {amount === 0 ? 'No tip' : `₹${amount}`}
                </button>
              ))}
            </div>
          </div>

          {/* Bill Details */}
          <div className="sidebar-card bill-card">
            <h4 className="bill-card-title">Bill Details</h4>

            <div className="bill-row">
              <span className="bill-label">Items Total</span>
              <span className="bill-value">₹{itemTotal.toFixed(2)}</span>
            </div>

            <div className="bill-row">
              <span className="bill-label">
                Delivery Charge
                {isFreeDelivery && <span className="free-tag">FREE</span>}
              </span>
              <span className="bill-value">
                {isFreeDelivery ? <span className="strike-free"><strike>₹15</strike> ₹0</span> : '₹15.00'}
              </span>
            </div>

            <div className="bill-row">
              <span className="bill-label">Handling & Packaging Fee</span>
              <span className="bill-value">₹{handlingFee.toFixed(2)}</span>
            </div>

            {deliveryTip > 0 && (
              <div className="bill-row">
                <span className="bill-label">Delivery Partner Tip</span>
                <span className="bill-value">₹{deliveryTip.toFixed(2)}</span>
              </div>
            )}

            <div className="bill-divider"></div>

            <div className="bill-grand-total">
              <div>
                <span className="total-title">Grand Total</span>
                <p className="inclusive-tax">Inclusive of all taxes</p>
              </div>
              <span className="total-amount">₹{grandTotal.toFixed(2)}</span>
            </div>

            {/* Cancellation Policy Note */}
            <div className="cancellation-policy-box">
              <ShieldCheck size={16} className="policy-icon" />
              <p>Cancellation Policy: Orders cannot be cancelled once packed for 10-minute instant delivery.</p>
            </div>

            {/* Inline Error Alert before CTA */}
            {errorNotice && (
              <div className="alert-notice-error" style={{ marginBottom: 12 }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{errorNotice}</span>
              </div>
            )}

            {/* Place Order / Pay CTA Button */}
            <div className="checkout-cta-box">
              {paymentMethod === 'razorpay' ? (
                <button 
                  type="button"
                  className="pay-now-btn razorpay-cta"
                  disabled={loading}
                  onClick={handlePayWithRazorpay}
                >
                  {loading ? (
                    <span className="loading-cta">
                      <span className="spinner-dots"></span> Connecting Razorpay...
                    </span>
                  ) : (
                    <>
                      <span>Pay ₹{grandTotal.toFixed(2)} with Razorpay</span>
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              ) : (
                <button 
                  type="button"
                  className="pay-now-btn cod-cta"
                  disabled={loading}
                  onClick={handlePlaceOrderCOD}
                >
                  {loading ? (
                    <span className="loading-cta">
                      <span className="spinner-dots"></span> Booking COD Order...
                    </span>
                  ) : (
                    <>
                      <span>Place COD Order (₹{grandTotal.toFixed(2)})</span>
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* 100% Safe Payments Assurance */}
            <div className="safe-assurance">
              <ShieldCheck size={14} className="safe-icon" />
              <span>256-bit Bank Grade Encrypted & Verified</span>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Floating Sticky Checkout Action Bar (Active on <= 768px Mobile & Tablets) */}
      <div className="mobile-checkout-sticky-bar">
        {errorNotice && (
          <div className="alert-notice-error" style={{ marginBottom: 8, padding: '7px 10px', fontSize: 12 }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{errorNotice}</span>
          </div>
        )}
        <div className="mobile-bar-inner">
          <div 
            className="mobile-bar-bill-info"
            onClick={() => {
              const billEl = document.querySelector('.bill-card');
              if (billEl) {
                billEl.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            title="Tap to review bill breakdown"
          >
            <div className="mobile-bar-total-row">
              <span className="mobile-bar-currency">₹</span>
              <span className="mobile-bar-amount">{grandTotal.toFixed(0)}</span>
              <span className="mobile-bar-arrow">▲</span>
            </div>
            <span className="mobile-bar-sub">
              {items.length} {items.length === 1 ? 'item' : 'items'} • View Bill
            </span>
          </div>

          <button
            type="button"
            className={`mobile-bar-pay-btn ${paymentMethod === 'razorpay' ? 'btn-razorpay' : 'btn-cod'}`}
            disabled={loading}
            onClick={paymentMethod === 'razorpay' ? handlePayWithRazorpay : handlePlaceOrderCOD}
          >
            {loading ? (
              <span className="mobile-btn-spinner">Processing...</span>
            ) : (
              <>
                <span>{paymentMethod === 'razorpay' ? `Pay ₹${grandTotal.toFixed(0)}` : 'Place COD Order'}</span>
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          ORDER CONFIRMED SUCCESS MODAL (NEVER CUT OFF)
          ========================================================================= */}
      {orderSuccess && (
        <div className="checkout-modal-backdrop">
          <div className="order-success-modal">
            <div className="success-icon-animation">
              <CheckCircle2 size={56} className="text-green success-bounce" />
            </div>

            <h2>Order Confirmed! 🚀</h2>
            <p className="success-sub">Your groceries are being packed at the nearest Progicart dark store.</p>

            <div className="order-details-box">
              <div className="detail-line">
                <span className="label">Order ID:</span>
                <span className="value mono">{orderSuccess.orderId}</span>
              </div>
              {orderSuccess.paymentId && (
                <div className="detail-line">
                  <span className="label">Payment ID:</span>
                  <span className="value mono">{orderSuccess.paymentId}</span>
                </div>
              )}
              <div className="detail-line">
                <span className="label">Total Paid:</span>
                <span className="value bold">₹{orderSuccess.amount.toFixed(2)}</span>
              </div>
              <div className="detail-line">
                <span className="label">Payment Method:</span>
                <span className="value text-green bold">{orderSuccess.paymentMethod}</span>
              </div>
              <div className="detail-line">
                <span className="label">Delivery Address:</span>
                <span className="value address-val">{orderSuccess.address}</span>
              </div>
              <div className="detail-line highlight">
                <span className="label">Estimated Delivery:</span>
                <span className="value text-green bold">⚡ {orderSuccess.estimatedTime}</span>
              </div>
            </div>

            <div className="modal-bottom-actions">
              <button 
                className="btn-track-orders"
                onClick={() => navigate('/orders')}
              >
                Track Order Live
              </button>
              <button 
                className="btn-home-return"
                onClick={() => navigate('/')}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { Checkout };
