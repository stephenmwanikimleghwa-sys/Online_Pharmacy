export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface NotificationPayload {
  title: string;
  message: string;
  action?: NotificationAction;
  /** Override auto-dismiss; omit to use type defaults. */
  durationMs?: number | null;
}

type NotificationHandler = (
  type: NotificationType,
  payload: NotificationPayload,
) => void;

let notificationHandler: NotificationHandler | null = null;

export const registerNotificationHandler = (handler: NotificationHandler) => {
  notificationHandler = handler;
};

export const clearNotificationHandler = () => {
  notificationHandler = null;
};

const emit = (type: NotificationType, payload: NotificationPayload) => {
  notificationHandler?.(type, payload);
};

function resolveAction(
  actionOrLabel?: NotificationAction | string,
  actionFn?: () => void,
): NotificationAction | undefined {
  if (typeof actionOrLabel === "string" && actionFn) {
    return { label: actionOrLabel, onClick: actionFn };
  }
  if (actionOrLabel && typeof actionOrLabel === "object") {
    return actionOrLabel;
  }
  return undefined;
}

export const notifySuccess = (
  title: string,
  message: string,
  actionOrLabel?: NotificationAction | string,
  actionFn?: () => void,
) => emit("success", { title, message, action: resolveAction(actionOrLabel, actionFn) });

export const notifyError = (
  title: string,
  message: string,
  actionOrLabel?: NotificationAction | string,
  actionFn?: () => void,
) => emit("error", { title, message, action: resolveAction(actionOrLabel, actionFn) });

export const notifyWarning = (
  title: string,
  message: string,
  actionOrLabel?: NotificationAction | string,
  actionFn?: () => void,
) => emit("warning", { title, message, action: resolveAction(actionOrLabel, actionFn) });

export const notifyInfo = (
  title: string,
  message: string,
  actionOrLabel?: NotificationAction | string,
  actionFn?: () => void,
) => emit("info", { title, message, action: resolveAction(actionOrLabel, actionFn) });
