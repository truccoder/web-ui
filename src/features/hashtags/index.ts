/**
 * `features/hashtags` — mirrors the backend package `com.socialapp.hashtags`
 * (HashtagController: 2 endpoints, `suggest` + `trending`). B31 in `docs/backend-plan.md`.
 *
 * THE READ SIDE OF `t_hashtags`, AND ONLY THAT. The table has existed since the backend's `V41`,
 * written by `PostService` when it extracts `#tags` from a post's content and read internally for
 * the feed's `Kỹ năng của tôi` tab — but nothing exposed a tag to a client, so the badge on
 * `PostCard` was inert and a `#` in a field completed to nothing. These two lists, plus the
 * `?hashtag=` filter that `features/newsfeed` added to `GET /posts/public`, are what make a
 * hashtag a thing you can follow.
 *
 * NO WRITES. A tag is created and counted entirely backend-side as a side effect of posting;
 * there is no endpoint here to make or rename one, and this feature never invalidates another
 * domain's cache.
 */

export { hashtagsApi } from './api';

export { hashtagKeys, useHashtagSuggest, useHashtagTrending } from './hooks';

export { HashtagSearchBox, type HashtagSearchBoxProps } from './components';

export { normalizeHashtag } from './lib/normalize';

export { findHashtagQuery } from './lib/find-hashtag-query';

export type { Hashtag, HashtagDto, HashtagWindow } from './types';
