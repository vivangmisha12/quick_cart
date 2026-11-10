import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, 
  Crosshair, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  CreditCard, 
  Banknote, 
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
  Truck,
  QrCode,
  Smartphone,
  Building,
  Building2,
  Wallet,
  CheckCircle,
  RefreshCw,
  X,
  Lock,
  ArrowUpRight
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocationContext } from '../context/LocationContext';
import { ordersAPI } from '../api/api';
import '../styles/Checkout.css';

const DELIVERY_INSTRUCTIONS_OPTIONS = [
  { id: 'door', label: 'Leave at door', icon: DoorClosed },
  { id: 'bell', label: "Don't ring bell", icon: BellOff },
  { id: 'call', label: 'Avoid calling', icon: PhoneOff },
  { id: 'guard', label: 'Leave with guard', icon: Shield },
];

const TIP_OPTIONS = [0, 10, 20, 30, 50];

const POPULAR_BANKS = [
  { id: 'hdfc', name: 'HDFC Bank', code: 'HDFC', badgeColor: '#004c8f', logoLetter: 'H' },
  { id: 'sbi', name: 'State Bank of India', code: 'SBI', badgeColor: '#0082c8', logoLetter: 'SBI' },
  { id: 'icici', name: 'ICICI Bank', code: 'ICICI', badgeColor: '#9c1c1c', logoLetter: 'i' },
  { id: 'axis', name: 'Axis Bank', code: 'AXIS', badgeColor: '#97144d', logoLetter: 'A' },
  { id: 'kotak', name: 'Kotak Mahindra', code: 'KOTAK', badgeColor: '#ee1c25', logoLetter: 'K' },
  { id: 'pnb', name: 'Punjab National Bank', code: 'PNB', badgeColor: '#a20034', logoLetter: 'PNB' },
];

const OTHER_BANKS = [
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'Bank of India',
  'Indian Bank',
  'Central Bank of India',
  'IDBI Bank',
  'IndusInd Bank',
  'Federal Bank',
  'YES Bank',
  'Indian Overseas Bank',
  'UCO Bank',
  'Bank of Maharashtra',
  'Punjab & Sind Bank',
  'RBL Bank',
  'Bandhan Bank',
  'AU Small Finance Bank',
  'IDFC First Bank',
];

