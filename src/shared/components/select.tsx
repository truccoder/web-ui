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
  /**
   * Sizing for the OUTER wrapper — the label and the field together.
   *
   * `className` lands on the field box, not on this, and the wrapper was hardcoded `w-full`.
   * So a caller putting three of these in a `flex` row and sizing each with `className` got
   * three full-width wrappers and three stacked lines instead: measured on the moderation
   * queue's filter bar, where `w-32 / w-32 / w-52` produced three rows and pushed the queue
   * itself below the fold.
   *
   * Still `w-full` when unset, so nothing that already works changes; `tailwind-merge` lets a
   * width passed here win over that default.
   */
  wrapperClassName?: string;
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
  wrapperClassName,
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
    <div className={cn('flex w-full flex-col gap-2', wrapperClassName)}>
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
            // `pr-8` (32) off-ladder on purpose — clearance for the chevron drawn over the
            // field, same class of value as search-bar's `pr-9`. Not a rung, a footprint.
            // eslint-disable-next-line no-restricted-syntax -- footprint, not a rung (see above)
            'py-0 pl-2.5 pr-8 text-nx-text-primary',
            'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
            // AN INSET RING (matches `Tabs`). This select is dropped into scroll containers —
            // the composer's `overflow-y-auto` dialog body among them — and `overflow-y: auto`
            // forces the computed `overflow-x` to `auto` too, so an outset ring on a 34px-tall
            // field flush against the padding edge is clipped on the near sides. Offset inward
            // and the whole ring stays on-screen wherever the field sits.
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring',
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

        {/* CHEVRON SITS ON TOP OF THE NATIVE CONTROL; clicks must fall through to it.
            IT IS POSITIONED AGAINST THIS WRAPPER, WHICH IS WHY WIDTH MUST NOT BE SET THROUGH
            `className`. `className` lands on the `<select>`; the wrapper stays as wide as its
            column. A caller that shrinks the field with `className="w-auto"` therefore leaves the
            arrow floating at the far right of the row with nothing under it — reported on the
            composer's language and visibility pickers, where the arrow sat outside the box. Size
            the WRAPPER (`wrapperClassName`) and the two move together. */}
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
