import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { QUERY_KEYS } from '../lib/queryKeys';
import { STALE_TIMES } from '../lib/staleTimes';

export function useDashboardGlobal() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboardGlobal,
    queryFn: () => api.get('/dashboard/global-overview/').then((r) => r.data),
    staleTime: STALE_TIMES.FAST,
    refetchInterval: 60 * 1000,
  });
}

export function useDashboardBranch(branchId?: number) {
  return useQuery({
    queryKey: QUERY_KEYS.dashboardBranch(branchId ?? 0),
    queryFn: () => api.get('/dashboard/branch-operations/').then((r) => r.data),
    staleTime: STALE_TIMES.FAST,
    refetchInterval: 60 * 1000,
    enabled: !!branchId,
  });
}
