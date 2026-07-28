import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for TrendingController (`GET /v1/api/trending`), derived from `schema.gen.ts`.
 *
 * THE ONLY DOMAIN WHOSE CONTENT IS NOT WRITTEN BY USERS. Items are crawled from Hacker News,
 * dev.to, GitHub, Reddit, Medium and HBR on a schedule, classified into a category, and stored.
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
 * `tags` is declared by the DTO but is empty on every item, by construction.
 *
 * `TrendingClassificationService` genuinely asks Gemini for `{"category": ..., "tags": [...]}`,
 * but `TrendingCrawlScheduler` keeps only the category (`categories.get(i)` →
 * `saveItem(crawled, category)`) and never sets tags on the entity. Measured on the whole table,
 * not sampled: **110 of 110 rows have empty tags**.
 *
 * Excluded from the type rather than typed as always-empty, exactly as `features/search` treats
 * the six details blocks its DTO declares and never fills — a field that can never carry a value
 * is not something the UI should be invited to render. The fix is one line in the scheduler
 * (`findings/trending.md` T1), and the field comes back here when it lands.
 */
type NeverPopulated = 'tags';

/**
 * One crawled item.
 *
 * Everything `| null` rather than `?:`, for the reason recorded in `features/newsfeed`: Jackson
 * runs at `ALWAYS`, so absent values arrive as an explicit null. `summary` really is null on a
 * large share of items (46 of 110 — GitHub repositories have no abstract to crawl), so this is
 * not a theoretical guard.
 */
export type TrendingItem = {
  [K in Exclude<keyof Required<Schemas['TrendingItemDto']>, NeverPopulated>]:
    | Required<Schemas['TrendingItemDto']>[K]
    | null;
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
