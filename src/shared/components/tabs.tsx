'use client';

import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from the design system's `Tabs.d.ts` + `Tabs.prompt.md` contract and the
 * rendered `navigation.card` specimen. No design-system source was read.
 *
 * TWO VARIANTS, AND THE DEFAULT IS `pill`: the selected tab wears a tinted rounded fill and the
 * rest are plain text — no strip, no band, no baseline rule. `underline` is the DS's original
 * `navigation.card` shape, kept for the one screen it still suits (see below). Counts render as
 * mono pills either way (metadata is mono, constitution §7.1).
 *
 * THREE SHAPES WERE TRIED ON THIS COMPONENT IN ONE SITTING, and the two that lost are recorded
 * because each failed for a reason the winner had to answer:
 *
 * | shape | what it drew | why it went |
 * | --- | --- | --- |
 * | underline (DS `navigation.card`) | 2px blue indicator on a full-measure hairline | *don dieu* — a strip that spans the canvas to say which of three words is current |
 * | underline + filled strip | the same, on a `gray-50` band | worse: turned a quiet line into a wide flat band |
 * | segmented control | `gray-200` track, active tab raised as a white card | *xau hon ban dau* — a chunky two-tone block in a system built from hairlines and near-whites |
 *
 * WHAT THE THIRD ONE GETS RIGHT IS SUBTRACTION. Each earlier attempt answered "the switch does not
 * read as a control" by ADDING a surface, and every added surface was a new rectangle competing
 * with the cards already on the page. A pill adds nothing at rest: the inactive tabs are text on
 * whatever plane they were dropped on, and the only new shape on the screen is the one behind the
 * tab you are actually on.
 *
 * IT ALSO SOLVES THE TWO-PLANE PROBLEM THE OTHERS KEPT LOSING TO. `Tabs` lands on a white card
 * (the feed's sticky block) and on bare ground (`/friends`, `/library`, `/admin/moderation`)
 * alike. Any opaque fill that reads on one is invisible or heavy on the other — that is what sank
 * `sunken` (identical to the ground) and then `gray-50` (identical to nothing). With no track,
 * only the active pill has to solve it, and it does so with COLOUR rather than a grey step.
 *
 * WHY `underline` SURVIVES AS A VARIANT INSTEAD OF BEING DELETED. `/newsfeed` keeps it, at the
 * owner's call, and the screen is genuinely a different case from every other caller. Everywhere
 * else the strip is a control DROPPED INTO a page — it sits under a title, on whatever plane the
 * page has, and the less it occupies the better. On the feed the strip IS a block: it is the
 * canvas's first element, it owns a full-measure `StickyBlock` that parks under the chrome, and it
 * is what the reader scrolls the feed past. A pill group inside a 672-wide white bar leaves most
 * of that bar empty and turns the block into a card with a small thing in the corner; the
 * underline's hairline runs the block's width and gives it a reason to be that wide.
 *
 * So the rule is: `underline` when the tabs ARE the block, `pill` when they are a control on one.
 * Today that is exactly one screen, and a variant with one caller is honest here because the
 * alternative — `/newsfeed` reaching in with `className` overrides to undo the pill — would put
 * the same decision somewhere it cannot be read.
 *
 * THE DEVIATION THAT USED TO LIVE HERE IS RESOLVED RATHER THAN DROPPED. `Tabs.d.ts` and the prompt
 * both said "amber active indicator"; the DS's own specimen drew a blue `border-bottom`; blue won
 * because amber is reserved for reputation (§1.3) and an active tab is interactive state (§1.2).
 * Both variants below carry that ruling: `underline` still draws the blue 2px edge, and `pill`
 * moves the same blue onto the tab itself as `surface-selected` + `text-accent`.
 */
export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Rendered as a trailing mono pill. */
  count?: number;
}

