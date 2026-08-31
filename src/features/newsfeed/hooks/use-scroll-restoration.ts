'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Puts the feed back where the reader left it after they open a post and come back.
 *
 * WHY THE BROWSER DOES NOT DO THIS FOR US, which is the first thing worth ruling out. Next's App
 * Router does restore scroll on a genuine back/forward — but the way out of a post is the
 * `← Về bảng tin` link at the top of `/posts/{id}`, and a link is a FORWARD navigation. The router
 * scrolls a forward navigation to the top, correctly and by design. So the reader who scrolled
 * through forty cards, opened one and pressed the link that exists to bring them back landed at
 * card one. Reported exactly that way.
 *
 * SO IT IS SAVED AND REPLAYED RATHER THAN LEFT TO HISTORY, and that also covers the cases history
 * cannot: arriving at the post from a shared link, or from search, and then going to the feed.
 *
 * `sessionStorage`, NOT A MODULE VARIABLE. A module variable would survive client-side navigation
 * but not a reload, and reloading a post and going back is exactly when someone has lost their
 * place and most wants it returned. Session scope also means one tab does not move another tab's
 * feed, and the value dies with the tab rather than following the reader back tomorrow.
 *
 * THE REPLAY WAITS FOR HEIGHT, WHICH IS THE WHOLE DIFFICULTY. `window.scrollTo(0, 3400)` on a
 * document that is currently 900 tall silently clamps to the bottom of what exists — and the feed
 * mounts short, then grows as react-query's cached pages render. So this polls on
 * `requestAnimationFrame` until the document is actually tall enough, and gives up after
 * `MAX_FRAMES` rather than looping forever on a feed that came back shorter than it went away
 * (a post deleted, a filter changed). Giving up leaves the reader at the top, which is the old
 * behaviour — never worse than before.
 */

/** ~half a second at 60fps. Long enough for cached pages to paint, short enough not to fight a
 *  reader who has already started scrolling themselves. */
const MAX_FRAMES = 30;

/** How long recording stays frozen after a click, i.e. long enough to outlast the router's
 *  scroll-to-top animation without silencing a reader who clicked something harmless. */
const FREEZE_MS = 1000;

/**
 * Every position this hook stores lives under one prefix, so a reset can clear the whole set
 * without knowing which columns have been read. It is deliberately NOT the bare `newsfeed:`:
 * `useFeedReturn` keeps its own key in that namespace, and a reset that wiped the return scope
 * would send a permalink's `← Về bảng tin` back to the default tab instead of the column it
 * was opened from.
 */
const SCROLL_PREFIX = 'newsfeed:scroll:';

/** The storage key for one column, narrowed by a hashtag when one is applied. */
export function feedScrollKey(scope: string, hashtag?: string) {
  return `${SCROLL_PREFIX}${scope}${hashtag ? `:#${hashtag}` : ''}`;
}

/**
 * Forget every stored feed position. Called when the reader asks for a fresh start — a reload,
 * or the brand mark in the top bar — so no column comes back mid-scroll afterwards.
 */
export function clearFeedScroll() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const stored = sessionStorage.key(i);
      if (stored?.startsWith(SCROLL_PREFIX)) sessionStorage.removeItem(stored);
    }
  } catch {
    // Private mode and blocked site data throw on any access. There is then nothing stored to
    // clear either, so the reader gets the top of the feed regardless.
  }
}

/**
 * A RELOAD IS NOT A RETURN, AND TREATING IT AS ONE IS THE BUG THIS GUARD FIXES.
 *
 * Reported by the owner: refresh (and hard refresh) on `Bài viết` left the feed exactly where it
 * had been left, instead of opening at the top. Two separate mechanisms were doing it.
 *
 * OURS. The position is recorded on every scroll into `sessionStorage`, which by design survives
 * a reload — that is what makes "reload a post, then press back to the feed" work. So the feed
 * mounted on a fresh document, found a position and replayed it. But the trip that position was
 * saved for never happened: F5 is a request for the page, not a return from somewhere.
 *
 * THE BROWSER'S. `history.scrollRestoration` is `auto` and the App Router leaves it that way, so
 * the engine puts the document back on its own as the feed grows — which is why the position came
 * back even after the stored one was cleared. It is turned off for the length of THIS load only
 * and handed straight back, so back/forward keeps restoring the way it should.
 *
 * WHAT COUNTS AS A FRESH LOAD IS "the document was opened ON this page". The navigation entry
 * carries the URL the document was loaded with, so a reload of `/newsfeed` matches and a reload of
 * `/posts/{id}` followed by the back link does not — the second is still a return, and still
 * restores. `back_forward` is excluded outright: there the reader is walking history, and history
 * is exactly what they asked to see again.
 */
let entryLoadHandled = false;

function isFreshLoadOfThisPage() {
  try {
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (!nav || nav.type === 'back_forward') return false;
    return new URL(nav.name).pathname === window.location.pathname;
  } catch {
    return false;
  }
}

