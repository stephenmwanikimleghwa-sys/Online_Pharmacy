import React from 'react';

/**
 * Skeleton primitives built on the existing `.animate-shimmer` keyframe so
 * loading states match the real layout instead of a bare spinner.
 */

export function Skeleton({ className = '', style, rounded = 'rounded-lg' }) {
  return (
    <div
      className={`animate-shimmer ${rounded} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/** A single stat-card placeholder matching StatCard's shape. */
export function StatCardSkeleton({ withTrend = false }) {
  return (
    <div className="glass-card relative overflow-hidden rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-28" />
        </div>
        <Skeleton className="w-11 h-11" rounded="rounded-xl" />
      </div>
      {withTrend && <Skeleton className="h-8 w-full mt-3" />}
    </div>
  );
}

/** A grid of stat-card skeletons. */
export function StatGridSkeleton({ count = 3, withTrend = false }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} withTrend={withTrend} />
      ))}
    </div>
  );
}

/** A larger panel placeholder (list/table sections). */
export function PanelSkeleton({ rows = 4, className = '' }) {
  return (
    <div className={`glass-card rounded-2xl p-6 ${className}`}>
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 flex-1" style={{ maxWidth: `${70 - i * 6}%` }} />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
