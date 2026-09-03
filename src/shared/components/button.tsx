import * as React from 'react';
import Link from 'next/link';
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
  /**
   * Forwarded to the `<button>` through the prop spread.
   *
   * A plain prop rather than `forwardRef`, which React 19 made unnecessary — same reasoning, and
   * the same one-line declaration, as `Input`'s. Added when trending's filter popover needed it:
   * Escape closes the panel and has to hand focus back to the trigger, which is not expressible
   * without a handle on the element.
   */
  ref?: React.Ref<HTMLButtonElement>;
}

/** Heights are canonical per constitution §11.2 — screens do not override them. */
const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  // `gap-1` (4), measured off the kit: a 28px-high button there renders `gap: 4px; padding: 0 10px`.
  // This was `gap-2` — 6px, which is not on the sub-scale at all (`2 · 4 · 8`, and round 5.1 says
  // "5 · 6 · 7 are gone from both kits"). Confirmed by sampling every gap in the rendered kit: 8 · 4
  // · 2 · 12 · 16 · 20 and no 6 anywhere.
  sm: 'h-7 gap-1 px-2.5 text-nx-body-sm',
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
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      <ButtonContent loading={loading} icon={icon}>
        {children}
      </ButtonContent>
    </button>
  );
}

/**
 * The button's look, without the button.
 *
 * EXTRACTED FOR `ButtonLink` BELOW, which is the only reason it exists — the styling had to stop
 * being welded to a `<button>` element so that a NAVIGATION could wear it. Nothing else changed:
 * `Button` calls this and renders exactly what it rendered before.
 */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: Pick<ButtonProps, 'variant' | 'size' | 'className'>) {
  return cn(
    'inline-flex items-center justify-center rounded-nx-sm font-medium',
    'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
    'disabled:pointer-events-none disabled:opacity-50',
    sizeStyles[size],
    variantStyles[variant],
    className
  );
}

function ButtonContent({
  loading,
  icon,
  children,
}: Pick<ButtonProps, 'loading' | 'icon' | 'children'>) {
  return (
    <>
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
    </>
  );
}

export interface ButtonLinkProps
  extends
    Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>,
    Pick<ButtonProps, 'variant' | 'size' | 'icon' | 'className'> {}

/**
 * A LINK THAT LOOKS LIKE A BUTTON — and the point is that it is ONE element, not two.
 *
 * `docs/ui-audit-report.md` §3.8 (F001) found `<Link><Button>…</Button></Link>` at 21 sites,
 * including `shared/api-error-notice.tsx`, which put it into every error state in the product.
 * A `<button>` inside an `<a>` is invalid HTML — interactive content may not nest — and the
 * consequence was measured with the keyboard rather than inferred: Tab stopped on the anchor,
 * then stopped AGAIN on the button inside it, same label, one destination. A screen reader reads
 * that as "link, Yêu cầu link mới… button, Yêu cầu link mới".
 *
 * The fix is not to style an anchor by hand — that is how the two drift apart — but to let the
 * anchor wear the button's own classes, which is what `buttonClasses` above is for.
 *
 * NO `loading` AND NO `disabled`. A navigation has no pending state to report and cannot be
 * disabled in any meaningful way; a control that needs either is a `Button` doing work, not a
 * link. Leaving them off keeps that distinction visible at the call site.
 */
export function ButtonLink({
  variant,
  size,
  icon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      <ButtonContent icon={icon}>{children}</ButtonContent>
    </Link>
  );
}
