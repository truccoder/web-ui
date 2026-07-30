import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from the design system's `Radio.d.ts` + `Radio.prompt.md` contract and the
 * rendered `forms/forms.card` specimen. No design-system source was read.
 *
 * The specimen renders a 16px circle: unchecked is the card surface behind a `border-default`
 * hairline; checked fills with the accent blue and punches a white dot through the middle. The
 * label sits 8px to its right at the UI size, regular weight — deliberately lighter than
 * `Input`'s `font-medium` field label, because a radio's label names an option, not a field.
 *
 * WHY A REAL `<input type="radio">` UNDERNEATH: grouping, arrow-key roving focus and the
 * "one of many" semantic all come free from the platform once options share a `name`. A
 * div-with-role reimplements those and gets them subtly wrong. The input is visually hidden
 * (`sr-only`) rather than `display:none`, so it stays focusable and the ring is drawn on the
 * circle via `peer-focus-visible`.
 *
 * `onChange` reports the option's `value` first, per the DS prop contract, with the raw event
 * second for callers that need it.
 */
export interface RadioProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'type' | 'size'
> {
  label?: React.ReactNode;
  onChange?: (value: string | undefined, event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Radio({ label, className, disabled, onChange, id, ...props }: RadioProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn('flex items-center gap-2', disabled && 'opacity-50', className)}>
      <input
        type="radio"
        id={inputId}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value || undefined, event)}
        className="peer sr-only"
        {...props}
      />

      <label
        htmlFor={inputId}
        aria-hidden
        className={cn(
          'relative grid size-4 shrink-0 place-items-center rounded-nx-full border',
          'border-nx-border-default bg-nx-surface-card',
          'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
          'peer-checked:border-nx-accent peer-checked:bg-nx-accent',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
          'peer-focus-visible:outline-nx-focus-ring',
          // The dot is a child of this label, not a sibling of the input, so `peer-checked`
          // has to be stacked with a child selector to reach it.
          'peer-checked:[&>span]:opacity-100',
          !disabled && 'cursor-pointer'
        )}
      >
        {/* The inner dot appears on check without animating in — the constitution's motion set
            has no scale, so it fades or it does nothing. */}
        <span className="size-1.5 rounded-nx-full bg-nx-surface-card opacity-0 transition-opacity duration-[var(--nx-duration-fast)]" />
      </label>

      {label && (
        <label
          htmlFor={inputId}
          className={cn('text-nx-ui text-nx-text-primary', !disabled && 'cursor-pointer')}
        >
          {label}
        </label>
      )}
    </div>
  );
}
