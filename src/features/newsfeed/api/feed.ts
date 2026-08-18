import api from '@/core/api/axios';
import type { FeedPage, PublicFeedPage } from '../types/feed';

/**
 * NewsfeedController (`com.socialapp.newsfeed`) — 1 endpoint. Bare responses, no wrapper.
 *
 * A SECOND ENDPOINT LIVES HERE THAT THE PACKAGE MIRROR WOULD PUT IN `features/posts`, and the
 * exception is deliberate. `GET /v1/api/posts/public` (`getPublicFeed`, added 2026-08-09) is
 * served by `PostController`, so CLAUDE.md §4's 1:1 package mirror points at `features/posts`.
 * It is here instead, because putting it there would create the project's FIRST DEPENDENCY CYCLE:
 * the endpoint returns `FeedPostDataDto`, which this feature owns and models as `FeedPost`, so
 * `posts` would have to import it back from `newsfeed` — and `newsfeed` already imports `posts`
 * (`feed-post.tsx` renders `PostCard`). P3.5 verified the graph is acyclic; a mirror rule is not
 * worth being the thing that breaks it.
 *
 * The tie-breaker beyond the cycle: the endpoint IS a feed read. Its operationId is
 * `getPublicFeed`, it returns the same item type as `/feed`, and the design system calls it the
 * feed's `Tất cả` tab. Recorded as a boundary note in the ledger, in the opposite direction from
 * the usual ones (those record a controller sitting in a surprising package; this records us
 * declining to follow one).
 */
export const newsfeedApi = {
  /**
   * GET /v1/api/feed — one page of the signed-in user's feed.
   *
   * `page` is 1-based (`@Positive`, and the service computes `start = (page - 1) * size`);
   * passing 0 is a 400, not the first page.
   *
   * SERVED ENTIRELY FROM REDIS, WITH NO DATABASE FALLBACK. `getFeed` reads a sorted set and
   * returns an empty page when it is missing, so a post that exists in Postgres but was never
   * fanned out is invisible here, and a post deleted straight from Postgres keeps appearing
   * until the cache entry goes. Two consequences worth carrying into any debugging: the feed
   * is not a query over posts, and "it is not in the feed" never proves "it was not saved".
   */
  getFeed: (page = 1, size = 10) =>
    api.get<FeedPage>('/v1/api/feed', { params: { page, size } }).then((r) => r.data),

  /**
   * GET /v1/api/posts/public — every post in the product, newest first. The `Tất cả` tab.
   *
   * IT IS NOT `/feed` WITH A WIDER NET, and the difference is what makes two tabs worth having.
   * `/feed` is a personalised fan-out precomputed per user in Redis, so it can only ever contain
   * posts by people you are connected to. This one is a query over the posts table with no
   * personalisation of any kind — which is why the tab is called `Tất cả` and not `Khám phá`.
   *
   * CURSOR-PAGINATED, NOT PAGE-PAGINATED, unlike `/feed`. The two endpoints disagree about
   * pagination because they disagree about what they are reading: a Redis range has a stable
   * index, a table ordered by id does not, and offset paging over a table that is being written
   * to shows the reader the same post twice. `nextCursor` is the last id of the page, and `null`
   * once `hasMore` is false.
   */
  getPublicFeed: (cursor?: number, limit = 10) =>
    api
      .get<PublicFeedPage>('/v1/api/posts/public', { params: { cursor, limit } })
      .then((r) => r.data),
};
