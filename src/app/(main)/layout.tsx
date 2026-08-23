import { cookies } from 'next/headers';
import { SessionPresenceProvider } from '@/features/security';
import { MainShell } from './shell';

/**
 * `(main)` IS NO LONGER A SIGNED-IN-ONLY GROUP, which is why this file exists at all.
 *
 * The shell it renders is a client component and always was; what is new is that four of the
 * routes under it (`/newsfeed`, `/posts/{id}`, `/u/{username}`, `/trending`) are now reachable
 * without a session — see the guest list in `src/middleware.ts`. The shell has to know which of
 * the two it is drawing, and it has to know it on the FIRST render: a rail that appears signed-in
 * and then rearranges itself a tick later is the flash every reader notices.
 *
 * SO THE COOKIE IS READ HERE, ON THE SERVER, exactly as the root layout reads the locale and for
 * the identical reason (P5.3's note). It is also the same cookie `src/middleware.ts` routed on to
 * let this request through, so the markup cannot contradict the redirect that produced it.
 * `SessionPresenceProvider` takes it from here and hands the live value to everything below.
 *
 * IT IS PRESENCE, NOT PERMISSION. The value says only that a session exists — the shell uses it
 * to choose chrome, never to decide what may be read. Every endpoint is enforced by the backend,
 * and `core/api/axios` additionally refuses to send anything a guest is not entitled to ask for.
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const signedIn = cookieStore.get('session')?.value === 'true';

  return (
    <SessionPresenceProvider initialSignedIn={signedIn}>
      <MainShell>{children}</MainShell>
    </SessionPresenceProvider>
  );
}
