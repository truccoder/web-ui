import api from '@/core/api/axios';
import type { SearchResponse } from '@/lib/types';

export const searchApi = {
  searchAll: (q: string, size = 20) =>
    api.get<SearchResponse>('/v1/api/search', { params: { q, size } }),
};
