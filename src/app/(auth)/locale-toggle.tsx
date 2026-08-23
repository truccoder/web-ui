'use client';

import { Globe } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useI18n } from '@/core/i18n';

/**
 * VI/EN for people who do not have an account yet.
 *
 * THE GAP THIS CLOSES IS FUNCTIONAL, NOT COSMETIC. The only locale control in the product lives in
 * the signed-in rail (`(main)/shell.tsx`), so every screen under `(auth)` — sign in, register,
 * forgot password, magic link, reset, verify — was locked to whatever `LOCALE_COOKIE` already
 * said. A first-time visitor has no cookie, takes the default, and had no way to change it until
 * after they had signed in, which is exactly backwards: the screens a stranger reads are the ones
 * they most need in their own language.
 *
 * IT WRITES THE SAME COOKIE THE RAIL DOES, through the same `setLocale`, so the choice survives
 * into the app rather than being an auth-only preference that resets at the door.
 *
 * THE LABEL NAMES THE DESTINATION, NOT THE CURRENT STATE — it reads `English` while you are in
 * Vietnamese. A control whose label is its current value ("Tiếng Việt") looks like a readout and
 * leaves the reader to guess whether clicking changes it. Naming the target makes the button
 * self-labelling, which is also why it needs no `aria-label`: the visible text IS the name.
 *
 * The two language names are deliberately NOT translated. `English` and `Tiếng Việt` are endonyms
 * — what each language calls itself — and a reader looking for their own language scans for the
 * word they know, not for its translation into a language they may not read.
 */
export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const next = locale === 'vi' ? 'en' : 'vi';

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      className={cn(
        // The rail's own row unit, so this reads as the same kind of control as the toggle it
        // mirrors on the signed-in side.
        'inline-flex min-h-8 items-center gap-2 rounded-nx-sm px-2.5 text-nx-body-sm',
        'text-nx-text-secondary transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
        'hover:bg-nx-surface-hover hover:text-nx-text-primary',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring',
        className
      )}
    >
      <Globe className="size-4 shrink-0" aria-hidden />
      {next === 'en' ? 'English' : 'Tiếng Việt'}
    </button>
  );
}
