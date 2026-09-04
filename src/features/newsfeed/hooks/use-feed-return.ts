'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import type { FeedScope } from '../components';

/**
 * WHERE `/posts/{id}`'s BACK LINK GOES — and it is no longer always the feed.
 *
 * The permalink renders the same `FeedPost` the feed does, and it is reached from every surface
 * that renders one: the feed's two columns, a profile's `Bài viết` tab, search results, a
 * notification. Its way out was a single hard-wired `<Link href="/newsfeed">`, so a reader who
 * opened a post FROM someone's profile, commented, and pressed `← Về bảng tin` was dropped on the
 * feed — a page they were not on and now have to navigate back out of.
 *
 * TWO MECHANISMS, ONE LINK:
 *
 *  - `useRecordFeedReturn(scope)` — called by `Newsfeed` beside `useScrollRestoration` — remembers
 *    WHICH feed column the reader was in, so a return to the feed lands on that column (where
 *    `useScrollRestoration` then has a saved position to replay) rather than on the default tab.
 *
 *  - `useRecordPermalinkOrigin()` — called once by `MainShell` — remembers the last page that was
 *    NOT a post permalink. When that page is the feed, the link defers to the column-aware href
 *    above; when it is anything else (a profile, notifications, search) the link returns the
 *    reader straight there.
 *
 * Both use `sessionStorage`: same lifetime as `useScrollRestoration` (dies with the tab), same
 * per-tab scoping, same fail-open when storage throws. A permalink reached from a shared link or
 * an email — a cold load with nothing recorded — falls back to the bare feed, which is the
 * behaviour that predates all of this.
 */
const RETURN_SCOPE_KEY = 'newsfeed:return-scope';

/**
 * The last non-permalink location the reader visited, path + query. Deliberately NOT in the
 * `newsfeed:` namespace `useScrollRestoration` resets — this is not a feed position, and clearing
 * it on a feed reset would send the back link to the wrong place.
 */
const ORIGIN_HREF_KEY = 'posts:return-origin';

const FEED_HREF = '/newsfeed';

/**
 * Called by `Newsfeed`. It only renders for a real feed scope (`Công nghệ` renders `TrendingList`
 * instead), so every value written here is a column a permalink can legitimately be returned to.
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

/**
 * Called once by `MainShell`, which wraps every `(main)` route. Records the current location
 * unless it is a post permalink — so after a reader opens a post, this key still holds the page
 * they opened it from.
 *
 * PATHNAME-LEVEL, READ FROM `window.location` IN AN EFFECT. `MainShell` has no `useSearchParams`
 * and adding one would force a Suspense boundary around the whole app; reading `window.location`
 * in the effect gets the query for free. The cost is that a tab swapped in with
 * `history.replaceState` (`useTabParam` on `/u/{username}` and `/newsfeed`) is not re-recorded —
 * which is exactly why the feed case is left to the scope-aware href below rather than captured
 * here as a raw `/newsfeed?tab=…` string.
 */
export function useRecordPermalinkOrigin() {
  const pathname = usePathname();

  useEffect(() => {
    // `/posts/{id}` only — the bare `/posts` list, if it ever exists, is a fine origin.
    if (pathname.startsWith('/posts/')) return;
    try {
      sessionStorage.setItem(ORIGIN_HREF_KEY, window.location.pathname + window.location.search);
    } catch {
      // Storage blocked — the back link falls back to the feed, as it did before this existed.
    }
  }, [pathname]);
}

/** No store to subscribe to — the values are read once, when the permalink page mounts. */
const noopSubscribe = () => () => {};

function readFeedReturnHref() {
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
 * The recorded non-feed origin, or `null` when the reader came from the feed itself or from a
 * cold link. A feed origin returns `null` on purpose: `readFeedReturnHref` knows the column and
 * pairs with `useScrollRestoration`, and a bare `/newsfeed` string here would lose both.
 */
function readPermalinkOrigin(): string | null {
  try {
    const href = sessionStorage.getItem(ORIGIN_HREF_KEY);
    if (!href || href === '/' || href.startsWith(FEED_HREF)) return null;
    return href;
  } catch {
    return null;
  }
}

export interface PermalinkBackLink {
  /** A real, known URL — never `router.back()` guesswork. */
  href: string;
  /** True when `href` points back into the feed, so the label can say `Về bảng tin`. */
  toFeed: boolean;
}

/**
 * What `/posts/{id}`'s `←` control should point at: the page the reader opened the post from, or
 * the feed column they were reading, or the bare feed when neither is known.
 *
 * `useSyncExternalStore` RATHER THAN `useState` + `useEffect` — `sessionStorage` cannot be read
 * during render on the server, and this is the sanctioned way to read a client-only value without
 * a setState-in-effect or a hydration mismatch: `getServerSnapshot` returns the bare feed, the
 * client swaps in the real value on hydration. Both snapshots are plain strings / `null`, so
 * React's `Object.is` check settles immediately.
 */
export function usePermalinkBackLink(): PermalinkBackLink {
  const feedHref = useSyncExternalStore(noopSubscribe, readFeedReturnHref, () => FEED_HREF);
  const origin = useSyncExternalStore(noopSubscribe, readPermalinkOrigin, () => null);
  return origin ? { href: origin, toFeed: false } : { href: feedHref, toFeed: true };
}
