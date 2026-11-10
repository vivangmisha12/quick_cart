import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, ShieldCheck, Bike, AlertCircle, ArrowRight } from 'lucide-react';
import '../styles/Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [redirectNotice, setRedirectNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRedirectNotice(null);
    setLoading(true);

    try {
      const response = await login(email, password, 'customer');
      // Normal customer login strictly goes to storefront or checkout
      const next = (from === '/admin' || from === '/delivery') ? '/' : from;
      navigate(next, { replace: true });
    } catch (err) {
      if (err.redirectTo) {
        setRedirectNotice({
          message: err.message,
          redirectTo: err.redirectTo,
          portalRequired: err.portalRequired
        });
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <Link to="/">
            <img src="/logo.png" alt="Progicart" style={{ height: '46px', width: 'auto', objectFit: 'contain' }} />
          </Link>
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e8f5e9', color: '#0c831f', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>
            <ShoppingBag size={14} />
            CUSTOMER STOREFRONT
          </div>
          <h1 style={{ margin: '4px 0 6px 0', fontSize: '22px' }}>Customer Login</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Login to shop groceries, track orders & checkout in 10 mins.</p>
        </div>

        {redirectNotice && (
          <div style={{ background: '#fff8e1', border: '1px solid #ffe082', color: '#795548', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', lineHeight: '1.5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#e65100', marginBottom: '6px' }}>
              <AlertCircle size={18} />
              <span>Role Redirection</span>
            </div>
            <p style={{ margin: '0 0 10px 0' }}>{redirectNotice.message}</p>
            <Link 
              to={redirectNotice.redirectTo}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: redirectNotice.portalRequired === 'admin' ? '#0c831f' : '#f8cb46', color: redirectNotice.portalRequired === 'admin' ? '#fff' : '#1c1c1c', padding: '8px 14px', borderRadius: '6px', fontWeight: '700', textDecoration: 'none', fontSize: '13px' }}
            >
              Go to {redirectNotice.portalRequired === 'admin' ? 'Admin Hub' : 'Delivery Partner App'} <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Customer Email</label>
            <input
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login as Customer'}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;