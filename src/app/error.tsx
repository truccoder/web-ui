'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, ButtonLink, EmptyState } from '@/shared/components';
import { useT } from '@/core/i18n';

/**
 * The app-wide error boundary. Until it existed, every uncaught render error in the product
 * fell through to Next's own overlay in development and to a **blank white document** in
 * production — no brand, no theme, no way back, and no clue what happened.
 *
 * That is not a hypothetical for this app. `getErrorMessage` handles what the API layer
 * *returns*; nothing handled what a component *throws* — a field read off a payload the
 * backend shipped as null, a date that would not parse, a `.map` over something that turned
 * out not to be an array. All of those produce a white screen mid-demo, and a white screen is
 * indistinguishable from a crashed server to anyone watching.
 *
 * THIS ONE RENDERS INSIDE THE ROOT LAYOUT, so it has the providers: `useT` works, the theme is
 * applied, the fonts are loaded. What it does NOT have is the `(main)` shell — this boundary
 * sits above the route groups, so a caught error replaces the whole page including the rail.
 * `(main)/error.tsx` exists for exactly that reason and catches first for anything under it;
 * this file is the net for the auth screens, the payment return, and the shells themselves.
 *
 * `reset()` RE-RENDERS THE SEGMENT, IT DOES NOT RELOAD. That is the right first offer: most of
 * these failures come from one bad payload, and a retry re-runs the query rather than the
 * whole app. The link out is the second offer, for when retrying keeps landing on the same
 * broken record.
 *
 * THE DIGEST IS PRINTED ON PURPOSE. In a production build React replaces the message with an
 * opaque `digest` hash and logs the real error server-side; printing the hash is what lets
 * someone match the screen in front of them to a line in the server log. It is shown as small
 * mono text rather than hidden behind a details toggle — a hash nobody can find is a hash
 * nobody will quote.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  // The browser console is the only place the untruncated error survives a production build,
  // and `error.tsx` swallows it otherwise — React hands it here instead of rethrowing.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="flex flex-col items-center gap-2">
        <EmptyState
          icon={<AlertTriangle />}
          title={t('error.title')}
          description={t('error.description')}
          action={
            <div className="flex items-center gap-2">
              <Button onClick={reset}>{t('error.retry')}</Button>
              <ButtonLink href="/newsfeed" variant="secondary">
                {t('error.goHome')}
              </ButtonLink>
            </div>
          }
        />

        {error.digest && (
          <p className="font-mono text-nx-micro text-nx-text-faint">
            {t('error.digest', { digest: error.digest })}
          </p>
        )}
      </div>
    </main>
  );
}
