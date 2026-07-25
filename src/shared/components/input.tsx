import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from the design system's `Input.d.ts` + `Input.prompt.md` contract.
 * No design-system source was read.
 *
 * The label ships with the field rather than as a separate `Label` primitive, because
 * that is how the DS models it — one `label` prop, wired to the input via a generated id.
 *
 * FIDELITY FIX (P2.4c-1): the border was `border-strong`, padding 12px and the label
 * `text-secondary`. The rendered `forms.card` specimen uses `border-default`, 10px padding
 * and a `text-primary` label — fields read lighter than buttons, which do use `border-strong`.
 * Corrected here so Input, Select and Textarea are one family.
 *
 * DEVIATION, deliberate: `Input.prompt.md` says "amber focus ring". The constitution
 * reserves amber for reputation alone (§1.3), assigns focus to blue (§1.2), sets
 * `--focus-ring: var(--blue-500)`, and applies `outline: 2px solid var(--focus-ring)`
 * globally in the DS's own base.css. Constitution §0 says it wins on conflict, so the
 * ring is blue.
 */
export interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'prefix'
> {
  label?: string;
  /** Helper text below the field. */
  hint?: string;
  /** Error message — replaces the hint and turns the border red. */
  error?: string;
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Leading adornment (icon). */
  prefix?: React.ReactNode;
  /** Trailing adornment (icon). */
  suffix?: React.ReactNode;
  /** Render the value in Geist Mono (tokens, handles, URLs). @default false */
  mono?: boolean;
}

const sizeStyles: Record<NonNullable<InputProps['size']>, string> = {
  sm: 'h-7 text-nx-body-sm',
  md: 'h-[34px] text-nx-ui',
  lg: 'h-10 text-nx-ui',
};

export function Input({
  label,
  hint,
  error,
  size = 'md',
  prefix,
  suffix,
  mono = false,
  className,
  id,
  disabled,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const describedById = `${inputId}-description`;
  // Error replaces the hint rather than stacking, per the prop contract.
  const description = error ?? hint;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'text-nx-body-sm font-medium text-nx-text-primary',
            disabled && 'opacity-50'
          )}
        >
          {label}
        </label>
      )}

      <div
        className={cn(
          'flex w-full items-center gap-2 rounded-nx-sm border bg-nx-surface-card px-2.5',
          'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
          // Ring drawn on the wrapper so prefix/suffix sit inside it.
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-nx-focus-ring',
          error ? 'border-nx-status-danger' : 'border-nx-border-default',
          disabled && 'pointer-events-none opacity-50',
          sizeStyles[size],
          className
        )}
      >
        {prefix && (
          <span className="shrink-0 text-nx-text-muted [&>svg]:size-4" aria-hidden>
            {prefix}
          </span>
        )}

        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={description ? describedById : undefined}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-nx-text-primary outline-none',
            'placeholder:text-nx-text-faint',
            mono && 'font-mono'
          )}
          {...props}
        />

        {suffix && (
          <span className="shrink-0 text-nx-text-muted [&>svg]:size-4" aria-hidden>
            {suffix}
          </span>
        )}
      </div>

      {description && (
        <p
          id={describedById}
          className={cn(
            'text-nx-caption',
            error ? 'text-nx-status-danger-fg' : 'text-nx-text-muted'
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
