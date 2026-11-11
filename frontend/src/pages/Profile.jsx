import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI, ordersAPI, userAddressesAPI } from '../api/api';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Heart,
  ShoppingBag,
  Edit3,
  LogOut,
  Plus,
  Trash2,
  Check,
  X,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  Save,
  Calendar,
  CreditCard,
} from 'lucide-react';
import '../styles/Profile.css';

const STATUS_LABEL_MAP = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  packing: 'Packing',
  assigned: 'Rider Assigned',
  picked_up: 'Picked Up',
  out_for_delivery: 'Out for Delivery',
  shipped: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const { totalWishlistItems } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('info');
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
    label: 'Home',
    houseNo: '',
    street: '',
    landmark: '',
    city: '',
    state: '',
    zipcode: '',
  });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState(null);
  const [notice, setNotice] = useState({ type: '', text: '' });

  const showNotice = (type, text) => {
    setNotice({ type, text });
  };

  useEffect(() => {
    if (!notice.text) return;
    const timer = setTimeout(() => setNotice({ type: '', text: '' }), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

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
      const response = await authAPI.getProfile();
      setProfileData({
        name: response.data.name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
      });
    } catch (error) {
      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        setProfileData(JSON.parse(savedProfile));
      } else if (user) {
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

  const loadAddresses = async () => {
    if (!user?.id) {
      setAddresses([]);
      return;
    }

    let resolved = Array.isArray(user.addresses) ? user.addresses : [];
    try {
      const res = await userAddressesAPI.getAll();
      if (Array.isArray(res.data?.addresses)) {
        resolved = res.data.addresses;
      }
    } catch (err) {
      // Fallback cleanly to hydrated user addresses or localStorage cache
    }

    if (resolved.length === 0) {
      const saved = localStorage.getItem(`savedAddresses_${user.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) resolved = parsed;
        } catch (e) {}
      }
    }

    const normalized = resolved.map((addr) => ({
      ...addr,
      id: String(addr.id || addr._id || Date.now()),
    }));
    setAddresses(normalized);
    if (normalized.length > 0) {
      localStorage.setItem(`savedAddresses_${user.id}`, JSON.stringify(normalized));
    }
  };

  const saveAddresses = (newAddresses) => {
    if (!user?.id) return;
    const normalized = newAddresses.map((addr) => ({
      ...addr,
      id: String(addr.id || addr._id || Date.now()),
    }));
    localStorage.setItem(`savedAddresses_${user.id}`, JSON.stringify(normalized));
    setAddresses(normalized);
    if (typeof updateUser === 'function') {
      updateUser({ addresses: normalized });
    }
    window.dispatchEvent(new CustomEvent('addressesUpdated', { detail: normalized }));
  };

  const handleProfileUpdate = async () => {
    const trimmedName = profileData.name?.trim() || '';
    const trimmedPhone = profileData.phone?.trim() || '';

    if (!trimmedName || !trimmedPhone) {
      showNotice('error', 'Please enter both your name and phone number.');
      return;
    }

    setLoading(true);
    try {
      const userProfile = {
        name: trimmedName,
        email: profileData.email,
        phone: trimmedPhone,
      };

      try {
        const res = await authAPI.updateProfile({
          name: trimmedName,
          phone: trimmedPhone,
        });
        if (res.data?.user && typeof updateUser === 'function') {
          updateUser(res.data.user);
        }
      } catch (apiErr) {
        if (typeof updateUser === 'function') {
          updateUser({ name: trimmedName, phone: trimmedPhone });
        }
      }

      localStorage.setItem('userProfile', JSON.stringify(userProfile));
      setProfileData(userProfile);
      setIsEditing(false);
      showNotice('success', 'Your profile has been updated.');
    } catch (error) {
      showNotice('error', 'Could not update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.street.trim() || !newAddress.city.trim() || !newAddress.zipcode.trim()) {
      showNotice('error', 'Please fill in area/street, city, and pincode.');
      return;
    }

    const houseNo = (newAddress.houseNo || '').trim();
    const area = newAddress.street.trim();
    const landmark = (newAddress.landmark || '').trim();
    const combinedStreet = [houseNo, area, landmark ? `(Near ${landmark})` : '']
      .filter(Boolean)
      .join(', ');

    const cleanedAddress = {
      label: newAddress.label || 'Home',
      houseNo,
      area,
      landmark,
      street: combinedStreet || area,
      city: newAddress.city.trim(),
      state: (newAddress.state || '').trim(),
      zipcode: newAddress.zipcode.trim(),
    };

    try {
      let apiAddresses = null;
      if (editingAddressId && /^[a-f0-9]{24}$/i.test(String(editingAddressId))) {
        const res = await userAddressesAPI.update(editingAddressId, cleanedAddress);
        apiAddresses = res.data?.addresses;
      } else {
        const res = await userAddressesAPI.save(cleanedAddress);
        apiAddresses = res.data?.addresses;
      }

      if (Array.isArray(apiAddresses) && apiAddresses.length > 0) {
        saveAddresses(apiAddresses);
      } else if (editingAddressId !== null) {
        saveAddresses(
          addresses.map((addr) =>
            addr.id === editingAddressId ? { ...cleanedAddress, id: addr.id } : addr
          )
        );
      } else {
        saveAddresses([{ id: String(Date.now()), ...cleanedAddress }, ...addresses]);
      }
    } catch (err) {
      if (editingAddressId !== null) {
        saveAddresses(
          addresses.map((addr) =>
            addr.id === editingAddressId ? { ...cleanedAddress, id: addr.id } : addr
          )
        );
      } else {
        saveAddresses([{ id: String(Date.now()), ...cleanedAddress }, ...addresses]);
      }
    }

    showNotice('success', editingAddressId ? 'Address updated successfully.' : 'Address saved to your account.');
    setEditingAddressId(null);
    setNewAddress({
      label: 'Home',
      houseNo: '',
      street: '',
      landmark: '',
      city: '',
      state: '',
      zipcode: '',
    });
    setShowAddressForm(false);

    const params = new URLSearchParams(location.search);
    const returnTo = params.get('return_to');
    if (returnTo) {
      navigate(returnTo);
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      if (/^[a-f0-9]{24}$/i.test(String(id))) {
        const res = await userAddressesAPI.remove(id);
        if (Array.isArray(res.data?.addresses)) {
          saveAddresses(res.data.addresses);
          setDeletingAddressId(null);
          showNotice('success', 'Address removed.');
          return;
        }
      }
    } catch (err) {}
    saveAddresses(addresses.filter((addr) => String(addr.id) !== String(id)));
    setDeletingAddressId(null);
    showNotice('success', 'Address removed.');
  };

  const handleEditAddress = (address) => {
    setNewAddress({
      label: address.label || 'Home',
      houseNo: address.houseNo || '',
      street: address.area || address.street || '',
      landmark: address.landmark || '',
      city: address.city || '',
      state: address.state || '',
      zipcode: address.zipcode || '',
    });
    setEditingAddressId(address.id);
    setShowAddressForm(true);
    setDeletingAddressId(null);
  };

  const handleLogoutConfirm = () => {
    logout();
    navigate('/');
  };

  const initials = (profileData.name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="account-page">
      <div className="profile-container">
        {/* Top Hero Summary Card */}
        <section className="profile-hero">
          <div className="profile-hero-main">
            <div className="profile-avatar">
              <div className="avatar-circle" aria-hidden="true">
                {initials || 'U'}
              </div>
            </div>

            <div className="profile-hero-content">
              <div className="account-badge-pill">
                <ShieldCheck size={13} />
                <span>Progicart Account</span>
              </div>
              <h1>{profileData.name || 'My Account'}</h1>
              <div className="profile-meta-row">
                {profileData.email && (
                  <span className="profile-meta-item">
                    <Mail size={14} />
                    {profileData.email}
                  </span>
                )}
                {profileData.phone && (
                  <span className="profile-meta-item">
                    <Phone size={14} />
                    {profileData.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="profile-hero-buttons">
            <button
              className="edit-profile-btn"
              onClick={() => {
                setActiveTab('info');
                setIsEditing(true);
                setConfirmLogout(false);
              }}
              type="button"
            >
              <Edit3 size={15} />
              <span>Edit Profile</span>
            </button>

            {!confirmLogout ? (
              <button
                className="logout-btn"
                onClick={() => setConfirmLogout(true)}
                type="button"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            ) : (
              <div className="logout-confirm-pill">
                <span>Sign out?</span>
                <button
                  type="button"
                  className="confirm-yes-btn"
                  onClick={handleLogoutConfirm}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className="confirm-no-btn"
                  onClick={() => setConfirmLogout(false)}
                >
                  No
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Inline Feedback Toast */}
        {notice.text && (
          <div className={`account-notice ${notice.type === 'error' ? 'is-error' : 'is-success'}`}>
            <span>{notice.text}</span>
            <button
              type="button"
              className="notice-close-btn"
              onClick={() => setNotice({ type: '', text: '' })}
              aria-label="Dismiss message"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Quick Overview Cards */}
        <section className="quick-stats">
          <button
            className="stat-card stat-card-btn"
            onClick={() => navigate('/orders')}
            type="button"
          >
            <div className="stat-icon-well">
              <Package size={20} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Orders</p>
              <p className="stat-value">{orders.length}</p>
            </div>
            <ChevronRight size={18} className="stat-arrow" />
          </button>

          <button
            className="stat-card stat-card-btn"
            onClick={() => navigate('/addresses')}
            type="button"
          >
            <div className="stat-icon-well">
              <MapPin size={20} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Saved Addresses</p>
              <p className="stat-value">{addresses.length}</p>
            </div>
            <ChevronRight size={18} className="stat-arrow" />
          </button>

          <button
            className="stat-card stat-card-btn"
            onClick={() => navigate('/wishlist')}
            type="button"
          >
            <div className="stat-icon-well">
              <Heart size={20} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Wishlist Items</p>
              <p className="stat-value">{totalWishlistItems}</p>
            </div>
            <ChevronRight size={18} className="stat-arrow" />
          </button>
        </section>

        {/* Cream Segmented Navigation Tabs */}
        <div className="profile-tabs" role="tablist" aria-label="Account sections">
          <button
            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
            type="button"
            role="tab"
            aria-selected={activeTab === 'info'}
          >
            <User size={16} />
            <span className="tab-label">Profile Info</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'addresses' ? 'active' : ''}`}
            onClick={() => setActiveTab('addresses')}
            type="button"
            role="tab"
            aria-selected={activeTab === 'addresses'}
          >
            <MapPin size={16} />
            <span className="tab-label">Addresses</span>
            <span className="tab-count">{addresses.length}</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
            type="button"
            role="tab"
            aria-selected={activeTab === 'orders'}
          >
            <ShoppingBag size={16} />
            <span className="tab-label">Recent Orders</span>
            <span className="tab-count">{orders.length}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="profile-content">
          {/* Personal Info Tab */}
          {activeTab === 'info' && (
            <div className="info-section">
              <div className="info-card">
                <div className="info-header">
                  <div>
                    <h2>Personal Details</h2>
                    <p className="info-subtitle">Manage your contact information for faster delivery updates.</p>
                  </div>
                  {!isEditing && (
                    <button
                      className="edit-btn"
                      onClick={() => setIsEditing(true)}
                      type="button"
                    >
                      <Edit3 size={14} />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="info-form">
                    <div className="form-group">
                      <label htmlFor="profile-name">Full Name</label>
                      <input
                        id="profile-name"
                        type="text"
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, name: e.target.value })
                        }
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="profile-email">Email Address</label>
                      <input
                        id="profile-email"
                        type="email"
                        value={profileData.email}
                        disabled
                        className="input-readonly"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="profile-phone">Phone Number</label>
                      <input
                        id="profile-phone"
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            phone: e.target.value,
                          })
                        }
                        placeholder="Enter 10-digit mobile number"
                      />
                    </div>

                    <div className="button-group">
                      <button
                        className="save-btn"
                        onClick={handleProfileUpdate}
                        disabled={loading}
                        type="button"
                      >
                        <Save size={15} />
                        <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={() => {
                          setIsEditing(false);
                          fetchProfileData();
                        }}
                        type="button"
                      >
                        <X size={15} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="info-display">
                    <div className="info-row">
                      <span className="label">
                        <User size={15} />
                        Full Name
                      </span>
                      <span className="value">{profileData.name || 'Not set'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">
                        <Mail size={15} />
                        Email Address
                      </span>
                      <span className="value">{profileData.email || 'Not set'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">
                        <Phone size={15} />
                        Mobile Number
                      </span>
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
              <div className="addresses-toolbar">
                {!showAddressForm && (
                  <button
                    className="add-address-btn"
                    onClick={() => {
                      setShowAddressForm(true);
                      setEditingAddressId(null);
                      setNewAddress({
                        label: 'Home',
                        houseNo: '',
                        street: '',
                        landmark: '',
                        city: '',
                        state: '',
                        zipcode: '',
                      });
                    }}
                    type="button"
                  >
                    <Plus size={16} />
                    <span>Add New Address</span>
                  </button>
                )}
                <button
                  className="manage-all-link-btn"
                  onClick={() => navigate('/addresses')}
                  type="button"
                >
                  <span>Full Address Book</span>
                  <ArrowUpRight size={15} />
                </button>
              </div>

              {showAddressForm && (
                <div className="address-form-card">
                  <h3>{editingAddressId ? 'Edit Saved Address' : 'Add Delivery Address'}</h3>
                  <div className="address-form-grid">
                    <div className="form-group">
                      <label>House / Flat / Floor No.</label>
                      <input
                        type="text"
                        value={newAddress.houseNo}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, houseNo: e.target.value })
                        }
                        placeholder="e.g., Flat 302, Royal Residency"
                      />
                    </div>

                    <div className="form-group">
                      <label>Nearby Landmark (Optional)</label>
                      <input
                        type="text"
                        value={newAddress.landmark}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, landmark: e.target.value })
                        }
                        placeholder="e.g., Opposite Wave Mall"
                      />
                    </div>

                    <div className="form-group form-group-full">
                      <label>Area / Street / Sector</label>
                      <input
                        type="text"
                        value={newAddress.street}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, street: e.target.value })
                        }
                        placeholder="e.g., Vibhuti Khand, Gomti Nagar"
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
                      <label>Pincode / Zip Code</label>
                      <input
                        type="text"
                        value={newAddress.zipcode}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, zipcode: e.target.value })
                        }
                        placeholder="Enter 6-digit pincode"
                      />
                    </div>
                  </div>

                  <div className="button-group">
                    <button className="save-btn" onClick={handleAddAddress} type="button">
                      <Check size={15} />
                      <span>{editingAddressId ? 'Update Address' : 'Save Address'}</span>
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={() => {
                        setShowAddressForm(false);
                        setEditingAddressId(null);
                        setNewAddress({
                          label: 'Home',
                          houseNo: '',
                          street: '',
                          landmark: '',
                          city: '',
                          state: '',
                          zipcode: '',
                        });
                      }}
                      type="button"
                    >
                      <X size={15} />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              )}

              {addresses.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon-box">
                    <MapPin size={28} />
                  </div>
                  <h3>No Saved Addresses</h3>
                  <p>Save your home or office address for one-tap checkout.</p>
                </div>
              ) : (
                <div className="addresses-list">
                  {addresses.map((address) => (
                    <div key={address.id} className="saved-addr-card">
                      <div className="saved-addr-top">
                        <div className="addr-pin-badge">
                          <MapPin size={15} />
                        </div>
                        <div className="address-info">
                          <p className="street">
                            {address.label ? `${address.label}: ` : ''}
                            {address.street || [address.houseNo, address.area].filter(Boolean).join(', ')}
                          </p>
                          <p className="city-zip">
                            {[address.city, address.state, address.zipcode].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>

                      <div className="address-actions">
                        <button
                          className="edit-icon-btn"
                          onClick={() => handleEditAddress(address)}
                          type="button"
                        >
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </button>

                        {deletingAddressId === address.id ? (
                          <div className="inline-delete-confirm">
                            <button
                              className="confirm-del-btn"
                              onClick={() => handleDeleteAddress(address.id)}
                              type="button"
                            >
                              Delete
                            </button>
                            <button
                              className="cancel-del-btn"
                              onClick={() => setDeletingAddressId(null)}
                              type="button"
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            className="delete-icon-btn"
                            onClick={() => setDeletingAddressId(address.id)}
                            type="button"
                          >
                            <Trash2 size={14} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="orders-section">
              {orders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon-box">
                    <ShoppingBag size={28} />
                  </div>
                  <h3>No Orders Yet</h3>
                  <p>Once you place an order, you can track and reorder it from here.</p>
                  <button
                    type="button"
                    className="shop-btn"
                    onClick={() => navigate('/products')}
                  >
                    <ShoppingBag size={16} />
                    <span>Start Shopping</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="orders-section-bar">
                    <p className="orders-summary-caption">
                      Showing {Math.min(orders.length, 5)} recent {orders.length === 1 ? 'order' : 'orders'}
                    </p>
                    <button
                      type="button"
                      className="manage-all-link-btn"
                      onClick={() => navigate('/orders')}
                    >
                      <span>View All Orders</span>
                      <ArrowUpRight size={15} />
                    </button>
                  </div>

                  <div className="orders-list">
                    {orders.slice(0, 5).map((order) => {
                      const statusKey = order.status || 'pending';
                      const statusLabel = STATUS_LABEL_MAP[statusKey] || statusKey;
                      return (
                        <div key={order._id} className="account-order-card">
                          <div className="account-order-header">
                            <div>
                              <p className="order-id">Order #{order._id?.slice(-6).toUpperCase()}</p>
                              <p className="order-date">
                                <Calendar size={13} />
                                <span>
                                  {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              </p>
                            </div>
                            <span className={`status-badge status-${statusKey}`}>
                              {statusLabel}
                            </span>
                          </div>

                          <div className="order-details">
                            <p>
                              <strong>Items:</strong> {order.items?.length || 0}
                            </p>
                            <p>
                              <strong>Total:</strong> ₹{order.totalPrice?.toFixed(2) || '0'}
                            </p>
                            <p>
                              <strong>City:</strong> {order.shippingAddress?.city || 'N/A'}
                            </p>
                            <p className="order-payment-chip">
                              <CreditCard size={13} />
                              <span>{order.paymentMethod?.toUpperCase() || 'N/A'}</span>
                            </p>
                          </div>

                          <div className="account-order-footer">
                            <button
                              type="button"
                              className="view-order-cream-btn"
                              onClick={() => navigate('/orders')}
                            >
                              <span>View & Track Order</span>
                              <ChevronRight size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
