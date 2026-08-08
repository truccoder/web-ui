'use client';

import { Card } from './card';
import { cn } from '@/shared/lib/cn';

/**
 * A single headline number with a label and a one-line explanation.
 *
 * NO DESIGN SYSTEM SPECIMEN EXISTS FOR THIS. The DS ships nothing stat-, metric-, tile- or
 * KPI-shaped — `components/display/` is Avatar, Badge, Card, DeveloperIdentity, EmptyState,
 * ExpertiseTag, RepScore, Skeleton, Tag — so this is composed from `Card` plus type tokens rather
 * than matched against a specimen. Recorded as ds-deviation #27, same class as the chat bubbles
 * (#21) and the contribution graph (#26).
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
    <Card padding={16} className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-nx-caption font-medium text-nx-text-secondary">{label}</span>
        {icon && <span className="shrink-0 text-nx-text-muted">{icon}</span>}
      </div>

      {/* `tabular-nums` so a row of tiles keeps its digits aligned as the numbers change. */}
      <span className="text-nx-h2 font-semibold tabular-nums text-nx-text-primary">
        {value === undefined ? '—' : value.toLocaleString('en-US')}
      </span>

      {description && <span className="text-nx-micro text-nx-text-muted">{description}</span>}
    </Card>
  );
}
