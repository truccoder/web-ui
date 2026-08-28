'use client';

import { useCallback, useState } from 'react';
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

  const initial = searchParams.get(param);
  const [tab, setTab] = useState<T>(
    (ids as readonly string[]).includes(initial ?? '') ? (initial as T) : fallback
  );

  const select = useCallback(
    (next: string) => {
      // An id the caller does not own is a bug upstream, not something to write to the URL.
      if (!(ids as readonly string[]).includes(next)) return;
      setTab(next as T);

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
