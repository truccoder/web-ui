'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useSyncRoleFromProfile } from '@/features/security';

/**
 * Where to send someone the moment they are signed in.
 *
 * THE LEGACY BRIDGE IS GONE AS OF P3.4c. This file used to open with "TEMPORARY LEGACY BRIDGE —
 * remove in security cycle 3", because `syncRoleFromProfile` lived in `lib/hooks/use-admin-role.ts`
 * and the feature only owned the *clearing* half of the `role` cookie. Both halves are now in
 * `features/security`, and this imports through its barrel like everything else.
 *
 * WHY A PROBE RATHER THAN A CLAIM: the backend puts no role in the JWT and exposes no role
 * endpoint, so the only way to learn it is `GET /profile/me`. The hook does that through the shared
 * query cache, so the profile this costs is the same one the destination page is about to read —
 * not an extra request.
 *
 * IT STAYS AT THE ROUTE LAYER, not inside the feature, because *where to navigate after auth* is a
 * fact about this app's routes, not about the security domain. A `features/security` that knew
 * `/newsfeed` and `/admin/moderation` would fail the extraction test for the sake of two strings.
 *
 * P5.2 changed the non-admin destination from `/dashboard` to `/newsfeed`: `/dashboard` was
 * absorbed into `/profile`, and landing a returning user on their own profile is not what a feed
 * app does. Must stay in step with `homePath` in `src/middleware.ts`.
 *
 * WHAT P3.6 CHANGED: this used to take a `QueryClient` and pass it in, which made this route file
 * the only thing under `src/app` importing `@tanstack/react-query`. The client is now taken inside
 * `useSyncRoleFromProfile`, so nothing in `src/app` touches the data layer — which is exactly what
 * P3.6 exists to confirm.
 */
/**
 * Whether `next` may be navigated to.
 *
 * A REDIRECT TARGET OUT OF A QUERY STRING IS AN OPEN REDIRECT IF ANYONE TRUSTS IT. `?next=https://
 * evil.example/login` on a link that looks like this app's own sign-in page is the classic
 * phishing shape, and `//evil.example` is the same attack spelled as a protocol-relative URL — so
 * the test is not "does it start with `/`" but "does it start with exactly one `/`".
 *
 * The auth routes are excluded as well: `next=/login` after a successful sign-in bounces the
 * reader straight back into the form they just completed (the middleware would then send them to
 * the feed, so it is a loop that resolves — badly — rather than one that hangs).
 */
function safeNext(next: string | null) {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  const path = next.split('?')[0];
  if (['/login', '/register', '/forgot-password', '/reset-password', '/oauth'].includes(path)) {
    return null;
  }
  return next;
}

export function usePostAuthRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const syncRole = useSyncRoleFromProfile();

  return async function redirectAfterAuth() {
    const role = await syncRole();

    /**
     * `next` IS WHERE A GUEST WAS GOING, and honouring it is the other half of the guest surface
     * (`src/middleware.ts`). Someone reading a post who is asked to sign in to comment must come
     * back to that post; landing them on the feed loses the thing they were doing and is the
     * reason "sign in to continue" flows feel like a punishment.
     *
     * IGNORED FOR AN ADMIN, deliberately. The middleware redirects every admin session out of
     * `(main)` on the next navigation anyway, so following `next` there would flash a page they
     * are about to be bounced from.
     */
    if (role !== 'ADMIN') {
      const next = safeNext(searchParams.get('next'));
      if (next) {
        router.replace(next);
        return;
      }
    }

    router.replace(role === 'ADMIN' ? '/admin/moderation' : '/newsfeed');
  };
}
