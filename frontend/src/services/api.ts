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
  // 90s made a slow connection look like a frozen app, but 25s is often too short
  // for a free-tier Render backend cold start (which can take ~50s). Bumping to 90s.
  timeout: 90000,
  validateStatus: (status: number) => status >= 200 && status < 300,
});

/** Bare client for refresh — must not use the 401 interceptor (infinite loop). */
const refreshClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

let lastToastKey = "";
let lastToastAt = 0;
const TOAST_COOLDOWN_MS = 12000;

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

function shouldShowGlobalToast(error: AxiosError, config: InternalAxiosRequestConfig | undefined): boolean {
  if (config?.skipGlobalErrorNotification) return false;

  const status = error.response?.status;
  const method = (config?.method?.toLowerCase() ?? "get") as string;

  // Permission and missing-resource GETs: show inline on the page, not popups.
  if (status === 403) return false;
  if (status === 404 && method === "get") return false;

  // Background GETs failing while the API is cold should not spam toasts —
  // pages already show their own empty/error states.
  if (!error.response && method === "get") return false;

  return true;
}

function emitGlobalError(display: ReturnType<typeof mapAxiosErrorToDisplay>) {
  if (!display) return;
  const key = `${display.title}:${display.message}`;
  const now = Date.now();
  const cooldown =
    display.title === "Server Unreachable" || display.title === "No Internet Connection"
      ? 60_000
      : TOAST_COOLDOWN_MS;
  if (key === lastToastKey && now - lastToastAt < cooldown) return;
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

/**
 * Exchange refresh_token for a new access (and rotated refresh) token.
 * Single-flight: concurrent 401s share one refresh call.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return null;
    try {
      const { data } = await refreshClient.post("/auth/token/refresh/", { refresh });
      const access = data?.access as string | undefined;
      const newRefresh = (data?.refresh as string | undefined) || refresh;
      if (!access) return null;
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", newRefresh);
      return access;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const onAuthFlow = isAuthFlowPath();
    const status = error.response?.status;
    const url = String(config?.url || "");
    const isRefreshCall = url.includes("/auth/token/refresh/");

    if (status === 401 && config && !config._retry && !isRefreshCall && !onAuthFlow) {
      config._retry = true;
      const access = await refreshAccessToken();
      if (access) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${access}`;
        return api.request(config);
      }
      // Refresh failed — fall through to logout
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
      return Promise.reject(error);
    }

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
export { API_BASE_URL, refreshAccessToken };
