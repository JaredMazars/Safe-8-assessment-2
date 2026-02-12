import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenEmail, setTokenEmail] = useState('');
  const navigate = useNavigate();

  const token = searchParams.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Invalid reset link. Please request a new password reset.');
        setIsValidating(false);
        return;
      }

      try {
        const response = await api.post('/api/lead/verify-reset-token', { token });
        
        if (response.data.success) {
          setTokenValid(true);
          setTokenEmail(response.data.email);
        } else {
          setError(response.data.message || 'Invalid or expired reset token');
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setError('Invalid or expired reset token. Please request a new password reset.');
      } finally {
        setIsValidating(false);
      }
    };

    verifyToken();
  }, [token]);

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validate password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/api/lead/reset-password', {
        token,
        newPassword
      });

      if (response.data.success) {
        setMessage('Password has been reset successfully!');
        setNewPassword('');
        setConfirmPassword('');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/', { state: { message: 'Password reset successful! You can now log in with your new password.' } });
        }, 3000);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError(error.response?.data?.message || 'Failed to reset password. Please try again or request a new reset link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return null;
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { label: 'Weak', color: '#E31B23', width: '33%' };
    if (strength <= 3) return { label: 'Medium', color: '#F7941D', width: '66%' };
    return { label: 'Strong', color: '#00A651', width: '100%' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (isValidating) {
    return (
      <div className="page-container">
        <div className="form-wrapper" style={{ maxWidth: '500px', textAlign: 'center' }}>
          <div style={{ padding: '3rem 2rem' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '3rem', color: 'var(--secondary-blue)', marginBottom: '1rem' }}></i>
            <p style={{ color: 'var(--text-medium)', fontSize: '1rem' }}>Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid && !isValidating) {
    return (
      <div className="page-container">
        <div className="form-wrapper" style={{ maxWidth: '500px' }}>
          <div style={{ padding: '2rem 2rem 0 2rem' }}>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <img 
                src="/ForvisMazars-Logo-Color-RGB.jpg" 
                alt="Forvis Mazars" 
                style={{ height: '60px', width: 'auto' }}
              />
            </div>
          </div>
          
          {/* Error State */}
          <div className="form-header" style={{ textAlign: 'center' }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: 'var(--error-red)', marginBottom: '1rem' }}></i>
            <h1 className="main-title">Invalid Reset Link</h1>
            <p className="subtitle">{error}</p>
          </div>

          <div className="assessment-form">
            <div className="form-actions">
              <button
                onClick={() => navigate('/')}
                className="btn-back"
              >
                <i className="fas fa-arrow-left"></i>
                Back to Home
              </button>
              <button
                onClick={() => navigate('/forgot-password')}
                className="btn-continue"
              >
                <i className="fas fa-redo"></i>
                Request New Link
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="form-wrapper" style={{ maxWidth: '500px' }}>
        <div style={{ padding: '2rem 2rem 0 2rem' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img 
              src="/ForvisMazars-Logo-Color-RGB.jpg" 
              alt="Forvis Mazars" 
              style={{ height: '60px', width: 'auto' }}
            />
          </div>
        </div>
        
        {/* Header */}
        <div className="form-header">
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <i className="fas fa-lock" style={{ fontSize: '3rem', opacity: '0.9', color: 'var(--secondary-blue)' }}></i>
          </div>
          <h1 className="main-title">Reset Your Password</h1>
          <p className="subtitle">
            Create a new password for <strong>{tokenEmail}</strong>
          </p>
        </div>

        {/* Reset Password Form */}
        <form onSubmit={handleSubmit} className="assessment-form">
          <div className="form-section">
            {error && (
              <div className="error-banner">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="success-banner">
                <i className="fas fa-check-circle"></i>
                <div>
                  <div className="success-title">
                    Success!
                  </div>
                  <div className="success-message">
                    {message}
                  </div>
                  <div className="success-message" style={{ marginTop: '0.5rem' }}>
                    Redirecting to login...
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">
                <i className="fas fa-key"></i> New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError('');
                  }}
                  className="form-input"
                  placeholder="Enter new password"
                  required
                  autoFocus
                  disabled={isSubmitting || !!message}
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="password-toggle"
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-medium)',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    fontSize: '1rem'
                  }}
                >
                  <i className={`fas fa-eye${showNewPassword ? '-slash' : ''}`}></i>
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {passwordStrength && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.25rem'
                  }}>
                    <small style={{ fontSize: '0.8125rem', color: 'var(--text-light)' }}>
                      Password strength:
                    </small>
                    <small style={{ fontSize: '0.8125rem', color: passwordStrength.color, fontWeight: '600' }}>
                      {passwordStrength.label}
                    </small>
                  </div>
                  <div style={{
                    height: '4px',
                    background: 'var(--light-gray)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: passwordStrength.width,
                      background: passwordStrength.color,
                      transition: 'width 0.3s, background 0.3s'
                    }}></div>
                  </div>
                </div>
              )}
              
              <small style={{ 
                display: 'block', 
                marginTop: '0.5rem', 
                color: 'var(--text-light)', 
                fontSize: '0.8125rem' 
              }}>
                Minimum 8 characters. Use a mix of letters, numbers, and symbols for better security.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                <i className="fas fa-check-double"></i> Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  className="form-input"
                  placeholder="Confirm new password"
                  required
                  disabled={isSubmitting || !!message}
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-toggle"
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-medium)',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    fontSize: '1rem'
                  }}
                >
                  <i className={`fas fa-eye${showConfirmPassword ? '-slash' : ''}`}></i>
                </button>
              </div>
              
              {confirmPassword && confirmPassword === newPassword && (
                <small className="password-match-indicator">
                  <i className="fas fa-check-circle"></i>
                  Passwords match
                </small>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-back"
              disabled={isSubmitting || !!message}
            >
              <i className="fas fa-arrow-left"></i>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!message}
              className="btn-continue"
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Resetting...
                </>
              ) : message ? (
                <>
                  <i className="fas fa-check"></i>
                  Password Reset
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Reset Password
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security Note */}
        <div style={{
          textAlign: 'center',
          fontSize: '0.8125rem',
          color: 'var(--text-light)',
          padding: '1rem',
          marginTop: '1rem',
          borderTop: '1px solid var(--medium-gray)'
        }}>
          <i className="fas fa-shield-alt"></i> Your password will be encrypted and stored securely
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
