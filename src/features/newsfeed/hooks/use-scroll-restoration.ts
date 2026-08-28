'use client';

import { useEffect, useRef } from 'react';

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

export function useScrollRestoration(key: string, ready: boolean) {
  const restored = useRef(false);

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
