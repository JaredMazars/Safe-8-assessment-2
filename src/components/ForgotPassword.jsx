import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');

    const emailRegex = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,}$/;

    if (!email.trim()) {
      setError('Please enter your email address');
      setIsSubmitting(false);
      return;
    }

    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await api.post('/api/lead/forgot-password', { email });

      if (response.data.success) {
        setMessage('Password reset instructions have been sent to your email. Please check your inbox.');
        setEmail('');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      // For security, show success message even on error
      setMessage('If an account exists with this email, a password reset link has been sent.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <i className="fas fa-key" style={{ fontSize: '3rem', opacity: '0.9', color: 'var(--secondary-blue)' }}></i>
          </div>
          <h1 className="main-title">Forgot Password?</h1>
          <p className="subtitle">Enter your email address and we'll send you instructions to reset your password.</p>
        </div>

        {/* Forgot Password Form */}
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
                    Email Sent
                  </div>
                  <div className="success-message">
                    {message}
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <i className="fas fa-envelope"></i> Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className="form-input"
                placeholder="Enter your email address"
                required
                autoFocus
                disabled={isSubmitting || !!message}
              />
              <small style={{ 
                display: 'block', 
                marginTop: '0.5rem', 
                color: 'var(--text-light)', 
                fontSize: '0.8125rem' 
              }}>
                We'll send password reset instructions to this email
              </small>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              <i className="fas fa-arrow-left"></i>
              Back to Home
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!message}
              className="btn-primary"
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Sending...
                </>
              ) : message ? (
                <>
                  <i className="fas fa-check"></i>
                  Email Sent
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Send Reset Link
                </>
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'var(--light-gray)',
          borderRadius: '8px',
          borderLeft: '4px solid var(--secondary-blue)'
        }}>
          <h3 style={{ 
            fontSize: '0.9375rem', 
            fontWeight: '600', 
            marginBottom: '0.5rem',
            color: 'var(--text-dark)'
          }}>
            <i className="fas fa-info-circle"></i> Need Help?
          </h3>
          <p style={{ 
            fontSize: '0.875rem', 
            color: 'var(--text-medium)', 
            margin: '0 0 0.75rem 0',
            lineHeight: '1.5'
          }}>
            If you don't receive the email within a few minutes:
          </p>
          <ul style={{ 
            margin: '0', 
            paddingLeft: '1.5rem',
            fontSize: '0.8125rem',
            color: 'var(--text-medium)',
            lineHeight: '1.6'
          }}>
            <li>Check your spam or junk folder</li>
            <li>Verify you entered the correct email address</li>
            <li>Contact support at <a href="mailto:ai.advisory@forvismazars.com" style={{ color: 'var(--secondary-blue)', textDecoration: 'none', fontWeight: '600' }}>ai.advisory@forvismazars.com</a></li>
          </ul>
        </div>

        {/* Security Note */}
        <div style={{
          textAlign: 'center',
          fontSize: '0.8125rem',
          color: 'var(--text-light)',
          padding: '1rem',
          marginTop: '1rem',
          borderTop: '1px solid var(--medium-gray)'
        }}>
          <i className="fas fa-shield-alt"></i> Password reset links expire after 1 hour for security
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
