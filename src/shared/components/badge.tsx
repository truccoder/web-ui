import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from `Badge.d.ts` + `Badge.prompt.md`. Status pill for states and counts —
 * never for actions. Semantic tints only; `dot` adds a leading status dot, `mono` renders
 * the label in Geist Mono (versions, technical states).
 */
export interface BadgeProps {
  /** @default "neutral" */
  variant?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';
  /** Leading status dot. @default false */
  dot?: boolean;
  /** Geist Mono label. @default false */
  mono?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  neutral: 'bg-nx-surface-sunken text-nx-text-secondary',
  info: 'bg-nx-status-info-bg text-nx-status-info-fg',
  success: 'bg-nx-status-success-bg text-nx-status-success-fg',
  warning: 'bg-nx-status-warning-bg text-nx-status-warning-fg',
  danger: 'bg-nx-status-danger-bg text-nx-status-danger-fg',
  accent: 'bg-nx-accent-soft text-nx-text-accent',
};

const dotStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  neutral: 'bg-nx-text-muted',
  info: 'bg-nx-status-info',
  success: 'bg-nx-status-success',
  warning: 'bg-nx-status-warning',
  danger: 'bg-nx-status-danger',
  accent: 'bg-nx-accent',
};

export function Badge({
  variant = 'neutral',
  dot = false,
  mono = false,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-nx-full px-2 py-0.5 text-nx-caption font-medium',
        mono && 'font-mono',
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span className={cn('size-1.5 shrink-0 rounded-nx-full', dotStyles[variant])} aria-hidden />
      )}
      {children}
    </span>
  );
}
