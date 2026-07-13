'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/lib/api/search';

export function useSearch(query: string, size = 20, enabled = true) {
  return useQuery({
    queryKey: ['search', query, size],
    queryFn: () => searchApi.searchAll(query, size).then((r) => r.data),
    enabled: enabled && query.length >= 2,
    staleTime: 60_000,
  });
}

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// Drop-in variant of useSearch for search-as-you-type inputs: pass the raw input value and
// requests only fire once the user pauses typing, instead of one per keystroke.
export function useDebouncedSearch(query: string, size = 20, enabled = true, delayMs = 300) {
  const debouncedQuery = useDebouncedValue(query, delayMs);
  const result = useSearch(debouncedQuery, size, enabled);

  // While the debounce timer is still holding back the latest keystrokes, the query results
  // on screen belong to the previous term — surface that the same way as an in-flight fetch.
  const isDebouncing = query !== debouncedQuery && query.length >= 2;

  return { ...result, isDebouncing, debouncedQuery };
}
