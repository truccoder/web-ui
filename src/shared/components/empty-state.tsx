import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from `EmptyState.d.ts` + `EmptyState.prompt.md`. The canonical empty state:
 * a terminal prompt (`>` + blinking amber brand cursor — the one sanctioned non-reputation
 * amber), a short title, one-line description, at most one action.
 *
 * Empty ≠ error: errors use Input `error` or a danger banner, never this component.
 */
export interface EmptyStateProps {
  /** Replace the default terminal-prompt glyph. Pass `null` to hide it. */
  icon?: React.ReactNode;
  /** ≤ 6 words. */
  title?: React.ReactNode;
  /** One line, ≤ 44ch. */
  description?: React.ReactNode;
  /** A single (usually secondary) Button. */
  action?: React.ReactNode;
  /** Tight padding for panels/cards. @default false */
  compact?: boolean;
  className?: string;
}

function TerminalPrompt() {
  return (
    <span className="font-mono text-nx-title-sm text-nx-text-secondary" aria-hidden>
      &gt;<span className="nx-cursor text-nx-rep">_</span>
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 text-center',
        compact ? 'py-6' : 'py-16',
        className
      )}
    >
      {icon !== null && (
        <div className="mb-1 text-nx-text-muted [&>svg]:size-8">{icon ?? <TerminalPrompt />}</div>
      )}
      {title && <p className="text-nx-heading font-semibold text-nx-text-primary">{title}</p>}
      {description && (
        <p className="max-w-[44ch] text-nx-body-sm text-nx-text-muted">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
