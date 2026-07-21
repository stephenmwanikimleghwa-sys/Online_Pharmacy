import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  extractStructuredError,
  mapBusinessErrorCode,
} from "../utils/apiErrorDisplay";

export interface ApiErrorDisplay {
  title: string;
  message: string;
  actionLabel?: string;
  action?: () => void;
}

/** Structured error body (Part 4 — forward-compatible). */
interface StructuredApiError {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

const MAX_TITLE_WORDS = 5;

export function truncateTitle(title: string): string {
  const words = title.trim().split(/\s+/);
  if (words.length <= MAX_TITLE_WORDS) return title.trim();
  return words.slice(0, MAX_TITLE_WORDS).join(" ");
}

/** Flatten DRF / Django validation payloads into readable text. */
export function formatFieldErrors(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;

  const body = data as StructuredApiError;

  if (body.success === false && body.error?.message) {
    const details = body.error.details;
    if (details && typeof details === "object" && Object.keys(details).length > 0) {
      const detailLines = Object.entries(details)
        .map(([key, val]) => `${humanizeField(key)}: ${formatValue(val)}`)
        .join(" ");
      return `${body.error.message} ${detailLines}`.trim();
    }
    return body.error.message;
  }

  if (body.error?.message) {
    const details = body.error.details;
    if (details && typeof details === "object" && Object.keys(details).length > 0) {
      const detailLines = Object.entries(details)
        .map(([key, val]) => `${humanizeField(key)}: ${formatValue(val)}`)
        .join(" ");
      return `${body.error.message} ${detailLines}`.trim();
    }
    return body.error.message;
  }

  if (typeof body.detail === "string") return body.detail;
  if (typeof body.message === "string") return body.message;

  const lines: string[] = [];
  for (const [key, value] of Object.entries(body)) {
    if (key === "success") continue;
    if (Array.isArray(value)) {
      value.forEach((v) => lines.push(`${humanizeField(key)}: ${formatValue(v)}`));
    } else if (typeof value === "string") {
      lines.push(`${humanizeField(key)}: ${value}`);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = formatFieldErrors(value);
      if (nested) lines.push(nested);
    }
  }

  return lines.length > 0 ? lines.join(" ") : null;
}

function humanizeField(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(val: unknown): string {
  if (Array.isArray(val)) return val.map(formatValue).join(", ");
  if (val && typeof val === "object") return JSON.stringify(val);
  return String(val ?? "");
}

export type ApiErrorMapperContext = {
  onLogin: () => void;
  onRetry?: (config: InternalAxiosRequestConfig) => void;
};

export function mapAxiosErrorToDisplay(
  error: AxiosError,
  ctx: ApiErrorMapperContext,
): ApiErrorDisplay | null {
  const structured = extractStructuredError(error.response?.data);
  if (structured?.code) {
    const mapped = mapBusinessErrorCode(
      structured.code,
      structured.message ?? "",
      (structured.details as Record<string, unknown>) ?? {},
    );
    if (mapped) {
      return { ...mapped, title: truncateTitle(mapped.title) };
    }
    if (structured.message) {
      return {
        title: truncateTitle("Request Failed"),
        message: structured.message,
      };
    }
  }

  if (!error.response) {
    const retryAction =
      error.config && ctx.onRetry
        ? () => ctx.onRetry!(error.config!)
        : undefined;

    // A request that was aborted by our own timeout means the server was
    // reachable but slow — distinct from being fully offline. Telling the user
    // "check your connection" is misleading when they're online but on a weak
    // link, so we give a slow-network message and offer a retry.
    const isTimeout =
      error.code === "ECONNABORTED" ||
      /timeout/i.test(error.message ?? "");
    const isOffline =
      typeof navigator !== "undefined" && navigator.onLine === false;

    if (isTimeout && !isOffline) {
      return {
        title: "Slow Network",
        message:
          "The server is taking longer than usual to respond. This is usually a slow connection — you can retry.",
        actionLabel: retryAction ? "Retry" : undefined,
        action: retryAction,
      };
    }

    return {
      title: "No Internet Connection",
      message:
        "Could not connect to the server. Please check your internet connection and try again.",
      actionLabel: retryAction ? "Retry" : undefined,
      action: retryAction,
    };
  }

  const status = error.response.status;
  const data = error.response.data;
  const fieldMessage = formatFieldErrors(data);

  switch (status) {
    case 400:
      return {
        title: "Invalid Information",
        message:
          fieldMessage ??
          "Please check the information you entered and try again.",
      };
    case 401:
      return {
        title: "Session Expired",
        message:
          "Your login session has expired. Please log in again to continue.",
        actionLabel: "Go to Login",
        action: ctx.onLogin,
      };
    case 403:
      return {
        title: "Access Denied",
        message:
          fieldMessage ??
          "You do not have permission to perform this action. Contact your administrator if you think this is a mistake.",
      };
    case 404:
      return {
        title: "Not Found",
        message:
          fieldMessage ??
          "The information you are looking for could not be found. It may have been removed or the link may be incorrect.",
      };
    case 409:
      return {
        title: "Duplicate Entry",
        message:
          fieldMessage ??
          "This record already exists in the system. Please check if it has already been added.",
      };
    case 422:
      return {
        title: "Validation Error",
        message:
          fieldMessage ??
          "Please check the information you entered and try again.",
      };
    case 429:
      return {
        title: "Too Many Attempts",
        message:
          "You have made too many requests. Please wait a moment and try again.",
      };
    case 503:
      return {
        title: "System Unavailable",
        message:
          "The system is temporarily unavailable. Please check your internet connection and try again.",
        actionLabel: error.config && ctx.onRetry ? "Try Again" : undefined,
        action:
          error.config && ctx.onRetry
            ? () => ctx.onRetry!(error.config!)
            : undefined,
      };
    default:
      if (status >= 500) {
        return {
          title: "System Error",
          message:
            "Something went wrong on our end. Your data has not been affected. Please try again in a moment.",
          actionLabel: error.config && ctx.onRetry ? "Try Again" : undefined,
          action:
            error.config && ctx.onRetry
              ? () => ctx.onRetry!(error.config!)
              : undefined,
        };
      }
      return {
        title: "Something Went Wrong",
        message:
          fieldMessage ??
          error.message ??
          "An unexpected error occurred. Please try again.",
      };
  }
}

export function isAuthFlowPath(): boolean {
  return ["/login", "/branch/select", "/force-password-change"].some((path) =>
    window.location.pathname.includes(path),
  );
}

declare module "axios" {
  export interface AxiosRequestConfig {
    /** When true, the global interceptor will not show a toast for this request's errors. */
    skipGlobalErrorNotification?: boolean;
  }
}
