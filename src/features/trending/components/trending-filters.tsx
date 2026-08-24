'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button, Radio } from '@/shared/components';
import { useI18n, useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { useEdgeMask } from '@/shared/lib/use-edge-mask';
import type { TrendingCategory, TrendingTimeRange, TrendingSource } from '../types/trending';

/**
 * Topic chips on one scrolling line, with time range and source folded into a panel behind a
 * single button.
 *
 * SPLIT OUT OF THE LIST because the two do different jobs: this decides what to ask for, the list
 * decides how to show what came back. Keeping the filters presentational also means the list's
 * state stays in one place — nothing here holds a value, it only reports changes.
 *
 * WHAT THIS REPLACES, AND WHY. The three controls were a labelled `Select` for the range, a
 * labelled `Select` for the source, and the chip row — and stacked on the measure they cost FOUR
 * lines above the first story: a label line, a field line, and two lines of chips, because nine
 * Vietnamese topic labels do not fit on one. On top of the feed's own sticky tab strip that is
 * five rows of chrome on a screen whose entire job is to show a list.
 *
 * THREE THINGS WERE WRONG BEYOND THE HEIGHT, and the fix for each is in this file:
 *
 *  - `Tất cả` SAT UNDER `Tất cả`. The feed's first tab and the first chip were the same word,
 *    forty pixels apart, meaning two unrelated things — and the chip was painted in solid accent,
 *    so it read LOUDER than the tab it was being confused with. The chip is `Mọi chủ đề` now and
 *    a selected chip uses the soft accent every other selected-but-quiet control in the product
 *    uses (`reaction-bar`, `event-rsvp-bar`).
 *  - THE LABELS COST A LINE FOR NOTHING. `Tuần này` and `Mọi nguồn` say what they are; a
 *    `Khoảng thời gian` above them was a caption on a caption. Inside the panel the same words
 *    are `<legend>`s, where they group rather than repeat.
 *  - NOTHING SAID HOW MANY FILTERS WERE ON. Two controls scrolled out of sight the moment the
 *    reader moved, and there was no way back short of scrolling to the top. The count rides on
 *    the button, and the button is on the one row that is always there.
 *
 * WHY THE SPLIT FALLS WHERE IT DOES — chips out, the other two in. Topic is the axis a reader
 * actually browses along, and its value is worth showing WITHOUT being asked for: eight topics
 * visible is a map of what the crawler covers. Range and source are settings — you pick one, it
 * stays picked, and you do not need to see the other options while you read. So the visible row
 * is the one you change often, and the panel holds the two you set once. It also leaves somewhere
 * for a fourth filter to go (tags, language) that costs no row at all.
 */
export interface TrendingFiltersProps {
  timeRange: TrendingTimeRange;
  onTimeRangeChange: (timeRange: TrendingTimeRange) => void;
  /** `undefined` means every category — the backend omits the parameter entirely. */
  category: TrendingCategory | undefined;
  onCategoryChange: (category: TrendingCategory | undefined) => void;
  /**
   * `undefined` means all three crawlers.
   *
   * SOURCE IS A SETTING, NOT A CHIP, and the asymmetry with category is deliberate: there are
   * exactly four choices including "all" and they never grow, where categories are eight and
   * open-ended. Category asks WHAT a story is about; source asks WHO FOUND IT — and the answer to
   * the second is already on every card, so a reader who wants it does not need the filter open
   * to get it.
   */
  source: TrendingSource | undefined;
  onSourceChange: (source: TrendingSource | undefined) => void;
  className?: string;
}

/**
 * Listed here rather than derived from the type, because a union has no runtime value to map over.
 *
 * Order is the backend enum's own order, so the two never drift into looking like different sets.
 * Only six of these eight appear in the current data (no `EVENT`, no `MINDSET`) — that is crawler
 * coverage, not a bug, and the filters still offer them because tomorrow's crawl may fill them.
 *
 * SOURCES ARE A DIFFERENT STORY, and used to be described the same way here. There were six in the
 * enum and only three ever produced a row; the other three crawlers have since been deleted
 * backend-side, so the enum is `HACKER_NEWS | DEV_TO | GITHUB` and there is nothing left for
 * tomorrow's crawl to fill.
 */
const CATEGORIES: TrendingCategory[] = [
  'OPENSOURCE',
  'EVENT',
  'NEW_TECH',
  'REGULATION',
  'MINDSET',
  'TOOL',
  'CAREER',
  'OTHER',
];

const TIME_RANGES: TrendingTimeRange[] = ['today', 'week', 'month'];

// Backend enum order. `all` is prepended in the markup rather than listed here, because it is
// the ABSENCE of the parameter, not a fourth value.
const SOURCES: TrendingSource[] = ['GITHUB', 'HACKER_NEWS', 'DEV_TO'];

/**
 * EXPORTED BECAUSE TWO FILES NEED THE SAME ANSWER. `TrendingList` opens on this value and the
 * button's count asks "is the range still the default" to decide whether to light up; when the
 * default lived only in the list's `useState` the two could drift, and a reader would have landed
 * on a screen already claiming one filter was on.
 */
export const DEFAULT_TIME_RANGE: TrendingTimeRange = 'week';

export function TrendingFilters({
  timeRange,
  onTimeRangeChange,
  source,
  onSourceChange,
  category,
  onCategoryChange,
  className,
}: TrendingFiltersProps) {
  const t = useT();
  const { locale } = useI18n();

  /**
   * THE STRIP SCROLLS SIDEWAYS RATHER THAN WRAPPING, which is what buys the single line: eight
   * topics plus `Mọi chủ đề` are wider than the measure in Vietnamese and wider still in English,
   * so wrapping would have kept two of the four rows this change was meant to remove.
   *
   * `locale` IS THE REMEASURE KEY. Nothing here loads late — the chips are a constant array — but
   * the labels come through `t()` and the locale is switchable at runtime, so the strip's width
   * changes without any of its items changing. See `useEdgeMask`.
   */
  const { ref: stripRef, maskStyle } = useEdgeMask<HTMLDivElement>(locale);

  return (
    /**
     * THE WHOLE ROW IS ONE GROOVE, and the token doing it is `--nx-tint` rather than the obvious
     * `--nx-surface-sunken`.
     *
     * `surface-sunken` IS THE SAME VALUE AS `surface-page` — gray-100 in light, gray-950 in dark,
     * check the two declarations. A track painted with it on the feed's ground is not subtle, it
     * is INVISIBLE, and that is also why the chips read as loose text before this: their inactive
     * fill was `surface-sunken` sitting on a ground of the identical colour, so nothing bounded
     * them and the eye had only the 32 of whitespace between labels to go on.
     *
     * `--nx-tint` IS AN ALPHA (8% ink in light, 10% paper in dark), so it darkens the ground here
     * and lightens it in dark without either theme needing its own value — and it would still
     * read if this row were ever dropped on a card. Same argument the token's own header makes
     * for `--nx-accent-soft` two blocks below it.
     *
     * ONE HEIGHT INSIDE THE GROOVE: chips are `h-7` and `Button size="sm"` is `h-7`, so `p-1`
     * around them makes the whole bar 36 and nothing inside it is a different size from anything
     * else. `gap-2` separates the three PARTS of the bar (strip, rule, button); the chips inside
     * the strip are one set and sit at `gap-1`.
     */
    <div className={cn('flex items-center gap-2 rounded-nx-full bg-nx-tint p-1', className)}>
      <div
        ref={stripRef}
        role="group"
        aria-label={t('trending.categoryLabel')}
        style={maskStyle}
        // `min-w-0` is what lets the strip be NARROWER than its content: a flex item's default
        // `min-width: auto` refuses to shrink below its intrinsic width, so without it the strip
        // never overflows — it pushes the button off the row instead, which is the failure this
        // whole layout exists to avoid.
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto scrollbar-none"
      >
        <CategoryChip
          label={t('trending.allCategories')}
          active={category === undefined}
          onClick={() => onCategoryChange(undefined)}
        />
        {CATEGORIES.map((option) => (
          <CategoryChip
            key={option}
            label={t(`trending.categories.${option}`)}
            active={category === option}
            onClick={() => onCategoryChange(option)}
          />
        ))}
      </div>

      {/* THE RULE IS WHAT KEEPS THE BUTTON FROM READING AS A NINTH TOPIC. Everything to its left
          is one set of mutually exclusive chips; everything to its right is a different kind of
          control that happens to share the bar. `h-4` rather than full height — a rule that ran
          the groove's whole 36 would cut the bar in two instead of punctuating it. */}
      <div aria-hidden className="h-4 w-px shrink-0 bg-nx-border-default" />

      <RefinePopover
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        source={source}
        onSourceChange={onSourceChange}
        hasCategory={category !== undefined}
        onClearAll={() => {
          onTimeRangeChange(DEFAULT_TIME_RANGE);
          onSourceChange(undefined);
          onCategoryChange(undefined);
        }}
      />
    </div>
  );
}

/**
 * The button and its panel: time range and source, as two radio groups.
 *
 * RADIOS RATHER THAN THE TWO `Select`s THIS REPLACES. A select's whole advantage is that it costs
 * one line whatever its option count — and inside a panel that is not a constraint, so the trade
 * it makes (hiding six of seven options behind a click) buys nothing and costs the reader the
 * ability to see what they could have picked. Seven options over two groups fit a 260px panel.
 *
 * `Menu` WAS THE OBVIOUS COMPONENT AND IS THE WRONG ONE, by its own contract: `Menu.prompt.md` is
 * explicit that it is for ACTIONS and that choosing a form value uses a field. Its keyboard model
 * also keeps focus on the trigger with nothing inside focusable, which radios cannot live inside.
 * So this is an anchored `role="dialog"`, the same shape `NotificationBell` landed on for the same
 * reason (ds-deviation #29) — down to the `mousedown` outside-close, so the panel is gone before
 * the click lands on whatever is underneath.
 */
function RefinePopover({
  timeRange,
  onTimeRangeChange,
  source,
  onSourceChange,
  hasCategory,
  onClearAll,
}: {
  timeRange: TrendingTimeRange;
  onTimeRangeChange: (timeRange: TrendingTimeRange) => void;
  source: TrendingSource | undefined;
  onSourceChange: (source: TrendingSource | undefined) => void;
  hasCategory: boolean;
  onClearAll: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Two groups on one screen need two `name`s, and there can be more than one of this panel in a
  // tree the day trending appears twice — `useId` is the only source of a name that is stable
  // across renders and unique across instances.
  const groupId = useId();

  /**
   * THE COUNT IS OF WHAT THE PANEL HIDES, WHICH IS WHY CATEGORY IS NOT IN IT. A badge exists to
   * report state the reader cannot see; the chips are on screen saying their own state, so
   * counting them would be telling someone something they are already looking at.
   *
   * The range counts only when it is NOT the default. A screen that opens claiming one filter is
   * on, before the reader has touched anything, has redefined "filtered" to mean "loaded".
   */
  const activeCount = (timeRange !== DEFAULT_TIME_RANGE ? 1 : 0) + (source ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      // ESCAPE HAS TO HAND FOCUS BACK. Closing a panel that currently holds focus without saying
      // where focus goes drops the keyboard reader on `<body>`, i.e. at the top of the document —
      // they were three tabs into a filter and are now nowhere. Outside-click needs no equivalent,
      // because a pointer that clicked elsewhere has already said where it went.
      triggerRef.current?.focus();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Focus moves INTO the panel on open, onto the panel itself rather than the first radio: landing
  // on a radio would announce one option out of seven, where the panel announces its own label and
  // leaves the next Tab to walk the groups in order.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    // `flex`, NOT A BARE BLOCK. The panel is positioned `top-[calc(100%+4px)]` against THIS
    // element, so its height is the anchor — and a block wrapping an `inline-flex` button lays out
    // a LINE BOX, which reserves room under the baseline for descenders the button does not have.
    // Measured in Chromium: the wrapper came out 33 tall around a 28 button, so a gap written as 4
    // rendered as 9. `flex` makes the wrapper hug the control, and the number in the code is the
    // number on screen.
    <div ref={rootRef} className="relative flex shrink-0">
      <Button
        ref={triggerRef}
        variant="secondary"
        size="sm"
        icon={<SlidersHorizontal className="size-4" />}
        // FULLY ROUNDED, because it lives inside a fully rounded groove. `Button`'s own
        // `rounded-nx-sm` put a near-square corner four pixels inside the bar's own radius, and
        // the two curves fighting at the right end was the only place the row stopped reading as
        // one object. Height is canonical per §11.2 and is untouched; radius is not.
        className="rounded-nx-full"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        // The visible label is the bare word and the count is a glyph beside it; the accessible
        // name has to carry both, because a lone `2` announced after "Bộ lọc" is not a filter
        // count — it could be anything.
        aria-label={
          activeCount > 0 ? t('trending.filtersActive', { count: activeCount }) : undefined
        }
      >
        {t('trending.filters')}
        {activeCount > 0 && (
          <span
            aria-hidden
            // NO MARGIN OF ITS OWN. `Button` is a flex row with `gap-1`, so an `ml-1` here
            // stacked on top of it and put the count 8 from its label while the icon sat 4 from
            // the other side of the same label — one control, two different gaps.
            className={cn(
              'flex size-4 items-center justify-center rounded-nx-full',
              'bg-nx-accent text-[10px] font-semibold leading-none text-nx-text-on-color'
            )}
          >
            {activeCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t('trending.filters')}
          tabIndex={-1}
          className={cn(
            // `right-0` — the button is the last thing on its row, so a panel growing leftwards is
            // the only one that stays on screen at 390.
            //
            // `+4px`, NOT `+6px`. Six is not on the sub-scale — round 5.1 removed 5 · 6 · 7 from
            // both kits by name — and the lint rule cannot see it inside an arbitrary value, so it
            // had to be caught by reading. Four is what `Menu` uses for the same gap between an
            // anchored panel and its trigger, which is the same relationship.
            //
            // `2rem` IS THE CANVAS GUTTER DOUBLED (`px-4` a side, see the shell), so the cap is the
            // measure itself rather than a number picked to look safe. It only binds under 292.
            'absolute right-0 top-[calc(100%+4px)] z-40 w-[min(260px,calc(100vw-2rem))]',
            // `p-1` IS `Menu`'s PANEL INSET, and taking it is what lets every row below land on
            // the same 12px text column that every menu item in the product already sits on: 4
            // here plus 8 inside each section. It also insets the hairlines, so they stop short of
            // the panel's own border instead of colliding with its rounded corners.
            'rounded-nx-md border border-nx-border-default bg-nx-surface-raised p-1 shadow-nx-2',
            'animate-[nx-enter_var(--nx-duration-fast)_var(--ease-nx-out)]',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring'
          )}
        >
          <RadioGroup
            legend={t('trending.timeRangeLabel')}
            name={`${groupId}-range`}
            value={timeRange}
            options={TIME_RANGES.map((range) => ({
              value: range,
              label: t(`trending.timeRange.${range}`),
            }))}
            onChange={(value) => onTimeRangeChange(value as TrendingTimeRange)}
          />

          {/* `all` IS A SENTINEL, NOT A VALUE. The backend has no "every source" enum member — it
              takes the absence of the parameter — and a radio must carry a string, so the sentinel
              is translated back to `undefined` here rather than leaking outward. */}
          <RadioGroup
            legend={t('trending.sourceLabel')}
            name={`${groupId}-source`}
            value={source ?? 'all'}
            options={[
              { value: 'all', label: t('trending.allSources') },
              ...SOURCES.map((value) => ({ value, label: t(`trending.sources.${value}`) })),
            ]}
            onChange={(value) =>
              onSourceChange(value === 'all' ? undefined : (value as TrendingSource))
            }
          />

          {/* IT CLEARS THE CHIPS TOO, which is why it is disabled on the chips as well as on the
              panel's own two. "Xoá lọc" is not a scoped promise — a reader who presses it and
              watches a selected topic survive has been told the screen is unfiltered when it is
              not. The button's COUNT answers a different question (what you cannot see) and stays
              narrow; this is the one control that can honestly mean all of it.

              NO `border-t` HERE. The groups above each own a `border-b`, so a top border on this
              row drew a second hairline against the last one — the two were only ever a single
              line because a `last-of-type` rule was cancelling one of them. One rule, one line,
              and the row that follows a section does not have to know it is last. */}
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              // THE GHOST BUTTON'S OWN INSET IS CANCELLED so its LABEL joins the panel's 12px
              // column instead of starting 10 further in than every legend and every radio above
              // it. The hit area keeps the full control and overhangs into the padding, which is
              // the one thing a ghost variant is for.
              className="-ml-2.5"
              disabled={activeCount === 0 && !hasCategory}
              onClick={onClearAll}
            >
              {t('trending.clearFilters')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * One labelled set of radios inside the panel.
 *
 * IT WAS A `<fieldset>`/`<legend>` AND THE LEGEND ATE THE PADDING. That pairing is the textbook
 * answer for a radio group, and its LAYOUT is unlike anything else in CSS: a rendered legend is
 * placed over the fieldset's block-start BORDER, outside the padding box, so `py-2` put nothing
 * above the label and stacked below it instead — 8 of padding plus the legend's own 8 of margin.
 * On screen that is a header jammed against the hairline above it with a gap twice the size of the
 * one between the options underneath. Every number was on the ladder; the box model was spending
 * them somewhere else.
 *
 * `role="group"` + `aria-labelledby` IS WHAT `<fieldset>`/`<legend>` MAPS TO — ARIA defines the
 * native pairing in exactly those terms — so the announcement is unchanged ("Lọc theo nguồn,
 * group") and the radios still get "2 of 4" from sharing a `name`. What goes away is the special
 * rendering, which is the only reason the element was hard to lay out.
 *
 * It also drops a `min-w-0` that existed purely to cancel the intrinsic minimum width a fieldset
 * carries and a plain block does not.
 */
function RadioGroup({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const labelId = useId();

  return (
    // `px-2 py-2` ON TOP OF THE PANEL'S `p-1` PUTS THE CONTENT ON A 12px COLUMN — the same one
    // every `Menu` item in the product sits on — and now that a normal block owns the padding, the
    // 8 lands on BOTH sides of the header as written. The rhythm inside a section is one rung
    // throughout (header ↔ options and option ↔ option are both `tight`), and the hairline plus
    // two 8s is what separates one section from the next.
    <div
      role="group"
      aria-labelledby={labelId}
      className="border-b border-nx-border-subtle px-2 py-2"
    >
      <p
        id={labelId}
        className="mb-2 text-nx-caption font-medium uppercase tracking-wide text-nx-text-muted"
      >
        {legend}
      </p>

      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * One category chip.
 *
 * `aria-pressed` RATHER THAN A ROLE OR A LINK: these are toggles that re-query in place, and the
 * pressed state is the only thing distinguishing the selected one for a screen reader — colour
 * alone would not.
 *
 * `shrink-0` IS STRUCTURAL, not a detail. The strip is `flex` with the default `nowrap`, but a
 * flex ITEM still shrinks toward its content; without this the chips would compress into
 * ellipsised stubs to fit the measure rather than overflowing into the scroll the strip is built
 * around.
 */
function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        // `h-7` RATHER THAN `py-1`. A control's height is a footprint, not a relationship — and
        // deriving it from padding plus a line-height landed the chip on 25, three short of the
        // `sm` button beside it. Stating it makes the row one height and takes the vertical
        // padding out of the ladder's way entirely. `inline-flex` is what centres the label inside
        // it, the same way `Button` centres its own.
        //
        // `px-2.5`, WHICH IS `Button size="sm"`'s OWN INSET — every `h-7` control in this bar now
        // shares one horizontal footprint. It also does most of the tightening: the whitespace
        // between two labels was `gap-2` plus two `px-3`, i.e. 32, and is now 4 + 10 + 10 = 24.
        'inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-nx-full px-2.5',
        'text-nx-caption font-medium',
        'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
        // AN INSET RING BECAUSE THE STRIP SCROLLS. `overflow-x: auto` forces the computed
        // `overflow-y` to `auto` as well, so an outset ring on a box exactly one chip tall is
        // clipped on all four sides at once — the same fix `Tabs` needed for the same reason.
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring',
        active
          ? // A RAISED PILL ON THE GROOVE. The emphasis is ELEVATION — card fill plus `shadow-nx-1`
            // against a tinted track — with the accent only in the label. That is what keeps this
            // from competing with the feed's selected TAB forty pixels above it, which an earlier
            // solid-accent fill lost badly: the chip was the loudest thing on the screen while
            // wearing the tab's own word. Colour says which; height says how much.
            //
            // `surface-raised`, NOT `surface-card`, AND DARK IS THE WHOLE REASON. The two are the
            // same white in light, so this changes nothing there — but in dark `card` is gray-800
            // (#232c34) while the groove is 10% paper over the ground, which composites to
            // #262d35. Measured: the "raised" pill was rendering FRACTIONALLY DARKER than the
            // track it was supposed to sit on top of, and only the accent label gave it away.
            // `raised` is gray-700 (#37414a), a step up from the groove — which is exactly what
            // the token means and what the DS says has to carry elevation in dark, where there is
            // no light to cast the shadow this pairs with in light.
            'bg-nx-surface-raised text-nx-text-accent shadow-nx-1'
          : // NO FILL AT ALL. An inactive chip used to carry `bg-nx-surface-sunken`, which on this
            // ground is the ground — a fill that painted nothing while implying every chip was a
            // filled object. The groove behind them is the fill now, and only the selected one
            // lifts off it.
            'text-nx-text-secondary hover:text-nx-text-primary'
      )}
    >
      {label}
    </button>
  );
}
