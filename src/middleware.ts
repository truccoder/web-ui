import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  // OAuth callback runs BEFORE a session exists — it is what establishes one — so it
  // must be reachable while logged out.
  '/oauth',
  // `/room`, `/join` and `/call` used to sit here. They were Twilio video routes, deleted at
  // P2.7d along with the rest of Twilio; leaving them listed left three unauthenticated path
  // prefixes standing open for routes that no longer exist.
];

// Reachable regardless of session state: a just-registered (and thus already
// logged-in) user still needs to open their verification/magic-link email.
const alwaysAccessiblePaths = ['/verify-email', '/magic-link', '/magic-login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (alwaysAccessiblePaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.get('session')?.value === 'true';

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  if (!hasSession && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role isn't known from the JWT (no role claim, no /me endpoint) — the client
  // probes an admin-only route after login and caches the verdict in this cookie.
  // Absent cookie ("unknown role") is left to the (admin)/(main) layouts to resolve
  // client-side, so we only redirect here on a *confirmed* role.
  const role = request.cookies.get('role')?.value;
  const isAdminArea = pathname.startsWith('/admin');
  // `/newsfeed` rather than the old `/dashboard`, which was absorbed into `/profile` at P5.2.
  // A signed-in user lands on the feed, not on their own profile — the same destination `/`
  // already redirects to, and the one a social app opens on. Change this single line to move it.
  const homePath = role === 'ADMIN' ? '/admin/moderation' : '/newsfeed';

  if (hasSession && isPublicPath) {
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  if (hasSession && role === 'ADMIN' && !isAdminArea) {
    return NextResponse.redirect(new URL('/admin/moderation', request.url));
  }

  if (hasSession && role === 'USER' && isAdminArea) {
    // `homePath` rather than a second literal: this said `/dashboard`, which since P5.2 is itself
    // only a redirect to `/profile`, so bouncing a user out of the admin area cost two extra hops.
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // `v1` excludes the backend's `/v1/api/...` prefix: if NEXT_PUBLIC_API_URL is ever
  // unset, axios calls resolve to same-origin relative paths (e.g. /v1/api/auth/login)
  // instead of hitting the backend. Without this exclusion those requests were silently
  // 307-redirected to /login by this middleware instead of failing with a clear 404.
  //
  // `sw.js` AND `manifest.webmanifest` ARE EXCLUDED FOR A MEASURED REASON, not for tidiness.
  // Both are static assets served from the app's own origin, and both were being caught by this
  // matcher and 307'd to /login for anyone without a session. For the manifest that is merely
  // wrong; for the service worker it is fatal, and it fails in a way nothing else surfaces:
  //
  //   SecurityError: Failed to register a ServiceWorker for scope ('http://localhost:3000/')
  //   with script ('http://localhost:3000/sw.js'): The script resource is behind a redirect,
  //   which is disallowed.
  //
  // The browser refuses a worker script that arrives via a redirect — a deliberate rule, since a
  // worker takes control of every request on its scope. So push notifications could never
  // register on a cold visit, and the only trace was one console error on the login page.
  // Caught 2026-08-10 by reading the console on `/login`; `tsc`, `lint` and `build` are all blind
  // to it, and so is every screen that only gets opened while already signed in.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|api|v1).*)'],
};
