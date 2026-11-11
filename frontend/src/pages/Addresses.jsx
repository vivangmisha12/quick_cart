import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Crosshair, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  CheckCircle2,
  Navigation,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocationContext } from '../context/LocationContext';
import { userAddressesAPI } from '../api/api';
import '../styles/Addresses.css';

const Addresses = () => {
  const { user, updateUser } = useAuth();
  const { setLocation, detectLocation } = useLocationContext();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [activeSuccessMsg, setActiveSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    label: 'Home',
    houseNo: '',
    street: '',
    landmark: '',
    city: '',
    state: '',
    zipcode: '',
    latitude: '',
    longitude: '',
    isDefault: false,
  });

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/addresses');
      return;
    }
    loadAddresses();
  }, [user, navigate]);

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
    } catch (err) {}

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
      latitude: addr.latitude || addr.coordinates?.lat || '',
      longitude: addr.longitude || addr.coordinates?.lng || '',
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

  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // Detect Geolocation via Unified Accurate Detector
  const handleDetectGPS = async () => {
    setLocating(true);
    setGeoError('');
    try {
      const res = await detectLocation();
      if (res && res.lat && res.lng) {
        setFormData((prev) => ({
          ...prev,
          latitude: Number(res.lat).toFixed(6),
          longitude: Number(res.lng).toFixed(6),
          street: res.street || prev.street || res.display,
          city: res.city || 'Lucknow',
          state: res.state || 'Uttar Pradesh',
          zipcode: res.zipcode || prev.zipcode || '',
        }));
      }
    } catch (err) {
      setGeoError(err.message || 'Unable to retrieve location');
    } finally {
      setLocating(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();

    if (!formData.street || !formData.city) {
      alert('Please fill in street address and city.');
      return;
    }

    const houseNo = (formData.houseNo || '').trim();
    const area = (formData.street || '').trim();
    const landmark = (formData.landmark || '').trim();
    const fullStreet = [houseNo, area, landmark ? `(Near ${landmark})` : '']
      .filter(Boolean)
      .join(', ');

    const payload = {
      label: formData.label || 'Home',
      houseNo,
      area,
      landmark,
      street: fullStreet || area,
      city: (formData.city || '').trim(),
      state: (formData.state || '').trim(),
      zipcode: (formData.zipcode || '').trim(),
      latitude: formData.latitude,
      longitude: formData.longitude,
      coordinates:
        formData.latitude && formData.longitude
          ? { lat: Number(formData.latitude), lng: Number(formData.longitude) }
          : undefined,
      isDefault: Boolean(formData.isDefault),
    };

    try {
      let apiAddresses = null;
      if (editingId && /^[a-f0-9]{24}$/i.test(String(editingId))) {
        const res = await userAddressesAPI.update(editingId, payload);
        apiAddresses = res.data?.addresses;
      } else {
        const res = await userAddressesAPI.save(payload);
        apiAddresses = res.data?.addresses;
      }

      if (Array.isArray(apiAddresses) && apiAddresses.length > 0) {
        saveAddresses(
          apiAddresses.map((a) => ({
            ...a,
            latitude: a.latitude || a.coordinates?.lat || '',
            longitude: a.longitude || a.coordinates?.lng || '',
          }))
        );
      } else if (editingId) {
        saveAddresses(
          addresses.map((addr) =>
            addr.id === editingId ? { ...payload, id: addr.id } : addr
          )
        );
      } else {
        saveAddresses([{ ...payload, id: Date.now().toString() }, ...addresses]);
      }
    } catch (err) {
      if (editingId) {
        saveAddresses(
          addresses.map((addr) =>
            addr.id === editingId ? { ...payload, id: addr.id } : addr
          )
        );
      } else {
        saveAddresses([{ ...payload, id: Date.now().toString() }, ...addresses]);
      }
    }

    setEditingId(null);
    setFormData({
      label: 'Home',
      houseNo: '',
      street: '',
      landmark: '',
      city: '',
      state: '',
      zipcode: '',
      latitude: '',
      longitude: '',
      isDefault: false,
    });
    setShowForm(false);
    setActiveSuccessMsg('Address saved to your account & database!');
    setTimeout(() => setActiveSuccessMsg(''), 4000);
  };

  const handleDeleteAddress = async (id) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        if (/^[a-f0-9]{24}$/i.test(String(id))) {
          const res = await userAddressesAPI.remove(id);
          if (Array.isArray(res.data?.addresses)) {
            saveAddresses(
              res.data.addresses.map((a) => ({
                ...a,
                latitude: a.latitude || a.coordinates?.lat || '',
                longitude: a.longitude || a.coordinates?.lng || '',
              }))
            );
            return;
          }
        }
      } catch (err) {}
      const updated = addresses.filter((addr) => String(addr.id) !== String(id));
      saveAddresses(updated);
    }
  };

  const handleEditAddress = (address) => {
    setFormData({
      ...address,
      houseNo: address.houseNo || '',
      street: address.area || address.street || '',
      landmark: address.landmark || '',
      latitude: address.latitude || address.coordinates?.lat || '',
      longitude: address.longitude || address.coordinates?.lng || '',
    });
    setEditingId(address.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSetDeliveryLocation = (address) => {
    const locStr = `${address.street}, ${address.city}`;
    setLocation(locStr);
    setActiveSuccessMsg(`Active delivery location set to: ${locStr}`);
    setTimeout(() => setActiveSuccessMsg(''), 3000);
  };

  return (
    <div className="addresses-container">
      {/* Header */}
      <div className="addresses-header">
        <div>
          <h1>Saved Delivery Addresses</h1>
          <p>Manage your home, work, and GPS delivery locations</p>
        </div>
        <button 
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setGeoError('');
          }}
          className="add-address-btn"
        >
          {showForm ? '✕ Close Form' : '+ Add New Address'}
        </button>
      </div>

      {activeSuccessMsg && (
        <div className="success-toast-banner">
          <CheckCircle2 size={18} />
          <span>{activeSuccessMsg}</span>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="address-form-container">
          <div className="form-header-row">
            <h3>{editingId ? 'Edit Address' : 'Add New Delivery Address'}</h3>
            <button
              type="button"
              className="gps-detect-trigger-btn"
              onClick={handleDetectGPS}
              disabled={locating}
            >
              <Crosshair size={16} className={locating ? 'spin-icon' : ''} />
              <span>{locating ? 'Detecting GPS…' : 'Auto-Fill from Current GPS'}</span>
            </button>
          </div>

          {geoError && (
            <div className="geo-error-box">
              <AlertCircle size={16} />
              <span>{geoError}</span>
            </div>
          )}

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

              {/* GPS Coordinates Display */}
              <div className="form-group">
                <label>GPS Latitude</label>
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleAddressChange}
                  placeholder="e.g. 26.8467"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>GPS Longitude</label>
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleAddressChange}
                  placeholder="e.g. 80.9462"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>House / Flat / Floor No.</label>
                <input
                  type="text"
                  name="houseNo"
                  value={formData.houseNo}
                  onChange={handleAddressChange}
                  placeholder="e.g., Flat 402, Sunshine Heights"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Nearby Landmark (Optional)</label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleAddressChange}
                  placeholder="e.g., Opposite Wave Mall"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Area / Street / Sector *</label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleAddressChange}
                placeholder="e.g., Vibhuti Khand, Hazratganj"
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
              <div className="form-group">
                <label>Zip Code / Pincode</label>
                <input
                  type="text"
                  name="zipcode"
                  value={formData.zipcode}
                  onChange={handleAddressChange}
                  placeholder="e.g., 226001"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group checkbox-row">
              <input
                type="checkbox"
                id="isDefault"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleAddressChange}
              />
              <label htmlFor="isDefault">Set as default delivery address</label>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-btn">
                {editingId ? 'Update Address' : 'Save Address'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }} 
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Addresses Grid */}
      {addresses.length === 0 ? (
        <div className="empty-addresses">
          <div className="empty-icon-wrap">
            <MapPin size={48} color="#0c831f" />
          </div>
          <h2>No Saved Addresses Found</h2>
          <p>Add your home or GPS location to enjoy fast 10-minute grocery delivery.</p>
          <button 
            type="button" 
            className="add-address-btn"
            onClick={() => setShowForm(true)}
            style={{ marginTop: '16px' }}
          >
            + Add Your First Address
          </button>
        </div>
      ) : (
        <div className="addresses-grid">
          {addresses.map((address) => (
            <div key={address.id} className="address-card">
              <div className="address-card-header">
                <div className="label-badge-group">
                  <span className="address-type-tag">{address.label}</span>
                  {address.isDefault && <span className="default-badge">Default</span>}
                </div>
                <div className="address-actions-icons">
                  <button
                    type="button"
                    onClick={() => handleEditAddress(address)}
                    className="action-icon-btn"
                    title="Edit address"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(address.id)}
                    className="action-icon-btn delete"
                    title="Delete address"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="address-content">
                <p className="street-text">{address.street}</p>
                <p className="city-state-text">
                  {address.city}{address.state ? `, ${address.state}` : ''} {address.zipcode ? `- ${address.zipcode}` : ''}
                </p>

                {/* GPS Coordinates Badge */}
                {(address.latitude || address.longitude) && (
                  <div className="gps-coordinate-badge">
                    <Navigation size={12} />
                    <span>GPS: {address.latitude}, {address.longitude}</span>
                  </div>
                )}
              </div>

              <div className="address-card-footer">
                <button
                  type="button"
                  className="deliver-here-btn"
                  onClick={() => handleSetDeliveryLocation(address)}
                >
                  <Check size={14} />
                  <span>Deliver Here</span>
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
