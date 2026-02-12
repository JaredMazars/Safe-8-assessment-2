import axios from 'axios';

// Use environment variable, or same origin in production, or localhost in dev
const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In production (built app), use same origin
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  // In development, use localhost:8080
  return 'http://localhost:8080';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Get CSRF token
let csrfToken = null;
export const getCsrfToken = async () => {
  if (!csrfToken) {
    try {
      console.log('🔐 Fetching CSRF token...');
      const response = await api.get('/api/csrf-token');
      csrfToken = response.data.csrfToken || response.data.token; // Handle both formats
      console.log('🔐 CSRF token received:', csrfToken ? 'YES' : 'NO');
      if (csrfToken) {
        console.log('🔐 CSRF token value:', csrfToken.substring(0, 20) + '...');
      }
    } catch (error) {
      console.error('🔐 Failed to fetch CSRF token:', error);
    }
  }
  return csrfToken;
};

// Add CSRF token and admin token to requests
api.interceptors.request.use(async config => {
  console.log('🌐 API Request:', config.method.toUpperCase(), config.url);
  
  // Add admin token if exists
  const token = localStorage.getItem('adminToken');
  if (token && config.url.includes('/admin/')) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔑 Admin token added');
  }
  
  // CSRF token disabled for admin routes (authentication via Bearer token instead)
  // Only add CSRF for non-admin routes
  if (['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase()) && !config.url.includes('/admin/')) {
    const csrf = await getCsrfToken();
    if (csrf) {
      config.headers['x-csrf-token'] = csrf;
      console.log('🔐 CSRF token added to request');
    } else {
      console.warn('⚠️ CSRF token not available for', config.method, config.url);
    }
  }
  
  console.log('📤 Request headers:', config.headers);
  return config;
});

// Handle token expiration and CSRF errors
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // Handle CSRF token errors
    if (error.response?.status === 403 && error.response?.data?.code === 'EBADCSRFTOKEN') {
      console.log('🔄 CSRF token invalid, refreshing...');
      
      // Clear the token and retry once
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        csrfToken = null; // Force refresh
        
        const newToken = await getCsrfToken();
        if (newToken) {
          originalRequest.headers['x-csrf-token'] = newToken;
          return api(originalRequest);
        }
      }
    }
    
    // Handle authentication errors
    if (error.response?.status === 401 && window.location.pathname.includes('/admin/')) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/admin/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;
