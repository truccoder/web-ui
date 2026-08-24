import api from '@/core/api/axios';
import type { PostComment, CreateCommentRequest, UpdateCommentRequest } from '../types/comment';
import type { UpsertReactionRequest } from '../types/reaction';

/**
 * CommentController (`com.socialapp.posts`) — 6 endpoints, one function each. Bare
 * responses, no wrapper.
 *
 * This is the only GET in the whole `posts` package: `getComments` is how the domain reads
 * anything at all. Everything else about a post arrives embedded in the newsfeed/search
 * payload (there is no `GET /posts/{id}`), which is why the comment thread can be fetched
 * per post while the post itself cannot.
 *
 * THE TWO REACTION WRITES AT THE BOTTOM ARE A COMMENT'S, NOT A POST'S, and they are filed here
 * rather than in `reaction.ts` because the backend files them here: they hang off
 * `/posts/{postId}/comments/{commentId}`, and `CommentController` is what serves them (the
 * generated operation ids `upsertReaction_1` / `removeReaction_1` are the giveaway — the plain
 * names belong to `PostReactionController`). CLAUDE.md §4's 1:1 package mirror decides it.
 *
 * THERE IS NO READ FOR THEM, AND NONE IS NEEDED. A post's reaction takes a `GET .../reactions/me`
 * per card because `FeedPostDataDto` does not carry it; `CommentResponseDto` DOES — `myReaction`
 * and `likeCount` arrive on every row of `getComments`. So the thread already knows what the
 * reader picked and how many people reacted, and these two only write.
 */
export const commentsApi = {
  /**
   * GET /v1/api/posts/{postId}/comments — the whole thread, flat, oldest first
   * (`findByPostIdOrderByCreatedAtAsc`).
   *
   * Not paginated and not nested: replies come back in the same array carrying `parentId`,
   * so grouping into a two-level thread is the caller's job. 404 when the post is gone.
   */
  getComments: (postId: number) =>
    api.get<PostComment[]>(`/v1/api/posts/${postId}/comments`).then((r) => r.data),

  /**
   * POST /v1/api/posts/{postId}/comments — returns **void**, not the created comment, so
   * the caller refetches the thread rather than appending a server-shaped row.
   *
   * `parentId` must reference a TOP-LEVEL comment (see `CreateCommentRequest`).
   */
  createComment: (postId: number, payload: CreateCommentRequest) =>
    api.post<void>(`/v1/api/posts/${postId}/comments`, payload).then((r) => r.data),

  /** PUT /v1/api/posts/{postId}/comments/{commentId} — author-only, content only, void. */
  updateComment: (postId: number, commentId: number, payload: UpdateCommentRequest) =>
    api.put<void>(`/v1/api/posts/${postId}/comments/${commentId}`, payload).then((r) => r.data),

  /**
   * DELETE /v1/api/posts/{postId}/comments/{commentId} — author-only.
   *
   * Deleting a top-level comment ALSO removes its replies, and nothing in the Java says so
   * — `CommentService.deleteComment` is a plain `repository.delete(comment)`; the cascade
   * lives in Postgres (`t_comments_parent_id_fkey ... ON DELETE CASCADE`, verified against
   * the dev DB). So the count of rows that vanish is not 1, and the caller must refetch the
   * whole thread after a delete rather than splicing one row out of the cached list.
   */
  deleteComment: (postId: number, commentId: number) =>
    api.delete<void>(`/v1/api/posts/${postId}/comments/${commentId}`).then((r) => r.data),

  /**
   * PUT /v1/api/posts/{postId}/comments/{commentId}/reactions — set or change the reader's
   * reaction on one comment.
   *
   * SAME REQUEST DTO AS A POST'S (`UpsertPostReactionRequestDto`), so the seven-value enum is
   * shared and `UpsertReactionRequest` is reused rather than copied. A comment therefore accepts
   * `INSIGHT` and `ANGRY` exactly as a post does — the seeded thread has `INSIGHT` rows on it —
   * which is why the UI must never assume the reader's reaction is a `LIKE`.
   *
   * Idempotent upsert on the (user, comment) pair: switching LIKE → CLAP is this one call.
   */
  upsertReaction: (postId: number, commentId: number, payload: UpsertReactionRequest) =>
    api
      .put<void>(`/v1/api/posts/${postId}/comments/${commentId}/reactions`, payload)
      .then((r) => r.data),

  /**
   * DELETE /v1/api/posts/{postId}/comments/{commentId}/reactions — un-react.
   *
   * The post-level twin throws `NotFoundException` when there is nothing to remove, and this one
   * answers 404 in its spec too — so a toggle has to know its current state before firing rather
   * than sending this blind and treating the error as a no-op. `myReaction` on the row is that
   * state.
   */
  removeReaction: (postId: number, commentId: number) =>
    api.delete<void>(`/v1/api/posts/${postId}/comments/${commentId}/reactions`).then((r) => r.data),
};
