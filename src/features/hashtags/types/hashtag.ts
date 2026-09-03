import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for HashtagController (`com.socialapp.hashtags`) — B31, derived from `schema.gen.ts`.
 *
 * TWO ENDPOINTS, ONE ROW SHAPE. `GET /v1/api/hashtags/suggest` completes a prefix; `GET
 * /v1/api/hashtags/trending` answers the "nothing typed yet" case. Both return `HashtagDto[]`.
 *
 * The clickable third leg the search box needs is NOT here — a selected tag is browsed through
 * `GET /v1/api/posts/public?hashtag=`, which `features/newsfeed` owns (see `newsfeedApi`).
 */

/**
 * One hashtag in a suggest or trending list.
 *
 * BOTH FIELDS ARE `?:` IN THE GENERATED DTO because the Java record carries no nullability
 * annotations, but the wire always sends both — the api layer folds them to non-optional here and
 * drops any row whose `tag` came back empty, so a consumer never has to guard a blank chip.
 *
 * `postCount` MEANS DIFFERENT THINGS PER ENDPOINT and both are right: for `suggest` it is
 * `t_hashtags.usage_count`, the running total the composer maintains; for `trending` it is the
 * number of matching public posts *inside the requested window*. So the same tag can report two
 * numbers.
 */
export type Hashtag = {
  tag: string;
  postCount: number;
};

/** The raw DTO, before the api layer tightens it. */
export type HashtagDto = Schemas['HashtagDto'];

/**
 * How far back `trending` looks.
 *
 * NOT AN ENUM ON THE BACKEND — it is a raw string matched in a `switch` whose `default` means
 * "week", exactly like `GET /v1/api/trending`'s `timeRange`. So `window=decade` is a 200 with a
 * week of results, not an error. Closed here because the frontend is the only place that can close
 * it, and the vocabulary is shared with `TrendingTimeRange` on purpose.
 */
export type HashtagWindow = 'today' | 'week' | 'month';
