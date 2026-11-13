import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, ShieldCheck, Truck, MapPin, ArrowLeft } from 'lucide-react';

const AUTH_PERKS = [
  { icon: Truck, label: '10–15 min delivery' },
  { icon: MapPin, label: 'Saved addresses' },
  { icon: ShieldCheck, label: 'Verified checkout' },
];

export const AuthField = ({
  id,
  label,
  icon: Icon,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
  inputMode,
  isPassword = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">
        {label}
      </label>
      <div className="auth-input-wrap">
        {Icon && <Icon size={16} className="auth-input-icon" aria-hidden="true" />}
        <input
          id={id}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          required={required}
          className={`auth-input${Icon ? ' has-icon' : ''}${isPassword ? ' has-toggle' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            className="auth-pw-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
};

const AuthShell = ({
  badgeIcon: BadgeIcon,
  badgeLabel,
  title,
  subtitle,
  wide = false,
  error = '',
  children,
  footer,
}) => {
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className={`auth-card${wide ? ' auth-card--wide' : ''}`}>
        <div className="auth-card-top-nav">
          <button
            type="button"
            className="auth-back-nav-btn"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        </div>
        <div className="auth-header">
          <Link to="/" className="auth-brand-link" aria-label="Go to Progicart home">
            <img src="/logo.png" alt="Progicart" className="auth-logo" />
          </Link>

          {badgeLabel && (
            <div className="auth-pill-badge">
              {BadgeIcon && <BadgeIcon size={13} />}
              <span>{badgeLabel}</span>
            </div>
          )}

          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        </div>

        {error && (
          <div className="auth-alert auth-alert--error" role="alert">
            <AlertCircle size={16} className="auth-alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {children}

        {footer && <div className="auth-footer">{footer}</div>}

        <div className="auth-perks" aria-label="Account benefits">
          {AUTH_PERKS.map((perk) => {
            const PerkIcon = perk.icon;
            return (
              <span key={perk.label} className="auth-perk-chip">
                <PerkIcon size={12} />
                <span>{perk.label}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AuthShell;

