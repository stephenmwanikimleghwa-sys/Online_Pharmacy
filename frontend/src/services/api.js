import axios from "axios";

// In development, if VITE_API_BASE_URL isn't set, use localhost
const isDevelopment = import.meta.env.MODE === 'development';
const defaultDevUrl = 'http://localhost:8000/api';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (isDevelopment ? defaultDevUrl : '/api');

// Log API configuration
console.log('[API Debug] Initializing API client:', {
  mode: import.meta.env.MODE,
  baseURL: API_BASE_URL,
  envBaseURL: import.meta.env.VITE_API_BASE_URL,
  isDevelopment
});

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Add timeout and validate status
  timeout: 10000,
  validateStatus: (status) => status >= 200 && status < 300,
});

// Request interceptor to add JWT token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    console.log('[API Debug] Request interceptor:', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      tokenStart: token ? token.substring(0, 10) + '...' : 'none'
    });
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('[API Debug] No access token found for request to:', config.url);
    }
    return config;
  },
  (error) => {
    console.error('[API Debug] Request interceptor error:', error);
    return Promise.reject(error);
  },
);

// Response interceptor for handling errors (e.g., token refresh or logout on 401)
api.interceptors.response.use(
  (response) => {
    console.log('[API Debug] Response success:', {
      url: response.config.url,
      status: response.status,
      hasData: !!response.data
    });
    return response;
  },
  (error) => {
    console.error('[API Debug] Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    if (error.response?.status === 401) {
      console.warn('[API Debug] Unauthorized access - checking auth state');
      const currentToken = localStorage.getItem("access_token");
      console.log('[API Debug] Current token state:', {
        hasToken: !!currentToken,
        tokenStart: currentToken ? currentToken.substring(0, 10) + '...' : 'none'
      });

      // Token expired or invalid - cleanup and redirect
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      console.log('[API Debug] Cleared auth tokens, redirecting to login');
      
      // Don't redirect if we're already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
export { API_BASE_URL };
