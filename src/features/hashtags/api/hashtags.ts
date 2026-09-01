import api from '@/core/api/axios';
import type { Hashtag, HashtagDto, HashtagWindow } from '../types/hashtag';

/**
 * HashtagController (`com.socialapp.hashtags`) — 2 endpoints, one function each. Bare `HashtagDto[]`
 * responses, no wrapper. B31 in `docs/backend-plan.md`.
 *
 * GUEST-READABLE, like `GET /v1/api/trending` — a hashtag list carries no per-user data and the
 * badges and box it feeds are on pages a visitor already sees. Anonymous callers are IP
 * rate-limited server-side.
 *
 * PARAMETER ERRORS COME BACK 400, NOT 422: the controller has no `@Validated`, so a bad `limit`
 * raises `HandlerMethodValidationException` → 400. Same shape as `TrendingController`, the opposite
 * of `features/search`.
 */

/** Wire → domain: the DTO marks both fields optional; the wire always sends both. */
const toHashtag = (dto: HashtagDto): Hashtag => ({
  tag: dto.tag ?? '',
  postCount: dto.postCount ?? 0,
});

export const hashtagsApi = {
  /**
   * GET /v1/api/hashtags/suggest — tags whose name starts with `q`, most-used first.
   *
   * `q` IS REQUIRED AND MUST FOLD TO SOMETHING. The backend runs it through `HashtagNormalizer`
   * (`#ReactHooks`, `reacthooks` and `  ReactHooks ` all hit the same prefix) and returns an empty
   * list for a query that folds to nothing — callers should not send one at all (see
   * `normalizeHashtag`). `limit` is capped at 20 server-side.
   *
   * TAGS NO POST CARRIES ARE LEFT OUT (`usage_count > 0`): a suggestion that completes to an empty
   * feed is worse than a shorter list.
   */
  suggest: (q: string, limit = 8) =>
    api
      .get<HashtagDto[]>('/v1/api/hashtags/suggest', { params: { q, limit } })
      .then((r) => r.data.map(toHashtag).filter((h) => h.tag !== '')),

  /**
   * GET /v1/api/hashtags/trending — the most-used tags inside `window`, the list the box shows
   * before anything is typed.
   *
   * `window` takes the same tokens as `GET /v1/api/trending` (`today` / `week` / `month`); an
   * unknown value falls back to `week` rather than 400.
   */
  trending: (window: HashtagWindow = 'week', limit = 8) =>
    api
      .get<HashtagDto[]>('/v1/api/hashtags/trending', { params: { window, limit } })
      .then((r) => r.data.map(toHashtag).filter((h) => h.tag !== '')),
};
