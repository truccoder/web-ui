'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from '../api/comment';
import type { CreateCommentRequest, PostComment, UpdateCommentRequest } from '../types/comment';
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
export type CommentThread = PostComment & { replies: PostComment[] };

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
export function groupComments(comments: PostComment[]): CommentThread[] {
  const roots = new Map<number, CommentThread>();
  const orphans: CommentThread[] = [];

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
