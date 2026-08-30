import { describe, expect, it } from 'vitest';
import { EXPIRY_WARNING_DAYS, tokenExpiry } from './token-expiry';

/**
 * The boundaries ARE the behaviour here, and they decide whether someone is told a credential is
 * dead. `now` is a parameter precisely so a case sitting one second either side of a boundary is
 * an ordinary assertion rather than a clock to fake — same reasoning as `relativeTimeOf` in
 * `shared/lib/format.ts`.
 */
const NOW = Date.parse('2026-08-28T12:00:00Z');
const inDays = (days: number) => new Date(NOW + days * 24 * 60 * 60 * 1000).toISOString();

describe('tokenExpiry', () => {
  it('treats a missing expiry as a token that never expires', () => {
    expect(tokenExpiry(null, NOW)).toEqual({ kind: 'never' });
    expect(tokenExpiry(undefined, NOW)).toEqual({ kind: 'never' });
  });

  it('falls back to "never" on an unparseable timestamp', () => {
    // Marking a working token dead — and telling the user to revoke it — is the worse of the two
    // mistakes available here.
    expect(tokenExpiry('not a date', NOW)).toEqual({ kind: 'never' });
  });

  it('reports a past expiry as expired', () => {
    expect(tokenExpiry(inDays(-1), NOW)).toEqual({ kind: 'expired' });
  });

  it('counts the exact expiry instant as already expired', () => {
    expect(tokenExpiry(new Date(NOW).toISOString(), NOW)).toEqual({ kind: 'expired' });
  });

  it('says "today" for anything inside the last day rather than "in 0 days"', () => {
    expect(tokenExpiry(inDays(0.5), NOW)).toEqual({ kind: 'today' });
  });

  it('rounds up, so eleven hours left is a day and not zero', () => {
    expect(tokenExpiry(inDays(1.5), NOW)).toEqual({ kind: 'soon', days: 2 });
  });

  it('warns up to and including the threshold', () => {
    expect(tokenExpiry(inDays(EXPIRY_WARNING_DAYS), NOW)).toEqual({
      kind: 'soon',
      days: EXPIRY_WARNING_DAYS,
    });
  });

  it('stops warning one day past the threshold', () => {
    expect(tokenExpiry(inDays(EXPIRY_WARNING_DAYS + 1), NOW)).toEqual({
      kind: 'active',
      days: EXPIRY_WARNING_DAYS + 1,
    });
  });
});
