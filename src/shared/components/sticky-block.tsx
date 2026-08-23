'use client';

import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * A canvas block that parks under the chrome instead of scrolling away with the page.
 *
 * THIS DEVICE HAS A HISTORY AND THE HISTORY IS THE SPEC. Round 9 made a stuck block *join* the
 * chrome stack — chrome fill, bleed to the region edge, no shadow of its own, the shadow handed
 * down to the top-bar-plus-block pair. Round 10 reverted it at the design system owner's
 * instruction, and the reason is measurable rather than aesthetic: a 720-wide fill inside a 672
 * content column is a second chrome bar of a DIFFERENT WIDTH from the real one, 56px below it. At
 * 1440 the eye reads two competing bars, which is worse than the *thập thò* the bleed was meant to
 * fix. `handoff/density-r10.md` §1.
 *
 * > **A STUCK BLOCK IS STILL A CARD.** It keeps the measure, the card fill and its own shadow,
 * > and squares its **top two corners only** — the corners the feed passes behind.
 *
 * THE SHADOW SURVIVES, and R10 states that rather than inheriting it. Square top corners are a
 * claim about *contact* — the block is flush against the chrome above. They say nothing about the
 * block's relationship to the content moving underneath, and without a shadow a square-cornered
 * card fixed over scrolling content has no separation device left at all. R4's surface model is
 * that a card on the ground is raised; one that is raised *and* fixed while everything behind it
 * moves needs the cue more, not less.
 *
 * THE SHADOW STEPS TO `nx-2` — the owner's call, seen in a real window, which is the one thing
 * R10's note said was still outstanding. `nx-1` is a hairline: at 672 wide with a feed sliding
 * beneath it, it was not carrying the separation the paragraph above asks it to carry.
 *
 * THE BOTTOM CORNERS STAY ROUNDED, and they were squared for one round before being put back —
 * recorded because the reverted version is the argument for the current one. Squaring all four
 * made the block a full-width band, which is R9's shape and R10's complaint: a 672 band is a
 * second chrome bar of the wrong width. Only the TOP corners touch anything, so only they have a
 * reason to be square; the bottom edge is where the feed slides past, and that is the edge R10
 * gives the shadow to rather than a corner.
 *
 * WHY A SENTINEL RATHER THAN READING `scrollY`. The block restyles on stick, so watching the block
 * itself would be watching an effect of the thing being detected. A near-invisible element directly
 * above it crosses the chrome line at exactly the moment the block latches, and never changes its
 * own appearance.
 *
 * THE SENTINEL IS 1px TALL RATHER THAN THE KIT'S ZERO, and the honest reason is caution, not a
 * measured defect: a zero-area target is the one case where `IntersectionObserver`'s intersection
 * rectangle is empty by construction, and engines have historically disagreed about whether such a
 * target is ever reported. One pixel removes the question. It is paid straight back in the margin
 * — `calc(-1 * (block + 1px))` cancels both the flex gap the sentinel would occupy and its own
 * height — so it still costs nothing in layout.
 *
 * WHAT IS NOT VERIFIED, STATED PLAINLY: the latch itself. `IntersectionObserver` only delivers
 * callbacks in a browser that is compositing frames, and the harness's browser pane was not
 * displayed, so **no** observer fired in that environment — not this one, and not the app's own
 * infinite-scroll sentinels either. The geometry below it (parks at 56, keeps the measure, keeps
 * its fill) was measured and is correct; the restyle on stick — shadow on, top corners squared —
 * is implemented to `density-r10.md` §1 and still needs one look in a real window.
 *
 * `transition: none` is deliberate: the radius and shadow must land on the same frame the position
 * latches, or the corners visibly round themselves a beat after the block has already stopped.
 */
export interface StickyBlockProps {
  children?: React.ReactNode;
  className?: string;
}

export function StickyBlock({ children, className }: StickyBlockProps) {
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = React.useState(false);

  React.useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    // The sentinel leaves the viewport exactly when the block reaches the chrome line, so the
    // top-bar height is subtracted from the observer's root rather than compared by hand.
    const observer = new IntersectionObserver((entries) => setStuck(!entries[0].isIntersecting), {
      rootMargin: '-56px 0px 0px 0px',
      threshold: 0,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        ref={sentinelRef}
        aria-hidden
        className="h-px [margin-bottom:calc(-1*(var(--nx-space-block)+1px))]"
      />
      <div
        className={cn(
          'sticky top-nx-topbar z-20 overflow-hidden bg-nx-surface-card [transition:none]',
          stuck ? 'rounded-t-none rounded-b-nx-md shadow-nx-2' : 'rounded-nx-md',
          className
        )}
      >
        {children}
      </div>
    </>
  );
}
