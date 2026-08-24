'use client';

import * as React from 'react';
import { cn } from '@/shared/lib/cn';
import { EDGE_FADE, useEdgeMask } from '@/shared/lib/use-edge-mask';

/**
 * Hand-written from the design system's `Tabs.d.ts` + `Tabs.prompt.md` contract and the
 * rendered `navigation.card` specimen. No design-system source was read.
 *
 * TWO VARIANTS, AND THEY DIFFER BY EXACTLY ONE THING: the rail. Both mark the current tab with a
 * 2px accent bar under its label. `underline` also draws a hairline across the whole strip for
 * that bar to sit on; `inline` (the default) draws no rail at all, so the bar is as wide as the
 * label and nothing else is painted. Counts render as mono pills either way (metadata is mono,
 * constitution §7.1).
 *
 * FOUR SHAPES WERE TRIED BEFORE THIS ONE, and all four are recorded because the survivor is only
 * defensible as the answer to what each of them got wrong:
 *
 * | shape | what it drew | why it went |
 * | --- | --- | --- |
 * | underline, full rail (DS `navigation.card`) | 2px accent on a full-measure hairline | *don dieu* — a strip that spans the canvas to say which of three words is current |
 * | underline + filled strip | the same, on a `gray-50` band | worse: turned a quiet line into a wide flat band |
 * | segmented control | `gray-200` track, active tab raised as a white card | *xau hon ban dau* — a chunky two-tone block in a system built from hairlines and near-whites |
 * | pill | active tab wearing a tinted rounded fill, the rest plain text | shipped for two rounds and was still not right; see below |
 *
 * THE PILL IS THE INTERESTING FAILURE, because on paper it answered everything. It added no shape
 * at rest, it sized to its own label, and once `--nx-surface-selected` became an alpha accent it
 * was legible on every plane the component lands on. The owner's verdict after living with it was
 * still *chua hai long* — and the reason it could not be argued away is that A FILL IS A SHAPE.
 * A tinted rounded rectangle is one more rectangle on a canvas already made of cards, competing
 * with them at the same scale for the sake of a one-of-three choice. Every earlier attempt failed
 * by adding a surface; the pill added a smaller surface and failed the same way, more quietly.
 *
 * WHAT WAS ACTUALLY WRONG WITH THE FIRST ROW OF THAT TABLE WAS THE RAIL, NOT THE UNDERLINE. The
 * recorded complaint is precise — a strip that spans the canvas to say which of three words is
 * current — and it is a complaint about a hairline running past the last tab to the far edge of
 * the measure, not about the mark under the current label. Drop the rail and the objection goes
 * with it: at rest the strip paints NOTHING, which is the subtraction every attempt since has
 * been reaching for, and the only ink on screen is a short bar under one word.
 *
 * A BAR SOLVES THE TWO-PLANE PROBLEM OUTRIGHT, where every fill could only negotiate with it.
 * `Tabs` lands on the page ground, on white cards, inside dialogs and in both themes; a fill has
 * to be a colour that contrasts with all four backgrounds, which is what sank `sunken`, then
 * `gray-50`, then blue-50, and what forced `--nx-surface-selected` to become an alpha. A solid
 * accent bar composites against nothing — it reads the same on every one of them, at no cost in
 * tokens.
 *
 * AND IT POINTS AT THE PANEL. The vertical rule this component now assumes (see the rhythm note
 * below) is that a strip binds DOWN to the thing it names. A pill is a self-contained object that
 * says nothing about direction; a bar on the bottom edge of the label is aimed at the content 16
 * below it. The control and the spacing argue for the same thing.
 *
 * WHY `underline` SURVIVES AS A SEPARATE VARIANT. `/newsfeed` keeps the rail, at the owner's call,
 * and the screen is genuinely a different case. Everywhere else the strip is a control DROPPED
 * INTO a page — it sits under a title, on whatever plane the page has, and the less it occupies
 * the better. On the feed the strip IS a block: it is the canvas's first element, it owns a
 * full-measure `StickyBlock` that parks under the chrome, and it is what the reader scrolls the
 * feed past. There the hairline is not *don dieu*: it runs the block's width and gives the block a
 * reason to be that wide.
 *
 * So the rule is: `underline` when the tabs ARE the block, `inline` when they are a control on
 * one. Today that is exactly one screen, and a variant with one caller is honest here because the
 * alternative — `/newsfeed` reaching in with `className` overrides to undo the default — would put
 * the same decision somewhere it cannot be read.
 *
 * `underline` SCROLLS NOW TOO, AND THIS FILE SAID TWICE THAT IT NEVER WOULD — *"it spans its
 * parent by design, so it has nothing to fit to and nothing to scroll"*. That was true of three
 * short labels and stopped being true at four: `Tất cả · Bạn bè · Kỹ năng của tôi · Công nghệ`
 * measures 371 inside a 343 column at 375, and the feed's strip lives in a `StickyBlock` whose
 * `overflow-hidden` CLIPPED the fourth tab with no way to reach it. The overflow machinery below
 * was already written and already correct; it was gated on the variant rather than on whether
 * anything actually overflowed, which is the bug. Nothing changes for a strip that fits: the mask
 * is `undefined` and the scroller has nothing to scroll.
 *
 * THE 1px THAT PAID FOR IT. `underline`'s tabs carry `-mb-px` so the 2px indicator lands ON the
 * strip's hairline rather than under it — and `overflow-x: auto` forces `overflow-y: auto`, so
 * that one pixel of deliberate overflow turned the strip into a VERTICAL scroller as well
 * (measured: `scrollHeight` 43 against `clientHeight` 42). `pb-px` on the strip absorbs it. The
 * indicator still sits exactly on the hairline — the padding moves the hairline down by the same
 * pixel the tab reaches up — and the strip is one pixel taller for it.
 *
 * FOUR MECHANICAL DEFECTS WERE FIXED ALONGSIDE THE SHAPE and none of them were the shape's fault,
 * so all four are kept:
 *
 *  1. THE STRIP REFLOWED ON EVERY CLICK. Active was `font-semibold` and inactive `font-normal`, so
 *     selecting a tab WIDENED it and shoved its neighbours sideways — out from under the pointer
 *     that had just clicked. `inline` is one weight; the bar and the text colour carry the state.
 *     `underline` keeps the swap, being out of scope by the owner's instruction, and it costs less
 *     there: that strip is `flex`, not `inline-flex w-fit`, so a tab changing width redistributes
 *     inside a box whose own width never moves.
 *  2. THE FOCUS RING WAS CLIPPED. `overflow-x: auto` forces the computed `overflow-y` to `auto`
 *     too, so an `outline-offset-2` ring on a tab in a strip exactly one tab tall was cut off on
 *     all four sides at once. BOTH variants take an INSET ring now — see the next paragraph.
 *  3. NOTHING SAID THE STRIP SCROLLED. Five admin tabs and the three Vietnamese labels on
 *     `/friends` both overflow at 390, the scrollbar is hidden by design, and a tab selected
 *     off-screen — which is what arrowing to it does — left the strip looking unchanged. The ends
 *     now fade while there is more in that direction, and the active tab scrolls itself into view.
 *  4. THE COUNT PILL'S DIGITS SAT OFF CENTRE, because `text-nx-overline` carries tracking that CSS
 *     adds after the last glyph as well as between them.
 *
 * VERTICAL RHYTHM IS THE CALLER'S, AND THE RULE IS THAT TABS BIND DOWN. A strip is the label of
 * the panel under it, so it sits CLOSE to that panel and FAR from whatever precedes it. Every
 * page caller used to space it SYMMETRICALLY — 40 above and 40 below on five of them, 20/20 on
 * the admin page — which orphans the control exactly between the heading and the content it
 * names. Callers now wrap the strip and its panel in one column, and the gap inside that column
 * is ONE STEP TIGHTER than whatever the page puts above it: `--nx-space-group` (16) under the
 * wide canvases' 40, `--nx-space-element` (12) under the admin canvas's 20. What makes the group
 * read is the ratio, not the number — 16 under a 20 is the same symmetric float, just tighter.
 *
 * NOT EVERY CHOICE IS A TAB STRIP, and three callers stopped being one in the same round. A tab
 * strip is for NAVIGATION between two or three panels of a page. A filter with more options than
 * that, or one nested inside a panel a strip already opened, is a `Select`: the reactor dialog's
 * eight reactions and the event attendee list's four now use one, and so does the appeals status
 * filter, which was a strip sitting inside the panel of another strip at the same size.
 * `trending` collapsed two stacked strips into two selects on one row. The rule: three or fewer,
 * and the choice is the page's subject → tabs; otherwise → `Select`.
 *
 * THE DEVIATION THAT USED TO LIVE HERE IS RESOLVED RATHER THAN DROPPED. `Tabs.d.ts` and the prompt
 * both said "amber active indicator"; the DS's own specimen drew a blue `border-bottom`; blue won
 * because amber is reserved for reputation (§1.3) and an active tab is interactive state (§1.2).
 * Both variants carry that ruling — the bar is `--nx-accent` in both.
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
   * `inline` (default) for a control on a page; `underline` when the tab strip is itself the
   * block, which today means `/newsfeed` and nothing else. The two draw the same accent bar and
   * differ only in whether a hairline runs the full measure behind it. The header explains why.
   *
   * @default "inline"
   */
  variant?: 'inline' | 'underline';
  /** Labels the tablist for assistive tech. */
  'aria-label'?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SIZE MEANS TWO DIFFERENT THINGS PER VARIANT, which is why this is a table and not one string.
 *
 * `inline` STATES HEIGHT AS A MINIMUM and takes almost no horizontal padding, because the bar has
 * to READ AS BELONGING TO THE LABEL. At the pill's `px-3` the indicator would run 12 past each end
 * of the word and start looking like a segment of a rail again — the exact thing the rail was
 * dropped for. `px-1` is the smallest padding that still leaves the inset focus ring somewhere to
 * be drawn without touching the glyphs, so the bar is the label plus 4 on each side, which reads
 * as the label. The separation between tabs is then the strip's `gap`, not the tabs' padding.
 *
 * THE HEIGHT IS WHAT PUTS AIR UNDER THE TEXT. `min-h-8` with a centred label leaves ~5 between the
 * descenders and the bar at `md`, ~4 at `sm` — enough that the bar is under the word rather than
 * attached to it. Padding would have had to be 6 to reach 32 at this line-height, a number on no
 * ladder in the system and one that would drift the moment the type scale moved.
 *
 * `underline` KEEPS THE ORIGINAL PADDING, untouched from the DS specimen. There the bar sits on a
 * rail that runs the full measure, so it is already reading as part of a line rather than as part
 * of a word, and the wider padding is what spaces the tabs along it.
 */
