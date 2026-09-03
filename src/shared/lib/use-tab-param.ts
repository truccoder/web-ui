'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Keeps a tab strip's selection in the query string, so a refresh lands where the reader was and
 * a copied URL opens on the panel they were looking at.
 *
 * FIVE PAGES HAD FIVE ANSWERS TO THE SAME QUESTION and three of them were "no answer". `/profile`
 * and `/u/[username]` each hand-rolled this against `window.history`; `/library`, `/projects` and
 * `/admin/moderation` kept the tab in `useState` alone, which means F5 silently drops you back on
 * the first tab — on `/admin/moderation` that is a moderator losing the appeals queue every time
 * the page reloads. One hook, so the behaviour cannot drift apart again.
 *
 * IT REPLACES RATHER THAN PUSHES, and this is the one decision here that is a judgement call
 * rather than a fix. `/profile` already recorded the reasoning — *"Back belongs to the page you
 * came from, not to the tab you left"* — and pushing would make leaving a five-tab admin page take
 * five presses of Back. The cost is that Back does not step backwards through tabs; switching to
 * `pushState` below is a one-word change if that trade is ever re-decided.
 *
 * `window.history.replaceState` RATHER THAN `router.replace`. Both keep the URL honest, but the
 * App Router's own navigation re-renders the route — on these pages that is an RSC round-trip and
 * a remount of the panel you just switched to, to change a query parameter that no server code
 * reads. `replaceState` is supported by the App Router for exactly this case and costs nothing.
 * The rendered tab comes from local state either way, so the strip responds on the same frame.
 *
 * THE DEFAULT TAB WRITES A BARE PATH. `/profile` rather than `/profile?tab=overview`, so the
 * canonical URL of a page is not a query string that people then pass around. Any OTHER parameter
 * already on the URL survives — `/u/x?ref=y` keeps `ref` — because this owns one key, not the
 * query string.
 */
export function useTabParam<T extends string>(
  ids: readonly T[],
  fallback: T,
  param = 'tab'
): [T, (next: string) => void] {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fromUrl = searchParams.get(param);
  const urlTab: T = (ids as readonly string[]).includes(fromUrl ?? '') ? (fromUrl as T) : fallback;
  const [tab, setTab] = useState<T>(urlTab);

  /**
   * THE URL WINS WHEN THE URL ITSELF MOVES — a `<Link>` or a `router.push` to the same page with a
   * different (or no) `?tab=`. Without this the strip kept whatever `select` last put in state, so
   * pressing the brand mark from `/newsfeed?tab=posts` rewrote the address to the bare feed and
   * left the `Bài viết` column rendered underneath it: the page and its URL disagreeing about
   * which tab you are on.
   *
   * IT ONLY ADOPTS A CHANGED URL VALUE, never a merely different one, and that is what keeps it
   * from fighting `select`. `select` writes with `replaceState`; if that propagates a new snapshot
   * the value here has already caught up and the ref matches, and if it does not, this effect
   * never fires at all. Either way a reader's own tab press is not undone a tick later.
   */
  const lastUrlTab = useRef(urlTab);
  useEffect(() => {
    if (lastUrlTab.current === urlTab) return;
    lastUrlTab.current = urlTab;
    setTab(urlTab);
  }, [urlTab]);

  const select = useCallback(
    (next: string) => {
      // An id the caller does not own is a bug upstream, not something to write to the URL.
      if (!(ids as readonly string[]).includes(next)) return;
      setTab(next as T);
      // The URL is about to say this too, so record it as already adopted — otherwise the snapshot
      // arriving from `replaceState` would look like an external change and re-set the same value.
      lastUrlTab.current = next as T;

      // Read from `window` rather than from the `searchParams` snapshot: `replaceState` does not
      // always propagate a new snapshot to this closure, so two tab switches in a row would build
      // the second URL from the query string as it stood before the first.
      const query = new URLSearchParams(window.location.search);
      if (next === fallback) query.delete(param);
      else query.set(param, next);

      const rest = query.toString();
      window.history.replaceState(null, '', rest ? `${pathname}?${rest}` : pathname);
    },
    [fallback, ids, param, pathname]
  );

  return [tab, select];
}
