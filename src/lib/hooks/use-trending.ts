'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { trendingApi, type TrendingParams } from '@/lib/api/trending';

const PAGE_SIZE = 20;

export function useTrending(params: Omit<TrendingParams, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: ['trending', params.category, params.timeRange],
    queryFn: ({ pageParam = 1 }) =>
      trendingApi
        .getTrending({ ...params, page: pageParam as number, size: params.size ?? PAGE_SIZE })
        .then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    staleTime: 5 * 60_000,
  });
}
