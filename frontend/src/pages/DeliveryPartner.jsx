import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Truck,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Package,
  Check,
  Store,
  Volume2,
  VolumeX,
  X,
  Zap,
  Radio,
  LogOut,
  Wallet,
  Bike,
  User,
  Power,
  Lock,
  Crosshair,
  RotateCcw
} from 'lucide-react';
import { deliveryAPI, authAPI } from '../api/api';
import RiderVerificationFields, { RIDER_HUB_OPTIONS } from '../components/RiderVerificationFields';
import '../styles/DeliveryLogin.css';
import '../styles/DeliveryPartner.css';

const ORDER_STEPS = [
  { key: 'accepted', label: 'Accepted' },
  { key: 'packing', label: 'Packed' },
  { key: 'out_for_delivery', label: 'On Way' },
  { key: 'delivered', label: 'Delivered' },
];

const getStepIndex = (status) => {
  if (status === 'delivered') return 4;
  if (status === 'out_for_delivery' || status === 'shipped') return 2;
  if (status === 'picked_up') return 2;
  if (status === 'packing') return 1;
  return 0; // pending / confirmed / assigned
};

const getAcceptanceSecondsLeft = (order) => {
  if (!order?.assignment?.expiresAt) return 120;
  const diff = Math.ceil((new Date(order.assignment.expiresAt).getTime() - Date.now()) / 1000);
  return Math.max(0, diff);
};

const formatMinutesAgo = (dateString) => {
  if (!dateString) return 0;
  const diffMs = Date.now() - new Date(dateString).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
};

