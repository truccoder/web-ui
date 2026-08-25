import axios from 'axios';

const AUTH_STORAGE_KEY = 'auth_tokens';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export function getTokens() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken, refreshToken }));
}

export function clearTokens() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

/**
 * ---------------------------------------------------------------------------------------------
 * THE GUEST SURFACE — what this client is allowed to send with no session behind it.
 * ---------------------------------------------------------------------------------------------
 *
 * WHY THIS LIVES IN THE TRANSPORT AND NOT IN THE SCREENS. A signed-out reader can now reach the
 * feed, a post and a public profile (`src/middleware.ts`), and those screens are assembled from
 * components that were all written for someone with an identity: a reaction bar, a comment
 * thread, an RSVP row, a poll, a book download, an AI explanation. Gating each of them by hand is
 * a list that has to be re-audited every time a component is added, and the failure mode of
 * missing one is silent — a request goes out, the backend answers 401, and the response
 * interceptor below reaches for a refresh token that does not exist.
 *
 * One allow-list here inverts that: nothing leaves the app without a session unless it is named,
 * so a component added tomorrow fails closed. It is the SAME LIST the backend permits
 * anonymously (`SecurityConfig`'s "guest-readable surface" plus `/auth/**`), transcribed — if the
 * two ever disagree, the symptom is a guest screen that is missing data rather than a security
 * hole, because this side can only ever be narrower than the server's.
 *
 * IT IS NOT AUTHORISATION AND MUST NOT BE READ AS ANY. Every one of these endpoints is enforced
 * server-side; this list exists so the app does not ask questions it knows the answer to.
 */
const AUTH_ENDPOINTS = /^\/v1\/api\/auth\//;

/** GET-only, and each pinned to one path segment exactly as the backend's matchers are. */
const GUEST_READABLE = [
  /^\/v1\/api\/posts\/public$/,
  /^\/v1\/api\/posts\/\d+$/,
  /^\/v1\/api\/users\/[^/]+\/(profile|posts|reputation|roadmap-progress)$/,
  /^\/v1\/api\/github\/stats\/[^/]+$/,
  /^\/v1\/api\/books\/author\/[^/]+$/,
  /^\/v1\/api\/trending$/,
];

/**
 * Rejection raised instead of sending a request a guest is not entitled to make.
 *
 * A DISTINCT TYPE RATHER THAN A 401, because the two mean different things to a screen. A 401 is
 * "your session was refused" and warrants clearing it; this is "there was never a session", and
 * the only sane response is an invitation to sign in. `getErrorMessage` would otherwise print an
 * axios network string for something that never touched the network.
 */
export class AuthRequiredError extends Error {
  constructor(public readonly url: string) {
    super('Sign-in required');
    this.name = 'AuthRequiredError';
  }
}

export const isAuthRequiredError = (error: unknown): error is AuthRequiredError =>
  error instanceof AuthRequiredError;

type AuthRequiredListener = () => void;
const authRequiredListeners = new Set<AuthRequiredListener>();

/**
 * Subscribe to "a guest just tried to do something that needs an account".
 *
 * A LISTENER SET RATHER THAN A REDIRECT, because a guest who taps a reaction should be offered a
 * sign-in and then be returned to the post they were reading — throwing them at `/login` from
 * inside an interceptor loses the page and reads as a crash. `features/security` mounts the one
 * listener that opens the prompt; core stays ignorant of what the UI does about it.
 */
export function onAuthRequired(listener: AuthRequiredListener) {
  authRequiredListeners.add(listener);
  return () => authRequiredListeners.delete(listener);
}

/** Announce it by hand, for a control that gates itself before ever calling the API. */
export function requestSignIn() {
  authRequiredListeners.forEach((listener) => listener());
}

/**
 * Path only: callers pass relative URLs, but an absolute one must not smuggle a query past this.
 *
 * EXPORTED FOR `axios.test.ts`, and that is the only reason it is not module-private. The pair
 * below is the closest thing this app has to a security decision written in regex — the guest
 * allow-list — and the sentence above it describes an attack (a query string carrying `/profile`
 * so a gated path matches a guest pattern) that nothing was checking for. A rule that decides
 * what leaves the app without a session should not be the one rule with no test, and the test
 * cannot reach it through the interceptor without standing up a fake transport to observe a
 * rejection that is the whole point.
 */
export function pathOf(url: string) {
  const withoutOrigin = url.replace(/^[a-z]+:\/\/[^/]+/i, '');
  return withoutOrigin.split(/[?#]/)[0];
}

/** Exported for `axios.test.ts` — see `pathOf`. Not used outside this module in the app. */
export function isAllowedWithoutSession(method: string, url: string) {
  const path = pathOf(url);
  if (AUTH_ENDPOINTS.test(path)) return true;
  if (method.toLowerCase() !== 'get') return false;
  return GUEST_READABLE.some((pattern) => pattern.test(path));
}

api.interceptors.request.use((config) => {
  const tokens = getTokens();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  } else if (!isAllowedWithoutSession(config.method ?? 'get', config.url ?? '')) {
    /**
     * THE PROMPT IS RAISED FOR WRITES ONLY, and that asymmetry is the whole design.
     *
     * A guest screen fires gated READS on its own, without anyone touching anything — the shell
     * asks for `/profile/me`, the ledger for a reputation it has no user for. Opening a modal
     * because a background query was declined would put a sign-in dialog on the screen of
     * somebody who has done nothing but arrive. Those are rejected in silence and the component
     * shows whatever it shows when it has no data.
     *
     * A non-GET, by contrast, only ever happens because a person pressed something. That is a
     * real intent to participate, and it is the one moment the invitation is welcome — so every
     * write is covered here, including the ones in components nobody remembered to gate.
     */
    if ((config.method ?? 'get').toLowerCase() !== 'get') requestSignIn();
    return Promise.reject(new AuthRequiredError(config.url ?? ''));
  }
  // The instance-level default Content-Type (application/json) would otherwise override
  // the browser's auto-generated multipart boundary for FormData bodies, so strip it here.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Backend rotates refresh tokens on every /refresh call (the old one is deleted immediately),
// so a refresh token is single-use. If two requests 401 at the same time (e.g. the sidebar's
// pending-friend-requests call and a page's own query), each firing its own /refresh would let
// the first win and the second get rejected on the now-deleted token, forcing a spurious logout.
// Sharing one in-flight promise across concurrent 401s avoids that race.
let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

function refreshTokens(refreshToken: string) {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${process.env.NEXT_PUBLIC_API_URL}/v1/api/auth/refresh`, { refreshToken })
      .then(({ data }) => {
        setTokens(data.accessToken, data.refreshToken);
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = getTokens();

      if (tokens?.refreshToken) {
        try {
          const data = await refreshTokens(tokens.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch {
          clearTokens();
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
