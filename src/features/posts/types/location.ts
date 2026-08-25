import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for LocationController (`POST /v1/api/posts/locations/resolve`), derived from
 * `schema.gen.ts`.
 */

/**
 * Either `query` (freeform place name/address) **or** both `latitude` and `longitude`
 * (reverse geocoding) must be supplied — `LocationResolutionService` throws otherwise. The
 * union is expressed here so the wrong combination fails at compile time instead of as a
 * 400 at runtime.
 */
export type LocationResolutionRequest =
  | { query: string; latitude?: never; longitude?: never }
  | { query?: never; latitude: number; longitude: number };

/**
 * One resolved candidate. The response mirrors the `googlePlaceId` / `locationType` /
 * `locationDetails` shape of `CreatePostRequest`, so a candidate can be spread straight
 * back into the create call.
 *
 * Nullability confirmed against `LocationResolutionService`: both construction paths always
 * set `googlePlaceId` (`"gemini:" + UUID`), `locationType` and `locationDetails`, and
 * candidates missing either are dropped from the list (`.filter(Objects::nonNull)`) — so
 * these three are tightened and array elements are never null.
 *
 * `googleMapsUrl` stays optional: `GoogleMapsUrlBuilder.build` returns null when the place
 * has no coordinates, which happens on the freeform-query path.
 */
export type LocationResolution = Required<
  Omit<Schemas['LocationResolutionResponseDto'], 'googleMapsUrl'>
> & {
  googleMapsUrl?: string;
};
