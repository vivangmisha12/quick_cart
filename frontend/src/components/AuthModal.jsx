import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  KeyRound, 
  User as UserIcon, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Zap, 
  AlertCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/AuthModal.css';

export default function AuthModal() {
  const { isAuthModalOpen, authModalConfig, closeAuthModal, login, register } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isAuthModalOpen) {
      setError('');
      setSubmitting(false);
      if (authModalConfig?.initialMode === 'register') {
        setMode('register');
      } else {
        setMode('login');
      }
    } else {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setName('');
      setPhone('');
      setError('');
    }
  }, [isAuthModalOpen, authModalConfig]);

  // Handle escape key
  useEffect(() => {
    if (!isAuthModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      let resultUser = null;
      if (mode === 'login') {
        if (!email.trim() || !password) {
          setError('Please provide email and password');
          setSubmitting(false);
          return;
        }
        const res = await login(email.trim(), password);
        resultUser = res.user;
      } else {
        if (!name.trim() || !email.trim() || !phone.trim() || !password) {
          setError('All fields are required');
          setSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setSubmitting(false);
          return;
        }
        if (phone.trim().replace(/\D/g, '').length < 10) {
          setError('Please enter a valid 10-digit mobile number');
          setSubmitting(false);
          return;
        }
        const res = await register(
          name.trim(),
          email.trim(),
          phone.trim(),
          password,
          confirmPassword
        );
        resultUser = res.user;
      }

      closeAuthModal();
      if (typeof authModalConfig?.onSuccess === 'function') {
        try {
          authModalConfig.onSuccess(resultUser);
        } catch (callbackErr) {
          console.warn('onSuccess callback warning:', callbackErr);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Authentication failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    authModalConfig?.title ||
    (mode === 'login' ? 'Welcome to Progicart' : 'Create an Account');
  const subtitle =
    authModalConfig?.subtitle ||
    (mode === 'login'
      ? 'Sign in to access your cart, addresses & lightning 10-min delivery.'
      : 'Sign up in seconds to start ordering freshest groceries.');

  return (
    <div
      className="auth-modal-overlay"
      onClick={closeAuthModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div 
        className="auth-modal-card" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button with generous tap target */}
        <button
          type="button"
          className="auth-modal-close-btn"
          onClick={closeAuthModal}
          aria-label="Close dialog"
        >
          <X size={20} strokeWidth={2.4} />
        </button>

        {/* Brand Banner */}
        <div className="auth-modal-header">
          <div className="auth-brand-pill">
            <Zap size={13} fill="#f8cb46" color="#f8cb46" />
            <span>INSTANT 10 MINS DELIVERY</span>
          </div>

          <h2 id="auth-modal-title" className="auth-modal-title">{title}</h2>
          <p className="auth-modal-subtitle">{subtitle}</p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="auth-tabs-row" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab-pill ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth-tab-pill ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            New User? Register
          </button>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="auth-modal-err-box" role="alert">
            <AlertCircle size={16} strokeWidth={2.2} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="auth-modal-form" noValidate>
          {mode === 'register' && (
            <>
              <div className="auth-input-field">
                <label htmlFor="auth-name-input">Full Name</label>
                <div className="auth-input-wrapper">
                  <UserIcon size={18} className="auth-field-icon" />
                  <input
                    id="auth-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

              <div className="auth-input-field">
                <label htmlFor="auth-phone-input">Mobile Number</label>
                <div className="auth-input-wrapper">
                  <Phone size={18} className="auth-field-icon" />
                  <span className="auth-phone-prefix">+91</span>
                  <input
                    id="auth-phone-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit number"
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="auth-input-field">
            <label htmlFor="auth-email-input">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-field-icon" />
              <input
                id="auth-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="auth-input-field">
            <label htmlFor="auth-password-input">Password</label>
            <div className="auth-input-wrapper">
              <KeyRound size={18} className="auth-field-icon" />
              <input
                id="auth-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'login' ? '••••••••' : 'At least 6 characters'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              <button
                type="button"
                className="auth-password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div className="auth-input-field">
              <label htmlFor="auth-confirm-password-input">Confirm Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-field-icon" />
                <input
                  id="auth-confirm-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="auth-modal-submit-btn"
            disabled={submitting}
          >
            {submitting ? (
              <span className="auth-btn-loader">Processing…</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In & Continue' : 'Create Account & Continue'}</span>
                <ArrowRight size={17} strokeWidth={2.2} />
              </>
            )}
          </button>
        </form>

        {/* Security Footer Note */}
        <div className="auth-modal-footer">
          <div className="auth-secure-note">
            <Lock size={13} color="#168A32" />
            <span>256-bit AES encrypted secure checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
}

