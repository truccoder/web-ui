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
 * ALL FIVE CONTRIBUTING DOMAINS ARE WIRED AS OF P3.1. `posts` supplies the card and every body,
 * `bookstore` the buy/preview/review controls (imported straight through its barrel since P2.10d —
 * the render prop the page used to thread down is gone), `security` the signed-in identity that
 * decides authorship, and `reputation` the Elite Score chip, now including the level NAME that
 * rides along in the payload. The feed's own contribution is the payload and the mapping.
 */

export { newsfeedApi } from './api';

export { newsfeedKeys, useNewsfeed, useRefreshFeed } from './hooks';

export { Newsfeed, type NewsfeedProps, FeedPost, type FeedPostProps } from './components';

export type { FeedPost as FeedPostData, FeedBookSummary, FeedPage } from './types';
