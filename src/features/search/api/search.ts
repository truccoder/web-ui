import api from '@/core/api/axios';
import type { SearchResponse, Suggestion } from '../types/search';

/**
 * SearchController (`com.socialapp.search`) — 1 endpoint, 1 function. Bare response, no wrapper.
 */
export const searchApi = {
  /**
   * GET /v1/api/search — people and posts matching `q`, in one call.
   *
   * `q` IS REQUIRED AND MUST NOT BE BLANK, and the two failures differ: omitting it is a 400
   * ("Missing required parameter"), sending it empty or all-spaces is a **422** from bean
   * validation. `size` must be positive — 0 and negatives are 422 too. Measured against the
   * running backend rather than read off the annotations.
   *
   * `size` CAPS EACH LIST SEPARATELY, so `size = 20` can return 20 users *and* 20 posts. The
   * backend default is 10 (`Constants.DEFAULT_PAGINATION_SEARCH_PAGE_SIZE`); this passes a value
   * explicitly so the cap the UI lives with is one the UI chose.
   *
   * LIKE WILDCARDS ARE ESCAPED SERVER-SIDE (`SearchQuerySanitizer`), so searching `%` matches the
   * literal character and returns nothing rather than everything. Verified.
   */
  search: (q: string, size = 20) =>
    api.get<SearchResponse>('/v1/api/search', { params: { q, size } }).then((r) => r.data),

  /**
   * GET /v1/api/search/suggest — the type-ahead dropdown, fired per keystroke.
   *
   * IT IS NOT `search` WITH A SMALL `size`, and the backend split it out for reasons a caller has
   * to respect. The results page ranks friends first (a Neo4j round trip for the viewer's friend
   * ids), counts total hits for the pager, and hydrates every post with its author, its book and
   * six detail blobs. None of that is affordable per character typed, so none of it happens here —
   * which is also why this returns a flat `SuggestionDto[]` and not a `SearchResponse`.
   *
   * PEOPLE AND BOOKS ONLY. There are no post suggestions: a post has no short label to complete.
   *
   * `limit` IS CAPPED AT 20 SERVER-SIDE (`@Max`). Without the ceiling this would be a cheaper way
   * to page through the user table than the paged endpoint, which is the reason it exists.
   */
  suggest: (q: string, limit = 6) =>
    api.get<Suggestion[]>('/v1/api/search/suggest', { params: { q, limit } }).then((r) => r.data),
};
