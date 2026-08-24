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
let proactiveTimer: ReturnType<typeof setTimeout> | null = null;

/** Refresh ~2 minutes before access expiry so staff never hit a 401 mid-shift. */
const REFRESH_SKEW_MS = 2 * 60 * 1000;
const REFRESH_LOCK_KEY = "auth_refresh_lock";
const REFRESH_LOCK_TTL_MS = 15_000;

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
  localStorage.removeItem(REFRESH_LOCK_KEY);
  if (proactiveTimer) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
}

function goToLogin(): void {
  clearSession();
  window.location.href = "/login";
}

function forceLogout(error: AxiosError, config: InternalAxiosRequestConfig | undefined): void {
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

/** Decode JWT payload without verifying (client-side scheduling only). */
function readJwtExpMs(token: string | null): number | null {
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function tryAcquireRefreshLock(): boolean {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(REFRESH_LOCK_KEY);
    if (raw) {
      const lock = JSON.parse(raw) as { until?: number };
      if (typeof lock.until === "number" && lock.until > now) {
        return false;
      }
    }
    localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ until: now + REFRESH_LOCK_TTL_MS }));
    return true;
  } catch {
    return true;
  }
}

function releaseRefreshLock(): void {
  try {
    localStorage.removeItem(REFRESH_LOCK_KEY);
  } catch {
    /* ignore */
  }
}

async function waitForPeerRefresh(previousAccess: string | null, maxMs = 12_000): Promise<string | null> {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    await new Promise((r) => setTimeout(r, 250));
    const access = localStorage.getItem("access_token");
    if (access && access !== previousAccess) {
      return access;
    }
    try {
      const raw = localStorage.getItem(REFRESH_LOCK_KEY);
      if (!raw) {
        const again = localStorage.getItem("access_token");
        if (again && again !== previousAccess) return again;
        break;
      }
    } catch {
      break;
    }
  }
  return localStorage.getItem("access_token");
}

/**
 * Schedule a silent refresh before the access token expires.
 * Call after login / switch-branch / successful refresh.
 */
function scheduleProactiveRefresh(): void {
  if (proactiveTimer) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
  const access = localStorage.getItem("access_token");
  const expMs = readJwtExpMs(access);
  if (!expMs) return;

  const delay = Math.max(5_000, expMs - Date.now() - REFRESH_SKEW_MS);
  proactiveTimer = setTimeout(() => {
    void refreshAccessToken().then((token) => {
      if (token) scheduleProactiveRefresh();
    });
  }, delay);
}

/**
 * Exchange refresh_token for a new access (and rotated refresh) token.
 * Single-flight in-tab; cross-tab lock avoids blacklist races wiping a good session.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const previousAccess = localStorage.getItem("access_token");
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return null;

    if (!tryAcquireRefreshLock()) {
      const fromPeer = await waitForPeerRefresh(previousAccess);
      if (fromPeer && fromPeer !== previousAccess) {
        scheduleProactiveRefresh();
        return fromPeer;
      }
      // Peer may have failed — fall through and try ourselves.
      if (!tryAcquireRefreshLock()) {
        return localStorage.getItem("access_token");
      }
    }

    try {
      const { data } = await refreshClient.post("/auth/token/refresh/", { refresh });
      const access = data?.access as string | undefined;
      const newRefresh = (data?.refresh as string | undefined) || refresh;
      if (!access) {
        // Another tab may have rotated successfully while we raced.
        const peer = localStorage.getItem("access_token");
        if (peer && peer !== previousAccess) return peer;
        return null;
      }
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", newRefresh);
      scheduleProactiveRefresh();
      return access;
    } catch {
      // Blacklisted/rotated by another tab: adopt whatever is now in storage.
      const peerAccess = localStorage.getItem("access_token");
      const peerRefresh = localStorage.getItem("refresh_token");
      if (peerAccess && peerAccess !== previousAccess) {
        scheduleProactiveRefresh();
        return peerAccess;
      }
      if (peerRefresh && peerRefresh !== refresh) {
        try {
          const { data } = await refreshClient.post("/auth/token/refresh/", {
            refresh: peerRefresh,
          });
          const access = data?.access as string | undefined;
          const newRefresh = (data?.refresh as string | undefined) || peerRefresh;
          if (access) {
            localStorage.setItem("access_token", access);
            localStorage.setItem("refresh_token", newRefresh);
            scheduleProactiveRefresh();
            return access;
          }
        } catch {
          /* give up */
        }
      }
      return null;
    } finally {
      releaseRefreshLock();
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Keep proactive refresh alive across tabs / reloads when a session exists.
if (typeof window !== "undefined") {
  scheduleProactiveRefresh();
  window.addEventListener("storage", (event) => {
    if (event.key === "access_token" || event.key === "refresh_token") {
      scheduleProactiveRefresh();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    const expMs = readJwtExpMs(localStorage.getItem("access_token"));
    if (!expMs) return;
    // Tab was backgrounded past expiry — refresh immediately.
    if (expMs - Date.now() < REFRESH_SKEW_MS) {
      void refreshAccessToken().then((token) => {
        if (token) scheduleProactiveRefresh();
      });
    }
  });
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
      forceLogout(error, config);
      return Promise.reject(error);
    }

    // Already retried, or refresh endpoint itself rejected — only hard-logout
    // when we still have no usable access token (avoid wiping a peer tab's session).
    if (status === 401 && !onAuthFlow && !isRefreshCall) {
      const stillHasAccess = Boolean(localStorage.getItem("access_token"));
      const stillHasRefresh = Boolean(localStorage.getItem("refresh_token"));
      if (!stillHasAccess || !stillHasRefresh) {
        forceLogout(error, config);
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
export { API_BASE_URL, refreshAccessToken, scheduleProactiveRefresh };
