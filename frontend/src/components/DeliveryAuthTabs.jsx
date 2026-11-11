import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';

export const DeliveryAuthTabs = ({ activeMode = 'login' }) => (
  <div className="rider-auth-mode-tabs" role="navigation" aria-label="Rider portal authentication">
    <Link
      to="/delivery/login"
      className={`rider-auth-tab${activeMode === 'login' ? ' active' : ''}`}
    >
      <LogIn size={14} />
      <span>Rider Login</span>
    </Link>
    <Link
      to="/delivery/register"
      className={`rider-auth-tab${activeMode === 'register' ? ' active' : ''}`}
    >
      <UserPlus size={14} />
      <span>New Partner Register</span>
    </Link>
  </div>
);

export const DeliveryPasswordField = ({
  label,
  placeholder,
  value,
  onChange,
  autoComplete,
  required = true,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="delivery-input-group">
      <label>{label}</label>
      <div className="delivery-input-field">
        <Lock size={17} className="input-svg-icon" />
        <input
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
        />
        <button
          type="button"
          className="delivery-pw-toggle"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
};

