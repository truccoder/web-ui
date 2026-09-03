import api from '@/core/api/axios';
import type { CreatePostRequest, CreatePostResponse, UpdatePostRequest } from '../types/post';

/**
 * PostController (`com.socialapp.posts`) — 5 endpoints, one function each. Bare responses,
 * no wrapper.
 *
 * THE TWO CREATES ANSWER `201 CreatePostResponseDto` — `{ postId, moderationStatus }` — since
 * the backend closed B39. Everything else here still returns **204/void**: an update hands back
 * nothing, so callers refetch rather than patching a cache from a response (the feed is the read
 * side; see the note on `features/newsfeed`).
 */
export const postsApi = {
  /**
   * POST /v1/api/posts — create a post of any type except `BOOK`.
   * `PostService.createPost` throws a 400 for `postType: 'BOOK'`; use `createBookPost`.
   */
  createPost: (payload: CreatePostRequest) =>
    api.post<CreatePostResponse>('/v1/api/posts', payload).then((r) => r.data),

  /**
   * POST /v1/api/posts/books — create a post with an attached book, in one multipart call.
   *
   * `metadata` must be sent as an `application/json` Blob, not a plain string: Spring binds
   * `@RequestPart("metadata")` by the part's content type, and a bare string part arrives as
   * `text/plain` and fails to deserialize. The server sets `postType = BOOK` itself, so the
   * caller's value for it is irrelevant here.
   */
  createBookPost: (
    metadata: CreatePostRequest,
    bookFile: File,
    coverFile?: File,
    onProgress?: (percent: number) => void
  ) => {
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', bookFile);
    if (coverFile) form.append('cover', coverFile);

    return api
      .post<CreatePostResponse>('/v1/api/posts/books', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // A book file is the largest upload in the product — the progress bar earns its place
        // here more than anywhere. Fires for the request body; holds at 100 during server-side
        // processing, so keep the bar up until the promise settles.
        onUploadProgress: onProgress
          ? (event) => onProgress(Math.round((event.loaded / (event.total || event.loaded)) * 100))
          : undefined,
      })
      .then((r) => r.data);
  },

  /** PUT /v1/api/posts/{postId} — author-only edit. Type, event and book data are immutable. */
  updatePost: (postId: number, payload: UpdatePostRequest) =>
    api.put<void>(`/v1/api/posts/${postId}`, payload).then((r) => r.data),

  /** DELETE /v1/api/posts/{postId} — author-only. */
  deletePost: (postId: number) => api.delete<void>(`/v1/api/posts/${postId}`).then((r) => r.data),

  /**
   * POST /v1/api/posts/{postId}/qna/accept-answer/{commentId} — mark a comment as the
   * accepted answer on a Q&A post.
   *
   * Lives in `PostController`, not `CommentController`, so it belongs to this cycle's API
   * surface — but its only UI home is the comment thread, which is cycle 2.
   *
   * THE VERB CHANGED FROM PATCH TO POST (BE `39b5666`, QĐ-0002: state transitions are
   * `POST /{resource}/{id}/{action}` project-wide). The path did not move — it stays the sibling
   * of the DELETE below. Calling it with PATCH now answers 405 with `Allow: POST`, and the
   * backend will not accept both: "đừng đẻ thêm nợ kỹ thuật ở Backend" is the settled decision.
   */
  acceptAnswer: (postId: number, commentId: number) =>
    api.post<void>(`/v1/api/posts/${postId}/qna/accept-answer/${commentId}`).then((r) => r.data),

  /**
   * DELETE /v1/api/posts/{postId}/qna/accept-answer — take back the accepted answer.
   *
   * Author-only, and the counterpart of `acceptAnswer`: without it the first pick was permanent,
   * because `acceptAnswer` refuses to run a second time once `acceptedAnswerId` is set. So a
   * misclick used to crown the wrong comment forever.
   *
   * NO `commentId` IN THE PATH — a post has at most one accepted answer, so there is nothing to
   * disambiguate. Reputation awarded for the pick is revoked with the same `sourceId`.
   */
  unacceptAnswer: (postId: number) =>
    api.delete<void>(`/v1/api/posts/${postId}/qna/accept-answer`).then((r) => r.data),
};
