import { Compass } from 'lucide-react';
import { ButtonLink, EmptyState } from '@/shared/components';
import { getMessages, pageMetadata } from '@/core/i18n/server';

/**
 * 404. Reached two ways, and both were unhandled before this file: a URL that matches no route,
 * and an explicit `notFound()` from a page that looked its record up and found nothing.
 *
 * WHAT IT REPLACES IS NOT NOTHING — it is Next's built-in "404 · This page could not be found",
 * an unstyled black-on-white line in a system font. On a product whose whole argument is that its
 * surface is deliberate, the most likely page for a stranger to land on was the one page that
 * looked like no part of it.
 *
 * A SERVER COMPONENT, WHICH IS WHAT LETS IT CARRY ITS OWN TITLE. It was a client component for
 * one reason — `useT` — and that reason cost it `metadata`, so the tab over a 404 still read
 * "Elite Nexus" while every real route had been given a name. `getMessages` reads the same locale
 * cookie from the server side, so the copy is still translated and the title comes with it.
 * Nothing here is interactive: `EmptyState` and `Button` hold no state and take no handler on
 * this page, and the way out is an ordinary `Link`.
 *
 * Nothing fetches, either. A 404 that could fail to load is a 404 that turns into a 500.
 *
 * THE WAY OUT POINTS AT `/newsfeed`, not at `/`. `/` is the pre-auth splash and `middleware.ts`
 * bounces a signed-in session off it, so sending someone there would cost them a redirect to land
 * where this link goes directly. Someone signed OUT gets the redirect either way.
 */
export const generateMetadata = () => pageMetadata((m) => m.notFound.title);

export default async function NotFound() {
  const messages = await getMessages();

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <EmptyState
        icon={<Compass />}
        title={messages.notFound.title}
        description={messages.notFound.description}
        action={
          <ButtonLink href="/newsfeed" variant="secondary">
            {messages.notFound.goHome}
          </ButtonLink>
        }
      />
    </main>
  );
}
