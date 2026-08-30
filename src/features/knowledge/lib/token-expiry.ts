/**
 * Reading `expiresAt` off a personal access token.
 *
 * WHY THIS EXISTS AT ALL: `PersonalAccessTokenResponseDto` has carried `expiresAt` from the start
 * and the list screen never read it, so an expired token rendered identically to a live one. The
 * user's plugin would be failing authentication ({@code BadCredentialsException("Token expired")})
 * while the page it came from showed nothing wrong — and "Never used" beside it, which reads as
 * "this was never set up" rather than "this stopped working".
 *
 * Pure functions taking `now` explicitly rather than calling `Date.now()` inside: the same input
 * has to produce the same output during server render and during hydration, and a clock read in
 * two runtimes does not.
 */

export type TokenExpiry =
  | { kind: 'never' }
  | { kind: 'expired' }
  /** Same day — "in 0 days" is a worse sentence than "today", and it is the urgent case. */
  | { kind: 'today' }
  | { kind: 'soon'; days: number }
  | { kind: 'active'; days: number };

/** Below this, the row earns a warning badge rather than a quiet line of text. */
export const EXPIRY_WARNING_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export function tokenExpiry(expiresAt: string | null | undefined, now: number): TokenExpiry {
  if (!expiresAt) return { kind: 'never' };

  const at = new Date(expiresAt).getTime();
  // An unparseable timestamp is treated as "no expiry" rather than "expired": marking a working
  // token dead, and telling the user to revoke it, is the worse of the two mistakes.
  if (Number.isNaN(at)) return { kind: 'never' };

  const remaining = at - now;
  if (remaining <= 0) return { kind: 'expired' };

  // Rounded UP, so a token with eleven hours left says "1 day" rather than "0 days". Rounding
  // down would print "expires in 0 days" for something still perfectly usable.
  const days = Math.ceil(remaining / DAY_MS);
  if (days <= 1) return { kind: 'today' };
  return days <= EXPIRY_WARNING_DAYS ? { kind: 'soon', days } : { kind: 'active', days };
}
