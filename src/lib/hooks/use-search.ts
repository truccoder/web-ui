'use client';

import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/lib/api/search';

export function useSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchApi.searchAll(query).then((r) => r.data),
    enabled: enabled && query.length >= 2,
    staleTime: 60_000,
  });
}

export function useSearchUsers(query: string, page = 1, size = 10) {
  return useQuery({
    queryKey: ['search', 'users', query, page, size],
    queryFn: () => searchApi.searchUsers(query, page, size).then((r) => r.data),
    enabled: query.length >= 2,
    staleTime: 60_000,
  });
}

export function useSearchPosts(query: string, page = 1, size = 10) {
  return useQuery({
    queryKey: ['search', 'posts', query, page, size],
    queryFn: () => searchApi.searchPosts(query, page, size).then((r) => r.data),
    enabled: query.length >= 2,
    staleTime: 60_000,
  });
}
