import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { QUERY_KEYS } from '../lib/queryKeys';
import { STALE_TIMES } from '../lib/staleTimes';

export function useBranches() {
  return useQuery({
    queryKey: QUERY_KEYS.branches,
    queryFn: () => api.get('/auth/branches/').then((r) => r.data),
    staleTime: STALE_TIMES.VERY_SLOW,
  });
}
