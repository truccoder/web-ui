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
