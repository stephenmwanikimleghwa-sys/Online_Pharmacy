import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { QUERY_KEYS } from '../lib/queryKeys';
import { STALE_TIMES } from '../lib/staleTimes';
import { unwrapList } from '../utils/parseApiData';

export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: async () => {
      const res = await api.get('/auth/admin/users/');
      return unwrapList(res.data);
    },
    staleTime: STALE_TIMES.SLOW,
  });
}

export function useUserDetail(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.userDetail(id),
    queryFn: () => api.get(`/auth/admin/users/${id}/`).then((r) => r.data),
    staleTime: STALE_TIMES.SLOW,
    enabled: !!id,
  });
}
