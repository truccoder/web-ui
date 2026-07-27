'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { postsApi } from '@/lib/api/posts';
import { newsfeedApi } from '@/lib/api/newsfeed';
import { getErrorMessage } from '@/lib/api/error';
import type { CreateCommentRequest, UpdateCommentRequest, ReactionType } from '@/lib/types';

const PAGE_SIZE = 10;

/**
 * The feed's cache key, exported so the one cross-domain invalidator that needs it
 * (`app/(main)/newsfeed/page.tsx`, refreshing after `features/posts` creates a post) imports it
 * instead of repeating the literal. P2.5 replaces this whole hook with `features/newsfeed`, and
 * the import breaking is the point: a magic string would have gone on compiling while quietly
 * matching nothing.
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
 * REMOVED AT P2.4d: `useCreatePost`, `useCreateBookPost`, `useUpdatePost`, `useDeletePost`, and
 * the `toCreatePostRequest` adapter that sat under them. All four are superseded by the
 * `features/posts` hooks of the same names, which the new `PostComposer` and the temporary
 * `CreateEventForm` now call.
 *
 * What is left in this file belongs to other domains or other cycles and therefore has no
 * replacement to be deleted in favour of yet: `useNewsfeed` is the `newsfeed` domain (P2.5),
 * reactions and comments are posts cycle 2 (P2.4'). Guardrail B — one domain, one checkpoint.
 */

// The viewer's current reaction on a post (null reactionType when none) — lets the UI
// render the true prior state on load instead of toggling blind.
export function useMyReaction(postId: number, enabled = true) {
  return useQuery({
    queryKey: ['my-reaction', postId],
    queryFn: () => postsApi.getMyReaction(postId).then((r) => r.data),
    enabled,
  });
}

export function useUpsertReaction(postId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (reactionType: ReactionType) =>
      postsApi.upsertReaction(postId, { reactionType }).then((r) => r.data),
    onSuccess: (_data, reactionType) => {
      // Write the known result straight into the cache instead of refetching —
      // the server state after a successful upsert is exactly the sent reaction.
      qc.setQueryData(['my-reaction', postId], { reactionType });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to react to post'));
    },
  });
}

export function useRemoveReaction(postId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => postsApi.removeReaction(postId).then((r) => r.data),
    onSuccess: () => {
      qc.setQueryData(['my-reaction', postId], { reactionType: null });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to remove reaction'));
    },
  });
}

// Flat list ordered by createdAt asc; thread replies client-side via parentId
// (replies are one level deep only, enforced by the backend).
export function useComments(postId: number, enabled = true) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: () => postsApi.getComments(postId).then((r) => r.data),
    enabled,
  });
}

export function useCreateComment(postId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCommentRequest) =>
      postsApi.createComment(postId, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to post comment'));
    },
  });
}

export function useUpdateComment(postId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, payload }: { commentId: number; payload: UpdateCommentRequest }) =>
      postsApi.updateComment(postId, commentId, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update comment'));
    },
  });
}

export function useDeleteComment(postId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (commentId: number) =>
      postsApi.deleteComment(postId, commentId).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to delete comment'));
    },
  });
}
