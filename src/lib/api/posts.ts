import api from './axios';
import type { CreatePostRequest, UpdatePostRequest } from '@/lib/types';

export const postsApi = {
  createPost: (payload: CreatePostRequest) =>
    api.post<void>('/v1/api/posts', payload),

  updatePost: (postId: number, payload: UpdatePostRequest) =>
    api.put<void>(`/v1/api/posts/${postId}`, payload),

  deletePost: (postId: number) =>
    api.delete<void>(`/v1/api/posts/${postId}`),
};
