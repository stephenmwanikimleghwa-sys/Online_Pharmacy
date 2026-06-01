/// <reference types="vite/client" />
import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError
} from "axios";
import { resolveApiBaseUrl } from "../config/apiBaseUrl";
import { notifyError, getFriendlyAxiosErrorMessage } from "./notification";

const API_BASE_URL = resolveApiBaseUrl();

if (import.meta.env.PROD) {
  console.info("[API] Base URL:", API_BASE_URL);
}

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
    if (error.config) {
      console.error('[API] Request failed', {
        message: error.message,
        method: error.config.method,
        url: error.config.url,
        baseURL: error.config.baseURL,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      });
    } else {
      console.error('[API] Request failed without config', { message: error.message, stack: error.stack });
    }

    const status = error.response?.status;
    const onAuthFlow = ["/login", "/branch/select", "/force-password-change"].some((path) =>
      window.location.pathname.includes(path),
    );

    if (status === 401) {
      if (!onAuthFlow) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("active_branch");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    notifyError(getFriendlyAxiosErrorMessage(error));
    return Promise.reject(error);
  },
);

export default api;
export { API_BASE_URL };
