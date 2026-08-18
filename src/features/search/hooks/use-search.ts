'use client';

import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../api';
import type { SearchResponse } from '../types/search';

/**
 * Query keys for `search`.
 *
 * The term is part of the key, so every distinct query caches separately and going back to a
 * previous term is instant. That is also why nothing here is ever invalidated: results are a pure
 * function of the term plus whatever the database held at the time, and no mutation in this app
 * changes them in a way worth chasing.
 */
export const searchKeys = {
  all: ['search'] as const,
  query: (q: string, size: number) => [...searchKeys.all, q, size] as const,
  suggest: (q: string, limit: number) => [...searchKeys.all, 'suggest', q, limit] as const,
};

/**
 * The shortest query the backend is asked about.
 *
 * One character matches nearly everything with a substring search and no ranking, which costs a
 * round trip to produce a list nobody can use. Two is the legacy threshold as well, kept so the
 * shell's search bar and this page agree about when a term is "real".
 */
export const MIN_QUERY_LENGTH = 2;

/** How many of each list to ask for. Not a page — there is no second page (see `api/search.ts`). */
const DEFAULT_SIZE = 20;

export function useSearch(query: string, size: number = DEFAULT_SIZE) {
  const trimmed = query.trim();

  return useQuery<SearchResponse>({
    queryKey: searchKeys.query(trimmed, size),
    queryFn: () => searchApi.search(trimmed, size),
    /**
     * Below the threshold there is nothing to ask, and a blank term is a **422** rather than an
     * empty result — so the guard is correctness, not just economy. React Query keeps the query
     * `pending` while disabled, which is why the UI decides "prompt vs loading" from the term
     * itself and never from `isPending`.
     */
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
    /**
     * A minute. Typing a term, opening a result and coming back should not re-query, but search
     * over live data should not be pinned for a session either.
     */
    staleTime: 60_000,
  });
}

/** How many rows the dropdown asks for. The server caps this at 20 whatever is sent. */
const SUGGEST_LIMIT = 6;

/**
 * Type-ahead suggestions, one request per settled keystroke.
 *
 * THE DEBOUNCE IS THE CALLER'S, NOT THIS HOOK'S. The endpoint is documented as "fired once per
 * keystroke", but firing on literally every character puts a request in flight for terms nobody
 * finished typing. The component owns the timing because it owns the keyboard; this hook only
 * refuses to ask below the same floor `useSearch` uses, where a one-character substring match with
 * no ranking returns a list nobody can use.
 *
 * NOT INVALIDATED, EVER — same reasoning as `useSearch`: the result is a function of the term.
 * `staleTime` keeps a term the user backspaces into from re-fetching.
 */
export function useSuggestions(query: string, limit: number = SUGGEST_LIMIT) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: searchKeys.suggest(trimmed, limit),
    queryFn: () => searchApi.suggest(trimmed, limit),
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
    staleTime: 60_000,
  });
}
