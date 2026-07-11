import api from './axios';
import type {
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
  UpsertReactionRequest,
} from '@/lib/types';

export const postsApi = {
  createPost: (payload: CreatePostRequest) => api.post<void>('/v1/api/posts', payload),

  createBookPost: (metadata: CreatePostRequest, bookFile: File, coverFile?: File) => {
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', bookFile);
    if (coverFile) formData.append('cover', coverFile);

    return api.post<void>('/v1/api/posts/books', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updatePost: (postId: number, payload: UpdatePostRequest) =>
    api.put<void>(`/v1/api/posts/${postId}`, payload),

  deletePost: (postId: number) => api.delete<void>(`/v1/api/posts/${postId}`),

  // NOTE: no GET endpoint exists yet to list a post's comments — see CommentController.
  createComment: (postId: number, payload: CreateCommentRequest) =>
    api.post<void>(`/v1/api/posts/${postId}/comments`, payload),

  updateComment: (postId: number, commentId: number, payload: UpdateCommentRequest) =>
    api.put<void>(`/v1/api/posts/${postId}/comments/${commentId}`, payload),

  deleteComment: (postId: number, commentId: number) =>
    api.delete<void>(`/v1/api/posts/${postId}/comments/${commentId}`),

  // NOTE: no GET endpoint exists yet to read back the current user's reaction — see
  // PostReactionController.
  upsertReaction: (postId: number, payload: UpsertReactionRequest) =>
    api.put<void>(`/v1/api/posts/${postId}/reactions`, payload),

  removeReaction: (postId: number) => api.delete<void>(`/v1/api/posts/${postId}/reactions`),
};
