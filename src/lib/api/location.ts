import api from '@/core/api/axios';
import type { LocationResolutionResponse } from '@/lib/types';

export const locationApi = {
  resolve: (query: string) =>
    api.post<LocationResolutionResponse[]>('/v1/api/posts/locations/resolve', { query }),
};
