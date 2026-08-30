/**
 * `features/search` — mirrors the backend package `com.socialapp.search`
 * (SearchController: 1 endpoint).
 *
 * ONE CALL RETURNS THREE LISTS. People, posts and books come back together from
 * `GET /v1/api/search`. There is no search index behind this — it is `unaccent(...) LIKE` over
 * three Postgres tables — so there is no relevance ranking, no paging and no cursor, and the UI
 * is written to say only what that can support.
 *
 * THE RESULTS PAGE HAS TABS, AND TWO OF THEM ARE NOT THE BACKEND'S. `all` / `people` / `posts` /
 * `books` all read the one `/search` call; `projects` and `roadmaps` filter the matchmaking and
 * roadmap list endpoints on this side, because `/search` does not cover those domains
 * (`docs/backend-plan.md` B33). See `hooks/use-entity-search.ts` — the Projects filter is bounded
 * to the newest slice of a cursor-paged board and says so.
 *
 * TWO SURFACES, ONE DOMAIN: the results page (`/search`) and the shell's search field, which
 * submits into it. The field lives here rather than in `shared/` because "search" is a domain
 * concept, and `shared/` holding it would be the start of the next global bucket (§4).
 *
 * RESULTS ARE NO LONGER DEAD ENDS, AND THIS NOTE IS KEPT AS THE CORRECTION. It used to read
 * *"neither a person nor a post can be opened: the backend has no public profile endpoint and the
 * app has no post-detail route"*, which was true and is not: `GET /users/{username}/profile`
 * shipped on 2026-08-09, and `/posts/{id}` and `/books/{id}` exist. A person opens at
 * `/u/{handle}`, a post at its timestamp, a book at its row.
 *
 * The one constraint that survives: a user row needs a HANDLE, not an id, and `username` is
 * nullable — so a hit on an account that never set one still shows and still does not link.
 */

export { searchApi } from './api';

export {
  useSearch,
  useSuggestions,
  useMentionSuggestions,
  useProjectSearch,
  useRoadmapSearch,
  searchKeys,
  MIN_QUERY_LENGTH,
  type EntitySearchResult,
} from './hooks';

export {
  foldQuery,
  matchesQuery,
  derivePostKind,
  presentPostKinds,
  SEARCH_TABS,
  type SearchPostKind,
  type SearchTab,
} from './lib';

export {
  SearchBar,
  type SearchBarProps,
  SearchResults,
  type SearchResultsProps,
  UserResultCard,
  type UserResultCardProps,
  PostResultCard,
  type PostResultCardProps,
  ProjectResultCard,
  type ProjectResultCardProps,
  RoadmapResultCard,
  type RoadmapResultCardProps,
  SearchFilters,
  DEFAULT_FILTERS,
  type SearchFiltersProps,
  type SearchFiltersState,
} from './components';

export type {
  SearchUser,
  SearchBook,
  SearchPost,
  SearchResponse,
  Suggestion,
  SuggestionType,
  MentionSuggestion,
} from './types';
