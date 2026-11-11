import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell, { AuthField } from '../components/AuthShell';
import { ShoppingBag, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
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
      await login(email, password, 'customer');
      // Normal customer login strictly goes to storefront or checkout
      const next = from === '/admin' || from === '/delivery' ? '/' : from;
      navigate(next, { replace: true });
    } catch (err) {
      if (err.redirectTo) {
        setRedirectNotice({
          message: err.message,
          redirectTo: err.redirectTo,
          portalRequired: err.portalRequired,
        });
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badgeIcon={ShoppingBag}
      badgeLabel="CUSTOMER STOREFRONT"
      title="Welcome back"
      subtitle="Sign in to shop groceries, track orders & check out in minutes."
      error={error}
      footer={
        <>
          Don't have an account?{' '}
          <Link to="/register" className="auth-switch-link">
            Create an account
          </Link>
        </>
      }
    >
      {redirectNotice && (
        <div className="auth-notice-card">
          <div className="auth-notice-head">
            <AlertCircle size={16} />
            <span>Role Redirection</span>
          </div>
          <p className="auth-notice-msg">{redirectNotice.message}</p>
          <Link to={redirectNotice.redirectTo} className="auth-notice-cta">
            <span>
              Go to {redirectNotice.portalRequired === 'admin' ? 'Admin Hub' : 'Delivery Partner App'}
            </span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <AuthField
          id="login-email"
          label="Customer Email"
          icon={Mail}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <AuthField
          id="login-password"
          label="Password"
          icon={Lock}
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          isPassword
        />

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          <span>{loading ? 'Signing in...' : 'Sign In as Customer'}</span>
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>
    </AuthShell>
  );
};

export default Login;
