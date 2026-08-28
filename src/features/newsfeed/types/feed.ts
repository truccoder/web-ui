import type { components, paths } from '@/core/api/schema.gen';

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
 * `likeCount` and `commentCount` are Java `int` primitives, so they cannot be null. They were
 * also permanently 0 until the backend started maintaining them (28–29/07); the card renders
 * both again as of F-A.
 *
 * `shareCount` used to be listed here and is gone: `FeedPostDataDto` dropped it when
 * `POST_SHARED` left `NotificationType` (BE `f0dc820`), because no endpoint could ever produce
 * a share. Restoring the feature means bringing the field and the enum member back together.
 */
type AlwaysPresent =
  | 'postId'
  | 'authorId'
  | 'visibility'
  | 'postType'
  | 'createdAt'
  | 'likeCount'
  | 'commentCount';

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
 * `authorEliteScore` IS A SNAPSHOT, NOT THE AUTHOR'S CURRENT SCORE, and it is per post.
 * `fanOutPost` copies the score into the Redis entry when the post is written and nothing ever
 * updates it, so a reader sees whatever the author's score was at the moment each post was made.
 * Measured at P3.1 for one author in one instant: the reputation endpoint said **35**, search
 * said **35**, and three feed posts by that same author said **0**, **25** and **0**. Post 91
 * showed 0 in the feed and 35 in search — same post, two screens, two numbers.
 *
 * The chip is still rendered, deliberately. This is a stale value rather than a fabricated one:
 * it was true when the post was made, and it is what the backend chose to embed so the feed never
 * has to call the reputation endpoint per card. That is a different case from `likeCount`, which
 * was cut at P2.4'd (ds-deviation #19) because it was permanently 0 and had never been true of
 * anything. Raised as B25; if the backend cannot refresh it, the honest fallback is to drop the
 * number from the feed and keep it only where it is read live.
 *
 * THE SIX DETAILS BLOCKS ARE CARRIED NOW. `codeSnippetDetails`, `articleDetails`, `qnaDetails`,
 * `pollDetails`, `linkDetails` and `quizDetails` used to be null on every post because
 * `NewsfeedService.fanOutPost` never copied them onto the DTO; the backend fixed that on
 * 28–29/07 and the live feed answers with them populated (measured at F-A: CODE_SNIPPET 2/2,
 * QNA 1/1, BOOK 1/1 non-null). They stay `| null` here because a post of another kind still
 * legitimately has none — which is exactly what the type always said.
 */
export type FeedPost = {
  [K in keyof Required<Schemas['FeedPostDataDto']>]: K extends AlwaysPresent
    ? NonNullable<Schemas['FeedPostDataDto'][K]>
    : Schemas['FeedPostDataDto'][K] | null;
};

/**
 * The book attached to a `BOOK` post, as the feed summarises it.
 *
 * Left exactly as generated — every field genuinely can be absent.
 *
 * `coverImageUrl` used to carry a warning here: the write path stored a 24-hour presigned URL
 * into `t_books` and the feed echoed that same string for ever, so covers went dead a day after
 * upload. The backend presigns at read time now — measured at F-C on a book posted two days
 * earlier, whose URL came back stamped `X-Amz-Date` with the current day — so the cover is an
 * ordinary short-lived URL like the download and preview ones.
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

/**
 * One page of the public feed (`GET /v1/api/posts/public`).
 *
 * SAME ITEMS, DIFFERENT PAGINATION. `posts` is the very same `FeedPostDataDto[]` that `/feed`
 * returns — which is the whole reason the two tabs can share one card — but the cursor replaces
 * the page number. `nextCursor` is the last id of the page and is null once `hasMore` is false,
 * so the paging rule is "pass back what you were given", not "add one".
 */
export type PublicFeedPage = {
  posts: FeedPost[];
  nextCursor: number | null;
  hasMore: boolean;
};

/**
 * The backend's own scope enum for `/feed`. Distinct from the UI's `FeedScope`, which also has
 * an `all` meaning "the public timeline" — a different endpoint entirely.
 */
export type FeedApiScope = NonNullable<
  NonNullable<paths['/v1/api/feed']['get']['parameters']['query']>['scope']
>;

/**
 * Body of `POST /v1/api/feed/seen` — the posts the reader has scrolled past.
 *
 * JUST THE IDS. Whose seen-set they land in is the JWT's user, never the body's: the worst a
 * forged id does is reorder the sender's own feed, so `MarkSeenRequestDto` carries nothing else
 * and the ids are not checked against the posts table. `postIds` is required and non-empty
 * (`@NotEmpty`), which is why the generator kept it non-optional and this is a straight alias.
 */
export type MarkSeenInput = Schemas['MarkSeenRequestDto'];
