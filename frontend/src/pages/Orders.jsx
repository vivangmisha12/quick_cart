import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ordersAPI } from '../api/api';
import {
  ShoppingBag,
  Calendar,
  MapPin,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Navigation,
  RefreshCw,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  XCircle,
  Store,
  UserCheck,
  Receipt,
} from 'lucide-react';
import '../styles/Orders.css';

const STATUS_META = {
  pending: { label: 'Pending', tone: 'amber', icon: Clock, step: 1 },
  confirmed: { label: 'Confirmed', tone: 'cream', icon: CheckCircle2, step: 1 },
  packing: { label: 'Packing Order', tone: 'amber', icon: Package, step: 2 },
  assigned: { label: 'Rider Assigned', tone: 'amber', icon: UserCheck, step: 2 },
  picked_up: { label: 'Picked Up', tone: 'amber', icon: Truck, step: 3 },
  out_for_delivery: { label: 'Out for Delivery', tone: 'amber', icon: Truck, step: 3 },
  shipped: { label: 'On the Way', tone: 'amber', icon: Truck, step: 3 },
  delivered: { label: 'Delivered', tone: 'sage', icon: CheckCircle2, step: 4 },
  cancelled: { label: 'Cancelled', tone: 'rose', icon: XCircle, step: 0 },
};

