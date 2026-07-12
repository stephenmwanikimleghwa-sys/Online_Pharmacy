import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { QUERY_KEYS } from '../lib/queryKeys';
import { STALE_TIMES } from '../lib/staleTimes';
import { unwrapList } from '../utils/parseApiData';
import { useActiveBranch } from './useActiveBranch';

export function useProducts(filters: Record<string, unknown> = {}) {
  const { activeBranch } = useActiveBranch();
  return useQuery({
    queryKey: QUERY_KEYS.products(activeBranch?.id, filters),
    queryFn: () =>
      api
        .get('/products/', {
          params: { branch: activeBranch?.id, ...filters },
        })
        .then((r) => r.data),
    staleTime: STALE_TIMES.SLOW,
    enabled: !!activeBranch?.id,
  });
}

export function useInventoryList(filters: Record<string, unknown> = {}) {
  const { activeBranch } = useActiveBranch();
  // Use server-side pagination: default 50 items per page.
  // Callers can pass { per_page, page, search, ... } via filters.
  const params = { per_page: 50, ...filters };
  return useQuery({
    queryKey: QUERY_KEYS.inventory(activeBranch?.id, params),
    queryFn: async () => {
      const res = await api.get('/inventory/list/', {
        params,
        skipGlobalErrorNotification: true,
      });
      const data = res.data || {};
      const products = data.products || data.results || unwrapList(data);
      return {
        products,
        totalItems: data.totalItems ?? data.total_count ?? products.length,
        totalPages: data.totalPages ?? data.num_pages ?? 1,
        currentPage: data.currentPage ?? data.page ?? 1,
        raw: data,
      };
    },
    staleTime: STALE_TIMES.MEDIUM,
    refetchOnWindowFocus: false,
    enabled: !!activeBranch?.id,
  });
}

export function useProductDetail(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.productDetail(id),
    queryFn: () => api.get(`/products/${id}/`).then((r) => r.data),
    staleTime: STALE_TIMES.SLOW,
    enabled: !!id,
  });
}

export function useProductSearch(
  term: string,
  branchId?: number,
  context = 'otc',
) {
  return useQuery({
    queryKey: QUERY_KEYS.productSearch(term, branchId, context),
    queryFn: async () => {
      const res = await api.get('/products/', {
        params: { search: term, branch: branchId, per_page: 50 },
      });
      return unwrapList(res.data);
    },
    staleTime: STALE_TIMES.REAL_TIME,
    enabled: term.trim().length > 0 && !!branchId,
  });
}

export function useProductAvailability(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.productAvailability(id),
    queryFn: () => api.get(`/products/${id}/availability/`).then((r) => r.data),
    staleTime: STALE_TIMES.MEDIUM,
    enabled: !!id,
  });
}



export function useLowStockAlerts(branchId?: number) {
  return useQuery({
    queryKey: QUERY_KEYS.lowStockAlerts(branchId ?? 0),
    queryFn: () =>
      api
        .get('/inventory/low-stock/', {
          params: branchId ? { branch: branchId } : {},
          skipGlobalErrorNotification: true,
        })
        .then((r) => r.data),
    staleTime: STALE_TIMES.MEDIUM,
    enabled: !!branchId,
  });
}
