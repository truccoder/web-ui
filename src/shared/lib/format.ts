'use client';

import { useI18n, useT } from '@/core/i18n';

/**
 * Locale-aware formatting, shared.
 *
 * PROMOTED FROM `features/posts/lib/format.ts` AT P2.6cd, on the condition that file wrote for
 * itself: "Promote it to `shared/` the moment a second domain needs the same thing — not
 * before." `features/notifications` is that second domain — a notification row shows the same
 * "2 giờ trước" label a post header does — and a date formatter names no domain concept, so
 * `shared/` is where it belongs rather than a second copy (CLAUDE.md §4).
 *
 * TWO BUGS THIS EXISTS TO FIX, both found by actually looking at the rendered page and neither
 * of them obvious from reading the code:
 *
 * 1. WRONG LOCALE. `toLocaleString()` with no argument uses the *runtime's* locale, not the
 *    app's. The UI was showing `7/29/2026, 12:49:55 PM` inside a Vietnamese interface, because
 *    the browser's default is en-US and nothing connected it to the language the user picked.
 *
 * 2. HYDRATION MISMATCH. The same call runs once in Node and once in the browser, and those two
 *    runtimes do not have to agree on a default locale — so the server HTML and the client
 *    render can differ and React throws away the tree. Passing the locale explicitly makes the
 *    output deterministic on both sides.
 *
 * Seconds are dropped everywhere: a timestamp to the second is noise, and it also made the
 * mismatch above louder than it needed to be.
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

/** Date only — the fallback once a timestamp is too old for a relative label. */
export function formatDate(iso: string | undefined, localeTag: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(localeTag, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Month and year only — for facts whose day is noise.
 *
 * "Joined" is the case this exists for: nobody reads a profile to learn that somebody signed up on
 * a Tuesday, and `formatDate` would print `24 thg 8, 2026` where `tháng 8 năm 2026` is the whole
 * fact. `month: 'long'` rather than `'short'` because at this length the abbreviation saves three
 * characters and costs the reader a pause.
 */
export function formatMonthYear(iso: string | undefined, localeTag: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(localeTag, { year: 'numeric', month: 'long' });
}

/**
 * `price` is a whole-currency amount (`Long`, backend default VND — no minor units).
 * An unknown currency code makes `Intl` throw rather than degrade, so fall back to the plain
 * number plus the code.
 */
/**
 * `₫` (₫) HAS NO GLYPH IN GEIST, so every price fell back mid-string to whatever the system
 * offered and the symbol sat off the baseline. Measured, not guessed: in the live document the
 * character renders 20.51px wide in BOTH `Geist` and `Geist Mono` — identical widths for a
 * proportional and a monospaced face is the signature of a shared fallback — while a real Geist
 * glyph like `A` measures 26.72.
 *
 * `đ` (U+0111) is in the Vietnamese subset the product already loads, so it draws natively and
 * sits where it should. It is also what Vietnamese interfaces overwhelmingly print.
 */
function withDongGlyph(value: string): string {
  return value.replace(/₫/g, 'đ');
}

export function formatCurrency(price: number, currency: string, localeTag: string): string {
  try {
    return withDongGlyph(
      new Intl.NumberFormat(localeTag, { style: 'currency', currency }).format(price)
    );
  } catch {
    return `${price.toLocaleString(localeTag)} ${currency}`;
  }
}

/**
 * The same price, split so the DIGITS can be set in mono and the CURRENCY MARK cannot.
 *
 * `₫` has no glyph in Geist Mono. Setting the whole formatted string in mono made the browser
 * fall back mid-string to a face with different metrics, and the symbol rendered a few pixels
 * above the baseline — visible on every priced book in the shelf. The design system already
 * forbids the arrangement that caused it: mono is for numbers, ids and slugs, and a currency
 * mark is none of those.
 *
 * `formatToParts` rather than a regex over the formatted string, because where the symbol sits
 * and what separates it from the digits are locale decisions — `vi-VN` trails it, `en-US`
 * leads with `$`, and neither is ours to hardcode.
 */
export function formatPriceParts(
  price: number,
  currency: string,
  localeTag: string
): { amount: string; symbol: string } {
  try {
    const parts = new Intl.NumberFormat(localeTag, { style: 'currency', currency }).formatToParts(
      price
    );
    const symbol = withDongGlyph(
      parts
        .filter((part) => part.type === 'currency')
        .map((part) => part.value)
        .join('')
    );
    const amount = parts
      .filter((part) => part.type !== 'currency')
      .map((part) => part.value)
      .join('')
      .trim();
    return { amount, symbol };
  } catch {
    return { amount: price.toLocaleString(localeTag), symbol: currency };
  }
}

/**
 * "Vừa xong" / "5 phút trước" / …, falling back to an absolute date after a week.
 *
 * ALSO PROMOTED AT P2.6cd, from a local helper in `PostCard` that said the same thing about
 * itself. Its i18n keys moved with it, from `post.*` to `time.*`: a label under `post.` read by
 * a notification row would be a domain name on a domain-agnostic string, and the next person
 * grepping `post.` would not expect to find the bell using it.
 *
 * NOT MEMOISED AND NOT REACTIVE. The returned function reads `Date.now()` when it is called, so
 * a label only refreshes when its component re-renders. That is deliberate — a ticking clock on
 * every row costs a re-render per second for a value nobody watches — but it does mean a page
 * left open shows stale relative times until something else re-renders it.
 */
export function useRelativeTime() {
  const t = useT();
  const localeTag = useIntlLocale();

  return (iso: string): string => {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';

    const seconds = Math.floor((Date.now() - then) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return t('time.justNow');
    if (minutes < 60) return t('time.minutesAgo', { minutes });
    if (hours < 24) return t('time.hoursAgo', { hours });
    if (days < 7) return t('time.daysAgo', { days });
    return formatDate(iso, localeTag) ?? '';
  };
}
