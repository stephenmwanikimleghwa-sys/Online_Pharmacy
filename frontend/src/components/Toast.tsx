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

/** Glass-morphism colour config using CSS-var token classes */
const toastConfig: Record<
  ToastType,
  { glassClass: string; iconColor: string; titleColor: string; msgColor: string }
> = {
  success: {
    glassClass: 'toast-success-glass',
    iconColor: '#10b981',
    titleColor: 'var(--text-primary)',
    msgColor: 'var(--text-secondary)'
  },
  error: {
    glassClass: 'toast-error-glass',
    iconColor: '#dc2626',
    titleColor: 'var(--text-primary)',
    msgColor: 'var(--text-secondary)'
  },
  warning: {
    glassClass: 'toast-warning-glass',
    iconColor: '#f59e0b',
    titleColor: 'var(--text-primary)',
    msgColor: 'var(--text-secondary)'
  },
  info: {
    glassClass: 'toast-info-glass',
    iconColor: 'var(--color-primary)',
    titleColor: 'var(--text-primary)',
    msgColor: 'var(--text-secondary)'
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { ...toast, id, duration: toast.duration ?? 5000 };
    setToasts(prev => [...prev, newToast]);
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => removeToast(id), newToast.duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => { setToasts([]); }, []);

  const success = useCallback((message: string, title?: string) =>
    addToast({ type: 'success', message, title }), [addToast]);
  const error = useCallback((message: string, title?: string) =>
    addToast({ type: 'error', message, title, duration: 8000 }), [addToast]);
  const warning = useCallback((message: string, title?: string) =>
    addToast({ type: 'warning', message, title }), [addToast]);
  const info = useCallback((message: string, title?: string) =>
    addToast({ type: 'info', message, title }), [addToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') clearToasts(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearToasts]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({
  toasts, onRemove
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
  toast, onRemove
}) => {
  const config = toastConfig[toast.type];
  const Icon = toastIcons[toast.type];

  return (
    <div
      className={`pointer-events-auto max-w-md w-full toast-glass ${config.glassClass} p-4 fade-in`}
      role="alert"
      aria-labelledby={`toast-title-${toast.id}`}
    >
      <div className="flex items-start gap-3">
        <Icon
          className="h-5 w-5 flex-shrink-0"
          style={{ color: config.iconColor }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h3
              id={`toast-title-${toast.id}`}
              className="font-semibold text-sm mb-0.5"
              style={{ color: config.titleColor }}
            >
              {toast.title}
            </h3>
          )}
          <p className="text-sm" style={{ color: config.msgColor }}>{toast.message}</p>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium underline focus:outline-none"
              style={{ color: 'var(--color-primary)' }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 rounded focus:outline-none"
          style={{ color: 'var(--text-secondary)' }}
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
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export default ToastProvider;
