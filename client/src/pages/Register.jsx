import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, Eye, EyeOff, Coffee, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const { register, isLoading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Create Account — Dood Cafe';
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  const validateField = (name, value) => {
    let err = '';
    if (name === 'name') {
      if (!value.trim()) {
        err = 'Full Name is required';
      } else if (value.trim().length > 50) {
        err = 'Name cannot exceed 50 characters';
      } else if (!/^[a-zA-Z\s.'-]+$/.test(value)) {
        err = 'Name can only contain letters, spaces, hyphens, and apostrophes';
      }
    } else if (name === 'email') {
      if (!value.trim()) {
        err = 'Email is required';
      } else if (value.trim().length > 100) {
        err = 'Email cannot exceed 100 characters';
      } else if (!/^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/.test(value.trim())) {
        err = 'Please enter a valid email address (e.g. you@example.com)';
      }
    } else if (name === 'phone') {
      if (value.trim()) {
        if (value.trim().length > 15) {
          err = 'Phone number cannot exceed 15 characters';
        } else if (!/^\+?[0-9]{10,14}$/.test(value.trim())) {
          err = 'Phone numbers must contain numbers and optional plus prefix only (10-14 digits)';
        }
      }
    } else if (name === 'password') {
      if (!value) {
        err = 'Password is required';
      } else if (value.length < 8) {
        err = 'Password must be at least 8 characters';
      } else if (value.length > 128) {
        err = 'Password cannot exceed 128 characters';
      } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        err = 'Password must contain uppercase, lowercase, and numeric characters';
      }
    }
    return err;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    const fieldError = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameErr = validateField('name', form.name);
    const emailErr = validateField('email', form.email);
    const phoneErr = validateField('phone', form.phone);
    const passwordErr = validateField('password', form.password);

    const newErrors = {
      ...(nameErr && { name: nameErr }),
      ...(emailErr && { email: emailErr }),
      ...(phoneErr && { phone: phoneErr }),
      ...(passwordErr && { password: passwordErr }),
    };

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please resolve the form validation errors before proceeding.');
      return;
    }

    try {
      await register(form.name.trim(), form.email.trim(), form.password, form.phone.trim() || undefined);
      toast.success('Account created! Welcome to Dood Cafe ☕');
      navigate('/');
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed.';
      toast.error(serverMsg);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo"><Coffee size={28} /></div>
          <h1 className="auth-title">Join Dood Cafe</h1>
          <p className="auth-sub">Create your account to start ordering</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" id="register-form" noValidate>
          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">
              <User size={14} /> Full Name <span style={{ color: 'var(--color-primary, #e67e22)' }}>*</span>
            </label>
            <input
              id="reg-name"
              name="name"
              type="text"
              className={`form-input ${errors.name ? 'form-input-error' : ''}`}
              placeholder="John Doe"
              value={form.name}
              onChange={handleChange}
              required
              maxLength={50}
              pattern="^[a-zA-Z\s.'-]+$"
              title="Letters, spaces, hyphens, and apostrophes only (max 50 chars)"
              autoComplete="name"
            />
            {errors.name && (
              <span className="form-field-error" style={{ color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <AlertCircle size={13} /> {errors.name}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">
              <Mail size={14} /> Email Address <span style={{ color: 'var(--color-primary, #e67e22)' }}>*</span>
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              className={`form-input ${errors.email ? 'form-input-error' : ''}`}
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
              maxLength={100}
              pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
              title="Please enter a valid email address"
              autoComplete="email"
            />
            {errors.email && (
              <span className="form-field-error" style={{ color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <AlertCircle size={13} /> {errors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="reg-phone" className="form-label">
              <Phone size={14} /> Mobile Number <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>(optional)</span>
            </label>
            <input
              id="reg-phone"
              name="phone"
              type="tel"
              className={`form-input ${errors.phone ? 'form-input-error' : ''}`}
              placeholder="+91 9876543210"
              value={form.phone}
              onChange={handleChange}
              maxLength={15}
              pattern="^\+?[0-9]{10,14}$"
              title="Phone numbers must contain numbers and optional plus prefix only (10-14 digits)"
              autoComplete="tel"
            />
            {errors.phone && (
              <span className="form-field-error" style={{ color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <AlertCircle size={13} /> {errors.phone}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">
              <Lock size={14} /> Password <span style={{ color: 'var(--color-primary, #e67e22)' }}>*</span>
            </label>
            <div className="password-wrapper">
              <input
                id="reg-password"
                name="password"
                type={showPass ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'form-input-error' : ''}`}
                placeholder="Min. 8 chars (uppercase + number)"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPass(!showPass)}
                aria-label="Toggle password"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <span className="form-field-error" style={{ color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <AlertCircle size={13} /> {errors.password}
              </span>
            )}
          </div>

          <button
            type="submit"
            id="register-submit-btn"
            className="btn btn-primary btn-full"
            disabled={isLoading}
          >
            {isLoading ? <span className="loading-spinner" /> : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
