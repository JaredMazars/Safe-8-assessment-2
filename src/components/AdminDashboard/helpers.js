/**
 * Helper functions for AdminDashboard component
 * Extracted to reduce cognitive complexity
 */

/**
 * Check if admin is authenticated
 * @returns {Object|null} Admin user data or null
 */
export const getAdminUser = () => {
  const adminData = localStorage.getItem('adminUser');
  return adminData ? JSON.parse(adminData) : null;
};

/**
 * Filter out deleted users from user list
 * @param {Array} users - Array of user objects
 * @returns {Array} Filtered users
 */
export const filterActiveUsers = (users) => {
  if (!Array.isArray(users)) return [];
  return users.filter(user => 
    !user.email?.startsWith('deleted_') && 
    user.full_name !== 'DELETED USER' &&
    user.contact_name !== 'DELETED USER'
  );
};

/**
 * Format user data for display
 * @param {Object} user - User object
 * @returns {Object} Formatted user data
 */
export const formatUserData = (user) => {
  return {
    ...user,
    registered_at: user.registered_at || user.created_at,
    full_name: user.full_name || user.contact_name || 'N/A',
    last_login: user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'
  };
};

/**
 * Get status badge class based on score
 * @param {number} score - Assessment score
 * @returns {string} CSS class name
 */
export const getScoreStatusClass = (score) => {
  if (score >= 80) return 'status-excellent';
  if (score >= 60) return 'status-good';
  if (score >= 40) return 'status-fair';
  return 'status-needs-work';
};

/**
 * Get status text based on score
 * @param {number} score - Assessment score
 * @returns {string} Status text
 */
export const getScoreStatusText = (score) => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Work';
};

/**
 * Validate required fields for user creation/edit
 * @param {Object} data - User form data
 * @param {string} mode - 'create' or 'edit'
 * @returns {Object} {valid: boolean, errors: Array}
 */
export const validateUserData = (data, mode) => {
  const errors = [];
  
  if (!data.contact_name?.trim()) {
    errors.push('Contact name is required');
  }
  
  if (!data.email?.trim()) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (mode === 'create' && !data.password?.trim()) {
    // Password is optional for create - will be auto-generated
  } else if (data.password && data.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate question data
 * @param {Object} data - Question form data
 * @returns {Object} {valid: boolean, errors: Array}
 */
export const validateQuestionData = (data) => {
  const errors = [];
  
  if (!data.assessment_type) {
    errors.push('Assessment type is required');
  }
  
  if (!data.pillar_name) {
    errors.push('Pillar name is required');
  }
  
  if (!data.pillar_short_name) {
    errors.push('Pillar short name is required');
  }
  
  if (!data.question_text?.trim()) {
    errors.push('Question text is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Format API response for pagination
 * @param {Object} response - API response with pagination
 * @returns {Object} Formatted pagination data
 */
export const formatPaginationData = (response) => {
  return {
    currentPage: response.current_page || 1,
    totalPages: response.total_pages || 1,
    totalItems: response.total_items || 0,
    itemsPerPage: response.items_per_page || 20,
    hasPrev: response.has_prev || false,
    hasNext: response.has_next || false
  };
};

/**
 * Generate query params for API calls
 * @param {Object} filters - Filter options
 * @returns {Object} Query parameters
 */
export const buildQueryParams = (filters) => {
  const params = {};
  
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '' && filters[key] !== 'all') {
      params[key] = filters[key];
    }
  });
  
  return params;
};

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid date';
  }
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Check if user has super admin role
 * @param {Object} adminUser - Admin user object
 * @returns {boolean}
 */
export const isSuperAdmin = (adminUser) => {
  return adminUser?.role === 'super_admin';
};

/**
 * Safe JSON parse with fallback
 * @param {string} jsonString - JSON string to parse
 * @param {any} fallback - Fallback value if parse fails
 * @returns {any} Parsed object or fallback
 */
export const safeJsonParse = (jsonString, fallback = null) => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
};
