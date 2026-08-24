'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { commentsApi } from '../api/comment';
import type { CreateCommentRequest, PostComment, UpdateCommentRequest } from '../types/comment';
import type { ReactionType } from '../types/reaction';
import { postKeys } from './keys';
import type { PostMutationOptions } from './use-post';

/**
 * Comment state layer (CommentController), cycle 2.
 *
 * Unlike cycle 1 this half of the domain has a read of its own, so the split of
 * responsibility is:
 *
 *  - the **thread** is in-domain — these hooks invalidate `postKeys.comments(postId)`
 *    themselves, exactly as `useAcceptAnswer` already does;
 *  - the **comment count on a post card** is not — it is embedded in the newsfeed/search
 *    payload, another domain's key. Refreshing that stays the caller's job through the
 *    standard mutation options (see the note on `use-post.ts`).
 *
 * All three writes return void, so none of them can patch a row into the cached list; they
 * refetch. That is not laziness — see `useDeleteComment` for the case where splicing would
 * be actively wrong.
 *
 * THE TWO REACTION WRITES AT THE BOTTOM BREAK THAT RULE, ON PURPOSE AND ONLY THEY. `useDeleteComment`
 * cannot splice because a cascade makes the number of affected rows unknowable from here; a
 * reaction's effect is the opposite — it touches exactly one row, and both of the fields it moves
 * (`myReaction`, `likeCount`) are already on that row and move by a delta this file can compute
 * with certainty. That certainty is the whole licence: an optimistic write is honest when the
 * client can derive the same answer the server will, and a lie when it cannot. They still
 * invalidate on settle, so the server has the last word either way.
 */

/**
 * GET /v1/api/posts/{postId}/comments — the whole thread, flat and oldest-first.
 *
 * `undefined` disables the query, which is how a collapsed comment section avoids fetching
 * a thread nobody has opened: N post cards would otherwise be N requests on mount.
 *
 * Returned flat on purpose. The list carries `parentId` and the backend caps replies at one
 * level (`validateParentComment`), so grouping into top-level + replies is a pure transform
 * the consuming component does — putting it here would bake one presentation into the hook.
 */
export function useComments(postId: number | undefined) {
  return useQuery({
    // Non-null assertion is safe: `enabled` gates the fn, and the key is only built when an
    // id exists. Same pattern as `useResolveLocation`.
    queryKey: postKeys.comments(postId!),
    queryFn: () => commentsApi.getComments(postId!),
    enabled: postId !== undefined,
  });
}

export interface CreateCommentVariables {
  postId: number;
  payload: CreateCommentRequest;
}

/**
 * POST /v1/api/posts/{postId}/comments.
 *
 * `payload.parentId` must be a TOP-LEVEL comment's id — replying to a reply means passing
 * the id of the thread root, not of the comment being answered, or the backend throws
 * "Replies can only be made to top-level comments".
 */
export function useCreateComment(options?: PostMutationOptions<CreateCommentVariables>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, payload }: CreateCommentVariables) =>
      commentsApi.createComment(postId, payload),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: postKeys.comments(variables.postId) });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

export interface UpdateCommentVariables {
  postId: number;
  commentId: number;
  payload: UpdateCommentRequest;
}

/** PUT /v1/api/posts/{postId}/comments/{commentId} — author-only (403 otherwise). */
export function useUpdateComment(options?: PostMutationOptions<UpdateCommentVariables>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, commentId, payload }: UpdateCommentVariables) =>
      commentsApi.updateComment(postId, commentId, payload),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: postKeys.comments(variables.postId) });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

export interface DeleteCommentVariables {
  postId: number;
  commentId: number;
}

/**
 * DELETE /v1/api/posts/{postId}/comments/{commentId} — author-only.
 *
 * REFETCH, NEVER SPLICE — and this is the hook where an optimistic list edit would be a
 * real bug, not a small inefficiency. Deleting a top-level comment also deletes its replies,
 * via a Postgres cascade (`t_comments_parent_id_fkey ... ON DELETE CASCADE`) that is
 * invisible in `CommentService.deleteComment`. Removing one row from the cached array would
 * leave the replies on screen until something else forced a refetch.
 */
export function useDeleteComment(options?: PostMutationOptions<DeleteCommentVariables>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, commentId }: DeleteCommentVariables) =>
      commentsApi.deleteComment(postId, commentId),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: postKeys.comments(variables.postId) });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

/** A top-level comment with its (at most one level of) replies attached. */
export type CommentWithReplies = PostComment & { replies: PostComment[] };

/**
 * Group a flat thread into top-level comments each carrying their replies.
 *
 * Exported from the state layer rather than written inline in a component because every
 * surface that renders comments needs the same two-level shape, and because the ordering
 * rule is worth stating once: the backend returns oldest-first, and this preserves that for
 * both levels.
 *
 * Orphans — replies whose parent is not in the list — are surfaced as top-level rather than
 * dropped. The cascade above means an orphan should not normally exist, so a silent drop
 * would hide a comment instead of showing a bug.
 */
