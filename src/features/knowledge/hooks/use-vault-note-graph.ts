'use client';

import * as React from 'react';
import { useVaultNotes } from './use-vault-notes';
import type { VaultNoteSummary } from '../types/knowledge';

/** Safety ceiling on how many pages the graph will fetch — see the hook's own comment below. */
const MAX_GRAPH_PAGES = 20;

/**
 * The full note set for the knowledge graph, not one page of it.
 *
 * `useVaultNotes` is cursor-paginated (the server caps a page at 50 rows) because the note LIST
 * only ever needs to show what is on screen plus a "load more" button. The graph is different: an
 * edge from note A to note B cannot be drawn until both ends have been fetched, so this hook keeps
 * calling `fetchNextPage` until the server says there is nothing left.
 *
 * SHARES `useVaultNotes`' OWN CACHE (`knowledgeKeys.vaultNotes`) rather than a query of its own.
 * That is a deliberate side effect, not an accident: switching to the graph view finishes loading
 * every page the list view would otherwise page through one "Load more" click at a time, so
 * switching back to the list shows everything already, with no further clicks needed.
 *
 * BOUNDED AT `MAX_GRAPH_PAGES` (~1000 notes at 50/page) rather than fetching forever. A vault this
 * large is not the case this feature was built for, and an unbounded loop against someone's real
 * account is the wrong way to find that out — `truncated` tells the caller to say so instead.
 */
export function useVaultNoteGraph() {
  const query = useVaultNotes();
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  const pageCount = query.data?.pages.length ?? 0;
  const truncated = pageCount >= MAX_GRAPH_PAGES && hasNextPage === true;

  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && pageCount < MAX_GRAPH_PAGES) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, pageCount, fetchNextPage]);

  // `useMemo` on `query.data` itself (React Query's own stable reference), not on a `.flatMap()`
  // result — that call builds a new array on every render, and the simulation effect downstream
  // keys off this array's identity. Without the memo, opening the note dialog (a state change with
  // no bearing on which notes exist) would look like a data change and re-run the whole force
  // layout, jittering every node's position for no reason.
  const notes: VaultNoteSummary[] = React.useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data]
  );
  const stillLoadingMore = (hasNextPage ?? false) && pageCount < MAX_GRAPH_PAGES;

  return {
    notes,
    isPending: query.isPending || stillLoadingMore,
    isError: query.isError,
    error: query.error,
    truncated,
  };
}
