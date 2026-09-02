import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatMonthYear,
  formatPriceParts,
  relativeTimeOf,
} from './format';

/**
 * WHAT THESE ASSERT, AND WHAT THEY DELIBERATELY DO NOT.
 *
 * `format.ts` exists to fix two bugs it names: output in the runtime's locale instead of the
 * app's, and a hydration mismatch when Node and the browser disagree on that default. Both are
 * properties of THIS code — that the locale is passed through, and that the same input gives the
 * same output — so both are asserted below.
 *
 * The exact wording is NOT asserted for dates. `24 thg 8, 2026` is CLDR data: it belongs to
 * whichever ICU the runtime shipped with, it changes between Node versions, and a test that
 * pinned it would fail on an upgrade while the code was still correct. The clock-dependent forms
 * would also have to pin a timezone to be meaningful at all.
 *
 * Prices are the exception, and they are asserted to the character. `formatPriceParts` is not
 * reporting what Intl said — it SPLITS the result and REWRITES the symbol, because `₫` has no
 * glyph in Geist and rendered off the baseline on every priced book. That substitution is ours.
 */

/** Noon UTC: the same calendar day in every timezone the app could plausibly run in. */
const NOON_UTC = '2026-08-24T12:00:00.000Z';

describe('formatDateTime / formatDate / formatMonthYear', () => {
  const formatters = [
    ['formatDateTime', formatDateTime],
    ['formatDate', formatDate],
    ['formatMonthYear', formatMonthYear],
  ] as const;

  describe.each(formatters)('%s', (_name, format) => {
    it('returns null for an absent timestamp', () => {
      expect(format(undefined, 'vi-VN')).toBeNull();
    });

    it('returns null for an unparseable timestamp rather than "Invalid Date"', () => {
      expect(format('not-a-date', 'vi-VN')).toBeNull();
      expect(format('', 'vi-VN')).toBeNull();
    });

    /** Bug 1: the UI showed `7/29/2026, 12:49:55 PM` inside a Vietnamese interface. */
    it('produces different output per locale, so the tag is actually used', () => {
      expect(format(NOON_UTC, 'vi-VN')).not.toBe(format(NOON_UTC, 'en-US'));
    });

    /** Bug 2: server and client must agree, or React throws the tree away. */
    it('is deterministic for the same input', () => {
      expect(format(NOON_UTC, 'vi-VN')).toBe(format(NOON_UTC, 'vi-VN'));
    });

    it('names the year', () => {
      expect(format(NOON_UTC, 'vi-VN')).toContain('2026');
      expect(format(NOON_UTC, 'en-US')).toContain('2026');
    });
  });

  it('formatDate carries the day where formatMonthYear drops it', () => {
    expect(formatDate(NOON_UTC, 'en-US')).toContain('24');
    expect(formatMonthYear(NOON_UTC, 'en-US')).not.toContain('24');
  });

  /** Seconds are dropped everywhere — a timestamp to the second is noise. */
  it('formatDateTime carries a time and formatDate does not', () => {
    expect(formatDateTime(NOON_UTC, 'en-US')).toMatch(/\d{1,2}:\d{2}/);
    expect(formatDate(NOON_UTC, 'en-US')).not.toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('formatCurrency', () => {
  /**
   * `₫` (U+20AB) has no glyph in Geist, so it fell back mid-string and sat off the baseline.
   * `đ` (U+0111) is in the Vietnamese subset the product already loads.
   */
  it('never emits the dong sign that has no glyph', () => {
    for (const tag of ['vi-VN', 'en-US']) {
      const out = formatCurrency(120_000, 'VND', tag);
      expect(out).not.toContain('₫');
      expect(out).toContain('đ');
    }
  });

  it('formats a whole-currency amount without inventing minor units', () => {
    expect(formatCurrency(120_000, 'VND', 'vi-VN')).toContain('120.000');
    expect(formatCurrency(120_000, 'VND', 'en-US')).toContain('120,000');
  });

  /** An unknown code makes Intl throw rather than degrade, so the catch branch must hold. */
  it('falls back to the plain number plus the code for an unknown currency', () => {
    expect(formatCurrency(1500, 'NOTACODE', 'en-US')).toBe('1,500 NOTACODE');
  });

  it('handles zero', () => {
    expect(formatCurrency(0, 'VND', 'vi-VN')).toContain('0');
  });
});

describe('formatPriceParts', () => {
  /**
   * The split exists so the DIGITS can be set in mono and the CURRENCY MARK cannot — the design
   * system reserves mono for numbers, ids and slugs, and a currency mark is none of those.
   */
  it('separates the symbol from the digits for a trailing-symbol locale', () => {
    expect(formatPriceParts(120_000, 'VND', 'vi-VN')).toEqual({
      amount: '120.000',
      symbol: 'đ',
    });
  });

  /** `formatToParts` rather than a regex, because symbol placement is a locale decision. */
  it('separates the symbol from the digits for a leading-symbol locale', () => {
    expect(formatPriceParts(120_000, 'VND', 'en-US')).toEqual({
      amount: '120,000',
      symbol: 'đ',
    });
  });

  it('leaves a symbol that does have a glyph alone', () => {
    expect(formatPriceParts(1500, 'USD', 'en-US')).toEqual({ amount: '1,500.00', symbol: '$' });
  });

  it('returns a trimmed amount, so the separator literal never leads or trails', () => {
    const { amount } = formatPriceParts(120_000, 'VND', 'vi-VN');
    expect(amount).toBe(amount.trim());
  });

  it('falls back to the number and the code for an unknown currency', () => {
    expect(formatPriceParts(1500, 'NOTACODE', 'en-US')).toEqual({
      amount: '1,500',
      symbol: 'NOTACODE',
    });
  });
});

describe('relativeTimeOf', () => {
  /** A fixed `now` is the point of the split — no clock to fake, no renderer to mount. */
  const NOW = Date.parse('2026-08-24T12:00:00.000Z');
  const ago = (ms: number) => new Date(NOW - ms).toISOString();

  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  it('reports an unparseable timestamp rather than rendering one', () => {
    expect(relativeTimeOf('not-a-date', NOW)).toEqual({ kind: 'invalid' });
  });

  it('calls anything under a minute "just now"', () => {
    expect(relativeTimeOf(ago(0), NOW)).toEqual({ kind: 'relative', key: 'time.justNow' });
    expect(relativeTimeOf(ago(59 * SECOND), NOW)).toEqual({
      kind: 'relative',
      key: 'time.justNow',
    });
  });

  it('switches to minutes at exactly one minute', () => {
    expect(relativeTimeOf(ago(60 * SECOND), NOW)).toEqual({
      kind: 'relative',
      key: 'time.minutesAgo',
      vars: { minutes: 1 },
    });
  });

  it('switches to hours at exactly one hour, not at fifty-nine minutes', () => {
    expect(relativeTimeOf(ago(59 * MINUTE), NOW)).toMatchObject({ key: 'time.minutesAgo' });
    expect(relativeTimeOf(ago(HOUR), NOW)).toEqual({
      kind: 'relative',
      key: 'time.hoursAgo',
      vars: { hours: 1 },
    });
  });

  it('switches to days at exactly twenty-four hours', () => {
    expect(relativeTimeOf(ago(23 * HOUR), NOW)).toMatchObject({ key: 'time.hoursAgo' });
    expect(relativeTimeOf(ago(DAY), NOW)).toEqual({
      kind: 'relative',
      key: 'time.daysAgo',
      vars: { days: 1 },
    });
  });

  /** Past a week the caller falls back to `formatDate`. */
  it('gives up on a relative label at exactly seven days', () => {
    expect(relativeTimeOf(ago(6 * DAY), NOW)).toMatchObject({ key: 'time.daysAgo' });
    expect(relativeTimeOf(ago(7 * DAY), NOW)).toEqual({ kind: 'absolute' });
    expect(relativeTimeOf(ago(365 * DAY), NOW)).toEqual({ kind: 'absolute' });
  });

  /**
   * Clock skew between the browser and the server puts timestamps slightly in the future.
   * `seconds` goes negative, which is still `< 60`, so it reads as "just now" — the right answer.
   */
  it('treats a timestamp from the near future as just now', () => {
    expect(relativeTimeOf(new Date(NOW + 30 * SECOND).toISOString(), NOW)).toEqual({
      kind: 'relative',
      key: 'time.justNow',
    });
  });
});
