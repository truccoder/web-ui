'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { trendingApi, type TrendingParams } from '../api';

/**
 * Query keys for `trending`.
 *
 * The filters are part of the key, so switching category or time range is a separate cached list
 * rather than a refetch of the same one — going back to a filter you already looked at is instant,
 * and the infinite-scroll pages you had loaded there are still loaded.
 */
export const trendingKeys = {
  all: ['trending'] as const,
  list: (params: Omit<TrendingParams, 'page'>) =>
    [...trendingKeys.all, params.category ?? 'all', params.timeRange ?? 'week'] as const,
};

const PAGE_SIZE = 20;

/**
 * An infinite list of trending items for the given filters.
 *
 * `hasNext` FROM THE PAYLOAD DECIDES WHEN TO STOP, rather than "the last page came back short".
 * The backend computes it from the real total, so it stays correct on the exact boundary where a
 * final page happens to be full — the case the short-page heuristic gets wrong.
 *
 * `staleTime` IS FIVE MINUTES because the source data cannot change faster than that: items arrive
 * from a crawl schedule, not from anything a user does. Refetching on every focus would spend
 * requests to redraw the identical list.
 */
export function useTrending(params: Omit<TrendingParams, 'page' | 'size'> = {}) {
  return useInfiniteQuery({
    queryKey: trendingKeys.list(params),
    queryFn: ({ pageParam }) =>
      trendingApi.getTrending({ ...params, page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    staleTime: 5 * 60_000,
  });
}
