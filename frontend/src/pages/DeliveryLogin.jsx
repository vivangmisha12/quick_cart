import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Bike, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ChevronLeft,
  Zap,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/DeliveryLogin.css';

const DeliveryLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();

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
        setError('Access Denied: This portal is strictly for registered Progicart Delivery Fleet Partners.');
        setLoading(false);
        return;
      }

      setSuccess('Rider authenticated. Loading Delivery Console...');
      setTimeout(() => {
        navigate('/delivery');
      }, 500);
    } catch (err) {
      console.error('Delivery login error:', err);
      setError(err.message || err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="delivery-login-page">
      <div className="delivery-login-ambient-1"></div>
      <div className="delivery-login-ambient-2"></div>

      <div className="delivery-login-wrapper">
        <Link to="/" className="delivery-back-link">
          <ChevronLeft size={16} /> Back to Storefront
        </Link>

        <div className="delivery-card">
          <div className="delivery-card-header">
            <div className="rider-badge-icon">
              <Bike size={32} color="#1c1c1c" />
            </div>
            <div className="delivery-brand-wrap">
              <img src="/logo.png" alt="Progicart" className="delivery-login-logo" />
              <div className="rider-hub-pill">
                <Zap size={12} fill="#0c831f" color="#0c831f" />
                <span>RIDER FLEET PARTNER HUB</span>
              </div>
            </div>
            <h1 className="delivery-title">Delivery Partner Login</h1>
            <p className="delivery-subtitle">
              Instant 10-minute order dispatch & delivery routing console for Progicart riders.
            </p>
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

          <form onSubmit={handleDeliverySubmit} className="delivery-login-form">
            <div className="delivery-input-group">
              <label>Partner Email / Rider ID</label>
              <div className="delivery-input-field">
                <Mail size={18} className="input-svg-icon" />
                <input
                  type="email"
                  placeholder="Enter rider email or ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="delivery-input-group">
              <label>Security PIN / Password</label>
              <div className="delivery-input-field">
                <Lock size={18} className="input-svg-icon" />
                <input
                  type="password"
                  placeholder="Enter security password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

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
            <p className="delivery-copyright">
              ⚡ Progicart Instant Delivery Network • Lucknow & National Hubs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryLogin;

