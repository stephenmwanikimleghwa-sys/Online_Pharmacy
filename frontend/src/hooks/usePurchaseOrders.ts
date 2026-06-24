import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { QUERY_KEYS } from '../lib/queryKeys';
import { STALE_TIMES } from '../lib/staleTimes';
import { unwrapList } from '../utils/parseApiData';

export function usePurchaseOrders(branchId?: number) {
  return useQuery({
    queryKey: QUERY_KEYS.purchaseOrders(branchId),
    queryFn: async () => {
      const res = await api.get('/purchase-orders/', {
        params: branchId ? { branch: branchId } : {},
      });
      return unwrapList(res.data);
    },
    staleTime: STALE_TIMES.SLOW,
  });
}

export function usePurchaseOrderDetail(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.purchaseOrderDetail(id),
    queryFn: () => api.get(`/purchase-orders/${id}/`).then((r) => r.data),
    staleTime: STALE_TIMES.SLOW,
    enabled: !!id,
  });
}
