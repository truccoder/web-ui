'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from '@/shared/components';
import { useT } from '@/core/i18n';

/**
 * A password field with a reveal toggle.
 *
 * WHY IT IS A COMPONENT AND NOT TWO LINES IN EACH FORM: the toggle has three details that are
 * easy to get wrong once and impossible to get wrong twice, and there are four password fields in
 * this feature.
 *
 *  - It flips `type`, not a CSS mask. A masked-by-CSS field still hands the plain value to any
 *    autofill or extension reading the DOM, and reads as text to a screen reader either way.
 *  - It rides `suffixAction`, not `suffix`. `suffix` is rendered `aria-hidden` for decorative
 *    icons; a focusable control inside an `aria-hidden` subtree stays in the tab order and is
 *    announced as nothing when it gets there. `Input`'s own note carries the longer version.
 *  - It carries `aria-pressed` and a label that names the NEXT state, so the control announces
 *    what it will do rather than what it currently is.
 *
 * The button is deliberately NOT in the tab order's way of the submit: it comes after the field
 * it belongs to, which is where a keyboard reader expects the field's own affordance.
 */
export type PasswordInputProps = Omit<InputProps, 'type' | 'suffixAction'>;

export function PasswordInput(props: PasswordInputProps) {
  const t = useT();
  const [revealed, setRevealed] = useState(false);

  const Icon = revealed ? EyeOff : Eye;

  return (
    <Input
      {...props}
      type={revealed ? 'text' : 'password'}
      suffixAction={
        <button
          type="button"
          onClick={() => setRevealed((value) => !value)}
          aria-pressed={revealed}
          aria-label={revealed ? t('auth.passwordHide') : t('auth.passwordShow')}
          className="grid size-5 place-items-center rounded-nx-xs text-nx-text-muted transition-colors duration-[var(--nx-duration-fast)] ease-nx-out hover:text-nx-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
        >
          <Icon className="size-4" aria-hidden />
        </button>
      }
    />
  );
}
