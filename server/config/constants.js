/**
 * Application-wide constants
 * Centralized configuration values for better maintainability
 */

// Assessment Score Thresholds
export const SCORE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 60,
  LOW: 40
};

// Assessment Risk Levels
export const RISK_LEVELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical'
};

// Security Configuration
export const SECURITY = {
  BCRYPT_ROUNDS: 12,
  PASSWORD_MIN_LENGTH: 8,
  CSRF_SECRET_MIN_LENGTH: 32,
  SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours
  MAX_LOGIN_ATTEMPTS: 5
};

// Rate Limiting
export const RATE_LIMITS = {
  API: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_ATTEMPTS: 5
  },
  PASSWORD_RESET: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_ATTEMPTS: 3
  }
};

// Email Configuration
export const EMAIL = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
  TIMEOUT_MS: 10000
};

// Database Configuration
export const DATABASE = {
  CONNECTION_TIMEOUT_MS: 30000,
  REQUEST_TIMEOUT_MS: 15000,
  POOL_MIN: 0,
  POOL_MAX: 10,
  POOL_IDLE_TIMEOUT_MS: 30000
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};

// File Upload Limits
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/jpeg', 'image/png']
};

// Response Messages
export const MESSAGES = {
  SUCCESS: {
    LEAD_CREATED: 'Lead created successfully',
    ASSESSMENT_SUBMITTED: 'Assessment submitted successfully',
    PASSWORD_RESET_SENT: 'Password reset email sent',
    LOGIN_SUCCESS: 'Login successful'
  },
  ERROR: {
    INVALID_CREDENTIALS: 'Invalid credentials',
    MISSING_REQUIRED_FIELDS: 'Missing required fields',
    UNAUTHORIZED: 'Unauthorized access',
    NOT_FOUND: 'Resource not found',
    SERVER_ERROR: 'Internal server error',
    RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later'
  }
};

// HTTP Status Codes (for reference and consistency)
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};

export default {
  SCORE_THRESHOLDS,
  RISK_LEVELS,
  SECURITY,
  RATE_LIMITS,
  EMAIL,
  DATABASE,
  PAGINATION,
  FILE_UPLOAD,
  MESSAGES,
  HTTP_STATUS
};
