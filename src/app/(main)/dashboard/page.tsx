import { redirect } from 'next/navigation';

/**
 * `/dashboard` WAS ABSORBED INTO `/profile` AT P5.2 — this file is the redirect that keeps the
 * old URL alive.
 *
 * The two pages were the same thing under two names: both opened by claiming to be the home of
 * the signed-in account, and no reader could predict which one held what. The merge is described
 * in `profile/page.tsx`.
 *
 * IT REDIRECTS RATHER THAN 404s ON PURPOSE. The route was in the sidebar for the whole life of the
 * app, so it is in browser histories and bookmarks; deleting it outright would punish exactly the
 * people who used it most. `redirect()` is a server-side 307 here — no flash of an empty page, and
 * the client router never mounts anything.
 *
 * Safe to delete once you are confident nobody is still holding the link.
 */
export default function DashboardPage() {
  redirect('/profile');
}
