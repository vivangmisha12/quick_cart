import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Truck,
  RefreshCw,
  CreditCard,
  Sparkles,
  RotateCcw,
  Store,
} from 'lucide-react';
import { adminOrdersAPI, adminUsersAPI } from '../api/api';
import '../styles/OrderManagement.css';

const STATUS_FILTERS = ['all', 'assigned', 'confirmed', 'packing', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'];

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [tick, setTick] = useState(0);

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [orderRes, riderRes] = await Promise.all([
        adminOrdersAPI.getAll(),
        adminUsersAPI.getRiders().catch(() => ({ data: [] })),
      ]);
      setOrders(orderRes.data || []);
      setRiders((riderRes.data || []).filter((r) => r.verificationStatus === 'verified'));
    } catch (err) {
      console.error('Error fetching admin orders:', err);
      if (!silent) setError('Failed to load orders. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(false);
    const poll = setInterval(() => fetchOrders(true), 5000);
    const secTimer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(secTimer);
    };
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await adminOrdersAPI.updateStatus(orderId, newStatus);
      const updatedOrder = res.data?.order;
      setOrders((prev) =>
        prev.map((ord) => (ord._id === orderId ? updatedOrder || { ...ord, status: newStatus } : ord))
      );
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert('Could not update order status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRerouteOrAssign = async (orderId, riderId = null) => {
    setUpdatingId(orderId);
    try {
      const res = await adminOrdersAPI.rerouteOrder(orderId, riderId);
      const updatedOrder = res.data?.order;
      if (updatedOrder) {
        setOrders((prev) => prev.map((ord) => (ord._id === orderId ? updatedOrder : ord)));
      } else {
        await fetchOrders(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Could not re-route order.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'assigned':
        return <span className="admin-status-badge badge-yellow">🛵 Auto-Assigned (120s SLA)</span>;
      case 'confirmed':
        return <span className="admin-status-badge badge-blue">✓ Confirmed</span>;
      case 'packing':
        return <span className="admin-status-badge badge-yellow">📦 Packing at Store</span>;
      case 'picked_up':
        return <span className="admin-status-badge badge-purple">🏍️ Picked Up</span>;
      case 'out_for_delivery':
        return <span className="admin-status-badge badge-orange">⚡ Out for Delivery</span>;
      case 'delivered':
        return <span className="admin-status-badge badge-green">✓✓ Delivered</span>;
      case 'cancelled':
        return <span className="admin-status-badge badge-red">✕ Cancelled</span>;
      default:
        return <span className="admin-status-badge badge-gray">{status}</span>;
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const term = searchTerm.toLowerCase();

    const customerName = order.userId?.name?.toLowerCase() || '';
    const customerPhone = order.userId?.phone || '';
    const customerEmail = order.userId?.email?.toLowerCase() || '';
    const orderId = order._id?.toLowerCase() || '';
    const street = order.shippingAddress?.street?.toLowerCase() || '';
    const riderName = order.deliveryPartner?.name?.toLowerCase() || '';

    const matchesSearch =
      !searchTerm ||
      customerName.includes(term) ||
      customerPhone.includes(term) ||
      customerEmail.includes(term) ||
      orderId.includes(term) ||
      street.includes(term) ||
      riderName.includes(term);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="admin-orders-container" data-tick={tick}>
      {/* Top Header */}
      <div className="orders-top-header">
        <div>
          <h2>Customer Orders &amp; Live 120s Auto Dispatch</h2>
          <p className="orders-top-sub">
            Orders auto-assign to nearest online rider &amp; auto re-route to next Dark Store Hub if unaccepted in 120 seconds.
          </p>
        </div>
        <button className="refresh-orders-btn" onClick={() => fetchOrders(false)} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
          <span>Refresh Live</span>
        </button>
      </div>

      {error && <div className="admin-alert-banner error">{error}</div>}

      {/* Control Bar: Search & Status Filters */}
      <div className="orders-control-bar">
        <div className="orders-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by customer, rider, phone, order ID, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="status-filter-pills">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              className={`filter-pill-btn ${selectedStatus === st ? 'active' : ''}`}
              onClick={() => setSelectedStatus(st)}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading && orders.length === 0 ? (
        <div className="orders-loading-state">
          <RefreshCw size={32} className="spin-icon text-green" />
          <p>Loading live customer orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="orders-empty-state">
          <ShoppingBag size={48} className="empty-icon text-muted" />
          <h3>No Orders Found</h3>
          <p>No customer orders match the current filter or search criteria.</p>
        </div>
      ) : (
        <div className="admin-orders-grid">
          {filteredOrders.map((order) => {
            const customer = order.userId || {};
            const address = order.shippingAddress || {};
            const dateStr = new Date(order.createdAt).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            const isAwaitingAccept =
              ['pending', 'confirmed', 'assigned'].includes(order.status) && !order.assignment?.acceptedAt;
            const secsLeft = order.assignment?.expiresAt
              ? Math.max(0, Math.ceil((new Date(order.assignment.expiresAt).getTime() - Date.now()) / 1000))
              : 0;
            const rerouteCount = order.assignment?.rerouteCount || 0;

            return (
              <div key={order._id} className="admin-order-card">
                {/* Card Top: Order ID, Date, Amount, Badge */}
                <div className="order-card-header">
                  <div className="header-left">
                    <span className="order-id-code">#{order._id.slice(-8).toUpperCase()}</span>
                    <span className="order-time-stamp">
                      <Clock size={12} /> {dateStr}
                    </span>
                    {rerouteCount > 0 && (
                      <span className="reroute-counter-pill">
                        <RotateCcw size={11} /> Re-routed {rerouteCount}x
                      </span>
                    )}
                    {isAwaitingAccept && order.assignment?.expiresAt && (
                      <span className="sla-countdown-pill">
                        ⏱ {secsLeft}s left before next-hub re-route
                      </span>
                    )}
                  </div>
                  <div className="header-right">
                    <span className="order-total-price">₹{order.totalPrice.toFixed(2)}</span>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Live Hub & Nearest Rider Routing Strip */}
                <div className="order-routing-strip">
                  <div className="routing-item">
                    <Store size={14} />
                    <span>
                      <strong>Assigned Hub:</strong> {order.assignedHub?.name || 'Dark Store #04 • Vibhuti Khand'}
                    </span>
                  </div>
                  <div className="routing-item">
                    <Truck size={14} />
                    <span>
                      <strong>Assigned Rider:</strong>{' '}
                      {order.deliveryPartner?.name || 'Pending Verification'}
                      {order.deliveryPartner?.distanceKm ? ` (${order.deliveryPartner.distanceKm} km away)` : ''}
                      {order.deliveryPartner?.phone ? ` • ${order.deliveryPartner.phone}` : ''}
                    </span>
                  </div>
                </div>

                <div className="order-card-body">
                  {/* Customer Information Column */}
                  <div className="info-block customer-block">
                    <h4 className="block-title">
                      <User size={15} /> Customer Details
                    </h4>
                    <p className="customer-name">{customer.name || 'Progicart Customer'}</p>
                    <div className="customer-meta-line">
                      <Phone size={13} />
                      <a href={`tel:${customer.phone}`} className="customer-link">
                        {customer.phone || 'Phone not provided'}
                      </a>
                    </div>
                    {customer.email && (
                      <div className="customer-meta-line">
                        <Mail size={13} />
                        <span className="customer-email">{customer.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Delivery Doorstep Address */}
                  <div className="info-block address-block">
                    <h4 className="block-title">
                      <MapPin size={15} /> Delivery Doorstep
                    </h4>
                    <p className="full-address-text">
                      {address.street || 'Address not entered'}
                    </p>
                    <span className="address-locality">
                      {address.city ? `${address.city}, ` : ''}{address.state} {address.zipcode ? `- ${address.zipcode}` : ''}
                    </span>

                    {order.deliveryInstructions?.length > 0 && (
                      <div className="instructions-badge-strip">
                        {order.deliveryInstructions.map((ins, i) => (
                          <span key={i} className="ins-chip">
                            🚪 {ins}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payment Info */}
                  <div className="info-block payment-block">
                    <h4 className="block-title">
                      <CreditCard size={15} /> Payment Method
                    </h4>
                    <div className="payment-method-row">
                      {order.paymentMethod === 'razorpay' ? (
                        <span className="pay-method-badge razorpay">
                          ⚡ Razorpay Online
                        </span>
                      ) : (
                        <span className="pay-method-badge cod">
                          💵 Cash on Delivery (COD)
                        </span>
                      )}
                    </div>
                    {order.paymentId && (
                      <span className="payment-id-text">
                        ID: {order.paymentId}
                      </span>
                    )}
                    {order.deliveryTip > 0 && (
                      <span className="tip-included-badge">
                        <Sparkles size={12} /> Includes ₹{order.deliveryTip} Rider Tip
                      </span>
                    )}
                  </div>
                </div>

                {/* Items Purchased List */}
                <div className="order-items-preview">
                  <h4 className="items-title">Items ({order.items?.length || 0})</h4>
                  <div className="items-scroll-row">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="item-pill-compact">
                        {item.image && <img src={item.image} alt={item.name} />}
                        <div className="item-info">
                          <span className="item-title">{item.name}</span>
                          <span className="item-qty-price">
                            {item.quantity} × ₹{item.price}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Actions / Status + Manual Rider Assign + Re-route Controls */}
                <div className="order-card-footer">
                  <div className="status-change-group">
                    <label>Status:</label>
                    <select
                      value={order.status}
                      disabled={updatingId === order._id}
                      onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                      className="status-select-control"
                    >
                      <option value="assigned">Auto-Assigned</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="packing">Packing at Store</option>
                      <option value="picked_up">Picked Up by Rider</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {!['delivered', 'cancelled'].includes(order.status) && (
                    <div className="order-dispatch-actions">
                      {riders.length > 0 && (
                        <select
                          className="status-select-control"
                          value={order.deliveryPartner?.id || ''}
                          disabled={updatingId === order._id}
                          onChange={(e) => {
                            if (e.target.value) handleRerouteOrAssign(order._id, e.target.value);
                          }}
                        >
                          <option value="">Assign Verified Rider...</option>
                          {riders.map((r) => (
                            <option key={r._id} value={r._id}>
                              {r.name} ({r.isOnline ? 'Online' : 'Offline'})
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        className="manual-reroute-btn"
                        disabled={updatingId === order._id}
                        onClick={() => handleRerouteOrAssign(order._id, null)}
                      >
                        <RotateCcw size={13} />
                        <span>Re-route Next Location</span>
                      </button>
                    </div>
                  )}

                  {updatingId === order._id && (
                    <span className="updating-status-text">Updating...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
