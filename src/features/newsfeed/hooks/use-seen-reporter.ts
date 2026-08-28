'use client';

import { useCallback, useEffect, useRef } from 'react';
import { newsfeedApi } from '../api/feed';

/**
 * Reports feed cards to `POST /v1/api/feed/seen` once the reader has actually read them, so the
 * fan-out feed stops floating the same posts back to the top on the next visit.
 *
 * WHAT COUNTS AS READ IS THE BACKEND'S DEFINITION, transcribed from `MarkSeenRequestDto`: a card
 * that has been *at least half on screen*, OR *on screen at all for a full second*, and has then
 * scrolled away. The ratio is the fast path — a quick glance down a short column — and the dwell
 * timer is for a card taller than the viewport, which can never reach half and would otherwise
 * never qualify.
 *
 * ONE REQUEST WHEN SCROLLING SETTLES, NOT ONE PER CARD. Qualified ids collect in a set and flush
 * after a beat of stillness; `visibilitychange → hidden` and unmount flush early, because a reader
 * who switches tabs or leaves the feed mid-column has still read what was on screen. The batch is
 * capped at the endpoint's 200 (`@Size(max = 200)` — over it the whole request is a 422) and the
 * remainder goes out in the same flush, one more request.
 *
 * FIRE AND FORGET. The endpoint answers 204 and the whole feature fails open server-side
 * (`SeenPostTracker` sits outside the readiness group): a dropped beacon costs the reader the
 * demotion and nothing they can see. So the promise is swallowed and nothing waits on it — the
 * same reason there is no react-query mutation here, just a call.
 *
 * ONLY FOR THE FAN-OUT FEED. `POST /feed/seen` reorders `GET /feed`; the `Tất cả` tab is
 * `GET /posts/public`, an id-ordered table scan with no ranking to demote and no seen-set keyed
 * for it. The caller passes `active: false` there and no observer is ever created — which also
 * keeps the beacon off a guest, who only ever sees that tab.
 */

/** Half the card's box inside the viewport — the backend's "covering at least half its area". */
const HALF_ON_SCREEN = 0.5;

/** "Visible for at least a second" for a card too tall to ever reach {@link HALF_ON_SCREEN}. */
const DWELL_MS = 1000;

/** Quiet time after the last card leaves the viewport before the batch goes out. */
const SETTLE_MS = 500;

/** `MarkSeenRequestDto` caps one request at 200 ids; a larger flush splits into several. */
const MAX_BATCH = 200;

/**
 * Returns a factory of callback refs — `ref={track(post.postId)}` on a wrapper around each card.
 * The ref is stable per id, so it does not re-observe on every render of the list.
 */
export function useSeenReporter(active: boolean) {
  /** Sent already this session — never reported twice, and the reason re-observing is cheap. */
  const reported = useRef(new Set<number>());
  /** Read (met one of the two thresholds) but still on screen. */
  const qualified = useRef(new Set<number>());
  /** Read and gone — waiting for the batch to go out. */
  const pending = useRef(new Set<number>());
  /** Running dwell timers, keyed by post id, cancelled if the card leaves early. */
  const dwell = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  /** The settle timer — reset on every card that leaves, so it fires once scrolling stops. */
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Which post each observed element belongs to. Weak so a removed card needs no cleanup. */
  const idFor = useRef(new WeakMap<Element, number>());
  /** Elements currently mounted — replayed into the observer whenever it is (re)created. */
  const elements = useRef(new Set<HTMLElement>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const refCache = useRef(new Map<number, (el: HTMLElement | null) => (() => void) | void>());

  const flush = useCallback((settled: boolean) => {
    if (settle.current) {
      clearTimeout(settle.current);
      settle.current = null;
    }

    if (!settled) {
      // Teardown or tab hide: a card still on screen has been read too, so promote what qualified
      // but never got the chance to leave.
      qualified.current.forEach((id) => pending.current.add(id));
      qualified.current.clear();
    }

    // Usually one pass over a handful of ids; the loop is only reached by a torn-through scroll
    // that piled up more than the endpoint's cap between two settles.
    while (pending.current.size > 0) {
      const batch = [...pending.current].slice(0, MAX_BATCH);
      for (const id of batch) {
        pending.current.delete(id);
        reported.current.add(id);
      }
      void newsfeedApi.markSeen(batch).catch(() => {});
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => flush(true), SETTLE_MS);
  }, [flush]);

  useEffect(() => {
    if (!active || typeof IntersectionObserver === 'undefined') return;

    const timers = dwell.current;
    const mounted = elements.current;
    const seenBy = idFor.current;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = seenBy.get(entry.target);
          if (id == null || reported.current.has(id)) continue;

          if (entry.intersectionRatio >= HALF_ON_SCREEN) {
            // Enough of the card is on screen — it counts as read immediately, and any dwell
            // timer it had is now moot.
            qualified.current.add(id);
            const timer = timers.get(id);
            if (timer) {
              clearTimeout(timer);
              timers.delete(id);
            }
          } else if (entry.isIntersecting) {
            // Partly on screen — counts as read only if it stays that way for a second.
            if (!timers.has(id) && !qualified.current.has(id)) {
              timers.set(
                id,
                setTimeout(() => {
                  qualified.current.add(id);
                  timers.delete(id);
                }, DWELL_MS)
              );
            }
          } else {
            // Left the viewport. A card that never qualified is simply dropped.
            const timer = timers.get(id);
            if (timer) {
              clearTimeout(timer);
              timers.delete(id);
            }
            if (qualified.current.delete(id)) {
              pending.current.add(id);
              scheduleFlush();
            }
          }
        }
      },
      { threshold: [0, HALF_ON_SCREEN] }
    );

    observerRef.current = observer;
    // Refs run during commit, before this effect — so the first screen of cards is already
    // mounted and unobserved by the time we get here.
    mounted.forEach((el) => observer.observe(el));

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush(false);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      observer.disconnect();
      observerRef.current = null;
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      flush(false);
    };
  }, [active, flush, scheduleFlush]);

  return useCallback((postId: number) => {
    const cached = refCache.current.get(postId);
    if (cached) return cached;

    const ref = (el: HTMLElement | null) => {
      if (!el) return;
      idFor.current.set(el, postId);
      elements.current.add(el);
      observerRef.current?.observe(el);
      return () => {
        elements.current.delete(el);
        observerRef.current?.unobserve(el);
      };
    };
    refCache.current.set(postId, ref);
    return ref;
  }, []);
}
