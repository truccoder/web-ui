import api from '@/core/api/axios';
import type {
  TrendingCategory,
  TrendingPage,
  TrendingTimeRange,
  TrendingSource,
} from '../types/trending';

export interface TrendingParams {
  /** Omit for every category — the backend treats a missing `category` as "all". */
  category?: TrendingCategory;
  /** @default "week" */
  timeRange?: TrendingTimeRange;
  /**
   * One crawler, or omit for all three.
   *
   * B8 added this WITH a change to the ordering, and the ordering is the half that matters:
   * the list interleaves by per-source percent rank instead of raw score. A GitHub star count
   * runs to six figures while a Hacker News score runs to three, so sorting by the raw number
   * put GitHub across the whole first page and made the product's "three sources" claim
   * invisible on the one screen that exists to show it.
   */
  source?: TrendingSource;
  /** 1-based. @default 1 */
  page?: number;
  /** @default 20 */
  size?: number;
}

/**
 * TrendingController (`com.socialapp.trending`) — 1 endpoint, 1 function. Bare response, no
 * wrapper.
 */
export const trendingApi = {
  /**
   * GET /v1/api/trending — one page of crawled items, newest-and-hottest first.
   *
   * `page` AND `size` MUST BE POSITIVE: both `page=0` and `size=0` are **400**. Worth noting
   * against `features/search`, where the same class of violation comes back as **422** — the two
   * controllers validate through different paths, so error handling cannot assume one code.
   *
   * AN UNKNOWN `category` IS A 400, AN UNKNOWN `timeRange` IS NOT. `category` is bound to a Java
   * enum, so a typo is rejected; `timeRange` is a raw string matched in a `switch` whose `default`
   * means "week", so a typo silently returns a week of results. That asymmetry is why
   * `TrendingTimeRange` is a closed union on this side — the frontend is the only place the
   * mistake can be caught.
   */
  getTrending: ({
    category,
    source,
    timeRange = 'week',
    page = 1,
    size = 20,
  }: TrendingParams = {}) =>
    api
      .get<TrendingPage>('/v1/api/trending', {
        params: { category, source, timeRange, page, size },
      })
      .then((r) => r.data),
};
