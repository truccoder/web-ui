'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { newsfeedApi } from '../api/feed';
import { newsfeedKeys } from './keys';

/** How many posts one request asks for. Matches the backend's own default. */
const PAGE_SIZE = 10;

/**
 * GET /v1/api/feed, paged.
 *
 * INFINITE RATHER THAN PAGED, because `hasMore` is the only thing the response says about
 * what comes next: the backend reads a Redis sorted set by range and never reports a total,
 * so there is no page count to render and no way to jump to a page. "Keep asking until
 * `hasMore` is false" is the whole contract.
 *
 * `getNextPageParam` reads `lastPage.page + 1` rather than counting fetched pages, so a
 * refetch that returns a different page number cannot desynchronise the cursor from the
 * server's idea of where it is.
 */
export function useNewsfeed() {
  return useInfiniteQuery({
    queryKey: newsfeedKeys.feed(),
    queryFn: ({ pageParam }) => newsfeedApi.getFeed(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });
}

/**
 * Refetch the feed.
 *
 * EXISTS SO A COMPOSING SCREEN DOES NOT HAVE TO KNOW THIS FEATURE'S QUERY KEY. `/newsfeed` used
 * to import `newsfeedKeys` and call `invalidateQueries` itself, which made the page hold a piece
 * of cache wiring — the thing Phase 3.3 asks routes to stop doing. The key is this module's
 * business; the page's business is saying "something changed".
 *
 * IT IS NEEDED AT ALL because `features/posts` deliberately refuses to invalidate another
 * domain's cache (CLAUDE.md §4): its mutations return `void` and take an `onSuccess`, and this is
 * what the composing screen passes. That indirection is the boundary working, not overhead.
 */
export function useRefreshFeed() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: newsfeedKeys.feed() });
  };
}
