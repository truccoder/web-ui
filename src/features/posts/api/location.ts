import api from '@/core/api/axios';
import type { LocationResolution, LocationResolutionRequest } from '../types/location';

/**
 * LocationController (`com.socialapp.posts`) — 1 endpoint.
 *
 * Resolution runs through Gemini, so it is slow and lossy compared with a normal geocoder:
 * a query can legitimately come back as an empty list.
 */
export const locationApi = {
  /**
   * POST /v1/api/posts/locations/resolve — resolve a freeform query, or reverse-geocode a
   * coordinate pair, into post-ready location candidates.
   */
  resolve: (payload: LocationResolutionRequest) =>
    api.post<LocationResolution[]>('/v1/api/posts/locations/resolve', payload).then((r) => r.data),
};
