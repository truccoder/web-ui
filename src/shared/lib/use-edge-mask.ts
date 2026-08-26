'use client';

import * as React from 'react';

/**
 * The "there is more this way" affordance for a strip that scrolls sideways.
 *
 * EXTRACTED FROM `Tabs` AT THE POINT A SECOND CALLER APPEARED, not before. It lived inside that
 * component for as long as it had one user, which was right; `TrendingFilters`' category chips are
 * the second horizontal strip in the product that overflows its measure, and the alternative to
 * moving this out was a copy of the mask arithmetic, the 1px slack and the `ResizeObserver` in a
 * feature folder. The reasoning below is `Tabs`' own, kept with the code it explains.
 */

/**
 * How much of each end of an overflowing strip is faded, and the margin an item keeps from the
 * edge when it scrolls itself in. ONE NUMBER FOR BOTH ON PURPOSE: an item parked exactly at the
 * edge would sit under its own fade and read as half-erased, so any auto-scroll must clear the
 * fade by exactly the fade's width.
 *
 * 20 is `--nx-space-pad`. It is wide enough to read as a soft edge rather than a cut, and narrow
 * enough that at 390 — the width where `/friends`, `/admin/moderation` and the trending chips
 * actually overflow — it never covers a whole label.
 */
export const EDGE_FADE = 20;

/**
 * A HORIZONTAL MASK RATHER THAN TWO ABSOLUTELY-POSITIONED GRADIENT DIVS, which is the usual way
 * to fade a scroller and the wrong one here. An overlay gradient has to be painted in the colour
 * of whatever is behind it, and these strips land on four different planes (page ground, white
 * card, dialog, dark surfaces) — every overlay would need to know which. A mask removes pixels
 * instead of covering them, so it is correct on all four without being told.
 *
 * `undefined` WHEN NEITHER END IS CLIPPED, so a strip that fits is not paying for a mask and its
 * first and last labels are not softened for no reason.
 */
export const edgeMask = (start: boolean, end: boolean) => {
  if (!start && !end) return undefined;
  // `black` IS NOT A COLOUR HERE and no token could replace it: a mask reads only the ALPHA
  // channel, so these stops mean "keep" and "drop". Any opaque value would render identically.
  const head = start ? `transparent 0, black ${EDGE_FADE}px` : 'black 0';
  const tail = end ? `black calc(100% - ${EDGE_FADE}px), transparent 100%` : 'black 100%';
  return `linear-gradient(to right, ${head}, ${tail})`;
};

/**
 * Attaches to a scroller and reports which of its ends currently has more behind it.
 *
 * `widthKey` IS EVERYTHING THAT CAN CHANGE AN ITEM'S WIDTH, as one string. It exists because of a
 * count that arrives late, seen on `/friends/all` at 390: the strip is measured on the first
 * paint, and THEN the query resolves and puts an `8` pill on a tab. The tab grows by ~24, its
 * right edge slides back under the trailing fade, and nothing re-runs. Labels count too — every
 * caller reads its labels through `t()`, and the locale is switchable at runtime.
 *
 * THIS IS STATE RATHER THAN A CSS TRICK because there is no CSS query for "this scroller is not at
 * its end" — and without it the only two honest options are a mask that is always on (softening
 * labels on a strip that fits) or no affordance at all.
 *
 * THE 1px SLACK ON BOTH COMPARISONS IS NOT COSMETIC. `scrollWidth`/`clientWidth` are rounded
 * integers over fractional layout, so a scroller sitting exactly at its end routinely reports a
 * remaining pixel it cannot scroll; without the slack the trailing fade never switches off.
 */
export function useEdgeMask<T extends HTMLElement>(widthKey: string) {
  const ref = React.useRef<T>(null);
  const [clipped, setClipped] = React.useState({ start: false, end: false });

  React.useEffect(() => {
    const list = ref.current;
    if (!list) return;

    const measure = () => {
      const end = list.scrollWidth - list.clientWidth;
      setClipped((prev) => {
        const next = { start: list.scrollLeft > 1, end: list.scrollLeft < end - 1 };
        // Same object when nothing moved: this fires on every scroll frame, and a fresh object
        // each time would re-render the whole strip through the length of a swipe.
        return prev.start === next.start && prev.end === next.end ? prev : next;
      });
    };

    measure();
    list.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => {
      list.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [widthKey]);

  const mask = edgeMask(clipped.start, clipped.end);

  /**
   * THE MASK IS A `style`, NOT A CLASS, because its stops are computed — which end fades depends
   * on where the scroller currently is. Callers spread their own `style` FIRST, so they can still
   * position the strip and cannot accidentally delete the affordance.
   */
  return { ref, clipped, maskStyle: { maskImage: mask, WebkitMaskImage: mask } };
}
