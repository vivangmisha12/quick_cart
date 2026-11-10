import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Store,
  ChevronLeft
} from 'lucide-react';
import { authAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import '../styles/AdminLogin.css';


const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Please provide admin credentials.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email.trim(), password, 'admin');
      if (!res?.user?.isAdmin) {
        setError('Access Denied: This portal is strictly for authorized Progicart Administrators.');
        setLoading(false);
        return;
      }

      setSuccess('Admin verified. Redirecting to Command Center...');
      setTimeout(() => {
        navigate('/admin');
      }, 500);
    } catch (err) {
      console.error('Admin login error:', err);
      setError(err.message || err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      {/* Background ambient accents */}
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>

      <div className="admin-login-wrapper">
        <Link to="/" className="back-storefront-link">
          <ChevronLeft size={16} /> Back to Customer Storefront
        </Link>

        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-brand-icon">
              <ShieldCheck size={32} className="shield-svg" />
            </div>
            <div className="admin-brand-text">
              <div className="admin-login-logo-wrap">
                <img src="/logo.png" alt="Progicart" className="admin-login-logo-img" />
              </div>
              <span className="admin-hub-badge">Operations & Admin Hub</span>
            </div>
            <p className="admin-header-subtitle">
              Secure administrative access for store operations, inventory, and order dispatch.
            </p>
          </div>

          {error && (
            <div className="admin-alert-banner error">
              <AlertCircle size={16} className="alert-icon" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="admin-alert-banner success">
              <CheckCircle2 size={16} className="alert-icon" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleAdminSubmit} className="admin-login-form">
            <div className="admin-input-group">
              <label>Administrator Email</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  placeholder="Enter administrator email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="admin-input-group">
              <label>Security Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
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
              className="admin-login-submit-btn" 
              disabled={loading}
            >
              {loading ? (
                <span>Authenticating Administrator...</span>
              ) : (
                <>
                  <span>Access Admin Command Center</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="admin-card-footer">
            <div className="footer-links-row">
              <Link to="/delivery/login" className="footer-partner-link">
                <Store size={14} /> Delivery Partner Portal
              </Link>
              <span className="dot-sep">•</span>
              <Link to="/login" className="footer-partner-link">
                Customer Login
              </Link>
            </div>
            <p className="admin-security-note">
              🔒 256-bit AES Encrypted Session • Internal Progicart Systems Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

