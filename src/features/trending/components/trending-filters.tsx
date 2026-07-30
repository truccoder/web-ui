'use client';

import { Tabs } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { cn } from '@/shared/lib/cn';
import type { TrendingCategory, TrendingTimeRange } from '../types/trending';

/**
 * Time range and category pickers.
 *
 * SPLIT OUT OF THE LIST because the two do different jobs: this decides what to ask for, the list
 * decides how to show what came back. Keeping the filters presentational also means the list's
 * state stays in one place — nothing here holds a value, it only reports changes.
 *
 * CATEGORY IS CHIPS, NOT A SECOND `Tabs`. There are nine choices including "all"; a tab row that
 * wide either scrolls sideways or crushes its labels, and neither reads as the peer of a
 * three-item control. Chips wrap.
 */
export interface TrendingFiltersProps {
  timeRange: TrendingTimeRange;
  onTimeRangeChange: (timeRange: TrendingTimeRange) => void;
  /** `undefined` means every category — the backend omits the parameter entirely. */
  category: TrendingCategory | undefined;
  onCategoryChange: (category: TrendingCategory | undefined) => void;
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

export function TrendingFilters({
  timeRange,
  onTimeRangeChange,
  category,
  onCategoryChange,
  className,
}: TrendingFiltersProps) {
  const t = useT();

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Tabs
        size="sm"
        aria-label={t('trending.timeRangeLabel')}
        active={timeRange}
        onChange={(id) => onTimeRangeChange(id as TrendingTimeRange)}
        tabs={TIME_RANGES.map((range) => ({ id: range, label: t(`trending.timeRange.${range}`) }))}
      />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('trending.categoryLabel')}>
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
