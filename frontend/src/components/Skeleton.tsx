import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}) => {
  const baseClasses = '';
  const baseStyle: React.CSSProperties = { background: 'var(--bg-field)' };

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={{ ...baseStyle, ...style }}
      aria-hidden="true"
      role="presentation"
    />
  );
};

// Product Card Skeleton
export const ProductCardSkeleton: React.FC = () => (
  <div className="glass-card rounded-lg overflow-hidden">
    <Skeleton variant="rectangular" height={192} className="w-full" />
    <div className="p-4 space-y-3">
      <Skeleton variant="text" width="60%" height={20} />
      <Skeleton variant="text" width="40%" height={16} />
      <Skeleton variant="text" width="80%" height={16} />
      <div className="flex justify-between items-center pt-2">
        <Skeleton variant="text" width="30%" height={24} />
        <Skeleton variant="rectangular" width={40} height={40} />
      </div>
    </div>
  </div>
);

// Table Skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 4 }) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex gap-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={`header-${i}`} variant="text" width="20%" height={20} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="flex gap-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton
            key={`cell-${rowIndex}-${colIndex}`}
            variant="text"
            width={colIndex === 0 ? '15%' : '20%'}
            height={16}
          />
        ))}
      </div>
    ))}
  </div>
);

// Dashboard Stats Skeleton
export const StatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="glass-card rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton variant="circular" width={48} height={48} />
          <Skeleton variant="text" width={60} height={16} />
        </div>
        <Skeleton variant="text" width="40%" height={14} />
        <Skeleton variant="text" width="30%" height={28} className="mt-2" />
      </div>
    ))}
  </div>
);

// Form Skeleton
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
  <div className="space-y-6">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton variant="text" width="25%" height={16} />
        <Skeleton variant="rectangular" height={44} className="w-full" />
      </div>
    ))}
    <Skeleton variant="rectangular" height={48} width="30%" className="rounded-lg" />
  </div>
);

// List Skeleton
export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 data-cell rounded-lg">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" height={16} />
          <Skeleton variant="text" width="60%" height={14} />
        </div>
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>
    ))}
  </div>
);

export default Skeleton;
