/// <reference types="vite/client" />
import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError
} from "axios";



// In development, if VITE_API_BASE_URL isn't set, use localhost
const isDevelopment = import.meta.env.MODE === 'development';
const defaultDevUrl = 'http://localhost:8000/api';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (isDevelopment ? defaultDevUrl : '/api');

// Log API configuration (removed for production)

// Create Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Cold starts on free hosts (e.g. Render) often exceed 10s; keep a generous ceiling.
  timeout: 60000,
  validateStatus: (status: number) => status >= 200 && status < 300,
});

// Request interceptor to add JWT token to headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response interceptor for handling errors (e.g., token refresh or logout on 401)
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - cleanup and redirect
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

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
