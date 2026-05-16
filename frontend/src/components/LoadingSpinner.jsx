import React from 'react';

const sizeMap = {
  sm: { outer: 20, inner: 12 },
  md: { outer: 36, inner: 22 },
  lg: { outer: 56, inner: 36 },
};

const LoadingSpinner = ({ size = 'md', label = 'Loading...' }) => {
  const { outer, inner } = sizeMap[size] ?? sizeMap.md;

  return (
    <div
      className="spinner-premium"
      style={{ width: outer, height: outer }}
      role="status"
      aria-label={label}
    >
      {/* Outer ring — primary colour */}
      <span
        className="ring-a"
        style={{ width: outer, height: outer }}
        aria-hidden="true"
      />
      {/* Inner ring — accent colour */}
      <span
        className="ring-b"
        style={{ width: inner, height: inner }}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default LoadingSpinner;