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
 * R15 SURFACE MOVE: the field sits on `surface-raised`, not `surface-card`. In light the two
 * resolve to the same white, so nothing changes; in dark `raised` is gray-700 against a gray-800
 * card, which is the whole point — a field inside a card has to be a step ABOVE it, and under the
 * old dark values (card 900, raised 800) that step was being spent just to clear the card. The
 * same one-line change applies to Textarea, Select and Radio; they are one family and the spec
 * gives them one anatomy.
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
  /** Helper text below the field. */
  hint?: string;
  /** Error message — replaces the hint and turns the border red. */
  error?: string;
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Leading adornment (icon). */
  prefix?: React.ReactNode;
  /** Trailing adornment (icon). DECORATIVE — it is rendered `aria-hidden`. */
  suffix?: React.ReactNode;
  /**
   * Trailing slot for something you can OPERATE — a reveal toggle, a clear button, a unit picker.
   *
   * IT EXISTS BECAUSE `suffix` IS `aria-hidden` AND MUST STAY THAT WAY. Every current caller puts
   * an icon there, and an icon beside a labelled field is decoration a screen reader should not
   * read. But `aria-hidden` on a subtree containing a focusable control is an actual violation
   * rather than a preference: the control keeps its place in the tab order and is announced as
   * nothing when it gets there. So the two cases get two slots instead of one slot with a flag,
   * and the wrapper here carries no `aria-hidden` at all.
   *
   * Renders after `suffix` when both are given.
   */
  suffixAction?: React.ReactNode;
  /** Render the value in Geist Mono (tokens, handles, URLs). @default false */
  mono?: boolean;
  /**
   * Forwarded to the `<input>`, not to the wrapper.
   *
   * A plain prop rather than `forwardRef`, which React 19 made unnecessary. Added when the shell's
   * search field needed it: Escape blurs the field and clearing it returns focus, and neither is
   * expressible without a handle on the element.
   */
  ref?: React.Ref<HTMLInputElement>;
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
  suffixAction,
  mono = false,
  className,
  wrapperClassName,
  id,
  disabled,
  ref,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const describedById = `${inputId}-description`;
  // Error replaces the hint rather than stacking, per the prop contract.
  const description = error ?? hint;

  return (
    <div className={cn('flex w-full flex-col gap-2', wrapperClassName)}>
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
          'flex w-full items-center gap-2 rounded-nx-sm border bg-nx-surface-raised px-2.5',
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
          ref={ref}
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

        {suffixAction && <span className="flex shrink-0 items-center">{suffixAction}</span>}
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
