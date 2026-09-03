/**
 * Whether a `?next=` value may be navigated to.
 *
 * A REDIRECT TARGET OUT OF A QUERY STRING IS AN OPEN REDIRECT IF ANYONE TRUSTS IT.
 * `?next=https://evil.example/login` on a link that looks like this app's own sign-in page is the
 * classic phishing shape, and `//evil.example` is the same attack spelled as a protocol-relative
 * URL — so the test is not "does it start with `/`" but "does it start with exactly one `/`".
 *
 * ENTRY ROUTES ARE EXCLUDED so a `next` cannot bounce the reader back into the flow that set it:
 * `next=/login` right after sign-in re-opens the form they just completed; `next=/onboarding/...`
 * from the onboarding wizard would loop on itself.
 *
 * EXTRACTED FROM `app/(auth)/post-auth-redirect.ts` when `/onboarding/professional` became a
 * second surface that reads `?next=`. Same rule, one definition.
 */
const ENTRY_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/oauth',
  '/onboarding',
];

export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  const path = next.split('?')[0];
  if (ENTRY_ROUTES.some((route) => path === route || path.startsWith(`${route}/`))) return null;
  return next;
}
