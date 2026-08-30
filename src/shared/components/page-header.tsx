import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * The `<h1>` block a titled screen opens with: a title, an optional sentence under it, and an
 * optional action hung off its right edge.
 *
 * ── IT IS TO A PAGE WHAT `Section` IS TO A REGION, AND FOR THE SAME REASON. ────────────────────
 * Seven `(main)` screens — `library`, `knowledge`, `roadmap`, `projects`, `friends`, `search`,
 * `notifications` — each hand-wrote `<div><h1 …><p …></div>`, and the classes drifted with every
 * copy: `mt-1` next to `mt-0.5`, `text-muted` next to `text-secondary`, `tracking-tight` on five
 * of the seven and absent on the other two. That last one was not cosmetic — `text-nx-title`
 * already carries `font-weight: 600` and `letter-spacing: -0.015em`, so `tracking-tight` (−0.025em)
 * was OVERRIDING the token, and two screens side by side rendered their titles at different letter
 * spacing.
 *
 * SO THE TITLE IS JUST `text-nx-title text-nx-text-primary` HERE — no `font-semibold` (redundant
 * with the token) and no `tracking-tight` (a regression against it). The description is
 * `text-nx-text-muted`, matching `Section`; the one variant that reached for `text-secondary` is
 * dropped so a single rank of text has a single colour.
 *
 * THE GAP TO THE DESCRIPTION IS `--nx-space-pair` (4), the token `Section` uses for the same pair,
 * carried by the flex `gap` rather than a margin. The gap DOWN to the page body is
 * `--nx-space-section` (40) and stays where it is: every caller sets it on the column wrapper that
 * holds this header and the content below it.
 *
 * NO EYEBROW SLOT YET. A kicker naming the rail group this page sits under was proposed and held
 * back — on desktop the rail already shows that label a few pixels away. It is a one-file addition
 * here if it earns its place later.
 */
export interface PageHeaderProps {
  /** The `<h1>`. One per page. */
  title: string;
  /**
   * One sentence under the title, for a screen whose name does not already say what it holds.
   *
   * A `ReactNode` rather than a string to match `Section` — no caller needs the richer type today,
   * but the two components staying shaped alike is the point.
   */
  description?: React.ReactNode;
  /**
   * Hung off the right edge, top-aligned with the title so a one-line and a two-line header sit
   * their button at the same place. Usually a single `Button`.
   */
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <header
      className={cn('flex items-start justify-between gap-[var(--nx-space-element)]', className)}
    >
      <div className="flex min-w-0 flex-col gap-[var(--nx-space-pair)]">
        <h1 className="text-nx-title text-nx-text-primary">{title}</h1>
        {description && <p className="text-nx-body-sm text-nx-text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}
