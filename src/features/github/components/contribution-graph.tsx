'use client';

import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { ContributionCalendar } from '../types/github';

/**
 * The contribution calendar, as GitHub's own heatmap.
 *
 * NO DESIGN SYSTEM SPECIMEN EXISTS FOR THIS. The DS ships actions/display/forms/navigation/
 * overlays and has nothing heatmap-, calendar- or chart-shaped, so this is an invention rather
 * than a match — recorded as ds-deviation #26 so the next reader does not go looking for a
 * specimen that was missed. Same situation as the chat bubbles (#21) and the chat dock (#22).
 *
 * THE COLOURS COME FROM GITHUB, NOT FROM THE TOKENS, AND THAT IS DELIBERATE. Every day carries a
 * `color` computed by GitHub against its own five-step scale; that scale IS the thing a developer
 * recognises, and re-mapping it onto this app's palette would produce a graph that looks like a
 * contribution graph and disagrees with the one on github.com. This is the one place in the app
 * where a raw colour from the payload is rendered — it is data, not decoration, which is why it
 * does not violate the no-hardcoded-hex rule (nothing is hardcoded here; the value is read).
 *
 * The single token-derived colour is the fallback for a malformed day, so a missing colour reads
 * as an empty cell rather than as a transparent hole in the grid.
 */
export interface ContributionGraphProps {
  calendar: ContributionCalendar;
  /**
   * How many trailing weeks to draw. Omit for the full calendar (the `/profile` case).
   *
   * THE LEDGER PASSES 18, AND THE COUNT IS FIXED RATHER THAN DERIVED FROM THE WIDTH. Deriving it
   * looks tidier and is wrong: the ledger is 300px at the full step and 272 at 1280, so a
   * width-derived count would mean the summary shows *a different amount of history depending on
   * how wide the window is*. A quantity of history is editorial, not responsive. 18 is a quarter
   * plus a fortnight — enough to show a habit, too little to be the year `/profile` already shows.
   * What derives instead is the CELL, below.
   */
  weeks?: number;
  /** The total line above the grid. @default true */
  legend?: boolean;
  /**
   * Cell edge in px. The ledger computes `clamp(8, 11, floor((drawable − 17 × gap) / 18))` so 18
   * weeks always fit without a horizontal scroller — 11px at a 300px ledger, 10px at 272.
   * @default 10
   */
  cellSize?: number;
  className?: string;
}

export function ContributionGraph({
  calendar,
  weeks: weekCount,
  legend = true,
  cellSize = 10,
  className,
}: ContributionGraphProps) {
  const t = useT();

  // A week with no days is not worth a column, and the backend's empty-object fallback is already
  // filtered out upstream (`normalizeStats` turns `{}` into null), so this only guards a partial
  // week — which GitHub does emit for the current one.
  const allWeeks = calendar.weeks.filter((week) => week.contributionDays.length > 0);
  // Trailing slice: the most recent `weekCount` weeks, because the near past is what a habit
  // reads from. `slice(-n)` on a shorter array returns the whole thing, so a new account with
  // nine weeks of history draws nine columns rather than padding to eighteen.
  const weeks = weekCount ? allWeeks.slice(-weekCount) : allWeeks;

  if (weeks.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {legend && (
        <p className="text-nx-caption text-nx-text-secondary">
          {t('github.graph.total', { count: calendar.totalContributions })}
        </p>
      )}

      {/* Horizontal scroll rather than squeezing 53 columns into the container: shrinking the
          cells past ~10px makes the density unreadable, which is the only thing the graph is for.
          The wrapper scrolls, the page does not. */}
      <div className="overflow-x-auto">
        <div className="flex gap-[3px]">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.contributionDays.map((day) => (
                <div
                  key={day.date}
                  // `title` rather than a tooltip component: 365 cells each mounting a tooltip is
                  // a lot of machinery for a hover hint the browser already provides.
                  title={t('github.graph.day', {
                    count: day.contributionCount,
                    date: day.date,
                  })}
                  className="shrink-0 rounded-[2px]"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: day.color || 'var(--nx-surface-sunken)',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
