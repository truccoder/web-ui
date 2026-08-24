'use client';

import { useQuery } from '@tanstack/react-query';
import { locationApi } from '../api/location';
import type { LocationResolutionRequest } from '../types/location';
import { postKeys } from './keys';

/**
 * Location resolution for the post composer.
 *
 * Modelled as a **query, not a mutation**, even though the endpoint is a POST: resolving is
 * a read with no side effects, and the result is worth caching — resolution runs through
 * Gemini, so a repeat search is expensive enough that re-picking a place the user already
 * looked up should not hit the network again.
 *
 * Passing `undefined` disables it, which is how a picker holds off until the user has typed
 * something worth sending. Debouncing belongs in the component: this hook fires for whatever
 * request object it is handed.
 */
export function useResolveLocation(request: LocationResolutionRequest | undefined) {
  return useQuery({
    // Non-null assertion is safe: `enabled` keeps the fn from running without a request, and
    // the key is only read when one exists.
    queryKey: postKeys.locationSearch(request!),
    queryFn: () => locationApi.resolve(request!),
    enabled: request !== undefined,
    // Well past the 60s default: a place's coordinates do not move, and the call is slow.
    staleTime: 10 * 60 * 1000,
    // No retry: a failed resolve is a 400 (neither query nor coordinates) or a Gemini
    // error, neither of which a second attempt fixes — and each attempt is slow enough
    // that retrying just doubles the wait in front of the user. Note an empty list is a
    // success, not an error, so it never reaches this path.
    retry: false,
  });
}
