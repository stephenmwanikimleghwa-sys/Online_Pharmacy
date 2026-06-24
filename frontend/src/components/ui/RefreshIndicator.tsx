import React from 'react';

interface RefreshIndicatorProps {
  isFetching?: boolean;
  isLoading?: boolean;
}

export function RefreshIndicator({ isFetching, isLoading }: RefreshIndicatorProps) {
  if (isLoading || !isFetching) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium opacity-60"
      style={{ color: 'var(--text-secondary)' }}
    >
      <span
        className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"
        aria-hidden
      />
      Refreshing…
    </span>
  );
}

export default RefreshIndicator;