const DeliveryPartner = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed'
  const [isOnDuty, setIsOnDuty] = useState(user?.isOnline !== undefined ? Boolean(user.isOnline) : true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [syncingGps, setSyncingGps] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [tick, setTick] = useState(0); // Live clock tick for SLA minutes & 120s timers

  // Incoming Request Alert Modal state (120-second SLA)
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [incomingCountdown, setIncomingCountdown] = useState(120);

  // Verification / KYC onboarding state for Admin-created riders
  const defaultHub = RIDER_HUB_OPTIONS[0];
  const [kycForm, setKycForm] = useState({
    newPassword: '',
    vehicleType: user?.vehicleType || 'bike',
    vehicleNumber: user?.vehicleNumber || '',
    drivingLicenseNumber: user?.kycDetails?.drivingLicenseNumber || '',
    idType: user?.kycDetails?.idType || 'Aadhaar',
    idNumber: user?.kycDetails?.idNumber || '',
    emergencyContact: user?.kycDetails?.emergencyContact || user?.phone || '',
    bankOrUpi: user?.kycDetails?.bankOrUpi || '',
    assignedHub: user?.assignedHub || defaultHub.value,
    lat: user?.currentLocation?.lat || defaultHub.lat,
    lng: user?.currentLocation?.lng || defaultHub.lng,
    area: user?.currentLocation?.area || defaultHub.area,
    gpsLocked: false,
  });
  const [verifyingKyc, setVerifyingKyc] = useState(false);
  const [kycError, setKycError] = useState('');

  // Keep track of known orders to avoid re-alerting already seen orders
  const knownOrderIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  const needsVerification = Boolean(user && !user.isAdmin && user.verificationStatus !== 'verified');

  // Dynamic Rider Profile Info from logged in user
  const riderProfile = {
    name: user?.name || 'Progicart Rider',
    phone: user?.phone || '9876543210',
    vehicleNumber: user?.vehicleNumber || 'UP-32-BK-2024',
    darkStore: user?.assignedHub || 'Dark Store #04 • Vibhuti Khand, Lucknow',
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 3200);
  };

  // Web Audio API Synthesizer: Authentic Ding-Dong Delivery Chime
  const playOrderAlertSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.setValueAtTime(880.00, now + 0.16);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(293.66, now);
      osc2.frequency.setValueAtTime(440.00, now + 0.16);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);

      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 300]);
      }
    } catch (e) {
      console.warn('Audio chime notice:', e);
    }
  };

  // Fetch active delivery orders from backend
  const fetchDeliveryOrders = async (silent = false) => {
    if (needsVerification) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await deliveryAPI.getActiveOrders();
      const fetched = res.data || [];
      setOrders(fetched);

      if (isOnDuty && fetched.length > 0) {
        fetched.forEach((ord) => {
          const isAwaitingAccept =
            ['confirmed', 'pending', 'assigned'].includes(ord.status) && !ord.assignment?.acceptedAt;
          if (isAwaitingAccept && !knownOrderIdsRef.current.has(ord._id)) {
            knownOrderIdsRef.current.add(ord._id);

            if (!initialLoadRef.current) {
              setIncomingOrder(ord);
              setIncomingCountdown(getAcceptanceSecondsLeft(ord) || 120);
              playOrderAlertSound();
            }
          } else {
            knownOrderIdsRef.current.add(ord._id);
          }
        });
      }

      initialLoadRef.current = false;
    } catch (err) {
      console.error('Delivery orders fetch error:', err);
      if (!silent) setError('Could not fetch active delivery orders. Check connection.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Sync live GPS coordinates & online duty status to backend
  const syncRiderStatusToServer = async (nextOnline, withGps = false) => {
    const sendStatus = async (coordsPayload = {}) => {
      try {
        const res = await authAPI.updateDeliveryStatus({
          isOnline: nextOnline,
          ...coordsPayload,
        });
        if (res.data?.user) updateUser(res.data.user);
      } catch (e) {
        console.warn('Rider status sync notice:', e);
      }
    };

    if (withGps && navigator.geolocation) {
      setSyncingGps(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await sendStatus({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
            area: `Live GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
          });
          setSyncingGps(false);
          showToast('Live GPS location synced for nearest order matching!');
        },
        async () => {
          await sendStatus();
          setSyncingGps(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      await sendStatus();
    }
  };

  // Complete KYC / Verification form submit (Admin-created rider onboarding)
  const handleCompleteKycVerification = async (e) => {
    e.preventDefault();
    setKycError('');
    setVerifyingKyc(true);
    try {
      const res = await authAPI.verifyDelivery(kycForm);
      if (res.data?.user) {
        updateUser(res.data.user);
        setIsOnDuty(true);
      }
      showToast('KYC Verified! You are now ONLINE and ready for nearest deliveries.');
    } catch (err) {
      setKycError(err.response?.data?.message || err.message || 'Verification failed. Check fields.');
    } finally {
      setVerifyingKyc(false);
    }
  };

  // Setup Real-Time Listeners (BroadcastChannel + LocalStorage + Fast 3s Polling)
  useEffect(() => {
    if (needsVerification) return;
    fetchDeliveryOrders(false);

    let channel;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('blinkit_realtime_orders');
        channel.onmessage = (event) => {
          if (event.data?.type === 'NEW_ORDER' && event.data?.order) {
            fetchDeliveryOrders(true);
          }
        };
      }
    } catch (bcErr) {
      console.warn('BroadcastChannel init notice:', bcErr);
    }

    const handleStorageChange = (e) => {
      if (e.key === 'blinkit_last_order_ping') {
        fetchDeliveryOrders(true);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const interval = setInterval(() => {
      fetchDeliveryOrders(true);
      setTick((t) => t + 1);
    }, 3000);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [isOnDuty, soundEnabled, needsVerification]);

  // Countdown timer for Incoming Order Request Modal (120-Second SLA Auto Re-route)
  useEffect(() => {
    let timer;
    if (incomingOrder && incomingCountdown > 0) {
      timer = setInterval(() => {
        setIncomingCountdown((prev) => {
          if (prev <= 1) {
            setIncomingOrder(null);
            fetchDeliveryOrders(true);
            showToast('120s window expired — Order auto re-routed to next hub/rider!');
            return 120;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [incomingOrder, incomingCountdown]);

  // Live 1s countdown tick for assigned-but-unaccepted order cards
  useEffect(() => {
    const secTimer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(secTimer);
  }, []);

  // Accept incoming order request
  const handleAcceptIncomingOrder = async (orderToAccept) => {
    const id = orderToAccept._id;
    setUpdatingId(id);
    try {
      await deliveryAPI.updateOrderStatus(id, 'packing', {
        partnerName: riderProfile.name,
        partnerPhone: riderProfile.phone,
        vehicleNumber: riderProfile.vehicleNumber,
      });

      setIncomingOrder(null);
      await fetchDeliveryOrders(true);
      setActiveTab('active');
      showToast('Order accepted! Start packing items at Dark Store.');
    } catch (err) {
      console.error('Accept order error:', err);
      setError(err.response?.data?.message || 'Could not accept order. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeclineOrder = async (orderToDecline) => {
    const target = orderToDecline || incomingOrder;
    setIncomingOrder(null);
    if (!target?._id) return;
    setUpdatingId(target._id);
    try {
      await deliveryAPI.declineOrder(target._id);
      await fetchDeliveryOrders(true);
      showToast('Order skipped — immediately re-routed to next nearest rider & location!');
    } catch (err) {
      console.warn('Decline order notice:', err);
      await fetchDeliveryOrders(true);
    } finally {
      setUpdatingId(null);
    }
  };

  // Progression of delivery statuses (Optimistic update + server sync)
  const handleStatusTransition = async (orderId, nextStatus) => {
    setUpdatingId(orderId);
    const prevOrders = [...orders];

    // Instant UI update
    setOrders((prev) =>
      prev.map((ord) =>
        ord._id === orderId
          ? {
              ...ord,
              status: nextStatus,
              updatedAt: new Date().toISOString(),
              deliveryPartner: {
                name: riderProfile.name,
                phone: riderProfile.phone,
                vehicleNumber: riderProfile.vehicleNumber,
              },
            }
          : ord
      )
    );

    if (nextStatus === 'delivered') {
      playOrderAlertSound();
      showToast('Trip completed! Earnings added to your payout.');
    } else if (nextStatus === 'out_for_delivery') {
      showToast('On the way! Follow Maps to customer location.');
    } else if (nextStatus === 'picked_up') {
      showToast('Bag picked up! Ready to ride.');
    } else if (nextStatus === 'packing') {
      showToast('Delivery accepted! Verify items in bag.');
    }

    try {
      await deliveryAPI.updateOrderStatus(orderId, nextStatus, {
        partnerName: riderProfile.name,
        partnerPhone: riderProfile.phone,
        vehicleNumber: riderProfile.vehicleNumber,
      });
    } catch (err) {
      console.error('Failed to update delivery status:', err);
      setOrders(prevOrders);
      setError('Failed to update order status. Please check your internet.');
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleItemCheck = (orderId, itemIdx) => {
    const key = `${orderId}_${itemIdx}`;
    setCheckedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Filter Active vs Completed orders
  const activeOrders = orders.filter((o) =>
    ['pending', 'confirmed', 'packing', 'assigned', 'picked_up', 'out_for_delivery', 'shipped'].includes(o.status)
  );
  const completedOrders = orders.filter((o) => o.status === 'delivered');

  // Calculate dynamic earnings
  const completedCount = completedOrders.length;
  const totalTips = completedOrders.reduce((sum, o) => sum + (o.deliveryTip || 0), 0);
  const baseEarnings = completedCount * 35;
  const totalPayout = baseEarnings + totalTips;

  const getInitials = (name) => {
    return (name || 'R')
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // First-Login KYC & Verification Onboarding Screen for Admin-created Delivery Partners
  if (needsVerification) {
    return (
      <div className="rider-portal-page">
        <header className="rider-top-header">
          <div className="rider-header-content">
            <div className="rider-brand-group">
              <div className="rider-logo-wrap">
                <img src="/logo.png" alt="Progicart" className="rider-header-logo-img" />
              </div>
              <span className="rider-pill">KYC VERIFICATION</span>
            </div>
            <div className="rider-header-actions">
              <button
                type="button"
                className="rider-logout-btn"
                onClick={() => {
                  logout();
                  navigate('/delivery/login');
                }}
              >
                <LogOut size={15} />
                <span className="hide-xs">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <div className="rider-kyc-onboarding-container">
          <div className="rider-kyc-onboarding-card">
            <div className="kyc-welcome-banner">
              <div className="kyc-avatar-badge">{getInitials(user?.name)}</div>
              <div>
                <span className="kyc-status-chip">VERIFICATION PENDING</span>
                <h2>Welcome, {user?.name}!</h2>
                <p>
                  Admin has added your profile ({user?.email} &bull; {user?.phone}). Complete your Vehicle &amp; KYC verification below to start receiving nearest orders.
                </p>
              </div>
            </div>

            {kycError && (
              <div className="rider-alert-banner error">
                <AlertCircle size={16} />
                <span>{kycError}</span>
              </div>
            )}

            <form onSubmit={handleCompleteKycVerification} className="delivery-login-form">
              <RiderVerificationFields
                form={kycForm}
                onChange={(k, v) => setKycForm((prev) => ({ ...prev, [k]: v }))}
                onLocationDetected={(loc) => setKycForm((prev) => ({ ...prev, ...loc }))}
              />

              <div className="delivery-input-group">
                <label>Set New Password (Optional — replace temporary password)</label>
                <div className="delivery-input-field">
                  <Lock size={17} className="input-svg-icon" />
                  <input
                    type="password"
                    placeholder="Leave blank to keep existing password (min 6 chars)"
                    value={kycForm.newPassword}
                    onChange={(e) => setKycForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="status-transition-btn delivered-cta"
                disabled={verifyingKyc}
              >
                <ShieldCheck size={18} />
                <span>{verifyingKyc ? 'Submitting Verification...' : 'Submit Verification & Start Duty'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rider-portal-page">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="rider-toast-banner">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Rider Fleet Header */}
      <header className="rider-top-header">
        <div className="rider-header-content">
          <div className="rider-brand-group">
            <div className="rider-logo-wrap">
              <img src="/logo.png" alt="Progicart" className="rider-header-logo-img" />
            </div>
            <span className="rider-pill">RIDER</span>
            {isOnDuty && (
              <span className="live-realtime-badge">
                <Radio size={11} className="pulse-radio-icon" />
                <span>LIVE</span>
              </span>
            )}
          </div>

          <div className="rider-header-actions">
            <button
              type="button"
              className={`rider-icon-pill ${soundEnabled ? 'sound-on' : 'sound-off'}`}
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                showToast(!soundEnabled ? 'Order alert chimes enabled' : 'Order alert chimes muted');
              }}
              title={soundEnabled ? 'Mute Alert Sound' : 'Unmute Alert Sound'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span className="hide-xs">{soundEnabled ? 'Sound ON' : 'Muted'}</span>
            </button>

            <button
              type="button"
              className="rider-icon-btn"
              onClick={() => syncRiderStatusToServer(isOnDuty, true)}
              disabled={syncingGps}
              title="Sync Live GPS Location"
            >
              <Crosshair size={16} className={syncingGps ? 'spin-icon' : ''} />
            </button>

            <button
              type="button"
              className="rider-icon-btn"
              onClick={() => fetchDeliveryOrders(false)}
              disabled={loading}
              title="Refresh Orders"
            >
              <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
            </button>

            <button
              type="button"
              className="rider-logout-btn"
              onClick={() => {
                logout();
                navigate('/delivery/login');
              }}
              title="Logout"
            >
              <LogOut size={15} />
              <span className="hide-xs">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Rider Profile & Shift Status Card */}
      <section className="rider-hero-section">
        <div className="rider-hero-container">
          <div className={`rider-hero-card ${isOnDuty ? 'duty-active' : 'duty-paused'}`}>
            <div className="hero-rider-identity">
              <div className="hero-avatar-ring">
                <span>{getInitials(riderProfile.name)}</span>
                <span className={`avatar-status-dot ${isOnDuty ? 'online' : 'offline'}`}></span>
              </div>
              <div className="hero-rider-meta">
                <div className="hero-name-row">
                  <h2>{riderProfile.name}</h2>
                  <span className="vehicle-badge">
                    <Bike size={12} /> {riderProfile.vehicleNumber}
                  </span>
                </div>
                <p className="hero-store-loc">
                  <Store size={13} /> {riderProfile.darkStore}
                </p>
              </div>
            </div>

            <button
              type="button"
              className={`hero-shift-switch ${isOnDuty ? 'is-online' : 'is-offline'}`}
              onClick={() => {
                const next = !isOnDuty;
                setIsOnDuty(next);
                syncRiderStatusToServer(next, next);
                showToast(next ? 'You are now ONLINE and receiving nearest orders!' : 'Shift paused. You are Offline.');
              }}
            >
              <div className="shift-indicator-track">
                <div className="shift-thumb">
                  <Power size={13} />
                </div>
              </div>
              <div className="shift-text-col">
                <span className="shift-main-label">{isOnDuty ? 'ON DUTY' : 'OFF DUTY'}</span>
                <span className="shift-sub-label">{isOnDuty ? 'Receiving Orders' : 'Tap to Go Live'}</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Rider Performance Stats Grid */}
      <section className="rider-stats-section">
        <div className="rider-stats-grid">
          <div className="rider-stat-card stat-orange">
            <div className="stat-card-icon">
              <Zap size={18} />
            </div>
            <div className="stat-card-body">
              <span className="stat-label">Active Queue</span>
              <span className="stat-value">{activeOrders.length}</span>
            </div>
          </div>

          <div className="rider-stat-card stat-green">
            <div className="stat-card-icon">
              <CheckCircle2 size={18} />
            </div>
            <div className="stat-card-body">
              <span className="stat-label">Completed</span>
              <span className="stat-value">{completedCount}</span>
            </div>
          </div>

          <div className="rider-stat-card stat-emerald">
            <div className="stat-card-icon">
              <Wallet size={18} />
            </div>
            <div className="stat-card-body">
              <span className="stat-label">Today's Pay</span>
              <span className="stat-value">₹{totalPayout}</span>
            </div>
          </div>

          <div className="rider-stat-card stat-amber">
            <div className="stat-card-icon">
              <Sparkles size={18} />
            </div>
            <div className="stat-card-body">
              <span className="stat-label">Rider Tips</span>
              <span className="stat-value">₹{totalTips}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Segmented Navigation Tabs */}
      <div className="rider-tabs-bar">
        <div className="rider-tabs-container">
          <button
            type="button"
            className={`rider-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <Truck size={16} />
            <span>Active Deliveries</span>
            {activeOrders.length > 0 && (
              <span className="tab-count-badge">{activeOrders.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`rider-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <CheckCircle2 size={16} />
            <span>Completed Trips</span>
            {completedCount > 0 && (
              <span className="tab-count-badge green">{completedCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Orders Content */}
      <main className="rider-main-content">
        {error && (
          <div className="rider-alert-banner error">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button type="button" className="alert-dismiss" onClick={() => setError('')}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tab 1: Active Deliveries */}
        {activeTab === 'active' && (
          <div className="orders-feed">
            {activeOrders.length === 0 ? (
              <div className="rider-empty-state">
                {isOnDuty ? (
                  <>
                    <div className="radar-pulse-wrapper">
                      <div className="radar-wave"></div>
                      <div className="radar-core">
                        <Store size={32} />
                      </div>
                    </div>
                    <h3>Scanning Dark Store Queue...</h3>
                    <p>You are online and ready! New instant orders will chime and pop up automatically.</p>
                    <button type="button" className="poll-now-btn" onClick={() => fetchDeliveryOrders(false)}>
                      <RefreshCw size={15} className={loading ? 'spin-icon' : ''} />
                      <span>Check for New Orders</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="offline-icon-wrapper">
                      <Power size={32} />
                    </div>
                    <h3>Your Shift is Currently Paused</h3>
                    <p>Switch back to On Duty mode to start receiving 10-minute delivery tasks.</p>
                    <button type="button" className="poll-now-btn" onClick={() => setIsOnDuty(true)}>
                      <Zap size={15} />
                      <span>Go Online Now</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              activeOrders.map((order) => {
                const customer = order.userId || {};
                const address = order.shippingAddress || {};
                const fullAddress = [address.street, address.city, address.state, address.zipcode]
                  .filter(Boolean)
                  .join(', ');
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  fullAddress || 'Lucknow'
                )}`;

                const minutesElapsed = formatMinutesAgo(order.createdAt);
                const urgencyClass =
                  minutesElapsed >= 9 ? 'sla-critical' : minutesElapsed >= 6 ? 'sla-warning' : 'sla-ok';

                const currentStep = getStepIndex(order.status);
                const totalItemsCount = order.items?.length || 0;
                const checkedCount = (order.items || []).filter(
                  (_, idx) => checkedItems[`${order._id}_${idx}`]
                ).length;

                const isOnlinePaid = order.paymentMethod && order.paymentMethod !== 'cod';
                const orderEarn = 35 + (order.deliveryTip || 0);
                const acceptSecondsLeft = getAcceptanceSecondsLeft(order);
                const isAwaitingAccept =
                  ['confirmed', 'pending', 'assigned'].includes(order.status) && !order.assignment?.acceptedAt;
                const hubName = order.assignedHub?.name || 'Progicart Dark Store #04';
                const hubAddr = order.assignedHub?.address || 'Vibhuti Khand, Lucknow';
                const distanceText = order.deliveryPartner?.distanceKm
                  ? `${order.deliveryPartner.distanceKm} km from you`
                  : '~1.4 km route';
                const rerouteCount = order.assignment?.rerouteCount || 0;

                return (
                  <div key={order._id} className="rider-order-card" data-tick={tick}>
                    {/* Top Urgency & Earning Header */}
                    <div className="order-meta-header">
                      <div className={`speed-target-pill ${urgencyClass}`}>
                        <Zap size={13} />
                        <span>
                          {isAwaitingAccept
                            ? `Accept in ${acceptSecondsLeft}s • 120s Re-route SLA`
                            : `${minutesElapsed}m ago • 10m SLA`}
                        </span>
                      </div>

                      <div className="payout-badge">
                        {rerouteCount > 0 && (
                          <span className="tip-tag">
                            <RotateCcw size={10} /> Re-routed #{rerouteCount}
                          </span>
                        )}
                        <span>Payout</span>
                        <strong>₹{orderEarn}</strong>
                        {order.deliveryTip > 0 && (
                          <span className="tip-tag">+₹{order.deliveryTip} tip</span>
                        )}
                      </div>
                    </div>

                    {/* Order Code & Stage Pill */}
                    <div className="order-title-row">
                      <div>
                        <h3 className="rider-order-code">Order #{order._id.slice(-8).toUpperCase()}</h3>
                        <span className="order-created-time">
                          <Clock size={12} /> Placed at{' '}
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="current-status-tag">
                        {order.status === 'out_for_delivery' || order.status === 'shipped' ? (
                          <span className="tag-out">On the Way</span>
                        ) : order.status === 'picked_up' ? (
                          <span className="tag-picked">Bag Picked Up</span>
                        ) : order.status === 'packing' ? (
                          <span className="tag-packing">Packing at Store</span>
                        ) : order.status === 'assigned' ? (
                          <span className="tag-ready">Assigned ({acceptSecondsLeft}s)</span>
                        ) : (
                          <span className="tag-ready">New Task</span>
                        )}
                      </div>
                    </div>

                    {/* Visual 4-Step Delivery Stepper */}
                    <div className="order-step-tracker">
                      {ORDER_STEPS.map((step, sIdx) => {
                        const isDone = sIdx <= currentStep;
                        const isCurrent = sIdx === currentStep;
                        return (
                          <div
                            key={step.key}
                            className={`tracker-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                          >
                            <div className="step-dot">
                              {isDone && sIdx < currentStep ? <Check size={10} /> : <span>{sIdx + 1}</span>}
                            </div>
                            <span className="step-label">{step.label}</span>
                            {sIdx < ORDER_STEPS.length - 1 && (
                              <div className={`step-line ${sIdx < currentStep ? 'filled' : ''}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Pickup & Drop Route Information */}
                    <div className="route-timeline-box">
                      <div className="route-stop pickup-stop">
                        <div className="stop-marker pickup-marker">
                          <Store size={14} />
                        </div>
                        <div className="stop-info">
                          <span className="stop-type">PICKUP POINT</span>
                          <strong className="stop-name">{hubName}</strong>
                          <span className="stop-addr">{hubAddr}</span>
                        </div>
                      </div>

                      <div className="timeline-connector-row">
                        <div className="timeline-connector"></div>
                        <span className="distance-chip">{distanceText}</span>
                      </div>

                      <div className="route-stop dropoff-stop">
                        <div className="stop-marker dropoff-marker">
                          <MapPin size={14} />
                        </div>
                        <div className="stop-info">
                          <span className="stop-type">DROP TO CUSTOMER</span>
                          <strong className="stop-name">
                            <User size={13} className="inline-icon" /> {customer.name || 'Customer'}
                          </strong>
                          <span className="stop-addr">
                            {fullAddress || 'Address available on order details'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Quick Actions: Call & Maps */}
                    <div className="rider-action-buttons-strip">
                      {customer.phone ? (
                        <a href={`tel:${customer.phone}`} className="action-pill-btn call-btn">
                          <Phone size={15} />
                          <span>Call {customer.phone}</span>
                        </a>
                      ) : (
                        <div className="action-pill-btn disabled-btn">
                          <Phone size={15} />
                          <span>No Phone Provided</span>
                        </div>
                      )}

                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="action-pill-btn maps-btn"
                      >
                        <Navigation size={15} />
                        <span>Open Maps</span>
                      </a>
                    </div>

                    {/* Customer Delivery Instructions Alert */}
                    {order.deliveryInstructions?.length > 0 && (
                      <div className="customer-instructions-banner">
                        <ShieldCheck size={17} className="ins-icon" />
                        <div className="ins-content">
                          <strong>Delivery Instructions</strong>
                          <div className="instruction-chips">
                            {order.deliveryInstructions.map((ins, idx) => (
                              <span key={idx} className="ins-pill">
                                🚪 {ins}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Items Checklist for Dark Store Packing */}
                    <div className="rider-checklist-box">
                      <div className="checklist-header">
                        <div className="checklist-title-wrap">
                          <Package size={14} />
                          <span>Bag Items ({totalItemsCount})</span>
                        </div>
                        <span className={`checklist-progress-pill ${checkedCount === totalItemsCount && totalItemsCount > 0 ? 'all-done' : ''}`}>
                          {checkedCount}/{totalItemsCount} verified
                        </span>
                      </div>

                      <div className="checklist-items">
                        {order.items?.map((item, idx) => {
                          const isChecked = Boolean(checkedItems[`${order._id}_${idx}`]);
                          return (
                            <div
                              key={idx}
                              className={`check-item-row ${isChecked ? 'checked' : ''}`}
                              onClick={() => toggleItemCheck(order._id, idx)}
                            >
                              <div className="checkbox-box">
                                {isChecked && <Check size={12} color="#ffffff" />}
                              </div>
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="checklist-item-thumb"
                                  loading="lazy"
                                />
                              )}
                              <span className="item-qty-badge">{item.quantity}×</span>
                              <span className="item-qty-name">{item.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Payment Status Alert */}
                    <div className="order-payment-strip">
                      {isOnlinePaid ? (
                        <div className="payment-status paid">
                          <CheckCircle2 size={16} />
                          <span>
                            <strong>PREPAID ONLINE</strong> ({order.paymentMethod.toUpperCase()}) • Do NOT collect cash
                          </span>
                        </div>
                      ) : (
                        <div className="payment-status collect-cash">
                          <AlertCircle size={16} />
                          <span>
                            <strong>COLLECT CASH (COD):</strong> ₹{order.totalPrice?.toFixed(0)} from Customer
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Primary Interactive Rider CTA Button */}
                    <div className="rider-cta-action">
                      {order.status === 'confirmed' || order.status === 'pending' || order.status === 'assigned' ? (
                        <div className="rider-accept-decline-row">
                          <button
                            type="button"
                            className="status-transition-btn accept-pickup-cta"
                            disabled={updatingId === order._id}
                            onClick={() => handleStatusTransition(order._id, 'packing')}
                          >
                            {updatingId === order._id ? (
                              <span>Accepting Task...</span>
                            ) : (
                              <>
                                <span>Accept Delivery ({acceptSecondsLeft}s) &amp; Pack</span>
                                <ChevronRight size={18} />
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            className="skip-reroute-btn"
                            disabled={updatingId === order._id}
                            onClick={() => handleDeclineOrder(order)}
                            title="Skip & Re-route to next nearest rider/hub"
                          >
                            Skip
                          </button>
                        </div>
                      ) : order.status === 'packing' ? (
                        <button
                          type="button"
                          className="status-transition-btn packed-pickup-cta"
                          disabled={updatingId === order._id}
                          onClick={() => handleStatusTransition(order._id, 'picked_up')}
                        >
                          {updatingId === order._id ? (
                            <span>Confirming Pickup...</span>
                          ) : (
                            <>
                              <span>Confirm Bag Picked Up from Store</span>
                              <ChevronRight size={18} />
                            </>
                          )}
                        </button>
                      ) : order.status === 'picked_up' ? (
                        <button
                          type="button"
                          className="status-transition-btn out-delivery-cta"
                          disabled={updatingId === order._id}
                          onClick={() => handleStatusTransition(order._id, 'out_for_delivery')}
                        >
                          {updatingId === order._id ? (
                            <span>Starting Ride...</span>
                          ) : (
                            <>
                              <span>Start Delivery to Customer</span>
                              <ChevronRight size={18} />
                            </>
                          )}
                        </button>
                      ) : order.status === 'out_for_delivery' || order.status === 'shipped' ? (
                        <button
                          type="button"
                          className="status-transition-btn delivered-cta"
                          disabled={updatingId === order._id}
                          onClick={() => handleStatusTransition(order._id, 'delivered')}
                        >
                          {updatingId === order._id ? (
                            <span>Completing Trip...</span>
                          ) : (
                            <>
                              <CheckCircle2 size={18} />
                              <span>Mark Order Handed Over (Delivered)</span>
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Completed Trips */}
        {activeTab === 'completed' && (
          <div className="completed-trips-section">
            {completedOrders.length === 0 ? (
              <div className="rider-empty-state">
                <div className="offline-icon-wrapper green">
                  <CheckCircle2 size={32} />
                </div>
                <h3>No Completed Trips Today</h3>
                <p>Complete your active deliveries to view trip breakdowns, tips, and instant earnings here.</p>
              </div>
            ) : (
              <>
                <div className="earnings-summary-banner">
                  <div>
                    <span className="summary-label">Today's Total Payout ({completedCount} trips)</span>
                    <h3 className="summary-amount">₹{totalPayout}</h3>
                  </div>
                  <div className="summary-breakdown">
                    <span>Base Pay: ₹{baseEarnings}</span>
                    <span>Customer Tips: ₹{totalTips}</span>
                  </div>
                </div>

                <div className="completed-trips-list">
                  {completedOrders.map((order) => {
                    const tripEarn = 35 + (order.deliveryTip || 0);
                    const fullAddr = [order.shippingAddress?.street, order.shippingAddress?.city]
                      .filter(Boolean)
                      .join(', ');
                    return (
                      <div key={order._id} className="completed-trip-card">
                        <div className="trip-top">
                          <div className="trip-top-left">
                            <div className="trip-check-circle">
                              <Check size={16} />
                            </div>
                            <div>
                              <strong>Order #{order._id.slice(-8).toUpperCase()}</strong>
                              <span className="trip-time">
                                Delivered at{' '}
                                {new Date(order.updatedAt || order.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="trip-payout">
                            <span>+₹{tripEarn}</span>
                            {order.deliveryTip > 0 && (
                              <small>incl. ₹{order.deliveryTip} tip</small>
                            )}
                          </div>
                        </div>

                        <div className="trip-details-row">
                          <span>👤 {order.userId?.name || 'Customer'}</span>
                          <span>📦 {order.items?.length || 0} items</span>
                          <span className={`trip-pay-badge ${order.paymentMethod === 'cod' ? 'cod' : 'online'}`}>
                            {order.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}
                          </span>
                        </div>

                        {fullAddr && (
                          <div className="trip-address">
                            <MapPin size={13} />
                            <span>{fullAddr}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Real-Time Incoming Order Request Modal */}
      {incomingOrder && (
        <div className="incoming-request-backdrop">
          <div className="incoming-request-card">
            <div className="incoming-alert-banner">
              <div className="banner-left">
                <div className="beacon-dot"></div>
                <span>⚡ NEW INSTANT DELIVERY REQUEST</span>
              </div>
              <button
                type="button"
                className="dismiss-incoming-btn"
                onClick={() => setIncomingOrder(null)}
                aria-label="Dismiss"
              >
                <X size={18} />
              </button>
            </div>

            <div className="incoming-card-body">
              <div className="incoming-payout-row">
                <div className="payout-big-badge">
                  <span className="payout-sub">ESTIMATED PAYOUT</span>
                  <strong className="payout-sum">
                    ₹{35 + (incomingOrder.deliveryTip || 0)}
                  </strong>
                  <span className="payout-breakdown">
                    ₹35 base fee {incomingOrder.deliveryTip ? `+ ₹${incomingOrder.deliveryTip} tip` : ''}
                  </span>
                </div>

                <div className="countdown-ring-box">
                  <span className="countdown-number">{incomingCountdown}s</span>
                  <span className="countdown-label">120s SLA</span>
                </div>
              </div>

              <div className="incoming-route-preview">
                <div className="route-point">
                  <Store size={16} className="text-blue" />
                  <div>
                    <span className="pt-label">PICKUP HUB</span>
                    <strong>{incomingOrder.assignedHub?.name || 'Progicart Dark Store #04'}</strong>
                  </div>
                </div>

                <div className="route-arrow-down">
                  ↓ {incomingOrder.deliveryPartner?.distanceKm ? `${incomingOrder.deliveryPartner.distanceKm} km from you` : '~1.4 km route'}
                </div>

                <div className="route-point">
                  <MapPin size={16} className="text-green" />
                  <div>
                    <span className="pt-label">DROP LOCATION</span>
                    <strong>
                      {incomingOrder.shippingAddress?.street || 'Delivery Address'},{' '}
                      {incomingOrder.shippingAddress?.city || 'Lucknow'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="incoming-items-preview">
                <div className="preview-items-left">
                  <Package size={14} />
                  <span>
                    {incomingOrder.items?.length || 1} items (
                    {incomingOrder.items
                      ?.map((i) => i.name)
                      .slice(0, 2)
                      .join(', ')}
                    {incomingOrder.items?.length > 2 ? '...' : ''})
                  </span>
                </div>
                <span className="payment-type-pill">
                  {incomingOrder.paymentMethod && incomingOrder.paymentMethod !== 'cod'
                    ? 'Paid Online'
                    : 'Cash on Delivery'}
                </span>
              </div>

              <div className="incoming-modal-actions">
                <button
                  type="button"
                  className="accept-incoming-btn"
                  disabled={updatingId === incomingOrder._id}
                  onClick={() => handleAcceptIncomingOrder(incomingOrder)}
                >
                  <Zap size={18} />
                  <span>
                    {updatingId === incomingOrder._id ? 'Accepting...' : 'ACCEPT DELIVERY'}
                  </span>
                </button>

                <button
                  type="button"
                  className="decline-incoming-btn"
                  disabled={updatingId === incomingOrder._id}
                  onClick={() => handleDeclineOrder(incomingOrder)}
                >
                  Skip &amp; Re-route
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryPartner;
