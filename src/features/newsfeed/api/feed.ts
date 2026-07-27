import api from '@/core/api/axios';
import type { FeedPage } from '../types/feed';

/**
 * NewsfeedController (`com.socialapp.newsfeed`) — 1 endpoint, 1 function. Bare response, no
 * wrapper.
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
};
