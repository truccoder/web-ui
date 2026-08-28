'use client';

import { cn } from '@/shared/lib/cn';
import { useIntlLocale } from '@/shared/lib/format';
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
  /**
   * `en-US` WAS HARDCODED HERE, and on a Vietnamese screen that is not a cosmetic slip: `8,800`
   * rendered with a comma, and in Vietnamese the comma is the DECIMAL separator — the line read
   * as eight point eight. The design's own `còn 34.098` uses the dot, which is what `vi-VN`
   * produces. Six other call sites still pass `en-US`; they are listed in the R5-3 ledger entry.
   */
  const localeTag = useIntlLocale();
  const { eliteScore, currentLevelMin, nextLevelMin, levelName } = reputation;

  const atTop = nextLevelMin == null;
  const remaining = atTop ? 0 : Math.max(0, nextLevelMin - eliteScore);

  // Progress THROUGH the current level, not from zero: a level bar that measures from the origin
  // would sit at 97% for the whole of the last band and never appear to move.
  const span = atTop ? 0 : nextLevelMin - currentLevelMin;
  const percent = atTop || span <= 0 ? 100 : ((eliteScore - currentLevelMin) / span) * 100;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        /**
         * THE TRACK IS `--nx-tint`, NOT `surface-sunken`, and the reason is the same one that
         * moved `StatTile` off `inset`. R15 lowered the page to gray-100, where `surface-sunken`
         * already was, so the two are identical in light — and this bar lives in the ledger, which
         * IS the page ground. A sunken track there is a 4px invisible line: measured on `/profile`,
         * where the ledger's bar could not be seen at all.
         *
         * `--nx-tint` is the token defined for exactly this: the one fill that must read on EVERY
         * plane, an alpha rather than a step off the ramp, so it darkens a card and the ground by
         * the same perceptual amount.
         */
        className="h-1 w-full overflow-hidden rounded-nx-full bg-nx-tint"
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

      {/**
       * THE DISTANCE AND THE DESTINATION ARE GATED SEPARATELY — R5-3, and this used to be one
       * gate on `nextLevelName`.
       *
       * That was measured wrong in the ledger: `nextLevelName` does not exist on the backend
       * (B26), so a single gate threw away `còn 8.800` as well — a number `nextLevelMin` DOES
       * supply — and the line collapsed to a bare `Expert`, which says nothing a bar cannot.
       * A level bar exists to express a distance; the one piece of the sentence the product can
       * actually compute was the piece being suppressed.
       *
       * So: the distance renders whenever there is a next level, and `→ <name>` joins it only
       * when the name arrives. The day B26 lands, the line becomes the design's
       * `Architect · còn 34.098 → Elite` with no further change here.
       */}
      <p className="text-nx-caption text-nx-text-secondary">
        <span className="font-medium text-nx-text-primary">{levelName}</span>
        {!atTop && (
          <>
            {' · '}
            {/* The number is computed, so it is mono and tabular like every computed number here. */}
            {t('reputation.remaining')}{' '}
            <span className="font-mono tabular-nums">{remaining.toLocaleString(localeTag)}</span>
            {nextLevelName && (
              <>
                {' → '}
                {nextLevelName}
              </>
            )}
          </>
        )}
      </p>
    </div>
  );
}
