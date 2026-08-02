/**
 * `features/search` — mirrors the backend package `com.socialapp.search`
 * (SearchController: 1 endpoint).
 *
 * ONE CALL RETURNS TWO LISTS. People and posts come back together from `GET /v1/api/search`;
 * books are not a third list, because a matching book surfaces as the post it belongs to with its
 * details inline. There is no search index behind this — it is `unaccent(...) LIKE` over three
 * Postgres tables — so there is no relevance ranking, no paging and no cursor, and the UI is
 * written to say only what that can support.
 *
 * TWO SURFACES, ONE DOMAIN: the results page (`/search`) and the shell's search field, which
 * submits into it. The field lives here rather than in `shared/` because "search" is a domain
 * concept, and `shared/` holding it would be the start of the next global bucket (§4).
 *
 * RESULTS ARE DEAD ENDS, ON PURPOSE. Neither a person nor a post can be opened: the backend has
 * no public profile endpoint and the app has no post-detail route. Recorded here so nobody
 * "fixes" it by shipping links that 404 — the constraint is in CLAUDE.md's Phase 3 note.
 */

export { searchApi } from './api';

export { useSearch, searchKeys, MIN_QUERY_LENGTH } from './hooks';

export {
  SearchBar,
  type SearchBarProps,
  SearchResults,
  type SearchResultsProps,
  UserResultCard,
  type UserResultCardProps,
  PostResultCard,
  type PostResultCardProps,
} from './components';

export type { SearchUser, SearchBook, SearchPost, SearchResponse } from './types';