const TRACK_STEPS = [
  { key: 1, title: 'Order Confirmed' },
  { key: 2, title: 'Packing & Rider' },
  { key: 3, title: 'Out for Delivery' },
  { key: 4, title: 'Delivered' },
];

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await ordersAPI.getUserOrders();
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="orders-page">
        <div className="orders-container">
          <div className="orders-loading-card">Loading your orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-container">
        <div className="orders-header">
          <div>
            <h1>My Orders</h1>
            <p>View order receipts, delivery updates, and past purchases</p>
          </div>
          {orders.length > 0 && (
            <button
              type="button"
              className="orders-refresh-btn"
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
            >
              <RefreshCw size={15} className={refreshing ? 'spin-icon' : ''} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="empty-orders">
            <div className="empty-icon-box">
              <ShoppingBag size={30} />
            </div>
            <h2>No Orders Yet</h2>
            <p>You haven't placed any orders yet. Start browsing fresh groceries!</p>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="shop-btn"
            >
              <ShoppingBag size={16} />
              <span>Start Shopping</span>
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const statusKey = order.status || 'confirmed';
              const meta = STATUS_META[statusKey] || {
                label: statusKey,
                tone: 'cream',
                icon: Package,
                step: 1,
              };
              const StatusIcon = meta.icon;
              const isDetailsOpen = selectedOrder === order._id;
              const isTrackerOpen = trackingOrderId === order._id;
              const itemsSubtotal = (order.items || []).reduce(
                (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
                0
              );

              return (
                <div key={order._id} className="order-card">
                  <div className="order-header">
                    <div className="order-info">
                      <div className="order-title-row">
                        <h3>Order #{order._id?.slice(-8).toUpperCase()}</h3>
                        <span className={`status-badge tone-${meta.tone}`}>
                          <StatusIcon size={13} />
                          <span>{meta.label}</span>
                        </span>
                      </div>
                      <p className="order-date">
                        <Calendar size={13} />
                        <span>
                          {new Date(order.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </p>
                    </div>
                    <div className="order-amount">
                      <span className="amount-label">Total</span>
                      <span className="total">₹{Number(order.totalPrice || 0).toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="order-items">
                    <h4>Items ({order.items?.length || 0})</h4>
                    <div className="items-list">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="item-row">
                          <div className="item-details">
                            <p className="item-name">{item.name}</p>
                            <p className="item-qty">Qty: {item.quantity}</p>
                          </div>
                          <div className="item-price">
                            ₹{Number(item.price || 0) * Number(item.quantity || 1)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="order-summary-grid">
                    <div className="order-meta-box">
                      <h4>
                        <MapPin size={14} />
                        <span>Delivery Address</span>
                      </h4>
                      <p>
                        {[
                          order.shippingAddress?.street,
                          order.shippingAddress?.city,
                          order.shippingAddress?.state,
                          order.shippingAddress?.zipcode,
                        ]
                          .filter(Boolean)
                          .join(', ') || 'Not provided'}
                      </p>
                    </div>

                    <div className="order-meta-box">
                      <h4>
                        <CreditCard size={14} />
                        <span>Payment</span>
                      </h4>
                      <p>
                        {order.paymentMethod?.toUpperCase() || 'COD'}
                        {order.paymentStatus ? ` • ${order.paymentStatus.toUpperCase()}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Expanded More Details Panel */}
                  {isDetailsOpen && (
                    <div className="order-extra-panel">
                      <div className="extra-panel-title">
                        <Receipt size={15} />
                        <span>Bill & Order Details</span>
                      </div>
                      <div className="bill-breakdown-rows">
                        <div className="bill-row">
                          <span>Items Subtotal</span>
                          <span>₹{itemsSubtotal.toFixed(0)}</span>
                        </div>
                        <div className="bill-row">
                          <span>Delivery Fee</span>
                          <span>
                            {Number(order.deliveryFee || 0) === 0
                              ? 'FREE'
                              : `₹${Number(order.deliveryFee).toFixed(0)}`}
                          </span>
                        </div>
                        {Number(order.handlingFee || 0) > 0 && (
                          <div className="bill-row">
                            <span>Handling Charge</span>
                            <span>₹{Number(order.handlingFee).toFixed(0)}</span>
                          </div>
                        )}
                        {Number(order.deliveryTip || 0) > 0 && (
                          <div className="bill-row">
                            <span>Rider Tip</span>
                            <span>₹{Number(order.deliveryTip).toFixed(0)}</span>
                          </div>
                        )}
                        <div className="bill-row bill-total-row">
                          <span>Grand Total</span>
                          <span>₹{Number(order.totalPrice || 0).toFixed(0)}</span>
                        </div>
                      </div>

                      {(order.paymentId || order.assignedHub?.name || order.deliveryInstructions?.length > 0) && (
                        <div className="extra-info-pills">
                          {order.assignedHub?.name && (
                            <p>
                              <strong>Dispatch Hub:</strong> {order.assignedHub.name}
                            </p>
                          )}
                          {order.paymentId && (
                            <p>
                              <strong>Transaction ID:</strong> {order.paymentId}
                            </p>
                          )}
                          {order.deliveryInstructions?.length > 0 && (
                            <p>
                              <strong>Instructions:</strong> {order.deliveryInstructions.join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expanded Live Order Tracker Panel */}
                  {isTrackerOpen && (
                    <div className="order-tracker-panel">
                      <div className="tracker-header-row">
                        <div className="extra-panel-title">
                          <Navigation size={15} />
                          <span>Live Delivery Progress</span>
                        </div>
                        <button
                          type="button"
                          className="tracker-mini-refresh"
                          onClick={() => fetchOrders(true)}
                          disabled={refreshing}
                        >
                          <RefreshCw size={12} className={refreshing ? 'spin-icon' : ''} />
                          <span>Update</span>
                        </button>
                      </div>

                      <div className="tracker-steps">
                        {TRACK_STEPS.map((stepObj) => {
                          const completed = meta.step >= stepObj.key;
                          const current = meta.step === stepObj.key;
                          return (
                            <div
                              key={stepObj.key}
                              className={`tracker-step ${completed ? 'is-done' : ''} ${current ? 'is-current' : ''}`}
                            >
                              <div className="step-dot">{completed ? '✓' : stepObj.key}</div>
                              <span className="step-title">{stepObj.title}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="tracker-logistics-cards">
                        {order.assignedHub?.name && (
                          <div className="logistics-chip">
                            <Store size={15} />
                            <div>
                              <strong>{order.assignedHub.name}</strong>
                              {order.assignedHub.address && <span>{order.assignedHub.address}</span>}
                            </div>
                          </div>
                        )}
                        <div className="logistics-chip">
                          <UserCheck size={15} />
                          <div>
                            <strong>
                              {order.deliveryPartner?.name || 'Assigning nearest rider...'}
                            </strong>
                            <span>
                              {order.deliveryPartner?.vehicleNumber
                                ? `${order.deliveryPartner.vehicleNumber}${
                                    order.deliveryPartner?.distanceKm
                                      ? ` • ${order.deliveryPartner.distanceKm} km away`
                                      : ''
                                  }`
                                : 'Auto-dispatch in progress'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="order-actions">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedOrder(isDetailsOpen ? null : order._id)
                      }
                      className="details-btn"
                    >
                      {isDetailsOpen ? (
                        <>
                          <ChevronUp size={15} />
                          <span>Less Details</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown size={15} />
                          <span>More Details</span>
                        </>
                      )}
                    </button>

                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() =>
                          setTrackingOrderId(isTrackerOpen ? null : order._id)
                        }
                        className="track-btn"
                      >
                        <Navigation size={15} />
                        <span>{isTrackerOpen ? 'Hide Tracker' : 'Track Order'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
