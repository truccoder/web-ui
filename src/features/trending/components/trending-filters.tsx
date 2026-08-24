'use client';

import { Select } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { TrendingCategory, TrendingTimeRange, TrendingSource } from '../types/trending';

/**
 * Time range and category pickers.
 *
 * SPLIT OUT OF THE LIST because the two do different jobs: this decides what to ask for, the list
 * decides how to show what came back. Keeping the filters presentational also means the list's
 * state stays in one place — nothing here holds a value, it only reports changes.
 *
 * CATEGORY IS CHIPS, and that was always right: nine choices including "all", which no strip and
 * no select handles as well as something that wraps and shows every option at once.
 *
 * THE OTHER TWO WERE TAB STRIPS AND ARE NOW SELECTS ON ONE ROW. Stacked, the three controls cost
 * three full rows above the first story — a strip for the range, a strip for the source, then the
 * chips — on a page whose entire job is to show a list. Nothing was wrong with either strip on its
 * own; what was wrong is that a screen cannot have three filter rows and still look like a feed.
 *
 * TWO SELECTS SIDE BY SIDE COLLAPSE THAT TO ONE ROW, and they read better than the strips did for
 * a second reason: a tab strip claims its options are SECTIONS of the page, and neither of these
 * is. `Hôm nay` and `Tuần này` are not two different subjects, they are one subject at two widths.
 * The chips stay chips because a chip row is visibly a filter and not navigation, which is the
 * same claim the selects now make.
 *
 * THE ROW IS `ModerationFilters`' ROW. Same `size="sm"`, same labelled fields, same
 * `items-end gap-[var(--nx-space-element)]` — a filter bar should not be a new invention on every
 * screen that needs one.
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
   * SOURCE IS A FIELD, NOT CHIPS, and the asymmetry with category is deliberate: there are exactly
   * four choices including "all" and they never grow, where categories are nine and open-ended.
   * Category asks WHAT a story is about; source asks WHO FOUND IT.
   *
   * IT USED TO GET "THE LOUDER CONTROL" ON THE ARGUMENT that source carries the product's claim to
   * aggregate three feeds. That argument is now spent: the claim is made by the list itself, where
   * every card names its source, and it is made three rows earlier than a filter nobody has
   * touched yet. Volume here was buying nothing and costing a row.
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

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* `items-end` so the two fields line up on their BOXES, not on their labels — the labels
          are one line each today, and the day one of them wraps this row should still read as a
          row. `flex-wrap` lets the pair stack on a narrow phone rather than squeezing two
          selects into 390. */}
      <div className="flex flex-wrap items-end gap-[var(--nx-space-element)]">
        <Select
          size="sm"
          wrapperClassName="w-40"
          label={t('trending.timeRangeLabel')}
          value={timeRange}
          onChange={(event) => onTimeRangeChange(event.target.value as TrendingTimeRange)}
          options={TIME_RANGES.map((range) => ({
            value: range,
            label: t(`trending.timeRange.${range}`),
          }))}
        />

        {/* `all` IS A SENTINEL, NOT A VALUE. The backend has no "every source" enum member — it
            takes the absence of the parameter — and a native `<option>` must carry a string, so
            the sentinel is translated back to `undefined` here rather than leaking outward. */}
        <Select
          size="sm"
          wrapperClassName="w-44"
          label={t('trending.sourceLabel')}
          value={source ?? 'all'}
          onChange={(event) =>
            onSourceChange(
              event.target.value === 'all' ? undefined : (event.target.value as TrendingSource)
            )
          }
          options={[
            { value: 'all', label: t('trending.allSources') },
            ...SOURCES.map((value) => ({ value, label: t(`trending.sources.${value}`) })),
          ]}
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('trending.categoryLabel')}>
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
    </div>
  );
}

/**
 * One category chip.
 *
 * `aria-pressed` RATHER THAN A ROLE OR A LINK: these are toggles that re-query in place, and the
 * pressed state is the only thing distinguishing the selected one for a screen reader — colour
 * alone would not.
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
        'rounded-nx-full px-3 py-1 text-nx-caption font-medium',
        'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
        active
          ? 'bg-nx-accent text-white'
          : 'bg-nx-surface-sunken text-nx-text-secondary hover:text-nx-text-primary'
      )}
    >
      {label}
    </button>
  );
}
