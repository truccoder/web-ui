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
 * THERE IS NO `bare` VARIANT, AND THAT IS A DECISION WITH A HISTORY. The kit's README (round 5.1)
 * says four sets — the roadmap nodes, the book grid, the external list and the `StatTile` row —
 * take `Card variant="bare"`: no fill, no border, hover only, because a filled member inside a
 * 12px-gap set is a padding-beats-gap inversion. I added the variant and applied it to three of
 * them. Then I measured: the kit's own book cell is `330 wide · rgb(255,255,255) · 16px 20px ·
 * radius 8`, sitting in a grid with exactly the 12px gap that passage calls an inversion. Every
 * card in the kit is filled. The variant was removed rather than left unused, because a variant
 * that exists is a variant someone will reach for.
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
  /**
   * Padding in px, or any CSS length.
   *
   * THE DEFAULT IS TWO-AXIS — `16px 20px`, not a single 16. The ladder has carried
   * `--nx-space-pad: 20px` (horizontal) and `--nx-space-pad-y: 16px` (vertical) since round 8,
   * because a rung is read **per axis**: horizontal padding is paid once, vertical padding is paid
   * again at every block boundary down a feed. A square 16 collapses that distinction and makes
   * the card 4px narrow in its text inset.
   *
   * Measured rather than inferred: every white rounded surface in the rendered kit computes to
   * `padding: 16px 20px` — 13 of them on the feed screen, with no other value.
   *
   * Passing a number still works and still means all four sides; it is an override, not the norm.
   *
   * @default "16px 20px"
   */
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
  padding = 'var(--nx-space-pad-y) var(--nx-space-pad)',
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
