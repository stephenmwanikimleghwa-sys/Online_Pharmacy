import React from 'react';

/**
 * A small pulsing status indicator. Replaces ad-hoc emoji status markers with
 * something that fits the design system.
 *
 * Props:
 *  - tone: 'operational' | 'warning' | 'critical' | 'idle'
 *  - label: optional text rendered next to the dot
 *  - title: tooltip text
 */
const TONES = {
  operational: '#10b981',
  warning: '#f59e0b',
  critical: '#f43f5e',
  idle: '#94a3b8',
};

export default function StatusDot({ tone = 'operational', label, title, className = '' }) {
  const color = TONES[tone] || TONES.operational;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={title}>
      <span className="relative flex w-2.5 h-2.5" aria-hidden="true">
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping"
          style={{ background: color }}
        />
        <span
          className="relative inline-flex rounded-full w-2.5 h-2.5"
          style={{ background: color }}
        />
      </span>
      {label && (
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