const sizeStyles: Record<
  NonNullable<TabsProps['variant']>,
  Record<NonNullable<TabsProps['size']>, string>
> = {
  inline: {
    sm: 'min-h-7 px-1 text-nx-body-sm',
    md: 'min-h-8 px-1 text-nx-ui',
  },
  underline: {
    sm: 'px-2.5 py-2 text-nx-body-sm',
    md: 'px-3 py-2.5 text-nx-ui',
  },
};

/**
 * THE GAP IS THE SEPARATOR NOW, since `inline` tabs carry no padding worth the name. 12 + the two
 * tabs' 4 of padding reads as 20 between labels at `md`, 8 + 8 as 16 at `sm` — the same visual
 * separation the pill got out of `px-3` and `gap-1`, moved from the tabs to the strip so that the
 * indicator stays the width of the word.
 *
 * `underline` KEEPS `gap-1`: its tabs still pad themselves, and widening the gap on a strip whose
 * hairline is continuous would only move the tabs apart along a line that does not break.
 */
const listGap: Record<
  NonNullable<TabsProps['variant']>,
  Record<NonNullable<TabsProps['size']>, string>
> = {
  inline: { sm: 'gap-2', md: 'gap-3' },
  underline: { sm: 'gap-1', md: 'gap-1' },
};

