import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from the design system's `Card.d.ts` + `Card.prompt.md` contract.
 * No design-system source was read.
 *
 * The base surface: hairline border, 8px radius, shadow only when it genuinely floats
 * (constitution §1.4 — hairlines over shadows).
 *
 * DEVIATION, deliberate: `Card.d.ts` describes `selected` as an amber border. Amber is
 * reserved for reputation (§1.3), and the state ladder defines selected as "blue tint +
 * accent edge" (§2.1). Constitution §0 wins on conflict, so selected is blue.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Padding in px, or any CSS length. @default 16 */
  padding?: number | string;
  /** Adds hover shadow + pointer cursor. @default false */
  interactive?: boolean;
  /** Selected state. @default false */
  selected?: boolean;
  children?: React.ReactNode;
}

export function Card({
  padding = 16,
  interactive = false,
  selected = false,
  className,
  style,
  children,
  ...props
}: CardProps) {
  return (
    <div
      style={{ padding: typeof padding === 'number' ? `${padding}px` : padding, ...style }}
      className={cn(
        'rounded-nx-md border bg-nx-surface-card text-nx-text-primary',
        'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
        selected ? 'border-nx-accent bg-nx-surface-selected' : 'border-nx-border-default',
        // Shadow appears only on hover of a genuinely interactive card; nothing
        // moves or scales (§2.1).
        interactive &&
          'cursor-pointer hover:border-nx-border-strong hover:shadow-nx-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
