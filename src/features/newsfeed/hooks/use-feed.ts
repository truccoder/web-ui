'use client';

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { newsfeedApi } from '../api/feed';
import type { FeedApiScope } from '../types/feed';
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
export function useNewsfeed(enabled = true, scope: FeedApiScope = 'ALL') {
  return useInfiniteQuery({
    enabled,
    // `scope` IS PART OF THE KEY. Without it the two tabs share one cache entry and switching
    // between them shows the other tab's posts until a refetch lands.
    queryKey: newsfeedKeys.feed(scope),
    queryFn: ({ pageParam }) => newsfeedApi.getFeed(pageParam, PAGE_SIZE, scope),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });
}

/**
 * GET /v1/api/posts/public, cursor-paged. The `Tất cả` tab.
 *
 * `initialPageParam` IS `undefined`, NOT 0 OR 1. The first request must send no cursor at all —
 * the backend reads "no cursor" as "from the newest", while `cursor=0` would ask for posts after
 * id 0 on a table whose ids climb, i.e. the oldest page. axios drops undefined params, so the
 * first call is a bare `?limit=10`.
 *
 * `getNextPageParam` returns `nextCursor` verbatim rather than deriving anything: with a cursor
 * the server owns the position entirely, which is the property that makes it safe against posts
 * being written while the reader pages. `?? undefined` because the DTO says null and react-query
 * reads undefined as "no more pages".
 */
export function usePublicFeed(enabled = true) {
  return useInfiniteQuery({
    enabled,
    queryKey: newsfeedKeys.publicFeed(),
    queryFn: ({ pageParam }) => newsfeedApi.getPublicFeed(pageParam, PAGE_SIZE),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
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
/**
 * One person's posts, cursor-paged — the posts section of a profile.
 *
 * `undefined` KEEPS IT IDLE. The public profile resolves a handle to an id before it can ask, so
 * the query has to be able to wait rather than fire for `NaN`.
 */
export function useUserPosts(userId: number | undefined) {
  return useInfiniteQuery({
    queryKey: newsfeedKeys.userPosts(userId!),
    queryFn: ({ pageParam }) => newsfeedApi.getUserPosts(userId!, pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.hasMore ? (last.nextCursor ?? undefined) : undefined),
    enabled: userId !== undefined,
  });
}

/**
 * One post by id — what the permalink page reads.
 *
 * `retry: false` because the interesting failure is a 404 and it is final: the post is deleted,
 * or it is not visible to this reader (the backend answers 404 for both, deliberately, so the
 * endpoint cannot be used to probe what exists). Three retries would only delay the empty state.
 */
export function usePost(postId: number | undefined) {
  return useQuery({
    queryKey: newsfeedKeys.post(postId!),
    queryFn: () => newsfeedApi.getPost(postId!),
    enabled: postId !== undefined,
    retry: false,
  });
}

export function useRefreshFeed() {
  const queryClient = useQueryClient();
  return () => {
    // BOTH BRANCHES, because a new post belongs in both tabs: `/feed` fans it out to the author's
    // own timeline and `/posts/public` is a query that will now match it. Sweeping the shared
    // `all` prefix is one call and cannot drift as branches are added.
    queryClient.invalidateQueries({ queryKey: newsfeedKeys.all });
  };
}
