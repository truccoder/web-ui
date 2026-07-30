import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for TrendingController (`GET /v1/api/trending`), derived from `schema.gen.ts`.
 *
 * THE ONLY DOMAIN WHOSE CONTENT IS NOT WRITTEN BY USERS. Items are crawled from Hacker News,
 * dev.to and GitHub on a schedule, classified into a category, and stored — three sources, not
 * the six this comment used to name; the Reddit, Medium and HBR crawlers were deleted backend-side
 * and left the enum with them.
 * Nothing in the app creates, edits or reacts to them — this is a read-only window onto someone
 * else's content, which is why every item's `url` points off-site.
 */

/** Where an item was crawled from. */
export type TrendingSource = NonNullable<Schemas['TrendingItemDto']['source']>;

/** What the classifier decided the item is about. */
export type TrendingCategory = NonNullable<Schemas['TrendingItemDto']['category']>;

/**
 * How far back to look.
 *
 * NOT AN ENUM ON THE BACKEND — it is a raw `String` matched in a `switch`, and the `default` branch
 * silently means "week". So `timeRange=decade` is a **200 with a week of results**, not an error
 * (measured). The set is closed here because the frontend is the only thing that can close it.
 */
export type TrendingTimeRange = 'today' | 'week' | 'month';

/**
 * One crawled item.
 *
 * Everything `| null` rather than `?:`, for the reason recorded in `features/newsfeed`: Jackson
 * runs at `ALWAYS`, so absent values arrive as an explicit null. `summary` really is null on a
 * large share of items (46 of 110 — GitHub repositories have no abstract to crawl), so this is
 * not a theoretical guard.
 *
 * `tags` IS BACK, AND IS USUALLY EMPTY — the two are not the same thing. It used to be excluded
 * through a `NeverPopulated` union because `TrendingCrawlScheduler` kept only the category from
 * what Gemini returned (`categories.get(i)` → `saveItem(crawled, category)`) and never wrote
 * tags: 110 of 110 rows empty, so the UI had nothing to branch on. The scheduler now stores them
 * (`findings/trending.md` T1).
 *
 * Measured across the whole table at F-B, because the first page misleads: page 1 is 20/20 empty
 * and the first tagged row is at global position 28. The census over all 310 rows is **97 tagged**
 * (HACKER_NEWS 74/234 · GITHUB 14/42 · DEV_TO 9/34). So this is an ordinary sometimes-empty array,
 * and every consumer must treat an empty one as normal rather than as a defect worth showing.
 */
export type TrendingItem = {
  [K in keyof Required<Schemas['TrendingItemDto']>]: Required<Schemas['TrendingItemDto']>[K] | null;
};

/**
 * One page of items.
 *
 * A REAL PAGE, UNLIKE SEARCH'S. This endpoint returns `page`/`size`/`totalElements`/`totalPages`
 * and `hasNext`, so infinite scrolling has an authoritative stop condition rather than a guess
 * from a short page.
 *
 * `page` IS 1-BASED on the way in and echoed back as given — `page=0` is a 400, not the first
 * page. Same convention as the feed and notifications.
 */
export type TrendingPage = {
  [K in keyof Required<Schemas['TrendingPageResponseDto']>]: K extends 'items'
    ? TrendingItem[]
    : NonNullable<Schemas['TrendingPageResponseDto'][K]>;
};
