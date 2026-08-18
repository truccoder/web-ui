import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from the design system's `Select.d.ts` + `Select.prompt.md` contract and the
 * rendered `forms.card` specimen. No design-system source was read.
 *
 * A styled **native** select, not a custom listbox: the specimen renders a real `<select>`
 * with `appearance: none` plus an absolutely positioned chevron. Native keeps keyboard,
 * mobile pickers and form semantics for free, which a div-based listbox would have to
 * reimplement.
 */
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  options?: Array<string | SelectOption>;
}

const sizeStyles: Record<NonNullable<SelectProps['size']>, string> = {
  sm: 'h-7 text-nx-body-sm',
  md: 'h-[34px] text-nx-ui',
  lg: 'h-10 text-nx-ui',
};

const toOption = (option: string | SelectOption): SelectOption =>
  typeof option === 'string' ? { value: option, label: option } : option;

export function Select({
  label,
  hint,
  error,
  size = 'md',
  options = [],
  className,
  id,
  disabled,
  children,
  ...props
}: SelectProps) {
  const generatedId = React.useId();
  const selectId = id ?? generatedId;
  const describedById = `${selectId}-description`;
  const description = error ?? hint;

  return (
    <div className="flex w-full flex-col gap-2">
      {label && (
        <label
          htmlFor={selectId}
          className={cn(
            'text-nx-body-sm font-medium text-nx-text-primary',
            disabled && 'opacity-50'
          )}
        >
          {label}
        </label>
      )}

      <div
        className={cn('relative flex items-center', disabled && 'pointer-events-none opacity-50')}
      >
        <select
          id={selectId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={description ? describedById : undefined}
          className={cn(
            'w-full cursor-pointer appearance-none rounded-nx-sm border bg-nx-surface-raised',
            'py-0 pl-2.5 pr-8 text-nx-text-primary',
            'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
            error ? 'border-nx-status-danger' : 'border-nx-border-default',
            sizeStyles[size],
            className
          )}
          {...props}
        >
          {children ??
            options.map(toOption).map(({ value, label: optionLabel }) => (
              <option key={value} value={value}>
                {optionLabel}
              </option>
            ))}
        </select>

        {/* Chevron sits on top of the native control; clicks must fall through to it. */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          className="pointer-events-none absolute right-2.5 text-nx-text-muted"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
