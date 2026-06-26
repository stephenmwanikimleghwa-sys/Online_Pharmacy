import api from '../services/api';
import { queryClient } from './queryClient';
import { QUERY_KEYS } from './queryKeys';
import { STALE_TIMES } from './staleTimes';
import { unwrapList } from '../utils/parseApiData';

export async function prefetchOnLogin(activeBranchId?: number) {
  const tasks: Promise<unknown>[] = [
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.branches,
      queryFn: () => api.get('/auth/branches/').then((r) => r.data),
      staleTime: STALE_TIMES.VERY_SLOW,
    }),
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.suppliers,
      queryFn: () => api.get('/inventory/suppliers/').then((r) => r.data),
      staleTime: STALE_TIMES.SLOW,
    }),
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.customers,
      queryFn: () => api.get('/auth/customers/').then((r) => r.data),
      staleTime: STALE_TIMES.SLOW,
    }),
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.dashboardGlobal,
      queryFn: () => api.get('/dashboard/global-overview/').then((r) => r.data),
      staleTime: STALE_TIMES.FAST,
    }),
  ];

  if (activeBranchId) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.dashboardBranch(activeBranchId),
        queryFn: () => api.get('/dashboard/branch-operations/').then((r) => r.data),
        staleTime: STALE_TIMES.FAST,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.inventory(activeBranchId, { per_page: 5000 }),
        queryFn: async () => {
          const res = await api.get('/inventory/list/', {
            params: { per_page: 5000 },
            skipGlobalErrorNotification: true,
          });
          const data = res.data || {};
          return {
            products: data.products || data.results || unwrapList(data),
            totalItems: data.totalItems ?? data.products?.length ?? 0,
          };
        },
        staleTime: STALE_TIMES.SLOW,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.lowStockAlerts(activeBranchId),
        queryFn: () =>
          api.get('/inventory/low-stock/', { params: { branch: activeBranchId } }).then((r) => r.data),
        staleTime: STALE_TIMES.MEDIUM,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.expiryAlerts(activeBranchId),
        queryFn: () =>
          api.get('/inventory/expiry/summary/', { params: { branch: activeBranchId } }).then((r) => r.data),
        staleTime: STALE_TIMES.MEDIUM,
      }),
    );
  }

  await Promise.allSettled(tasks);
}
