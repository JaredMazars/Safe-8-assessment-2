import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AdminLogin = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/api/admin/login', formData);

      if (response.data.success) {
        // Store session token
        localStorage.setItem('adminToken', response.data.sessionToken);
        
        // Store admin user data without password hash
        const { password_hash, ...safeAdminData } = response.data.admin;
        localStorage.setItem('adminUser', JSON.stringify(safeAdminData));
        
        console.log('✅ Admin logged in successfully');
        
        // Check if password change is required
        if (response.data.mustChangePassword) {
          console.log('🔒 Password change required for admin');
          navigate('/change-password', {
            state: { 
              message: 'You must change your temporary password before accessing the admin dashboard.',
              isAdmin: true
            }
          });
          return;
        }
        
        if (onLoginSuccess) {
          onLoginSuccess(safeAdminData);
        }
        
        navigate('/admin/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.status === 401) {
        setError('Invalid username or password');
      } else if (error.response?.status === 423) {
        setError('Account locked due to too many failed attempts');
      } else {
        setError(error.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="form-wrapper" style={{ maxWidth: '600px' }}>
        <div style={{ padding: '2.5rem 3rem 0 3rem' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <img 
              src="/ForvisMazars-Logo-Color-RGB.jpg" 
              alt="Forvis Mazars" 
              style={{ height: '65px', width: 'auto' }}
            />
          </div>
        </div>
        
        {/* Header */}
        <div className="form-header">
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <i className="fas fa-shield-alt" style={{ fontSize: '3.5rem', opacity: '0.9' }}></i>
          </div>
          <h1 className="main-title">Login to Your Account</h1>
          <p className="subtitle">Secure access for authorized personnel</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="assessment-form" style={{ padding: '2.5rem 3rem' }}>
          <div className="form-section" style={{ marginBottom: '2rem' }}>
            {error && (
              <div className="error-banner" style={{ marginBottom: '2rem' }}>
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label htmlFor="username" className="form-label" style={{ marginBottom: '0.75rem' }}>
                <i className="fas fa-user" style={{ marginRight: '0.5rem' }}></i>
                Email or Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your email or username"
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label htmlFor="password" className="form-label" style={{ marginBottom: 0 }}>
                  <i className="fas fa-lock" style={{ marginRight: '0.5rem' }}></i>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.875rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Forgot your password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-btn"
                >
                  <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ paddingTop: '2.5rem', marginTop: '2.5rem', borderTop: '2px solid var(--medium-gray)' }}>
            {/* Primary actions row */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => navigate('/register-account')}
                style={{
                  flex: 1,
                  padding: '0.85rem 1.25rem',
                  background: 'transparent',
                  border: '2px solid var(--fm-primary)',
                  borderRadius: '6px',
                  color: 'var(--fm-primary)',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--fm-primary)'; e.currentTarget.style.color = 'white'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fm-primary)'; }}
              >
                <i className="fas fa-user-plus"></i>
                Create Account
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-continue"
                style={{ flex: 1 }}
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Signing in...
                  </>
                ) : (
                  <>
                    <i className="fas fa-tachometer-alt"></i>
                    Access Dashboard
                  </>
                )}
              </button>
            </div>
            {/* Back link */}
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-light)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                <i className="fas fa-arrow-left"></i>
                Back to Home
              </button>
            </div>
          </div>
        </form>

        {/* Footer Note */}
        <div style={{
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--text-light)',
          padding: '1.5rem 3rem',
          borderTop: '1px solid var(--medium-gray)'
        }}>
          <i className="fas fa-shield-alt" style={{ marginRight: '0.5rem' }}></i>
          Authorized personnel only
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
