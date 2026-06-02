import api from './axios';
import type { TrendingCategory, TrendingTimeRange, TrendingPageResponse } from '@/lib/types';

export interface TrendingParams {
  category?: TrendingCategory;
  timeRange?: TrendingTimeRange;
  page?: number;
  size?: number;
}

export const trendingApi = {
  getTrending: ({ category, timeRange = 'week', page = 1, size = 20 }: TrendingParams = {}) =>
    api.get<TrendingPageResponse>('/v1/api/trending', {
      params: { category, timeRange, page, size },
    }),
};
