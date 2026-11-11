import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell, { AuthField } from '../components/AuthShell';
import { UserPlus, User, Mail, Phone, Lock, ArrowRight } from 'lucide-react';
import '../styles/Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await register(
        formData.name,
        formData.email,
        formData.phone,
        formData.password,
        formData.confirmPassword
      );
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      wide
      badgeIcon={UserPlus}
      badgeLabel="NEW CUSTOMER ACCOUNT"
      title="Create your account"
      subtitle="Join Progicart for 10–15 min delivery and saved doorstep addresses."
      error={error}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="auth-switch-link">
            Sign in here
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <AuthField
          id="register-name"
          label="Full Name"
          icon={User}
          type="text"
          name="name"
          autoComplete="name"
          placeholder="e.g. Aarav Sharma"
          value={formData.name}
          onChange={handleChange}
        />

        <AuthField
          id="register-email"
          label="Email Address"
          icon={Mail}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
        />

        <AuthField
          id="register-phone"
          label="Mobile Number"
          icon={Phone}
          type="tel"
          inputMode="tel"
          name="phone"
          autoComplete="tel"
          placeholder="10-digit mobile number"
          value={formData.phone}
          onChange={handleChange}
        />

        <div className="auth-grid-2">
          <AuthField
            id="register-password"
            label="Password"
            icon={Lock}
            name="password"
            autoComplete="new-password"
            placeholder="Create password"
            value={formData.password}
            onChange={handleChange}
            isPassword
          />

          <AuthField
            id="register-confirm-password"
            label="Confirm Password"
            icon={Lock}
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={formData.confirmPassword}
            onChange={handleChange}
            isPassword
          />
        </div>

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          <span>{loading ? 'Creating account...' : 'Create Account'}</span>
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>
    </AuthShell>
  );
};

export default Register;
