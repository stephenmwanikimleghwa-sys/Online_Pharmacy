import type { AxiosError } from "axios";
import type { NotifyAPI } from "../context/NotificationContext";
import { formatFieldErrors, mapAxiosErrorToDisplay } from "../services/apiErrors";

export type ApiErrorDisplayResult = {
  title: string;
  message: string;
  actionLabel?: string;
  action?: () => void;
};

/**
 * Map any caught error (Axios or plain) into user-facing title/message.
 * Prefer this over hardcoded "Could not …" strings so API field errors surface.
 */
export function getApiErrorDisplay(
  error: unknown,
  fallbackTitle = "Something Went Wrong",
  fallbackMessage = "Please try again.",
): ApiErrorDisplayResult {
  const axiosErr = error as AxiosError;
  if (axiosErr?.isAxiosError) {
    const display = mapAxiosErrorToDisplay(axiosErr, {
      onLogin: () => {
        window.location.href = "/login";
      },
    });
    if (display) {
      return {
        title: display.title,
        message: display.message,
        actionLabel: display.actionLabel,
        action: display.action,
      };
    }
  }

  // Non-Axios payloads (e.g. AuthContext switchBranch returns response.data)
  if (error && typeof error === "object") {
    const body = error as Record<string, unknown>;
    const fromFields = formatFieldErrors(body);
    if (fromFields) {
      return { title: fallbackTitle, message: fromFields };
    }
    const detail =
      (typeof body.detail === "string" && body.detail) ||
      (typeof body.message === "string" && body.message) ||
      (typeof (body.error as { message?: string } | undefined)?.message === "string" &&
        (body.error as { message: string }).message) ||
      null;
    if (detail) {
      return { title: fallbackTitle, message: detail };
    }
  }

  if (typeof error === "string" && error.trim()) {
    return { title: fallbackTitle, message: error };
  }

  if (error instanceof Error && error.message) {
    return { title: fallbackTitle, message: error.message };
  }

  return { title: fallbackTitle, message: fallbackMessage };
}

export function notifyApiError(
  notify: NotifyAPI,
  error: unknown,
  fallbackTitle = "Something Went Wrong",
  fallbackMessage = "Please try again.",
): void {
  const display = getApiErrorDisplay(error, fallbackTitle, fallbackMessage);
  notify.error(display.title, display.message, display.actionLabel, display.action);
}
