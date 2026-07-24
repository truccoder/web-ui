import api from '@/core/api/axios';
import type { FeedResponse } from '@/lib/types';

export const newsfeedApi = {
  getFeed: (page = 1, size = 10) =>
    api.get<FeedResponse>('/v1/api/feed', { params: { page, size } }),
};
