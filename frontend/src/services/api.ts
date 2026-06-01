/// <reference types="vite/client" />
import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { resolveApiBaseUrl } from "../config/apiBaseUrl";
import { notifyError } from "./notification";
import {
  isAuthFlowPath,
  mapAxiosErrorToDisplay,
} from "./apiErrors";

const API_BASE_URL = resolveApiBaseUrl();

if (import.meta.env.PROD) {
  console.info("[API] Base URL:", API_BASE_URL);
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
  validateStatus: (status: number) => status >= 200 && status < 300,
});

function clearSession(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("active_branch");
}

function goToLogin(): void {
  clearSession();
  window.location.href = "/login";
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const config = error.config;
    const skipToast = config?.skipGlobalErrorNotification === true;
    const onAuthFlow = isAuthFlowPath();
    const status = error.response?.status;

    if (import.meta.env.DEV && config) {
      console.error("[API] Request failed", {
        message: error.message,
        method: config.method,
        url: config.url,
        status,
        data: error.response?.data,
      });
    }

    if (status === 401) {
      if (!onAuthFlow) {
        clearSession();
        if (!skipToast) {
          const display = mapAxiosErrorToDisplay(error, {
            onLogin: goToLogin,
            onRetry: (cfg) => {
              void api.request(cfg);
            },
          });
          if (display) {
            notifyError(display.title, display.message, display.actionLabel, display.action);
          }
        }
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }

    if (!skipToast) {
      const display = mapAxiosErrorToDisplay(error, {
        onLogin: goToLogin,
        onRetry: (cfg) => {
          void api.request(cfg);
        },
      });
      if (display) {
        notifyError(display.title, display.message, display.actionLabel, display.action);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
export { API_BASE_URL };
