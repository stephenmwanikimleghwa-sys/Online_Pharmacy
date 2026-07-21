import React, { useId } from 'react';

/**
 * Tiny inline area/line sparkline drawn as SVG. No chart library needed.
 *
 * Props:
 *  - data: number[]  (values to plot)
 *  - width, height: px (default 96 x 32)
 *  - color: stroke/fill colour (default brand primary via CSS var)
 *  - strokeWidth: px (default 2)
 */
export default function Sparkline({
  data = [],
  width = 96,
  height = 32,
  color = 'var(--color-primary)',
  strokeWidth = 2,
  className,
}) {
  const gradId = useId();
  const points = data.filter((n) => typeof n === 'number' && !Number.isNaN(n));

  if (points.length < 2) {
    // Not enough data to draw a trend — render a flat baseline so layout is stable.
    return (
      <svg width={width} height={height} className={className} aria-hidden="true">
        <line
          x1="0"
          y1={height - strokeWidth}
          x2={width}
          y2={height - strokeWidth}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = strokeWidth;
  const usableH = height - pad * 2;
  const stepX = width / (points.length - 1);

  const coords = points.map((v, i) => {
    const x = i * stepX;
    const y = pad + usableH - ((v - min) / range) * usableH;
    return [x, y];
  });

  const linePath = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');

  const areaPath =
    `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`spark-${gradId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
