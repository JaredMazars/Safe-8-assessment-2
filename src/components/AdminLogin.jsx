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
          <h1 className="main-title">Admin Portal</h1>
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
                Username or Email
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your username"
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label" style={{ marginBottom: '0.75rem' }}>
                <i className="fas fa-lock" style={{ marginRight: '0.5rem' }}></i>
                Password
              </label>
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
          <div className="form-actions" style={{ paddingTop: '2.5rem', marginTop: '2.5rem' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-back"
            >
              <i className="fas fa-arrow-left"></i>
              Back to Home
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-continue"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Signing in...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i>
                  Sign In
                </>
              )}
            </button>
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
