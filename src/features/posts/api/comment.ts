import api from '@/core/api/axios';
import type { CommentPage, CreateCommentRequest, UpdateCommentRequest } from '../types/comment';
import type { LikeCommentRequest } from '../types/reaction';

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
   * GET /v1/api/posts/{postId}/comments — ONE PAGE of the thread, flat, oldest first.
   *
   * IT RETURNED A BARE ARRAY UNTIL THE BACKEND'S `src` AUDIT (`93ca5e2`), and the change is
   * invisible to the type checker on this side — the response is hand-typed here, so a client
   * still reading `r.data` as an array compiled perfectly and broke at runtime with a page object
   * where a list was expected. That is the whole reason `schema.gen.ts` gets regenerated before
   * anything else after a backend release.
   *
   * Still flat and still not nested: replies come back in the same array carrying `parentId`, so
   * grouping into a two-level thread is the caller's job. See `CommentPage` for the guarantee
   * that makes paging safe for that grouping. 404 when the post is gone.
   */
  getComments: (postId: number, cursor?: number, limit?: number) =>
    api
      .get<CommentPage>(`/v1/api/posts/${postId}/comments`, { params: { cursor, limit } })
      .then((r) => r.data),

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
   * `LIKE` AND NOTHING ELSE, SINCE B24. The wire DTO is still a post's
   * (`UpsertPostReactionRequestDto`) because the backend shares it — a post does take all seven —
   * but `CommentReactionService.upsertReaction` answers 400 for the other six, and
   * `V73__comments_are_like_only.sql` moved the rows that predate the rule. The narrowing is
   * mirrored in the parameter type here rather than left to callers to remember: a request this
   * layer cannot build is a 400 nobody has to handle.
   *
   * THE FIELD STAYS IN THE BODY, exactly as it does on the backend's own DTO. Sending
   * `{ reactionType: 'LIKE' }` where the server expects that shape is cheaper than a second
   * request type for one path, and the literal type carries the rule.
   *
   * Idempotent upsert on the (user, comment) pair: pressing like twice leaves one row.
   */
  upsertReaction: (postId: number, commentId: number, payload: LikeCommentRequest) =>
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
