'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/core/i18n';

/**
 * The way back out of the auth screens.
 *
 * EVERY ROUTE UNDER `(auth)` WAS A DEAD END. Sign in, register, forgot password, magic link,
 * reset and verify each render one card and nothing else: the only links off them go to *other*
 * auth routes. A visitor who arrived from the feed — which `middleware.ts` opens to guests at
 * `/`, `/newsfeed`, `/posts`, `/u` and `/trending` — and then clicked "Sign in" out of curiosity
 * had no control on the page that took them back to reading. Browser Back was it, and Back is not
 * an affordance the page owns.
 *
 * IT POINTS AT `/newsfeed`, NOT AT `/`. Root is a server `redirect()` to the feed (`app/page.tsx`)
 * so both land in the same place, but `/` costs an extra round trip to learn that — and every
 * other in-product "home" link (`not-found`, both `error` boundaries, the mobile drawer's brand)
 * already names `/newsfeed` directly. One destination, spelled the same way everywhere.
 *
 * ARROW PLUS WORD, NOT A BARE GLYPH. A lone chevron in a corner is a guess: back to the previous
 * page, back to the top, close? The arrow carries "back" and the word carries "to where", which
 * is the same division of labour the post permalink's own back-link uses. It also means the link
 * needs no `aria-label` — the visible text IS the name.
 *
 * THE CLASSES ARE `LocaleToggle`'S, deliberately. The two sit in opposite corners of the same
 * column, and a matched pair of controls that were styled independently would drift a rung apart
 * on the next edit to either one.
 */
export function HomeLink({ className }: { className?: string }) {
  const t = useT();

  return (
    <Link
      href="/newsfeed"
      className={cn(
        'inline-flex min-h-8 items-center gap-2 rounded-nx-sm px-2.5 text-nx-body-sm',
        'text-nx-text-secondary transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
        'hover:bg-nx-surface-hover hover:text-nx-text-primary',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring',
        className
      )}
    >
      <ArrowLeft className="size-4 shrink-0" aria-hidden />
      {t('auth.backHome')}
    </Link>
  );
}
