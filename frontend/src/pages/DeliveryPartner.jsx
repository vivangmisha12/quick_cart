import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Truck, 
  MapPin, 
  Phone, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  ShoppingBag, 
  DollarSign, 
  AlertCircle, 
  ChevronRight, 
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Package,
  Check,
  ExternalLink,
  Store,
  UserCheck,
  Volume2,
  VolumeX,
  Bell,
  X,
  ArrowUpRight,
  Zap,
  Radio,
  LogOut
} from 'lucide-react';
import { deliveryAPI } from '../api/api';
import '../styles/DeliveryPartner.css';

const DeliveryPartner = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed'
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});

  // Incoming Request Alert Modal state
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [incomingCountdown, setIncomingCountdown] = useState(30);

  // Keep track of known orders to avoid re-alerting already seen orders
  const knownOrderIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  // Dynamic Rider Profile Info from logged in user
  const riderProfile = {
    name: user?.name || 'Suresh Kumar',
    phone: user?.phone || '9876543210',
    vehicleNumber: user?.vehicleNumber || 'UP-32-BK-2024',
    darkStore: 'Progicart Dark Store #04 • Vibhuti Khand, Lucknow',
  };

  // Web Audio API Synthesizer: Authentic Ding-Dong Delivery Chime
  const playOrderAlertSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Two-tone cheerful Blinkit chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880.00, now + 0.16); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(293.66, now); // D4
      osc2.frequency.setValueAtTime(440.00, now + 0.16); // A4

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
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await deliveryAPI.getActiveOrders();
      const fetched = res.data || [];
      setOrders(fetched);

      // Detect brand new orders placed while on duty
      if (isOnDuty && fetched.length > 0) {
        fetched.forEach((ord) => {
          const isPending = ['confirmed', 'packing', 'pending'].includes(ord.status);
          if (isPending && !knownOrderIdsRef.current.has(ord._id)) {
            knownOrderIdsRef.current.add(ord._id);

            // If not initial load, trigger immediate incoming modal and sound alert
            if (!initialLoadRef.current) {
              setIncomingOrder(ord);
              setIncomingCountdown(30);
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
      if (!silent) setError('Could not fetch active delivery orders.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Setup Real-Time Listeners (BroadcastChannel + LocalStorage + Fast 3s Polling)
  useEffect(() => {
    fetchDeliveryOrders(false);

    // 1. Cross-tab instant BroadcastChannel listener
    let channel;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('blinkit_realtime_orders');
        channel.onmessage = (event) => {
          if (event.data?.type === 'NEW_ORDER' && event.data?.order) {
            const newOrd = event.data.order;
            knownOrderIdsRef.current.add(newOrd._id);
            if (isOnDuty) {
              setIncomingOrder(newOrd);
              setIncomingCountdown(30);
              playOrderAlertSound();
              fetchDeliveryOrders(true);
            }
          }
        };
      }
    } catch (bcErr) {
      console.warn('BroadcastChannel init notice:', bcErr);
    }

    // 2. Storage event listener fallback
    const handleStorageChange = (e) => {
      if (e.key === 'blinkit_last_order_ping') {
        fetchDeliveryOrders(true);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 3. Fast 3-second live background polling
    const interval = setInterval(() => {
      fetchDeliveryOrders(true);
    }, 3000);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [isOnDuty, soundEnabled]);

  // Countdown timer for Incoming Order Request Modal
  useEffect(() => {
    let timer;
    if (incomingOrder && incomingCountdown > 0) {
      timer = setInterval(() => {
        setIncomingCountdown((prev) => {
          if (prev <= 1) {
            setIncomingOrder(null);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [incomingOrder, incomingCountdown]);

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
    } catch (err) {
      console.error('Accept order error:', err);
      alert('Could not accept order.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Decline incoming order
  const handleDeclineIncomingOrder = () => {
    setIncomingOrder(null);
  };

  // Progression of delivery statuses
  const handleStatusTransition = async (orderId, nextStatus) => {
    setUpdatingId(orderId);
    try {
      await deliveryAPI.updateOrderStatus(orderId, nextStatus, {
        partnerName: riderProfile.name,
        partnerPhone: riderProfile.phone,
        vehicleNumber: riderProfile.vehicleNumber,
      });

      // Update local state immediately
      setOrders((prev) =>
        prev.map((ord) =>
          ord._id === orderId
            ? {
                ...ord,
                status: nextStatus,
                deliveryPartner: {
                  name: riderProfile.name,
                  phone: riderProfile.phone,
                  vehicleNumber: riderProfile.vehicleNumber,
                },
              }
            : ord
        )
      );

      // Play success chime when delivered
      if (nextStatus === 'delivered') {
        playOrderAlertSound();
      }
    } catch (err) {
      console.error('Failed to update delivery status:', err);
      alert('Could not update order status.');
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
    ['pending', 'confirmed', 'packing', 'assigned', 'picked_up', 'out_for_delivery'].includes(o.status)
  );
  const completedOrders = orders.filter((o) => o.status === 'delivered');

  // Calculate dynamic earnings
  const completedCount = completedOrders.length;
  const totalTips = completedOrders.reduce((sum, o) => sum + (o.deliveryTip || 0), 0);
  const totalPayout = completedCount * 35 + totalTips;

  return (
    <div className="rider-portal-page">
      {/* Top Rider Fleet Header */}
      <header className="rider-top-header">
        <div className="rider-header-content">
          <div className="rider-brand-group">
            <div className="rider-logo-box">
              <Truck size={24} className="text-green" />
            </div>
            <div>
              <div className="rider-logo-title">
                <div className="rider-logo-wrap">
                  <img src="/logo.png" alt="Progicart" className="rider-header-logo-img" />
                </div>
                <span className="rider-pill">Rider App</span>
                <span className="live-realtime-badge">
                  <Radio size={12} className="pulse-radio-icon" /> LIVE SYNC
                </span>
              </div>
              <p className="dark-store-sub">{riderProfile.darkStore}</p>
            </div>
          </div>

          <div className="rider-header-actions">
            {/* Audio Alert Toggle */}
            <button 
              type="button"
              className={`sound-toggle-btn ${soundEnabled ? 'enabled' : 'disabled'}`}
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Order Audio Alert On' : 'Muted'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span className="sound-text">{soundEnabled ? 'Sound ON' : 'Muted'}</span>
            </button>

            {/* Duty Status Switch */}
            <button 
              type="button"
              className={`duty-toggle-btn ${isOnDuty ? 'on-duty' : 'off-duty'}`}
              onClick={() => setIsOnDuty(!isOnDuty)}
            >
              <span className="duty-dot"></span>
              <span>{isOnDuty ? '🟢 On Duty (Live)' : '⚪ Off Duty'}</span>
            </button>

            {/* Manual Refresh */}
            <button 
              type="button" 
              className="refresh-btn"
              onClick={() => fetchDeliveryOrders(false)}
              disabled={loading}
              title="Refresh Orders"
            >
              <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
            </button>

            {/* Link to Admin */}
            <Link to="/admin" className="switch-portal-link" title="Open Admin Hub">
              <span>Admin Hub</span>
              <ExternalLink size={13} />
            </Link>

            {/* Rider Logout */}
            <button 
              type="button" 
              className="rider-logout-btn"
              onClick={() => {
                logout();
                navigate('/delivery/login');
              }}
              title="Logout Rider"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Rider Performance Strip */}
      <div className="rider-stats-strip">
        <div className="rider-stats-container">
          <div className="rider-stat-box">
            <span className="stat-label">Active Queue</span>
            <span className="stat-value text-orange">{activeOrders.length}</span>
          </div>

          <div className="rider-stat-box">
            <span className="stat-label">Completed Today</span>
            <span className="stat-value text-green">{completedCount}</span>
          </div>

          <div className="rider-stat-box">
            <span className="stat-label">Total Earnings</span>
            <span className="stat-value text-green">₹{totalPayout}</span>
          </div>

          <div className="rider-stat-box">
            <span className="stat-label">Customer Tips</span>
            <span className="stat-value text-yellow">₹{totalTips}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rider-tabs-bar">
        <div className="rider-tabs-container">
          <button
            type="button"
            className={`rider-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
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
            <span>Completed Trips</span>
            {completedCount > 0 && (
              <span className="tab-count-badge green">{completedCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Orders List Container */}
      <main className="rider-main-content">
        {error && (
          <div className="rider-alert-banner error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Active Deliveries */}
        {activeTab === 'active' && (
          <div className="orders-feed">
            {activeOrders.length === 0 ? (
              <div className="rider-empty-state">
                <Store size={48} className="empty-icon text-green" />
                <h3>No Active Deliveries Right Now</h3>
                <p>Waiting for new orders from the dark store in real time. Keep your app online!</p>
                <button className="poll-now-btn" onClick={() => fetchDeliveryOrders(false)}>
                  <RefreshCw size={15} /> Check for Orders
                </button>
              </div>
            ) : (
              activeOrders.map((order) => {
                const customer = order.userId || {};
                const address = order.shippingAddress || {};
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${address.street || ''}, ${address.city || ''} ${address.zipcode || ''}`
                )}`;

                return (
                  <div key={order._id} className="rider-order-card">
                    {/* Top: 10-Min Target Badge & Payout */}
                    <div className="order-meta-header">
                      <div className="speed-target-pill">
                        <span className="flash-icon">⚡</span>
                        <span>10-Minute Instant Target</span>
                      </div>
                      <div className="payout-badge">
                        <span>Earn: <strong>₹{35 + (order.deliveryTip || 0)}</strong></span>
                      </div>
                    </div>

                    {/* Order Details & ID */}
                    <div className="order-title-row">
                      <div>
                        <h3 className="rider-order-code">Order #{order._id.slice(-8).toUpperCase()}</h3>
                        <span className="order-created-time">
                          <Clock size={12} /> Placed {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="current-status-tag">
                        {order.status === 'out_for_delivery' ? (
                          <span className="tag-out">🏍️ On the way to Customer</span>
                        ) : order.status === 'picked_up' ? (
                          <span className="tag-picked">📦 Bag Picked & Packed</span>
                        ) : order.status === 'packing' ? (
                          <span className="tag-ready">🏪 Bag Packing at Dark Store</span>
                        ) : (
                          <span className="tag-ready">⚡ New Incoming Order</span>
                        )}
                      </div>
                    </div>

                    {/* Pickup & Drop Route Information */}
                    <div className="route-timeline-box">
                      {/* Pickup Point */}
                      <div className="route-stop pickup-stop">
                        <div className="stop-marker pickup-marker">
                          <Store size={14} />
                        </div>
                        <div className="stop-info">
                          <span className="stop-type">PICKUP POINT</span>
                          <strong className="stop-name">Progicart Dark Store #04</strong>
                          <span className="stop-addr">Aisle 2 • Vibhuti Khand, Lucknow</span>
                        </div>
                      </div>

                      <div className="timeline-connector"></div>

                      {/* Dropoff Point */}
                      <div className="route-stop dropoff-stop">
                        <div className="stop-marker dropoff-marker">
                          <MapPin size={14} />
                        </div>
                        <div className="stop-info">
                          <span className="stop-type">DROPOFF TO CUSTOMER</span>
                          <strong className="stop-name">{customer.name || 'Customer'}</strong>
                          <span className="stop-addr">
                            {address.street || 'Address details in order'}
                            {address.city ? `, ${address.city}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Action Buttons: Call & Maps */}
                    <div className="rider-action-buttons-strip">
                      {customer.phone && (
                        <a href={`tel:${customer.phone}`} className="action-pill-btn call-btn">
                          <Phone size={15} />
                          <span>Call ({customer.phone})</span>
                        </a>
                      )}

                      <a 
                        href={mapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="action-pill-btn maps-btn"
                      >
                        <Navigation size={15} />
                        <span>Navigate in Maps</span>
                      </a>
                    </div>

                    {/* Customer Delivery Instructions Alert */}
                    {order.deliveryInstructions?.length > 0 && (
                      <div className="customer-instructions-banner">
                        <ShieldCheck size={16} className="text-green" />
                        <div>
                          <strong>Customer Instructions:</strong>
                          <div className="instruction-chips">
                            {order.deliveryInstructions.map((ins, idx) => (
                              <span key={idx} className="ins-pill">🚪 {ins}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Items Checklist for Dark Store Packing */}
                    <div className="rider-checklist-box">
                      <div className="checklist-header">
                        <Package size={14} />
                        <span>Verify Items in Bag ({order.items?.length || 0})</span>
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
                              <span className="item-qty-name">{item.quantity} × {item.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Payment Status Bar */}
                    <div className="order-payment-strip">
                      {order.paymentMethod === 'razorpay' ? (
                        <span className="payment-status paid">
                          ✅ Paid Online (Razorpay) • Do NOT collect cash
                        </span>
                      ) : (
                        <span className="payment-status collect-cash">
                          💵 Cash on Delivery • Collect ₹{order.totalPrice.toFixed(0)} from Customer
                        </span>
                      )}
                    </div>

                    {/* Interactive Rider Action Button */}
                    <div className="rider-cta-action">
                      {order.status === 'confirmed' || order.status === 'pending' ? (
                        <button
                          type="button"
                          className="status-transition-btn accept-pickup-cta"
                          disabled={updatingId === order._id}
                          onClick={() => handleStatusTransition(order._id, 'packing')}
                        >
                          {updatingId === order._id ? (
                            <span>Accepting...</span>
                          ) : (
                            <>
                              <span>✅ Accept Delivery Task & Start Packing</span>
                              <ChevronRight size={18} />
                            </>
                          )}
                        </button>
                      ) : order.status === 'packing' ? (
                        <button
                          type="button"
                          className="status-transition-btn accept-pickup-cta"
                          disabled={updatingId === order._id}
                          onClick={() => handleStatusTransition(order._id, 'picked_up')}
                        >
                          {updatingId === order._id ? (
                            <span>Confirming Pickup...</span>
                          ) : (
                            <>
                              <span>📦 Confirm Bag Picked Up from Dark Store</span>
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
                            <span>Updating...</span>
                          ) : (
                            <>
                              <span>🛵 Start Delivery to Customer</span>
                              <ChevronRight size={18} />
                            </>
                          )}
                        </button>
                      ) : order.status === 'out_for_delivery' ? (
                        <button
                          type="button"
                          className="status-transition-btn delivered-cta"
                          disabled={updatingId === order._id}
                          onClick={() => handleStatusTransition(order._id, 'delivered')}
                        >
                          {updatingId === order._id ? (
                            <span>Marking Delivered...</span>
                          ) : (
                            <>
                              <span>✓ Order Handed Over to Customer (Delivered)</span>
                              <CheckCircle2 size={18} />
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
          <div className="completed-trips-list">
            {completedOrders.length === 0 ? (
              <div className="rider-empty-state">
                <CheckCircle2 size={48} className="empty-icon text-green" />
                <h3>No Completed Trips Today</h3>
                <p>Deliver your active orders to see your trip history and earnings here!</p>
              </div>
            ) : (
              completedOrders.map((order) => (
                <div key={order._id} className="completed-trip-card">
                  <div className="trip-top">
                    <div>
                      <strong>Order #{order._id.slice(-8).toUpperCase()}</strong>
                      <span className="trip-time">
                        Delivered on {new Date(order.updatedAt || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="trip-payout">
                      <span>+₹{35 + (order.deliveryTip || 0)}</span>
                    </div>
                  </div>

                  <div className="trip-details-row">
                    <span>Customer: {order.userId?.name || 'Customer'}</span>
                    <span>{order.items?.length || 0} items</span>
                    <span>Tip: ₹{order.deliveryTip || 0}</span>
                  </div>

                  <div className="trip-address">
                    📍 {order.shippingAddress?.street}, {order.shippingAddress?.city}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* =========================================================================
          REAL-TIME INCOMING ORDER REQUEST MODAL (ZOMATO / BLINKIT STYLE)
          ========================================================================= */}
      {incomingOrder && (
        <div className="incoming-request-backdrop">
          <div className="incoming-request-card">
            {/* Pulsing Alert Top Bar */}
            <div className="incoming-alert-banner">
              <div className="beacon-dot"></div>
              <span>⚡ NEW DELIVERY REQUEST RECEIVED!</span>
              <button className="dismiss-incoming-btn" onClick={handleDeclineIncomingOrder}>
                <X size={18} />
              </button>
            </div>

            <div className="incoming-card-body">
              {/* Earning Highlight & Countdown */}
              <div className="incoming-payout-row">
                <div className="payout-big-badge">
                  <span className="payout-sub">ESTIMATED PAYOUT</span>
                  <strong className="payout-sum">
                    ₹{35 + (incomingOrder.deliveryTip || 0)}
                  </strong>
                  <span className="payout-breakdown">
                    ₹35 fee {incomingOrder.deliveryTip ? `+ ₹${incomingOrder.deliveryTip} tip` : ''}
                  </span>
                </div>

                {/* Circular Countdown Ring */}
                <div className="countdown-ring-box">
                  <span className="countdown-number">{incomingCountdown}s</span>
                  <span className="countdown-label">TO ACCEPT</span>
                </div>
              </div>

              {/* Order Essentials */}
              <div className="incoming-route-preview">
                <div className="route-point">
                  <Store size={16} className="text-yellow" />
                  <div>
                    <span className="pt-label">PICKUP</span>
                    <strong>Progicart Dark Store #04 (Aisle 2)</strong>
                  </div>
                </div>

                <div className="route-arrow-down">↓ 1.4 km</div>

                <div className="route-point">
                  <MapPin size={16} className="text-green" />
                  <div>
                    <span className="pt-label">DROP LOCATION</span>
                    <strong>
                      {incomingOrder.shippingAddress?.street || 'Delivery Address'}, {incomingOrder.shippingAddress?.city || 'Lucknow'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Items in order */}
              <div className="incoming-items-preview">
                <Package size={14} className="text-gray" />
                <span>
                  {incomingOrder.items?.length || 1} items ({incomingOrder.items?.map(i => i.name).slice(0, 2).join(', ')}{incomingOrder.items?.length > 2 ? '...' : ''})
                </span>
                <span className="payment-type-pill">
                  {incomingOrder.paymentMethod === 'razorpay' ? 'Paid Online' : 'Cash on Delivery'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="incoming-modal-actions">
                <button
                  type="button"
                  className="accept-incoming-btn"
                  disabled={updatingId === incomingOrder._id}
                  onClick={() => handleAcceptIncomingOrder(incomingOrder)}
                >
                  <Zap size={18} />
                  <span>{updatingId === incomingOrder._id ? 'Accepting...' : 'ACCEPT DELIVERY'}</span>
                </button>

                <button
                  type="button"
                  className="decline-incoming-btn"
                  onClick={handleDeclineIncomingOrder}
                >
                  Decline
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
