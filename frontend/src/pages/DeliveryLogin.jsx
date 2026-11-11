import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bike,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Zap,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DeliveryAuthTabs, DeliveryPasswordField } from '../components/DeliveryAuthTabs';
import '../styles/DeliveryLogin.css';

const IS_RIDER_APP = import.meta.env.VITE_APP_MODE === 'rider';

const DeliveryLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();
  const { login, logout } = useAuth();

  const handleDeliverySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Please provide rider credentials.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email.trim(), password, 'delivery');
      const user = res?.user;

      if (!user?.isDeliveryPartner && user?.role !== 'delivery_partner' && !user?.isAdmin) {
        logout();
        setError('Access Denied: This portal is strictly for registered Progicart Delivery Fleet Partners.');
        setLoading(false);
        return;
      }

      const needsKyc = !user?.isAdmin && user?.verificationStatus !== 'verified';
      setSuccess(
        needsKyc
          ? 'Account verified! Opening KYC onboarding to complete registration...'
          : 'Rider authenticated. Loading Delivery Console...'
      );
      setTimeout(() => {
        navigate('/delivery', { replace: true });
      }, 450);
    } catch (err) {
      console.error('Delivery login error:', err);
      setError(err.message || err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="delivery-login-page">
      <div className="delivery-login-wrapper">
        {!IS_RIDER_APP && (
          <Link to="/" className="delivery-back-link">
            <ChevronLeft size={16} /> Back to Storefront
          </Link>
        )}

        <div className="delivery-card">
          <div className="delivery-card-header">
            <div className="rider-badge-icon">
              <Bike size={30} color="#111827" />
            </div>
            <div className="delivery-brand-wrap">
              <img src="/logo.png" alt="Progicart" className="delivery-login-logo" />
              <div className="rider-hub-pill">
                <Zap size={12} />
                <span>RIDER FLEET PARTNER HUB</span>
              </div>
            </div>
            <h1 className="delivery-title">Delivery Partner Login</h1>
            <p className="delivery-subtitle">
              Log in with your email to accept nearest 10-minute delivery orders or complete your rider KYC.
            </p>
          </div>

          <DeliveryAuthTabs activeMode="login" />

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

          <form onSubmit={handleDeliverySubmit} className="delivery-login-form">
            <div className="delivery-input-group">
              <label>Partner Email</label>
              <div className="delivery-input-field">
                <Mail size={18} className="input-svg-icon" />
                <input
                  type="email"
                  placeholder="Enter rider email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <DeliveryPasswordField
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <button
              type="submit"
              className="delivery-login-btn"
              disabled={loading}
            >
              {loading ? (
                <span>Connecting to Rider Fleet...</span>
              ) : (
                <>
                  <span>Launch Rider Console</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="delivery-card-footer">
            <Link to="/delivery/register" className="rider-register-cta-link">
              <UserPlus size={16} />
              <span>New Delivery Partner? Self-Register Here</span>
            </Link>
            <p className="delivery-copyright">
              Progicart Instant Delivery Network • Rider Fleet App
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryLogin;
