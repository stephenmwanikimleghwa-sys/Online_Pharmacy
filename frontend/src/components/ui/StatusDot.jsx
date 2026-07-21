import React from 'react';

/**
 * A small pulsing status indicator.
 *
 * Accessibility: state is NOT conveyed by colour alone. Each tone also has a
 * distinct SHAPE (circle / diamond / square / ring) and an accessible text name
 * that is always exposed to screen readers (visually-hidden when no visible
 * label is shown). This satisfies WCAG 1.4.1 (Use of Color).
 *
 * Props:
 *  - tone: 'operational' | 'warning' | 'critical' | 'idle'
 *  - label: optional visible text rendered next to the dot
 *  - title: tooltip text (defaults to the tone's status name)
 */
const TONES = {
  operational: { color: '#10b981', name: 'Operational', shape: 'circle' },
  warning: { color: '#f59e0b', name: 'Warning', shape: 'diamond' },
  critical: { color: '#f43f5e', name: 'Critical', shape: 'square' },
  idle: { color: '#94a3b8', name: 'Idle', shape: 'ring' },
};

// border-radius per shape; the diamond is a rotated square.
const SHAPE_STYLE = {
  circle: { borderRadius: '9999px' },
  square: { borderRadius: '2px' },
  diamond: { borderRadius: '2px', transform: 'rotate(45deg)' },
  ring: { borderRadius: '9999px', background: 'transparent', border: '2px solid currentColor' },
};

export default function StatusDot({ tone = 'operational', label, title, className = '' }) {
  const t = TONES[tone] || TONES.operational;
  const shape = SHAPE_STYLE[t.shape];
  const accessibleName = title || t.name;
  const markStyle = t.shape === 'ring'
    ? { color: t.color, ...shape }
    : { background: t.color, ...shape };

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      role="status"
      title={accessibleName}
    >
      <span className="relative flex w-2.5 h-2.5" aria-hidden="true">
        {/* Pulsing halo — always a soft circle regardless of the core shape */}
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping"
          style={{ background: t.color }}
        />
        {/* Core mark: shape differs per tone so it reads without colour */}
        <span className="relative inline-flex w-2.5 h-2.5" style={markStyle} />
      </span>
      {label ? (
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      ) : (
        // Screen-reader-only status name when there is no visible label.
        <span className="sr-only">{accessibleName}</span>
      )}
    </span>
  );
}
