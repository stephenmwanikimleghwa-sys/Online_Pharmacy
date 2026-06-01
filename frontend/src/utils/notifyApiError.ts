import type { AxiosError } from "axios";
import type { NotifyAPI } from "../context/NotificationContext";
import { mapAxiosErrorToDisplay } from "../services/apiErrors";

export function notifyApiError(
  notify: NotifyAPI,
  error: unknown,
  fallbackTitle = "Something Went Wrong",
  fallbackMessage = "Please try again.",
): void {
  const axiosErr = error as AxiosError;
  const display = axiosErr?.isAxiosError
    ? mapAxiosErrorToDisplay(axiosErr, {
        onLogin: () => {
          window.location.href = "/login";
        },
      })
    : null;

  if (display) {
    notify.error(display.title, display.message, display.actionLabel, display.action);
    return;
  }

  notify.error(fallbackTitle, fallbackMessage);
}
