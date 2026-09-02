'use client';

import { useCallback, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMyProfile } from '@/features/security';
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
 * GET /v1/api/posts/public, cursor-paged. The `Bài viết` tab.
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
 *
 * `hashtag` NARROWS THE SAME ENDPOINT (B31) and is part of the query key, so switching the filter
 * on or off swaps cached lists rather than refetching one. Pass it already folded
 * (`normalizeHashtag`); `undefined` is the unfiltered feed.
 */
export function usePublicFeed(enabled = true, hashtag?: string) {
  return useInfiniteQuery({
    enabled,
    queryKey: newsfeedKeys.publicFeed(hashtag),
    queryFn: ({ pageParam }) => newsfeedApi.getPublicFeed(pageParam, PAGE_SIZE, hashtag),
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

/**
 * Resolve the id of the caller's most recently created post.
 *
 * WHY THIS EXISTS. `POST /v1/api/posts` answers **204 with no body** — the created post's id is
 * never returned (see `features/posts/api/post.ts`). So a composing screen that wants to send the
 * author to their new post's permalink has nothing to navigate to. This reads it back from
 * `GET /v1/api/users/{me}/posts`, which for the author includes posts still in moderation, newest
 * first — so the post that was just saved is `posts[0]`.
 *
 * It is a best-effort lookup, not a guarantee: a failure or an empty list returns `undefined`, and
 * the caller falls back to staying put. Recorded as backend debt B39 — the clean fix is for the
 * create endpoint to return the id (or a `Location` header).
 */
export function useResolveMyLatestPostId() {
  const { data: profile } = useMyProfile();
  const myId = profile?.id;

  return useCallback(async (): Promise<number | undefined> => {
    if (myId === undefined) return undefined;
    try {
      const page = await newsfeedApi.getUserPosts(myId, undefined, 1);
      return page.posts[0]?.postId ?? undefined;
    } catch {
      return undefined;
    }
  }, [myId]);
}

/** How many times `usePostApproval` re-checks before it stops and lets the notice stand. */
const APPROVAL_MAX_POLLS = 20;
/** Milliseconds between checks — moderation usually settles 1–2s after `AFTER_COMMIT`. */
const APPROVAL_POLL_MS = 3000;
/**
 * How many checks the page keeps a skeleton up for before it falls back to the pending notice.
 * Two covers the common case — the AI clears most posts within a poll or two — without leaving a
 * genuinely-pending post under a skeleton for long.
 */
const APPROVAL_GRACE_POLLS = 2;

/**
 * Has a just-created post cleared moderation yet? The permalink page uses this to choose between
 * rendering the post and showing a "chờ kiểm duyệt" notice.
 *
 * THERE IS NO ENDPOINT FOR THE MODERATION STATUS ITSELF. `GET /v1/api/posts/{id}` returns a post
 * to its own author whatever its `ModerationStatus` is (the backend's `PostVisibilityService`
 * short-circuits for the author), and `FeedPostDataDto` carries no status field — the admin queue
 * is the only surface that exposes one. Recorded as backend debt B39.
 *
 * WHAT THIS CHECKS INSTEAD: the author's own fan-out feed. `NewsfeedService.fanOutPost` always
 * writes an approved post into its author's own `feed:<id>` set, and it runs *only* on approval
 * (at creation when moderation is disabled; from the async moderation listener when the AI clears
 * the post). So "my new post is in my own feed" is an exact proxy for "APPROVED and visible to an
 * audience", and it holds for every visibility including PRIVATE. A post sitting in
 * PENDING_REVIEW or one that was REJECTED never lands there — which this hook reads as "still
 * pending", the safe default.
 *
 * Page 1 is enough: a brand-new post is scored by `createdAt`, so it is at rank 0 from the moment
 * it is fanned out. Polling stops after {@link APPROVAL_MAX_POLLS} (~1 min) so a rejected post
 * does not poll for ever; the page then shows the notice as a resting state.
 */
export function usePostApproval(postId: number | undefined, enabled: boolean) {
  const { data: profile } = useMyProfile();
  const myId = profile?.id;
  const [polls, setPolls] = useState(0);

  const active = enabled && postId !== undefined && myId !== undefined;

  const query = useQuery({
    queryKey: newsfeedKeys.approvalProbe(postId!),
    queryFn: async () => {
      setPolls((n) => n + 1);
      const page = await newsfeedApi.getFeed(1, 10, 'ALL');
      return page.posts.some((p) => p.postId === postId);
    },
    enabled: active,
    // Re-evaluated after every fetch: stop once the post shows up or we have tried enough times.
    refetchInterval: (q) =>
      q.state.data === true || q.state.dataUpdateCount >= APPROVAL_MAX_POLLS
        ? false
        : APPROVAL_POLL_MS,
    refetchOnWindowFocus: false,
    gcTime: 0,
    staleTime: 0,
  });

  const isApproved = query.data === true;
  const gaveUp = polls >= APPROVAL_MAX_POLLS;
  // Still "checking" — keep the skeleton up — while the first reads are in flight, so a post the
  // AI clears in a second or two never flashes the pending notice on the way in.
  const isChecking =
    active && !isApproved && !gaveUp && (query.isPending || polls < APPROVAL_GRACE_POLLS);

  return {
    /** The post is live — render it. */
    isApproved,
    /** Hold the skeleton; we do not know yet. */
    isChecking,
    /** We looked and it is not cleared — show the pending notice (polling may still flip it). */
    isPending: active && !isApproved && !isChecking,
  };
}

export function useRefreshFeed() {
  const queryClient = useQueryClient();
  return () => {
    // EVERY BRANCH, because a new post belongs in both the fan-out feed and the public one:
    // `/feed` fans it out to the author's own timeline and `/posts/public` is a query that will
    // now match it. Sweeping the shared `newsfeed` prefix is one call and cannot drift as branches
    // are added.
    queryClient.invalidateQueries({ queryKey: newsfeedKeys.all });
  };
}
