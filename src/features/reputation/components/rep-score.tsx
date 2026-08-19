'use client';

import * as React from 'react';
import { cn } from '@/shared/lib/cn';
import { useIntlLocale } from '@/shared/lib/format';

/**
 * Hand-written from `RepScore.d.ts` + `RepScore.prompt.md` and the rendered
 * `display.card` specimen. No design-system source was read.
 *
 * The Elite Score chip: mono digits behind an amber cursor bar. This is the ONE sanctioned
 * amber accent in product UI (constitution §1.3) — never restyle it blue or neutral, and
 * never reuse this look for something that isn't reputation.
 *
 * DEVIATION, mandatory: the DS component derives the level from the score via its own
 * `REP_LEVELS` table and exposes `repLevel()`/`REP_LEVELS` helpers. This one takes
 * `levelName` as a prop instead. Thresholds already exist twice — backend enum `RepLevel`
 * and the DS table — and CLAUDE.md §1 forbids a third copy in the frontend, so the level
 * always comes off the API response. With no `levelName`, the suffix is simply omitted;
 * it is never guessed from the score.
 *
 * DEVIATION, minor: the specimen's digits are 11.5 / 12.5 / 16px, none of which exist in
 * the type scale — a closed set per constitution §7.2, and §0 makes the constitution win.
 * Mapped to the nearest tokens: micro 11 / caption 12 / body 15. Chip geometry (heights,
 * padding, bar size) is component spec, not type, so it follows the specimen exactly.
 */
export interface RepScoreProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Raw Elite Score, e.g. 8420 → "8,420". */
  score?: number;
  /** sm = inline in feed identity rows · md = default · lg = profile hero. @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Append "· <level>". Requires `levelName` — nothing is derived from the score. */
  showLevel?: boolean;
  /** Level name straight from the API (`levelName`). */
  levelName?: string;
}

/**
 * `text-nx-*` carries the token's own line-height, which would beat a separate `leading-none`; the
 * `/none` modifier sets both at once, as the specimen does.
 *
 * THE GAPS WERE 5 / 7 / 9 AND ARE NOW 4 / 4 / 8 — corrected by measuring the kit rather than by
 * re-reading it. The note above claims this chip "follows the specimen exactly"; it did not. The
 * rendered R15 chip is `height 20 · padding 0 6px · gap 4px · font 11` at `sm`, and ours matched on
 * every number except the gap. 5 · 7 · 9 are on no scale the system has: round 5.1's sub-scale
 * below `tight` is `2 · 4 · 8` and says outright that "5 · 6 · 7 are gone from both kits".
 *
 * Only `sm` appears in the kit's feed, so that one is measured. `md` and `lg` are placed on the
 * nearest legal rungs rather than kept on numbers the ladder does not contain — stated here
 * because it is an inference, not a measurement.
 *
 * Heights and horizontal padding are untouched: those ARE component-spec geometry, and sampling
 * the kit shows padding legitimately using 6 and 7 where gaps never do.
 */
const sizeStyles: Record<NonNullable<RepScoreProps['size']>, string> = {
  sm: 'h-5 gap-1 px-2 text-nx-micro/none',
  md: 'h-6 gap-1 px-2 text-nx-caption/none',
  lg: 'h-8 gap-2 px-2.5 text-nx-body/none',
};

const barStyles: Record<NonNullable<RepScoreProps['size']>, string> = {
  sm: 'h-2.5 w-[3px]',
  md: 'h-3 w-1',
  lg: 'h-4 w-[5px]',
};

/**
 * Grouped below 10k ("8,420"), compacted above it ("15.8k") — matching the specimen, which
 * shows 128 and 8,420 in full but 12.5k and 15.8k compacted. A whole number of thousands
 * drops the decimal: 15000 → "15k".
 *
 * `localeTag` IS REQUIRED RATHER THAN DEFAULTED, because both branches carry a separator whose
 * meaning flips between the app's two languages: `8,420` is eight thousand to an English reader
 * and eight-point-four-two to a Vietnamese one, and `15.8k` inverts the same pair. A default here
 * would let a caller render a false number without ever writing a locale down, so the type system
 * asks instead. Vietnamese output is `8.420` and `15,8k`.
 */
export function formatRep(score = 0, localeTag: string): string {
  if (score < 10_000) return score.toLocaleString(localeTag);
  const thousands = score / 1000;
  // `maximumFractionDigits: 1` does the specimen's "drop the decimal on a whole thousand" for
  // free, and localises the decimal mark that `toFixed` would have hardcoded to a dot.
  return `${thousands.toLocaleString(localeTag, { maximumFractionDigits: 1 })}k`;
}

export function RepScore({
  score = 0,
  size = 'md',
  showLevel = false,
  levelName,
  className,
  ...props
}: RepScoreProps) {
  const localeTag = useIntlLocale();

  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-nx-sm',
        'border border-nx-rep-border bg-nx-rep-soft font-mono font-semibold text-nx-rep-text',
        sizeStyles[size],
        className
      )}
      {...props}
    >
      <span aria-hidden className={cn('shrink-0 rounded-[1.5px] bg-nx-rep', barStyles[size])} />
      {formatRep(score, localeTag)}
      {showLevel && levelName && (
        <span className="font-medium text-nx-rep-strong">· {levelName}</span>
      )}
    </span>
  );
}
