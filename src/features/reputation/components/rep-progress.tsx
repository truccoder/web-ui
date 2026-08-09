'use client';

import { cn } from '@/shared/lib/cn';
import { useT } from '@/core/i18n';
import type { Reputation } from '../types/reputation';

/**
 * The ledger's evidence bar: a 4px track, then one sentence-case line under it saying how far the
 * next level is — `Architect · còn 34.098 → Elite`.
 *
 * THREE THINGS THIS DELIBERATELY DOES NOT SHOW, each removed for its own reason
 * (`handoff/layout-r7.md` §5.1):
 *
 *  1. THE ABSOLUTE SCORE. It is already the `RepScore` chip on `/profile` and on every post its
 *     owner writes, so the ledger was its third appearance and the only one where nothing used it.
 *  2. `N / M`. A level bar exists to express a DISTANCE, and two absolutes make the reader do the
 *     subtraction themselves. `còn 34.098 → Elite` is the same fact already subtracted.
 *  3. TRACKED UPPERCASE on the level name. Retired across the ledger — uppercase plus letter
 *     spacing at 11px on recessed ground is the exact legibility complaint the round was fixing.
 *
 * AT THE TOP LEVEL THERE IS NO NEXT LEVEL. `nextLevelMin` is null once someone reaches ELITE
 * (`RepLevel.next()` returns null), so the distance clause has nothing to name and the bar has no
 * remaining span to draw. It renders full, with the level name alone. A bar stuck at 100% with
 * "còn 0" would read as a rounding error rather than as an arrival.
 */
export interface RepProgressProps {
  reputation: Reputation;
  /** The level after this one, for the `→ Elite` clause. Omit at the top level. */
  nextLevelName?: string;
  className?: string;
}

export function RepProgress({ reputation, nextLevelName, className }: RepProgressProps) {
  const t = useT();
  const { eliteScore, currentLevelMin, nextLevelMin, levelName } = reputation;

  const atTop = nextLevelMin == null;
  const remaining = atTop ? 0 : Math.max(0, nextLevelMin - eliteScore);

  // Progress THROUGH the current level, not from zero: a level bar that measures from the origin
  // would sit at 97% for the whole of the last band and never appear to move.
  const span = atTop ? 0 : nextLevelMin - currentLevelMin;
  const percent = atTop || span <= 0 ? 100 : ((eliteScore - currentLevelMin) / span) * 100;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        className="h-1 w-full overflow-hidden rounded-nx-full bg-nx-surface-sunken"
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={levelName}
      >
        {/* `--nx-rep` is the one sanctioned amber in the product: reputation, and nothing else. */}
        <div
          className="h-full rounded-nx-full bg-nx-rep transition-[width] duration-[var(--nx-duration-base)] ease-nx-out"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>

      <p className="text-nx-caption text-nx-text-secondary">
        <span className="font-medium text-nx-text-primary">{levelName}</span>
        {!atTop && nextLevelName && (
          <>
            {' · '}
            {/* The number is computed, so it is mono and tabular like every computed number here. */}
            {t('reputation.remaining')}{' '}
            <span className="font-mono tabular-nums">{remaining.toLocaleString('en-US')}</span>
            {' → '}
            {nextLevelName}
          </>
        )}
      </p>
    </div>
  );
}
