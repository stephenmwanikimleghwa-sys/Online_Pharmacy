import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { queryClient } from '../lib/queryClient';
import { QUERY_KEYS } from '../lib/queryKeys';
import { STALE_TIMES } from '../lib/staleTimes';

export function useSuppliers() {
  return useQuery({
    queryKey: QUERY_KEYS.suppliers,
    queryFn: () => api.get('/inventory/suppliers/').then((r) => r.data),
    staleTime: STALE_TIMES.SLOW,
  });
}

export function useSupplierDetail(id: number) {
  const query = useQuery({
    queryKey: QUERY_KEYS.supplierDetail(id),
    queryFn: () => api.get(`/inventory/suppliers/${id}/`).then((r) => r.data),
    staleTime: STALE_TIMES.SLOW,
    enabled: !!id,
  });

  useEffect(() => {
    if (!id || !query.data) return;
    void queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.supplierProducts(id),
      queryFn: () =>
        api.get(`/inventory/suppliers/${id}/products-supplied/`).then((r) => r.data),
      staleTime: STALE_TIMES.SLOW,
    });
  }, [id, query.data]);

  return query;
}

export function useSupplierProducts(supplierId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.supplierProducts(supplierId),
    queryFn: () =>
      api.get(`/inventory/suppliers/${supplierId}/products-supplied/`).then((r) => r.data),
    staleTime: STALE_TIMES.SLOW,
    enabled: !!supplierId,
  });
}

export function useSupplierCompare(productId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.supplierCompare(productId),
    queryFn: () =>
      api
        .get('/inventory/suppliers/compare/', { params: { product_id: productId } })
        .then((r) => r.data),
    staleTime: STALE_TIMES.SLOW,
    enabled: !!productId,
  });
}
