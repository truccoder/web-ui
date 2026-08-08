import api from '@/core/api/axios';
import type { SearchResponse } from '../types/search';

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
};
