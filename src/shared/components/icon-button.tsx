import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from the design system's `IconButton.d.ts` contract and the rendered
 * `actions.card.html` specimen. No design-system source was read.
 *
 * `label` IS REQUIRED AND THE TYPE ENFORCES IT, which is the whole reason this exists as its own
 * component rather than `<Button icon={...} />` with no children. An icon-only control with no
 * accessible name is invisible to a screen reader, and the app is about to grow a topbar full of
 * them (bell, menu, palette). Making the name impossible to forget is cheaper than auditing later.
 * It becomes both `aria-label` and `title`, per the contract.
 *
 * `active` uses the AMBER tint the contract calls for. That is a deliberate exception to the
 * constitution's "amber is evidence" scarcity rule (see ds-deviation #24, where a 5-star widget was
 * denied amber for exactly that reason): here the DS itself specifies amber for the toggled state,
 * and a toggled control in the chrome is one instance, not a repeated row.
 */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name — required. Becomes `aria-label` and `title`. */
  label: string;
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** @default "ghost" */
  variant?: 'ghost' | 'outline';
  /** Selected/toggled state — amber tint. */
  active?: boolean;
  /** The icon element (16–20px, currentColor). */
  children?: React.ReactNode;
}

/** Square: heights match `Button`'s canonical scale (constitution §11.2) so the two line up. */
const sizeStyles: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'size-7 [&>svg]:size-4',
  md: 'size-[34px] [&>svg]:size-[18px]',
  lg: 'size-10 [&>svg]:size-5',
};

const variantStyles: Record<NonNullable<IconButtonProps['variant']>, string> = {
  ghost: cn(
    'bg-transparent text-nx-text-secondary',
    'hover:bg-nx-surface-hover hover:text-nx-text-primary active:bg-nx-surface-pressed'
  ),
  outline: cn(
    'border border-nx-border-strong bg-nx-surface-card text-nx-text-primary',
    'hover:bg-nx-surface-hover active:bg-nx-surface-pressed'
  ),
};

export function IconButton({
  label,
  size = 'md',
  variant = 'ghost',
  active = false,
  className,
  children,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      // Communicates the toggled state to assistive tech; the amber tint only communicates it
      // to people who can see it.
      aria-pressed={active || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-nx-sm',
        'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        sizeStyles[size],
        variantStyles[variant],
        active && 'bg-nx-rep-soft text-nx-rep-text hover:bg-nx-rep-soft',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
