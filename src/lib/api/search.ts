import api from './axios';
import type {
  UnifiedSearchResponse,
  SearchResult,
  UserDocument,
  PostDocument,
} from '@/lib/types';

export const searchApi = {
  searchAll: (q: string, size = 5) =>
    api.get<UnifiedSearchResponse>('/v1/api/search', { params: { q, size } }),

  searchUsers: (q: string, page = 1, size = 10) =>
    api.get<SearchResult<UserDocument>>('/v1/api/search/users', {
      params: { q, page, size },
    }),

  searchPosts: (q: string, page = 1, size = 10) =>
    api.get<SearchResult<PostDocument>>('/v1/api/search/posts', {
      params: { q, page, size },
    }),
};
