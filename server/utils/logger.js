/**
 * Basic Logger Utility
 * Placeholder for full Winston implementation (SEC-008)
 * 
 * Provides:
 * - Structured logging
 * - Sensitive data redaction
 * - Log levels (info, warn, error, debug)
 * 
 * TODO: Implement full Winston logger with:
 * - File transports (error.log, combined.log)
 * - Log rotation
 * - Remote logging (e.g., Splunk, CloudWatch)
 */

/**
 * Sensitive fields to redact from logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'sessionToken',
  'session_token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'csrf',
  'creditCard',
  'ssn'
];

/**
 * Redact sensitive data from objects
 */
const redact = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redact(item));
  }

  const cleaned = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field.toLowerCase())
    );
    
    if (isSensitive) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = redact(value);
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
};

/**
 * Format log message
 */
const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const redactedMeta = redact(meta);
  
  return {
    timestamp,
    level,
    message,
    ...redactedMeta
  };
};

/**
 * Basic logger implementation
 */
const logger = {
  info: (message, meta = {}) => {
    console.log('ℹ️', JSON.stringify(formatLog('info', message, meta)));
  },
  
  warn: (message, meta = {}) => {
    console.warn('⚠️', JSON.stringify(formatLog('warn', message, meta)));
  },
  
  error: (message, meta = {}) => {
    console.error('❌', JSON.stringify(formatLog('error', message, meta)));
  },
  
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      console.debug('🔍', JSON.stringify(formatLog('debug', message, meta)));
    }
  }
};

export default logger;
export { redact };

/**
 * Sanitize a user-controlled value before including it in a log message.
 * Strips newline/carriage-return/tab characters to prevent log-injection attacks (CWE-117).
 * Truncates to 200 characters to avoid log flooding.
 *
 * @param {*} val - The value to sanitize (will be coerced to string)
 * @returns {string} Safe string suitable for logging
 */
export const sanitizeLog = (val) =>
  String(val ?? '').replace(/[\r\n\t]/g, ' ').substring(0, 200);
