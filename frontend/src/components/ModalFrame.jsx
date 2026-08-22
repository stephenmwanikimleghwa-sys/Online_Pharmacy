import React from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Shared ops modal shell — calm header, no side-panel theater.
 */
const ModalFrame = ({
  isOpen,
  onClose,
  title,
  description = null,
  children,
  footer = null,
  maxWidthClass = 'max-w-3xl',
  bodyClassName = '',
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-frame-title"
    >
      <div
        className={`modal-card w-full ${maxWidthClass} max-h-[90vh] overflow-hidden flex flex-col`}
        style={{ borderRadius: 'var(--radius-surface)', background: 'var(--bg-card)' }}
      >
        <header
          className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6 shrink-0"
          style={{ borderBottom: '1px solid var(--border-primary)' }}
        >
          <div className="min-w-0">
            <h2
              id="modal-frame-title"
              className="text-lg sm:text-xl font-display font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </p>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg shrink-0"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </header>

        <div className={`flex-1 overflow-y-auto px-5 py-5 sm:px-6 ${bodyClassName}`}>
          {children}
        </div>

        {footer && (
          <footer
            className="px-5 py-4 sm:px-6 shrink-0 flex flex-wrap items-center justify-end gap-2"
            style={{ borderTop: '1px solid var(--border-primary)', background: 'var(--bg-card)' }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ModalFrame;
