import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for SearchController (`GET /v1/api/search`), derived from `schema.gen.ts`.
 *
 * ONE ENDPOINT, ONE CALL, THREE LISTS. The backend searches `t_users`, `t_posts` and `t_books`
 * directly in Postgres — there is no search index.
 *
 * BOOKS BECAME A LIST OF THEIR OWN IN B3. They used to reach the screen only as the post they
 * were attached to, because `SearchResponse` had no `books` branch — so a title that matched but
 * had no post behind it was unfindable, on a screen the product describes as searching "posts,
 * people and books". The branch exists now and this type follows it.
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
 * A post that matched, by its own content/event name or through its book.
 *
 * THE SIX DETAILS BLOCKS ARE BACK. Until F-A this type excluded `quizDetails`,
 * `codeSnippetDetails`, `articleDetails`, `qnaDetails`, `pollDetails` and `linkDetails` through
 * a `NeverPopulated` union, because `SearchService.toPostDtos` built every `PostDto` with the
 * author fields, `visibility`, `createdAt` and `book` and nothing else — all six were null on
 * every result, and a key that can never carry a value is not data the UI should be invited to
 * branch on. The backend filled that in on 28–29/07, alongside the same fix in
 * `NewsfeedService.fanOutPost`. Measured at F-A, not taken on trust: `GET /v1/api/search?q=a`
 * answers `qnaDetails` non-null on the QNA result.
 *
 * Everything is `| null` rather than `?:` for the reason recorded in `features/newsfeed`: Jackson
 * runs at `ALWAYS`, so the key is on the wire carrying null, and `=== undefined` checks have
 * silently broken this project twice. That applies to the six as much as to the rest — a post of
 * another kind genuinely has none.
 */
export type SearchPost = {
  [K in keyof Required<Schemas['PostDto']>]: K extends 'book'
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
  books: SearchBook[];
};

/**
 * One row of the type-ahead dropdown.
 *
 * ONE FLAT SHAPE FOR EVERY KIND OF HIT, which the backend chose deliberately: the dropdown draws a
 * single list, and a client that switched on per-type payloads to render four identical rows would
 * end up re-implementing this flattening anyway.
 *
 * `type` IS WHAT `id` REFERS TO — a user id or a book id — so it is also what decides where a row
 * navigates. `sublabel` for a person is their handle with the `@` already prefixed by the server.
 */
export type Suggestion = Schemas['SuggestionDto'];
export type SuggestionType = NonNullable<Suggestion['type']>;
