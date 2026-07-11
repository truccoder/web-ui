'use client';

import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/lib/api/search';

export function useSearch(query: string, size = 20, enabled = true) {
  return useQuery({
    queryKey: ['search', query, size],
    queryFn: () => searchApi.searchAll(query, size).then((r) => r.data),
    enabled: enabled && query.length >= 2,
    staleTime: 60_000,
  });
}