export interface TabsProps {
  tabs?: Array<string | TabItem>;
  /** Id of the active tab. */
  active?: string;
  onChange?: (id: string) => void;
  /** @default "md" */
  size?: 'sm' | 'md';
  /**
   * `pill` (default) for a control on a page; `underline` when the tab strip is itself the block,
   * which today means `/newsfeed` and nothing else. The header explains the distinction.
   *
   * @default "pill"
   */
  variant?: 'pill' | 'underline';
  /** Labels the tablist for assistive tech. */
  'aria-label'?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SIZE MEANS TWO DIFFERENT THINGS PER VARIANT, which is why this is a table and not one string.
 *
 * `pill` STATES HEIGHT AS A MINIMUM rather than building it out of vertical padding, because a
 * pill is a shape and a shape has a footprint: `md` lands on the 32 the rail's rows already use,
 * `sm` on 28. Padding would have had to be 6 to reach 32 at this line-height — a number on no
 * ladder in the system, and one that would drift the moment the type scale moved.
 *
 * `underline` KEEPS THE ORIGINAL PADDING, untouched from the DS specimen, and there the padding
 * genuinely IS the height: there is no shape behind the label to be the footprint of, only a
 * baseline the label sits above. Giving it a `min-h` instead would move the hairline.
 */
const sizeStyles: Record<
  NonNullable<TabsProps['variant']>,
  Record<NonNullable<TabsProps['size']>, string>
> = {
  pill: {
    sm: 'min-h-7 px-2.5 text-nx-body-sm',
    md: 'min-h-8 px-3 text-nx-ui',
  },
  underline: {
    sm: 'px-2.5 py-2 text-nx-body-sm',
    md: 'px-3 py-2.5 text-nx-ui',
  },
};

const toItem = (tab: string | TabItem): TabItem =>
  typeof tab === 'string' ? { id: tab, label: tab } : tab;

export function Tabs({
  tabs = [],
  active,
  onChange,
  size = 'md',
  variant = 'pill',
  'aria-label': ariaLabel,
  className,
  style,
}: TabsProps) {
  const items = tabs.map(toItem);
  const activeIndex = items.findIndex((item) => item.id === active);

  // Arrow keys move between tabs (ARIA tabs pattern); focus follows selection, which is
  // safe here because switching a tab only swaps an already-loaded panel.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    let next = -1;

    if (step !== 0 && activeIndex !== -1) {
      next = (activeIndex + step + items.length) % items.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = items.length - 1;
    }

    if (next === -1) return;
    event.preventDefault();
    onChange?.(items[next].id);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      style={style}
      /**
       * IN `pill`, NOTHING IS PAINTED AT THIS LEVEL. No fill, no border, no padding — the element
       * is a positioning box for the tabs and an ARIA landmark, and that is all. Everything the
       * variant says visually is said by the one active pill inside it. `underline` is the
       * opposite: the strip owns the hairline and the tabs only put an indicator on it.
       *
       * EVERYTHING BELOW THIS PARAGRAPH IS ABOUT `pill` ALONE. The underline variant takes none of
       * it — it spans its parent by design, so it has nothing to fit to and nothing to scroll.
       *
       * `w-fit` IS NOT REDUNDANT NEXT TO `inline-flex`, which is what it looks like. Most callers
       * put this inside a `flex flex-col`, and a flex item is STRETCHED to the line by default —
       * `align-items: stretch` beats the intrinsic width `inline-flex` would otherwise take, so
       * without it `/friends` sized to the full measure while the identical control on the feed (a
       * block parent) sized to its tabs. It matters less now that there is no fill to stretch, but
       * it still decides where `overflow-x-auto` starts scrolling.
       *
       * IT SCROLLS ITSELF RATHER THAN PUSHING THE PAGE. Measured at 390: `Lời mời kết bạn · Gợi ý
       * kết bạn · Tất cả bạn bè` is wider than the phone, and a `w-fit` child wider than its parent
       * overflows the CANVAS — the last tab clipped at the viewport edge with the page scrolling
       * sideways to reach it. `max-w-full` caps the strip at the column and the scroll moves
       * inside it, so the tabs stay on one line instead of wrapping and shoving the page down.
       *
       * THE SCROLLBAR IS HIDDEN via Tailwind 4's own `scrollbar-none` (`scrollbar-width: none`),
       * not the old `::-webkit-scrollbar` hack: a 32-tall strip cannot spare the ~12 an
       * always-visible bar takes on Windows, and a half-visible last tab is its own affordance.
       */
      className={cn(
        'gap-1 font-sans',
        variant === 'pill'
          ? 'inline-flex w-fit max-w-full overflow-x-auto scrollbar-none'
          : // R15: the rail the underline tabs sit on is `border-subtle`, not `border-default`.
            // `border-default` climbed the ramp that round to become a line you can actually see;
            // a tab strip's baseline is not that — it is the faintest possible hint of a shared
            // edge, and at the louder value it competed with the 2px indicator sitting on it.
            //
            // PLAIN `flex`, NOT `inline-flex w-fit`: this variant is supposed to span its block,
            // because the hairline running the full measure is the whole point of it.
            'flex border-b border-nx-border-subtle',
        className
      )}
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange?.(item.id)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap',
              // COLOUR ONLY (§2.1) — no lift, no scale, no shadow, in either variant.
              'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
              sizeStyles[variant][size],
              variant === 'pill'
                ? cn(
                    'rounded-nx-sm',
                    isActive
                      ? // `surface-selected` IS THE SYSTEM'S OWN "THIS ONE IS CHOSEN" FILL — `Card`
                        // uses it for exactly this, so a selected tab and a selected card agree.
                        // blue-50 in light, a translucent blue in dark.
                        //
                        // THE BLUE TEXT IS LOAD-BEARING, NOT DECORATION. blue-50 (#eef4fb) against
                        // the ground (gray-100, #eceef0) is nearly the same lightness — on
                        // `/friends` the fill alone would be a hue you can barely see.
                        // `text-accent` carries the state on that plane, the fill carries it on a
                        // white card. Between them the tab is unambiguous on both, which no single
                        // grey step managed across three attempts.
                        'bg-nx-surface-selected font-semibold text-nx-text-accent'
                      : // Transparent at rest — an inactive tab is text on whatever plane it was
                        // dropped on, which is what makes the strip disappear when you are not
                        // using it. Hover borrows the neutral 4% tint, deliberately WEAKER than
                        // the active fill so the two never read as two selections.
                        'font-normal text-nx-text-secondary hover:bg-nx-surface-hover hover:text-nx-text-primary'
                  )
                : cn(
                    // -1px pulls the indicator onto the tablist hairline instead of below it.
                    '-mb-px border-b-2 bg-transparent',
                    isActive
                      ? 'border-nx-accent font-semibold text-nx-text-primary'
                      : 'border-transparent font-normal text-nx-text-secondary hover:text-nx-text-primary'
                  )
            )}
          >
            {item.icon && (
              <span className="shrink-0 [&>svg]:size-4" aria-hidden>
                {item.icon}
              </span>
            )}
            {item.label}
            {item.count !== undefined && (
              // `tint`, NOT A STEP OFF THE RAMP, and this is the one place in the component that
              // still needs an alpha. The count sits on FOUR different backgrounds depending on
              // where the strip landed and whether its tab is selected — white card or grey ground,
              // each with or without the blue fill over it — so any fixed grey is invisible on one
              // of them. `--nx-tint` is defined as the fill that reads on every plane by the same
              // perceptual amount, and it composites over the blue rather than replacing it.
              <span className="rounded-nx-full bg-nx-tint px-2 font-mono text-nx-overline text-nx-text-muted">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
