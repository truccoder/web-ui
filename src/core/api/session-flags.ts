'use client';

/**
 * ---------------------------------------------------------------------------------------------
 * THE COOKIES THE EDGE ROUTES ON — one definition, because two of them drifted apart.
 * ---------------------------------------------------------------------------------------------
 *
 * `src/middleware.ts` runs before any JavaScript and cannot see localStorage or the Redux store,
 * so the only thing it can read to know whether a session exists is a cookie. These two are that
 * signal. Neither is a credential — the Bearer token is — and neither is authorisation: they say
 * "a session exists" and "its role was probed to be X", and every backend call is still checked
 * server-side.
 *
 * WHY THIS MODULE EXISTS AT ALL, rather than the two `document.cookie` lines it replaces. Tearing
 * a session down happens in TWO places that could not share code:
 *
 *   - `features/security/hooks/session.ts` (`useClearSession`) — the deliberate logout. It cleared
 *     the tokens, both cookies, the query cache and the worker cache.
 *   - `core/api/axios.ts` — the response interceptor, when a token refresh fails. It called
 *     `clearTokens()`, which only empties localStorage, and then sent the browser to `/login`.
 *
 * The second one is not a hook and cannot call the first, so it had its own half of the teardown
 * and the cookies were the half it was missing. THE RESULT WAS A SIGN-IN BUTTON THAT DID NOTHING:
 * localStorage was empty so the client rendered the guest shell, the `session` cookie still said
 * `true` so the middleware treated `/login` as a page a signed-in user should be bounced away
 * from, and every click on `Đăng nhập` was answered with a redirect back to `/newsfeed`. Nothing
 * failed, nothing logged, and the button appeared inert. With a stale `role=ADMIN` it was worse:
 * the bounce landed on `/admin/moderation`, whose layout replaces the route with `/login`, which
 * the middleware bounces again.
 *
 * So "what makes a session look present to the edge" is written down once, here, and both paths
 * call it. A third teardown path added tomorrow gets it right by importing it.
 *
 * IT LIVES IN `core/api` NEXT TO THE TOKEN HELPERS, not in `features/security`, because
 * `core/api/axios.ts` is one of its two callers and `core` must not import from `features`.
 */

/** Presence flag: `true` while a session exists. Read by `src/middleware.ts` on the edge. */
const SESSION_COOKIE = 'session';

/**
 * Cached verdict of whether the signed-in user is an admin. Written by the profile cycle, which
 * owns `/profile/me`; only ever cleared here. Absent means "role unknown", which the `(admin)` and
 * `(main)` layouts resolve client-side — so clearing it is always safe, and leaving it behind
 * after a session ends is not.
 */
const ROLE_COOKIE = 'role';

/**
 * `path=/` on both the write and the delete. A cookie is identified by name AND path, so deleting
 * without it would leave the `/`-scoped cookie standing while appearing to succeed.
 */
export function markSessionPresent() {
  document.cookie = `${SESSION_COOKIE}=true; path=/`;
}

/**
 * Drops both flags. Safe to call when they are already absent, and when no session ever existed.
 *
 * BOTH, ALWAYS — `role` is not optional cleanup. It is the cookie the middleware reads to decide
 * where a signed-in reader belongs, so a `role=ADMIN` left behind by a session that no longer
 * exists sends the next visit to `/admin/moderation`, whose layout replaces the route with
 * `/login`. There is no state in which one of these two should outlive the other.
 */
export function clearSessionFlags() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`;
}
