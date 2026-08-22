import React from 'react';

/**
 * Calm page header shared across ops screens.
 */
const PageHeader = ({
  title,
  description,
  actions = null,
  eyebrow = null,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 ${className}`}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p
            className="text-xs font-semibold mb-1.5"
            style={{ color: 'var(--color-primary)' }}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className="text-2xl md:text-3xl font-display font-bold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
