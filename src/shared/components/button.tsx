import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from the design system's `Button.d.ts` + `Button.prompt.md` contract.
 * No design-system source was read.
 *
 * Doctrine that shapes this file:
 * - Exactly one `primary` per view (prompt.md). Not enforceable in code — review it.
 * - Nothing moves or scales on hover (constitution §2.1). Hover changes colour only.
 * - `loading` replaces the icon with a spinner AND disables the button, so a pending
 *   action cannot be fired twice.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual emphasis. @default "primary" */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Replaces the icon with a spinner and disables the button. */
  loading?: boolean;
  /** Optional leading icon (16–18px, currentColor). */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/** Heights are canonical per constitution §11.2 — screens do not override them. */
const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-7 gap-1.5 px-2.5 text-nx-body-sm',
  md: 'h-[34px] gap-2 px-3 text-nx-ui',
  lg: 'h-10 gap-2 px-4 text-nx-ui',
};

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  // Ink fill, not blue. Button.d.ts says "primary (ink fill)" and the neutrals
  // guideline calls #101820 the primary-button colour; the accent guideline claims
  // blue-600 for the same job. Constitution §1.2 permits either ("reads blue or ink"),
  // so the component contract wins as the more specific spec.
  primary: cn(
    'bg-nx-surface-inverse text-nx-text-inverse',
    'hover:bg-nx-surface-inverse-hover active:bg-nx-surface-inverse-pressed'
  ),
  secondary: cn(
    'border border-nx-border-strong bg-nx-surface-card text-nx-text-primary',
    'hover:bg-nx-surface-hover active:bg-nx-surface-pressed'
  ),
  ghost: cn(
    'bg-transparent text-nx-text-secondary',
    'hover:bg-nx-surface-hover hover:text-nx-text-primary active:bg-nx-surface-pressed'
  ),
  danger: cn(
    'bg-nx-status-danger text-nx-text-on-color',
    'hover:bg-nx-status-danger-fg active:bg-nx-status-danger-fg'
  ),
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-nx-sm font-medium',
        'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        icon && (
          <span className="shrink-0 [&>svg]:size-4" aria-hidden>
            {icon}
          </span>
        )
      )}
      {children}
    </button>
  );
}
