import { useRef } from 'react';
import { queryClient } from '../lib/queryClient';
import { STALE_TIMES } from '../lib/staleTimes';

export function usePrefetchOnHover(
  queryKey: unknown[],
  queryFn: () => Promise<unknown>,
  staleTime = STALE_TIMES.SLOW,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return {
    onMouseEnter: () => {
      timerRef.current = setTimeout(() => {
        void queryClient.prefetchQuery({ queryKey, queryFn, staleTime });
      }, 200);
    },
    onMouseLeave: () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
  };
}
