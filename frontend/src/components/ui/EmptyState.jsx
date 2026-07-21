import React from 'react';

/**
 * Friendly empty-state block for "no data" sections. Uses design tokens so it
 * sits naturally inside glass cards instead of a bare grey line of text.
 *
 * Props:
 *  - icon: heroicon component
 *  - title: short heading
 *  - message: optional supporting line
 *  - tone: 'neutral' | 'positive' (positive = emerald, e.g. "all clear")
 *  - compact: tighter padding for inline use inside a card
 *  - action: optional node (button/link) shown under the message
 */
export default function EmptyState({
  icon: Icon,
  title,
  message,
  tone = 'neutral',
  compact = false,
  action,
}) {
  const chipBg = tone === 'positive' ? 'rgba(16, 185, 129, 0.14)' : 'var(--brand-mist)';
  const iconColor = tone === 'positive' ? '#10b981' : 'var(--color-primary)';

  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl border border-dashed ${compact ? 'py-8 px-4' : 'py-14 px-6'}`}
      style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-field)' }}
    >
      {Icon && (
        <span
          className={`flex items-center justify-center rounded-2xl mb-3 ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}
          style={{ background: chipBg }}
        >
          <Icon
            className={compact ? 'w-6 h-6' : 'w-8 h-8'}
            style={{ color: iconColor }}
          />
        </span>
      )}
      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </p>
      {message && (
        <p className="text-sm mt-1 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
