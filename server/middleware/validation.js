import { body, param, query, validationResult } from 'express-validator';

/**
 * Validation Middleware
 * Comprehensive input validation for all API endpoints
 */

// ✅ Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  console.log('✅ Validation passed');
  next();
};

// ✅ Lead Form Validation
export const validateLeadForm = [
  body('contactName')
    .trim()
    .notEmpty().withMessage('Contact name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Contact name must be between 2 and 200 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .isLength({ max: 254 }).withMessage('Email must not exceed 254 characters')
    .normalizeEmail(),
  
  body('companyName')
    .trim()
    .notEmpty().withMessage('Company name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Company name must be between 2 and 200 characters'),
  
  body('phoneNumber')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 }).withMessage('Phone number must not exceed 50 characters'),
  
  body('jobTitle')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Job title must not exceed 100 characters'),
  
  body('industry')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Industry must not exceed 100 characters'),
  
  body('companySize')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 }).withMessage('Company size must not exceed 50 characters'),
  
  body('country')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Country must not exceed 100 characters'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters'),
  
  handleValidationErrors
];

// ✅ Assessment Response Validation
export const validateAssessmentResponse = [
  body('lead_user_id')
    .notEmpty().withMessage('Lead user ID is required')
    .isInt({ min: 1 }).withMessage('Lead user ID must be a positive integer'),
  
  body('assessment_type')
    .notEmpty().withMessage('Assessment type is required')
    .trim()
    .toUpperCase()
    .isIn(['CORE', 'ADVANCED', 'FRONTIER']).withMessage('Assessment type must be CORE, ADVANCED, or FRONTIER'),
  
  body('responses')
    .isArray({ min: 1 }).withMessage('Responses must be a non-empty array')
    .custom((responses) => {
      // Validate each response object
      for (const response of responses) {
        if (!response.question_id || !Number.isInteger(response.question_id)) {
          throw new Error('Each response must have a valid question_id');
        }
        if (response.answer_value === undefined || response.answer_value === null) {
          throw new Error('Each response must have an answer_value');
        }
        if (typeof response.answer_text === 'string' && response.answer_text.length > 1000) {
          throw new Error('Answer text must not exceed 1000 characters');
        }
      }
      return true;
    }),
  
  handleValidationErrors
];

// ✅ Admin Login Validation
export const validateAdminLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username or email is required')
    .isLength({ min: 3, max: 254 }).withMessage('Username/email must be between 3 and 254 characters'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters'),
  
  handleValidationErrors
];

// ✅ Lead Login Validation
export const validateLeadLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6, max: 128 }).withMessage('Password must be between 6 and 128 characters'),
  
  handleValidationErrors
];

// ✅ Change Password Validation
export const validatePasswordChange = [
  body('oldPassword')
    .notEmpty().withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  handleValidationErrors
];

// ✅ ID Parameter Validation
export const validateId = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  
  handleValidationErrors
];

// ✅ Pagination Validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

// ✅ Assessment Type Validation
export const validateAssessmentType = [
  param('type')
    .trim()
    .toUpperCase()
    .isIn(['CORE', 'ADVANCED', 'FRONTIER']).withMessage('Invalid assessment type'),
  
  handleValidationErrors
];

// ✅ Question Creation/Update Validation
export const validateQuestion = [
  body('question_text')
    .trim()
    .notEmpty().withMessage('Question text is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Question text must be between 10 and 1000 characters'),
  
  body('category')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Category must not exceed 100 characters'),
  
  body('weight')
    .optional()
    .isFloat({ min: 0, max: 10 }).withMessage('Weight must be between 0 and 10'),
  
  handleValidationErrors
];

// ✅ General text sanitization
export const sanitizeText = (text) => {
  if (typeof text !== 'string') return text;
  
  // Remove potential XSS vectors
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .trim();
};

export default {
  validateLeadForm,
  validateAssessmentResponse,
  validateAdminLogin,
  validateLeadLogin,
  validatePasswordChange,
  validateId,
  validatePagination,
  validateAssessmentType,
  validateQuestion,
  handleValidationErrors,
  sanitizeText
};
