'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { FeedScope } from '../components';

/**
 * Remembers which feed column the reader was in, so `/posts/{id}`'s `← Về bảng tin` link puts
 * them back on THAT column instead of on the feed's default tab.
 *
 * WHY THIS IS SUDDENLY NEEDED. The permalink's way out is a bare
 * `<Link href="/newsfeed" scroll={false}>` that leans entirely on the feed's own
 * `useScrollRestoration`. That was enough while the bare address opened on the column posts
 * actually live in. It stopped being enough when `Công nghệ` — the crawler's stream, which
 * contains no posts and mounts no scroll restoration — became the default tab: a reader who
 * scrolled `Bạn bè`, opened a post and pressed back landed on a different tab, at the top.
 * `useScrollRestoration` is already keyed per scope; all this adds is steering the reader back to
 * the right scope so that restore has a saved position to replay.
 *
 * `sessionStorage`, THE SAME STORE `useScrollRestoration` USES — same lifetime (dies with the
 * tab), same per-tab scoping, same fail-open on private mode. A reader who reached the permalink
 * from a shared link or a notification never wrote a scope, and the link falls back to the bare
 * feed, which is the pre-existing behaviour.
 */
const RETURN_SCOPE_KEY = 'newsfeed:return-scope';

const FEED_HREF = '/newsfeed';

/**
 * Called by `Newsfeed` beside `useScrollRestoration`. It only renders for a real feed scope
 * (`Công nghệ` renders `TrendingList` instead), so every value written here is a column a
 * permalink can legitimately be returned to.
 */
export function useRecordFeedReturn(scope: FeedScope) {
  useEffect(() => {
    try {
      sessionStorage.setItem(RETURN_SCOPE_KEY, scope);
    } catch {
      // Private mode and blocked site data throw here; the back link then falls back to the
      // default feed, which is no worse than before this hook existed.
    }
  }, [scope]);
}

/** No store to subscribe to — the value is only read, once, when the permalink page mounts. */
const noopSubscribe = () => () => {};

function readReturnHref() {
  try {
    const scope = sessionStorage.getItem(RETURN_SCOPE_KEY);
    // `useTabParam` deletes the parameter for the default tab and keeps it for every other, so
    // `?tab=<scope>` is the honest address of whichever column the reader left.
    return scope ? `${FEED_HREF}?tab=${scope}` : FEED_HREF;
  } catch {
    return FEED_HREF;
  }
}

/**
 * The href `/posts/{id}` should point `← Về bảng tin` at: `/newsfeed?tab=<scope>` for the column
 * the feed last recorded, or the bare `/newsfeed` when there is none.
 *
 * `useSyncExternalStore` RATHER THAN `useState` + `useEffect` — `sessionStorage` cannot be read
 * during render on the server, and this is the sanctioned way to read a client-only value without
 * a setState-in-effect or a hydration mismatch: `getServerSnapshot` returns the bare feed, the
 * client swaps in the real value on hydration. The snapshot is a plain string, so React's
 * `Object.is` check settles immediately.
 */
export function useFeedReturnHref() {
  return useSyncExternalStore(noopSubscribe, readReturnHref, () => FEED_HREF);
}
