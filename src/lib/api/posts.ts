import api from './axios';
import type { CreatePostPayload, CreatePostResponse, Page, Post } from '@/lib/types';

export const postsApi = {
  createPost: (payload: CreatePostPayload) =>
    api.post<CreatePostResponse>('/v1/api/posts', payload),

  getNewsfeed: (offset: number, pageSize: number) =>
    api.get<Page<Post>>('/v1/api/posts/newsfeed', {
      params: { offset, pageSize },
    }),

  getPost: (id: string) => api.get<Post>(`/v1/api/posts/${id}`),
};
