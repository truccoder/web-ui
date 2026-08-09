'use client';

import { Card } from './card';
import { cn } from '@/shared/lib/cn';

/**
 * A single headline number with a label and a one-line explanation.
 *
 * ROUND 15 GAVE THIS A REAL SPECIMEN, closing ds-deviation #27. The note this replaces said "no
 * design system specimen exists for this" and composed the tile by eye; `components/display/`
 * now ships `StatTile` with geometry in `handoff/component-specs.md`. Two things came from it:
 * the card is `variant="inset"`, so a 4-up strip reads as ONE recessed data band rather than four
 * floating boxes, and the value is **mono** — this product's rule is that computed numbers are
 * always mono and tabular, and a stat tile is nothing but a computed number.
 *
 * `value` TAKES `undefined` AND RENDERS AN EM DASH, which is the whole reason it is a prop rather
 * than `children`. A dashboard tile is read at a glance, and "0" and "we have not loaded this yet"
 * must not look the same — a zero that is actually a pending request is the kind of wrong number
 * this project cuts elsewhere (ds-deviation #19). Callers pass the raw value and let the tile say
 * "not known"; nothing here defaults to 0.
 */
export interface StatTileProps {
  label: string;
  /** Undefined renders "—". A real 0 renders "0". */
  value?: number;
  /** One line under the number, explaining what it counts. */
  description?: string;
  /** Leading icon, rendered top-right at 16px in muted colour. */
  icon?: React.ReactNode;
  className?: string;
}

export function StatTile({ label, value, description, icon, className }: StatTileProps) {
  return (
    <Card variant="inset" padding={16} className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-nx-caption font-medium text-nx-text-secondary">{label}</span>
        {icon && <span className="shrink-0 text-nx-text-muted [&>svg]:size-4">{icon}</span>}
      </div>

      {/* Mono + `tabular-nums`: digits stay aligned down a column of tiles and across a value that
          changes under the reader. The em dash is `text-faint` so "not known" recedes instead of
          reading as a value in its own right. */}
      <span
        className={cn(
          'font-mono text-nx-title font-semibold tabular-nums',
          value === undefined ? 'text-nx-text-faint' : 'text-nx-text-primary'
        )}
      >
        {value === undefined ? '—' : value.toLocaleString('en-US')}
      </span>

      {description && <span className="text-nx-micro text-nx-text-muted">{description}</span>}
    </Card>
  );
}
