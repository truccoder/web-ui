'use client';

import * as React from 'react';
import { cn } from '@/shared/lib/cn';
import { EDGE_FADE, useEdgeMask } from '@/shared/lib/use-edge-mask';

/**
 * Hand-written from the design system's `Tabs.d.ts` + `Tabs.prompt.md` contract and the
 * rendered `navigation.card` specimen. No design-system source was read.
 *
 * ONE MARK, DRAWN ONCE AND MOVED. The current tab is named by a 2px `--nx-accent` bar that sits
 * under its label and SLIDES to the next label when the selection changes — a single absolutely
 * positioned element in the strip, not a border on each button. The width and offset come from
 * the active tab, measured after layout; `--nx-duration-fast` / `ease-nx-out` carries it across,
 * and `prefers-reduced-motion` drops the transition so it simply reappears in place.
 *
 * TWO VARIANTS, DIFFERING BY ONE THING: the rail. `slide` (the default) paints nothing at rest —
 * the only ink is the bar under one word. `underline` also draws a hairline across the whole
 * strip for that bar to ride on, and is used where the strip IS the block rather than a control
 * dropped onto one — today that is `/newsfeed` and nothing else.
 *
 * WHY A BAR AND NOT A FILL. Earlier rounds tried a full-measure rail, a filled strip, a segmented
 * control and a tinted pill; every one of them added a SURFACE, and a surface has to be a colour
 * that holds on the page ground, on white cards, in dialogs and in both themes at once. A solid
 * accent bar composites against nothing, so one pair of classes is correct on all of them. It
 * also points DOWN at the panel it names, which a self-contained pill never did.
 *
 * WHY IT SLIDES. The bar used to be a `border-b-2` toggled per button: selecting a tab painted
 * one border and cleared another, with nothing connecting the two. Moving one element instead
 * gives the change a direction — the same "progress bar" read a tab strip wants — and it costs
 * one measured effect, not a layer.
 *
 * WHY `--nx-accent` AND NOT AMBER. `Tabs.d.ts` and the prompt both said "amber active
 * indicator"; amber is reserved for reputation (§1.3) and an active tab is interactive state
 * (§1.2), so the bar is `--nx-accent` in both variants — matching the DS's own `navigation.card`
 * specimen, which drew a blue `border-bottom`.
 *
 * MECHANICAL RULES THAT STILL HOLD, none of them the mark's doing:
 *
 *  1. ONE FONT WEIGHT IN `slide`. Active `font-semibold` against inactive `font-normal` made the
 *     strip RE-LAY-OUT on every selection — the tab just clicked grew and shoved its neighbours
 *     out from under the pointer. `slide` is one weight (`font-medium`); the bar and the text
 *     colour carry the state, and no tab changes width. `underline` keeps the weight swap: its
 *     strip is `flex`, not `inline-flex w-fit`, so a tab changing width redistributes inside a
 *     box whose own width never moves.
 *  2. AN INSET FOCUS RING, BOTH VARIANTS. `overflow-x: auto` forces the computed `overflow-y` to
 *     `auto`, so an outset ring on a strip one tab tall is clipped on all four sides at once.
 *  3. THE STRIP SCROLLS ITSELF AND FADES THE END WITH MORE BEHIND IT (`useEdgeMask`), and the
 *     active tab scrolls into view — arrow keys and URL-derived selection both land tabs
 *     off-screen otherwise.
 *  4. THE COUNT IS A MONO PILL, one treatment for selected and unselected alike; `tracking-normal`
 *     undoes the overline tracking that CSS adds after the last digit as well as between them.
 *
 * NOT EVERY CHOICE IS A TAB STRIP. Three or fewer panels and the choice is the page's subject →
 * `Tabs`; a filter with more options, or one nested inside a panel a strip already opened → a
 * `Select`. The reactor dialog's reactions, the event attendee list and the appeals status
 * filter are all `Select` for that reason.
 */
