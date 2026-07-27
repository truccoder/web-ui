import api from '@/core/api/axios';
import type { CreatePostRequest, UpdatePostRequest } from '../types/post';

/**
 * PostController (`com.socialapp.posts`) — 5 endpoints, one function each. Bare responses,
 * no wrapper.
 *
 * Every one of these returns **204/void**: the backend hands back neither the created post
 * nor the updated one. Callers cannot patch a cache optimistically from a response — they
 * refetch (the feed is the read side; see the note on `features/newsfeed`).
 */
export const postsApi = {
  /**
   * POST /v1/api/posts — create a post of any type except `BOOK`.
   * `PostService.createPost` throws a 400 for `postType: 'BOOK'`; use `createBookPost`.
   */
  createPost: (payload: CreatePostRequest) =>
    api.post<void>('/v1/api/posts', payload).then((r) => r.data),

  /**
   * POST /v1/api/posts/books — create a post with an attached book, in one multipart call.
   *
   * `metadata` must be sent as an `application/json` Blob, not a plain string: Spring binds
   * `@RequestPart("metadata")` by the part's content type, and a bare string part arrives as
   * `text/plain` and fails to deserialize. The server sets `postType = BOOK` itself, so the
   * caller's value for it is irrelevant here.
   */
  createBookPost: (metadata: CreatePostRequest, bookFile: File, coverFile?: File) => {
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', bookFile);
    if (coverFile) form.append('cover', coverFile);

    return api
      .post<void>('/v1/api/posts/books', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  /** PUT /v1/api/posts/{postId} — author-only edit. Type, event and book data are immutable. */
  updatePost: (postId: number, payload: UpdatePostRequest) =>
    api.put<void>(`/v1/api/posts/${postId}`, payload).then((r) => r.data),

  /** DELETE /v1/api/posts/{postId} — author-only. */
  deletePost: (postId: number) => api.delete<void>(`/v1/api/posts/${postId}`).then((r) => r.data),

  /**
   * PATCH /v1/api/posts/{postId}/qna/accept-answer/{commentId} — mark a comment as the
   * accepted answer on a Q&A post.
   *
   * Lives in `PostController`, not `CommentController`, so it belongs to this cycle's API
   * surface — but its only UI home is the comment thread, which is cycle 2.
   */
  acceptAnswer: (postId: number, commentId: number) =>
    api.patch<void>(`/v1/api/posts/${postId}/qna/accept-answer/${commentId}`).then((r) => r.data),
};
