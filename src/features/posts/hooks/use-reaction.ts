'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { reactionsApi } from '../api/reaction';
import type { MyReaction, ReactionType } from '../types/reaction';
import { postKeys } from './keys';

/**
 * Reaction state layer (PostReactionController), cycle 2.
 *
 * WHAT THIS LAYER CAN AND CANNOT REFRESH. The backend exposes exactly one read here —
 * "what did *I* pick" — and no totals, no reactor list. So these hooks keep
 * `postKeys.myReaction(postId)` correct and stop there. The number next to the button lives
 * in the newsfeed/search post payload, which is another domain's cache; moving it is the
 * caller's job via the usual options:
 *
 * ```ts
 * const react = useUpsertReaction({
 *   onSuccess: () => qc.invalidateQueries({ queryKey: newsfeedKeys.feed() }),
 * });
 * ```
 *
 * Consequence worth designing around rather than hiding: the highlight flips instantly
 * (optimistic, below) while the count only moves when the composing screen refreshes the
 * feed. A UI that shows both must not imply they update together.
 */

/**
 * Options for the reaction writes.
 *
 * `onMutate` is withheld from the caller — unlike the cycle-1 mutations, these two own an
 * optimistic snapshot and its rollback context, and a caller-supplied `onMutate` would
 * replace ours and break the rollback. Everything else is passthrough.
 */
export type ReactionMutationOptions<TVariables> = Omit<
  UseMutationOptions<void, Error, TVariables, ReactionRollback>,
  'mutationFn' | 'onMutate'
>;

/** What the optimistic write saves so `onError` can put it back. */
interface ReactionRollback {
  previous: MyReaction | undefined;
}

/**
 * GET /v1/api/posts/{postId}/reactions/me.
 *
 * `undefined` disables it. That matters more here than for comments: there is no batch
 * endpoint, so a feed of N cards is N requests, and a card should only ask once it is
 * actually rendering a reaction control.
 *
 * `staleTime` is left at the client default (60s). This is per-user, per-post state that
 * only this user changes, and every change here writes the cache directly — so refetching
 * sooner would buy nothing.
 */
export function useMyReaction(postId: number | undefined) {
  return useQuery({
    // Non-null assertion is safe: `enabled` gates the fn and the key is only built with an id.
    queryKey: postKeys.myReaction(postId!),
    queryFn: () => reactionsApi.getMyReaction(postId!),
    enabled: postId !== undefined,
  });
}

export interface UpsertReactionVariables {
  postId: number;
  reactionType: ReactionType;
}

/**
 * PUT /v1/api/posts/{postId}/reactions — set or change the reaction (one row per user+post,
 * so LIKE → LOVE is this call, not delete-then-create).
 *
 * OPTIMISTIC ON PURPOSE, and scoped to one key. Picking an emoji is the canonical case
 * where a round trip is visible: the control must light up under the finger. The write
 * touches only `myReaction(postId)` — the value this domain owns and the endpoint returns —
 * and never guesses at a total it has no way to know.
 */
export function useUpsertReaction(options?: ReactionMutationOptions<UpsertReactionVariables>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, reactionType }: UpsertReactionVariables) =>
      reactionsApi.upsertReaction(postId, { reactionType }),
    onMutate: async ({ postId, reactionType }) => {
      const queryKey = postKeys.myReaction(postId);
      // Without this, a fetch already in flight can land after the optimistic write and
      // overwrite it with the pre-click value.
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MyReaction>(queryKey);
      queryClient.setQueryData<MyReaction>(queryKey, { reactionType });
      return { previous };
    },
    ...options,
    onError: (error, variables, context, ...rest) => {
      restoreReaction(queryClient, variables.postId, context);
      options?.onError?.(error, variables, context, ...rest);
    },
    onSettled: (data, error, variables, context, ...rest) => {
      queryClient.invalidateQueries({ queryKey: postKeys.myReaction(variables.postId) });
      options?.onSettled?.(data, error, variables, context, ...rest);
    },
  });
}

/**
 * DELETE /v1/api/posts/{postId}/reactions — un-react.
 *
 * THE ROLLBACK IS NOT DECORATION. `removeReaction` throws
 * `NotFoundException("Reaction not found for this post")` when there is nothing to remove,
 * so firing this on a post the user has not reacted to is a real error response, and the
 * optimistic clear has to be undone. Callers should still gate the call on the current
 * value from `useMyReaction` instead of relying on the rollback to paper over it.
 */
export function useRemoveReaction(options?: ReactionMutationOptions<number>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) => reactionsApi.removeReaction(postId),
    onMutate: async (postId) => {
      const queryKey = postKeys.myReaction(postId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MyReaction>(queryKey);
      // `{ reactionType: null }`, not a cache eviction: null is what the endpoint returns
      // for "no reaction", so the shape stays identical to a real response and consumers
      // never see a transient `undefined` they would have to treat as loading.
      queryClient.setQueryData<MyReaction>(queryKey, { reactionType: null });
      return { previous };
    },
    ...options,
    onError: (error, postId, context, ...rest) => {
      restoreReaction(queryClient, postId, context);
      options?.onError?.(error, postId, context, ...rest);
    },
    onSettled: (data, error, postId, context, ...rest) => {
      queryClient.invalidateQueries({ queryKey: postKeys.myReaction(postId) });
      options?.onSettled?.(data, error, postId, context, ...rest);
    },
  });
}

/**
 * Put back whatever `onMutate` snapshotted.
 *
 * `context` is undefined when the mutation failed before `onMutate` finished, and
 * `context.previous` is undefined when nothing was cached yet — in that second case the
 * optimistic entry is removed rather than left behind as a value the server never sent.
 */
function restoreReaction(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: number,
  context: ReactionRollback | undefined
) {
  if (!context) return;
  const queryKey = postKeys.myReaction(postId);
  if (context.previous === undefined) queryClient.removeQueries({ queryKey, exact: true });
  else queryClient.setQueryData<MyReaction>(queryKey, context.previous);
}

/**
 * Who reacted to a post, cursor-paged.
 *
 * `enabled` IS THE POINT OF THIS HOOK'S SHAPE. The list only matters once somebody asks to see it,
 * and a card that fetched it eagerly would put one request per post on every feed render to fill a
 * dialog most readers never open. The caller passes `false` until the dialog is open.
 */
export function useReactors(postId: number, type?: ReactionType, enabled = true) {
  return useInfiniteQuery({
    queryKey: postKeys.reactors(postId, type),
    queryFn: ({ pageParam }) => reactionsApi.getReactors(postId, type, pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled,
  });
}
