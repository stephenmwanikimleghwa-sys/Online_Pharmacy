import React, { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 (or its previous value) up to `value` on mount and
 * whenever `value` changes. Respects prefers-reduced-motion.
 *
 * Props:
 *  - value: target number
 *  - duration: ms (default 900)
 *  - format: (n) => string, applied to the animated value
 *  - decimals: round to N decimals during animation (default 0)
 */
export default function CountUp({ value = 0, duration = 900, format, decimals = 0, className, style }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setDisplay(target);
      return undefined;
    }

    const from = fromRef.current;
    const start = performance.now();
    // easeOutCubic
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const current = from + (target - from) * ease(t);
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, duration]);

  const rounded =
    decimals > 0
      ? Number(display.toFixed(decimals))
      : Math.round(display);
  const text = format ? format(rounded) : rounded.toLocaleString();

  return (
    <span className={className} style={style}>
      {text}
    </span>
  );
}
