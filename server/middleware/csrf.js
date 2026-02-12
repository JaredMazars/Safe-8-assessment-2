import { doubleCsrf } from 'csrf-csrf';
import cookieParser from 'cookie-parser';

// Configure CSRF protection
const csrfSetup = doubleCsrf({
  getSecret: () => {
    if (!process.env.CSRF_SECRET) {
      throw new Error('CRITICAL: CSRF_SECRET environment variable must be set');
    }
    if (process.env.CSRF_SECRET.length < 32) {
      throw new Error('CSRF_SECRET must be at least 32 characters');
    }
    return process.env.CSRF_SECRET;
  },
  cookieName: 'csrf-secret',
  cookieOptions: {
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getSessionIdentifier: (req) => {
    // Return session identifier from request
    return req.sessionID || req.ip || 'anonymous';
  },
  getTokenFromRequest: (req) => {
    const headerToken = req.headers['x-csrf-token'];
    const bodyToken = req.body?._csrf;
    const cookieToken = req.cookies?.['x-csrf-token'];
    
    const token = headerToken || bodyToken || cookieToken;
    
    console.log('CSRF Token Check:', {
      hasHeader: !!headerToken,
      hasBody: !!bodyToken,
      hasCookie: !!cookieToken,
      method: req.method,
      url: req.url
    });
    
    return token;
  },
});

// Extract the functions - the library exports 'generateCsrfToken' not 'generateToken'
const { generateCsrfToken: libGenerateToken, doubleCsrfProtection } = csrfSetup;

// Wrapper to set both cookies
const generateCsrfToken = (req, res) => {
  try {
    // Call the library's generateCsrfToken function
    const token = libGenerateToken(req, res);
    
    // Also set a readable cookie for the client
    res.cookie('x-csrf-token', token, {
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false, // JavaScript needs to read this
    });
    
    return token;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    throw error;
  }
};

// Export the functions
export { generateCsrfToken as generateToken, doubleCsrfProtection, cookieParser };

// Export a wrapped version that provides better error messages
export const csrfProtection = (req, res, next) => {
  console.log('🔐 CSRF Protection middleware invoked for:', req.method, req.url);
  
  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    console.log('🔐 Skipping CSRF for', req.method);
    return next();
  }
  
  // Apply the double CSRF protection
  doubleCsrfProtection(req, res, (err) => {
    if (err) {
      console.error('🔐 CSRF validation failed:', {
        error: err.message,
        code: err.code,
        url: req.url,
        method: req.method,
        hasToken: !!req.headers['x-csrf-token'],
        hasSecretCookie: !!req.cookies?.['csrf-secret'],
        cookies: Object.keys(req.cookies || {})
      });
    }
    next(err);
  });
};
