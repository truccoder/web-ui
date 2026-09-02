'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button, Card, EmptyState } from '@/shared/components';
import { useT } from '@/core/i18n';

/**
 * The shell's own error boundary, and the reason `app/error.tsx` is not enough on its own.
 *
 * A boundary catches at its own level: the app-wide one sits above the route groups, so an
 * error in `/roadmap` would take the rail, the top bar, the search field and the ledger down
 * with the page — the reader is left on a bare apology with one link, having lost every other
 * way through the product. THIS one is a sibling of `(main)/layout.tsx`'s children, so the
 * shell survives and only the canvas is replaced. Everything in the rail still works, and the
 * failure reads as "this screen is broken" rather than "the app is broken", which is both
 * kinder and, in the ordinary case, true.
 *
 * IT IS A CANVAS BLOCK, NOT A PAGE. No `min-h-dvh`, no centring on the viewport — the canvas
 * already has its measure, its datum and its padding from the layout, and a boundary that
 * re-centred itself on the window would sit somewhere no card in this product sits.
 *
 * The `reset` / link-out pair, the console re-log and the digest line all carry the reasoning
 * written out in `app/error.tsx`; this file follows it rather than restating it.
 */
export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <EmptyState
        icon={<AlertTriangle />}
        title={t('error.title')}
        description={t('error.description')}
        action={
          <div className="flex items-center gap-2">
            <Button onClick={reset}>{t('error.retry')}</Button>
            <Link href="/newsfeed">
              <Button variant="secondary">{t('error.goHome')}</Button>
            </Link>
          </div>
        }
      />

      {error.digest && (
        <p className="text-center font-mono text-nx-micro text-nx-text-faint">
          {t('error.digest', { digest: error.digest })}
        </p>
      )}
    </Card>
  );
}
