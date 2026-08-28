'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/core/i18n';

/**
 * A block that stops at a height and offers the rest in a dialog.
 *
 * THE PROBLEM IT SOLVES IS THE FEED'S, NOT THE POST'S. One card with sixty lines of code or nine
 * paragraphs of prose is not badly formatted — it is fine on its own permalink. What it breaks is
 * the column: a reader scrolling a feed loses the sense that there are other posts, and the two
 * cards on either side of it become unreachable without a long drag. So the cap belongs to the
 * CARD, and the full text belongs somewhere the reader chooses to go.
 *
 * "XEM THÊM" IS A LINK TO THE POST, NOT A DIALOG AND NOT AN INLINE EXPAND — the owner's call,
 * after a round where it opened a modal.
 *
 * Growing in place was never on the table: it pushes every card below down by however much it
 * grew and hands the feed the same sixty-line card the cap existed to prevent. Between a dialog
 * and a navigation, the navigation is the better answer for a reason the dialog cannot match —
 * `/posts/{id}` ALREADY EXISTS and is already the full view. It has the whole body, the whole
 * snippet, the discussion expanded, and an address the reader can share or come back to. A modal
 * would have been a second, worse copy of a page this product already ships.
 *
 * MEASURED, NOT COUNTED. Whether the content overflows is read off the DOM (`scrollHeight` vs the
 * cap) rather than guessed from a line count or a character count: the same 400 characters is two
 * lines of prose at 672 wide and eight on a phone, and a code block's line count says nothing
 * about how many of those lines wrap. A `ResizeObserver` re-checks on width changes, so rotating
 * a phone or opening the ledger flank does not leave a stale "Xem thêm" on a block that now fits.
 *
 * THE COLLAPSED COPY IS NOT HIDDEN FROM ASSISTIVE TECH. The clamp is `max-height` + `overflow`,
 * so the whole text stays in the accessibility tree and a screen reader hears the post in full
 * without going through the dialog at all. The button is an affordance for sighted scrolling, not
 * a gate on the content.
 */
export interface ExpandableBlockProps {
  /** Height in px the collapsed block is capped at. */
  maxHeight: number;
  /** Where the whole thing lives — the post's permalink. */
  href: string;
  /**
   * Lands on the "Xem thêm" button.
   *
   * SEPARATE FROM `className` BECAUSE THE BUTTON IS NOT INSIDE THE CLAMPED BOX. It is a sibling —
   * it has to be, or the cap would clip the control that undoes the cap — so a caller that needs
   * to inset it (the code figure, whose padding lives on the `<pre>` rather than on the figure)
   * has no other way to reach it.
   */
  buttonClassName?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ExpandableBlock({
  maxHeight,
  href,
  buttonClassName,
  className,
  children,
}: ExpandableBlockProps) {
  const t = useT();
  const ref = React.useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // `+1` of slack: sub-pixel line heights make `scrollHeight` exceed a cap it visually fits,
    // which would put a "Xem thêm" on a block with nothing more to show.
    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1);

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children, maxHeight]);

  return (
    <>
      <div className={cn('relative', className)}>
        <div
          ref={ref}
          /**
           * THE CAP IS ALWAYS ON, AND THE FIRST VERSION OF THIS ONLY APPLIED IT ONCE `overflows`
           * WAS TRUE — which is a circle that never closes. `overflows` is measured as
           * `scrollHeight > clientHeight`, and those two are equal by definition on a box with no
           * height constraint, so the flag could never flip and no "Xem thêm" ever appeared.
           * Caught by lowering the threshold to 90 against a six-line snippet and still getting
           * zero buttons.
           *
           * Leaving it on costs nothing when the content is shorter: a `max-height` above the
           * natural height does not clip, and `overflow: hidden` has nothing to hide.
           */
          style={{ maxHeight, overflow: 'hidden' }}
        >
          {children}
        </div>

        {overflows && (
          <>
            {/* THE FADE SAYS "THIS IS CUT", which a hard edge does not: a block that simply stops
                mid-sentence reads as a rendering bug for the second it takes to find the button.
                `to-nx-surface-card` because every one of these sits on a card — the gradient has
                to end in the fill behind it or it draws a grey band. `pointer-events-none` so it
                never eats a click meant for the text under it. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-nx-surface-card"
            />
          </>
        )}
      </div>

      {overflows && (
        <Link
          href={href}
          className={cn(
            'mt-2 w-fit text-nx-body-sm font-medium text-nx-text-link',
            'hover:text-nx-text-link-hover',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
            buttonClassName
          )}
        >
          {t('post.showMore')}
        </Link>
      )}
    </>
  );
}
