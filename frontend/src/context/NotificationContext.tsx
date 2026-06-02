import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  clearNotificationHandler,
  registerNotificationHandler,
  type NotificationAction,
  type NotificationPayload,
  type NotificationType,
} from "../services/notification";
import { truncateTitle } from "../services/apiErrors";

export interface NotificationItem extends NotificationPayload {
  id: string;
  type: NotificationType;
  durationMs: number | null;
}

export interface NotifyAPI {
  success: (title: string, message: string, actionLabel?: string, actionFn?: () => void) => string;
  error: (title: string, message: string, actionLabel?: string, actionFn?: () => void) => string;
  warning: (title: string, message: string, actionLabel?: string, actionFn?: () => void) => string;
  info: (title: string, message: string, actionLabel?: string, actionFn?: () => void) => string;
}

interface NotificationContextValue {
  notify: NotifyAPI;
  notifications: NotificationItem[];
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

const AUTO_DISMISS_MS = 5000;

const typeIcons: Record<NotificationType, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  success: CheckCircleIcon,
  error: ExclamationTriangleIcon,
  warning: ExclamationCircleIcon,
  info: InformationCircleIcon,
};

const typeStyles: Record<
  NotificationType,
  { glassClass: string; iconColor: string }
> = {
  success: { glassClass: "toast-success-glass", iconColor: "#10b981" },
  error: { glassClass: "toast-error-glass", iconColor: "#dc2626" },
  warning: { glassClass: "toast-warning-glass", iconColor: "#f59e0b" },
  info: { glassClass: "toast-info-glass", iconColor: "var(--color-primary)" },
};

function buildAction(
  actionLabel?: string,
  actionFn?: () => void,
): NotificationAction | undefined {
  if (!actionLabel || !actionFn) return undefined;
  return { label: actionLabel, onClick: actionFn };
}

function defaultDuration(type: NotificationType): number | null {
  if (type === "success" || type === "info") return AUTO_DISMISS_MS;
  return 8000;
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
    setNotifications([]);
  }, []);

  const push = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      actionLabel?: string,
      actionFn?: () => void,
      durationMs?: number | null,
    ): string => {
      const id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 11);
      const resolvedDuration =
        durationMs !== undefined ? durationMs : defaultDuration(type);

      const item: NotificationItem = {
        id,
        type,
        title: truncateTitle(title),
        message,
        action: buildAction(actionLabel, actionFn),
        durationMs: resolvedDuration,
      };

      setNotifications((prev) => [...prev, item]);

      if (resolvedDuration != null && resolvedDuration > 0) {
        const timer = setTimeout(() => dismiss(id), resolvedDuration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss],
  );

  const notify: NotifyAPI = useMemo(
    () => ({
      success: (title, message, actionLabel, actionFn) =>
        push("success", title, message, actionLabel, actionFn),
      error: (title, message, actionLabel, actionFn) =>
        push("error", title, message, actionLabel, actionFn),
      warning: (title, message, actionLabel, actionFn) =>
        push("warning", title, message, actionLabel, actionFn),
      info: (title, message, actionLabel, actionFn) =>
        push("info", title, message, actionLabel, actionFn),
    }),
    [push],
  );

  useEffect(() => {
    const handler = (type: NotificationType, payload: NotificationPayload) => {
      const actionLabel = payload.action?.label;
      const actionFn = payload.action?.onClick;
      push(type, payload.title, payload.message, actionLabel, actionFn, payload.durationMs);
    };
    registerNotificationHandler(handler);
    return () => clearNotificationHandler();
  }, [push]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearAll();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearAll]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ notify, notifications, dismiss, clearAll }),
    [notify, notifications, dismiss, clearAll],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer
        notifications={notifications}
        onDismiss={dismiss}
      />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC<{
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}> = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-md w-full sm:w-[24rem]"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {notifications.map((n) => (
        <NotificationCard key={n.id} item={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const NotificationCard: React.FC<{
  item: NotificationItem;
  onDismiss: (id: string) => void;
}> = ({ item, onDismiss }) => {
  const config = typeStyles[item.type];
  const Icon = typeIcons[item.type];

  return (
    <div
      className={`pointer-events-auto w-full toast-glass ${config.glassClass} p-4 fade-in shadow-lg`}
      role="alert"
      aria-labelledby={`notification-title-${item.id}`}
    >
      <div className="flex items-start gap-3">
        <Icon
          className="h-5 w-5 flex-shrink-0 mt-0.5"
          style={{ color: config.iconColor }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <h3
            id={`notification-title-${item.id}`}
            className="font-bold text-sm mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {item.title}
          </h3>
          <p className="text-sm leading-snug" style={{ color: "var(--text-secondary)" }}>
            {item.message}
          </p>
          {item.action && (
            <button
              type="button"
              onClick={() => {
                item.action?.onClick();
                onDismiss(item.id);
              }}
              className="mt-2 text-sm font-semibold underline focus:outline-none focus-visible:ring-2 rounded"
              style={{ color: "var(--color-primary)" }}
            >
              {item.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className="flex-shrink-0 rounded p-0.5 focus:outline-none focus-visible:ring-2"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Dismiss notification"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export const useNotification = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};

export default NotificationProvider;
