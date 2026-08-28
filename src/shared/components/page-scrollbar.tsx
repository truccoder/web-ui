'use client';

import { useEffect, useRef } from 'react';

/**
 * The document's scrollbar, painted over the page instead of reserved beside it.
 *
 * WHY THIS EXISTS AT ALL, since a browser already has one: a classic scrollbar takes its width
 * out of the content box, and this shell is centred on its ground, so a scrollbar appearing moved
 * every region at once. The defence was `scrollbar-gutter: stable` in `globals.css` — reserve the
 * strip always, and nothing ever moves — and the cost of that defence is what the owner reported:
 * *"khi không cần dùng thì bị hở ra 1 khoảng bên phải"*. The top bar is `surface-card` and
 * full-bleed, so on every screen it stopped 15px short of the glass.
 *
 * THERE IS NO CSS THAT MAKES A DESKTOP SCROLLBAR AN OVERLAY. `overflow: overlay` was removed from
 * Chromium, `scrollbar-width: thin` only narrows the reservation, and hiding the bar without
 * replacing it takes away both the position readout and the drag. So the native document bar is
 * hidden and this draws one: `position: fixed`, therefore no layout, therefore no reservation and
 * no sliver — and no jump either, because there is no longer a width that can change.
 *
 * IT IS VISIBLE WHILE SCROLLING AND FOR {@link IDLE_MS} AFTER, which is the whole request
 * (*"chỉ hiện khi scroll, còn bình thường thì ẩn"*) and also the honest limit of the idea: a
 * scrollbar nobody can see is one nobody can grab, so the thumb stays through the pause after a
 * wheel gesture, and a drag holds it open for as long as the drag lasts.
 *
 * IT ALSO ARMS EVERY OTHER SCROLLER ON THE PAGE, and that is why one component owns the whole
 * behaviour. The rail, the ledger, the transcript and every menu keep their NATIVE scrollbars —
 * 8px in the kit's own form, styled in `globals.css` — and those are transparent until
 * `[data-nx-scrolling]` is on the element. The listener here is in the CAPTURE phase, which is
 * the only way to hear a scroll from a nested element: scroll events do not bubble. The stamp
 * goes on the element that actually scrolled, so scrolling the ledger does not light the rail's
 * bar up beside it.
 *
 * NOTHING HERE IS REACT STATE, DELIBERATELY. A scroll handler that calls `setState` re-renders on
 * every frame of every gesture; this writes `transform`, `height` and `opacity` straight onto one
 * node it owns. The markup is identical on the server and after hydration (opacity 0), so there is
 * nothing to mismatch.
 *
 * `aria-hidden` AND NO ROLE: it is a picture of the scroll position, and the scroll position is
 * already operable by keyboard, wheel and touch without it. A `scrollbar` role would promise a
 * widget a screen reader could drive, which this is not.
 */

/** How long the thumb stays after the last scroll event. Long enough to catch and drag. */
const IDLE_MS = 900;

/** Below this a thumb is a dot, and a dot on a 4000px page cannot be aimed at. */
const MIN_THUMB = 32;

