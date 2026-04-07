import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI, ordersAPI } from '../api/api';
import '../styles/Profile.css';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('info'); // info, addresses, orders
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState({
    street: '',
    city: '',
    zipcode: '',
  });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchProfileData();
    fetchOrders();
    loadAddresses();
  }, [user, navigate]);

  const fetchProfileData = async () => {
    try {
      // Try to fetch from API first
      const response = await authAPI.getProfile();
      setProfileData({
        name: response.data.name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
      });
    } catch (error) {
      // If API fails, try to load from localStorage
      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        setProfileData(JSON.parse(savedProfile));
      } else if (user) {
        // If no saved data, use data from user context
        setProfileData({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
        });
      }
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getUserOrders();
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const loadAddresses = () => {
    if (!user?.id) {
      setAddresses([]);
      return;
    }
    const saved = localStorage.getItem(`savedAddresses_${user.id}`);
    if (saved) {
      setAddresses(JSON.parse(saved));
    } else {
      setAddresses([]);
    }
  };

  const saveAddresses = (newAddresses) => {
    if (!user?.id) return;
    localStorage.setItem(`savedAddresses_${user.id}`, JSON.stringify(newAddresses));
    setAddresses(newAddresses);
    
    // Dispatch custom event so other components (like Navbar) know addresses have changed
    window.dispatchEvent(new CustomEvent('addressesUpdated', { detail: newAddresses }));
  };

  const handleProfileUpdate = async () => {
    if (!profileData.name || !profileData.phone) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      // Save profile locally to localStorage
      const userProfile = {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
      };
      localStorage.setItem('userProfile', JSON.stringify(userProfile));

      // Show success message
      alert('Profile updated successfully! ✓');
      setIsEditing(false);
    } catch (error) {
      alert('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = () => {
    if (!newAddress.street || !newAddress.city || !newAddress.zipcode) {
      alert('Please fill all fields');
      return;
    }

    if (editingAddressId !== null) {
      // Update existing
      const updated = addresses.map(addr =>
        addr.id === editingAddressId ? { ...newAddress, id: addr.id } : addr
      );
      saveAddresses(updated);
      setEditingAddressId(null);
    } else {
      // Add new
      const address = {
        id: Date.now(),
        ...newAddress,
      };
      saveAddresses([...addresses, address]);
    }

    setNewAddress({ street: '', city: '', zipcode: '' });
    setShowAddressForm(false);

    // Check if there's a return_to URL in query params
    const params = new URLSearchParams(location.search);
    const returnTo = params.get('return_to');
    if (returnTo) {
      navigate(returnTo);
    }
  };

  const handleDeleteAddress = (id) => {
    if (confirm('Delete this address?')) {
      saveAddresses(addresses.filter(addr => addr.id !== id));
    }
  };

  const handleEditAddress = (address) => {
    setNewAddress({
      street: address.street,
      city: address.city,
      zipcode: address.zipcode,
    });
    setEditingAddressId(address.id);
    setShowAddressForm(true);
  };

  const handleLogout = () => {
    if (confirm('Logout?')) {
      logout();
      navigate('/');
    }
  };

  return (
    <div className="profile-container">
      {/* Profile Header with User Info */}
      <div className="profile-hero">
        <div className="profile-avatar">
          <div className="avatar-circle">
            {profileData.name?.charAt(0).toUpperCase() || '👤'}
          </div>
        </div>
        <div className="profile-hero-content">
          <h1>Welcome, {profileData.name || 'User'}!</h1>
          <p className="profile-email">{profileData.email}</p>
          <div className="profile-hero-buttons">
            <button 
              className="edit-profile-btn" 
              onClick={() => setActiveTab('info')}
              type="button"
            >
              ✏️ Edit Profile
            </button>
            <button className="logout-btn" onClick={handleLogout} type="button">
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <button 
          className="stat-card stat-card-btn" 
          onClick={() => navigate('/orders')}
          type="button"
        >
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <p className="stat-label">Total Orders</p>
            <p className="stat-value">{orders.length}</p>
          </div>
        </button>
        <button 
          className="stat-card stat-card-btn" 
          onClick={() => navigate('/addresses')}
          type="button"
        >
          <div className="stat-icon">📍</div>
          <div className="stat-content">
            <p className="stat-label">Saved Addresses</p>
            <p className="stat-value">{addresses.length}</p>
          </div>
        </button>
        <div className="stat-card">
          <div className="stat-icon">❤️</div>
          <div className="stat-content">
            <p className="stat-label">Wishlist Items</p>
            <p className="stat-value">-</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
          type="button"
        >
          <span className="tab-icon">👤</span>
          <span className="tab-label">Profile Info</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'addresses' ? 'active' : ''}`}
          onClick={() => setActiveTab('addresses')}
          type="button"
        >
          <span className="tab-icon">📍</span>
          <span className="tab-label">Addresses</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
          type="button"
        >
          <span className="tab-icon">📦</span>
          <span className="tab-label">Orders</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="profile-content">
        {/* Personal Info Tab */}
        {activeTab === 'info' && (
          <div className="info-section">
            <div className="info-card">
              <div className="info-header">
                <h2>Personal Information</h2>
                {!isEditing && (
                  <button
                    className="edit-btn"
                    onClick={() => setIsEditing(true)}
                    type="button"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="info-form">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      style={{ backgroundColor: '#f5f5f5' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="button-group">
                    <button
                      className="save-btn"
                      onClick={handleProfileUpdate}
                      disabled={loading}
                      type="button"
                    >
                      {loading ? 'Saving...' : '💾 Save Changes'}
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={() => setIsEditing(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="info-display">
                  <div className="info-row">
                    <span className="label">Name:</span>
                    <span className="value">{profileData.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Email:</span>
                    <span className="value">{profileData.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Phone:</span>
                    <span className="value">{profileData.phone || 'Not provided'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <div className="addresses-section">
            {!showAddressForm && (
              <button
                className="add-address-btn"
                onClick={() => {
                  setShowAddressForm(true);
                  setEditingAddressId(null);
                  setNewAddress({ street: '', city: '', zipcode: '' });
                }}
                type="button"
              >
                ➕ Add New Address
              </button>
            )}

            {showAddressForm && (
              <div className="address-form-card">
                <h3>
                  {editingAddressId ? 'Edit Address' : 'Add New Address'}
                </h3>
                <div className="form-group">
                  <label>Street Address</label>
                  <input
                    type="text"
                    value={newAddress.street}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, street: e.target.value })
                    }
                    placeholder="Enter street address"
                  />
                </div>

                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, city: e.target.value })
                    }
                    placeholder="Enter city"
                  />
                </div>

                <div className="form-group">
                  <label>Zip Code</label>
                  <input
                    type="text"
                    value={newAddress.zipcode}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, zipcode: e.target.value })
                    }
                    placeholder="Enter zip code"
                  />
                </div>

                <div className="button-group">
                  <button className="save-btn" onClick={handleAddAddress} type="button">
                    {editingAddressId ? '💾 Update' : '💾 Save Address'}
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setShowAddressForm(false);
                      setEditingAddressId(null);
                      setNewAddress({ street: '', city: '', zipcode: '' });
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="addresses-list">
              {addresses.length === 0 ? (
                <p className="empty-message">No saved addresses yet</p>
              ) : (
                addresses.map((address) => (
                  <div key={address.id} className="address-card">
                    <div className="address-info">
                      <p className="street">{address.street}</p>
                      <p className="city-zip">
                        {address.city}, {address.zipcode}
                      </p>
                    </div>
                    <div className="address-actions">
                      <button
                        className="edit-icon-btn"
                        onClick={() => handleEditAddress(address)}
                        title="Edit"
                        type="button"
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-icon-btn"
                        onClick={() => handleDeleteAddress(address.id)}
                        type="button"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="orders-section">
            {orders.length === 0 ? (
              <div className="empty-message">
                <p>No orders yet</p>
                <a href="/products" className="shop-btn">
                  Start Shopping 🛍️
                </a>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map((order) => (
                  <div key={order._id} className="order-card">
                    <div className="order-header">
                      <div>
                        <p className="order-id">Order #{order._id.slice(-6)}</p>
                        <p className="order-date">
                          📅{' '}
                          {new Date(order.createdAt).toLocaleDateString(
                            'en-IN'
                          )}
                        </p>
                      </div>
                      <div className="order-status">
                        <span
                          className={`status-badge status-${
                            order.status || 'pending'
                          }`}
                        >
                          {order.status || 'Pending'}
                        </span>
                      </div>
                    </div>

                    <div className="order-details">
                      <p>
                        <strong>Items:</strong> {order.items?.length || 0}
                      </p>
                      <p>
                        <strong>Total:</strong> ₹{order.totalPrice?.toFixed(2) || '0'}
                      </p>
                      <p>
                        <strong>Delivery:</strong>{' '}
                        {order.shippingAddress?.city || 'N/A'}
                      </p>
                      <p>
                        <strong>Payment:</strong>{' '}
                        {order.paymentMethod?.toUpperCase() || 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