const toItem = (tab: string | TabItem): TabItem =>
  typeof tab === 'string' ? { id: tab, label: tab } : tab;

export function Tabs({
  tabs = [],
  active,
  onChange,
  size = 'md',
  variant = 'inline',
  'aria-label': ariaLabel,
  className,
  style,
}: TabsProps) {
  const items = tabs.map(toItem);
  const activeIndex = items.findIndex((item) => item.id === active);

  /**
   * EVERYTHING THAT CAN CHANGE A TAB'S WIDTH, as one dependency string — see `useEdgeMask`, which
   * explains why a strip has to be remeasured when a count or a label lands after the first paint.
   *
   * COUNTS AND LABEL TEXT BOTH, because a label can arrive late too: every caller reads its labels
   * through `t()`, and the locale is switchable at runtime.
   */
  const widthKey = items.map((item) => `${item.id}:${item.count ?? ''}`).join('|');

  /**
   * THE STRIP SCROLLS ITSELF AND FADES THE END THAT HAS MORE BEHIND IT. Both halves moved to
   * `useEdgeMask` when the trending chips became the second caller; `active` is deliberately NOT
   * in its dependency string, because selecting a tab no longer changes any tab's width.
   *
   * `relative` IS LOAD-BEARING on the element this ref lands on, not a habit: the auto-scroll
   * effect below reads `offsetLeft`, which is measured from the nearest positioned ancestor.
   */
  const { ref: listRef, maskStyle } = useEdgeMask<HTMLDivElement>(widthKey);

  /**
   * THE SELECTED TAB PULLS ITSELF INTO VIEW. Selection does not always come from a click on
   * something the reader can see — arrow keys walk past the edge, and `/friends` derives the
   * active tab from the URL, so landing on `/friends/all` at 390 opens the page with the current
   * tab off-screen and the strip looking like nothing is selected.
   *
   * THE ARITHMETIC IS DONE BY HAND RATHER THAN WITH `scrollIntoView`, whose `inline: 'nearest'`
   * would do exactly this — and would also scroll every ANCESTOR that can scroll, i.e. yank the
   * page vertically to bring a tab strip into view that was already perfectly visible.
   * `offsetLeft` is measured against the strip because the strip is `relative`.
   *
   * `widthKey` IS A DEPENDENCY ALONGSIDE `active`: a count that lands after the first paint moves
   * the active tab's right edge without changing which tab is active, and the scroll has to
   * follow it. See the note on `widthKey` itself.
   */
  React.useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>('[data-nx-tab-active="true"]');
    if (!list || !tab) return;

    const start = tab.offsetLeft - EDGE_FADE;
    const end = tab.offsetLeft + tab.offsetWidth + EDGE_FADE;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';

    if (start < list.scrollLeft) {
      list.scrollTo({ left: Math.max(0, start), behavior });
    } else if (end > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: end - list.clientWidth, behavior });
    }
    // `listRef` IS IN THE DEPS BECAUSE IT COMES FROM A HOOK NOW. It is the same stable ref
    // object every render, so this changes nothing at runtime — but the linter cannot know a
    // returned value is a ref, and silencing it would silence the real dependencies too.
  }, [active, widthKey, listRef]);

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
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      /**
       * THE CALLER'S `style` IS SPREAD FIRST so a caller can still position the strip, and cannot
       * accidentally delete the fade. `maskStyle` is computed — which end fades depends on where
       * the scroller currently is — which is why it cannot be a class.
       */
      style={{ ...style, ...maskStyle }}
      /**
       * IN `pill`, NOTHING IS PAINTED AT THIS LEVEL. No fill, no border, no padding — the element
       * is a positioning box for the tabs and an ARIA landmark, and that is all. Everything the
       * variant says visually is said by the one active pill inside it. `underline` is the
       * opposite: the strip owns the hairline and the tabs only put an indicator on it.
       *
       * MOST OF WHAT FOLLOWS IS ABOUT `pill`'s SIZING. The scrolling half now applies to both — see
       * the header — but the width rules do not: `underline` spans its parent, so it has nothing
       * to fit to.
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
       * always-visible bar takes on Windows.
       *
       * THE CLAIM THAT USED TO END THAT SENTENCE — "a half-visible last tab is its own
       * affordance" — WAS FALSE, and it was the whole reason nothing said the strip scrolled. It
       * is only true when the strip happens to be scrolled such that a tab straddles the edge.
       * Land on `/friends/all` at 390 and the strip opens scrolled hard to one side with a
       * complete label flush against the boundary: nothing is half-visible, so nothing hints that
       * two more tabs exist to the left. The fade is on when — and only when — there is something
       * in that direction, which is the same information a scrollbar would have carried.
       */
      className={cn(
        'font-sans',
        listGap[variant][size],
        variant === 'inline'
          ? // `relative` IS LOAD-BEARING, not a habit: the auto-scroll effect reads `offsetLeft`,
            // which is measured from the nearest positioned ancestor. Without it the numbers come
            // from whatever card or dialog happens to be positioned further up, and the strip
            // scrolls to an offset that has nothing to do with itself.
            'relative inline-flex w-fit max-w-full overflow-x-auto scrollbar-none'
          : // THE RAIL, which is what this branch is for.
            //
            // R15: the rail the underline tabs sit on is `border-subtle`, not `border-default`.
            // `border-default` climbed the ramp that round to become a line you can actually see;
            // a tab strip's baseline is not that — it is the faintest possible hint of a shared
            // edge, and at the louder value it competed with the 2px indicator sitting on it.
            //
            // PLAIN `flex`, NOT `inline-flex w-fit`: this variant is supposed to span its block,
            // because the hairline running the full measure is the whole point of it. That is also
            // why it needs no `max-w-full` — it is already exactly its parent's width, so the
            // scroller starts at the right place without being told.
            //
            // `relative` is read by the auto-scroll effect (`offsetLeft`); `pb-px` absorbs the
            // tabs' `-mb-px` so `overflow-y` has nothing to scroll. Both are argued in the header.
            cn(
              'relative flex overflow-x-auto scrollbar-none pb-px',
              'border-b border-nx-border-subtle'
            ),
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
            // Read by the auto-scroll effect. `aria-selected` would have served, but a selector on
            // an ARIA attribute makes the attribute load-bearing for layout, and someone tidying
            // the a11y later would have no way to know they were also moving the scroller.
            data-nx-tab-active={isActive}
            onClick={() => onChange?.(item.id)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap',
              // COLOUR ONLY (§2.1) — no lift, no scale, no shadow, in either variant.
              'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
              sizeStyles[variant][size],
              variant === 'inline'
                ? cn(
                    // ONE WEIGHT FOR BOTH STATES. `font-semibold` active against `font-normal`
                    // inactive meant the strip RE-LAID-OUT on every selection: the tab just
                    // clicked grew by a few pixels and shoved its neighbours out from under the
                    // pointer, so a second click landed on a different tab than the one aimed at.
                    // Medium reads as deliberate at 14/1.5 without being a state, and the bar
                    // plus the text colour already say which tab is current without changing
                    // anyone's width.
                    'font-medium',
                    // AN INSET RING ON THIS VARIANT ONLY. It lives in an `overflow-x-auto` box,
                    // and `overflow-x: auto` forces the computed `overflow-y` to `auto` as well —
                    // so an outset ring was clipped on all four sides at once: top and bottom by a
                    // strip exactly one tab tall, left and right by the scroll boundary. Pulling
                    // the ring inside the border box removes the clipping without giving the strip
                    // padding it would then have to cancel with a negative margin. `underline`
                    // does not scroll and keeps the system's outset ring.
                    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring',
                    // THE BAR IS ALWAYS THERE, TRANSPARENT WHEN OFF. Toggling the border WIDTH
                    // between 0 and 2 would move every label two pixels up on selection; only its
                    // colour changes, so nothing in the strip shifts.
                    'border-b-2',
                    isActive
                      ? // NO FILL, AND THAT IS THE WHOLE POINT — an unselected tab is text on
                        // whatever plane it was dropped on, and a selected one is the same text
                        // with a short accent bar under it. Nothing here composites against a
                        // background, so this one pair of classes is correct on the page ground,
                        // on a white card, inside a dialog and in both themes.
                        'border-nx-accent text-nx-text-primary'
                      : // Hover moves the label from secondary to primary and leaves the bar off.
                        // There is deliberately no hover FILL: a tint behind an unselected tab was
                        // the one thing that could still be mistaken for a selection, which is
                        // exactly how the pill's hover competed with its own active state.
                        'border-transparent text-nx-text-secondary hover:text-nx-text-primary'
                  )
                : cn(
                    // INSET, since this strip scrolls too — an outset ring inside an
                    // `overflow-x: auto` box is clipped on all four sides at once. Same fix, same
                    // reason as the `inline` branch above.
                    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring',
                    // Untouched this round — see the `inline` weight note above.
                    isActive ? 'font-semibold' : 'font-normal',
                    // -1px pulls the indicator onto the tablist hairline instead of below it.
                    '-mb-px border-b-2 bg-transparent',
                    isActive
                      ? 'border-nx-accent text-nx-text-primary'
                      : 'border-transparent text-nx-text-secondary hover:text-nx-text-primary'
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
              // ONE TREATMENT FOR SELECTED AND UNSELECTED ALIKE, which is a simplification the
              // shape change paid for. The active tab used to give its count an accent fill,
              // because `--nx-tint` is a NEUTRAL alpha and laying it over the pill's blue
              // desaturated exactly the patch it covered — a grey smudge punched through the
              // fill. With no fill behind anything, that problem does not exist, and a count that
              // changed colour on selection would be a second state signal competing with the
              // bar for a piece of metadata that means the same thing either way.
              //
              // `tint`, NOT A STEP OFF THE RAMP, for the same reason it always was: the count sits
              // on whatever plane the strip landed on — white card, page ground, dialog, dark — so
              // any fixed grey is invisible on one of them.
              //
              // `tracking-normal` IS A FIX, not a preference. `text-nx-overline` carries
              // `letter-spacing: 0.08em`, and CSS adds tracking AFTER the last glyph as well as
              // between them, so a symmetrically padded pill rendered its digits visibly left of
              // centre by a gap that grew with the digit count. Overline tracking exists to open
              // up set capitals; on one or two mono digits it only pushed them off centre.
              <span className="inline-flex justify-center rounded-nx-full bg-nx-tint px-2 font-mono text-nx-overline tracking-normal text-nx-text-muted">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
