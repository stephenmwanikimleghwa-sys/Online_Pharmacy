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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for handling errors (e.g., token refresh or logout on 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - logout user
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      // Redirect to login (assuming React Router)
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
export { API_BASE_URL };
