import api from '@/core/api/axios';
import type { PostComment, CreateCommentRequest, UpdateCommentRequest } from '../types/comment';

/**
 * CommentController (`com.socialapp.posts`) — 4 endpoints, one function each. Bare
 * responses, no wrapper.
 *
 * This is the only GET in the whole `posts` package: `getComments` is how the domain reads
 * anything at all. Everything else about a post arrives embedded in the newsfeed/search
 * payload (there is no `GET /posts/{id}`), which is why the comment thread can be fetched
 * per post while the post itself cannot.
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
};