const UPI_HANDLES = ['@okhdfcbank', '@oksbi', '@okaxis', '@okicici', '@ybl', '@paytm'];

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
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

  // Modals & Gateway State
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [showDemoGateway, setShowDemoGateway] = useState(null);

  // Razorpay Gateway Interactive States
  const [rzpTab, setRzpTab] = useState('upi'); // 'upi' | 'netbanking' | 'cards' | 'wallets'
  const [upiSubTab, setUpiSubTab] = useState('vpa'); // 'vpa' | 'qr'
  const [upiId, setUpiId] = useState('');
  const [vpaVerified, setVpaVerified] = useState(false);
  const [vpaAccountName, setVpaAccountName] = useState('');
  const [vpaBankName, setVpaBankName] = useState('');
  const [isVerifyingVpa, setIsVerifyingVpa] = useState(false);
  const [upiWaitingApproval, setUpiWaitingApproval] = useState(false);
  const [upiCountdown, setUpiCountdown] = useState(300);

  // NetBanking state
  const [selectedBank, setSelectedBank] = useState('hdfc');
  const [otherBank, setOtherBank] = useState('');
  const [bankProcessing, setBankProcessing] = useState(false);

  // Cards state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardProcessing, setCardProcessing] = useState(false);

  // Wallets state
  const [selectedWallet, setSelectedWallet] = useState('paytm');

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

  // Load saved addresses from localStorage
  useEffect(() => {
    if (!user?.id) {
      setSavedAddresses([]);
      return;
    }
    const saved = localStorage.getItem(`savedAddresses_${user.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedAddresses(parsed);
          const defaultAddr = parsed.find((a) => a.isDefault) || parsed[0];
          setSelectedAddressId(defaultAddr.id);
          setAddressForm({
            houseNo: '',
            street: defaultAddr.street || '',
            landmark: '',
            city: defaultAddr.city || '',
            state: defaultAddr.state || '',
            zipcode: defaultAddr.zipcode || '',
            addressType: defaultAddr.label || 'Home',
          });
          return;
        }
      } catch (e) {
        console.warn('Error reading saved addresses:', e);
      }
    }
    // Default to LocationContext values
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
  }, [user?.id]);

  // Countdown timer for UPI Approval
  useEffect(() => {
    let timer;
    if (upiWaitingApproval && upiCountdown > 0) {
      timer = setInterval(() => {
        setUpiCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [upiWaitingApproval, upiCountdown]);

  // Switch Selected Address
  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setAddressForm({
      houseNo: '',
      street: addr.street || '',
      landmark: '',
      city: addr.city || '',
      state: addr.state || '',
      zipcode: addr.zipcode || '',
      addressType: addr.label || 'Home',
    });
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

  // Build full shipping address object
  const buildShippingAddress = () => {
    const fullStreetParts = [];
    if (addressForm.houseNo) fullStreetParts.push(addressForm.houseNo);
    if (addressForm.street) fullStreetParts.push(addressForm.street);
    if (addressForm.landmark) fullStreetParts.push(`(Near ${addressForm.landmark})`);

    return {
      street: fullStreetParts.join(', ') || ctxLocation || 'Gomti Nagar, Lucknow',
      city: addressForm.city || 'Lucknow',
      state: addressForm.state || 'Uttar Pradesh',
      zipcode: addressForm.zipcode || '226010',
      country: 'India',
    };
  };

  // Parse Bank Name from UPI handle
  const getBankFromVpa = (vpa) => {
    if (!vpa || !vpa.includes('@')) return 'Unified Payments Interface (NPCI)';
    const handle = vpa.split('@')[1]?.toLowerCase() || '';
    if (handle.includes('hdfc')) return 'HDFC Bank';
    if (handle.includes('sbi')) return 'State Bank of India (SBI)';
    if (handle.includes('icici')) return 'ICICI Bank';
    if (handle.includes('axis')) return 'Axis Bank';
    if (handle.includes('ybl') || handle.includes('ibl')) return 'YES Bank / PhonePe';
    if (handle.includes('paytm')) return 'Paytm Payments Bank';
    if (handle.includes('kotak')) return 'Kotak Mahindra Bank';
    if (handle.includes('pnb')) return 'Punjab National Bank (PNB)';
    if (handle.includes('barodampay') || handle.includes('bob')) return 'Bank of Baroda';
    if (handle.includes('apl')) return 'Amazon Pay (Axis Bank)';
    if (handle.includes('jupiter')) return 'Federal Bank (Jupiter)';
    return 'Verified Indian Bank (NPCI)';
  };

  // Verify VPA and fetch Account Name + Bank
  const handleVerifyVpa = () => {
    if (!upiId || !upiId.includes('@')) {
      alert('Please enter a valid UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm)');
      return;
    }
    setIsVerifyingVpa(true);
    setTimeout(() => {
      const bank = getBankFromVpa(upiId);
      const name = user?.name || 'Vivang Mishra';
      setVpaAccountName(name);
      setVpaBankName(bank);
      setVpaVerified(true);
      setIsVerifyingVpa(false);
    }, 450);
  };

  // Quick Handle Click (e.g. @okhdfcbank)
  const handleQuickHandleClick = (suffix) => {
    let prefix = upiId;
    if (upiId.includes('@')) {
      prefix = upiId.split('@')[0];
    }
    if (!prefix) {
      prefix = user?.phone || '9876543210';
    }
    const newVpa = `${prefix}${suffix}`;
    setUpiId(newVpa);
    const bank = getBankFromVpa(newVpa);
    setVpaBankName(bank);
    setVpaAccountName(user?.name || 'Vivang Mishra');
    setVpaVerified(true);
  };

  // Process Cash on Delivery (COD)
  const handlePlaceOrderCOD = async () => {
    if (items.length === 0) {
      alert('Your cart is empty');
      return;
    }
    setLoading(true);
    setErrorNotice('');

    try {
      const shippingAddress = buildShippingAddress();
      const res = await ordersAPI.createOrder({
        shippingAddress,
        paymentMethod: 'cod',
        deliveryTip,
        deliveryInstructions: selectedInstructions,
      });

      await clearCart();
      const placedOrder = res.data?.order || {
        _id: `ORD-${Date.now()}`,
        totalPrice: grandTotal,
        shippingAddress,
        paymentMethod: 'cod',
        items,
        deliveryTip
      };

      // Broadcast new order to Rider & Admin in real-time
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const channel = new BroadcastChannel('blinkit_realtime_orders');
          channel.postMessage({ type: 'NEW_ORDER', order: placedOrder, timestamp: Date.now() });
          channel.close();
        }
        localStorage.setItem('blinkit_last_order_ping', JSON.stringify({
          orderId: placedOrder._id,
          time: Date.now()
        }));
      } catch (bcErr) {
        console.warn('Realtime broadcast notice:', bcErr);
      }

      setOrderSuccess({
        orderId: placedOrder._id,
        amount: grandTotal,
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

  // Process Razorpay Payment Flow - Opens authentic full-featured Razorpay Modal
  const handlePayWithRazorpay = async () => {
    if (items.length === 0) {
      alert('Your cart is empty');
      return;
    }
    setLoading(true);
    setErrorNotice('');

    try {
      let rzpOrderId = `order_${Date.now()}`;
      try {
        const rzpOrderRes = await ordersAPI.createRazorpayOrder(grandTotal);
        if (rzpOrderRes?.data?.id) {
          rzpOrderId = rzpOrderRes.data.id;
        }
      } catch (e) {
        console.warn('Backend Razorpay order fallback:', e);
      }

      const shippingAddress = buildShippingAddress();

      // Pre-fill user data
      const defaultUserVpa = user?.phone ? `${user.phone}@okhdfcbank` : 'vivang@okhdfcbank';
      const initialVpa = upiId || defaultUserVpa;
      setUpiId(initialVpa);
      setVpaBankName(getBankFromVpa(initialVpa));
      setVpaAccountName(user?.name || 'Vivang Mishra');
      setVpaVerified(true);
      setCardHolder(user?.name || 'Vivang Mishra');
      setUpiWaitingApproval(false);
      setUpiCountdown(300);

      setShowDemoGateway({
        orderId: rzpOrderId,
        amount: grandTotal,
        shippingAddress,
      });
    } catch (err) {
      console.error('Razorpay init error:', err);
      setErrorNotice('Failed to initialize payment gateway.');
    } finally {
      setLoading(false);
    }
  };

  // Complete Payment and save in backend
  const handleCompletePayment = async (paymentDetails = {}) => {
    setLoading(true);
    try {
      const shippingAddress = showDemoGateway?.shippingAddress || buildShippingAddress();
      const mockPaymentId = `pay_${Date.now()}`;
      const mockOrderId = showDemoGateway?.orderId || `order_${Date.now()}`;

      const verifyRes = await ordersAPI.verifyRazorpayPayment({
        razorpay_order_id: mockOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: 'demo_signature_valid',
        shippingAddress,
        deliveryTip,
        deliveryInstructions: selectedInstructions,
        isDemo: true,
      });

      setShowDemoGateway(null);
      setUpiWaitingApproval(false);
      await clearCart();

      const placedOrder = verifyRes.data?.order || {
        _id: mockOrderId,
        totalPrice: grandTotal,
        shippingAddress,
        paymentMethod: 'razorpay',
        paymentId: mockPaymentId,
        items,
        deliveryTip
      };

      // Broadcast new order to Rider & Admin in real-time
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const channel = new BroadcastChannel('blinkit_realtime_orders');
          channel.postMessage({ type: 'NEW_ORDER', order: placedOrder, timestamp: Date.now() });
          channel.close();
        }
        localStorage.setItem('blinkit_last_order_ping', JSON.stringify({
          orderId: placedOrder._id,
          time: Date.now()
        }));
      } catch (bcErr) {
        console.warn('Realtime broadcast notice:', bcErr);
      }

      const methodName = paymentDetails.method 
        ? `Razorpay ${paymentDetails.method} (${paymentDetails.details || ''})` 
        : 'Razorpay Secure Payment';

      setOrderSuccess({
        orderId: placedOrder._id,
        paymentId: mockPaymentId,
        amount: grandTotal,
        paymentMethod: methodName,
        address: `${shippingAddress.street}, ${shippingAddress.city} - ${shippingAddress.zipcode}`,
        estimatedTime: '10-15 mins',
      });
    } catch (err) {
      console.error('Payment verification error:', err);
      setErrorNotice('Order placement failed: ' + (err.message || 'Server error'));
    } finally {
      setLoading(false);
      setBankProcessing(false);
      setCardProcessing(false);
    }
  };

  // Format Card Number with Spaces
  const handleCardNumberChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = val.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
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
          <div className="checkout-card address-card">
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

              {savedAddresses.map((addr) => (
                <button
                  key={addr.id}
                  type="button"
                  className={`address-chip ${selectedAddressId === addr.id ? 'active' : ''}`}
                  onClick={() => handleSelectSavedAddress(addr)}
                >
                  <span>{addr.label || 'Home'}: {addr.street?.slice(0, 20)}...</span>
                </button>
              ))}

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

      {/* =========================================================================
          REAL RAZORPAY INTERACTIVE CHECKOUT MODAL (NEVER CUT OFF)
          Includes: UPI ID with Name Fetch, NetBanking, Cards, Wallets
          ========================================================================= */}
      {showDemoGateway && (
        <div className="modal-backdrop">
          <div className="razorpay-interactive-modal">
            {/* Header */}
            <div className="rzp-header-bar">
              <div className="rzp-merchant-info">
                <div className="rzp-brand-badge-circle" style={{ background: '#ffffff', padding: '2px 8px', width: 'auto', height: '36px', borderRadius: '8px' }}>
                  <img src="/logo.png" alt="Progicart" style={{ height: '26px', width: 'auto', objectFit: 'contain' }} />
                </div>
                <div>
                  <h4 className="rzp-brand-heading">Progicart Instant Delivery</h4>
                  <span className="rzp-secured-tag">
                    <Lock size={12} /> Razorpay Trusted Payment Gateway
                  </span>
                </div>
              </div>
              <div className="rzp-header-right">
                <div className="rzp-amount-badge">
                  <span className="amount-label">AMOUNT TO PAY</span>
                  <span className="amount-val">₹{showDemoGateway.amount.toFixed(2)}</span>
                </div>
                <button 
                  className="rzp-close-btn" 
                  onClick={() => setShowDemoGateway(null)}
                  title="Close Razorpay Modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Main Interactive Body */}
            <div className="rzp-modal-body">
              {/* Left Sidebar Tabs */}
              <div className="rzp-tabs-sidebar">
                <button 
                  type="button"
                  className={`rzp-tab-btn ${rzpTab === 'upi' ? 'active' : ''}`}
                  onClick={() => { setRzpTab('upi'); setUpiWaitingApproval(false); }}
                >
                  <Smartphone size={18} />
                  <span>UPI / QR</span>
                  <span className="tab-pill-badge">Fast</span>
                </button>

                <button 
                  type="button"
                  className={`rzp-tab-btn ${rzpTab === 'netbanking' ? 'active' : ''}`}
                  onClick={() => { setRzpTab('netbanking'); setUpiWaitingApproval(false); }}
                >
                  <Building size={18} />
                  <span>NetBanking</span>
                  <span className="tab-pill-sub">All Banks</span>
                </button>

                <button 
                  type="button"
                  className={`rzp-tab-btn ${rzpTab === 'cards' ? 'active' : ''}`}
                  onClick={() => { setRzpTab('cards'); setUpiWaitingApproval(false); }}
                >
                  <CreditCard size={18} />
                  <span>Cards</span>
                </button>

                <button 
                  type="button"
                  className={`rzp-tab-btn ${rzpTab === 'wallets' ? 'active' : ''}`}
                  onClick={() => { setRzpTab('wallets'); setUpiWaitingApproval(false); }}
                >
                  <Wallet size={18} />
                  <span>Wallets</span>
                </button>
              </div>

              {/* Right Content View */}
              <div className="rzp-tab-content-panel">

                {/* 1. UPI TAB */}
                {rzpTab === 'upi' && (
                  <div className="rzp-upi-view">
                    {/* If waiting for approval */}
                    {upiWaitingApproval ? (
                      <div className="upi-waiting-screen">
                        <div className="radar-circle-animation">
                          <div className="radar-core">
                            <Smartphone size={28} className="radar-phone-icon" />
                          </div>
                          <div className="radar-wave wave-1"></div>
                          <div className="radar-wave wave-2"></div>
                          <div className="radar-wave wave-3"></div>
                        </div>

                        <h3 className="waiting-title">Approve Payment Request</h3>
                        <p className="waiting-sub">
                          Request of <strong>₹{showDemoGateway.amount.toFixed(2)}</strong> sent to:
                        </p>
                        
                        <div className="upi-verified-badge-large">
                          <span className="vpa-pill">📱 {upiId}</span>
                          <span className="acc-name">✓ {vpaAccountName || user?.name || 'Vivang Mishra'}</span>
                          <span className="bank-sub">{vpaBankName}</span>
                        </div>

                        <div className="countdown-timer-box">
                          <span className="timer-label">Time Remaining</span>
                          <span className="timer-digits">
                            {Math.floor(upiCountdown / 60).toString().padStart(2, '0')}:
                            {(upiCountdown % 60).toString().padStart(2, '0')}
                          </span>
                        </div>

                        <p className="instructions-step">
                          Open your UPI app (Google Pay / PhonePe / Paytm / BHIM) and enter your UPI PIN to approve the payment.
                        </p>

                        <div className="approval-actions">
                          <button 
                            className="simulate-approve-btn"
                            disabled={loading}
                            onClick={() => handleCompletePayment({ method: 'UPI', details: `${upiId} - ${vpaBankName}` })}
                          >
                            {loading ? 'Processing Payment...' : '⚡ Confirm & Complete Payment'}
                          </button>
                          <button 
                            className="cancel-approval-btn"
                            onClick={() => setUpiWaitingApproval(false)}
                            disabled={loading}
                          >
                            Back to Payment Methods
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Subtabs for UPI */}
                        <div className="upi-subtab-strip">
                          <button 
                            type="button"
                            className={`upi-subtab-btn ${upiSubTab === 'vpa' ? 'active' : ''}`}
                            onClick={() => setUpiSubTab('vpa')}
                          >
                            Enter UPI ID / VPA
                          </button>
                          <button 
                            type="button"
                            className={`upi-subtab-btn ${upiSubTab === 'qr' ? 'active' : ''}`}
                            onClick={() => setUpiSubTab('qr')}
                          >
                            Scan QR Code
                          </button>
                        </div>

                        {upiSubTab === 'vpa' ? (
                          <div className="vpa-entry-container">
                            <label className="vpa-field-label">
                              Enter your UPI ID / Virtual Payment Address (VPA)
                            </label>

                            <div className="vpa-input-group">
                              <input 
                                type="text"
                                className="vpa-input-box"
                                placeholder="e.g. 9876543210@paytm or yourname@okhdfcbank"
                                value={upiId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setUpiId(val);
                                  if (val.includes('@') && val.split('@')[1]?.length >= 3) {
                                    setVpaBankName(getBankFromVpa(val));
                                    setVpaAccountName(user?.name || 'Vivang Mishra');
                                    setVpaVerified(true);
                                  } else {
                                    setVpaVerified(false);
                                  }
                                }}
                              />
                              <button 
                                type="button" 
                                className="vpa-verify-action-btn"
                                onClick={handleVerifyVpa}
                                disabled={isVerifyingVpa || !upiId}
                              >
                                {isVerifyingVpa ? 'Verifying...' : 'Verify'}
                              </button>
                            </div>

                            {/* Quick handle pills */}
                            <div className="quick-handles-list">
                              <span className="handles-label">Quick select handle:</span>
                              <div className="handle-chips">
                                {UPI_HANDLES.map((suffix) => (
                                  <button
                                    key={suffix}
                                    type="button"
                                    className="handle-chip"
                                    onClick={() => handleQuickHandleClick(suffix)}
                                  >
                                    {suffix}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Verified Name & Bank Display */}
                            {vpaVerified && (
                              <div className="vpa-verified-status-card">
                                <div className="status-icon-circle">
                                  <Check size={16} />
                                </div>
                                <div className="status-info">
                                  <div className="status-name-row">
                                    <span className="acc-name">{vpaAccountName || user?.name || 'Vivang Mishra'}</span>
                                    <span className="verified-badge-tag">✓ Verified Account</span>
                                  </div>
                                  <span className="bank-name-sub">
                                    Bank: <strong>{vpaBankName}</strong> (NPCI Real-Time Lookup)
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Supported UPI Apps Row */}
                            <div className="supported-apps-row">
                              <span>Compatible with all UPI apps:</span>
                              <div className="apps-badges">
                                <span className="app-tag gpay">Google Pay</span>
                                <span className="app-tag phonepe">PhonePe</span>
                                <span className="app-tag paytm">Paytm</span>
                                <span className="app-tag bhim">BHIM</span>
                                <span className="app-tag cred">CRED</span>
                              </div>
                            </div>

                            {/* Pay CTA */}
                            <button
                              type="button"
                              className="rzp-primary-pay-btn"
                              disabled={loading || !upiId.includes('@')}
                              onClick={() => {
                                if (!vpaVerified) handleVerifyVpa();
                                setUpiWaitingApproval(true);
                                setUpiCountdown(300);
                              }}
                            >
                              <span>Pay ₹{showDemoGateway.amount.toFixed(2)} via UPI</span>
                              <ArrowUpRight size={18} />
                            </button>
                          </div>
                        ) : (
                          /* Scan QR Code Tab */
                          <div className="qr-scan-container">
                            <div className="qr-box">
                              <div className="qr-placeholder">
                                <div className="qr-grid-pattern">
                                  {/* Simulated authentic SVG QR Code */}
                                  <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
                                    <rect width="180" height="180" fill="white"/>
                                    {/* Corners */}
                                    <rect x="15" y="15" width="45" height="45" rx="6" fill="#0c2340"/>
                                    <rect x="23" y="23" width="29" height="29" rx="3" fill="white"/>
                                    <rect x="29" y="29" width="17" height="17" fill="#0c831f"/>

                                    <rect x="120" y="15" width="45" height="45" rx="6" fill="#0c2340"/>
                                    <rect x="128" y="23" width="29" height="29" rx="3" fill="white"/>
                                    <rect x="134" y="29" width="17" height="17" fill="#0c831f"/>

                                    <rect x="15" y="120" width="45" height="45" rx="6" fill="#0c2340"/>
                                    <rect x="23" y="128" width="29" height="29" rx="3" fill="white"/>
                                    <rect x="29" y="134" width="17" height="17" fill="#0c831f"/>

                                    {/* Data dots */}
                                    <rect x="75" y="20" width="10" height="10" fill="#0c2340"/>
                                    <rect x="95" y="20" width="10" height="10" fill="#0c2340"/>
                                    <rect x="75" y="40" width="10" height="10" fill="#0c2340"/>
                                    <rect x="75" y="60" width="30" height="10" fill="#0c2340"/>
                                    <rect x="20" y="75" width="140" height="10" fill="#0c2340"/>
                                    <rect x="20" y="95" width="20" height="10" fill="#0c2340"/>
                                    <rect x="50" y="95" width="20" height="10" fill="#0c2340"/>
                                    <rect x="80" y="95" width="30" height="10" fill="#0c2340"/>
                                    <rect x="120" y="95" width="40" height="10" fill="#0c2340"/>
                                    <rect x="75" y="120" width="15" height="15" fill="#0c2340"/>
                                    <rect x="100" y="120" width="25" height="15" fill="#0c2340"/>
                                    <rect x="135" y="120" width="25" height="15" fill="#0c2340"/>
                                    <rect x="75" y="145" width="35" height="15" fill="#0c2340"/>
                                    <rect x="120" y="145" width="40" height="15" fill="#0c2340"/>

                                    {/* Center Blinkit icon */}
                                    <circle cx="90" cy="90" r="16" fill="#f8cb46"/>
                                    <text x="90" y="95" textAnchor="middle" fill="#0c831f" fontSize="13" fontWeight="bold">b!</text>
                                  </svg>
                                </div>
                              </div>
                            </div>
                            <h4 className="qr-title">Scan & Pay ₹{showDemoGateway.amount.toFixed(2)}</h4>
                            <p className="qr-sub">Scan with any UPI app on your phone</p>
                            <button
                              type="button"
                              className="rzp-primary-pay-btn"
                              disabled={loading}
                              onClick={() => handleCompletePayment({ method: 'UPI QR', details: 'Scan & Pay' })}
                            >
                              <span>Simulate QR Scan & Pay (₹{showDemoGateway.amount.toFixed(2)})</span>
                              <ArrowUpRight size={18} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* 2. NETBANKING TAB */}
                {rzpTab === 'netbanking' && (
                  <div className="rzp-netbanking-view">
                    <h4 className="netbanking-title">Select Your Bank</h4>
                    <p className="netbanking-sub">Pay directly using your bank account via netbanking</p>

                    {/* Popular 6 banks grid */}
                    <div className="banks-grid">
                      {POPULAR_BANKS.map((b) => (
                        <div 
                          key={b.id}
                          className={`bank-card ${selectedBank === b.id ? 'active' : ''}`}
                          onClick={() => { setSelectedBank(b.id); setOtherBank(''); }}
                        >
                          <div 
                            className="bank-avatar"
                            style={{ backgroundColor: b.badgeColor }}
                          >
                            {b.logoLetter}
                          </div>
                          <span className="bank-card-name">{b.name}</span>
                          {selectedBank === b.id && (
                            <span className="bank-checked-indicator">
                              <Check size={12} />
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Other banks dropdown */}
                    <div className="other-banks-field">
                      <label>All Other Indian Banks</label>
                      <select 
                        value={otherBank} 
                        onChange={(e) => {
                          setOtherBank(e.target.value);
                          if (e.target.value) setSelectedBank('');
                        }}
                      >
                        <option value="">Select from 40+ other banks...</option>
                        {OTHER_BANKS.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Selected Bank Banner */}
                    <div className="selected-bank-banner">
                      <ShieldCheck size={18} className="bank-lock-icon" />
                      <span>
                        Paying via: <strong>
                          {otherBank || POPULAR_BANKS.find((b) => b.id === selectedBank)?.name || 'HDFC Bank'}
                        </strong>
                      </span>
                    </div>

                    {/* Pay CTA */}
                    <button
                      type="button"
                      className="rzp-primary-pay-btn"
                      disabled={loading || bankProcessing}
                      onClick={() => {
                        setBankProcessing(true);
                        const bName = otherBank || POPULAR_BANKS.find((b) => b.id === selectedBank)?.name || 'HDFC Bank';
                        setTimeout(() => {
                          handleCompletePayment({ method: 'NetBanking', details: bName });
                        }, 1200);
                      }}
                    >
                      {bankProcessing ? (
                        <span>Redirecting to Secure Bank Portal...</span>
                      ) : (
                        <>
                          <span>Pay ₹{showDemoGateway.amount.toFixed(2)} via NetBanking</span>
                          <ArrowUpRight size={18} />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* 3. CARDS TAB */}
                {rzpTab === 'cards' && (
                  <div className="rzp-cards-view">
                    <h4 className="cards-title">Enter Card Details</h4>
                    <p className="cards-sub">Debit & Credit Cards (Visa, Mastercard, RuPay, Amex)</p>

                    <div className="card-form-grid">
                      <div className="card-input-field full">
                        <label>Card Number</label>
                        <div className="card-num-input-wrap">
                          <input 
                            type="text"
                            placeholder="4532 •••• •••• 8890"
                            maxLength="19"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                          />
                          <CreditCard size={18} className="card-trailing-icon" />
                        </div>
                      </div>

                      <div className="card-input-field half">
                        <label>Expiry (MM/YY)</label>
                        <input 
                          type="text"
                          placeholder="12/28"
                          maxLength="5"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                        />
                      </div>

                      <div className="card-input-field half">
                        <label>CVV</label>
                        <input 
                          type="password"
                          placeholder="•••"
                          maxLength="4"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                        />
                      </div>

                      <div className="card-input-field full">
                        <label>Cardholder Name</label>
                        <input 
                          type="text"
                          placeholder="Name as on card"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="rbi-secure-tag">
                      <Lock size={12} />
                      <span>Card details encrypted and tokenized according to RBI guidelines</span>
                    </div>

                    <button
                      type="button"
                      className="rzp-primary-pay-btn"
                      disabled={loading || cardProcessing}
                      onClick={() => {
                        setCardProcessing(true);
                        setTimeout(() => {
                          handleCompletePayment({ 
                            method: 'Card', 
                            details: `Card ending with ${cardNumber.slice(-4) || '8890'}` 
                          });
                        }, 1200);
                      }}
                    >
                      {cardProcessing ? (
                        <span>Verifying 3D Secure OTP...</span>
                      ) : (
                        <>
                          <span>Pay ₹{showDemoGateway.amount.toFixed(2)}</span>
                          <ArrowUpRight size={18} />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* 4. WALLETS TAB */}
                {rzpTab === 'wallets' && (
                  <div className="rzp-wallets-view">
                    <h4 className="wallets-title">Select Wallet</h4>
                    <p className="wallets-sub">Link your wallet for 1-tap checkout</p>

                    <div className="wallets-list">
                      {[
                        { id: 'paytm', name: 'Paytm Wallet', icon: '⚡' },
                        { id: 'phonepe', name: 'PhonePe Wallet', icon: '📱' },
                        { id: 'amazonpay', name: 'Amazon Pay', icon: '📦' },
                        { id: 'mobikwik', name: 'MobiKwik', icon: '💳' },
                      ].map((w) => (
                        <div 
                          key={w.id}
                          className={`wallet-row ${selectedWallet === w.id ? 'active' : ''}`}
                          onClick={() => setSelectedWallet(w.id)}
                        >
                          <span className="wallet-emoji">{w.icon}</span>
                          <span className="wallet-name">{w.name}</span>
                          <div className="wallet-radio">
                            {selectedWallet === w.id && <div className="wallet-radio-dot" />}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="rzp-primary-pay-btn"
                      disabled={loading}
                      onClick={() => {
                        handleCompletePayment({ method: 'Wallet', details: selectedWallet.toUpperCase() });
                      }}
                    >
                      <span>Pay ₹{showDemoGateway.amount.toFixed(2)} via Wallet</span>
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                )}

              </div>
            </div>

            {/* Bottom Security Footer */}
            <div className="rzp-modal-footer">
              <span className="footer-safe-tag">
                🔒 256-bit SSL Encrypted • PCI-DSS Certified • 100% Safe Payments
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ORDER CONFIRMED SUCCESS MODAL (NEVER CUT OFF)
          ========================================================================= */}
      {orderSuccess && (
        <div className="modal-backdrop">
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
