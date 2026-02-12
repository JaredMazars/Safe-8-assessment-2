/**
 * Centralized Error Handling Middleware
 * Addresses: MAIN-002 from audit report
 * 
 * Provides consistent error responses across all API endpoints with:
 * - Structured error classes for different error types
 * - Consistent JSON response format
 * - Proper HTTP status codes
 * - Development vs production error details
 * - Comprehensive error logging
 */

import logger from '../utils/logger.js';

/**
 * Base API Error class
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Marks known/expected errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error (400)
 * For invalid request data, missing required fields, etc.
 */
export class ValidationError extends ApiError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * Unauthorized Error (401)
 * For authentication failures
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden Error (403)
 * For authorization failures (authenticated but insufficient permissions)
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Not Found Error (404)
 * For missing resources
 */
export class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.resource = resource;
  }
}

/**
 * Conflict Error (409)
 * For duplicate entries, race conditions, etc.
 */
export class ConflictError extends ApiError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Rate Limit Error (429)
 * For too many requests
 */
export class RateLimitError extends ApiError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Database Error (500)
 * For database operation failures
 */
export class DatabaseError extends ApiError {
  constructor(message, originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

/**
 * Global error handler middleware
 * Place this as the last middleware in your Express app
 * 
 * Usage:
 * app.use(errorHandler);
 */
export const errorHandler = (err, req, res, next) => {
  // Default error properties
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let errors = err.errors || undefined;

  // Log error with context
  const errorContext = {
    message: err.message,
    code: err.code,
    statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    ...(err.isOperational === false && { stack: err.stack })
  };

  if (statusCode >= 500) {
    console.error('❌ Server Error:', errorContext);
  } else if (statusCode >= 400) {
    console.warn('⚠️  Client Error:', errorContext);
  }

  // Operational errors (known/expected)
  if (err.isOperational) {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(errors && { errors })
      }
    });
  }

  // Programming errors (unknown/unexpected)
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: isDevelopment ? message : 'An unexpected error occurred',
      ...(isDevelopment && { stack: err.stack })
    }
  });
};

/**
 * Async handler wrapper
 * Eliminates need for try-catch in route handlers
 * 
 * Usage:
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.findAll();
 *   res.json(users);
 * }));
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 * Place this before the global error handler
 * 
 * Usage:
 * app.use(notFoundHandler);
 * app.use(errorHandler);
 */
export const notFoundHandler = (req, res, next) => {
  next(new NotFoundError('Route'));
};

export default {
  ApiError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  errorHandler,
  asyncHandler,
  notFoundHandler
};
