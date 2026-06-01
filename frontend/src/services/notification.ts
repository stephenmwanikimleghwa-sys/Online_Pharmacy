import type { AxiosError } from "axios";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationPayload {
  title?: string;
  message: string;
}

type NotificationHandler = (type: NotificationType, payload: NotificationPayload) => void;

let notificationHandler: NotificationHandler | null = null;

export const registerNotificationHandler = (handler: NotificationHandler) => {
  notificationHandler = handler;
};

export const clearNotificationHandler = () => {
  notificationHandler = null;
};

const notify = (type: NotificationType, message: string, title?: string) => {
  notificationHandler?.(type, { message, title });
};

export const notifySuccess = (message: string, title?: string) => notify("success", message, title);
export const notifyError = (message: string, title?: string) => notify("error", message, title);
export const notifyWarning = (message: string, title?: string) => notify("warning", message, title);
export const notifyInfo = (message: string, title?: string) => notify("info", message, title);

export const getFriendlyAxiosErrorMessage = (error: AxiosError): string => {
  if (!error.response) {
    return "Unable to connect to the server. Check your network and try again.";
  }

  const status = error.response.status;
  const data = error.response.data as Record<string, any> | string | undefined;
  const remoteMessage =
    (data && typeof data === "object" && (data.detail || data.error)) ||
    (typeof data === "string" ? data : undefined);

  switch (status) {
    case 400:
      return remoteMessage || "Invalid request. Please review your input.";
    case 401:
      return remoteMessage || "Your session has expired. Please log in again.";
    case 403:
      return remoteMessage || "You do not have permission to perform this action.";
    case 404:
      return remoteMessage || "Requested resource could not be found.";
    case 409:
      return remoteMessage || "This request conflicts with existing data.";
    case 422:
      return remoteMessage || "Validation failed. Please check your entries.";
    default:
      if (status >= 500) {
        return "A server error occurred. Please try again later.";
      }
      return remoteMessage || error.message || "An unexpected error occurred.";
  }
};