export function groupComments(comments: PostComment[]): CommentWithReplies[] {
  const roots = new Map<number, CommentWithReplies>();
  const orphans: CommentWithReplies[] = [];

  // `== null` rather than `=== null`: the field is null on the wire today, but the loose
  // check also survives the backend switching Jackson to NON_NULL inclusion, which would
  // turn it into a missing key and quietly reclassify every top-level comment as a reply.
  for (const comment of comments) {
    if (comment.parentId == null) roots.set(comment.id, { ...comment, replies: [] });
  }
  for (const comment of comments) {
    if (comment.parentId == null) continue;
    const root = roots.get(comment.parentId);
    if (root) root.replies.push(comment);
    else orphans.push({ ...comment, replies: [] });
  }

  return [...roots.values(), ...orphans];
}

/**
 * Options for the comment reaction writes.
 *
 * `onMutate` is withheld for the same reason `ReactionMutationOptions` withholds it: these two own
 * an optimistic snapshot and its rollback, and a caller-supplied `onMutate` would replace ours and
 * leave nothing to roll back to.
 */
export type CommentReactionOptions<TVariables> = Omit<
  UseMutationOptions<void, Error, TVariables, CommentReactionRollback>,
  'mutationFn' | 'onMutate'
>;

/** The whole cached thread as it stood before the optimistic write. */
interface CommentReactionRollback {
  previous: PostComment[] | undefined;
}

export interface CommentReactionVariables {
  postId: number;
  commentId: number;
}

export interface UpsertCommentReactionVariables extends CommentReactionVariables {
  reactionType: ReactionType;
}

/**
 * Apply the reader's new reaction to one row of a cached thread, moving `likeCount` by the delta
 * the change actually implies.
 *
 * THREE CASES AND THEY ARE NOT THE SAME NUMBER, which is the reason this is a function rather
 * than a `+1` at the call site:
 *  - nothing → something: the reader is a new reactor, so `+1`;
 *  - something → something else: one row per (user, comment) means the upsert REPLACES, so `0` —
 *    switching LIKE to CLAP must not inflate the total, and an earlier draft that did was caught
 *    by clicking twice;
 *  - something → nothing: `-1`.
 *
 * `Math.max(0, …)` because `likeCount` is typed non-null but nothing guarantees the cached copy is
 * current — a stale zero plus a removal would otherwise render `-1`, which is worse than the
 * momentary optimism it is protecting.
 */
function applyReaction(
  comments: PostComment[],
  commentId: number,
  next: ReactionType | null
): PostComment[] {
  return comments.map((comment) => {
    if (comment.id !== commentId) return comment;
    const had = comment.myReaction != null;
    const has = next != null;
    const delta = had === has ? 0 : has ? 1 : -1;
    return { ...comment, myReaction: next, likeCount: Math.max(0, comment.likeCount + delta) };
  });
}

/** Shared optimistic plumbing: snapshot the thread, patch one row, hand the snapshot back. */
function useCommentReactionMutation<TVariables extends CommentReactionVariables>(
  mutationFn: (variables: TVariables) => Promise<void>,
  nextReaction: (variables: TVariables) => ReactionType | null,
  options?: CommentReactionOptions<TVariables>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      const queryKey = postKeys.comments(variables.postId);
      // Without this, a refetch already in flight can land after the optimistic write and
      // restore the pre-click row.
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PostComment[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<PostComment[]>(
          queryKey,
          applyReaction(previous, variables.commentId, nextReaction(variables))
        );
      }
      return { previous };
    },
    ...options,
    onError: (error, variables, context, ...rest) => {
      // `context.previous` is undefined when nothing was cached — there is then nothing to put
      // back and the invalidation below is the only correct move.
      if (context?.previous) {
        queryClient.setQueryData(postKeys.comments(variables.postId), context.previous);
      }
      options?.onError?.(error, variables, context, ...rest);
    },
    onSettled: (data, error, variables, context, ...rest) => {
      queryClient.invalidateQueries({ queryKey: postKeys.comments(variables.postId) });
      options?.onSettled?.(data, error, variables, context, ...rest);
    },
  });
}

/**
 * PUT /v1/api/posts/{postId}/comments/{commentId}/reactions.
 *
 * OPTIMISTIC BECAUSE THE CONTROL HAS TO LIGHT UP UNDER THE FINGER — the same argument
 * `useUpsertReaction` makes for a post, with one thing this can do that it cannot: the count moves
 * too, because the count lives on the row being patched instead of in another domain's payload.
 */
export function useUpsertCommentReaction(
  options?: CommentReactionOptions<UpsertCommentReactionVariables>
) {
  return useCommentReactionMutation(
    ({ postId, commentId, reactionType }: UpsertCommentReactionVariables) =>
      commentsApi.upsertReaction(postId, commentId, { reactionType }),
    ({ reactionType }) => reactionType,
    options
  );
}

/**
 * DELETE /v1/api/posts/{postId}/comments/{commentId}/reactions.
 *
 * ONLY FIRE THIS WHERE `myReaction` IS ALREADY SET. The endpoint answers 404 when there is nothing
 * to remove, so it is not a safe no-op — the rollback here exists for a failed request, not as
 * cover for calling it blind.
 */
export function useRemoveCommentReaction(
  options?: CommentReactionOptions<CommentReactionVariables>
) {
  return useCommentReactionMutation(
    ({ postId, commentId }: CommentReactionVariables) =>
      commentsApi.removeReaction(postId, commentId),
    () => null,
    options
  );
}
