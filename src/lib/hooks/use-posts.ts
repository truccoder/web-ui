'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { newsfeedApi } from '@/lib/api/newsfeed';

const PAGE_SIZE = 10;

/**
 * The feed's cache key, exported so the cross-domain invalidators that need it
 * (`app/(main)/newsfeed/page.tsx` after `features/posts` creates a post, and `newsfeed.tsx`
 * after a reaction, comment or edit) import it instead of repeating the literal. P2.5 replaces
 * this whole hook with `features/newsfeed`, and the import breaking is the point: a magic
 * string would have gone on compiling while quietly matching nothing.
 */
export const NEWSFEED_QUERY_KEY = ['newsfeed'] as const;

export function useNewsfeed() {
  return useInfiniteQuery({
    queryKey: NEWSFEED_QUERY_KEY,
    queryFn: ({ pageParam = 1 }) =>
      newsfeedApi.getFeed(pageParam as number, PAGE_SIZE).then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });
}

/*
 * REMOVED AT P2.4d: `useCreatePost`, `useCreateBookPost`, `useUpdatePost`, `useDeletePost` and
 * the `toCreatePostRequest` adapter under them — superseded by the `features/posts` hooks of
 * the same names that `PostComposer` and the temporary `CreateEventForm` call.
 *
 * REMOVED AT P2.4'd: `useMyReaction`, `useUpsertReaction`, `useRemoveReaction`, `useComments`,
 * `useCreateComment`, `useUpdateComment` and `useDeleteComment` — the entire comment and
 * reaction surface, superseded now that the feed renders `ReactionBar` and `CommentThread`
 * from `features/posts`. `src/lib/api/posts.ts` was deleted with them: those seven calls were
 * all it had left.
 *
 * What survives here is not posts at all. `useNewsfeed` and the key above belong to the
 * `newsfeed` domain and go at P2.5, which is when this file stops existing; it still sits
 * under a posts-shaped name only because the feed query was never given one of its own.
 */
