import axios from "axios";

// Resolve API base URL from Vite env var. Provide a safe fallback to a relative `/api`
// so client requests still work in environments where the env var wasn't set.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// Log API configuration
console.log('[API Debug] Initializing API client:', {
  baseURL: API_BASE_URL,
  envBaseURL: import.meta.env.VITE_API_BASE_URL,
});

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
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
