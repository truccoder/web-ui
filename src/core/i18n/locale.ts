/**
 * Locale primitives that must be readable from BOTH sides of the RSC boundary.
 *
 * This file deliberately has no `'use client'` and imports nothing: the root layout (a server
 * component) reads the cookie here, and `context.tsx` (a client component) writes it. Putting
 * the cookie name or the guard in `context.tsx` would drag a client module into server render
 * just to read a string constant.
 *
 * WHY A COOKIE AND NOT `localStorage` — fixed at P5.3, do not move it back. The locale is read
 * during SSR, and the server cannot see `localStorage`. While it lived there, the server always
 * rendered `vi` (the default) and the client hydrated with whatever was saved, so every user who
 * picked English got a hydration mismatch on *every* page — any translated string in SSR markup
 * is enough to trigger it. The app already uses cookies for `session` and `role` for the same
 * class of reason (the edge middleware cannot read `localStorage` either).
 */

export type Locale = 'en' | 'vi';

export const LOCALE_COOKIE = 'app_locale';

export const DEFAULT_LOCALE: Locale = 'vi';

/** One year: a language choice should outlive a browsing session. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'en' || value === 'vi';
}
