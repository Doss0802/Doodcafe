import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, Eye, EyeOff, Coffee } from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [showPass, setShowPass] = useState(false);
  const { register, isLoading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Create Account — Dood Cafe';
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(form.name, form.email, form.password, form.phone);
      toast.success('Account created! Welcome to Dood Cafe ☕');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed.');
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

        <form onSubmit={handleSubmit} className="auth-form" id="register-form">
          <div className="form-group">
            <label htmlFor="reg-name" className="form-label"><User size={14} /> Full Name</label>
            <input
              id="reg-name" name="name" type="text" className="form-input"
              placeholder="John Doe" value={form.name} onChange={handleChange} required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email" className="form-label"><Mail size={14} /> Email Address</label>
            <input
              id="reg-email" name="email" type="email" className="form-input"
              placeholder="you@example.com" value={form.email} onChange={handleChange} required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-phone" className="form-label"><Phone size={14} /> Mobile Number (optional)</label>
            <input
              id="reg-phone" name="phone" type="tel" className="form-input"
              placeholder="98765 43210" value={form.phone} onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password" className="form-label"><Lock size={14} /> Password</label>
            <div className="password-wrapper">
              <input
                id="reg-password" name="password" type={showPass ? 'text' : 'password'}
                className="form-input" placeholder="Min. 8 chars, uppercase + number"
                value={form.password} onChange={handleChange} required minLength={8}
              />
              <button type="button" className="password-toggle" onClick={() => setShowPass(!showPass)} aria-label="Toggle password">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" id="register-submit-btn" className="btn btn-primary btn-full" disabled={isLoading}>
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
