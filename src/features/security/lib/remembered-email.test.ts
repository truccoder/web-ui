import { describe, expect, it } from 'vitest';
import { parseRememberedEmail } from './remembered-email';

/**
 * THE PART OF THIS MODULE THAT MEETS INPUT NOBODY HERE WROTE.
 *
 * `parseRememberedEmail` reads `localStorage`, which any script on this origin can write and which
 * outlives every version of this code, so it must treat its own storage as untrusted — whatever
 * comes back is about to be dropped into the sign-in form's email field.
 *
 * The store's two other functions are one `setItem` and one `removeItem` and need a real
 * `Storage`; this suite runs in `environment: 'node'` on purpose (see `vitest.config.mts`).
 */

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

const stored = (email: unknown, savedAt: unknown) => JSON.stringify({ email, savedAt });

describe('parseRememberedEmail', () => {
  it('returns nothing for empty or malformed storage', () => {
    expect(parseRememberedEmail(null, NOW)).toBeNull();
    expect(parseRememberedEmail('', NOW)).toBeNull();
    expect(parseRememberedEmail('{not json', NOW)).toBeNull();
    expect(parseRememberedEmail('"a string"', NOW)).toBeNull();
    expect(parseRememberedEmail('null', NOW)).toBeNull();
  });

  it('rejects an entry missing either field, or with the wrong type', () => {
    expect(parseRememberedEmail(stored('me@example.com', undefined), NOW)).toBeNull();
    expect(parseRememberedEmail(stored(undefined, NOW), NOW)).toBeNull();
    expect(parseRememberedEmail(stored(42, NOW), NOW)).toBeNull();
    expect(parseRememberedEmail(stored('me@example.com', '2026-08-28'), NOW)).toBeNull();
  });

  it('rejects text that is not an address, so the email field never opens holding junk', () => {
    expect(parseRememberedEmail(stored('not-an-email', NOW), NOW)).toBeNull();
    expect(parseRememberedEmail(stored(`${'a'.repeat(300)}@example.com`, NOW), NOW)).toBeNull();
  });

  it('returns a fresh address', () => {
    expect(parseRememberedEmail(stored('me@example.com', NOW), NOW)).toBe('me@example.com');
    expect(parseRememberedEmail(stored('me@example.com', NOW - DAY / 2), NOW)).toBe(
      'me@example.com'
    );
  });

  it('forgets one older than the window, so a shared machine stops naming someone', () => {
    expect(parseRememberedEmail(stored('me@example.com', NOW - DAY), NOW)).toBeNull();
    expect(parseRememberedEmail(stored('me@example.com', NOW - 3 * DAY), NOW)).toBeNull();
  });
});
