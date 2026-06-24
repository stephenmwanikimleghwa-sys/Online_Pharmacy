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
  timeout: 90000,
  validateStatus: (status: number) => status >= 200 && status < 300,
});

let lastToastKey = "";
let lastToastAt = 0;
const TOAST_COOLDOWN_MS = 4000;

function shouldShowGlobalToast(error: AxiosError, config: InternalAxiosRequestConfig | undefined): boolean {
  if (config?.skipGlobalErrorNotification) return false;

  const status = error.response?.status;
  const method = config?.method?.toLowerCase() ?? "get";

  // Permission and missing-resource GETs: show inline on the page, not popups.
  if (status === 403) return false;
  if (status === 404 && method === "get") return false;

  return true;
}

function emitGlobalError(display: ReturnType<typeof mapAxiosErrorToDisplay>) {
  if (!display) return;
  const key = `${display.title}:${display.message}`;
  const now = Date.now();
  if (key === lastToastKey && now - lastToastAt < TOAST_COOLDOWN_MS) return;
  lastToastKey = key;
  lastToastAt = now;
  notifyError(display.title, display.message, display.actionLabel, display.action);
}

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
    const onAuthFlow = isAuthFlowPath();
    const status = error.response?.status;

    if (status === 401) {
      if (!onAuthFlow) {
        clearSession();
        if (shouldShowGlobalToast(error, config)) {
          const display = mapAxiosErrorToDisplay(error, {
            onLogin: goToLogin,
            onRetry: (cfg) => {
              void api.request(cfg);
            },
          });
          emitGlobalError(display);
        }
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }

    if (shouldShowGlobalToast(error, config)) {
      const display = mapAxiosErrorToDisplay(error, {
        onLogin: goToLogin,
        onRetry: (cfg) => {
          void api.request(cfg);
        },
      });
      emitGlobalError(display);
    }

    return Promise.reject(error);
  },
);

export default api;
export { API_BASE_URL };
