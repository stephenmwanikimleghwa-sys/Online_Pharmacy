import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { QUERY_KEYS } from '../lib/queryKeys';
import { STALE_TIMES } from '../lib/staleTimes';
import { unwrapList } from '../utils/parseApiData';
import { useActiveBranch } from './useActiveBranch';

export function useTransfers(filters: Record<string, unknown> = {}) {
  const { activeBranch } = useActiveBranch();
  return useQuery({
    queryKey: QUERY_KEYS.transfers(activeBranch?.id, filters),
    queryFn: async () => {
      const res = await api.get('/inventory/transfers/', { params: filters });
      return unwrapList(res.data);
    },
    staleTime: STALE_TIMES.MEDIUM,
    enabled: !!activeBranch?.id,
  });
}

export function useRestockRequests(status?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.restockRequests(status),
    queryFn: async () => {
      const res = await api.get('/inventory/restock-requests/', {
        params: status ? { status } : {},
      });
      return unwrapList(res.data);
    },
    staleTime: STALE_TIMES.MEDIUM,
  });
}

export function useStockIntakes(filters: Record<string, unknown> = {}) {
  const { activeBranch } = useActiveBranch();
  return useQuery({
    queryKey: QUERY_KEYS.stockIntakes({ branchId: activeBranch?.id, ...filters }),
    queryFn: async () => {
      const res = await api.get('/inventory/stock-intake/', { params: filters });
      return unwrapList(res.data);
    },
    staleTime: STALE_TIMES.MEDIUM,
    enabled: !!activeBranch?.id,
  });
}
