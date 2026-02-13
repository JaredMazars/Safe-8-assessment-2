import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { COMPANY_SIZES, COUNTRIES } from '../config/api';
import { COUNTRY_CODES, formatPhoneNumber, validatePhoneNumber, getCountryCode } from '../config/countryCodes';

const LeadForm = ({ assessmentType, industry, onSubmit }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    jobTitle: '',
    phone: '',
    companySize: '',
    country: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get country code based on selected country
  const countryCode = getCountryCode(formData.country);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If country changes, update phone number with new country code
    if (name === 'country') {
      const newCountryCode = getCountryCode(value);
      // Remove old country code from phone if exists
      let cleanPhone = formData.phone;
      if (formData.country) {
        const oldCode = getCountryCode(formData.country);
        cleanPhone = formData.phone.replace(oldCode, '').trim();
      }
      // Add new country code
      const newPhone = newCountryCode ? `${newCountryCode} ${cleanPhone}`.trim() : cleanPhone;
      setFormData(prev => ({
        ...prev,
        country: value,
        phone: newPhone
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Define maximum safe lengths
  const MAX_INPUT_LEN = 256;
  const MAX_EMAIL_LEN = 254;
  const MAX_PASSWORD_LEN = 128;

  const isTooLong = (s, max) => s.length > max;

  // Hardened regexes - ReDoS safe
  const safeEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Safe password validation without catastrophic backtracking
  const validatePassword = (password) => {
    if (password.length < 8 || password.length > 128) return false;
    
    let hasLower = false;
    let hasUpper = false;
    let hasDigit = false;
    
    for (let i = 0; i < password.length; i++) {
      const char = password[i];
      if (char >= 'a' && char <= 'z') hasLower = true;
      else if (char >= 'A' && char <= 'Z') hasUpper = true;
      else if (char >= '0' && char <= '9') hasDigit = true;
      
      // Early exit if all conditions met
      if (hasLower && hasUpper && hasDigit) return true;
    }
    
    return hasLower && hasUpper && hasDigit;
  };

  const validateForm = () => {
    const newErrors = {};

    // Common required fields
    const fields = [
      { key: 'firstName', label: 'First name', max: MAX_INPUT_LEN },
      { key: 'lastName', label: 'Last name', max: MAX_INPUT_LEN },
      { key: 'company', label: 'Company name', max: MAX_INPUT_LEN },
      { key: 'jobTitle', label: 'Job title', max: MAX_INPUT_LEN },
      { key: 'phone', label: 'Phone number', max: MAX_INPUT_LEN },
      { key: 'companySize', label: 'Company size', max: MAX_INPUT_LEN },
      { key: 'country', label: 'Country', max: MAX_INPUT_LEN },
    ];

    fields.forEach(({ key, label, max }) => {
      const value = (formData[key] || '').trim();
      if (!value) {
        newErrors[key] = `${label} is required`;
      } else if (isTooLong(value, max)) {
        newErrors[key] = `${label} is too long`;
      }
    });

    // Email validation
    const email = (formData.email || '').trim();
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (isTooLong(email, MAX_EMAIL_LEN)) {
      newErrors.email = 'Email is too long';
    } else if (!safeEmailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation with country code
    const phone = (formData.phone || '').trim();
    if (phone && formData.country) {
      const countryCode = COUNTRY_CODES[formData.country] || '';
      const phoneValidation = validatePhoneNumber(phone, countryCode);
      if (!phoneValidation.valid) {
        newErrors.phone = phoneValidation.message;
      }
    }

    // Password validation
    const password = formData.password || '';
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (isTooLong(password, MAX_PASSWORD_LEN)) {
      newErrors.password = 'Password is too long';
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 8 characters and contain uppercase, lowercase, and a number';
    }

    // Confirm password
    const confirmPassword = formData.confirmPassword || '';
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Get country code and format phone number
      const countryCode = COUNTRY_CODES[formData.country] || '';
      const formattedPhone = formData.phone ? formatPhoneNumber(formData.phone, countryCode) : '';
      
      // Prepare lead data for API
      const leadData = {
        contactName: `${formData.firstName} ${formData.lastName}`,
        jobTitle: formData.jobTitle,
        email: formData.email,
        phoneNumber: formattedPhone,
        companyName: formData.company,
        companySize: formData.companySize,
        country: formData.country,
        industry: industry,
        password: formData.password,
        leadSource: 'Web Assessment'
      };

      // Submit lead to backend
      const response = await api.post('/api/lead/create', leadData);
      
      if (response.data.success) {
        // Pass the lead info back to parent component
        const leadInfo = {
          leadId: response.data.leadId,
          contactName: leadData.contactName,
          email: formData.email,
          company: formData.company,
          assessmentType,
          industry
        };
        onSubmit(leadInfo);
        // Navigate to assessment
        navigate('/assessment');
      } else {
        throw new Error('Failed to create lead');
      }
    } catch (error) {
      console.error('Error submitting lead:', error);
      if (error.response?.status === 400) {
        setErrors({ submit: 'Email already registered. Please use a different email or try logging in.' });
      } else {
        setErrors({ submit: 'Failed to submit form. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="leadform-container">
      <div className="leadform-wrapper">
        {/* Header */}
        <div className="leadform-header">
          <h1 className="leadform-title">SAFE-8 AI Readiness Framework</h1>
          <p className="leadform-subtitle">Create Your Account</p>
        </div>

        {/* Assessment Details Banner */}
        <div className="assessment-info-banner">
          <h3 className="banner-title">Your Selected Assessment</h3>
          <div className="assessment-details">
            <div className="detail-item">
              <span className="detail-label">Assessment Type:</span>
              <div className="detail-value">{assessmentType}</div>
            </div>
            <div className="detail-item">
              <span className="detail-label">Industry:</span>
              <div className="detail-value">{industry}</div>
            </div>
          </div>
        </div>

        {/* Lead Form */}
        <form onSubmit={handleSubmit} className="leadform-content" id="lead-form">
          {/* Personal Information */}
          <div className="form-section-group">
            <h3 className="section-group-title">
              <i className="fas fa-user"></i>
              Personal Information
            </h3>
            <div className="form-section-content">
              <div className="form-row-two">
                {/* First Name */}
                <div className="form-field">
                  <label htmlFor="firstName" className="field-label">
                    First Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="field-input"
                    placeholder="Enter your first name"
                    required
                  />
                  {errors.firstName && (
                    <p className="field-error">{errors.firstName}</p>
                  )}
                </div>
                {/* Last Name */}
                <div className="form-field">
                  <label htmlFor="lastName" className="field-label">
                    Last Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="field-input"
                    placeholder="Enter your last name"
                    required
                  />
                  {errors.lastName && (
                    <p className="field-error">{errors.lastName}</p>
                  )}
                </div>
              </div>
              
              {/* Email Address */}
              <div className="form-field">
                <label htmlFor="email" className="field-label">
                  Email Address <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="field-input"
                  placeholder="Enter your email address"
                  required
                />
                {errors.email && (
                  <p className="field-error">{errors.email}</p>
                )}
              </div>
              {/* Country */}
              <div className="form-row-two">
                <div className="form-field">
                  <label htmlFor="country" className="field-label">
                    Country <span className="required">*</span>
                  </label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="field-input"
                    required
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  {errors.country && (
                    <p className="field-error">{errors.country}</p>
                  )}
                </div>
              {/* Phone Number */}
              <div className="form-field">
                <label htmlFor="phone" className="field-label">
                  Phone Number
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {COUNTRY_CODES[formData.country] && (
                    <input
                      type="text"
                      value={COUNTRY_CODES[formData.country]}
                      disabled
                      style={{ width: '80px', backgroundColor: '#f5f5f5', color: '#666' }}
                      className="field-input"
                    />
                  )}
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="field-input"
                    style={{ flex: 1 }}
                    placeholder={formData.country ? "Enter your phone number" : "Select country first"}
                    required
                  />
                </div>
                {errors.phone && (
                  <p className="field-error">{errors.phone}</p>
                )}
              </div>
              </div>
              
            </div>
          </div>

          {/* Company Information */}
          <div className="form-section-group">
            <h3 className="section-group-title">
              <i className="fas fa-building"></i>
              Company Information
            </h3>
            <div className="form-section-content">
              <div className="form-row-two">
                {/* Company Name */}
                <div className="form-field">
                  <label htmlFor="company" className="field-label">
                    Company Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="field-input"
                    placeholder="Enter your company name"
                    required
                  />
                  {errors.company && (
                    <p className="field-error">{errors.company}</p>
                  )}
                </div>
                
                {/* Job Title */}
                <div className="form-field">
                  <label htmlFor="jobTitle" className="field-label">
                    Job Title <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="jobTitle"
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    className="field-input"
                    placeholder="Enter your job title"
                    required
                  />
                  {errors.jobTitle && (
                    <p className="field-error">{errors.jobTitle}</p>
                  )}
                </div>
              </div>
              
              <div className="form-row-two">
                {/* Company Size */}
                <div className="form-field">
                  <label htmlFor="companySize" className="field-label">
                    Company Size <span className="required">*</span>
                  </label>
                  <select
                    id="companySize"
                    name="companySize"
                    value={formData.companySize}
                    onChange={handleChange}
                    className="field-input"
                    required
                  >
                    <option value="">Select company size</option>
                    {COMPANY_SIZES.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                  {errors.companySize && (
                    <p className="field-error">{errors.companySize}</p>
                  )}
                </div>
                
                
              </div>
            </div>
          </div>

          {/* Account Security */}
          <div className="form-section-group">
            <h3 className="section-group-title">
              <i className="fas fa-lock"></i>
              Account Security
            </h3>
            <div className="form-section-content">
              <div className="form-row-two">
                {/* Password */}
                <div className="form-field">
                  <label htmlFor="password" className="field-label">
                    Password <span className="required">*</span>
                  </label>
                  <div className="password-field">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="field-input"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="password-toggle-btn"
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {errors.password && (
                    <p className="field-error">{errors.password}</p>
                  )}
                  <p className="field-hint">
                    Min 8 chars with uppercase, lowercase, and number
                  </p>
                </div>
     
                {/* Confirm Password */}
                <div className="form-field">
                  <label htmlFor="confirmPassword" className="field-label">
                    Confirm Password <span className="required">*</span>
                  </label>
                  <div className="password-field">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="field-input"
                      placeholder="Confirm your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="password-toggle-btn"
                    >
                      <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="field-error">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {errors.submit && (
            <div className="submit-error">
              <i className="fas fa-exclamation-circle"></i>
              {errors.submit}
            </div>
          )}
        </form>

        {/* Form Actions */}
        <div className="leadform-actions">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-back"
          >
            <i className="fas fa-arrow-left"></i>
            Back
          </button>
          <button
            type="submit"
            form="lead-form"
            disabled={isSubmitting}
            className="btn-continue"
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Creating Account...
              </>
            ) : (
              <>
                Continue to Assessment
                <i className="fas fa-arrow-right"></i>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadForm;
