'use client';

import { useEffect, useState } from 'react';

/**
 * Watches a sentinel element and asks for the next page as it comes into view.
 *
 * TWELVE COMPONENTS HAD TWELVE COPIES of the same `IntersectionObserver` block — `newsfeed.tsx`,
 * `user-posts.tsx`, both comment lists, `friends-list.tsx`, `trending-list.tsx`,
 * `notification-list.tsx`, `vault-note-list.tsx`, two book shelves, `project-list.tsx`, the
 * reactor dialog. Every one of them spelled out the same `useRef` + effect + `rootMargin: '200px'`
 * + `isIntersecting && hasNextPage && !isFetchingNextPage && fetchNextPage()`. One hook, so the
 * paging trigger cannot drift between lists.
 *
 * OBSERVED, NOT SCROLL-DRIVEN, and that is the reason this is not a scroll handler: when the
 * viewport is tall enough that the first page does not fill it, no scroll event ever fires and a
 * handler-based loader stalls with more to load. The observer reports the sentinel regardless.
 *
 * `rootMargin` DEFAULTS TO 200px so the fetch starts before the reader reaches the end and the
 * append is invisible — the number every call site had already picked by hand.
 *
 * IT RETURNS A CALLBACK REF (`useState`'s setter, which React guarantees is stable), so a caller
 * writes `<div ref={sentinelRef} />` with no `useRef` of its own. Storing the node in state rather
 * than a ref is deliberate: the effect below has to re-run when the sentinel mounts, and a ref
 * assignment does not trigger that.
 */
export interface UseInfiniteScrollOptions {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  /** @default "200px" */
  rootMargin?: string;
  /** @default true — pass `false` to detach the observer without unmounting the sentinel. */
  enabled?: boolean;
}

export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '200px',
  enabled = true,
}: UseInfiniteScrollOptions): (node: HTMLElement | null) => void {
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!sentinel || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, enabled, hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin]);

  return setSentinel;
}
