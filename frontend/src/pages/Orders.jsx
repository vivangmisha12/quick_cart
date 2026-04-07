import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ordersAPI } from '../api/api';
import '../styles/Orders.css';

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getUserOrders();
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { color: '#FFC107', icon: '⏳' },
      confirmed: { color: '#2196F3', icon: '✓' },
      shipped: { color: '#FF9800', icon: '📦' },
      delivered: { color: '#4CAF50', icon: '✓✓' },
      cancelled: { color: '#F44336', icon: '✗' },
    };
    return statusMap[status] || { color: '#999', icon: '?' };
  };

  if (loading) {
    return (
      <div className="orders-container">
        <div className="loading">Loading your orders...</div>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h1>📋 My Orders</h1>
        <p>Track and manage all your orders</p>
      </div>

      {orders.length === 0 ? (
        <div className="empty-orders">
          <div className="empty-icon">📦</div>
          <h2>No Orders Yet</h2>
          <p>You haven't placed any orders yet. Start shopping now!</p>
          <button onClick={() => navigate('/products')} className="shop-btn">
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const statusBadge = getStatusBadge(order.status);
            return (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h3>Order #{order._id?.slice(-8).toUpperCase()}</h3>
                    <p className="order-date">
                      📅 {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="order-amount">
                    <span className="total">₹{order.totalPrice}</span>
                  </div>
                </div>

                <div className="order-status">
                  <span 
                    className="status-badge" 
                    style={{ backgroundColor: statusBadge.color }}
                  >
                    {statusBadge.icon} {order.status?.toUpperCase()}
                  </span>
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
                          ₹{item.price} x {item.quantity} = ₹{item.price * item.quantity}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="order-address">
                  <h4>📍 Delivery Address</h4>
                  <p>
                    {order.shippingAddress?.street}, {order.shippingAddress?.city}
                    <br />
                    {order.shippingAddress?.state} {order.shippingAddress?.zipcode}
                  </p>
                </div>

                <div className="order-payment">
                  <h4>Payment Method</h4>
                  <p>{order.paymentMethod?.toUpperCase()}</p>
                </div>

                <div className="order-actions">
                  <button 
                    onClick={() => setSelectedOrder(selectedOrder === order._id ? null : order._id)}
                    className="details-btn"
                  >
                    {selectedOrder === order._id ? '▼ Less Details' : '► More Details'}
                  </button>
                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <button className="track-btn">📍 Track Order</button>
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

export default Orders;