export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Rendered as a trailing mono pill. */
  count?: number;
  /**
   * Native tooltip on the tab. Defaulted from `label` when `iconOnly` is set and the label is a
   * string, so an icon strip does not have to say its own names twice.
   *
   * NOT IN `Tabs.d.ts`, AND ADDED FOR ONE SHAPE THE CONTRACT DID NOT ANTICIPATE — see `iconOnly`.
   * A `title` is what the rest of this codebase reaches for when a control is a bare glyph
   * (`ReactionTray`'s seven buttons, the comment row's toggle), and it costs no layer, no portal
   * and no state.
   *
   * IT IS NOT A REPLACEMENT FOR `label`. A tab still needs a name in the tree; this is the
   * mouse's copy of it.
   */
  title?: string;
  /**
   * Show the icon and hide the words, for a tab whose glyph IS its label.
   *
   * THE LABEL IS NOT DROPPED, IT MOVES — into an `sr-only` span, so the tab's accessible name is
   * still `Sáng tỏ` and nothing about the ARIA tabs pattern changes. It also becomes the `title`
   * unless one was passed, because a sighted mouse user has to be able to learn that the crying
   * face means `Khó hiểu` — at 16px, three of the seven reaction glyphs are a circle with a
   * different mouth.
   *
   * IT ALSO CHANGES THE TAB'S SIZE, and that is the half a caller cannot do from outside. See
   * `iconOnlySizeStyles`: a word-shaped tab and a glyph-shaped tab want different boxes, and the
   * `px-1` that is right for a label makes a 16px glyph into a 24px tap target.
   *
   * `ReactorDialog` is the only caller today: `Tất cả` keeps its word — it is not a reaction and
   * has no glyph that could stand for "all of them" — and the seven types are icons.
   */
  iconOnly?: boolean;
}

