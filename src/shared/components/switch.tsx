import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from the design system's `Switch.d.ts` + `Switch.prompt.md` contract and the
 * rendered `forms/forms.card` specimen. No design-system source was read.
 *
 * WHY A SWITCH AND NOT A CHECKBOX HERE — the DS states the rule outright: "On/off toggle for
 * immediate-effect settings (use Checkbox inside forms)", and its own example label is
 * literally `Push notifications`. So this is the right control only where a toggle *applies
 * immediately*. A settings panel with a Save button wants `Checkbox`; if one is ever needed,
 * build it then rather than now (CLAUDE.md §Phase 1.3 — a primitive invented ahead of its
 * caller is usually the wrong shape).
 *
 * Geometry read off the rendered specimen, which is plain data: track 32×18 with a full
 * radius, knob 14×14 white circle inset 2px, travelling 14px. Off-track is `#c8cdd3`, which is
 * `--nx-gray-300` — i.e. `--nx-border-strong`, so naming the semantic token rather than the
 * grey gets dark mode right for free (there it remaps to gray-700). On-track is the accent.
 * Both transitions are 200ms = `--nx-duration-base`; the specimen animates background on the
 * track and transform on the knob, and nothing else.
 *
 * A REAL `<input type="checkbox">` UNDERNEATH: `role="switch"` on the input keeps the on/off
 * semantic while the platform supplies focus, space-to-toggle, form association and the
 * label/`htmlFor` relationship. It is `sr-only`, not `display:none`, so it stays focusable and
 * the focus ring is drawn on the track through `peer-focus-visible`.
 */
export interface SwitchProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'type' | 'size'
> {
  label?: React.ReactNode;
  /** Secondary line under the label, for the "what does this actually do" sentence. */
  description?: React.ReactNode;
  /** `(next, event)` — the new state first, per the DS prop contract. */
  onChange?: (next: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Switch({
  label,
  description,
  className,
  disabled,
  onChange,
  id,
  ...props
}: SwitchProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn('flex items-start gap-2.5', disabled && 'opacity-50', className)}>
      <input
        type="checkbox"
        role="switch"
        id={inputId}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked, event)}
        className="peer sr-only"
        {...props}
      />

      <label
        htmlFor={inputId}
        aria-hidden
        className={cn(
          // `mt-0.5` keeps the track optically centred on the first line of the label when a
          // description wraps a second line under it.
          // R10 §3.2 EXCEPTION, and the note directly above is the reason: this is a
          // correction on the CONTROL, aligning it to the first line of a label that may
          // wrap — not a gap between two things read separately.
          // eslint-disable-next-line no-restricted-syntax -- optical alignment of the control
          'relative mt-0.5 block h-4.5 w-8 shrink-0 rounded-nx-full',
          'bg-nx-border-strong',
          'transition-colors duration-[var(--nx-duration-base)] ease-nx-out',
          'peer-checked:bg-nx-accent',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
          'peer-focus-visible:outline-nx-focus-ring',
          // The knob is a child of this label rather than a sibling of the input, so
          // `peer-checked` has to be stacked with a child selector to reach it.
          'peer-checked:[&>span]:translate-x-3.5',
          !disabled && 'cursor-pointer'
        )}
      >
        <span
          className={cn(
            'absolute inset-0.5 size-3.5 rounded-nx-full bg-white',
            'transition-transform duration-[var(--nx-duration-base)] ease-nx-out'
          )}
        />
      </label>

      {/* `tight` 8 ON THE WRAPPER, not `mt-0.5` on the description — R10 §3.2, report §9. Two
          readings inside one control (what it is, and what it does) are a rung, and a component
          declares a rung with `gap` rather than by pushing its second child down. The wrapper
          holds exactly these two, so the gap lands on nothing else. */}
      {(label || description) && (
        <div className="flex min-w-0 flex-col gap-[var(--nx-space-tight)]">
          {label && (
            <label
              htmlFor={inputId}
              className={cn('block text-nx-ui text-nx-text-primary', !disabled && 'cursor-pointer')}
            >
              {label}
            </label>
          )}
          {description && <p className="text-nx-body-sm text-nx-text-secondary">{description}</p>}
        </div>
      )}
    </div>
  );
}
