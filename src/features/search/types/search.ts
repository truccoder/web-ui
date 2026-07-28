import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for SearchController (`GET /v1/api/search`), derived from `schema.gen.ts`.
 *
 * ONE ENDPOINT, ONE CALL, TWO LISTS. The backend searches `t_users`, `t_posts` and `t_books`
 * directly in Postgres — there is no search index — and returns people and posts together. Books
 * are deliberately not a third list: a book that matches surfaces as the post it is attached to,
 * with its details inline (`SearchPost.book`).
 *
 * NO PAGING, NO RELEVANCE ORDER. The response carries no cursor and no total — `size` caps each
 * list and that is all. Matching is plain diacritics-insensitive substring (Postgres
 * `unaccent(...)` on both sides), so there is no scoring to sort by and nothing to rank. The UI
 * must not imply otherwise: no "top result", no page controls.
 */

/**
 * A person who matched.
 *
 * `eliteScore` arrives embedded here, exactly as the ledger predicted when `reputation` was
 * scheduled early (P2.3) — the score reaches the screen through search and feed payloads, never
 * through a reputation endpoint of its own.
 */
export type SearchUser = {
  [K in keyof Required<Schemas['UserDto']>]: Required<Schemas['UserDto']>[K] | null;
};

/**
 * The book attached to a matching post.
 *
 * `price` is a Java `Long` of VND minor units and `isFree` decides whether it means anything;
 * `avgRating` is a `Double` that is null until somebody rates the book. Left fully nullable
 * because every one of these fields genuinely can be absent — the legacy page called
 * `book.avgRating.toFixed(1)` and `book.price.toLocaleString()` unguarded, which is a crash on
 * any unrated book.
 */
export type SearchBook = {
  [K in keyof Required<Schemas['BookDto']>]: Required<Schemas['BookDto']>[K] | null;
};

/**
 * Details blocks the DTO declares but the service never fills in.
 *
 * `SearchService.toPostDtos` builds every `PostDto` through a builder that sets `id`, `content`,
 * `eventName`, the author fields, `visibility`, `createdAt` and `book` — and nothing else. So
 * these six keys are on the wire as `null` on every result, always. Measured, not assumed:
 * `GET /v1/api/search?q=a` returns all six null on each post.
 *
 * This is the same defect as `NewsfeedService.fanOutPost` (`findings/posts.md`), in a second
 * service. They are excluded from `SearchPost` rather than typed as always-null, because a key
 * that can never carry a value is not data the UI should be invited to branch on — the result
 * card renders what the payload actually has. The backend fix would make them appear here.
 */
type NeverPopulated =
  | 'quizDetails'
  | 'codeSnippetDetails'
  | 'articleDetails'
  | 'qnaDetails'
  | 'pollDetails'
  | 'linkDetails';

/**
 * A post that matched, by its own content/event name or through its book.
 *
 * Everything is `| null` rather than `?:` for the reason recorded in `features/newsfeed`: Jackson
 * runs at `ALWAYS`, so the key is on the wire carrying null, and `=== undefined` checks have
 * silently broken this project twice.
 */
export type SearchPost = {
  [K in Exclude<keyof Required<Schemas['PostDto']>, NeverPopulated>]: K extends 'book'
    ? SearchBook | null
    : Required<Schemas['PostDto']>[K] | null;
};

/**
 * The whole response: both lists, always present, possibly empty.
 *
 * Named after the backend DTO (`SearchResponse`) rather than "SearchResults", which is the
 * component that renders it — one name for the payload, one for the UI.
 */
export type SearchResponse = {
  users: SearchUser[];
  posts: SearchPost[];
};
