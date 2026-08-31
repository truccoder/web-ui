'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { hashtagsApi } from '../api/hashtags';
import { normalizeHashtag } from '../lib/normalize';
import type { HashtagWindow } from '../types/hashtag';
import { hashtagKeys } from './keys';

/**
 * `GET /v1/api/hashtags/suggest` for a prefix the caller is still typing.
 *
 * THE QUERY IS FOLDED HERE, NOT AT THE ENDPOINT. `normalizeHashtag` runs first so `#React`,
 * `react` and `  React ` share one cache entry and one request — and a query that folds to nothing
 * (a lone `#`, whitespace) disables the hook entirely rather than firing a call the backend would
 * answer with `[]`.
 *
 * DEBOUNCING IS THE CALLER'S JOB, like `SearchBar` and `GET /search/suggest`: the component owns
 * the keyboard, so it owns the timing. `keepPreviousData` keeps the last list under the dropdown
 * while the next prefix loads, so the menu does not blink empty between keystrokes.
 */
export function useHashtagSuggest(query: string, limit = 8) {
  const prefix = normalizeHashtag(query);
  return useQuery({
    queryKey: hashtagKeys.suggest(prefix ?? ''),
    queryFn: () => hashtagsApi.suggest(prefix!, limit),
    enabled: prefix !== null,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/**
 * `GET /v1/api/hashtags/trending` — the "nothing typed yet" list.
 *
 * `staleTime` IS FIVE MINUTES, matching `useTrending`: the ranking moves only as people post, not
 * as the reader does anything, so refetching on every focus would redraw an identical list.
 */
export function useHashtagTrending(window: HashtagWindow = 'week', limit = 8) {
  return useQuery({
    queryKey: hashtagKeys.trending(window),
    queryFn: () => hashtagsApi.trending(window, limit),
    staleTime: 5 * 60_000,
  });
}
