import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { QUERY_KEYS } from '../lib/queryKeys';
import { STALE_TIMES } from '../lib/staleTimes';

export function useExpiryAlerts(branchId?: number) {
  return useQuery({
    queryKey: QUERY_KEYS.expiryAlerts(branchId ?? 0),
    queryFn: () =>
      api
        .get('/inventory/expiry/summary/', {
          params: branchId ? { branch: branchId } : {},
        })
        .then((r) => r.data),
    staleTime: STALE_TIMES.MEDIUM,
    enabled: !!branchId,
  });
}
