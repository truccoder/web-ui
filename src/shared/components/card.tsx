import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from the design system's `Card.d.ts` + `Card.prompt.md` contract and the round-15
 * `handoff/component-specs.md`. No design-system source was read.
 *
 * ROUND 15 INVERTED THIS COMPONENT'S DEFAULT, and it is the single widest-reaching change in the
 * reskin. Round 1's card was "always a 1px `border-default` box on `surface-card`, `shadow-nx-1`
 * when interactive". R15's card has **no border and no shadow at any variant**. The separation
 * work moved into the surface model: the ground is recessed (`surface-page` dropped a step to
 * gray-100 in light, and cards sit on it), so a card is legible as a card because of what is
 * *under* it, not because of a line drawn around it.
 *
 * Why that is better rather than merely different: a feed is a column of cards, and a bordered
 * card in a column of bordered cards produces a ladder of doubled hairlines between every pair.
 * The constitution's rule that almost nothing in flow has a border — not cards, not the feed, not
 * the rail, not the ledger — only becomes affordable once the ground does the separating.
 *
 * THREE VARIANTS, each naming which plane the card sits on:
 *  - `flat` (default) — `surface-card`, transparent 1px edge. The transparent border is not
 *    decoration: it reserves the pixel so that opting into `bordered` cannot shift layout by 2px.
 *  - `inset` — `surface-sunken`, no edge. A recessed band, for data that belongs to the page
 *    rather than floating above it (see `StatTile`).
 *  - `raised` — `surface-raised` + a `border-subtle` hairline. Genuinely above the plane.
 *
 * `bordered` opts the hairline back in for the cases that still need an explicit edge.
 *
 * DEVIATION, deliberate, carried from round 1: `Card.d.ts` describes `selected` as an amber
 * border. Amber is reserved for reputation (§1.3), and the state ladder defines selected as
 * "blue tint + accent edge" (§2.1). Constitution §0 wins on conflict, so selected is blue.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Padding in px, or any CSS length. 16 on the canvas, 12 in the shell. @default 16 */
  padding?: number | string;
  /** Which plane the card sits on. @default "flat" */
  variant?: 'flat' | 'inset' | 'raised';
  /** Opt the `border-subtle` hairline back in. @default false */
  bordered?: boolean;
  /** Hover tint + pointer cursor. Never a shadow, never a transform. @default false */
  interactive?: boolean;
  /** Selected state. @default false */
  selected?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<NonNullable<CardProps['variant']>, string> = {
  flat: 'bg-nx-surface-card border-transparent',
  inset: 'bg-nx-surface-sunken border-transparent',
  raised: 'bg-nx-surface-raised border-nx-border-subtle',
};

/**
 * Interactive hover moves the card one plane up rather than adding a shadow: `flat` takes the 4%
 * ink tint, and the two that already carry a fill go to `surface-raised` so the change is a real
 * step rather than a tint on a tint.
 */
const interactiveStyles: Record<NonNullable<CardProps['variant']>, string> = {
  flat: 'hover:bg-nx-surface-hover',
  inset: 'hover:bg-nx-surface-raised',
  raised: 'hover:bg-nx-surface-raised',
};

export function Card({
  padding = 16,
  variant = 'flat',
  bordered = false,
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
        'rounded-nx-md border text-nx-text-primary',
        'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
        variantStyles[variant],
        bordered && 'border-nx-border-subtle',
        interactive && `cursor-pointer ${interactiveStyles[variant]}`,
        interactive &&
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
        // Last so it wins over the variant's own fill and edge.
        selected && 'border-nx-accent bg-nx-surface-selected',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
