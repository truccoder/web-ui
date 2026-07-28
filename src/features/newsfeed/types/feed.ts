import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for NewsfeedController (`GET /v1/api/feed`), derived from `schema.gen.ts`.
 *
 * ONE ENDPOINT, THE LARGEST READ SURFACE IN THE APP. The feed is where posts, books,
 * reputation and (later) moderation are actually seen, so this tiny module carries the
 * payload every one of those domains renders from.
 */

/**
 * Fields the backend always sends with a real value.
 *
 * `likeCount`/`commentCount`/`shareCount` are Java `int` primitives, so they cannot be null —
 * they are, however, permanently 0, because nothing in the backend ever writes them (see
 * `findings/posts.md`). Present is not the same as meaningful, and the card deliberately does
 * not render them.
 */
type AlwaysPresent =
  | 'postId'
  | 'authorId'
  | 'visibility'
  | 'postType'
  | 'createdAt'
  | 'likeCount'
  | 'commentCount'
  | 'shareCount';

/**
 * One feed entry — `FeedPostDataDto` with nullability corrected.
 *
 * EVERY KEY IS PRESENT, AND EVERYTHING OPTIONAL IS `| null` RATHER THAN `?:`. The generator
 * marks the whole DTO optional because the Java classes carry no nullability annotations, but
 * Jackson runs at its default `ALWAYS` inclusion, so the wire really carries
 * `"quizDetails": null` — the key is there with a null value.
 *
 * This distinction has cost this project real bugs twice, which is why it is encoded in the
 * type rather than left to callers: at P2.4′a `=== undefined` would have classified every
 * top-level comment as a reply, and at P2.4″d a `!== undefined` check on a null cap made every
 * uncapped event render as "full" (because `0 >= null` is true). A type that says `| null` puts
 * that mistake in front of the compiler.
 *
 * WHAT THE PAYLOAD DOES NOT CARRY, though it declares it: `codeSnippetDetails`,
 * `articleDetails`, `qnaDetails`, `pollDetails`, `linkDetails` and `quizDetails` are null on
 * every post, because `NewsfeedService.fanOutPost` never copies them onto the DTO. The types
 * are honest here — they say the value may be null — and the consumer side already handles it;
 * the fix is a backend one.
 */
export type FeedPost = {
  [K in keyof Required<Schemas['FeedPostDataDto']>]: K extends AlwaysPresent
    ? NonNullable<Schemas['FeedPostDataDto'][K]>
    : Schemas['FeedPostDataDto'][K] | null;
};

/**
 * The book attached to a `BOOK` post, as the feed summarises it.
 *
 * Left exactly as generated — every field genuinely can be absent, and the one that matters
 * most is a known backend defect rather than a modelling choice: `coverImageUrl` holds a
 * presigned URL with a 24-hour expiry that was written into `t_books` and is echoed for ever,
 * so book covers die after a day. See `findings/posts.md`.
 */
export type FeedBookSummary = Schemas['FeedBookSummaryDto'];

/**
 * One page of the feed.
 *
 * `hasMore` is the only pagination signal there is — the backend reads a Redis sorted set by
 * range and never reports a total, so nothing here can say how long the feed is. Paging must
 * be "keep asking until `hasMore` is false", not a page count.
 */
export type FeedPage = {
  posts: FeedPost[];
  page: number;
  size: number;
  hasMore: boolean;
};
