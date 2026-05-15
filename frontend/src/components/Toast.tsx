import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const toastIcons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationCircleIcon,
  info: InformationCircleIcon
};

const toastColors = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-500 dark:text-green-400',
    title: 'text-green-900 dark:text-green-100',
    message: 'text-green-700 dark:text-green-300'
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-500 dark:text-red-400',
    title: 'text-red-900 dark:text-red-100',
    message: 'text-red-700 dark:text-red-300'
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-500 dark:text-yellow-400',
    title: 'text-yellow-900 dark:text-yellow-100',
    message: 'text-yellow-700 dark:text-yellow-300'
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-primary dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    message: 'text-primary dark:text-blue-300'
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback((message: string, title?: string) => {
    return addToast({ type: 'success', message, title });
  }, [addToast]);

  const error = useCallback((message: string, title?: string) => {
    return addToast({ type: 'error', message, title, duration: 8000 });
  }, [addToast]);

  const warning = useCallback((message: string, title?: string) => {
    return addToast({ type: 'warning', message, title });
  }, [addToast]);

  const info = useCallback((message: string, title?: string) => {
    return addToast({ type: 'info', message, title });
  }, [addToast]);

  // Keyboard shortcut to dismiss all toasts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearToasts();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearToasts]);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, clearToasts, success, error, warning, info }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({
  toasts,
  onRemove
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({
  toast,
  onRemove
}) => {
  const colors = toastColors[toast.type];
  const Icon = toastIcons[toast.type];

  return (
    <div
      className={`pointer-events-auto max-w-md w-full ${colors.bg} ${colors.border} border rounded-lg shadow-lg p-4 transition-all duration-300 transform animate-slide-in`}
      role="alert"
      aria-labelledby={`toast-title-${toast.id}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 ${colors.icon}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h3
              id={`toast-title-${toast.id}`}
              className={`font-semibold text-sm ${colors.title}`}
            >
              {toast.title}
            </h3>
          )}
          <p className={`text-sm ${colors.message}`}>{toast.message}</p>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium underline focus:outline-none focus:ring-2 focus:ring-offset-2 "
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2  rounded"
          aria-label="Dismiss notification"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;
