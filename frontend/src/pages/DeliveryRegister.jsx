import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bike,
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RiderVerificationFields, { RIDER_HUB_OPTIONS } from '../components/RiderVerificationFields';
import '../styles/DeliveryLogin.css';

const IS_RIDER_APP = import.meta.env.VITE_APP_MODE === 'rider';

const DeliveryRegister = () => {
  const navigate = useNavigate();
  const { registerDelivery } = useAuth();

  const [step, setStep] = useState(1); // 1: Account Info, 2: Vehicle & KYC + Location
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const defaultHub = RIDER_HUB_OPTIONS[0];
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    vehicleType: 'bike',
    vehicleNumber: '',
    drivingLicenseNumber: '',
    idType: 'Aadhaar',
    idNumber: '',
    emergencyContact: '',
    bankOrUpi: '',
    assignedHub: defaultHub.value,
    lat: defaultHub.lat,
    lng: defaultHub.lng,
    area: defaultHub.area,
    gpsLocked: false,
  });

  const updateField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      setError('Please fill all required personal details.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.vehicleNumber.trim() || !form.drivingLicenseNumber.trim() || !form.idNumber.trim()) {
      setError('Vehicle Number, Driving License, and Govt ID Number are required.');
      return;
    }

    setLoading(true);
    try {
      await registerDelivery({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword,
        vehicleType: form.vehicleType,
        vehicleNumber: form.vehicleNumber,
        drivingLicenseNumber: form.drivingLicenseNumber,
        idType: form.idType,
        idNumber: form.idNumber,
        emergencyContact: form.emergencyContact || form.phone,
        bankOrUpi: form.bankOrUpi,
        assignedHub: form.assignedHub,
        lat: form.lat,
        lng: form.lng,
        area: form.area,
      });

      setSuccess('Registration & KYC complete! Launching Rider Console...');
      setTimeout(() => {
        navigate('/delivery', { replace: true });
      }, 650);
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Registration failed. Please check details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="delivery-login-page">
      <div className="delivery-login-wrapper wide">
        {!IS_RIDER_APP && (
          <Link to="/" className="delivery-back-link">
            <ChevronLeft size={16} /> Back to Storefront
          </Link>
        )}

        <div className="delivery-card">
          <div className="delivery-card-header">
            <div className="rider-badge-icon">
              <Bike size={28} color="#111827" />
            </div>
            <div className="delivery-brand-wrap">
              <img src="/logo.png" alt="Progicart" className="delivery-login-logo" />
              <div className="rider-hub-pill">
                <ShieldCheck size={12} />
                <span>RIDER SELF-ONBOARDING • STEP {step} OF 2</span>
              </div>
            </div>
            <h1 className="delivery-title">Become a Delivery Partner</h1>
            <p className="delivery-subtitle">
              {step === 1
                ? 'Step 1: Create your rider account credentials.'
                : 'Step 2: Complete Vehicle, KYC Verification & Dark Store Zone.'}
            </p>
          </div>

          <div className="rider-step-pills">
            <div className={`step-pill ${step >= 1 ? 'active' : ''}`}>1. Account</div>
            <div className={`step-pill ${step >= 2 ? 'active' : ''}`}>2. Vehicle & KYC</div>
          </div>

          {error && (
            <div className="delivery-alert-banner error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="delivery-alert-banner success">
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="delivery-login-form">
              <div className="delivery-input-group">
                <label>Full Name *</label>
                <div className="delivery-input-field">
                  <User size={17} className="input-svg-icon" />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="delivery-form-row-2">
                <div className="delivery-input-group">
                  <label>Email Address *</label>
                  <div className="delivery-input-field">
                    <Mail size={17} className="input-svg-icon" />
                    <input
                      type="email"
                      placeholder="rider@example.com"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="delivery-input-group">
                  <label>Phone Number *</label>
                  <div className="delivery-input-field">
                    <Phone size={17} className="input-svg-icon" />
                    <input
                      type="tel"
                      placeholder="10-digit mobile no."
                      value={form.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="delivery-form-row-2">
                <div className="delivery-input-group">
                  <label>Create Password *</label>
                  <div className="delivery-input-field">
                    <Lock size={17} className="input-svg-icon" />
                    <input
                      type="password"
                      placeholder="Min 6 characters"
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="delivery-input-group">
                  <label>Confirm Password *</label>
                  <div className="delivery-input-field">
                    <Lock size={17} className="input-svg-icon" />
                    <input
                      type="password"
                      placeholder="Repeat password"
                      value={form.confirmPassword}
                      onChange={(e) => updateField('confirmPassword', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="delivery-login-btn">
                <span>Continue to KYC & Vehicle</span>
                <ArrowRight size={18} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleFinalSubmit} className="delivery-login-form">
              <RiderVerificationFields
                form={form}
                onChange={updateField}
                onLocationDetected={(loc) => setForm((prev) => ({ ...prev, ...loc }))}
              />

              <div className="delivery-step-actions">
                <button
                  type="button"
                  className="delivery-secondary-btn"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>

                <button type="submit" className="delivery-login-btn flex-1" disabled={loading}>
                  <span>{loading ? 'Verifying & Registering...' : 'Complete Registration & Go Live'}</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
          )}

          <div className="delivery-card-footer">
            <div className="delivery-footer-links">
              <Link to="/delivery/login" className="footer-role-link">
                Already registered or added by Admin? Login here
              </Link>
            </div>
            <p className="delivery-copyright">
              Progicart Instant Delivery Network • Rider Fleet Partner Portal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryRegister;

