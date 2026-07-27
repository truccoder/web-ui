import api from '@/core/api/axios';
import type {
  CommentResponse,
  CreateCommentRequest,
  UpdateCommentRequest,
  UpsertReactionRequest,
  MyReactionResponse,
} from '@/lib/types';

/*
 * REMOVED AT P2.4d: `createPost`, `createBookPost`, `updatePost`, `deletePost` — the four
 * `PostController` writes, now owned by `features/posts/api/post.ts`. The comment and reaction
 * calls below are posts cycle 2 (P2.4'); they stay until that cycle replaces them.
 */
export const postsApi = {
  getComments: (postId: number) => api.get<CommentResponse[]>(`/v1/api/posts/${postId}/comments`),

  createComment: (postId: number, payload: CreateCommentRequest) =>
    api.post<void>(`/v1/api/posts/${postId}/comments`, payload),

  updateComment: (postId: number, commentId: number, payload: UpdateCommentRequest) =>
    api.put<void>(`/v1/api/posts/${postId}/comments/${commentId}`, payload),

  deleteComment: (postId: number, commentId: number) =>
    api.delete<void>(`/v1/api/posts/${postId}/comments/${commentId}`),

  getMyReaction: (postId: number) =>
    api.get<MyReactionResponse>(`/v1/api/posts/${postId}/reactions/me`),

  upsertReaction: (postId: number, payload: UpsertReactionRequest) =>
    api.put<void>(`/v1/api/posts/${postId}/reactions`, payload),

  removeReaction: (postId: number) => api.delete<void>(`/v1/api/posts/${postId}/reactions`),
};
