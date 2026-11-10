import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  CheckCircle2, 
  Truck, 
  AlertCircle, 
  RefreshCw,
  CreditCard,
  Banknote,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { adminOrdersAPI } from '../api/api';
import '../styles/OrderManagement.css';

const STATUS_FILTERS = ['all', 'confirmed', 'packing', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'];

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminOrdersAPI.getAll();
      setOrders(res.data || []);
    } catch (err) {
      console.error('Error fetching admin orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await adminOrdersAPI.updateStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((ord) => (ord._id === orderId ? { ...ord, status: newStatus } : ord))
      );
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert('Could not update order status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
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

  // Filter orders based on status & search
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const term = searchTerm.toLowerCase();

    const customerName = order.userId?.name?.toLowerCase() || '';
    const customerPhone = order.userId?.phone || '';
    const customerEmail = order.userId?.email?.toLowerCase() || '';
    const orderId = order._id?.toLowerCase() || '';
    const street = order.shippingAddress?.street?.toLowerCase() || '';

    const matchesSearch =
      !searchTerm ||
      customerName.includes(term) ||
      customerPhone.includes(term) ||
      customerEmail.includes(term) ||
      orderId.includes(term) ||
      street.includes(term);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="admin-orders-container">
      {/* Top Header */}
      <div className="orders-top-header">
        <div>
          <h2>Customer Orders & Live Dispatch</h2>
          <p className="orders-top-sub">
            Monitor real-time customer purchases, assigned riders, and 10-minute delivery execution.
          </p>
        </div>
        <button className="refresh-orders-btn" onClick={fetchOrders} disabled={loading}>
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
            placeholder="Search by customer name, phone, order ID, address..."
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

            return (
              <div key={order._id} className="admin-order-card">
                {/* Card Top: Order ID, Date, Amount, Badge */}
                <div className="order-card-header">
                  <div className="header-left">
                    <span className="order-id-code">#{order._id.slice(-8).toUpperCase()}</span>
                    <span className="order-time-stamp">
                      <Clock size={12} /> {dateStr}
                    </span>
                  </div>
                  <div className="header-right">
                    <span className="order-total-price">₹{order.totalPrice.toFixed(2)}</span>
                    {getStatusBadge(order.status)}
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

                    {/* Delivery Instructions */}
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

                {/* Card Actions / Status Transition Bar */}
                <div className="order-card-footer">
                  <div className="status-change-group">
                    <label>Update Live Status:</label>
                    <select
                      value={order.status}
                      disabled={updatingId === order._id}
                      onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                      className="status-select-control"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="packing">Packing at Store</option>
                      <option value="picked_up">Picked Up by Rider</option>
                      <option value="out_for_delivery">Out for Delivery (On the way)</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

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

