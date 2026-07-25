import api from '@/core/api/axios';
import type { LocationResolution, LocationResolutionRequest } from '../types/location';

/**
 * LocationController (`com.socialapp.posts`) — 1 endpoint.
 *
 * Resolution runs through Gemini, so it is slow and lossy compared with a normal geocoder.
 *
 * MEASURED (P2.4c-2): a query Gemini cannot place returns **400** with
 * `"Could not resolve location: <query>"`, not an empty 200 list — `LocationResolutionService`
 * throws `ValidationException`. An empty array is still reachable (every candidate failing to
 * parse is filtered out), so callers must handle both, but the ordinary "no such place" case
 * is an error, not an empty result.
 */
export const locationApi = {
  /**
   * POST /v1/api/posts/locations/resolve — resolve a freeform query, or reverse-geocode a
   * coordinate pair, into post-ready location candidates.
   */
  resolve: (payload: LocationResolutionRequest) =>
    api.post<LocationResolution[]>('/v1/api/posts/locations/resolve', payload).then((r) => r.data),
};
