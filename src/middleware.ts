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
// `/offline` IS HERE FOR THE SERVICE WORKER, not for a person browsing.
// `public/sw.js` precaches it during `install`, and that install usually happens on a first
// visit — before anyone has signed in. Behind the session gate this route answered a 307 to
// `/login`, so `cache.addAll` either failed the whole install or cached the login page under
// the offline key. Either way the worker never came up.
const alwaysAccessiblePaths = ['/verify-email', '/magic-link', '/magic-login', '/offline'];

/**
 * READABLE WITHOUT A SESSION — the guest surface, opened at P6.
 *
 * IT IS THE MIRROR OF A LIST IN THE BACKEND, NOT A PRODUCT WISH. `SecurityConfig` permits exactly
 * nine anonymous GETs (`/posts/public`, `/posts/{id}`, `/users/{username}/profile|posts|reputation|
 * roadmap-progress`, `/github/stats/*`, `/books/author/*`, `/trending`), and these four route
 * prefixes are the screens that can be built out of only those. A fifth entry here would be a
 * screen that renders its shell and then 401s on its own data, which is worse than a redirect to
 * `/login`: the reader gets a broken page instead of an answer.
 *
 * WHAT IS DELIBERATELY ABSENT, because each is a whole screen with no anonymous endpoint behind
 * it: `/search`, `/friends`, `/chats`, `/roadmap`, `/knowledge`, `/library`, `/projects`,
 * `/notifications`, `/profile`, `/settings`. A guest who follows a link to one of them is sent to
 * `/login?next=<where they were going>` and lands there once signed in.
 *
 * MATCHED ON SEGMENT BOUNDARIES (`/u` must not open a future `/users`), for the same reason the
 * backend pins its matchers to one path segment.
 */
const guestPaths = ['/', '/newsfeed', '/posts', '/u', '/trending'];

const matchesPath = (pathname: string, prefix: string) =>
  prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(`${prefix}/`);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (alwaysAccessiblePaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.get('session')?.value === 'true';

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  const isGuestPath = guestPaths.some((p) => matchesPath(pathname, p));

  if (!hasSession && !isPublicPath && !isGuestPath) {
    // `next` so the sign-in that this redirect forces returns the reader to what they clicked,
    // rather than dumping them on the feed having lost their destination. Read back by
    // `app/(auth)/post-auth-redirect.ts`, which validates it before navigating — a redirect
    // target taken from a query string is an open-redirect if anyone trusts it blindly.
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
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
  //
  // THE ICON ROUTES ARE HERE FOR THE SAME REASON, and one of them was already broken. `favicon.ico`
  // was listed and nothing else was, so `/icons/icon-192x192.png` and `/icons/icon-512x512.png` —
  // every icon the web-app manifest names — answered a 307 to `/login` for anyone without a
  // session. The manifest itself is exempt, so a cold visitor got a readable manifest pointing at
  // three icons they could not fetch, which is precisely the case an install prompt needs them
  // for. `/icon.svg` and `/apple-icon.png` are the App Router's own icon routes (`src/app/`), and
  // they would have joined it the moment they were added.
  //
  // An icon is chrome, not content: there is nothing behind any of these to protect, and a login
  // page delivered where a PNG was asked for is a redirect no image decoder will follow.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icons/|manifest.webmanifest|sw.js|api|v1).*)',
  ],
};
