'use client';

import { useI18n } from '@/lib/i18n';

/**
 * Locale-aware formatting for the post surfaces.
 *
 * TWO BUGS THIS EXISTS TO FIX, both found by actually looking at the rendered page:
 *
 * 1. WRONG LOCALE. `toLocaleString()` with no argument uses the *runtime's* locale, not the
 *    app's. The UI was showing `7/29/2026, 12:49:55 PM` inside a Vietnamese interface,
 *    because the browser's default is en-US and nothing connected it to the language the
 *    user actually picked.
 *
 * 2. HYDRATION MISMATCH. The same call runs once in Node and once in the browser, and those
 *    two runtimes do not have to agree on a default locale — so the server HTML and the
 *    client render can differ and React throws away the tree. Passing the locale explicitly
 *    makes the output deterministic on both sides.
 *
 * Seconds are dropped everywhere: a post timestamp or an event start to the second is noise,
 * and it also made the mismatch above louder than it needed to be.
 *
 * Lives in `features/posts` because posts is the only consumer today. Promote it to
 * `shared/` the moment a second domain needs the same thing — not before (CLAUDE.md §4:
 * `shared/` is for things that are genuinely shared, not things that might be).
 */

/** App locale → BCP-47 tag. */
const LOCALE_TAG: Record<string, string> = {
  vi: 'vi-VN',
  en: 'en-US',
};

export function useIntlLocale(): string {
  const { locale } = useI18n();
  return LOCALE_TAG[locale] ?? 'en-US';
}

/** Date + time, no seconds. */
export function formatDateTime(iso: string | undefined, localeTag: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(localeTag, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Date only — the fallback once a post is too old for a relative label. */
export function formatDate(iso: string | undefined, localeTag: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(localeTag, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * `price` is a whole-currency amount (`Long`, backend default VND — no minor units).
 * An unknown currency code makes `Intl` throw rather than degrade, so fall back to the
 * plain number plus the code.
 */
export function formatCurrency(price: number, currency: string, localeTag: string): string {
  try {
    return new Intl.NumberFormat(localeTag, { style: 'currency', currency }).format(price);
  } catch {
    return `${price.toLocaleString(localeTag)} ${currency}`;
  }
}
