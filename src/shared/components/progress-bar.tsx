import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * A determinate progress bar — a filled track that grows with `value` (0–100).
 *
 * NO DESIGN-SYSTEM SPEC FOR THIS ONE, same situation as `Textarea`: the kit ships no progress
 * component and the upload surfaces (media picker, cover, project banner, book file) need a real
 * percentage instead of a spinner that says nothing about how far along a 20MB upload is. Built
 * from the same tokens the rest of the kit uses — `--nx-accent` for the fill, the sunken surface
 * for the track — and flagged for the DS owner.
 *
 * `role="progressbar"` with the aria value attributes, so a screen reader announces the percent.
 */
export interface ProgressBarProps {
  /** 0–100. Clamped. */
  value: number;
  /** Accessible name for the operation in progress. */
  label?: string;
  className?: string;
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-nx-surface-sunken', className)}
    >
      <div
        className="h-full rounded-full bg-nx-accent transition-[width] duration-[var(--nx-duration-fast)] ease-nx-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
