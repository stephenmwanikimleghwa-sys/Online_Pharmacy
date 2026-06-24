import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { QUERY_KEYS } from '../lib/queryKeys';
import { STALE_TIMES } from '../lib/staleTimes';
import { unwrapList } from '../utils/parseApiData';

export function useCustomers() {
  return useQuery({
    queryKey: QUERY_KEYS.customers,
    queryFn: async () => {
      const res = await api.get('/auth/customers/');
      return unwrapList(res.data);
    },
    staleTime: STALE_TIMES.SLOW,
  });
}

export function useCustomerDetail(customerId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.customerDetail(customerId),
    queryFn: () => api.get(`/auth/customers/${customerId}/`).then((r) => r.data),
    staleTime: STALE_TIMES.SLOW,
    enabled: !!customerId,
  });
}

export function useCustomerDebtHistory(customerId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.customerDebtHistory(customerId),
    queryFn: () => api.get(`/auth/customers/${customerId}/debt/`).then((r) => r.data),
    staleTime: STALE_TIMES.MEDIUM,
    enabled: !!customerId,
  });
}