export interface TabsProps {
  tabs?: Array<string | TabItem>;
  /** Id of the active tab. */
  active?: string;
  onChange?: (id: string) => void;
  /** @default "md" */
  size?: 'sm' | 'md';
  /**
   * `slide` (default) for a control on a page; `underline` when the tab strip is itself the
   * block, which today means `/newsfeed` and nothing else. Both draw the same sliding accent bar
   * and differ only in whether a hairline runs the full measure behind it. The header explains
   * why.
   *
   * @default "slide"
   */
  variant?: 'slide' | 'underline';
  /** Labels the tablist for assistive tech. */
  'aria-label'?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SIZE MEANS TWO DIFFERENT THINGS PER VARIANT, which is why this is a table and not one string.
 *
 * `slide` STATES HEIGHT AS A MINIMUM and takes almost no horizontal padding, because the bar has
 * to READ AS BELONGING TO THE LABEL. At a pill's `px-3` the indicator would run 12 past each end
 * of the word and start looking like a segment of a rail again. `px-1` is the smallest padding
 * that still leaves the inset focus ring somewhere to be drawn without touching the glyphs, so
 * the bar is the label plus 4 on each side, which reads as the label. The separation between
 * tabs is then the strip's `gap`, not the tabs' padding.
 *
 * THE HEIGHT IS WHAT PUTS AIR UNDER THE TEXT. `min-h-8` with a centred label leaves ~5 between
 * the descenders and the bar at `md`, ~4 at `sm` — enough that the bar is under the word rather
 * than attached to it.
 *
 * `underline` KEEPS THE ORIGINAL PADDING, untouched from the DS specimen. There the bar sits on a
 * rail that runs the full measure, so it is already reading as part of a line rather than as part
 * of a word, and the wider padding is what spaces the tabs along it.
 */
const sizeStyles: Record<
  NonNullable<TabsProps['variant']>,
  Record<NonNullable<TabsProps['size']>, string>
> = {
  slide: {
    sm: 'min-h-7 px-1 text-nx-body-sm',
    md: 'min-h-8 px-1 text-nx-ui',
  },
  underline: {
    sm: 'px-2.5 py-2 text-nx-body-sm',
    md: 'px-3 py-2.5 text-nx-ui',
  },
};

/**
 * A SQUARE FOR A GLYPH, BECAUSE `px-1` IS A RULE ABOUT WORDS. The padding above is deliberately
 * the smallest that lets an inset focus ring be drawn, so that the active bar stays the width of
 * the LABEL and never starts reading as a segment of rail. A 16px icon in that same box is a
 * 24×28 target — which clears WCAG 2.2's 24×24 minimum by exactly nothing, and on a phone reads
 * as a row of pinpricks.
 *
 * 32 AT `sm` AND 36 AT `md`, WHICH ARE NOT NEW NUMBERS: `ACTION_GLYPH_BUTTON` on the post's acting
 * row is a 32px square around a 20px glyph, and it is the closest thing in this product to what
 * these tabs are. A 16px glyph in 32 leaves the same 8px of air on each side.
 *
 * THE STRIP DOES NOT GROW TALLER THAN ITS TALLEST TAB, and this is why the height goes on the tab
 * rather than on the list: the tablist is a flex row at the default `align-items: stretch`, so
 * one 32-tall icon tab lifts the word tab beside it to 32 as well and the two bars stay on one
 * line.
 */
const iconOnlySizeStyles: Record<NonNullable<TabsProps['size']>, string> = {
  sm: 'min-h-8 min-w-8 justify-center px-0',
  md: 'min-h-9 min-w-9 justify-center px-0',
};

/**
 * THE GAP IS THE SEPARATOR in `slide`, since its tabs carry no padding worth the name. 12 + the
 * two tabs' 4 of padding reads as 20 between labels at `md`, 8 + 8 as 16 at `sm`.
 *
 * `underline` KEEPS `gap-1`: its tabs still pad themselves, and widening the gap on a strip whose
 * hairline is continuous would only move the tabs apart along a line that does not break.
 */
const listGap: Record<
  NonNullable<TabsProps['variant']>,
  Record<NonNullable<TabsProps['size']>, string>
> = {
  slide: { sm: 'gap-2', md: 'gap-3' },
  underline: { sm: 'gap-1', md: 'gap-1' },
};

/**
 * A STRIP WITH GLYPH TABS IN IT SEPARATES THEM BY 4, not by the 8 or 12 above. An `iconOnly` tab
 * is a 32px square around a 16px glyph — it brings 8px of its own padding to each side, so the
 * same 8 of strip gap would be spending the space twice.
 */
const ICON_ONLY_GAP = 'gap-1';

const toItem = (tab: string | TabItem): TabItem =>
  typeof tab === 'string' ? { id: tab, label: tab } : tab;

export function Tabs({
  tabs = [],
  active,
  onChange,
  size = 'md',
  variant = 'slide',
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
   * through `t()`, and the locale is switchable at runtime. The label only lands in the key when
   * it is a string — an element child cannot be compared this cheaply, and none of the callers
   * pass one that also changes width silently.
   */
  const widthKey = items
    .map(
      (item) => `${item.id}:${item.count ?? ''}:${typeof item.label === 'string' ? item.label : ''}`
    )
    .join('|');

  /**
   * THE STRIP SCROLLS ITSELF AND FADES THE END THAT HAS MORE BEHIND IT. Both halves moved to
   * `useEdgeMask` when the trending chips became the second caller.
   *
   * `relative` IS LOAD-BEARING on the element this ref lands on, not a habit: the auto-scroll
   * effect and the indicator effect below both read `offsetLeft`, which is measured from the
   * nearest positioned ancestor.
   */
  const { ref: listRef, maskStyle } = useEdgeMask<HTMLDivElement>(widthKey);

  /**
   * THE SLIDING BAR'S GEOMETRY. `null` until the active tab has been measured, and whenever there
   * is no active tab — the bar's own element is not rendered until this is set, so it never
   * paints in the wrong place and never slides in from the origin on mount.
   *
   * DEPS: `active` moves it to another tab; `widthKey` covers a count or a label that lands late
   * and shifts the current tab's edges without changing which tab is active; `variant`/`size`
   * change the tab box itself. A `ResizeObserver` on the strip catches everything else — a locale
   * swap that only widens `underline`'s tabs, the column reflowing around it.
   */
  const [indicator, setIndicator] = React.useState<{ left: number; width: number } | null>(null);

  React.useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>('[data-nx-tab-active="true"]');
    if (!list || !tab) {
      setIndicator(null);
      return;
    }

    const measure = () =>
      setIndicator((prev) => {
        const next = { left: tab.offsetLeft, width: tab.offsetWidth };
        return prev && prev.left === next.left && prev.width === next.width ? prev : next;
      });

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [active, widthKey, variant, size, listRef]);

  /**
   * THE SELECTED TAB PULLS ITSELF INTO VIEW. Selection does not always come from a click on
   * something the reader can see — arrow keys walk past the edge, and `/friends` derives the
   * active tab from the URL, so landing on `/friends/all` at 390 opens the page with the current
   * tab off-screen and the strip looking like nothing is selected.
   *
   * THE ARITHMETIC IS DONE BY HAND RATHER THAN WITH `scrollIntoView`, whose `inline: 'nearest'`
   * would also scroll every ANCESTOR that can scroll, i.e. yank the page vertically to bring a
   * tab strip into view that was already perfectly visible.
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
       * IN `slide`, NOTHING IS PAINTED AT THIS LEVEL. No fill, no border, no padding — the element
       * is a positioning box for the tabs and the bar, and an ARIA landmark. `underline` owns the
       * hairline the bar rides on.
       *
       * `w-fit` IS NOT REDUNDANT NEXT TO `inline-flex`. Most callers put this inside a
       * `flex flex-col`, and a flex item is STRETCHED to the line by default — without `w-fit`
       * the strip sizes to the full measure instead of to its tabs, and `overflow-x-auto` then
       * has nothing to scroll against. `max-w-full` caps it at the column so a strip wider than
       * the phone scrolls inside itself instead of pushing the page sideways.
       *
       * THE SCROLLBAR IS HIDDEN via Tailwind 4's `scrollbar-none`: a 32-tall strip cannot spare
       * the ~12 an always-visible bar takes on Windows.
       */
      className={cn(
        'relative font-sans',
        items.some((item) => item.iconOnly) ? ICON_ONLY_GAP : listGap[variant][size],
        variant === 'slide'
          ? 'inline-flex w-fit max-w-full overflow-x-auto scrollbar-none'
          : // THE RAIL. `border-nx-border-subtle`, not `border-default`: a tab strip's baseline is
            // the faintest possible hint of a shared edge, and at a louder value it competes with
            // the bar sitting on it. Plain `flex`, not `inline-flex w-fit` — this variant spans
            // its block, which is the whole point of the full-measure hairline, so it needs no
            // `max-w-full` either.
            'flex overflow-x-auto scrollbar-none border-b border-nx-border-subtle',
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
            // Read by both the auto-scroll effect and the indicator effect. `aria-selected` would
            // have served, but a selector on an ARIA attribute makes the attribute load-bearing
            // for layout, and someone tidying the a11y later would have no way to know they were
            // also moving the bar.
            data-nx-tab-active={isActive}
            // Undefined on every ordinary tab, so nothing is announced twice: a tab whose label is
            // on screen already says what it is. See `TabItem.title`.
            title={
              item.title ??
              (item.iconOnly && typeof item.label === 'string' ? item.label : undefined)
            }
            onClick={() => onChange?.(item.id)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap',
              // COLOUR ONLY (§2.1) — no lift, no scale, no shadow.
              'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
              item.iconOnly ? iconOnlySizeStyles[size] : sizeStyles[variant][size],
              // AN INSET RING, BOTH VARIANTS. The strip is an `overflow-x-auto` box, and
              // `overflow-x: auto` forces the computed `overflow-y` to `auto` — so an outset ring
              // on a box one tab tall is clipped on all four sides at once.
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring',
              variant === 'slide'
                ? // ONE WEIGHT FOR BOTH STATES — `font-semibold` active against `font-normal`
                  // inactive re-laid-out the strip on every selection. The bar and the text
                  // colour say which tab is current without changing anyone's width.
                  isActive
                  ? 'font-medium text-nx-text-primary'
                  : 'font-medium text-nx-text-secondary hover:text-nx-text-primary'
                : isActive
                  ? 'font-semibold text-nx-text-primary'
                  : 'font-normal text-nx-text-secondary hover:text-nx-text-primary'
            )}
          >
            {item.icon && (
              <span className="shrink-0 [&>svg]:size-4" aria-hidden>
                {item.icon}
              </span>
            )}
            {/* `sr-only` ON AN ICON TAB, plain text otherwise — the name has to stay in the
                accessibility tree either way. The span is out of flow, so the button's own `gap-2`
                never opens beside an invisible label. */}
            {item.iconOnly ? <span className="sr-only">{item.label}</span> : item.label}
            {item.count !== undefined && (
              // ONE TREATMENT FOR SELECTED AND UNSELECTED ALIKE. `tint`, not a step off the ramp,
              // because the count sits on whatever plane the strip landed on — white card, page
              // ground, dialog, dark — so any fixed grey is invisible on one of them.
              //
              // `tracking-normal` IS A FIX: `text-nx-overline` carries `letter-spacing: 0.08em`,
              // and CSS adds tracking AFTER the last glyph as well as between them, so a
              // symmetrically padded pill rendered its digits left of centre.
              <span className="inline-flex justify-center rounded-nx-full bg-nx-tint px-2 font-mono text-nx-overline tracking-normal text-nx-text-muted">
                {item.count}
              </span>
            )}
          </button>
        );
      })}

      {/* THE MARK. One element, positioned from the active tab and moved by `transform` so the
          browser animates it on the compositor. `bottom-0` puts it on the tabs' shared bottom
          edge — which in `underline` is exactly where the rail is.

          IT DOES NOT SLIDE IN ON MOUNT: the span is only rendered once `indicator` has been
          measured, so React inserts it with its final position already set and CSS has no "from"
          to animate. Every move after that is a real selection change, and those transition. */}
      {indicator && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-nx-full bg-nx-accent',
            'transition-[transform,width] duration-[var(--nx-duration-fast)] ease-nx-out motion-reduce:transition-none'
          )}
          style={{
            width: `${indicator.width}px`,
            transform: `translateX(${indicator.left}px)`,
          }}
        />
      )}
    </div>
  );
}
