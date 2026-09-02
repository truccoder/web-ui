'use client';

import { useCallback, useState } from 'react';

/**
 * The page cursor for an offset-`Page` list, plus the one rule every such list needs: a filter
 * change goes back to page 1.
 *
 * THIS IS NOT A QUERY WRAPPER. The feature hooks (`useModerationPosts`, `useBannedUsers`,
 * `useReports`, `useAppeals`) already own their `useQuery` and already set
 * `placeholderData: (previous) => previous` so paging does not blank the table — see
 * `features/moderation/hooks/use-moderation.ts`. Wrapping `useQuery` again here would duplicate
 * that layer and fight the "hooks return the feature's own types" rule. What actually repeated
 * across the five admin tabs is the page-1 reset: `moderation-posts-tab.tsx` spelled out an
 * `onFilter` helper that sets a filter and then `setPage(1)`, and `logs`/`reports` each had their
 * own copy. Staying on page 4 of a result set that a new filter shrank to one page shows an empty
 * list that reads as "no matches".
 *
 * `bindFilter` WRAPS A SETTER rather than being called imperatively, so a filter control is wired
 * once — `onChange={bindFilter(setStatus)}` — and cannot forget the reset.
 */
export interface Pagination {
  page: number;
  setPage: (page: number) => void;
  /** Back to the first page — call after any filter change that is not routed through `bindFilter`. */
  reset: () => void;
  /** Wrap a filter setter so applying it also returns to page 1. */
  bindFilter: <T>(setter: (value: T) => void) => (value: T) => void;
}

export function usePagination(initialPage = 1): Pagination {
  const [page, setPage] = useState(initialPage);

  const reset = useCallback(() => setPage(1), []);

  const bindFilter = useCallback(
    <T>(setter: (value: T) => void) =>
      (value: T) => {
        setter(value);
        setPage(1);
      },
    []
  );

  return { page, setPage, reset, bindFilter };
}
