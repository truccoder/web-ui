'use client';

import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { useSession } from '../hooks/session';

/**
 * IS THERE A SESSION — one answer, given the same way on the server and in the browser.
 *
 * WHY A PROVIDER SEEDED FROM THE SERVER, rather than every component asking Redux. The store is
 * hydrated from `localStorage` inside `StoreProvider`'s initialiser, which does not exist during
 * SSR: the server would render the signed-out shell and the browser's first render the signed-in
 * one, and React calls that a hydration mismatch and throws the whole tree away. The layout reads
 * the `session` cookie on the server — the SAME cookie `src/middleware.ts` routes on, so the
 * markup can never disagree with the redirect that produced it — and hands the verdict down here.
 *
 * WHY IT STILL WATCHES REDUX. The cookie is the first render; the store is the truth from then on.
 * Signing in or out has to change the shell without a reload, and only the store knows in time.
 * `useSyncExternalStore` is what switches between the two: its server snapshot is `false`, so the
 * hydration render uses the cookie's value and matches the markup exactly, and every render after
 * hydration reads the live one. (The same derivation `shared/Dialog` uses, and for the same
 * reason — `react-hooks/set-state-in-effect` rejects the usual mounted-flag spelling.)
 *
 * IT IS NOT AUTHORISATION. It answers "is anyone signed in", nothing about who or with what role;
 * a forged cookie buys a shell with controls that every backend call still refuses.
 *
 * THE DEFAULT IS `true`, WHICH LOOKS BACKWARDS AND IS NOT. Only the `(main)` group mounts this
 * provider, because only its routes have a guest form; `(admin)` and `(auth)` render outside it
 * and are signed-in-only by construction. A default of `false` would tell every component in
 * those trees that nobody is signed in, and anything gated on `useIsGuest` would switch itself
 * off in the one place guests cannot reach. Defaulting to "signed in" means: guest mode is
 * something a subtree opts INTO, and everywhere else behaves exactly as it did before it existed.
 */
const SessionPresenceContext = createContext(true);

export function SessionPresenceProvider({
  initialSignedIn,
  children,
}: {
  /** Read from the `session` cookie by the server component that renders this. */
  initialSignedIn: boolean;
  children: React.ReactNode;
}) {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const { isAuthenticated } = useSession();

  const signedIn = hydrated ? isAuthenticated : initialSignedIn;

  return (
    <SessionPresenceContext.Provider value={signedIn}>{children}</SessionPresenceContext.Provider>
  );
}

/** True while nobody is signed in — the reader is browsing the guest surface. */
export function useIsGuest() {
  return !useContext(SessionPresenceContext);
}

/** The same fact the other way up, for code that reads better in the positive. */
export function useIsSignedIn() {
  return useContext(SessionPresenceContext);
}

/**
 * Where to send a guest to sign in, carrying where they were.
 *
 * `next` is built from the CURRENT location rather than passed in by each caller, because every
 * caller would compute the same thing and one of them would forget. Read back — and validated —
 * by `app/(auth)/post-auth-redirect.ts`.
 */
export function useAuthHref(path: '/login' | '/register') {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return useMemo(() => {
    if (!hydrated) return path;
    const here = `${window.location.pathname}${window.location.search}`;
    return `${path}?next=${encodeURIComponent(here)}`;
  }, [hydrated, path]);
}
