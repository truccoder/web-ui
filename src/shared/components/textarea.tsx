import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * NO DESIGN-SYSTEM SPEC EXISTS FOR THIS ONE. `components/forms/` ships Input, Select,
 * Checkbox, Radio and Switch — there is no Textarea, and the post composer needs a
 * multiline field. Rather than bend `Input` into something it is not, this mirrors Input's
 * anatomy exactly (same label / hint / error contract, same border, radius, padding and
 * focus ring) and only swaps the control for a `<textarea>`.
 *
 * Flagged as a gap for the design-system owner: a multiline field should be specified
 * upstream, not invented per app. Until then, treat Input as the reference and keep the two
 * in step.
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  /** Helper text below the field. */
  hint?: string;
  /** Error message — replaces the hint and turns the border red. */
  error?: string;
  /** Grows with content instead of scrolling at a fixed height. @default false */
  autoResize?: boolean;
  /**
   * Render the value in Geist Mono at the code size. Mirrors `Input.mono` — added for the
   * code-snippet field, where the content genuinely is code (constitution §7.1: code and
   * metadata are mono). @default false
   */
  mono?: boolean;
}

export function Textarea({
  label,
  hint,
  error,
  autoResize = false,
  mono = false,
  className,
  id,
  disabled,
  rows = 3,
  onChange,
  ...props
}: TextareaProps) {
  const generatedId = React.useId();
  const textareaId = id ?? generatedId;
  const describedById = `${textareaId}-description`;
  const description = error ?? hint;
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const resize = React.useCallback(() => {
    const el = ref.current;
    if (!el || !autoResize) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [autoResize]);

  // Also runs for programmatic value changes (e.g. a reset after submit), which never fire
  // onChange.
  React.useEffect(resize, [resize, props.value]);

  return (
    <div className="flex w-full flex-col gap-2">
      {label && (
        <label
          htmlFor={textareaId}
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
          'flex w-full rounded-nx-sm border bg-nx-surface-raised px-2.5 py-2',
          'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-nx-focus-ring',
          error ? 'border-nx-status-danger' : 'border-nx-border-default',
          disabled && 'pointer-events-none opacity-50',
          className
        )}
      >
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={description ? describedById : undefined}
          onChange={(event) => {
            resize();
            onChange?.(event);
          }}
          className={cn(
            'min-w-0 flex-1 resize-none bg-transparent text-nx-ui text-nx-text-primary outline-none',
            'placeholder:text-nx-text-faint',
            mono && 'font-mono text-nx-code',
            autoResize && 'overflow-hidden'
          )}
          {...props}
        />
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
