export const STALE_TIMES = {
  STATIC: Infinity,
  VERY_SLOW: 60 * 60 * 1000,
  SLOW: 15 * 60 * 1000,
  MEDIUM: 5 * 60 * 1000,
  FAST: 60 * 1000,
  REAL_TIME: 0,
} as const;