export function useScrollRestoration(key: string, ready: boolean) {
  const restored = useRef(false);

  /**
   * Runs before paint and before `ready`, because both halves of the reset are races: the stored
   * value has to be gone before the replay effect below can read it, and the browser's own
   * restoration lands as soon as the document is tall enough to hold the old position.
   *
   * ONE-SHOT PER DOCUMENT, via a module flag rather than a ref — the flag has to outlive this
   * component so the SECOND time the feed mounts (the reader opened a post and came back) the
   * replay works normally. It is module state in a client bundle, so a real reload resets it,
   * which is precisely the lifetime wanted.
   */
  useLayoutEffect(() => {
    if (entryLoadHandled) return;
    entryLoadHandled = true;
    if (!isFreshLoadOfThisPage()) return;

    // Nothing to replay on this visit, and the replay effect must not try: it would only find a
    // stale position if a write landed between here and there.
    restored.current = true;
    clearFeedScroll();

    const wasAuto = window.history.scrollRestoration === 'auto';
    if (wasAuto) window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    if (!wasAuto) return;
    // Given back once the load is over: `manual` is scoped to a document, and leaving it on would
    // silently disable scroll restoration for every back/forward taken in this tab afterwards.
    const release = () => {
      window.history.scrollRestoration = 'auto';
    };
    if (document.readyState === 'complete') {
      const timer = setTimeout(release, 0);
      return () => clearTimeout(timer);
    }
    window.addEventListener('load', release, { once: true });
    return () => window.removeEventListener('load', release);
  }, []);

  /**
   * Record continuously rather than on unmount only: a hard navigation (a real link click that
   * reloads, a crash) never runs a cleanup, and the last scroll event is a good enough answer.
   *
   * ZERO IS NEVER WRITTEN, AND THAT IS THE FIX FOR THE BUG THIS HOOK SHIPPED WITH.
   *
   * The router scrolls to the top as part of leaving the page, which fires a scroll event like
   * any other — so the last thing saved before opening a post was `0`, wiping the position that
   * had just been saved. Measured: `sessionStorage` held `2713` while reading the feed and `0`
   * one tick after clicking into a post, and the reader came back to the top every time.
   *
   * There is no way to tell the router's reset apart from a reader scrolling to the top by hand,
   * because they are the same event. Refusing to persist `0` picks the failure that costs less:
   * a reader who scrolls to the very top and then opens a post is returned to where they had been
   * deepest instead of to the top. The read below is one-shot, so it happens at most once.
   */
  useEffect(() => {
    let frozen = false;
    let thaw: ReturnType<typeof setTimeout> | undefined;

    const save = () => {
      if (frozen) return;
      const y = Math.round(window.scrollY);
      if (y <= 0) return;
      try {
        sessionStorage.setItem(key, String(y));
      } catch {
        // Private mode and blocked site data both throw here. Losing the position is the correct
        // degradation; taking the feed down for it is not.
      }
    };

    /**
     * A CLICK IS THE MOMENT OF INTENT, AND RECORDING THERE IS WHAT MAKES THIS CORRECT.
     *
     * Refusing to write `0` was not enough on its own: the router's scroll-to-top is ANIMATED, so
     * the events it fires on the way up are ordinary non-zero positions. Measured — the feed was
     * left at 2713 and the stored value came out `1832`, a frame somewhere in the middle of that
     * animation.
     *
     * Capture runs before the click reaches the link, so `window.scrollY` here is still where the
     * reader actually was. Freezing afterwards is what keeps the animation from overwriting it.
     * The thaw exists for clicks that were not navigations at all — a reaction, a menu — after
     * which recording has to resume or the next scroll would never be saved.
     */
    const onClick = () => {
      save();
      frozen = true;
      clearTimeout(thaw);
      thaw = setTimeout(() => {
        frozen = false;
      }, FREEZE_MS);
    };

    window.addEventListener('scroll', save, { passive: true });
    document.addEventListener('click', onClick, true);
    return () => {
      save();
      clearTimeout(thaw);
      window.removeEventListener('scroll', save);
      document.removeEventListener('click', onClick, true);
    };
  }, [key]);

  useEffect(() => {
    if (!ready || restored.current) return;

    /**
     * READ, BUT NOT CONSUMED UNTIL IT LANDS — and consuming on read was a real bug, not caution.
     *
     * React's dev StrictMode runs an effect, tears it down, and runs it again. The first pass read
     * the position AND deleted it, then the teardown cancelled its own `requestAnimationFrame`;
     * the second pass found an empty key and gave up. Net result: nothing was ever restored, and
     * only in development, which is where it was being tested. Measured — the value was saved
     * correctly and the feed still opened at the top.
     *
     * Deleting on success instead is idempotent under a double invoke and still gives the
     * one-shot behaviour the paragraph below wants.
     */
    let target = 0;
    try {
      target = Number(sessionStorage.getItem(key) ?? 0);
    } catch {
      target = 0;
    }

    if (!Number.isFinite(target) || target <= 0) {
      restored.current = true;
      return;
    }

    let frame = 0;
    let handle = 0;

    const tick = () => {
      const reachable = document.documentElement.scrollHeight - window.innerHeight;
      if (reachable >= target || frame >= MAX_FRAMES) {
        window.scrollTo(0, Math.min(target, Math.max(reachable, 0)));
        restored.current = true;
        /**
         * SPENT ON THE TRIP IT WAS SAVED FOR. Clearing here rather than at read time keeps a stale
         * position from following the reader around: a later visit to the feed — from the rail,
         * from a notification — opens at the top like any other page.
         */
        try {
          sessionStorage.removeItem(key);
        } catch {
          // Same storage-blocked case as the writer. Nothing to do and nothing worth reporting.
        }
        return;
      }
      frame += 1;
      handle = requestAnimationFrame(tick);
    };

    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [key, ready]);
}