export function PageScrollbar() {
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const thumb = thumbRef.current;
    if (!thumb) return;

    const root = document.documentElement;
    let hideTimer: number | undefined;
    let frame: number | undefined;
    let dragOffset: number | null = null;

    /** Draw the thumb where the document currently is, or take it off the page entirely. */
    const draw = () => {
      frame = undefined;
      const track = root.clientHeight;
      const overflow = root.scrollHeight - track;

      // A document that does not overflow has no thumb — including focus mode, where the shell is
      // `h-[100dvh] overflow-hidden` and the scrolling happens in the regions inside it.
      if (overflow <= 1) {
        thumb.style.opacity = '0';
        thumb.style.pointerEvents = 'none';
        return;
      }

      const height = Math.max(MIN_THUMB, (track / root.scrollHeight) * track);
      const top = (root.scrollTop / overflow) * (track - height);
      thumb.style.height = `${height}px`;
      thumb.style.transform = `translate3d(0, ${top}px, 0)`;
    };

    const schedule = () => {
      frame ??= requestAnimationFrame(draw);
    };

    const show = () => {
      // The drag keeps its own visibility: a pointer held still on the thumb fires no scroll
      // events, and the thumb must not fade out from under the finger holding it.
      if (root.scrollHeight - root.clientHeight > 1) {
        thumb.style.opacity = '1';
        thumb.style.pointerEvents = 'auto';
      }
      window.clearTimeout(hideTimer);
      if (dragOffset === null) hideTimer = window.setTimeout(hide, IDLE_MS);
    };

    // `pointer-events` follows the opacity rather than being left on: an invisible 8px strip down
    // the right edge of the window would swallow clicks meant for whatever is under it.
    const hide = () => {
      thumb.style.opacity = '0';
      thumb.style.pointerEvents = 'none';
    };

    /** The native bars of nested scrollers, revealed for as long as they are moving. */
    const stamps = new Map<Element, number>();
    const stamp = (element: Element) => {
      element.setAttribute('data-nx-scrolling', '');
      window.clearTimeout(stamps.get(element));
      stamps.set(
        element,
        window.setTimeout(() => {
          element.removeAttribute('data-nx-scrolling');
          stamps.delete(element);
        }, IDLE_MS)
      );
    };

    const onScroll = (event: Event) => {
      // The document's own scroll arrives with `document` as its target; everything else is the
      // element that scrolled, however deep in the tree it sits.
      if (event.target === document || event.target === root) {
        schedule();
        show();
      } else if (event.target instanceof Element) {
        stamp(event.target);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      // Where in the thumb it was grabbed, so the thumb does not jump under the cursor.
      dragOffset = event.clientY - thumb.getBoundingClientRect().top;
      thumb.setPointerCapture(event.pointerId);
      window.clearTimeout(hideTimer);
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (dragOffset === null) return;
      const track = root.clientHeight;
      const overflow = root.scrollHeight - track;
      const travel = track - thumb.offsetHeight;
      if (travel <= 0) return;
      // The thumb's travel is `track − thumb`, the document's is `scrollHeight − track`; a drag is
      // one mapped onto the other. `scrollTo` rather than `scrollTop =` so a smooth-scroll setting
      // elsewhere cannot animate a drag.
      root.scrollTo({ top: ((event.clientY - dragOffset) / travel) * overflow, behavior: 'auto' });
    };

    const onPointerUp = (event: PointerEvent) => {
      if (dragOffset === null) return;
      dragOffset = null;
      thumb.releasePointerCapture(event.pointerId);
      show();
    };

    // Capture, because scroll events from nested scrollers do not bubble to the window.
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    thumb.addEventListener('pointerdown', onPointerDown);
    thumb.addEventListener('pointermove', onPointerMove);
    thumb.addEventListener('pointerup', onPointerUp);
    thumb.addEventListener('pointercancel', onPointerUp);

    // The feed grows under the reader without anyone scrolling — a page that got taller while the
    // thumb was idle would otherwise keep drawing yesterday's proportions until the next gesture.
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    if (document.body) observer.observe(document.body);

    draw();

    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', schedule);
      thumb.removeEventListener('pointerdown', onPointerDown);
      thumb.removeEventListener('pointermove', onPointerMove);
      thumb.removeEventListener('pointerup', onPointerUp);
      thumb.removeEventListener('pointercancel', onPointerUp);
      observer.disconnect();
      window.clearTimeout(hideTimer);
      if (frame !== undefined) cancelAnimationFrame(frame);
      for (const [element, timer] of stamps) {
        window.clearTimeout(timer);
        element.removeAttribute('data-nx-scrolling');
      }
    };
  }, []);

  return (
    <div
      aria-hidden
      // `z-40`: above the shell's own sticky chrome (30) and the docked chat (40 too, and this is
      // later in the DOM), below the 50 that dialogs, the drawer and the palette share — a modal
      // dims the page it covers, and a thumb riding over that dim would be the one thing on screen
      // that did not go quiet.
      className="pointer-events-none fixed inset-y-0 right-0 z-40 w-2"
    >
      <div
        ref={thumbRef}
        style={{ opacity: 0 }}
        className="pointer-events-none absolute inset-x-0 top-0 rounded-nx-full bg-nx-border-default transition-opacity duration-[var(--nx-duration-base)] ease-nx-out"
      />
    </div>
  );
}
