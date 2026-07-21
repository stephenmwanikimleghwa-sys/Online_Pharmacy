import React from 'react';
import CountUp from './CountUp';
import Sparkline from './Sparkline';

/**
 * Accent presets map a semantic tone to a colour used for the value text, the
 * icon chip tint, the sparkline, and the left accent bar. Colours are drawn
 * from Tailwind's palette so they read well on the glass surfaces in both
 * light and dark mode.
 */
const ACCENTS = {
  primary: { text: 'text-[var(--color-primary)]', chip: 'rgba(124, 58, 237, 0.14)', spark: 'var(--color-primary)', bar: 'var(--color-primary)' },
  emerald: { text: 'text-emerald-500', chip: 'rgba(16, 185, 129, 0.14)', spark: '#10b981', bar: '#10b981' },
  rose: { text: 'text-rose-500', chip: 'rgba(244, 63, 94, 0.14)', spark: '#f43f5e', bar: '#f43f5e' },
  amber: { text: 'text-amber-500', chip: 'rgba(245, 158, 11, 0.16)', spark: '#f59e0b', bar: '#f59e0b' },
  indigo: { text: 'text-indigo-500', chip: 'rgba(99, 102, 241, 0.14)', spark: '#6366f1', bar: '#6366f1' },
  blue: { text: 'text-blue-500', chip: 'rgba(59, 130, 246, 0.14)', spark: '#3b82f6', bar: '#3b82f6' },
};

/**
 * Reusable metric card built on the app's glass design tokens.
 *
 * Props:
 *  - label: small uppercase caption
 *  - value: number (animated with CountUp) or string (rendered as-is)
 *  - format: (n) => string for numeric values (e.g. money formatter)
 *  - icon: heroicon component
 *  - accent: key of ACCENTS (default 'primary')
 *  - trend: number[] for an optional sparkline
 *  - hint: optional small helper text under the value
 *  - delayIndex: 1..6 for the card-enter stagger
 *  - onClick: makes the whole card a button
 */
export default function StatCard({
  label,
  value,
  format,
  icon: Icon,
  accent = 'primary',
  trend,
  hint,
  delayIndex,
  onClick,
  className = '',
}) {
  const a = ACCENTS[accent] || ACCENTS.primary;
  const stagger = delayIndex ? `card-enter card-enter-${delayIndex}` : '';
  const isNumeric = typeof value === 'number';

  const clickable = typeof onClick === 'function';
  const Wrapper = clickable ? 'button' : 'div';

  return (
    <Wrapper
      type={clickable ? 'button' : undefined}
      onClick={onClick}
      className={`glass-card relative overflow-hidden rounded-2xl p-5 text-left w-full ${stagger} ${clickable ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Left accent bar */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: a.bar, opacity: 0.85 }}
      />

      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p
            className="text-[11px] font-bold uppercase tracking-wider mb-1 truncate"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}
          </p>
          <p className={`text-2xl font-bold ${a.text}`}>
            {isNumeric ? (
              <CountUp value={value} format={format} />
            ) : (
              value
            )}
          </p>
          {hint && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {hint}
            </p>
          )}
        </div>

        {Icon && (
          <span
            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: a.chip }}
          >
            <Icon className={`w-6 h-6 ${a.text}`} />
          </span>
        )}
      </div>

      {trend && trend.length > 1 && (
        <div className="mt-3 pl-2">
          <Sparkline data={trend} color={a.spark} width={220} height={34} className="w-full" />
        </div>
      )}
    </Wrapper>
  );
}
