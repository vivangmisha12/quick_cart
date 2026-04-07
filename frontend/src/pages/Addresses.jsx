import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Addresses.css';

const Addresses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    label: 'Home',
    street: '',
    city: '',
    state: '',
    zipcode: '',
    isDefault: false,
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadAddresses();
  }, [user, navigate]);

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
  };

  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleAddAddress = (e) => {
    e.preventDefault();

    if (!formData.street || !formData.city || !formData.zipcode) {
      alert('Please fill all required fields');
      return;
    }

    if (editingId) {
      // Update existing address
      const updated = addresses.map((addr) =>
        addr.id === editingId ? { ...formData, id: addr.id } : addr
      );
      saveAddresses(updated);
      setEditingId(null);
    } else {
      // Add new address
      const newAddress = {
        ...formData,
        id: Date.now().toString(),
      };
      saveAddresses([...addresses, newAddress]);
    }

    // Reset form
    setFormData({
      label: 'Home',
      street: '',
      city: '',
      state: '',
      zipcode: '',
      isDefault: false,
    });
    setShowForm(false);
  };

  const handleDeleteAddress = (id) => {
    if (confirm('Are you sure you want to delete this address?')) {
      const updated = addresses.filter((addr) => addr.id !== id);
      saveAddresses(updated);
    }
  };

  const handleEditAddress = (address) => {
    setFormData(address);
    setEditingId(address.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      label: 'Home',
      street: '',
      city: '',
      state: '',
      zipcode: '',
      isDefault: false,
    });
  };

  return (
    <div className="addresses-container">
      <div className="addresses-header">
        <div>
          <h1>📍 Saved Addresses</h1>
          <p>Manage your delivery addresses</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="add-address-btn"
        >
          {showForm ? '✕ Cancel' : '+ Add New Address'}
        </button>
      </div>

      {/* Add/Edit Address Form */}
      {showForm && (
        <div className="address-form-container">
          <h3>{editingId ? 'Edit Address' : 'Add New Address'}</h3>
          <form onSubmit={handleAddAddress} className="address-form">
            <div className="form-row">
              <div className="form-group">
                <label>Address Label</label>
                <select
                  name="label"
                  value={formData.label}
                  onChange={handleAddressChange}
                  className="form-input"
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Street Address *</label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleAddressChange}
                placeholder="e.g., 123 Main Street"
                className="form-input"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleAddressChange}
                  placeholder="e.g., Lucknow"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleAddressChange}
                  placeholder="e.g., Uttar Pradesh"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Zip Code *</label>
              <input
                type="text"
                name="zipcode"
                value={formData.zipcode}
                onChange={handleAddressChange}
                placeholder="e.g., 226003"
                className="form-input"
                required
              />
            </div>

            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="isDefault"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleAddressChange}
              />
              <label htmlFor="isDefault">Set as default address</label>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-btn">
                {editingId ? '💾 Update Address' : '✓ Save Address'}
              </button>
              <button type="button" onClick={handleCancel} className="cancel-btn">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Addresses List */}
      {addresses.length === 0 ? (
        <div className="empty-addresses">
          <div className="empty-icon">📍</div>
          <h2>No Saved Addresses</h2>
          <p>Add your first delivery address to get started</p>
        </div>
      ) : (
        <div className="addresses-grid">
          {addresses.map((address) => (
            <div key={address.id} className="address-card">
              <div className="address-card-header">
                <h3>{address.label}</h3>
                {address.isDefault && <span className="default-badge">Default</span>}
              </div>

              <div className="address-content">
                <p className="street">{address.street}</p>
                <p className="city-state">
                  {address.city}
                  {address.state && `, ${address.state}`}
                </p>
                <p className="zipcode">{address.zipcode}</p>
              </div>

              <div className="address-actions">
                <button
                  onClick={() => handleEditAddress(address)}
                  className="edit-btn"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDeleteAddress(address.id)}
                  className="delete-btn"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Addresses;
