/**
 * `features/newsfeed` — mirrors the backend package `com.socialapp.newsfeed`
 * (NewsfeedController: 1 endpoint).
 *
 * One endpoint, the largest read surface in the product: this module owns the feed payload's
 * type, and every other domain's read side is rendered through the card it maps. The endpoint
 * count in the ledger says nothing about that.
 *
 * IT DEPENDS ON `features/posts`, NOT THE OTHER WAY ROUND, and that direction is deliberate
 * (CLAUDE.md §4). `PostCard` and the bodies take decomposed props rather than the feed DTO
 * precisely so that posts never has to know this package exists; the mapping lives here,
 * where the payload does. The same reasoning covers writes: posts' mutations refuse to
 * invalidate `newsfeedKeys.feed()` themselves and take an `onSuccess` instead.
 *
 * STILL MISSING A DOMAIN: buy / preview / review controls for `BOOK` posts arrive as a render
 * prop from the page until `features/bookstore` is rebuilt (P2.10).
 */

export { newsfeedApi } from './api';

export { newsfeedKeys, useNewsfeed } from './hooks';

export { Newsfeed, type NewsfeedProps, FeedPost, type FeedPostProps } from './components';

export type { FeedPost as FeedPostData, FeedBookSummary, FeedPage } from './types';
