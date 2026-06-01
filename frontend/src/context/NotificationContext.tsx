import React, { createContext, useContext, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
  clearNotificationHandler,
  notifyError,
  notifyInfo,
  notifySuccess,
  notifyWarning,
  registerNotificationHandler,
} from "../services/notification";
import type { NotificationType, NotificationPayload } from "../services/notification";

interface NotificationContextType {
  notify: (type: NotificationType, payload: NotificationPayload) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const handler = (type: NotificationType, payload: NotificationPayload) => {
      const toastOptions = {
        duration: type === "error" ? 8000 : 5000,
      };

      switch (type) {
        case "success":
          toast.success(payload.message, toastOptions);
          break;
        case "error":
          toast.error(payload.message, toastOptions);
          break;
        case "warning":
          toast(payload.message, { ...toastOptions, icon: "⚠️" });
          break;
        case "info":
          toast(payload.message, { ...toastOptions, icon: "ℹ️" });
          break;
        default:
          toast(payload.message, toastOptions);
      }
    };

    registerNotificationHandler(handler);
    return () => {
      clearNotificationHandler();
    };
  }, []);

  const value = useMemo(
    () => ({
      notify: (type: NotificationType, payload: NotificationPayload) => {
        switch (type) {
          case "success":
            notifySuccess(payload.message, payload.title);
            break;
          case "error":
            notifyError(payload.message, payload.title);
            break;
          case "warning":
            notifyWarning(payload.message, payload.title);
            break;
          case "info":
            notifyInfo(payload.message, payload.title);
            break;
        }
      },
      success: notifySuccess,
      error: notifyError,
      warning: notifyWarning,
      info: notifyInfo,
    }),
    [],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};
