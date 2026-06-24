import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { QUERY_KEYS } from '../lib/queryKeys';
import { STALE_TIMES } from '../lib/staleTimes';
import { unwrapList } from '../utils/parseApiData';

export function useDispensingLogs(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.dispensingLogs(filters),
    queryFn: async () => {
      const res = await api.get('/inventory/dispensations/', { params: filters });
      return unwrapList(res.data);
    },
    staleTime: STALE_TIMES.MEDIUM,
  });
}

export function useStaffActivityLogs(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.staffActivityLogs(filters),
    queryFn: async () => {
      const res = await api.get('/auth/activity-logs/', {
        params: { page_size: 100, ...filters },
        skipGlobalErrorNotification: true,
      });
      const payload = res.data?.data ?? res.data;
      return Array.isArray(payload) ? payload : payload?.results || [];
    },
    staleTime: STALE_TIMES.MEDIUM,
  });
}
