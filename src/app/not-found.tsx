'use client';

import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '@/shared/components';
import { useT } from '@/core/i18n';

/**
 * 404. Reached two ways, and both were unhandled before this file: a URL that matches no route,
 * and an explicit `notFound()` from a page that looked its record up and found nothing.
 *
 * WHAT IT REPLACES IS NOT NOTHING — it is Next's built-in "404 · This page could not be found",
 * an unstyled black-on-white line in a system font. On a product whose whole argument is that
 * its surface is deliberate, the most likely page for a stranger to land on was the one page
 * that looked like no part of it.
 *
 * IT IS A CLIENT COMPONENT ONLY BECAUSE OF `useT`, which reads the provider in the root layout.
 * Nothing here fetches; a 404 that could fail to load is a 404 that turns into a 500.
 *
 * THE WAY OUT POINTS AT `/newsfeed`, not at `/`. `/` is the pre-auth splash and `middleware.ts`
 * bounces a signed-in session off it, so sending someone there would cost them a redirect to
 * land where this link goes directly. Someone signed OUT gets the redirect either way.
 */
export default function NotFound() {
  const t = useT();

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <EmptyState
        icon={<Compass />}
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={
          <Link href="/newsfeed">
            <Button variant="secondary">{t('notFound.goHome')}</Button>
          </Link>
        }
      />
    </main>
  );
}
